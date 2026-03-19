import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, Users, TrendingUp, Target, Calendar, Loader2, ArrowUpDown, Clock, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Lead, MRTarget } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { CreateEditDrawer, FormField } from '@/components/shared/CreateEditDrawer';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import type { MR } from '@shared/schema';

const performanceBuckets = ['Top Performer', 'On Track', 'At Risk', 'Under Performing'];


function getPerformanceBucket(mr: MR): string {
  const conversionRate = mr.leadsAssigned > 0 ? (mr.conversions / mr.leadsAssigned) * 100 : 0;
  if (conversionRate >= 20) return 'Top Performer';
  if (conversionRate >= 10) return 'On Track';
  if (conversionRate >= 5) return 'At Risk';
  return 'Under Performing';
}

export default function MRDirectory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [performanceFilter, setPerformanceFilter] = useState<string>('all');
  const [selectedMRs, setSelectedMRs] = useState<number[]>([]);
  const [assignLeadsDialog, setAssignLeadsDialog] = useState(false);
  const [selectedMRForAssign, setSelectedMRForAssign] = useState<number | null>(null);
  const [reassignDialog, setReassignDialog] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: allMRs = [], isLoading } = useQuery<MR[]>({
    queryKey: ['/api/mrs'],
  });

  const { data: nextIdData } = useQuery<{ nextId: string }>({
    queryKey: ['/api/mrs/next-employee-id'],
    staleTime: 0,
  });

  const mrFormFields: FormField[] = useMemo(() => [
    { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter MR name' },
    { name: 'employeeId', label: 'Employee ID', type: 'text', required: true, placeholder: 'MR006', defaultValue: nextIdData?.nextId ?? '' },
    { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'name@company.com' },
    { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '+91 9876543210' },
    { name: 'territory', label: 'Territory', type: 'text', required: true, placeholder: 'Mumbai' },
    { name: 'region', label: 'Region', type: 'text', required: true, placeholder: 'West' },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select', 
      required: true,
      options: [
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' },
        { value: 'On Leave', label: 'On Leave' },
      ],
      defaultValue: 'Active'
    },
    { name: 'reportingManager', label: 'Reporting Manager', type: 'text', required: true, placeholder: 'Manager name' },
    { 
      name: 'managerRole', 
      label: 'Manager Role', 
      type: 'select', 
      required: true,
      options: [
        { value: 'ASM', label: 'Area Sales Manager (ASM)' },
        { value: 'RSM', label: 'Regional Sales Manager (RSM)' },
      ],
      defaultValue: 'ASM'
    },
    { name: 'joiningDate', label: 'Joining Date', type: 'date', required: true },
  ], [nextIdData?.nextId]);

  const { data: territories = [] } = useQuery<string[]>({
    queryKey: ['/api/territories'],
  });

  const { data: allTargets = [] } = useQuery<MRTarget[]>({
    queryKey: ['/api/mr-targets'],
  });

  const { data: allLeads = [] } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
  });

  const today = new Date().toISOString().split('T')[0];

  const getTargetsForMR = (mrId: number) => allTargets.filter(t => t.mrId === mrId);

  const getFollowupsDueTodayForMR = (mrId: number) => {
    return allLeads.filter(l => l.assignedMRId === mrId && l.nextFollowUp && l.nextFollowUp <= today).length;
  };

  const filteredAndSortedMRs = useMemo(() => {
    let result = allMRs.filter(mr => {
      if (territoryFilter !== 'all' && mr.territory !== territoryFilter) return false;
      if (statusFilter !== 'all' && mr.status !== statusFilter) return false;
      if (performanceFilter !== 'all' && getPerformanceBucket(mr) !== performanceFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          mr.name.toLowerCase().includes(query) ||
          mr.employeeId.toLowerCase().includes(query) ||
          mr.territory.toLowerCase().includes(query)
        );
      }
      return true;
    });
    
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'revenue':
          comparison = Number(a.revenueAttributed) - Number(b.revenueAttributed);
          break;
        case 'conversions':
          comparison = a.conversions - b.conversions;
          break;
        case 'leads':
          comparison = a.leadsAssigned - b.leadsAssigned;
          break;
        case 'visits':
          comparison = a.visitsLogged - b.visitsLogged;
          break;
        case 'lastActivity':
          comparison = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [allMRs, territoryFilter, statusFilter, performanceFilter, searchQuery, sortField, sortDirection]);
  
  const filteredMRs = filteredAndSortedMRs;
  
  const isActiveToday = (mr: MR) => {
    const today = new Date().toDateString();
    const lastActivity = new Date(mr.lastActivity).toDateString();
    return today === lastActivity;
  };
  
  const getFollowUpsDueToday = () => {
    return allMRs.filter(mr => isActiveToday(mr) || mr.leadsUpdatedToday > 0).length;
  };

  const toggleSelect = (id: number) => {
    setSelectedMRs(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMRs.length === filteredMRs.length) {
      setSelectedMRs([]);
    } else {
      setSelectedMRs(filteredMRs.map(mr => mr.id));
    }
  };

  // KPI calculations
  const totalMRs = allMRs.length;
  const activeMRs = allMRs.filter(mr => mr.status === 'Active').length;
  const totalLeadsAssigned = allMRs.reduce((sum, mr) => sum + mr.leadsAssigned, 0);
  const totalConversions = allMRs.reduce((sum, mr) => sum + mr.conversions, 0);

  const columns = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={selectedMRs.length === filteredMRs.length && filteredMRs.length > 0}
          onCheckedChange={toggleSelectAll}
        />
      ),
      render: (item: MR) => (
        <Checkbox
          checked={selectedMRs.includes(item.id)}
          onCheckedChange={() => toggleSelect(item.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'name',
      header: 'MR Name',
      render: (item: MR) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{item.employeeId}</p>
        </div>
      ),
    },
    {
      key: 'territory',
      header: 'Territory',
      render: (item: MR) => (
        <div>
          <p className="text-sm">{item.territory}</p>
          <p className="text-xs text-muted-foreground">{item.region}</p>
        </div>
      ),
    },
    {
      key: 'reportingManager',
      header: 'Reporting To',
      render: (item: MR) => (
        <div>
          <p className="text-sm">{item.reportingManager}</p>
          <p className="text-xs text-muted-foreground">{item.managerRole}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: MR) => <StatusPill status={item.status} />,
    },
    {
      key: 'leadsAssigned',
      header: 'Leads',
      render: (item: MR) => (
        <div className="text-right">
          <p className="font-mono text-sm">{item.leadsAssigned}</p>
          <p className="text-xs text-muted-foreground">+{item.leadsUpdatedToday} today</p>
        </div>
      ),
    },
    {
      key: 'performance',
      header: 'Performance',
      render: (item: MR) => (
        <div className="text-right">
          <p className="font-mono text-sm">{item.conversions} conv.</p>
          <p className="text-xs text-muted-foreground">{item.visitsLogged} visits</p>
        </div>
      ),
    },
    {
      key: 'targetsAssigned',
      header: 'Targets',
      render: (item: MR) => {
        const mrTargets = getTargetsForMR(item.id);
        const onTrack = mrTargets.filter(t => t.status === 'On Track' || t.status === 'Achieved').length;
        const atRisk = mrTargets.filter(t => t.status === 'At Risk' || t.status === 'Missed').length;
        return (
          <div className="text-right" data-testid={`targets-${item.id}`}>
            <p className="font-mono text-sm">{mrTargets.length} assigned</p>
            <p className="text-xs">
              {onTrack > 0 && <span className="text-green-600 dark:text-green-400">{onTrack} on track</span>}
              {onTrack > 0 && atRisk > 0 && <span className="text-muted-foreground"> · </span>}
              {atRisk > 0 && <span className="text-red-600 dark:text-red-400">{atRisk} at risk</span>}
              {mrTargets.length === 0 && <span className="text-muted-foreground">—</span>}
            </p>
          </div>
        );
      },
    },
    {
      key: 'followupsToday',
      header: 'Follow-ups Today',
      render: (item: MR) => {
        const count = getFollowupsDueTodayForMR(item.id);
        return (
          <div className="flex items-center gap-1.5" data-testid={`followups-${item.id}`}>
            {count > 0 ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{count} due</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Clear</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'revenue',
      header: 'Revenue',
      render: (item: MR) => (
        <p className="font-mono text-sm text-right">₹{(Number(item.revenueAttributed) / 1000).toFixed(0)}K</p>
      ),
    },
    {
      key: 'bucket',
      header: 'Bucket',
      render: (item: MR) => <StatusPill status={getPerformanceBucket(item)} />,
    },
    {
      key: 'lastActivity',
      header: 'Last Activity',
      render: (item: MR) => {
        const activeToday = isActiveToday(item);
        return (
          <div className="flex items-center gap-2" data-testid={`activity-status-${item.id}`}>
            {activeToday && (
              <Activity className="h-4 w-4 text-green-500" data-testid={`active-indicator-${item.id}`} />
            )}
            <span className={`text-sm ${activeToday ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {activeToday ? 'Today' : new Date(item.lastActivity).toLocaleDateString()}
            </span>
          </div>
        );
      },
    },
  ];

  const rowActions = [
    {
      label: 'View Profile',
      onClick: (item: MR) => navigate(`/mr/${item.id}`),
    },
    {
      label: 'Assign Leads',
      onClick: (item: MR) => {
        setSelectedMRForAssign(item.id);
        setAssignLeadsDialog(true);
      },
    },
    {
      label: 'Reassign Territory',
      onClick: (item: MR) => {
        setSelectedMRForAssign(item.id);
        setReassignDialog(true);
      },
    },
  ];

  const handleAssignLeads = () => {
    toast({
      title: 'Leads Assigned',
      description: 'Selected leads have been assigned to the MR.',
    });
    setAssignLeadsDialog(false);
    setSelectedMRForAssign(null);
  };

  const handleReassignTerritory = (reason: string) => {
    toast({
      title: 'Territory Reassigned',
      description: 'MR territory has been updated.',
    });
    setReassignDialog(false);
    setSelectedMRForAssign(null);
  };

  const createMutation = useMutation({
    mutationFn: async (data: Partial<MR>) => {
      const res = await apiRequest('POST', '/api/mrs', data);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mrs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mrs/next-employee-id'] });
      toast({ title: 'MR Created', description: 'New Medical Representative has been added.' });
      setCreateDrawerOpen(false);
    },
    onError: (error: Error) => {
      console.error('Create MR error:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to create MR.', 
        variant: 'destructive' 
      });
    },
  });

  const handleCreateMR = (data: Record<string, unknown>) => {
    createMutation.mutate({
      ...data,
      leadsAssigned: 0,
      conversions: 0,
      visitsLogged: 0,
      revenueAttributed: '0',
      leadsUpdatedToday: 0,
      lastActivity: new Date().toISOString(),
    } as unknown as Partial<MR>);
  };

  const handleExport = () => {
    toast({
      title: 'Export Started',
      description: 'MR Directory export has been queued. Check Export Center for progress.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="MR Directory"
        description="Manage Medical Representatives"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setCreateDrawerOpen(true)} data-testid="button-add-mr">
              <Plus className="h-4 w-4 mr-2" />
              Add MR
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total MRs"
          value={totalMRs}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: activeMRs, label: 'active' }}
          data-testid="stat-total-mrs"
        />
        <StatCard
          title="Leads Assigned"
          value={totalLeadsAssigned}
          icon={<Target className="h-5 w-5" />}
          trend={{ value: 12, label: '% avg conversion' }}
          data-testid="stat-leads-assigned"
        />
        <StatCard
          title="Total Conversions"
          value={totalConversions}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{ value: 8, label: '% this month' }}
          data-testid="stat-total-conversions"
        />
        <StatCard
          title="Follow-ups Due Today"
          value={getFollowUpsDueToday()}
          icon={<Clock className="h-5 w-5" />}
          trend={{ value: allMRs.filter(mr => mr.leadsUpdatedToday > 0).length, label: 'active today' }}
          data-testid="stat-followups-due"
        />
        <StatCard
          title="Visits This Month"
          value={allMRs.reduce((sum, mr) => sum + mr.visitsLogged, 0)}
          icon={<Calendar className="h-5 w-5" />}
          trend={{ value: 15, label: '% increase' }}
          data-testid="stat-visits-month"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search MRs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-mr"
            />
          </div>
          <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-territory-filter">
              <SelectValue placeholder="All Territories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Territories</SelectItem>
              {territories.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="On Leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
          <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-performance-filter">
              <SelectValue placeholder="All Performance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Performance</SelectItem>
              {performanceBuckets.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortField} onValueChange={(value) => setSortField(value)}>
            <SelectTrigger className="w-[140px]" data-testid="select-sort-field">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="conversions">Conversions</SelectItem>
              <SelectItem value="leads">Leads Assigned</SelectItem>
              <SelectItem value="visits">Visits</SelectItem>
              <SelectItem value="lastActivity">Last Activity</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            data-testid="button-sort-direction"
          >
            <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {selectedMRs.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedMRs.length} selected
            </span>
            <Button variant="outline" onClick={() => setAssignLeadsDialog(true)}>
              Bulk Assign Leads
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DataTable
          data={filteredMRs}
          columns={columns}
          rowActions={rowActions}
          onRowClick={(item) => navigate(`/mr/${item.id}`)}
          emptyMessage="No MRs found"
        />
      )}

      {/* Assign Leads Dialog */}
      <Dialog open={assignLeadsDialog} onOpenChange={setAssignLeadsDialog}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle>Assign Leads to MR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Leads to Assign</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select leads..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">All Unassigned Leads</SelectItem>
                  <SelectItem value="high">High Priority Leads</SelectItem>
                  <SelectItem value="territory">Leads in MR's Territory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assignment Notes</Label>
              <Input placeholder="Add notes for the MR..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignLeadsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignLeads}>Assign Leads</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Territory Dialog */}
      <ConfirmDialog
        open={reassignDialog}
        onOpenChange={setReassignDialog}
        title="Reassign Territory"
        description="Select a new territory for this MR. This will update their assigned leads."
        requireReason
        reasonLabel="Reason for Reassignment"
        confirmLabel="Reassign Territory"
        onConfirm={handleReassignTerritory}
      />

      {/* Create MR Drawer */}
      <CreateEditDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Add New MR"
        fields={mrFormFields}
        onSubmit={handleCreateMR}
        submitLabel="Create MR"
      />
    </div>
  );
}
