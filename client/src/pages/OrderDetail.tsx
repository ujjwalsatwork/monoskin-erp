import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DetailPageHeader } from '@/components/shared/DetailPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, Printer, X, Building2, User, MapPin, Loader2, FileText, Download, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Order, Doctor, Pharmacy, Warehouse, OrderItem, Product, Shipment, Invoice, Carrier } from '@shared/schema';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['/api/orders', id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error('Order not found');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: pharmacies = [] } = useQuery<Pharmacy[]>({
    queryKey: ['/api/pharmacies'],
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: orderItems = [] } = useQuery<OrderItem[]>({
    queryKey: ['/api/orders', id, 'items'],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}/items`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: shipments = [] } = useQuery<Shipment[]>({
    queryKey: ['/api/shipments'],
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: carriers = [] } = useQuery<Carrier[]>({
    queryKey: ['/api/carriers'],
  });

  const orderShipments = shipments.filter((s: Shipment) => s.orderId === Number(id));
  const orderInvoices = invoices.filter((i: Invoice) => i.orderId === Number(id));

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest('PATCH', `/api/orders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: 'Order Updated' });
    },
  });

  const handleCancel = () => {
    updateMutation.mutate({ status: 'Cancelled' });
    setCancelOpen(false);
    toast({ title: 'Order Cancelled' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  const doctor = doctors.find(d => d.id === order.doctorId);
  const pharmacy = pharmacies.find(p => p.id === order.pharmacyId);
  const warehouse = warehouses.find(w => w.id === order.warehouseId);

  return (
    <div className="space-y-6 animate-fade-in">
      <DetailPageHeader
        title={order.orderNumber}
        subtitle={`Created: ${new Date(order.createdAt).toLocaleDateString()}`}
        status={order.status}
        backPath="/orders"
        primaryActions={
          <>
            <Button variant="outline" onClick={() => toast({ title: 'Print', description: 'Opening print dialog...' })} data-testid="button-print">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            {order.status !== 'Cancelled' && order.status !== 'Delivered' && (
              <Button variant="destructive" onClick={() => setCancelOpen(true)} data-testid="button-cancel">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </>
        }
      />

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList data-testid="tabs-order-details">
          <TabsTrigger value="details" data-testid="tab-details">
            <Package className="h-4 w-4 mr-2" />
            Order Details
          </TabsTrigger>
          <TabsTrigger value="shipment" data-testid="tab-shipment">
            <Truck className="h-4 w-4 mr-2" />
            Shipment
            {orderShipments.length > 0 && <Badge variant="secondary" className="ml-2">{orderShipments.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <FileText className="h-4 w-4 mr-2" />
            Invoices
            {orderInvoices.length > 0 && <Badge variant="secondary" className="ml-2">{orderInvoices.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.length > 0 ? orderItems.map((item, index) => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <TableRow key={index} data-testid={`row-order-item-${index}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product?.name || `Product ${item.productId}`}</p>
                                <p className="text-xs text-muted-foreground">{product?.sku || ''}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                            <TableCell className="text-right font-mono">₹{Number(item.unitPrice).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">₹{Number(item.total).toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      }) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No items in this order
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Doctor</p>
                      <p className="font-medium" data-testid="text-doctor-name">{doctor?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pharmacy</p>
                      <p className="font-medium" data-testid="text-pharmacy-name">{pharmacy?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery Address</p>
                      <p className="font-medium flex items-center gap-1" data-testid="text-delivery-address">
                        <MapPin className="h-3 w-3" />
                        {order.shippingAddress || doctor?.address || pharmacy?.address || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Warehouse</p>
                      <p className="font-medium flex items-center gap-1" data-testid="text-warehouse">
                        <Building2 className="h-3 w-3" />
                        {warehouse?.name || '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-mono">₹{Number(order.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tax</span>
                <span className="font-mono">₹{Number(order.tax || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Discount</span>
                <span className="font-mono text-green-600">-₹{Number(order.discount || 0).toLocaleString()}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="font-mono font-bold text-lg">₹{Number(order.total).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Order Status</span>
                <Badge>{order.status}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Delivered</span>
                <span className="text-sm">{order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : '-'}</span>
              </div>
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" data-testid="text-order-notes">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
          </div>
        </TabsContent>

        <TabsContent value="shipment">
          <div className="space-y-6">
            {orderShipments.length > 0 ? (
              orderShipments.map((shipment) => {
                const carrier = carriers.find((c: Carrier) => c.id === shipment.carrierId);
                return (
                  <Card key={shipment.id} data-testid={`card-shipment-${shipment.id}`}>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          <Truck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Shipment #{shipment.id}</CardTitle>
                          <p className="text-sm text-muted-foreground">{carrier?.name || 'Unknown Carrier'}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={shipment.status === 'Delivered' ? 'default' : shipment.status === 'In Transit' ? 'secondary' : 'outline'}
                        data-testid={`badge-shipment-status-${shipment.id}`}
                      >
                        {shipment.status === 'Delivered' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {shipment.status === 'In Transit' && <Truck className="h-3 w-3 mr-1" />}
                        {shipment.status === 'Pending' && <Clock className="h-3 w-3 mr-1" />}
                        {shipment.status}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Tracking ID</p>
                          <p className="font-mono font-medium" data-testid={`text-tracking-${shipment.id}`}>{shipment.trackingId || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Seal Number</p>
                          <p className="font-mono font-medium">{shipment.sealNumber || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Dispatched</p>
                          <p className="font-medium">{shipment.dispatchedAt ? new Date(shipment.dispatchedAt).toLocaleDateString() : '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Delivered</p>
                          <p className="font-medium">{shipment.deliveredAt ? new Date(shipment.deliveredAt).toLocaleDateString() : '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Weight (kg)</p>
                          <p className="font-medium">{shipment.weight || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Packages</p>
                          <p className="font-medium">{shipment.packages || '-'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Delivery Address</p>
                          <p className="font-medium flex items-start gap-1">
                            <MapPin className="h-3 w-3 mt-1" />
                            {order.shippingAddress || '-'}
                          </p>
                        </div>
                      </div>
                      {shipment.labelUrl && (
                        <div className="mt-4 pt-4 border-t">
                          <Button variant="outline" size="sm" onClick={() => window.open(shipment.labelUrl!, '_blank')} data-testid={`button-label-${shipment.id}`}>
                            <Download className="h-4 w-4 mr-2" />
                            Download Label
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No shipments created for this order yet</p>
                  <p className="text-sm text-muted-foreground text-center mt-1">Shipments will appear here once the order is dispatched</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <div className="space-y-6">
            {orderInvoices.length > 0 ? (
              orderInvoices.map((invoice) => (
                <Card key={invoice.id} data-testid={`card-invoice-${invoice.id}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{invoice.invoiceNumber}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Created: {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={invoice.status === 'Paid' ? 'default' : invoice.status === 'Overdue' ? 'destructive' : 'secondary'}
                        data-testid={`badge-invoice-status-${invoice.id}`}
                      >
                        {invoice.status === 'Paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {invoice.status === 'Overdue' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {invoice.status === 'Pending' && <Clock className="h-3 w-3 mr-1" />}
                        {invoice.status}
                      </Badge>
                      <Button variant="outline" size="icon" data-testid={`button-download-invoice-${invoice.id}`} onClick={() => toast({ title: 'Download', description: 'Preparing invoice PDF...' })}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Invoice Amount</p>
                        <p className="font-mono font-bold text-lg">₹{Number(invoice.amount).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Paid Amount</p>
                        <p className="font-mono font-medium text-green-600">₹{Number(invoice.paidAmount || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Outstanding</p>
                        <p className="font-mono font-medium text-orange-600">₹{Number(Number(invoice.amount) - Number(invoice.paidAmount || 0)).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Due Date</p>
                        <p className="font-medium">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</p>
                      </div>
                      {invoice.paidAt && (
                        <div>
                          <p className="text-sm text-muted-foreground">Paid On</p>
                          <p className="font-medium">{new Date(invoice.paidAt).toLocaleDateString()}</p>
                        </div>
                      )}
                      {invoice.paymentLink && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Payment Link</p>
                          <Button variant="link" className="p-0 h-auto" onClick={() => window.open(invoice.paymentLink!, '_blank')}>
                            Open Payment Link
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No invoices generated for this order yet</p>
                  <p className="text-sm text-muted-foreground text-center mt-1">Invoices will be generated once the order is confirmed</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Order"
        description="Are you sure you want to cancel this order? This action cannot be undone."
        confirmLabel="Cancel Order"
        destructive={true}
        onConfirm={handleCancel}
      />
    </div>
  );
}
