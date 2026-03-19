import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { RowActionsMenu } from '@/components/shared/RowActionsMenu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportModal } from '@/components/shared/ExportModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Edit, Trash2, Plus, Search, Filter, Calculator, Power, PowerOff, Package, X, Check, TrendingUp, TrendingDown, BarChart3, Target, DollarSign, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Scheme, Product } from '@shared/schema';

type SchemeType = 'percentage' | 'buyXgetY' | 'bundle' | 'fixed';

// ─── ROI helpers ──────────────────────────────────────────────────────────────
const AVG_ORDER_VALUE = 2500;  // assumed basket in ₹ for pharma

function estimateCostPerUse(scheme: Scheme): number {
  const discount = Number(scheme.discount || 0);
  switch (scheme.type) {
    case 'percentage': return (AVG_ORDER_VALUE * discount) / 100;
    case 'fixed':      return discount;
    case 'buyXgetY':   return ((scheme.getQty || 1) / (scheme.buyQty || 3)) * (AVG_ORDER_VALUE / 5);
    case 'bundle':     return (AVG_ORDER_VALUE * discount) / 100;
    default:           return 0;
  }
}

function schemeROI(scheme: Scheme) {
  const usage      = scheme.usageCount || 0;
  const costPer    = estimateCostPerUse(scheme);
  const totalCost  = usage * costPer;
  const upliftPer  = costPer * 3.2;          // 3.2× return assumption (usage-driven)
  const totalUplift = usage * upliftPer;
  const roi        = totalCost > 0 ? ((totalUplift - totalCost) / totalCost) * 100 : 0;
  return { usage, totalCost, totalUplift, roi };
}

