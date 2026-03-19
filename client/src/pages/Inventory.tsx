import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, AlertTriangle, Package, Plus, ArrowRightLeft, ClipboardCheck, Loader2, Clock, TrendingDown, Hourglass, CheckCircle, Bell, Mail, MessageSquare, Settings, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { CreateEditDrawer, FormField } from '@/components/shared/CreateEditDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportModal } from '@/components/shared/ExportModal';
import { EntityDetailDrawer } from '@/components/shared/EntityDetailDrawer';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import type { Inventory as InventoryItem, Product, Warehouse } from '@shared/schema';

const stockAdjustReasons = [
  { value: 'damage', label: 'Damaged Goods' },
  { value: 'lost', label: 'Lost/Missing' },
  { value: 'expiry', label: 'Expired' },
  { value: 'writeoff', label: 'Write-off' },
  { value: 'correction', label: 'Inventory Correction' },
  { value: 'return', label: 'Customer Return' },
  { value: 'physical_count', label: 'Physical Count Adjustment' },
  { value: 'transfer_error', label: 'Transfer Error Correction' },
];

const stockAdjustFields: FormField[] = [
  { name: 'adjustment', label: 'Adjustment Quantity', type: 'number', required: true, helpText: 'Use negative for reduction' },
  { name: 'reasonCode', label: 'Reason', type: 'select', required: true, options: stockAdjustReasons },
  { name: 'notes', label: 'Additional Notes', type: 'text', required: false, helpText: 'Optional details for audit trail' },
];

const exportColumns = [
  { key: 'productName', label: 'Product' },
  { key: 'sku', label: 'SKU' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'batch', label: 'Batch' },
  { key: 'expiry', label: 'Expiry' },
  { key: 'available', label: 'Available' },
  { key: 'sold', label: 'Sold' },
  { key: 'total', label: 'Total' },
];

// Historical stock flow data (mock data for visualization)
const stockFlowData = [
  { month: 'Sep', inward: 2500, outward: 1800, sales: 1500, adjustments: -120 },
  { month: 'Oct', inward: 3200, outward: 2100, sales: 1900, adjustments: -80 },
  { month: 'Nov', inward: 2800, outward: 2400, sales: 2200, adjustments: -150 },
  { month: 'Dec', inward: 4100, outward: 3200, sales: 2900, adjustments: -200 },
  { month: 'Jan', inward: 3500, outward: 2800, sales: 2500, adjustments: -100 },
  { month: 'Feb', inward: 2900, outward: 2200, sales: 2000, adjustments: -90 },
];

