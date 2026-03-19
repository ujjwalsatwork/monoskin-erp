import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill } from '@/components/shared/StatusPill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, AlertTriangle, Calendar, Package, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Inventory, Product, Warehouse } from '@shared/schema';

interface ExpiryItem {
  id: number;
  productName: string;
  sku: string;
  batchNumber: string;
  warehouse: string;
  quantity: number;
  expiryDate: string;
  daysToExpiry: number;
  valueAtRisk: number;
  status: 'critical' | 'warning' | 'caution';
}

const NearExpiry = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');

  const { data: inventory = [], isLoading, error } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const today = new Date();
  
  const items: ExpiryItem[] = inventory
    .filter(inv => inv.expiry)
    .map(inv => {
      const product = products.find(p => p.id === inv.productId);
      const warehouse = warehouses.find(w => w.id === inv.warehouseId);
      const expiryDate = new Date(inv.expiry);
      const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const quantity = inv.available + inv.reserved;
      const valueAtRisk = quantity * Number(product?.mrp || 0);
      
      let status: 'critical' | 'warning' | 'caution';
      if (daysToExpiry < 30) status = 'critical';
      else if (daysToExpiry < 60) status = 'warning';
      else status = 'caution';

      return {
        id: inv.id,
        productName: product?.name || `Product ${inv.productId}`,
        sku: product?.sku || '',
        batchNumber: inv.batch,
        warehouse: warehouse?.name || `Warehouse ${inv.warehouseId}`,
        quantity,
        expiryDate: inv.expiry,
        daysToExpiry,
        valueAtRisk,
        status,
      };
    })
    .filter(item => item.daysToExpiry > 0 && item.daysToExpiry <= 180)
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);

  const columns: Column<ExpiryItem>[] = [
    { key: 'productName', header: 'Product', sortable: true },
    { key: 'sku', header: 'SKU' },
    { key: 'batchNumber', header: 'Batch #' },
    { key: 'warehouse', header: 'Warehouse', sortable: true },
    { key: 'quantity', header: 'Qty', render: (item) => <span className="font-mono">{item.quantity}</span> },
    { key: 'expiryDate', header: 'Expiry Date', sortable: true, render: (item) => new Date(item.expiryDate).toLocaleDateString() },
    { key: 'daysToExpiry', header: 'Days Left', render: (item) => (
      <span className={`font-mono font-semibold ${item.daysToExpiry < 30 ? 'text-destructive' : item.daysToExpiry < 60 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
        {item.daysToExpiry}
      </span>
    )},
    { key: 'valueAtRisk', header: 'Value at Risk', render: (item) => <span className="font-mono">₹{item.valueAtRisk.toLocaleString()}</span> },
    { key: 'status', header: 'Status', render: (item) => <StatusPill status={item.status} /> },
  ];

  const critical = items.filter(i => i.status === 'critical');
  const warning = items.filter(i => i.status === 'warning');
  const caution = items.filter(i => i.status === 'caution');

  const totalValueAtRisk = items.reduce((sum, i) => sum + i.valueAtRisk, 0);
  const criticalValue = critical.reduce((sum, i) => sum + i.valueAtRisk, 0);

  const chartData = [
    { name: 'Critical (<30d)', items: critical.length, value: criticalValue },
    { name: 'Warning (30-60d)', items: warning.length, value: warning.reduce((s, i) => s + i.valueAtRisk, 0) },
    { name: 'Caution (60-180d)', items: caution.length, value: caution.reduce((s, i) => s + i.valueAtRisk, 0) },
  ];

  const stats = [
    { title: 'Total Items', value: items.length.toString(), subtitle: 'Near expiry', color: 'blue' as const },
    { title: 'Critical', value: critical.length.toString(), subtitle: '< 30 days', color: 'pink' as const },
    { title: 'Warning', value: warning.length.toString(), subtitle: '30-60 days', color: 'yellow' as const },
    { title: 'Value at Risk', value: `₹${(totalValueAtRisk / 100000).toFixed(1)}L`, subtitle: 'Total exposure', color: 'purple' as const },
  ];

  const filteredItems = activeTab === 'all' ? items :
    activeTab === 'critical' ? critical :
    activeTab === 'warning' ? warning : caution;

  const handleExport = () => {
    toast({ title: 'Export Started', description: 'Generating near-expiry report...' });
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
        <p className="text-destructive">Error loading inventory data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Near Expiry"
        description="Monitor inventory approaching expiration dates"
        actions={
          <Button variant="outline" onClick={handleExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Bar dataKey="items" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Quick Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Critical Items</p>
              <p className="text-2xl font-bold text-red-600">{critical.length}</p>
              <p className="text-xs text-red-500">₹{criticalValue.toLocaleString()} at risk</p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Warning Items</p>
              <p className="text-2xl font-bold text-yellow-600">{warning.length}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Caution Items</p>
              <p className="text-2xl font-bold text-blue-600">{caution.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="critical" data-testid="tab-critical">Critical ({critical.length})</TabsTrigger>
          <TabsTrigger value="warning" data-testid="tab-warning">Warning ({warning.length})</TabsTrigger>
          <TabsTrigger value="caution" data-testid="tab-caution">Caution ({caution.length})</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          <DataTable
            columns={columns}
            data={filteredItems}
            emptyMessage="No near-expiry items found"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NearExpiry;
