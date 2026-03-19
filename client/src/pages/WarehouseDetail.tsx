import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DetailPageHeader } from '@/components/shared/DetailPageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Warehouse as WarehouseIcon, Package, Truck, ArrowLeftRight, MapPin, User, 
  AlertTriangle, Clock, TrendingUp, Box, FileText 
} from 'lucide-react';
import type { Warehouse, Inventory, GRN, Transfer, Product } from '@shared/schema';

export default function WarehouseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const warehouseId = Number(id);

  const { data: warehouse, isLoading: warehouseLoading } = useQuery<Warehouse>({
    queryKey: ['/api/warehouses', warehouseId],
    queryFn: async () => {
      const res = await fetch(`/api/warehouses/${warehouseId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Warehouse not found');
      return res.json();
    },
    enabled: !!warehouseId,
  });

  const { data: allInventory = [] } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory'],
  });

  const { data: allGRNs = [] } = useQuery<GRN[]>({
    queryKey: ['/api/grns'],
  });

  const { data: allTransfers = [] } = useQuery<Transfer[]>({
    queryKey: ['/api/transfers'],
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: allWarehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  if (warehouseLoading) {
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

  if (!warehouse) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Warehouse Not Found</h2>
        <p className="text-muted-foreground">The warehouse you're looking for doesn't exist.</p>
        <Button className="mt-4" onClick={() => navigate('/warehouses')} data-testid="button-back">
          Back to Warehouses
        </Button>
      </div>
    );
  }

  const warehouseInventory = allInventory.filter(inv => inv.warehouseId === warehouse.id);
  const totalStock = warehouseInventory.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const availableStock = warehouseInventory.reduce((sum, inv) => sum + (inv.available || 0), 0);
  const reservedStock = warehouseInventory.reduce((sum, inv) => sum + (inv.reserved || 0), 0);
  const capacityUsed = warehouse.capacity ? (totalStock / warehouse.capacity) * 100 : 0;

  const warehouseGRNs = allGRNs.filter(g => g.warehouseId === warehouse.id);
  const warehouseTransfers = allTransfers.filter(
    t => t.fromWarehouseId === warehouse.id || t.toWarehouseId === warehouse.id
  );

  const nearExpiryItems = warehouseInventory.filter(inv => {
    if (!inv.expiry) return false;
    const expiryDate = new Date(inv.expiry);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 60 && daysUntilExpiry > 0;
  });

  const getProductName = (productId: number) => {
    return allProducts.find(p => p.id === productId)?.name || `Product #${productId}`;
  };

  const getWarehouseName = (warehouseId: number) => {
    const wh = allWarehouses.find(w => w.id === warehouseId);
    return wh?.name || `Warehouse #${warehouseId}`;
  };

  return (
    <div className="space-y-6">
      <DetailPageHeader
        title={warehouse.name}
        subtitle={`${warehouse.city}, ${warehouse.state}`}
        entityId={warehouse.code}
        backPath="/warehouses"
        primaryActions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/warehouses/grn')} data-testid="button-new-grn">
              <Package className="mr-2 h-4 w-4" /> New GRN
            </Button>
            <Button onClick={() => navigate('/warehouses/transfers')} data-testid="button-new-transfer">
              <ArrowLeftRight className="mr-2 h-4 w-4" /> New Transfer
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Box className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Stock</p>
                <p className="text-2xl font-bold">{totalStock.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Package className="h-6 w-6 text-green-500" />
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
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Capacity Used</span>
                <span className="font-medium">{Math.round(capacityUsed)}%</span>
              </div>
              <Progress value={capacityUsed} className="h-2" />
              <p className="text-xs text-muted-foreground">{totalStock} / {warehouse.capacity || 0} units</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory</TabsTrigger>
          <TabsTrigger value="grn" data-testid="tab-grn">GRN History</TabsTrigger>
          <TabsTrigger value="transfers" data-testid="tab-transfers">Transfers</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              {warehouseInventory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No inventory in this warehouse</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouseInventory.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{getProductName(inv.productId)}</TableCell>
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

        <TabsContent value="grn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GRN History</CardTitle>
            </CardHeader>
            <CardContent>
              {warehouseGRNs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No GRNs for this warehouse</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GRN Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Received At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouseGRNs.map((grn) => (
                      <TableRow key={grn.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/warehouses/grn/${grn.id}`)}>
                        <TableCell className="font-medium">{grn.grnNumber}</TableCell>
                        <TableCell>{grn.supplier || '-'}</TableCell>
                        <TableCell><StatusPill status={grn.status} /></TableCell>
                        <TableCell>{grn.receivedAt ? new Date(grn.receivedAt).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transfer History</CardTitle>
            </CardHeader>
            <CardContent>
              {warehouseTransfers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transfers for this warehouse</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transfer Number</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouseTransfers.map((transfer) => (
                      <TableRow key={transfer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/warehouses/transfers/${transfer.id}`)}>
                        <TableCell className="font-medium">{transfer.transferNumber}</TableCell>
                        <TableCell>{getWarehouseName(transfer.fromWarehouseId)}</TableCell>
                        <TableCell>{getWarehouseName(transfer.toWarehouseId)}</TableCell>
                        <TableCell><StatusPill status={transfer.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Near Expiry Items</CardTitle>
            </CardHeader>
            <CardContent>
              {nearExpiryItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No items expiring within 60 days</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Days Left</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nearExpiryItems.map((inv) => {
                      const daysLeft = inv.expiry ? Math.ceil((new Date(inv.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{getProductName(inv.productId)}</TableCell>
                          <TableCell><Badge variant="outline">{inv.batch}</Badge></TableCell>
                          <TableCell>{inv.expiry ? new Date(inv.expiry).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>
                            <Badge variant={daysLeft <= 30 ? 'destructive' : 'secondary'}>{daysLeft} days</Badge>
                          </TableCell>
                          <TableCell className="text-right">{inv.total}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Warehouse Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Code</Label>
                <p className="font-medium">{warehouse.code}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <StatusPill status={warehouse.isActive ? 'Active' : 'Inactive'} />
              </div>
              <div>
                <Label className="text-muted-foreground">City</Label>
                <p className="font-medium">{warehouse.city}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">State</Label>
                <p className="font-medium">{warehouse.state}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Pincode</Label>
                <p className="font-medium">{warehouse.pincode || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Capacity</Label>
                <p className="font-medium">{warehouse.capacity?.toLocaleString() || 0} units</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Products in Stock</span>
              <span className="font-medium">{new Set(warehouseInventory.map(i => i.productId)).size}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Active Batches</span>
              <span className="font-medium">{warehouseInventory.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Near Expiry Items</span>
              <Badge variant={nearExpiryItems.length > 0 ? 'destructive' : 'secondary'}>{nearExpiryItems.length}</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Pending Transfers</span>
              <span className="font-medium">{warehouseTransfers.filter(t => t.status === 'Pending Dispatch' || t.status === 'In Transit').length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