export default function Inventory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  
  // Modal states
  const [grnDrawerOpen, setGrnDrawerOpen] = useState(false);
  const [adjustDrawerOpen, setAdjustDrawerOpen] = useState(false);
  type EnrichedInventory = InventoryItem & { product?: Product; warehouse?: Warehouse; daysToExpiry: number; expiryStatus: string; grnAge: number; grnAgingStatus: string; nonMoving: boolean; fifoCompliant: boolean };
  const [selectedInventory, setSelectedInventory] = useState<EnrichedInventory | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  
  // Alert configuration state
  const [alertSettings, setAlertSettings] = useState({
    emailEnabled: true,
    whatsappEnabled: false,
    expiryThreshold30: true,
    expiryThreshold60: true,
    expiryThreshold90: false,
    nonMovingAlert: true,
    agedGrnAlert: true,
    alertFrequency: 'daily',
    recipients: '',
  });

  const { data: inventory = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['/api/inventory'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const grnFieldsWithOptions: FormField[] = useMemo(() => [
    { 
      name: 'warehouseId', 
      label: 'Warehouse', 
      type: 'select', 
      required: true, 
      options: warehouses.length > 0 
        ? warehouses.map(w => ({ value: w.id.toString(), label: `${w.name} (${w.code})` }))
        : [{ value: '', label: 'Loading warehouses...' }]
    },
    { 
      name: 'productId', 
      label: 'Product', 
      type: 'select', 
      required: true, 
      options: products.length > 0 
        ? products.map(p => ({ value: p.id.toString(), label: `${p.name} (${p.sku})` }))
        : [{ value: '', label: 'Loading products...' }]
    },
    { name: 'supplier', label: 'Supplier', type: 'text', required: true, defaultValue: 'Monoskin Manufacturing' },
    { name: 'batch', label: 'Batch Number', type: 'text', required: true, placeholder: 'e.g., BATCH-2026-001' },
    { name: 'receivedAt', label: 'Received Date', type: 'date', required: true },
    { name: 'expiryDate', label: 'Expiry Date', type: 'date', required: true },
    { name: 'quantity', label: 'Quantity Received', type: 'number', required: true, placeholder: 'Enter quantity' },
    { name: 'notes', label: 'Notes', type: 'textarea', required: false, placeholder: 'Any additional notes' },
  ], [warehouses, products]);

  const createInventoryMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const payload = {
        productId: parseInt(data.productId as string),
        warehouseId: parseInt(data.warehouseId as string),
        batch: data.batch as string,
        expiry: data.expiryDate as string,
        available: parseInt(data.quantity as string),
        reserved: 0,
        total: parseInt(data.quantity as string),
        costPrice: "0",
        notes: data.notes || '',
      };
      const res = await apiRequest('POST', '/api/inventory', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({ title: 'GRN Created', description: 'Inventory stock added successfully.' });
      setGrnDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const adjustInventoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const adjustment = Number(data.adjustment) || 0;
      const current = selectedInventory!;
      const newAvailable = current.available + adjustment;
      const newTotal = current.total + adjustment;
      const payload = {
        available: Math.max(0, newAvailable),
        total: Math.max(0, newTotal),
        reason: data.reasonCode as string,
      };
      const res = await apiRequest('PATCH', `/api/inventory/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      setAdjustDrawerOpen(false);
      setSelectedInventory(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getDaysToExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (days: number) => {
    if (days <= 30) return 'critical';
    if (days <= 60) return 'warning';
    if (days <= 90) return 'caution';
    return 'ok';
  };

  const getGrnAge = (batchDate: string) => {
    const batchCreated = new Date(batchDate);
    const today = new Date();
    const diffTime = today.getTime() - batchCreated.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  const getGrnAgingStatus = (days: number) => {
    if (days > 180) return 'aged';
    if (days > 90) return 'warning';
    return 'fresh';
  };
  
  const isNonMoving = (item: InventoryItem) => {
    const daysSinceReceipt = getGrnAge(item.expiry);
    const stockMovementRatio = item.total > 0 ? (item.total - item.available) / item.total : 0;
    return daysSinceReceipt > 60 && stockMovementRatio < 0.2;
  };

  const enrichedInventory = inventory.map(inv => {
    const product = products.find(p => p.id === inv.productId);
    const warehouse = warehouses.find(w => w.id === inv.warehouseId);
    const daysToExpiry = getDaysToExpiry(inv.expiry);
    const expiryStatus = getExpiryStatus(daysToExpiry);
    const grnAge = getGrnAge(inv.expiry);
    const grnAgingStatus = getGrnAgingStatus(grnAge);
    const nonMoving = isNonMoving(inv);
    const fifoCompliant = daysToExpiry <= 90 || inv.reserved > 0;
    return {
      ...inv,
      product,
      warehouse,
      daysToExpiry,
      expiryStatus,
      grnAge,
      grnAgingStatus,
      nonMoving,
      fifoCompliant,
    };
  });

  const filteredInventory = enrichedInventory.filter(inv => {
    if (warehouseFilter !== 'all' && inv.warehouseId.toString() !== warehouseFilter) return false;
    if (expiryFilter !== 'all') {
      if (expiryFilter === '30' && inv.daysToExpiry > 30) return false;
      if (expiryFilter === '60' && (inv.daysToExpiry <= 30 || inv.daysToExpiry > 60)) return false;
      if (expiryFilter === '90' && (inv.daysToExpiry <= 60 || inv.daysToExpiry > 90)) return false;
    }
    if (stockFilter !== 'all') {
      if (stockFilter === 'non-moving' && !inv.nonMoving) return false;
      if (stockFilter === 'aged' && inv.grnAgingStatus !== 'aged') return false;
      if (stockFilter === 'fifo-priority' && !inv.fifoCompliant) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        inv.product?.name.toLowerCase().includes(query) ||
        inv.product?.sku.toLowerCase().includes(query) ||
        inv.batch.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const totalValue = enrichedInventory.reduce((sum, inv) => {
    return sum + inv.available;
  }, 0);

  const nearExpiryCount = enrichedInventory.filter(inv => inv.daysToExpiry <= 90).length;
  const criticalExpiryCount = enrichedInventory.filter(inv => inv.daysToExpiry <= 30).length;
  const nonMovingCount = enrichedInventory.filter(inv => inv.nonMoving).length;
  const agedGrnCount = enrichedInventory.filter(inv => inv.grnAgingStatus === 'aged').length;
  const fifoViolationCount = enrichedInventory.filter(inv => !inv.fifoCompliant).length;

  const handleCreateGRN = (data: Record<string, unknown>) => {
    createInventoryMutation.mutate(data);
  };

  const handleStockAdjust = (data: Record<string, unknown>) => {
    if (selectedInventory) {
      const adjustment = Number(data.adjustment) || 0;
      const beforeQty = selectedInventory.available;
      const afterQty = beforeQty + adjustment;
      const reasonLabel = stockAdjustReasons.find(r => r.value === data.reasonCode)?.label || data.reasonCode;
      
      adjustInventoryMutation.mutate({ id: selectedInventory.id, data }, {
        onSuccess: () => {
          toast({ 
            title: 'Stock Adjusted', 
            description: `${selectedInventory.product?.name}: ${beforeQty} → ${afterQty} units (${adjustment > 0 ? '+' : ''}${adjustment}). Reason: ${reasonLabel}` 
          });
        }
      });
    }
  };

  const handleSendAlerts = () => {
    const channels = [];
    if (alertSettings.emailEnabled) channels.push('email');
    if (alertSettings.whatsappEnabled) channels.push('WhatsApp');
    
    if (channels.length === 0) {
      toast({ 
        title: 'No Channels Selected', 
        description: 'Please enable at least one notification channel.',
        variant: 'destructive'
      });
      return;
    }

    const alertItems = [];
    if (alertSettings.expiryThreshold30 && criticalExpiryCount > 0) {
      alertItems.push(`${criticalExpiryCount} critical expiry items (≤30 days)`);
    }
    if (alertSettings.expiryThreshold60) {
      const count = enrichedInventory.filter(inv => inv.daysToExpiry > 30 && inv.daysToExpiry <= 60).length;
      if (count > 0) alertItems.push(`${count} warning items (31-60 days)`);
    }
    if (alertSettings.expiryThreshold90) {
      const count = enrichedInventory.filter(inv => inv.daysToExpiry > 60 && inv.daysToExpiry <= 90).length;
      if (count > 0) alertItems.push(`${count} caution items (61-90 days)`);
    }
    if (alertSettings.nonMovingAlert && nonMovingCount > 0) {
      alertItems.push(`${nonMovingCount} non-moving stock items`);
    }
    if (alertSettings.agedGrnAlert && agedGrnCount > 0) {
      alertItems.push(`${agedGrnCount} aged GRN items (180+ days)`);
    }

    if (alertItems.length === 0) {
      toast({ 
        title: 'No Alerts to Send', 
        description: 'No items match your alert criteria.',
      });
      return;
    }

    toast({ 
      title: 'Alerts Sent Successfully', 
      description: `Sent ${alertItems.length} alert(s) via ${channels.join(' & ')}.`
    });
  };

  const handleSaveAlertSettings = () => {
    toast({ 
      title: 'Alert Settings Saved', 
      description: `Alerts will be sent ${alertSettings.alertFrequency} via ${[
        alertSettings.emailEnabled && 'email',
        alertSettings.whatsappEnabled && 'WhatsApp'
      ].filter(Boolean).join(' & ')}.`
    });
    setShowAlertSettings(false);
  };

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (item: typeof enrichedInventory[0]) => (
        <div>
          <p className="font-medium">{item.product?.name}</p>
          <p className="text-xs font-mono text-muted-foreground">{item.product?.sku}</p>
        </div>
      ),
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (item: typeof enrichedInventory[0]) => (
        <span className="text-sm">{item.warehouse?.name}</span>
      ),
    },
    {
      key: 'batch',
      header: 'Batch',
      render: (item: typeof enrichedInventory[0]) => (
        <span className="font-mono text-sm">{item.batch}</span>
      ),
    },
    {
      key: 'expiry',
      header: 'Expiry',
      render: (item: typeof enrichedInventory[0]) => (
        <div className="flex items-center gap-2">
          <span className="text-sm">{item.expiry}</span>
          {item.expiryStatus === 'critical' && (
            <Badge variant="destructive" className="text-xs">
              {item.daysToExpiry}d
            </Badge>
          )}
          {item.expiryStatus === 'warning' && (
            <Badge variant="outline" className="text-xs text-warning border-warning">
              {item.daysToExpiry}d
            </Badge>
          )}
          {item.expiryStatus === 'caution' && (
            <Badge variant="outline" className="text-xs">
              {item.daysToExpiry}d
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'available',
      header: 'Available',
      render: (item: typeof enrichedInventory[0]) => (
        <span className="font-mono font-medium">{item.available}</span>
      ),
    },
    {
      key: 'sold',
      header: 'Sold',
      render: (item: typeof enrichedInventory[0]) => (
        <span className="font-mono text-muted-foreground">{item.reserved}</span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (item: typeof enrichedInventory[0]) => (
        <span className="font-mono font-medium">{item.total}</span>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (item: typeof enrichedInventory[0]) => (
        <span className="font-mono text-sm">
          {item.available} units
        </span>
      ),
    },
  ];

  const rowActions = [
    {
      label: 'View Details',
      onClick: (item: typeof enrichedInventory[0]) => {
        setSelectedInventory(item);
        setDetailDrawerOpen(true);
      },
    },
    {
      label: 'View Movements',
      onClick: (item: typeof enrichedInventory[0]) => navigate(`/inventory/movements?batch=${item.batch}`),
    },
    {
      label: 'Adjust Stock',
      onClick: (item: typeof enrichedInventory[0]) => {
        setSelectedInventory(item);
        setAdjustDrawerOpen(true);
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Inventory Master"
        description="Track stock levels by batch and expiry"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/warehouses/transfers')}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transfers
            </Button>
            <Button variant="outline" onClick={() => navigate('/inventory/near-expiry')}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Near-Expiry
            </Button>
            <Button variant="outline" onClick={() => setExportModalOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setGrnDrawerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New GRN
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 stagger-children">
        <div className="card-stat">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Total SKUs</p>
          </div>
          <p className="text-2xl font-display font-semibold mt-2">{products.length}</p>
        </div>
        <div className="card-stat">
          <p className="text-sm text-muted-foreground">Total Batches</p>
          <p className="text-2xl font-display font-semibold mt-2">{inventory.length}</p>
        </div>
        <div className="card-stat">
          <p className="text-sm text-muted-foreground">Total Stock</p>
          <p className="text-2xl font-display font-semibold mt-2">
            {totalValue.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="card-stat border-warning/30 bg-stat-yellow-bg/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-stat-yellow" />
            <p className="text-sm text-muted-foreground">Near-Expiry (90d)</p>
          </div>
          <p className="text-2xl font-display font-semibold text-stat-yellow mt-2">
            {nearExpiryCount}
          </p>
        </div>
        <div className="card-stat border-destructive/30 bg-destructive/5" data-testid="stat-critical">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-muted-foreground">Critical (30d)</p>
          </div>
          <p className="text-2xl font-display font-semibold text-destructive mt-2">
            {criticalExpiryCount}
          </p>
        </div>
        <div className="card-stat" data-testid="stat-non-moving">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Non-Moving</p>
          </div>
          <p className="text-2xl font-display font-semibold mt-2">
            {nonMovingCount}
          </p>
        </div>
        <div className="card-stat" data-testid="stat-aged-grn">
          <div className="flex items-center gap-2">
            <Hourglass className="h-5 w-5 text-warning" />
            <p className="text-sm text-muted-foreground">Aged GRN (180d+)</p>
          </div>
          <p className="text-2xl font-display font-semibold mt-2">
            {agedGrnCount}
          </p>
        </div>
      </div>

      {/* Historical Stock Flow Trend Chart */}
      <Card data-testid="card-stock-flow-trend">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Historical Stock Flow Trend
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Track stock movements over time - inward receipts, outward transfers, sales, and adjustments
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]" data-testid="chart-stock-flow">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stockFlowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="inward" 
                  stackId="1" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.6}
                  name="Inward (GRN)"
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stackId="2" 
                  stroke="hsl(142.1 76.2% 36.3%)" 
                  fill="hsl(142.1 76.2% 36.3%)" 
                  fillOpacity={0.6}
                  name="Sales"
                />
                <Area 
                  type="monotone" 
                  dataKey="outward" 
                  stackId="3" 
                  stroke="hsl(var(--warning))" 
                  fill="hsl(var(--warning))" 
                  fillOpacity={0.5}
                  name="Outward (Transfers)"
                />
                <Area 
                  type="monotone" 
                  dataKey="adjustments" 
                  stackId="4" 
                  stroke="hsl(var(--destructive))" 
                  fill="hsl(var(--destructive))" 
                  fillOpacity={0.4}
                  name="Adjustments"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Inward</p>
              <p className="font-mono font-semibold text-primary" data-testid="text-total-inward">
                {stockFlowData.reduce((sum, d) => sum + d.inward, 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="font-mono font-semibold text-green-600" data-testid="text-total-sales">
                {stockFlowData.reduce((sum, d) => sum + d.sales, 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Outward</p>
              <p className="font-mono font-semibold text-yellow-600" data-testid="text-total-outward">
                {stockFlowData.reduce((sum, d) => sum + d.outward, 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Adjustments</p>
              <p className="font-mono font-semibold text-destructive" data-testid="text-total-adjustments">
                {stockFlowData.reduce((sum, d) => sum + d.adjustments, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Configuration */}
      {showAlertSettings ? (
        <Card data-testid="card-alert-settings">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Inventory Alert Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Notification Channels</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="email-toggle">Email Notifications</Label>
                  </div>
                  <Switch 
                    id="email-toggle"
                    checked={alertSettings.emailEnabled}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, emailEnabled: checked }))}
                    data-testid="switch-email-alerts"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="whatsapp-toggle">WhatsApp Notifications</Label>
                  </div>
                  <Switch 
                    id="whatsapp-toggle"
                    checked={alertSettings.whatsappEnabled}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, whatsappEnabled: checked }))}
                    data-testid="switch-whatsapp-alerts"
                  />
                </div>
                <div className="pt-2">
                  <Label htmlFor="frequency">Alert Frequency</Label>
                  <Select 
                    value={alertSettings.alertFrequency} 
                    onValueChange={(value) => setAlertSettings(prev => ({ ...prev, alertFrequency: value }))}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-alert-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="daily">Daily Summary</SelectItem>
                      <SelectItem value="weekly">Weekly Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Alert Triggers</h4>
                <div className="flex items-center justify-between">
                  <Label htmlFor="threshold-30">Critical Expiry (≤30 days)</Label>
                  <Switch 
                    id="threshold-30"
                    checked={alertSettings.expiryThreshold30}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, expiryThreshold30: checked }))}
                    data-testid="switch-expiry-30"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="threshold-60">Warning Expiry (31-60 days)</Label>
                  <Switch 
                    id="threshold-60"
                    checked={alertSettings.expiryThreshold60}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, expiryThreshold60: checked }))}
                    data-testid="switch-expiry-60"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="threshold-90">Caution Expiry (61-90 days)</Label>
                  <Switch 
                    id="threshold-90"
                    checked={alertSettings.expiryThreshold90}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, expiryThreshold90: checked }))}
                    data-testid="switch-expiry-90"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="non-moving">Non-Moving Stock (60+ days)</Label>
                  <Switch 
                    id="non-moving"
                    checked={alertSettings.nonMovingAlert}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, nonMovingAlert: checked }))}
                    data-testid="switch-non-moving"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="aged-grn">Aged GRN (180+ days)</Label>
                  <Switch 
                    id="aged-grn"
                    checked={alertSettings.agedGrnAlert}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, agedGrnAlert: checked }))}
                    data-testid="switch-aged-grn"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveAlertSettings} data-testid="button-save-alerts">
                Save Settings
              </Button>
              <Button variant="outline" onClick={() => setShowAlertSettings(false)} data-testid="button-cancel-alerts">
                Cancel
              </Button>
              <Button variant="secondary" onClick={handleSendAlerts} data-testid="button-send-alerts-now">
                <Bell className="h-4 w-4 mr-2" />
                Send Alerts Now
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed" data-testid="card-alert-quick">
          <CardContent className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Inventory Alerts</p>
                <p className="text-xs text-muted-foreground">
                  {alertSettings.emailEnabled || alertSettings.whatsappEnabled ? (
                    <>Active via {[alertSettings.emailEnabled && 'Email', alertSettings.whatsappEnabled && 'WhatsApp'].filter(Boolean).join(' & ')}</>
                  ) : (
                    'Configure email/WhatsApp notifications for aging thresholds'
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAlertSettings(true)} data-testid="button-configure-alerts">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
              <Button size="sm" onClick={handleSendAlerts} data-testid="button-send-alerts">
                <Bell className="h-4 w-4 mr-2" />
                Send Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search product, SKU, batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map((wh) => (
              <SelectItem key={wh.id} value={wh.id.toString()}>{wh.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={expiryFilter} onValueChange={setExpiryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-expiry-filter">
            <SelectValue placeholder="All Expiry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Expiry</SelectItem>
            <SelectItem value="30">≤30 Days (Critical)</SelectItem>
            <SelectItem value="60">31-60 Days (Warning)</SelectItem>
            <SelectItem value="90">61-90 Days (Caution)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-stock-filter">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="non-moving">Non-Moving Only</SelectItem>
            <SelectItem value="aged">Aged GRN (180d+)</SelectItem>
            <SelectItem value="fifo-priority">FIFO Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        data={filteredInventory}
        columns={columns}
        rowActions={rowActions}
        onRowClick={(item) => {
          setSelectedInventory(item);
          setDetailDrawerOpen(true);
        }}
        emptyMessage="No inventory found"
      />

      {/* GRN Drawer */}
      <CreateEditDrawer
        open={grnDrawerOpen}
        onClose={() => setGrnDrawerOpen(false)}
        title="Create Goods Receipt Note (GRN)"
        fields={grnFieldsWithOptions}
        onSubmit={handleCreateGRN}
        submitLabel="Create GRN"
      />

      {/* Stock Adjust Drawer */}
      <CreateEditDrawer
        open={adjustDrawerOpen}
        onClose={() => {
          setAdjustDrawerOpen(false);
          setSelectedInventory(null);
        }}
        title={`Adjust Stock - ${selectedInventory?.product?.name || ''}`}
        description={selectedInventory && (
          <div className="flex items-center gap-4 p-3 bg-muted rounded mt-2" data-testid="stock-info-preview">
            <div><span className="text-xs text-muted-foreground">Batch:</span> <span className="font-mono font-medium" data-testid="text-batch">{selectedInventory.batch}</span></div>
            <div><span className="text-xs text-muted-foreground">Current Available:</span> <span className="font-bold" data-testid="text-current-available">{selectedInventory.available}</span></div>
            <div><span className="text-xs text-muted-foreground">Sold:</span> <span className="font-medium" data-testid="text-sold">{selectedInventory.reserved}</span></div>
            <div><span className="text-xs text-muted-foreground">Total:</span> <span className="font-medium" data-testid="text-total">{selectedInventory.total}</span></div>
          </div>
        )}
        fields={stockAdjustFields}
        onSubmit={handleStockAdjust}
        submitLabel="Submit Adjustment"
      />

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        entityName="Inventory"
        columns={exportColumns}
        totalRecords={filteredInventory.length}
      />

      {/* Detail Drawer */}
      <EntityDetailDrawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedInventory(null);
        }}
        title={selectedInventory?.product?.name || 'Inventory Details'}
        entityId={selectedInventory?.batch || ''}
        status={selectedInventory?.expiryStatus === 'critical' ? 'Critical' : selectedInventory?.expiryStatus === 'warning' ? 'Warning' : 'OK'}
        timeline={[
          { id: '1', type: 'status', title: 'Stock Received', description: 'Initial stock received via GRN', user: 'warehouse@monoskin.in', timestamp: '2024-12-05' },
        ]}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Product</p>
              <p className="font-medium">{selectedInventory?.product?.name}</p>
              <p className="text-xs font-mono text-muted-foreground">{selectedInventory?.product?.sku}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Warehouse</p>
              <p className="font-medium">{selectedInventory?.warehouse?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Batch</p>
              <p className="font-mono font-medium">{selectedInventory?.batch}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expiry Date</p>
              <p className="font-medium">{selectedInventory?.expiry}</p>
              <p className="text-xs text-muted-foreground">{selectedInventory?.daysToExpiry} days remaining</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Qty</p>
              <p className="font-mono text-lg font-semibold">{selectedInventory?.available}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sold Qty</p>
              <p className="font-mono text-lg">{selectedInventory?.reserved}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Units</p>
              <p className="font-mono font-medium">
                {selectedInventory?.total || 0}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setAdjustDrawerOpen(true);
                }}
              >
                <ClipboardCheck className="h-4 w-4 mr-1" />
                Adjust Stock
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/inventory/movements?batch=${selectedInventory?.batch}`)}
              >
                View Movements
              </Button>
            </div>
          </div>
        </div>
      </EntityDetailDrawer>
    </div>
  );
}
