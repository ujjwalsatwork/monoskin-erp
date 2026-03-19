import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { RowActionsMenu } from '@/components/shared/RowActionsMenu';
import { CreateEditDrawer, FormField } from '@/components/shared/CreateEditDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportModal } from '@/components/shared/ExportModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Ticket, Eye, Edit, Trash2, Plus, Search, Filter, Copy, Pause, Play, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { PromoCode } from '@shared/schema';

export default function PromoCodes() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<PromoCode | null>(null);

  const { data: promoCodes = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: ['/api/promo-codes'],
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('POST', '/api/promo-codes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/promo-codes'] });
      toast({ title: 'Promo Code Created' });
      setCreateDrawerOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create promo code', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest('PATCH', `/api/promo-codes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/promo-codes'] });
      toast({ title: 'Promo Code Updated' });
      setEditDrawerOpen(false);
      setPauseDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update promo code', variant: 'destructive' });
    },
  });

  const filteredCodes = promoCodes.filter(code => {
    const matchesSearch = code.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || code.status === statusFilter;
    const matchesChannel = channelFilter === 'all' || code.purposeChannel === channelFilter;
    return matchesSearch && matchesStatus && matchesChannel;
  });

  const formFields: FormField[] = [
    { name: 'code', label: 'Promo Code', type: 'text', required: true },
    { name: 'type', label: 'Discount Type', type: 'select', required: true, options: [
      { value: 'Percentage', label: 'Percentage (%)' },
      { value: 'Fixed', label: 'Fixed Amount' },
    ]},
    { name: 'discount', label: 'Discount Value', type: 'number', required: true },
    { name: 'purposeChannel', label: 'Purpose / Channel', type: 'select', required: true, options: [
      { value: 'Doctor/Pharmacy', label: 'Doctor/Pharmacy' },
      { value: 'Online', label: 'Online' },
      { value: 'Both', label: 'Both' },
    ]},
    { name: 'validFrom', label: 'Valid From', type: 'date', required: true },
    { name: 'validTo', label: 'Valid To', type: 'date', required: true },
    { name: 'usageLimit', label: 'Total Usage Limit', type: 'number', required: true },
    { name: 'perCustomerLimit', label: 'Per Customer Limit', type: 'number', required: true },
    { name: 'schemeStackability', label: 'Stackability with Schemes', type: 'select', required: true, options: [
      { value: 'Allow', label: 'Allow Stack' },
      { value: 'Block', label: 'Block Stack' },
    ]},
  ];

  const exportColumns = [
    { key: 'id', label: 'ID', defaultSelected: true },
    { key: 'code', label: 'Code', defaultSelected: true },
    { key: 'discount', label: 'Discount', defaultSelected: true },
    { key: 'type', label: 'Type', defaultSelected: true },
    { key: 'purposeChannel', label: 'Channel', defaultSelected: true },
    { key: 'status', label: 'Status', defaultSelected: true },
    { key: 'usedCount', label: 'Times Used' },
    { key: 'usageLimit', label: 'Usage Limit' },
    { key: 'validFrom', label: 'Valid From' },
    { key: 'validTo', label: 'Valid To' },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    const payload = {
      ...data,
      discount: Number(data.discount),
      usageLimit: Number(data.usageLimit),
      perCustomerLimit: Number(data.perCustomerLimit),
      validFrom: data.validFrom ? new Date(data.validFrom as string) : new Date(),
      validTo: data.validTo ? new Date(data.validTo as string) : new Date(),
    };
    createMutation.mutate(payload);
  };

  const handleEdit = (data: Record<string, unknown>) => {
    if (!selectedCode) return;
    const payload = {
      ...data,
      discount: Number(data.discount),
      usageLimit: Number(data.usageLimit),
      perCustomerLimit: Number(data.perCustomerLimit),
      validFrom: data.validFrom ? new Date(data.validFrom as string) : undefined,
      validTo: data.validTo ? new Date(data.validTo as string) : undefined,
    };
    updateMutation.mutate({ id: selectedCode.id, data: payload });
  };

  const handlePauseToggle = () => {
    if (!selectedCode) return;
    const newStatus = selectedCode.status === 'Active' ? 'Paused' : 'Active';
    updateMutation.mutate({ id: selectedCode.id, data: { status: newStatus } });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Code Copied', description: `${code} copied to clipboard` });
  };

  const columns: Column<PromoCode>[] = [
    { key: 'code', header: 'Code', render: (row) => (
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium">{row.code}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleCopyCode(row.code); }}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    )},
    { key: 'discount', header: 'Discount', render: (row) => (
      <span className="font-medium">
        {row.type === 'Percentage' ? `${row.discount}%` : `${row.discount}`}
      </span>
    )},
    { key: 'purposeChannel', header: 'Channel', render: (row) => <Badge variant="outline">{row.purposeChannel}</Badge> },
    { key: 'usage', header: 'Usage', render: (row) => {
      const usagePercent = row.usageLimit > 0 ? (row.usedCount / row.usageLimit) * 100 : 0;
      return (
        <div className="w-32">
          <div className="flex justify-between text-xs mb-1">
            <span>{row.usedCount} / {row.usageLimit}</span>
            <span>{Math.round(usagePercent)}%</span>
          </div>
          <Progress value={usagePercent} className="h-2" />
        </div>
      );
    }},
    { key: 'validity', header: 'Validity', render: (row) => (
      <div className="flex items-center gap-1 text-sm">
        <Calendar className="h-3 w-3" />
        {new Date(row.validFrom).toLocaleDateString()} - {new Date(row.validTo).toLocaleDateString()}
      </div>
    )},
    { key: 'status', header: 'Status', render: (row) => <StatusPill status={row.status} /> },
    { key: 'actions', header: '', render: (row) => (
      <RowActionsMenu actions={[
        { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => { setSelectedCode(row); setDetailDialogOpen(true); } },
        { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => { setSelectedCode(row); setEditDrawerOpen(true); } },
        { label: row.status === 'Active' ? 'Pause' : 'Activate', icon: row.status === 'Active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />, onClick: () => { setSelectedCode(row); setPauseDialogOpen(true); } },
      ]} />
    )},
  ];

  const activeCount = promoCodes.filter(c => c.status === 'Active').length;
  const totalUsage = promoCodes.reduce((sum, c) => sum + c.usedCount, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Promo Codes" 
        description="Manage promotional codes and discounts"
        actions={<Button onClick={() => setCreateDrawerOpen(true)} data-testid="button-add-promo"><Plus className="h-4 w-4 mr-2" /> Create Promo Code</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Codes" value={promoCodes.length} icon={<Ticket className="h-5 w-5" />} />
        <StatCard title="Active" value={activeCount} trend={{ value: 10 }} />
        <StatCard title="Total Usage" value={totalUsage} />
        <StatCard title="Avg Usage" value={promoCodes.length > 0 ? Math.round(totalUsage / promoCodes.length) : 0} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search codes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search-promo" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]" data-testid="select-status-filter"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Paused">Paused</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-channel-filter"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="Doctor/Pharmacy">Doctor/Pharmacy</SelectItem>
            <SelectItem value="Online">Online</SelectItem>
            <SelectItem value="Both">Both</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">Export</Button>
      </div>

      <DataTable columns={columns} data={filteredCodes} emptyMessage="No promo codes found. Create your first promo code to get started." />

      <CreateEditDrawer open={createDrawerOpen} onClose={() => setCreateDrawerOpen(false)} title="Create Promo Code" fields={formFields} onSubmit={handleCreate} />
      <CreateEditDrawer open={editDrawerOpen} onClose={() => setEditDrawerOpen(false)} title="Edit Promo Code" fields={formFields} 
        initialData={selectedCode ? {
          ...selectedCode,
          validFrom: selectedCode.validFrom ? new Date(selectedCode.validFrom).toISOString().split('T')[0] : '',
          validTo: selectedCode.validTo ? new Date(selectedCode.validTo).toISOString().split('T')[0] : '',
        } : undefined} 
        onSubmit={handleEdit} 
      />
      <ConfirmDialog 
        open={pauseDialogOpen} 
        onOpenChange={setPauseDialogOpen} 
        title={selectedCode?.status === 'Active' ? 'Pause Promo Code' : 'Activate Promo Code'} 
        description={`Are you sure you want to ${selectedCode?.status === 'Active' ? 'pause' : 'activate'} ${selectedCode?.code}?`} 
        confirmLabel={selectedCode?.status === 'Active' ? 'Pause' : 'Activate'} 
        destructive={selectedCode?.status === 'Active'} 
        onConfirm={handlePauseToggle} 
      />
      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} entityName="Promo Codes" columns={exportColumns} totalRecords={filteredCodes.length} />
      
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCode?.code}</DialogTitle>
          </DialogHeader>
          {selectedCode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Type</Label><p className="font-medium">{selectedCode.type}</p></div>
                <div><Label className="text-muted-foreground">Discount</Label><p className="font-medium">{selectedCode.type === 'Percentage' ? `${selectedCode.discount}%` : `${selectedCode.discount}`}</p></div>
                <div><Label className="text-muted-foreground">Channel</Label><p className="font-medium">{selectedCode.purposeChannel}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><StatusPill status={selectedCode.status} /></div>
                <div><Label className="text-muted-foreground">Usage</Label><p className="font-medium">{selectedCode.usedCount} / {selectedCode.usageLimit}</p></div>
                <div><Label className="text-muted-foreground">Per Customer</Label><p className="font-medium">{selectedCode.perCustomerLimit}</p></div>
                <div><Label className="text-muted-foreground">Valid From</Label><p className="font-medium">{new Date(selectedCode.validFrom).toLocaleDateString()}</p></div>
                <div><Label className="text-muted-foreground">Valid To</Label><p className="font-medium">{new Date(selectedCode.validTo).toLocaleDateString()}</p></div>
                <div className="col-span-2"><Label className="text-muted-foreground">Stackability</Label><p className="font-medium">{selectedCode.schemeStackability}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
