import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DetailPageHeader } from '@/components/shared/DetailPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Package, Warehouse as WarehouseIcon, AlertTriangle, ShoppingCart,
  DollarSign, Clock, Edit, Barcode, Bell, TrendingUp, Users, ArrowRight,
  Stethoscope, Building2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Product, Inventory, Warehouse, Order, OrderItem, Doctor, Pharmacy } from '@shared/schema';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const productId = Number(id);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [newThreshold, setNewThreshold] = useState('');
  const [editData, setEditData] = useState({ name: '', mrp: '', description: '', barcode: '' });
  const [salesTimeframe, setSalesTimeframe] = useState<'3m' | '6m' | '12m'>('6m');

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['/api/products', productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Product not found');
      return res.json();
    },
    enabled: !!productId,
  });

  const { data: allInventory = [] } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory'],
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: orderItems = [] } = useQuery<OrderItem[]>({
    queryKey: ['/api/order-items'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: pharmacies = [] } = useQuery<Pharmacy[]>({
    queryKey: ['/api/pharmacies'],
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Product> }) => {
      const res = await apiRequest('PATCH', `/api/products/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId] });
      toast({ title: 'Product Updated', description: 'Changes have been saved' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update product', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Product Not Found</h2>
        <p className="text-muted-foreground">The product you're looking for doesn't exist.</p>
        <Button className="mt-4" onClick={() => navigate('/products')} data-testid="button-back">
          Back to Products
        </Button>
      </div>
    );
  }

  const productInventory = allInventory.filter(inv => inv.productId === product.id);
  const totalStock = productInventory.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const availableStock = productInventory.reduce((sum, inv) => sum + (inv.available || 0), 0);
  const reservedStock = productInventory.reduce((sum, inv) => sum + (inv.reserved || 0), 0);
  
  const isLowStock = totalStock < (product.minStockThreshold || 100);

  const nearExpiryBatches = productInventory.filter(inv => {
    if (!inv.expiry) return false;
    const expiryDate = new Date(inv.expiry);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  });

  const productOrderItems = orderItems.filter(oi => oi.productId === product.id);
  const productOrderIds = [...new Set(productOrderItems.map(oi => oi.orderId))];
  const productOrders = orders.filter(o => productOrderIds.includes(o.id));

  // Last 5 unique customers — prefer most recent order per customer
  const last5Customers = (() => {
    const seen = new Set<string>();
    const result: Array<{
      key: string;
      name: string;
      type: 'Doctor' | 'Pharmacy';
      profilePath: string;
      lastOrderDate: string | null;
    }> = [];

    const sorted = [...productOrders].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    for (const order of sorted) {
      if (result.length >= 5) break;

      if (order.doctorId) {
        const key = `doctor-${order.doctorId}`;
        if (!seen.has(key)) {
          seen.add(key);
          const doctor = doctors.find(d => d.id === order.doctorId);
          result.push({
            key,
            name: doctor?.name || `Doctor #${order.doctorId}`,
            type: 'Doctor',
            profilePath: `/doctors/${order.doctorId}`,
            lastOrderDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : null,
          });
        }
      } else if (order.pharmacyId) {
        const key = `pharmacy-${order.pharmacyId}`;
        if (!seen.has(key)) {
          seen.add(key);
          const pharmacy = pharmacies.find(p => p.id === order.pharmacyId);
          result.push({
            key,
            name: pharmacy?.name || `Pharmacy #${order.pharmacyId}`,
            type: 'Pharmacy',
            profilePath: `/pharmacies/${order.pharmacyId}`,
            lastOrderDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : null,
          });
        }
      }
    }
    return result;
  })();

  // Average Monthly Sales Volume from product fields
  const salesVolume = {
    '3m': product.avgMonthlySales3m != null ? Number(product.avgMonthlySales3m) : null,
    '6m': product.avgMonthlySales6m != null ? Number(product.avgMonthlySales6m) : null,
    '12m': product.avgMonthlySales12m != null ? Number(product.avgMonthlySales12m) : null,
  };
  const currentSalesVolume = salesVolume[salesTimeframe];

  const getWarehouseName = (warehouseId: number) => {
    return warehouses.find(w => w.id === warehouseId)?.name || `Warehouse #${warehouseId}`;
  };

  const getDoctorName = (doctorId: number) => {
    return doctors.find(d => d.id === doctorId)?.name || `Doctor #${doctorId}`;
  };

  const handleUpdateThreshold = () => {
    const threshold = parseInt(newThreshold);
    if (isNaN(threshold) || threshold < 0) {
      toast({ title: 'Invalid threshold', variant: 'destructive' });
      return;
    }
    updateProductMutation.mutate({
      id: product.id,
      data: { minStockThreshold: threshold },
    });
    setThresholdDialogOpen(false);
  };

  const handleEdit = () => {
    updateProductMutation.mutate({
      id: product.id,
      data: {
        name: editData.name || product.name,
        mrp: editData.mrp || product.mrp,
        description: editData.description || product.description,
        barcode: editData.barcode || null,
      },
    });
    setEditDialogOpen(false);
  };

  const openEditDialog = () => {
    setEditData({
      name: product.name,
      mrp: String(product.mrp),
      description: product.description || '',
      barcode: product.barcode || '',
    });
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <DetailPageHeader
        title={product.name}
        subtitle={`SKU: ${product.sku}`}
        entityId={product.code}
        backPath="/products"
        primaryActions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setNewThreshold(String(product.minStockThreshold || 100)); setThresholdDialogOpen(true); }} data-testid="button-threshold">
              <Bell className="mr-2 h-4 w-4" /> Set Alert
            </Button>
            <Button onClick={openEditDialog} data-testid="button-edit">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${isLowStock ? 'bg-red-500/10' : 'bg-primary/10'}`}>
                <Package className={`h-6 w-6 ${isLowStock ? 'text-red-500' : 'text-primary'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Stock</p>
                <p className="text-2xl font-bold">{totalStock.toLocaleString()}</p>
                {isLowStock && <Badge variant="destructive" className="mt-1">Low Stock</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{availableStock.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reserved</p>
                <p className="text-2xl font-bold">{reservedStock.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MRP</p>
                <p className="text-2xl font-bold">₹{Number(product.mrp).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Code</Label>
                    <p className="font-medium">{product.code}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">SKU</Label>
                    <p className="font-medium">{product.sku}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <Badge variant="outline">{product.category || '-'}</Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Pack Size</Label>
                    <p className="font-medium">{product.packSize || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">HSN Code</Label>
                    <p className="font-medium">{product.hsnCode || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">GST</Label>
                    <p className="font-medium">{product.gst || 18}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Shelf Life</Label>
                    <p className="font-medium">{product.shelfLife || '-'} months</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Min Stock</Label>
                    <p className="font-medium">{product.minStockThreshold || 100} units</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground flex items-center gap-2 mb-2">
                    <Barcode className="h-4 w-4" />
                    Barcode
                  </Label>
                  {product.barcode ? (
                    <div className="bg-white rounded-lg p-4 border flex flex-col items-center gap-2" data-testid="text-barcode">
                      <div className="flex items-center gap-[2px] h-14">
                        {product.barcode.split('').map((char, i) => (
                          <div
                            key={i}
                            className="bg-black h-full"
                            style={{
                              width: `${((char.charCodeAt(0) % 3) + 1) * 1.5}px`,
                              marginRight: `${(char.charCodeAt(0) % 2) + 0.5}px`,
                            }}
                          />
                        ))}
                      </div>
                      <p className="font-mono text-sm tracking-[0.25em] text-black font-semibold select-all">{product.barcode}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm" data-testid="text-barcode">Not assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{product.description || 'No description available.'}</p>
                {product.clinicalIndications && product.clinicalIndications.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-muted-foreground">Clinical Indications</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {product.clinicalIndications.map((ind, i) => (
                        <Badge key={i} variant="secondary">{ind}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Sales Velocity + Last 5 Customers ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* A. Average Monthly Sales Volume */}
            <Card data-testid="card-avg-monthly-sales">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Avg Monthly Sales Volume
                  </CardTitle>
                  {/* Timeframe toggle */}
                  <div className="flex rounded-md border overflow-hidden" data-testid="toggle-sales-timeframe">
                    {(['3m', '6m', '12m'] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setSalesTimeframe(tf)}
                        className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                          salesTimeframe === tf
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background text-muted-foreground hover:bg-muted'
                        }`}
                        data-testid={`btn-timeframe-${tf}`}
                      >
                        {tf === '3m' ? 'Last 3M' : tf === '6m' ? 'Last 6M' : 'Last 12M'}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Primary metric */}
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold tracking-tight" data-testid="stat-avg-sales-volume">
                    {currentSalesVolume != null ? currentSalesVolume.toLocaleString() : '—'}
                  </span>
                  <span className="text-muted-foreground pb-1 text-sm">units / month</span>
                </div>

                {/* All 3 timeframe comparisons */}
                <div className="grid grid-cols-3 gap-3 pt-1 border-t">
                  {(['3m', '6m', '12m'] as const).map((tf) => {
                    const val = salesVolume[tf];
                    const isActive = tf === salesTimeframe;
                    return (
                      <div
                        key={tf}
                        className={`rounded-lg p-2.5 text-center cursor-pointer transition-colors ${
                          isActive ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/50 hover:bg-muted'
                        }`}
                        onClick={() => setSalesTimeframe(tf)}
                        data-testid={`cell-sales-${tf}`}
                      >
                        <p className="text-xs text-muted-foreground mb-1">
                          {tf === '3m' ? '3 months' : tf === '6m' ? '6 months' : '12 months'}
                        </p>
                        <p className={`text-lg font-semibold ${isActive ? 'text-primary' : ''}`}>
                          {val != null ? val.toLocaleString() : <span className="text-muted-foreground text-sm">N/A</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {currentSalesVolume == null && (
                  <p className="text-xs text-muted-foreground/70 text-center pt-1" data-testid="note-no-sales-data">
                    Sales velocity data not yet available for this product.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* B. Last 5 Customers */}
            <Card data-testid="card-last-customers">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  Last 5 Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {last5Customers.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Users className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No customer orders recorded yet.</p>
                  </div>
                ) : (
                  <div className="divide-y -mx-2">
                    {last5Customers.map((customer, idx) => (
                      <Link
                        key={customer.key}
                        to={customer.profilePath}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-md hover:bg-muted/60 transition-colors group"
                        data-testid={`link-customer-${idx}`}
                      >
                        {/* Icon by type */}
                        <div className={`p-1.5 rounded-md shrink-0 ${
                          customer.type === 'Doctor'
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : 'bg-purple-100 dark:bg-purple-900/30'
                        }`}>
                          {customer.type === 'Doctor'
                            ? <Stethoscope className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            : <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors" data-testid={`text-customer-name-${idx}`}>
                            {customer.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant="outline"
                              className={`text-xs px-1.5 py-0 ${
                                customer.type === 'Doctor'
                                  ? 'border-blue-300 text-blue-700 dark:text-blue-300'
                                  : 'border-purple-300 text-purple-700 dark:text-purple-300'
                              }`}
                              data-testid={`badge-customer-type-${idx}`}
                            >
                              {customer.type}
                            </Badge>
                            {customer.lastOrderDate && (
                              <span className="text-xs text-muted-foreground" data-testid={`text-customer-date-${idx}`}>
                                {customer.lastOrderDate}
                              </span>
                            )}
                          </div>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-primary transition-colors" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {nearExpiryBatches.length > 0 && (
            <Card className="border-yellow-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <AlertTriangle className="h-5 w-5" />
                  Near Expiry Batches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nearExpiryBatches.map((inv) => {
                      const daysLeft = inv.expiry ? Math.ceil((new Date(inv.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                      return (
                        <TableRow key={inv.id}>
                          <TableCell><Badge variant="outline">{inv.batch}</Badge></TableCell>
                          <TableCell>{getWarehouseName(inv.warehouseId)}</TableCell>
                          <TableCell>{inv.expiry ? new Date(inv.expiry).toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={daysLeft <= 30 ? 'destructive' : 'secondary'}>{inv.total} ({daysLeft} days)</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory by Warehouse</CardTitle>
            </CardHeader>
            <CardContent>
              {productInventory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No inventory for this product</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productInventory.map((inv) => (
                      <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/warehouses/${inv.warehouseId}`)}>
                        <TableCell className="font-medium">{getWarehouseName(inv.warehouseId)}</TableCell>
                        <TableCell><Badge variant="outline">{inv.batch}</Badge></TableCell>
                        <TableCell>{inv.expiry ? new Date(inv.expiry).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="text-right">{inv.available}</TableCell>
                        <TableCell className="text-right">{inv.reserved}</TableCell>
                        <TableCell className="text-right font-medium">{inv.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {productOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No orders for this product</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productOrders.slice(0, 10).map((order) => (
                      <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/orders/${order.id}`)}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{getDoctorName(order.doctorId)}</TableCell>
                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                        <TableCell>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={thresholdDialogOpen} onOpenChange={setThresholdDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle>Set Stock Alert</DialogTitle>
            <DialogDescription>Set the minimum stock threshold for low stock alerts</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Minimum Stock Threshold</Label>
            <Input type="number" value={newThreshold} onChange={(e) => setNewThreshold(e.target.value)} placeholder="100" data-testid="input-threshold" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setThresholdDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateThreshold} disabled={updateProductMutation.isPending} data-testid="button-save-threshold">
              {updateProductMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Name</Label><Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} data-testid="input-name" /></div>
            <div><Label>MRP (₹)</Label><Input type="number" value={editData.mrp} onChange={(e) => setEditData({ ...editData, mrp: e.target.value })} data-testid="input-mrp" /></div>
            <div>
              <Label className="flex items-center gap-2"><Barcode className="h-4 w-4" /> Barcode</Label>
              <Input value={editData.barcode} onChange={(e) => setEditData({ ...editData, barcode: e.target.value })} placeholder="Enter barcode for scanning" data-testid="input-barcode" />
              <p className="text-xs text-muted-foreground mt-1">Used for warehouse and billing scanning operations</p>
            </div>
            <div><Label>Description</Label><Input value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} data-testid="input-description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateProductMutation.isPending} data-testid="button-save-edit">
              {updateProductMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
