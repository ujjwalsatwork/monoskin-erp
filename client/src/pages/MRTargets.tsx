import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, Target, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill } from '@/components/shared/StatusPill';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { MR } from '@shared/schema';

interface MRTarget {
  id: number;
  mrId: number;
  mrName: string;
  territory: string;
  targetType: string;
  targetValue: number;
  achievedValue: number;
  period: string;
  status: string;
}

export default function MRTargets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [periodFilter, setPeriodFilter] = useState('2026-Q1');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [targetForm, setTargetForm] = useState({
    mrId: '',
    targetType: '',
    targetValue: '',
    period: '2026-Q1',
  });

  const { data: mrs = [], isLoading: mrsLoading, error: mrsError } = useQuery<MR[]>({
    queryKey: ['/api/mrs'],
  });

  const { data: mrTargetsData = [], isLoading: targetsLoading, error: targetsError } = useQuery<any[]>({
    queryKey: ['/api/mr-targets'],
  });

  const isLoading = mrsLoading || targetsLoading;
  const error = mrsError || targetsError;

  const targets: MRTarget[] = mrTargetsData.map(target => {
    const mr = mrs.find(m => m.id === target.mrId);
    const achieved = Number(target.achievedValue || target.achieved || 0);
    const targetVal = Number(target.targetValue || target.target || 0);
    const percentage = targetVal > 0 ? (achieved / targetVal) * 100 : 0;
    
    let status = target.status || 'Behind';
    if (!target.status) {
      if (percentage >= 100) status = 'Achieved';
      else if (percentage >= 80) status = 'On Track';
      else if (percentage >= 50) status = 'At Risk';
    }

    return {
      id: target.id,
      mrId: target.mrId,
      mrName: mr?.name || 'Unknown MR',
      territory: mr?.territory || 'Not Assigned',
      targetType: target.targetType || 'Revenue',
      targetValue: targetVal,
      achievedValue: achieved,
      period: target.period || periodFilter,
      status,
    };
  });

  const columns: Column<MRTarget>[] = [
    { key: 'mrName', header: 'MR Name', sortable: true },
    { key: 'territory', header: 'Territory' },
    { key: 'targetType', header: 'Type' },
    { key: 'targetValue', header: 'Target', render: (item) => <span className="font-mono">₹{item.targetValue.toLocaleString()}</span> },
    { key: 'achievedValue', header: 'Achieved', render: (item) => <span className="font-mono">₹{item.achievedValue.toLocaleString()}</span> },
    { key: 'progress', header: 'Progress', render: (item) => {
      const percentage = item.targetValue > 0 ? Math.round((item.achievedValue / item.targetValue) * 100) : 0;
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <Progress value={Math.min(percentage, 100)} className="h-2 flex-1" />
          <span className="font-mono text-sm w-12 text-right">{percentage}%</span>
        </div>
      );
    }},
    { key: 'status', header: 'Status', render: (item) => <StatusPill status={item.status} /> },
  ];

  const totalTarget = targets.reduce((sum, t) => sum + t.targetValue, 0);
  const totalAchieved = targets.reduce((sum, t) => sum + t.achievedValue, 0);
  const overallPercentage = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;
  const onTrackCount = targets.filter(t => t.status === 'On Track' || t.status === 'Achieved').length;

  const stats = [
    { title: 'Total MRs', value: mrs.length.toString(), subtitle: 'With targets', color: 'blue' as const },
    { title: 'Total Target', value: `₹${(totalTarget / 100000).toFixed(1)}L`, subtitle: periodFilter, color: 'green' as const },
    { title: 'Total Achieved', value: `₹${(totalAchieved / 100000).toFixed(1)}L`, subtitle: `${overallPercentage}% overall`, color: 'yellow' as const },
    { title: 'On Track', value: onTrackCount.toString(), subtitle: 'MRs performing well', color: 'purple' as const },
  ];

  const createTargetMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest('POST', '/api/mr-targets', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mr-targets'] });
      toast({ title: 'Target Created', description: 'New MR target has been added.' });
      setCreateDialogOpen(false);
      setTargetForm({ mrId: '', targetType: '', targetValue: '', period: '2026-Q1' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to create target.', variant: 'destructive' });
    },
  });

  const handleCreateTarget = () => {
    if (!targetForm.mrId || !targetForm.targetType || !targetForm.targetValue) {
      toast({ title: 'Validation Error', description: 'MR, target type, and target value are required.', variant: 'destructive' });
      return;
    }
    createTargetMutation.mutate({
      mrId: parseInt(targetForm.mrId),
      targetType: targetForm.targetType,
      targetValue: targetForm.targetValue,
      achievedValue: '0',
      period: targetForm.period,
      status: 'On Track',
    });
  };

  const handleExport = () => {
    toast({ title: 'Export Started', description: 'Generating MR targets report...' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error loading MR targets data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="MR Targets"
        description="Manage and track Medical Representative targets"
        actions={
          <div className="flex gap-2">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-Q1">Q1 2026</SelectItem>
                <SelectItem value="2025-Q4">Q4 2025</SelectItem>
                <SelectItem value="2025-Q3">Q3 2025</SelectItem>
                <SelectItem value="2025-Q2">Q2 2025</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-add-target">
              <Plus className="h-4 w-4 mr-2" />
              Add Target
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={Math.min(overallPercentage, 100)} className="h-3 flex-1" />
            <span className="font-mono font-semibold text-lg">{overallPercentage}%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            ₹{totalAchieved.toLocaleString()} achieved of ₹{totalTarget.toLocaleString()} target
          </p>
        </CardContent>
      </Card>

      {targets.length > 0 ? (
        <DataTable
          columns={columns}
          data={targets}
          emptyMessage="No targets defined for this period"
        />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Targets Set</h3>
            <p className="text-muted-foreground mb-4">No MR targets have been set for {periodFilter}.</p>
            <p className="text-sm text-muted-foreground">
              MRs tracked: {mrs.length}
            </p>
            <Button className="mt-4" onClick={() => setCreateDialogOpen(true)} data-testid="button-add-target-empty">
              <Plus className="h-4 w-4 mr-2" />
              Add First Target
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) setTargetForm({ mrId: '', targetType: '', targetValue: '', period: '2026-Q1' });
      }}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle>Create MR Target</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Medical Representative</Label>
              <Select value={targetForm.mrId} onValueChange={(v) => setTargetForm(p => ({ ...p, mrId: v }))}>
                <SelectTrigger data-testid="select-target-mr">
                  <SelectValue placeholder="Select MR..." />
                </SelectTrigger>
                <SelectContent>
                  {mrs.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.territory})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Type</Label>
              <Select value={targetForm.targetType} onValueChange={(v) => setTargetForm(p => ({ ...p, targetType: v }))}>
                <SelectTrigger data-testid="select-target-type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Revenue">Revenue</SelectItem>
                  <SelectItem value="Conversions">Conversions</SelectItem>
                  <SelectItem value="Doctor Onboarding">Doctor Onboarding</SelectItem>
                  <SelectItem value="Sample Distribution">Sample Distribution</SelectItem>
                  <SelectItem value="Visits">Visits</SelectItem>
                  <SelectItem value="New Leads">New Leads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Value</Label>
              <Input
                type="number"
                placeholder={targetForm.targetType === 'Revenue' ? 'e.g. 500000' : 'e.g. 50'}
                value={targetForm.targetValue}
                onChange={(e) => setTargetForm(p => ({ ...p, targetValue: e.target.value }))}
                data-testid="input-target-value"
              />
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={targetForm.period} onValueChange={(v) => setTargetForm(p => ({ ...p, period: v }))}>
                <SelectTrigger data-testid="select-target-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026-Q1">Q1 2026</SelectItem>
                  <SelectItem value="2025-Q4">Q4 2025</SelectItem>
                  <SelectItem value="2025-Q3">Q3 2025</SelectItem>
                  <SelectItem value="2025-Q2">Q2 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-target">
              Cancel
            </Button>
            <Button onClick={handleCreateTarget} disabled={createTargetMutation.isPending} data-testid="button-submit-target">
              {createTargetMutation.isPending ? 'Creating...' : 'Create Target'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
