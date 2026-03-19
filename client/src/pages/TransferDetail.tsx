import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DetailPageHeader } from '@/components/shared/DetailPageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { ObjectUploader } from '@/components/ObjectUploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Warehouse as WarehouseIcon, Truck, CheckCircle, AlertTriangle, FileText, ArrowRight, Paperclip, X, Loader2, Upload } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Transfer, Warehouse, Product, TransferItem } from '@shared/schema';

export default function TransferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const transferId = Number(id);

  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [uploadProofDialogOpen, setUploadProofDialogOpen] = useState(false);
  const [proofFiles, setProofFiles] = useState<string[]>([]);

  const { data: transfer, isLoading } = useQuery<Transfer>({
    queryKey: ['/api/transfers', transferId],
    queryFn: async () => {
      const res = await fetch(`/api/transfers/${transferId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Transfer not found');
      return res.json();
    },
    enabled: !!transferId,
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: items = [] } = useQuery<TransferItem[]>({
    queryKey: ['/api/transfer-items', transferId],
    queryFn: async () => {
      const res = await fetch(`/api/transfer-items/${transferId}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!transferId,
  });

  const updateTransferMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Transfer> }) => {
      const res = await apiRequest('PATCH', `/api/transfers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transfers', transferId] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update transfer', variant: 'destructive' });
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

  if (!transfer) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Transfer Not Found</h2>
        <p className="text-muted-foreground">The transfer you're looking for doesn't exist.</p>
        <Button className="mt-4" onClick={() => navigate('/warehouses/transfers')} data-testid="button-back">
          Back to Transfers
        </Button>
      </div>
    );
  }

  const fromWarehouse = warehouses.find(w => w.id === transfer.fromWarehouseId);
  const toWarehouse = warehouses.find(w => w.id === transfer.toWarehouseId);

  const getProductName = (productId: number) => {
    return products.find(p => p.id === productId)?.name || `Product #${productId}`;
  };

  const handleDispatch = () => {
    updateTransferMutation.mutate({
      id: transfer.id,
      data: { status: 'In Transit' },
    });
    setDispatchDialogOpen(false);
    toast({ title: 'Transfer Dispatched', description: 'Items are now in transit' });
  };

  const handleReceive = () => {
    updateTransferMutation.mutate({
      id: transfer.id,
      data: { status: 'Completed', completedAt: new Date() },
    });
    setReceiveDialogOpen(false);
    toast({ title: 'Transfer Completed', description: 'Items have been received and inventory updated' });
  };

  const handleUploadProof = () => {
    if (proofFiles.length === 0) return;
    const existingProofs = transfer.proofOfDelivery || [];
    updateTransferMutation.mutate(
      { id: transfer.id, data: { proofOfDelivery: [...existingProofs, ...proofFiles] } },
      {
        onSuccess: () => {
          toast({ title: 'Proof Uploaded', description: 'Proof of delivery uploaded successfully' });
          setUploadProofDialogOpen(false);
          setProofFiles([]);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <DetailPageHeader
        title={`Transfer ${transfer.transferNumber}`}
        subtitle={`${fromWarehouse?.name || 'Unknown'} → ${toWarehouse?.name || 'Unknown'}`}
        entityId={transfer.transferNumber}
        backPath="/warehouses/transfers"
        status={transfer.status}
        primaryActions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setUploadProofDialogOpen(true)} data-testid="button-upload-proof">
              <Paperclip className="mr-2 h-4 w-4" /> Upload Proof
            </Button>
            {transfer.status === 'Pending Dispatch' && (
              <Button onClick={() => setDispatchDialogOpen(true)} data-testid="button-dispatch">
                <Truck className="mr-2 h-4 w-4" /> Dispatch
              </Button>
            )}
            {transfer.status === 'In Transit' && (
              <Button onClick={() => setReceiveDialogOpen(true)} data-testid="button-receive">
                <CheckCircle className="mr-2 h-4 w-4" /> Receive
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Route</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8 py-6">
                <div className="text-center">
                  <div className="p-4 bg-primary/10 rounded-lg mb-2 inline-block">
                    <WarehouseIcon className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-semibold">{fromWarehouse?.name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{fromWarehouse?.city || '-'}</p>
                </div>
                <div className="flex items-center">
                  <ArrowRight className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <div className="p-4 bg-green-500/10 rounded-lg mb-2 inline-block">
                    <WarehouseIcon className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="font-semibold">{toWarehouse?.name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{toWarehouse?.city || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Transfer Number</Label>
                  <p className="font-medium">{transfer.transferNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <StatusPill status={transfer.status} />
                </div>
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p className="font-medium">{transfer.createdAt ? new Date(transfer.createdAt).toLocaleString() : '-'}</p>
                </div>
                {transfer.completedAt && (
                  <div>
                    <Label className="text-muted-foreground">Completed At</Label>
                    <p className="font-medium">{new Date(transfer.completedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {transfer.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="font-medium">{transfer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transfer Items</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No items in this transfer</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{getProductName(item.productId)}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
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
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Total Quantity</span>
                <span className="font-medium">{items.reduce((sum, i) => sum + (i.quantity || 0), 0)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Status</span>
                <StatusPill status={transfer.status} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Proof of Delivery
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transfer.proofOfDelivery && transfer.proofOfDelivery.length > 0 ? (
                <div className="space-y-2">
                  {transfer.proofOfDelivery.map((url, i) => (
                    <a 
                      key={i} 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                      data-testid={`link-proof-${i}`}
                    >
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">Proof Document {i + 1}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">No proof documents uploaded yet</p>
                  <Button variant="outline" size="sm" onClick={() => setUploadProofDialogOpen(true)} data-testid="button-add-proof">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Add Proof
                  </Button>
                </div>
              )}
              {transfer.proofOfDelivery && transfer.proofOfDelivery.length > 0 && (
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setUploadProofDialogOpen(true)} data-testid="button-add-more-proof">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Add More Proof
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => fromWarehouse && navigate(`/warehouses/${fromWarehouse.id}`)} data-testid="button-view-from">
                <WarehouseIcon className="mr-2 h-4 w-4" /> View Source Warehouse
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => toWarehouse && navigate(`/warehouses/${toWarehouse.id}`)} data-testid="button-view-to">
                <WarehouseIcon className="mr-2 h-4 w-4" /> View Destination
              </Button>
              <Button variant="outline" className="w-full justify-start" data-testid="button-print">
                <FileText className="mr-2 h-4 w-4" /> Print Transfer Note
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dispatchDialogOpen} onOpenChange={setDispatchDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle>Dispatch Transfer</DialogTitle>
            <DialogDescription>Confirm items have been picked and are ready for dispatch.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDispatch} disabled={updateTransferMutation.isPending} data-testid="button-confirm-dispatch">
              {updateTransferMutation.isPending ? 'Processing...' : 'Dispatch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle>Receive Transfer</DialogTitle>
            <DialogDescription>Confirm all items have been received and verified.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReceive} disabled={updateTransferMutation.isPending} data-testid="button-confirm-receive">
              {updateTransferMutation.isPending ? 'Processing...' : 'Receive & Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadProofDialogOpen} onOpenChange={setUploadProofDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Proof of Delivery</DialogTitle>
            <DialogDescription>
              Upload signed slips, photos, or documents as proof for this transfer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {transfer.proofOfDelivery && transfer.proofOfDelivery.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Existing Proofs ({transfer.proofOfDelivery.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {transfer.proofOfDelivery.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80">
                      <FileText className="h-3 w-3" />
                      Proof {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Upload New Proof</Label>
              <ObjectUploader
                maxNumberOfFiles={5}
                maxFileSize={10485760}
                onGetUploadParameters={async (file) => {
                  const res = await fetch("/api/uploads/request-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: file.name,
                      size: file.size,
                      contentType: file.type,
                    }),
                  });
                  const { uploadURL } = await res.json();
                  return {
                    method: "PUT",
                    url: uploadURL,
                  };
                }}
                onComplete={(result) => {
                  if (result.successful && result.successful.length > 0) {
                    const uploadedFiles = result.successful.map((file: any) => {
                      return file.uploadURL?.split('?')[0] || '';
                    }).filter(Boolean);
                    setProofFiles(prev => [...prev, ...uploadedFiles]);
                    toast({ title: 'File Uploaded', description: `${result.successful.length} file(s) uploaded` });
                  }
                }}
              >
                <Paperclip className="h-4 w-4 mr-1" /> Select Files
              </ObjectUploader>
            </div>
            {proofFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Files to Upload ({proofFiles.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {proofFiles.map((url, i) => (
                    <div key={i} className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                      <Paperclip className="h-3 w-3" />
                      File {i + 1}
                      <button onClick={() => setProofFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 hover:text-red-500" data-testid={`button-remove-file-${i}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadProofDialogOpen(false); setProofFiles([]); }} data-testid="button-cancel-upload">Cancel</Button>
            <Button onClick={handleUploadProof} disabled={proofFiles.length === 0 || updateTransferMutation.isPending} data-testid="button-submit-proof">
              {updateTransferMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Upload Proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
