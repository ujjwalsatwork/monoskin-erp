import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DetailPageHeader } from '@/components/shared/DetailPageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Package, Warehouse as WarehouseIcon, AlertTriangle, Check, FileText,
  CheckCircle2, XCircle
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { GRN, Warehouse, Product, grnItems } from '@shared/schema';
type GRNItem = typeof grnItems.$inferSelect;

export default function GRNDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const grnId = Number(id);

  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  const { data: grn, isLoading } = useQuery<GRN>({
    queryKey: ['/api/grns', grnId],
    queryFn: async () => {
      const res = await fetch(`/api/grns/${grnId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('GRN not found');
      return res.json();
    },
    enabled: !!grnId,
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: grnItems = [] } = useQuery<GRNItem[]>({
    queryKey: ['/api/grn-items', grnId],
    queryFn: async () => {
      const res = await fetch(`/api/grn-items/${grnId}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!grnId,
  });

  const updateGRNMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<GRN> }) => {
      const res = await apiRequest('PATCH', `/api/grns/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/grns', grnId] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update GRN', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">GRN Not Found</h2>
        <p className="text-muted-foreground">The GRN you're looking for doesn't exist.</p>
        <Button className="mt-4" onClick={() => navigate('/warehouses/grn')} data-testid="button-back">
          Back to GRNs
        </Button>
      </div>
    );
  }

  const warehouse = warehouses.find(w => w.id === grn.warehouseId);

  const getProductName = (productId: number) => {
    return products.find(p => p.id === productId)?.name || `Product #${productId}`;
  };

  const handleVerify = () => {
    updateGRNMutation.mutate({
      id: grn.id,
      data: { status: 'Completed' },
    });
    setVerifyDialogOpen(false);
    toast({ title: 'GRN Verified', description: 'Stock has been added to inventory' });
  };

  return (
    <div className="space-y-6">
      <DetailPageHeader
        title={`GRN ${grn.grnNumber}`}
        subtitle={`Received at ${warehouse?.name || 'Unknown'}`}
        entityId={grn.grnNumber}
        backPath="/warehouses/grn"
        status={grn.status}
        primaryActions={
          <div className="flex gap-2">
            {grn.status === 'Pending Verification' && (
              <Button onClick={() => setVerifyDialogOpen(true)} data-testid="button-verify">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Verify & Complete
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>GRN Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">GRN Number</Label>
                  <p className="font-medium">{grn.grnNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <StatusPill status={grn.status} />
                </div>
                <div>
                  <Label className="text-muted-foreground">Warehouse</Label>
                  <p className="font-medium">{warehouse?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Supplier</Label>
                  <p className="font-medium">{grn.supplier || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Received At</Label>
                  <p className="font-medium">{grn.receivedAt ? new Date(grn.receivedAt).toLocaleString() : '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p className="font-medium">{grn.createdAt ? new Date(grn.createdAt).toLocaleString() : '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GRN Items</CardTitle>
            </CardHeader>
            <CardContent>
              {grnItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No items in this GRN</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grnItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{getProductName(item.productId)}</TableCell>
                        <TableCell><Badge variant="outline">{item.batch}</Badge></TableCell>
                        <TableCell>{item.expiry ? new Date(item.expiry).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="text-right">{item.expectedQty || 0}</TableCell>
                        <TableCell className="text-right">{item.receivedQty || 0}</TableCell>
                        <TableCell>
                          {(item.receivedQty || 0) === (item.expectedQty || 0) ? (
                            <Badge variant="outline" className="text-green-600"><Check className="mr-1 h-3 w-3" /> Match</Badge>
                          ) : (
                            <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Mismatch</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Total Items</span>
                <span className="font-medium">{grnItems.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Total Quantity</span>
                <span className="font-medium">{grnItems.reduce((sum, i) => sum + (i.receivedQty || 0), 0)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Status</span>
                <StatusPill status={grn.status} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => warehouse && navigate(`/warehouses/${warehouse.id}`)} data-testid="button-view-warehouse">
                <WarehouseIcon className="mr-2 h-4 w-4" /> View Warehouse
              </Button>
              <Button variant="outline" className="w-full justify-start" data-testid="button-print">
                <FileText className="mr-2 h-4 w-4" /> Print GRN
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle>Verify GRN</DialogTitle>
            <DialogDescription>This will mark the GRN as completed and add items to inventory.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleVerify} disabled={updateGRNMutation.isPending} data-testid="button-confirm-verify">
              {updateGRNMutation.isPending ? 'Processing...' : 'Verify & Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
