import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, QrCode, Eye, Edit, Pause, Play, TrendingUp, DollarSign, Users, ShoppingCart, Filter, BarChart3, ArrowRight, Share2, CheckCircle, Power, PowerOff, Calendar } from 'lucide-react';
import { QRCodeGenerator } from '@/components/shared/QRCodeGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { RowActionsMenu } from '@/components/shared/RowActionsMenu';
import { ExportModal } from '@/components/shared/ExportModal';
import { BulkActionsBar } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ClinicCode, Doctor, PromoCode } from '@shared/schema';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell } from 'recharts';

const FUNNEL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function ClinicCodes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [performanceFilter, setPerformanceFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [detailDialog, setDetailDialog] = useState<ClinicCode | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showFunnelReport, setShowFunnelReport] = useState(true);
  const [newCode, setNewCode] = useState<{ code: string; type: 'Bulk' | 'Retail'; doctorId: number; discount: number }>({ code: '', type: 'Retail', doctorId: 0, discount: 10 });

  const { data: clinicCodes = [], isLoading } = useQuery<ClinicCode[]>({
    queryKey: ['/api/clinic-codes'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: promoCodes = [] } = useQuery<PromoCode[]>({
    queryKey: ['/api/promo-codes'],
  });

  const createCodeMutation = useMutation({
    mutationFn: async (data: Partial<ClinicCode>) => {
      const res = await apiRequest('POST', '/api/clinic-codes', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clinic-codes'] });
      toast({ title: 'Clinic Code Created', description: 'New clinic code has been created successfully' });
      setCreateDialogOpen(false);
      setNewCode({ code: '', type: 'Retail', doctorId: 0, discount: 10 });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create clinic code', variant: 'destructive' });
    },
  });

  const updateCodeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ClinicCode> }) => {
      const res = await apiRequest('PATCH', `/api/clinic-codes/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clinic-codes'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update clinic code', variant: 'destructive' });
    },
  });

  const filteredCodes = useMemo(() => {
    return clinicCodes.filter((code: ClinicCode) => {
      if (typeFilter !== 'all' && code.type !== typeFilter) return false;
      if (statusFilter !== 'all' && code.status !== statusFilter) return false;
      if (doctorFilter !== 'all' && code.doctorId !== Number(doctorFilter)) return false;
      
      // Performance filter
      if (performanceFilter === 'high' && (code.convertedToOrders || 0) < 10) return false;
      if (performanceFilter === 'medium' && ((code.convertedToOrders || 0) < 3 || (code.convertedToOrders || 0) >= 10)) return false;
      if (performanceFilter === 'low' && (code.convertedToOrders || 0) >= 3) return false;
      if (performanceFilter === 'unused' && (code.usageCount || 0) > 0) return false;
      
      // Date range filter
      if (dateRange.from && code.createdAt) {
        const codeDate = new Date(code.createdAt);
        const fromDate = new Date(dateRange.from);
        if (codeDate < fromDate) return false;
      }
      if (dateRange.to && code.createdAt) {
        const codeDate = new Date(code.createdAt);
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59);
        if (codeDate > toDate) return false;
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const doctor = doctors.find(d => d.id === code.doctorId);
        return (
          code.code.toLowerCase().includes(query) ||
          doctor?.name.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [clinicCodes, typeFilter, statusFilter, doctorFilter, performanceFilter, dateRange, searchQuery, doctors]);

  // Funnel metrics calculation
  const funnelMetrics = useMemo(() => {
    const totalShared = filteredCodes.reduce((sum, c) => sum + (c.sharedCount || 0), 0);
    const totalUsed = filteredCodes.reduce((sum, c) => sum + (c.usageCount || 0), 0);
    const totalConverted = filteredCodes.reduce((sum, c) => sum + (c.convertedToOrders || 0), 0);
    const totalRevenue = filteredCodes.reduce((sum, c) => sum + Number(c.totalRevenue || 0), 0);
    
    return {
      shared: totalShared,
      used: totalUsed,
      converted: totalConverted,
      revenue: totalRevenue,
      shareToUseRate: totalShared > 0 ? Math.round((totalUsed / totalShared) * 100) : 0,
      useToConvertRate: totalUsed > 0 ? Math.round((totalConverted / totalUsed) * 100) : 0,
      avgOrderValue: totalConverted > 0 ? Math.round(totalRevenue / totalConverted) : 0,
    };
  }, [filteredCodes]);

  // Top performing codes
  const topPerformingCodes = useMemo(() => {
    return [...filteredCodes]
      .filter(c => c.convertedToOrders && c.convertedToOrders > 0)
      .sort((a, b) => Number(b.totalRevenue || 0) - Number(a.totalRevenue || 0))
      .slice(0, 5);
  }, [filteredCodes]);

  // Revenue by doctor for chart
  const revenueByDoctor = useMemo(() => {
    const doctorRevenue: Record<number, { name: string; revenue: number; conversions: number }> = {};
    filteredCodes.forEach(code => {
      if (!doctorRevenue[code.doctorId]) {
        const doctor = doctors.find(d => d.id === code.doctorId);
        doctorRevenue[code.doctorId] = { name: doctor?.name || 'Unknown', revenue: 0, conversions: 0 };
      }
      doctorRevenue[code.doctorId].revenue += Number(code.totalRevenue || 0);
      doctorRevenue[code.doctorId].conversions += code.convertedToOrders || 0;
    });
    return Object.values(doctorRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [filteredCodes, doctors]);

  const getDoctorName = (doctorId: number) => {
    const doctor = doctors.find(d => d.id === doctorId);
    return doctor?.name || '-';
  };

  const toggleStatus = (code: ClinicCode) => {
    const newStatus = code.status === 'Active' ? 'Paused' : 'Active';
    updateCodeMutation.mutate({ id: code.id, data: { status: newStatus } });
    toast({ title: `Code ${newStatus === 'Active' ? 'Activated' : 'Paused'}` });
  };

  const bulkUpdateStatus = (status: 'Active' | 'Paused') => {
    selectedIds.forEach(id => {
      updateCodeMutation.mutate({ id, data: { status } });
    });
    toast({ title: `${selectedIds.length} codes ${status === 'Active' ? 'activated' : 'paused'}` });
    setSelectedIds([]);
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredCodes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCodes.map(c => c.id));
    }
  };

  const handleCreate = () => {
    createCodeMutation.mutate({
      code: newCode.code,
      type: newCode.type,
      doctorId: newCode.doctorId,
      discount: String(newCode.discount),
      status: 'Processing',
    });
  };

  const totalRevenue = clinicCodes.reduce((sum: number, c: ClinicCode) => sum + Number(c.totalRevenue || 0), 0);
  const totalConversions = clinicCodes.reduce((sum: number, c: ClinicCode) => sum + (c.convertedToOrders || 0), 0);

  const exportColumns = [
    { key: 'code', label: 'Code', defaultSelected: true },
    { key: 'type', label: 'Type', defaultSelected: true },
    { key: 'doctorId', label: 'Doctor', defaultSelected: true },
    { key: 'status', label: 'Status', defaultSelected: true },
    { key: 'usageCount', label: 'Usage' },
    { key: 'totalRevenue', label: 'Revenue' },
  ];

  const columns: Column<ClinicCode>[] = [
    { key: 'code', header: 'Code', sortable: true, render: (row) => (
      <div className="flex items-center gap-2">
        <QrCode className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono font-semibold">{row.code}</span>
      </div>
    )},
    { key: 'type', header: 'Type', render: (row) => <Badge variant="outline">{row.type}</Badge> },
    { key: 'doctorId', header: 'Doctor', render: (row) => getDoctorName(row.doctorId) },
    { key: 'discount', header: 'Discount', render: (row) => `${Number(row.discount)}%` },
    { key: 'status', header: 'Status', render: (row) => <StatusPill status={row.status} /> },
    { key: 'usageCount', header: 'Usage', render: (row) => (row.usageCount || 0).toLocaleString() },
    { key: 'totalRevenue', header: 'Revenue', render: (row) => `₹${Number(row.totalRevenue || 0).toLocaleString()}` },
    { key: 'actions', header: '', render: (row) => (
      <RowActionsMenu actions={[
        { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => setDetailDialog(row) },
        { label: row.status === 'Active' ? 'Pause' : 'Activate', icon: row.status === 'Active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />, onClick: () => toggleStatus(row) },
      ]} />
    )},
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Clinic Codes" description="Manage clinic referral codes and QR assets" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Clinic Codes" 
        description="Manage clinic referral codes and QR assets"
        actions={<Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-code"><Plus className="h-4 w-4 mr-2" /> Create Code</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Codes" value={clinicCodes.length} icon={<QrCode className="h-5 w-5" />} />
        <StatCard title="Active" value={clinicCodes.filter((c: ClinicCode) => c.status === 'Active').length} />
        <StatCard title="Conversions" value={totalConversions.toLocaleString()} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatCard title="Revenue" value={`₹${(totalRevenue / 1000).toFixed(0)}K`} icon={<DollarSign className="h-5 w-5" />} />
      </div>

      {/* Clinic Redemption Funnel Report */}
      {showFunnelReport && (
        <Card data-testid="card-funnel-report">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Clinic Redemption Funnel
                </CardTitle>
                <CardDescription>Track code performance from share to revenue</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowFunnelReport(false)}>Hide</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Funnel Visualization */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Conversion Funnel</h4>
                <div className="space-y-3">
                  {/* Codes Shared */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-blue-500" />
                        <span>Codes Shared</span>
                      </div>
                      <span className="font-bold" data-testid="text-codes-shared">{funnelMetrics.shared.toLocaleString()}</span>
                    </div>
                    <Progress value={100} className="h-3 bg-blue-100" />
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                  </div>
                  {/* Codes Used */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-green-500" />
                        <span>Codes Used</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{funnelMetrics.shareToUseRate}%</Badge>
                        <span className="font-bold" data-testid="text-codes-used">{funnelMetrics.used.toLocaleString()}</span>
                      </div>
                    </div>
                    <Progress value={funnelMetrics.shareToUseRate} className="h-3 bg-green-100" />
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                  </div>
                  {/* Orders Converted */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-orange-500" />
                        <span>Orders Converted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{funnelMetrics.useToConvertRate}%</Badge>
                        <span className="font-bold" data-testid="text-orders-converted">{funnelMetrics.converted.toLocaleString()}</span>
                      </div>
                    </div>
                    <Progress value={funnelMetrics.useToConvertRate} className="h-3 bg-orange-100" />
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                  </div>
                  {/* Revenue Generated */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-purple-500" />
                        <span>Revenue Generated</span>
                      </div>
                      <span className="font-bold text-lg" data-testid="text-revenue-generated">₹{funnelMetrics.revenue.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg Order Value: ₹{funnelMetrics.avgOrderValue.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue by Doctor Chart */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Revenue by Doctor</h4>
                {revenueByDoctor.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={revenueByDoctor} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                        contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                      />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No revenue data available
                  </div>
                )}
              </div>
            </div>

            {/* Top Performing Codes */}
            {topPerformingCodes.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Top Performing Codes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {topPerformingCodes.map((code, idx) => (
                      <Card key={code.id} className="hover-elevate cursor-pointer" onClick={() => setDetailDialog(code)} data-testid={`card-top-code-${idx}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">#{idx + 1}</Badge>
                            <span className="font-mono text-sm font-semibold truncate">{code.code}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{getDoctorName(code.doctorId)}</div>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">{code.convertedToOrders} orders</span>
                            <span className="font-semibold text-sm">₹{Number(code.totalRevenue || 0).toLocaleString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!showFunnelReport && (
        <Button variant="outline" size="sm" onClick={() => setShowFunnelReport(true)} data-testid="button-show-funnel">
          <BarChart3 className="h-4 w-4 mr-2" /> Show Redemption Funnel
        </Button>
      )}

      {/* Enhanced Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search codes or doctors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-type"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Bulk">Bulk</SelectItem>
              <SelectItem value="Retail">Retail</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Paused">Paused</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">Export</Button>
        </div>
        
        {/* Additional Filters Row */}
        <div className="flex flex-wrap gap-3">
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-doctor-filter">
              <SelectValue placeholder="Filter by Doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doctors</SelectItem>
              {doctors.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-performance">
              <SelectValue placeholder="Performance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Performance</SelectItem>
              <SelectItem value="high">High (10+ orders)</SelectItem>
              <SelectItem value="medium">Medium (3-9 orders)</SelectItem>
              <SelectItem value="low">Low (1-2 orders)</SelectItem>
              <SelectItem value="unused">Unused (0 usage)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input 
              type="date" 
              value={dateRange.from} 
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="w-[140px]"
              data-testid="input-date-from"
            />
            <span className="text-muted-foreground">to</span>
            <Input 
              type="date" 
              value={dateRange.to} 
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="w-[140px]"
              data-testid="input-date-to"
            />
          </div>
          {(doctorFilter !== 'all' || performanceFilter !== 'all' || dateRange.from || dateRange.to) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setDoctorFilter('all');
                setPerformanceFilter('all');
                setDateRange({ from: '', to: '' });
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.length} codes selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus('Active')} data-testid="button-bulk-activate">
              <Power className="h-4 w-4 mr-1" /> Activate All
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus('Paused')} data-testid="button-bulk-pause">
              <PowerOff className="h-4 w-4 mr-1" /> Pause All
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} data-testid="button-clear-selection">
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      <DataTable 
        columns={[
          { 
            key: 'select', 
            header: (
              <Checkbox 
                checked={selectedIds.length === filteredCodes.length && filteredCodes.length > 0}
                onCheckedChange={selectAll}
                data-testid="checkbox-select-all"
              />
            ), 
            render: (row) => (
              <Checkbox 
                checked={selectedIds.includes(row.id)}
                onCheckedChange={() => toggleSelection(row.id)}
                data-testid={`checkbox-row-${row.id}`}
              />
            )
          },
          ...columns
        ]} 
        data={filteredCodes} 
      />

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle>Create Clinic Code</DialogTitle>
            <DialogDescription>Generate a new clinic referral code</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Code</Label><Input value={newCode.code} onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} placeholder="e.g., CLINIC2025" data-testid="input-code" /></div>
            <div><Label>Type</Label>
              <Select value={newCode.type} onValueChange={(v) => setNewCode({ ...newCode, type: v as 'Bulk' | 'Retail' })}>
                <SelectTrigger data-testid="select-new-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bulk">Bulk</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Doctor</Label>
              <Select value={String(newCode.doctorId)} onValueChange={(v) => setNewCode({ ...newCode, doctorId: Number(v) })}>
                <SelectTrigger data-testid="select-doctor"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {doctors.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Discount (%)</Label><Input type="number" value={newCode.discount} onChange={(e) => setNewCode({ ...newCode, discount: Number(e.target.value) })} data-testid="input-discount" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newCode.code || !newCode.doctorId || createCodeMutation.isPending} data-testid="button-create">
              {createCodeMutation.isPending ? 'Creating...' : 'Create Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="w-[95vw] max-w-lg sm:w-full">
          <DialogHeader>
            <DialogTitle>Code Details: {detailDialog?.code}</DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-muted rounded-lg">
                <QRCodeGenerator code={detailDialog.code} size={150} showActions={false} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Doctor</Label><p className="font-medium">{getDoctorName(detailDialog.doctorId)}</p></div>
                <div><Label className="text-muted-foreground">Type</Label><Badge variant="outline">{detailDialog.type}</Badge></div>
                <div><Label className="text-muted-foreground">Discount</Label><p className="font-medium">{Number(detailDialog.discount)}%</p></div>
                <div><Label className="text-muted-foreground">Status</Label><StatusPill status={detailDialog.status} /></div>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-sm">Performance</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{detailDialog.usageCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Usage</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{detailDialog.convertedToOrders || 0}</p>
                    <p className="text-xs text-muted-foreground">Conversions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">₹{Number(detailDialog.totalRevenue || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} entityName="Clinic Codes" columns={exportColumns} totalRecords={filteredCodes.length} />
    </div>
  );
}
