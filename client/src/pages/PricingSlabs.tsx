import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { RowActionsMenu } from '@/components/shared/RowActionsMenu';
import { ExportModal } from '@/components/shared/ExportModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Layers, Eye, Plus, Search, Filter, TrendingUp, BarChart3, Users, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { PricingSlab } from '@shared/schema';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface SlabAnalytics {
  slabId: number;
  slabName: string;
  discount: number;
  isActive: boolean;
  totalDoctors: number;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  conversionRate: number;
  byMR: { mrId: number; name: string; revenue: number; orders: number; conversions: number }[];
  byRegion: { region: string; revenue: number; orders: number; conversions: number }[];
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function SlabAnalyticsContent({ 
  analytics, 
  selectedSlab, 
  view 
}: { 
  analytics: SlabAnalytics[]; 
  selectedSlab: number | 'all'; 
  view: 'mr' | 'region';
}) {
  const filteredAnalytics = useMemo(() => {
    if (selectedSlab === 'all') return analytics;
    return analytics.filter(a => a.slabId === selectedSlab);
  }, [analytics, selectedSlab]);

  // Aggregate totals
  const totals = useMemo(() => {
    return filteredAnalytics.reduce((acc, slab) => ({
      revenue: acc.revenue + slab.totalRevenue,
      orders: acc.orders + slab.totalOrders,
      completedOrders: acc.completedOrders + slab.completedOrders,
      doctors: acc.doctors + slab.totalDoctors,
    }), { revenue: 0, orders: 0, completedOrders: 0, doctors: 0 });
  }, [filteredAnalytics]);

  const overallConversionRate = totals.orders > 0 
    ? Math.round((totals.completedOrders / totals.orders) * 100) 
    : 0;

  // Prepare chart data based on view
  const chartData = useMemo(() => {
    if (view === 'mr') {
      const mrMap: Record<string, { name: string; revenue: number; orders: number; conversions: number }> = {};
      filteredAnalytics.forEach(slab => {
        slab.byMR.forEach(mr => {
          if (!mrMap[mr.name]) {
            mrMap[mr.name] = { name: mr.name, revenue: 0, orders: 0, conversions: 0 };
          }
          mrMap[mr.name].revenue += mr.revenue;
          mrMap[mr.name].orders += mr.orders;
          mrMap[mr.name].conversions += mr.conversions;
        });
      });
      return Object.values(mrMap)
        .map(mr => ({
          ...mr,
          conversionRate: mr.orders > 0 ? Math.round((mr.conversions / mr.orders) * 100) : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    } else {
      const regionMap: Record<string, { region: string; revenue: number; orders: number; conversions: number }> = {};
      filteredAnalytics.forEach(slab => {
        slab.byRegion.forEach(r => {
          if (!regionMap[r.region]) {
            regionMap[r.region] = { region: r.region, revenue: 0, orders: 0, conversions: 0 };
          }
          regionMap[r.region].revenue += r.revenue;
          regionMap[r.region].orders += r.orders;
          regionMap[r.region].conversions += r.conversions;
        });
      });
      return Object.values(regionMap)
        .map(r => ({
          name: r.region,
          revenue: r.revenue,
          orders: r.orders,
          conversionRate: r.orders > 0 ? Math.round((r.conversions / r.orders) * 100) : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    }
  }, [filteredAnalytics, view]);

  // Pie chart data for slab revenue distribution
  const pieData = useMemo(() => {
    return filteredAnalytics
      .filter(a => a.totalRevenue > 0)
      .map(a => ({
        name: a.slabName,
        value: a.totalRevenue,
        discount: a.discount,
      }));
  }, [filteredAnalytics]);

  if (filteredAnalytics.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No analytics data available for the selected slab</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-total-revenue">
              ₹{totals.revenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Orders</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-total-orders">
              {totals.orders.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-conversion-rate">
              {overallConversionRate}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Doctors</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-total-doctors">
              {totals.doctors.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Revenue by {view === 'mr' ? 'Medical Representative' : 'Region'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                    labelStyle={{ color: 'var(--foreground)' }}
                    contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Slab Revenue Distribution Pie Chart */}
        {selectedSlab === 'all' && pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue Distribution by Slab</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Conversion Rate Chart (shown when a specific slab is selected) */}
        {selectedSlab !== 'all' && chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Conversion Rate by {view === 'mr' ? 'MR' : 'Region'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Conversion Rate']}
                    contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                  />
                  <Bar dataKey="conversionRate" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Slab Performance Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Slab Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Slab</th>
                  <th className="text-right py-2 px-3">Discount</th>
                  <th className="text-right py-2 px-3">Doctors</th>
                  <th className="text-right py-2 px-3">Orders</th>
                  <th className="text-right py-2 px-3">Revenue</th>
                  <th className="text-right py-2 px-3">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnalytics.map(slab => (
                  <tr key={slab.slabId} className="border-b last:border-0 hover-elevate" data-testid={`row-slab-${slab.slabId}`}>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{slab.slabName}</span>
                        {!slab.isActive && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                    </td>
                    <td className="text-right py-2 px-3">{slab.discount}%</td>
                    <td className="text-right py-2 px-3">{slab.totalDoctors}</td>
                    <td className="text-right py-2 px-3">{slab.totalOrders}</td>
                    <td className="text-right py-2 px-3 font-medium">₹{slab.totalRevenue.toLocaleString()}</td>
                    <td className="text-right py-2 px-3">
                      <Badge variant={slab.conversionRate >= 70 ? 'default' : slab.conversionRate >= 40 ? 'secondary' : 'outline'}>
                        {slab.conversionRate}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PricingSlabs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedSlab, setSelectedSlab] = useState<PricingSlab | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [analyticsView, setAnalyticsView] = useState<'mr' | 'region'>('mr');
  const [selectedAnalyticsSlab, setSelectedAnalyticsSlab] = useState<number | 'all'>('all');
  const [newSlab, setNewSlab] = useState({ name: '', discount: 20, minOrderValue: 0, description: '' });

  const { data: slabs = [], isLoading } = useQuery<PricingSlab[]>({
    queryKey: ['/api/pricing-slabs'],
  });

  const { data: analytics = [], isLoading: analyticsLoading } = useQuery<SlabAnalytics[]>({
    queryKey: ['/api/pricing-slabs/analytics'],
  });

  const createSlabMutation = useMutation({
    mutationFn: async (data: { name: string; discount: string; minOrderValue?: string; description?: string }) => {
      const res = await apiRequest('POST', '/api/pricing-slabs', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-slabs'] });
      toast({ title: 'Pricing Slab Created', description: 'New pricing slab has been created successfully' });
      setCreateDialogOpen(false);
      setNewSlab({ name: '', discount: 20, minOrderValue: 0, description: '' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create pricing slab', variant: 'destructive' });
    },
  });

  const filteredSlabs = slabs.filter((slab: PricingSlab) => {
    const matchesSearch = slab.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (slab.isActive ? 'Active' : 'Inactive') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportColumns = [
    { key: 'id', label: 'ID', defaultSelected: true },
    { key: 'name', label: 'Name', defaultSelected: true },
    { key: 'discount', label: 'Discount', defaultSelected: true },
    { key: 'minOrderValue', label: 'Min Order Value' },
    { key: 'description', label: 'Description' },
    { key: 'isActive', label: 'Status', defaultSelected: true },
  ];

  const handleCreate = () => {
    createSlabMutation.mutate({
      name: newSlab.name,
      discount: String(newSlab.discount),
      minOrderValue: newSlab.minOrderValue ? String(newSlab.minOrderValue) : undefined,
      description: newSlab.description || undefined,
    });
  };

  const columns: Column<PricingSlab>[] = [
    { key: 'id', header: 'ID', sortable: true, render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: 'name', header: 'Slab Name', sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'discount', header: 'Discount', render: (row) => `${Number(row.discount)}%` },
    { key: 'minOrderValue', header: 'Min Order', render: (row) => row.minOrderValue ? `₹${Number(row.minOrderValue).toLocaleString()}` : '-' },
    { key: 'isActive', header: 'Status', render: (row) => <StatusPill status={row.isActive ? 'Active' : 'Inactive'} /> },
    { key: 'createdAt', header: 'Created', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-' },
    { key: 'actions', header: '', render: (row) => (
      <RowActionsMenu actions={[
        { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => { setSelectedSlab(row); setDetailDialogOpen(true); } },
      ]} />
    )},
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pricing Slabs" description="Manage customer pricing tiers" />
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
        title="Pricing Slabs" 
        description="Manage customer pricing tiers"
        actions={<Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-slab"><Plus className="h-4 w-4 mr-2" /> Create Slab</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Slabs" value={slabs.length} icon={<Layers className="h-5 w-5" />} />
        <StatCard title="Active Slabs" value={slabs.filter((s: PricingSlab) => s.isActive).length} />
        <StatCard title="Avg Discount" value={`${slabs.length > 0 ? Math.round(slabs.reduce((sum: number, s: PricingSlab) => sum + Number(s.discount), 0) / slabs.length) : 0}%`} />
        <StatCard title="Inactive" value={slabs.filter((s: PricingSlab) => !s.isActive).length} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search slabs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">Export</Button>
      </div>

      <DataTable columns={columns} data={filteredSlabs} />

      {/* Slab Performance Analytics Section */}
      <Card data-testid="card-slab-analytics">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Slab Performance Analytics
              </CardTitle>
              <CardDescription>Revenue and conversion metrics across pricing slabs</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={String(selectedAnalyticsSlab)} onValueChange={(v) => setSelectedAnalyticsSlab(v === 'all' ? 'all' : Number(v))}>
                <SelectTrigger className="w-[180px]" data-testid="select-analytics-slab">
                  <SelectValue placeholder="Select Slab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Slabs</SelectItem>
                  {slabs.map(slab => (
                    <SelectItem key={slab.id} value={String(slab.id)}>{slab.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tabs value={analyticsView} onValueChange={(v) => setAnalyticsView(v as 'mr' | 'region')} className="w-auto">
                <TabsList>
                  <TabsTrigger value="mr" data-testid="tab-by-mr"><Users className="h-4 w-4 mr-1" /> By MR</TabsTrigger>
                  <TabsTrigger value="region" data-testid="tab-by-region"><MapPin className="h-4 w-4 mr-1" /> By Region</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[300px] w-full" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            </div>
          ) : (
            <SlabAnalyticsContent 
              analytics={analytics} 
              selectedSlab={selectedAnalyticsSlab} 
              view={analyticsView} 
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle>Create Pricing Slab</DialogTitle>
            <DialogDescription>Define a new customer pricing tier</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Slab Name</Label><Input value={newSlab.name} onChange={(e) => setNewSlab({ ...newSlab, name: e.target.value })} placeholder="e.g., Premium Doctors" data-testid="input-name" /></div>
            <div><Label>Discount (%)</Label><Input type="number" value={newSlab.discount} onChange={(e) => setNewSlab({ ...newSlab, discount: Number(e.target.value) })} data-testid="input-discount" /></div>
            <div><Label>Minimum Order Value (₹)</Label><Input type="number" value={newSlab.minOrderValue} onChange={(e) => setNewSlab({ ...newSlab, minOrderValue: Number(e.target.value) })} data-testid="input-min-order" /></div>
            <div><Label>Description</Label><Input value={newSlab.description} onChange={(e) => setNewSlab({ ...newSlab, description: e.target.value })} placeholder="Optional description" data-testid="input-description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newSlab.name || createSlabMutation.isPending} data-testid="button-create">
              {createSlabMutation.isPending ? 'Creating...' : 'Create Slab'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle>{selectedSlab?.name}</DialogTitle>
            <DialogDescription>Pricing Slab Details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">ID</Label><p className="font-medium">{selectedSlab?.id}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><StatusPill status={selectedSlab?.isActive ? 'Active' : 'Inactive'} /></div>
              <div><Label className="text-muted-foreground">Discount</Label><p className="font-medium">{Number(selectedSlab?.discount)}%</p></div>
              <div><Label className="text-muted-foreground">Min Order</Label><p className="font-medium">{selectedSlab?.minOrderValue ? `₹${Number(selectedSlab.minOrderValue).toLocaleString()}` : '-'}</p></div>
            </div>
            {selectedSlab?.description && (
              <div><Label className="text-muted-foreground">Description</Label><p>{selectedSlab.description}</p></div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} entityName="Pricing Slabs" columns={exportColumns} totalRecords={filteredSlabs.length} />
    </div>
  );
}