function SchemeHeaderTabs({ schemes }: { schemes: Scheme[] }) {
  const totalUsage    = schemes.reduce((s, x) => s + (x.usageCount || 0), 0);
  const activeCount   = schemes.filter(s => s.status === 'Active').length;
  const scheduledCount = schemes.filter(s => s.status === 'Scheduled').length;

  // Aggregate ROI
  let aggCost   = 0;
  let aggUplift = 0;
  schemes.forEach(s => {
    const { totalCost, totalUplift } = schemeROI(s);
    aggCost   += totalCost;
    aggUplift += totalUplift;
  });
  const blendedROI = aggCost > 0 ? ((aggUplift - aggCost) / aggCost) * 100 : 0;
  const isPositive = blendedROI >= 0;

  // Top-5 by ROI for the mini-table
  const rankedSchemes = [...schemes]
    .map(s => ({ s, ...schemeROI(s) }))
    .filter(x => x.usage > 0)
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);

  const fmt = (n: number) => `₹${n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toFixed(0)}`;

  return (
    <Tabs defaultValue="usage" className="w-full" data-testid="tabs-scheme-header">
      <TabsList className="mb-3" data-testid="tablist-scheme-header">
        <TabsTrigger value="usage" data-testid="tab-usage">
          <Activity className="h-3.5 w-3.5 mr-1.5" />
          Usage
        </TabsTrigger>
        <TabsTrigger value="roi" data-testid="tab-roi">
          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
          ROI Tracker
        </TabsTrigger>
      </TabsList>

      {/* ── Usage tab (existing stat cards) ── */}
      <TabsContent value="usage" className="mt-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Schemes"  value={schemes.length}             icon={<Gift className="h-5 w-5" />} />
          <StatCard title="Active Schemes" value={activeCount}                 />
          <StatCard title="Total Usage"    value={totalUsage.toLocaleString()} />
          <StatCard title="Scheduled"      value={scheduledCount}              />
        </div>
      </TabsContent>

      {/* ── ROI Tracker tab (new) ── */}
      <TabsContent value="roi" className="mt-0 space-y-4">
        {/* Summary KPI strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card data-testid="card-total-cost">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Campaign Cost</p>
                  <p className="text-2xl font-semibold font-display" data-testid="stat-campaign-cost">{fmt(aggCost)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Discounts given across {totalUsage.toLocaleString()} uses</p>
                </div>
                <div className="p-2.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-revenue-uplift">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Revenue Uplift</p>
                  <p className="text-2xl font-semibold font-display" data-testid="stat-revenue-uplift">{fmt(aggUplift)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Usage-driven incremental revenue</p>
                </div>
                <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-blended-roi">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Campaign ROI %</p>
                  <p className={`text-2xl font-semibold font-display ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid="stat-campaign-roi">
                    {isPositive ? '+' : ''}{blendedROI.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Blended across all schemes</p>
                </div>
                <div className={`p-2.5 rounded-lg ${isPositive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  <Target className={`h-5 w-5 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per-scheme breakdown */}
        {rankedSchemes.length > 0 ? (
          <Card data-testid="card-scheme-roi-breakdown">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Scheme-level ROI Breakdown
                <Badge variant="secondary" className="ml-auto text-xs">By usage</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {rankedSchemes.map(({ s, usage, totalCost, totalUplift, roi }, idx) => {
                  const positive = roi >= 0;
                  const maxUplift = Math.max(...rankedSchemes.map(x => x.totalUplift), 1);
                  const barPct = Math.min((totalUplift / maxUplift) * 100, 100);
                  return (
                    <div key={s.id} className="px-4 py-3" data-testid={`row-roi-${s.id}`}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xs font-mono text-muted-foreground w-4">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            <Badge variant="outline" className="text-xs shrink-0">{s.type}</Badge>
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          <p className={`text-sm font-semibold ${positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid={`stat-roi-${s.id}`}>
                            {positive ? '+' : ''}{roi.toFixed(0)}% ROI
                          </p>
                          <p className="text-xs text-muted-foreground">{usage.toLocaleString()} uses · Cost {fmt(totalCost)}</p>
                        </div>
                      </div>
                      {/* Revenue uplift bar */}
                      <div className="ml-7 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                            style={{ width: `${barPct}%` }}
                            data-testid={`bar-uplift-${s.id}`}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-14 text-right">{fmt(totalUplift)} uplift</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No scheme usage data available yet.</p>
              <p className="text-xs text-muted-foreground/70">ROI metrics will appear once schemes are applied to orders.</p>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground/60 px-1" data-testid="note-roi-methodology">
          * ROI based on scheme usage data. Revenue uplift estimated at 3.2× per usage event; cost = discount given. Methodology tied to usage count only.
        </p>
      </TabsContent>
    </Tabs>
  );
}

export default function Schemes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [simulationDialogOpen, setSimulationDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [newScheme, setNewScheme] = useState<{
    name: string;
    type: SchemeType;
    discount: number;
    buyQty: number;
    getQty: number;
    minOrderValue: number;
    maxDiscount: number;
    validFrom: string;
    validTo: string;
    productAssignment: 'all' | 'include' | 'exclude';
    applicableProducts: number[];
    excludedProducts: number[];
  }>({ 
    name: '', 
    type: 'percentage', 
    discount: 10, 
    buyQty: 3, 
    getQty: 1, 
    minOrderValue: 0, 
    maxDiscount: 0, 
    validFrom: '', 
    validTo: '',
    productAssignment: 'all',
    applicableProducts: [],
    excludedProducts: [],
  });
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [simulationCart, setSimulationCart] = useState([{ productId: 1, qty: 2, price: 1299 }]);

  const EMPTY_SCHEME = {
    name: '', type: 'percentage' as SchemeType, discount: 10, buyQty: 3, getQty: 1,
    minOrderValue: 0, maxDiscount: 0, validFrom: '', validTo: '',
    productAssignment: 'all' as const, applicableProducts: [] as number[], excludedProducts: [] as number[],
  };

  const resetForm = () => {
    setNewScheme(EMPTY_SCHEME);
    setProductSearchQuery('');
    setIsEditMode(false);
  };

  const { data: schemes = [], isLoading } = useQuery<Scheme[]>({
    queryKey: ['/api/schemes'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const createSchemeMutation = useMutation({
    mutationFn: async (data: Partial<Scheme>) => {
      const res = await apiRequest('POST', '/api/schemes', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schemes'] });
      toast({ title: 'Scheme Created', description: 'New scheme has been created successfully' });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create scheme', variant: 'destructive' });
    },
  });

  const updateSchemeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Scheme> }) => {
      const res = await apiRequest('PATCH', `/api/schemes/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schemes'] });
      toast({ title: 'Scheme Updated', description: 'Scheme has been updated successfully' });
      setCreateDialogOpen(false);
      setIsEditMode(false);
      resetForm();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update scheme', variant: 'destructive' });
    },
  });

  const deleteSchemeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/schemes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schemes'] });
      toast({ title: 'Scheme Deleted', variant: 'destructive' });
      setDeleteDialogOpen(false);
    },
  });

  const filteredSchemes = schemes.filter((scheme: Scheme) => {
    const matchesSearch = scheme.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || scheme.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportColumns = [
    { key: 'id', label: 'ID', defaultSelected: true },
    { key: 'name', label: 'Name', defaultSelected: true },
    { key: 'type', label: 'Type', defaultSelected: true },
    { key: 'status', label: 'Status', defaultSelected: true },
    { key: 'usageCount', label: 'Usage Count' },
    { key: 'validFrom', label: 'Valid From' },
    { key: 'validTo', label: 'Valid To' },
  ];

  // Filter products for selection UI
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery) return products;
    const query = productSearchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.code?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query)
    );
  }, [products, productSearchQuery]);

  // Group products by category for easier selection
  const productsByCategory = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!groups[category]) groups[category] = [];
      groups[category].push(product);
    });
    return groups;
  }, [products]);

  const toggleProductSelection = (productId: number, listType: 'applicable' | 'excluded') => {
    if (listType === 'applicable') {
      setNewScheme(prev => ({
        ...prev,
        applicableProducts: prev.applicableProducts.includes(productId)
          ? prev.applicableProducts.filter(id => id !== productId)
          : [...prev.applicableProducts, productId]
      }));
    } else {
      setNewScheme(prev => ({
        ...prev,
        excludedProducts: prev.excludedProducts.includes(productId)
          ? prev.excludedProducts.filter(id => id !== productId)
          : [...prev.excludedProducts, productId]
      }));
    }
  };

  const selectAllProducts = (listType: 'applicable' | 'excluded') => {
    const allIds = products.map(p => p.id);
    if (listType === 'applicable') {
      setNewScheme(prev => ({ ...prev, applicableProducts: allIds }));
    } else {
      setNewScheme(prev => ({ ...prev, excludedProducts: allIds }));
    }
  };

  const clearProductSelection = (listType: 'applicable' | 'excluded') => {
    if (listType === 'applicable') {
      setNewScheme(prev => ({ ...prev, applicableProducts: [] }));
    } else {
      setNewScheme(prev => ({ ...prev, excludedProducts: [] }));
    }
  };

  const buildSchemePayload = () => ({
    name: newScheme.name,
    type: newScheme.type,
    discount: String(newScheme.discount),
    buyQty: newScheme.type === 'buyXgetY' ? newScheme.buyQty : undefined,
    getQty: newScheme.type === 'buyXgetY' ? newScheme.getQty : undefined,
    minOrderValue: newScheme.minOrderValue ? String(newScheme.minOrderValue) : undefined,
    maxDiscount: newScheme.maxDiscount ? String(newScheme.maxDiscount) : undefined,
    validFrom: newScheme.validFrom,
    validTo: newScheme.validTo,
    applicableProducts: newScheme.productAssignment === 'include' ? newScheme.applicableProducts : null,
    excludedProducts: newScheme.productAssignment === 'exclude' ? newScheme.excludedProducts : null,
  });

  const handleCreate = () => {
    if (isEditMode && selectedScheme) {
      updateSchemeMutation.mutate({ id: selectedScheme.id, data: buildSchemePayload() });
    } else {
      createSchemeMutation.mutate({ ...buildSchemePayload(), status: 'Active' });
    }
  };

  const openEditDialog = (scheme: Scheme) => {
    setSelectedScheme(scheme);
    setNewScheme({
      name: scheme.name,
      type: scheme.type as SchemeType,
      discount: Number(scheme.discount),
      buyQty: scheme.buyQty || 3,
      getQty: scheme.getQty || 1,
      minOrderValue: Number(scheme.minOrderValue || 0),
      maxDiscount: Number(scheme.maxDiscount || 0),
      validFrom: scheme.validFrom || '',
      validTo: scheme.validTo || '',
      productAssignment: scheme.applicableProducts?.length ? 'include' : scheme.excludedProducts?.length ? 'exclude' : 'all',
      applicableProducts: (scheme.applicableProducts as number[]) || [],
      excludedProducts: (scheme.excludedProducts as number[]) || [],
    });
    setIsEditMode(true);
    setCreateDialogOpen(true);
  };

  const handleDelete = () => {
    if (!selectedScheme) return;
    deleteSchemeMutation.mutate(selectedScheme.id);
  };

  const toggleStatus = (scheme: Scheme) => {
    const newStatus = scheme.status === 'Active' ? 'Paused' : 'Active';
    updateSchemeMutation.mutate({ 
      id: scheme.id, 
      data: { status: newStatus } 
    });
    toast({ title: `Scheme ${newStatus === 'Active' ? 'Activated' : 'Paused'}` });
  };

  const calculateDiscount = () => {
    if (!selectedScheme) return 0;
    const subtotal = simulationCart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discount = Number(selectedScheme.discount);
    const maxDiscount = Number(selectedScheme.maxDiscount || 0);
    const minOrderValue = Number(selectedScheme.minOrderValue || 0);
    
    switch (selectedScheme.type) {
      case 'percentage':
        const percentDiscount = subtotal * (discount / 100);
        return maxDiscount ? Math.min(percentDiscount, maxDiscount) : percentDiscount;
      case 'fixed':
        return subtotal >= minOrderValue ? discount : 0;
      case 'buyXgetY':
        const totalQty = simulationCart.reduce((sum, item) => sum + item.qty, 0);
        const freeItems = Math.floor(totalQty / (selectedScheme.buyQty || 3)) * (selectedScheme.getQty || 1);
        return freeItems * (simulationCart[0]?.price || 0);
      case 'bundle':
        return subtotal * (discount / 100);
      default:
        return 0;
    }
  };

  const columns: Column<Scheme>[] = [
    { key: 'id', header: 'ID', sortable: true, render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: 'name', header: 'Scheme Name', sortable: true, render: (row) => (
      <div>
        <p className="font-medium">{row.name}</p>
        <Badge variant="outline" className="mt-1">{row.type}</Badge>
      </div>
    )},
    { key: 'discount', header: 'Discount', render: (row) => {
      if (row.type === 'percentage') return `${row.discount}%`;
      if (row.type === 'fixed') return `₹${row.discount}`;
      if (row.type === 'buyXgetY') return `Buy ${row.buyQty} Get ${row.getQty}`;
      return `${row.discount}% bundle`;
    }},
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusPill status={row.status} /> },
    { key: 'validFrom', header: 'Validity', render: (row) => `${row.validFrom} - ${row.validTo}` },
    { key: 'usageCount', header: 'Usage', sortable: true, render: (row) => (row.usageCount || 0).toLocaleString() },
    { key: 'actions', header: '', render: (row) => (
      <RowActionsMenu actions={[
        { label: 'Simulate', icon: <Calculator className="h-4 w-4" />, onClick: () => { setSelectedScheme(row); setSimulationDialogOpen(true); } },
        { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => openEditDialog(row) },
        { label: row.status === 'Active' ? 'Pause' : 'Activate', icon: row.status === 'Active' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />, onClick: () => toggleStatus(row) },
        { separator: true, label: '', onClick: () => {} },
        { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setSelectedScheme(row); setDeleteDialogOpen(true); }, destructive: true },
      ]} />
    )},
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Schemes & Promotions" description="Manage discount schemes and promotional offers" />
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
        title="Schemes & Promotions" 
        description="Manage discount schemes and promotional offers"
        actions={<Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-scheme"><Plus className="h-4 w-4 mr-2" /> Create Scheme</Button>}
      />

      <SchemeHeaderTabs schemes={schemes} />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search schemes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Scheduled">Scheduled</SelectItem>
            <SelectItem value="Paused">Paused</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">Export</Button>
      </div>

      <DataTable columns={columns} data={filteredSchemes} />

      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) { setCreateDialogOpen(false); resetForm(); } else setCreateDialogOpen(true); }}>
        <DialogContent className="w-[95vw] max-w-2xl sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Scheme' : 'Create Scheme'}</DialogTitle>
            <DialogDescription>{isEditMode ? 'Update the promotional scheme details' : 'Define a new promotional scheme'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Scheme Name</Label><Input value={newScheme.name} onChange={(e) => setNewScheme({ ...newScheme, name: e.target.value })} placeholder="e.g., Summer Sale 15%" data-testid="input-name" /></div>
            <div><Label>Type</Label>
              <Select value={newScheme.type} onValueChange={(v) => setNewScheme({ ...newScheme, type: v as SchemeType })}>
                <SelectTrigger data-testid="select-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Off</SelectItem>
                  <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                  <SelectItem value="buyXgetY">Buy X Get Y Free</SelectItem>
                  <SelectItem value="bundle">Bundle Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newScheme.type === 'percentage' && (
              <div><Label>Discount (%)</Label><Input type="number" value={newScheme.discount} onChange={(e) => setNewScheme({ ...newScheme, discount: Number(e.target.value) })} data-testid="input-discount" /></div>
            )}
            {newScheme.type === 'fixed' && (
              <div><Label>Discount Amount (₹)</Label><Input type="number" value={newScheme.discount} onChange={(e) => setNewScheme({ ...newScheme, discount: Number(e.target.value) })} data-testid="input-discount-fixed" /></div>
            )}
            {newScheme.type === 'buyXgetY' && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Buy Quantity</Label><Input type="number" value={newScheme.buyQty} onChange={(e) => setNewScheme({ ...newScheme, buyQty: Number(e.target.value) })} data-testid="input-buy-qty" /></div>
                <div><Label>Get Free</Label><Input type="number" value={newScheme.getQty} onChange={(e) => setNewScheme({ ...newScheme, getQty: Number(e.target.value) })} data-testid="input-get-qty" /></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min Order Value (₹)</Label><Input type="number" value={newScheme.minOrderValue} onChange={(e) => setNewScheme({ ...newScheme, minOrderValue: Number(e.target.value) })} data-testid="input-min-order" /></div>
              <div><Label>Max Discount (₹)</Label><Input type="number" value={newScheme.maxDiscount} onChange={(e) => setNewScheme({ ...newScheme, maxDiscount: Number(e.target.value) })} data-testid="input-max-discount" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valid From</Label><Input type="date" value={newScheme.validFrom} onChange={(e) => setNewScheme({ ...newScheme, validFrom: e.target.value })} data-testid="input-valid-from" /></div>
              <div><Label>Valid To</Label><Input type="date" value={newScheme.validTo} onChange={(e) => setNewScheme({ ...newScheme, validTo: e.target.value })} data-testid="input-valid-to" /></div>
            </div>

            <Separator />

            {/* Product Assignment Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <Label className="text-base font-medium">Product Assignment</Label>
              </div>
              <p className="text-sm text-muted-foreground">Define which products this scheme applies to</p>
              
              <Select 
                value={newScheme.productAssignment} 
                onValueChange={(v) => setNewScheme({ 
                  ...newScheme, 
                  productAssignment: v as 'all' | 'include' | 'exclude',
                  applicableProducts: [],
                  excludedProducts: [],
                })}
              >
                <SelectTrigger data-testid="select-product-assignment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Apply to All Products</SelectItem>
                  <SelectItem value="include">Include Specific Products Only</SelectItem>
                  <SelectItem value="exclude">Exclude Specific Products</SelectItem>
                </SelectContent>
              </Select>

              {newScheme.productAssignment !== 'all' && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        {newScheme.productAssignment === 'include' ? 'Included Products' : 'Excluded Products'}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => selectAllProducts(newScheme.productAssignment === 'include' ? 'applicable' : 'excluded')}
                          data-testid="button-select-all"
                        >
                          <Check className="h-3 w-3 mr-1" /> All
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => clearProductSelection(newScheme.productAssignment === 'include' ? 'applicable' : 'excluded')}
                          data-testid="button-clear-selection"
                        >
                          <X className="h-3 w-3 mr-1" /> Clear
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search products..." 
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-product-search"
                      />
                    </div>
                    
                    {/* Selected count badge */}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" data-testid="badge-selected-count">
                        {newScheme.productAssignment === 'include' 
                          ? `${newScheme.applicableProducts.length} product(s) selected`
                          : `${newScheme.excludedProducts.length} product(s) excluded`
                        }
                      </Badge>
                    </div>

                    <ScrollArea className="h-[200px] border rounded-md">
                      <div className="p-2 space-y-1">
                        {filteredProducts.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No products found</p>
                        ) : (
                          filteredProducts.map(product => {
                            const isSelected = newScheme.productAssignment === 'include'
                              ? newScheme.applicableProducts.includes(product.id)
                              : newScheme.excludedProducts.includes(product.id);
                            
                            return (
                              <div 
                                key={product.id}
                                className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                                onClick={() => toggleProductSelection(
                                  product.id, 
                                  newScheme.productAssignment === 'include' ? 'applicable' : 'excluded'
                                )}
                                data-testid={`product-item-${product.id}`}
                              >
                                <Checkbox 
                                  checked={isSelected}
                                  onCheckedChange={() => toggleProductSelection(
                                    product.id,
                                    newScheme.productAssignment === 'include' ? 'applicable' : 'excluded'
                                  )}
                                  data-testid={`checkbox-product-${product.id}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{product.name}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{product.code}</span>
                                    {product.category && (
                                      <Badge variant="outline" className="text-xs">{product.category}</Badge>
                                    )}
                                  </div>
                                </div>
                                <span className="text-sm text-muted-foreground">₹{Number(product.mrp).toLocaleString()}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {newScheme.productAssignment === 'all' && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">This scheme will apply to all {products.length} products in the catalog</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!newScheme.name || !newScheme.validFrom || !newScheme.validTo || createSchemeMutation.isPending || updateSchemeMutation.isPending}
              data-testid="button-create"
            >
              {isEditMode
                ? (updateSchemeMutation.isPending ? 'Saving...' : 'Save Changes')
                : (createSchemeMutation.isPending ? 'Creating...' : 'Create Scheme')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={simulationDialogOpen} onOpenChange={setSimulationDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle>Discount Simulation</DialogTitle>
            <DialogDescription>{selectedScheme?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Sample Cart</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {simulationCart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>{products.find(p => p.id === item.productId)?.name || 'Product'} × {item.qty}</span>
                    <span>₹{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between"><span>Subtotal</span><span>₹{simulationCart.reduce((sum, i) => sum + i.price * i.qty, 0).toLocaleString()}</span></div>
                <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{calculateDiscount().toLocaleString()}</span></div>
                <Separator />
                <div className="flex justify-between font-semibold"><span>Total</span><span>₹{(simulationCart.reduce((sum, i) => sum + i.price * i.qty, 0) - calculateDiscount()).toLocaleString()}</span></div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button onClick={() => setSimulationDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Delete Scheme" description={`Are you sure you want to delete ${selectedScheme?.name}?`} requireReason confirmLabel="Delete" destructive onConfirm={handleDelete} />
      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} entityName="Schemes" columns={exportColumns} totalRecords={filteredSchemes.length} />
    </div>
  );
}
