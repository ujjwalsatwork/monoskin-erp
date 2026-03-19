import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DetailPageHeader } from '@/components/shared/DetailPageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { StatusTimeline } from '@/components/shared/StatusTimeline';
import { ShippingLabel } from '@/components/shared/ShippingLabel';
import { QuickActionsCard, QuickAction } from '@/components/shared/QuickActionsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Package, Truck, MapPin, Clock, CheckCircle2, 
  AlertTriangle, Printer, FileText, Phone, MessageSquare,
  Send, Camera, Video, Upload, Image, X, ExternalLink, Download
} from 'lucide-react';
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Shipment, Order, Doctor, Warehouse, Carrier } from '@shared/schema';

export default function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const shipmentId = Number(id);

  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [deliverDialogOpen, setDeliverDialogOpen] = useState(false);
  const [printLabelOpen, setPrintLabelOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [carrierDialogOpen, setCarrierDialogOpen] = useState(false);
  const [proofUploadOpen, setProofUploadOpen] = useState(false);
  const [proofRemarks, setProofRemarks] = useState('');
  const [uploadedProofs, setUploadedProofs] = useState<{ url: string; type: 'photo' | 'video'; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { data: shipment, isLoading } = useQuery<Shipment>({
    queryKey: ['/api/shipments', shipmentId],
    queryFn: async () => {
      const res = await fetch(`/api/shipments/${shipmentId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch shipment');
      return res.json();
    },
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: carriers = [] } = useQuery<Carrier[]>({
    queryKey: ['/api/carriers'],
  });

  const updateShipmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Shipment> }) => {
      const res = await apiRequest('PATCH', `/api/shipments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shipments', shipmentId] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update shipment', variant: 'destructive' });
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

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Shipment Not Found</h2>
        <p className="text-muted-foreground">The shipment you're looking for doesn't exist.</p>
        <Button className="mt-4" onClick={() => navigate('/shipments')} data-testid="button-back">
          Back to Shipments
        </Button>
      </div>
    );
  }

  const order = orders.find(o => o.id === shipment.orderId);
  const doctor = order ? doctors.find(d => d.id === order.doctorId) : null;
  const warehouse = warehouses.find(w => w.id === shipment.warehouseId);
  const carrier = carriers.find(c => c.id === shipment.carrierId);

  const handleDispatch = () => {
    updateShipmentMutation.mutate({
      id: shipment.id,
      data: { status: 'In Transit', dispatchedAt: new Date() },
    });
    setDispatchDialogOpen(false);
    toast({ title: 'Shipment Dispatched', description: 'Shipment is now in transit' });
  };

  const handleDeliver = () => {
    updateShipmentMutation.mutate({
      id: shipment.id,
      data: { status: 'Delivered', deliveredAt: new Date() },
    });
    setDeliverDialogOpen(false);
    toast({ title: 'Shipment Delivered', description: 'Delivery confirmed' });
  };

  const handleResendSMS = () => {
    toast({ 
      title: 'Tracking SMS Sent', 
      description: `SMS with tracking info sent to ${doctor?.phone || 'customer'}` 
    });
    setSmsDialogOpen(false);
  };

  const handleSendWhatsApp = () => {
    toast({ 
      title: 'WhatsApp Update Sent', 
      description: `Tracking update sent via WhatsApp to ${doctor?.phone || 'customer'}` 
    });
    setWhatsappDialogOpen(false);
  };

  const handleFileUpload = async (file: File, type: 'photo' | 'video') => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const urlRes = await fetch('/api/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error('Failed to get upload URL');
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadRes.ok) throw new Error('Upload to storage failed');

      setUploadedProofs(prev => [...prev, { url: objectPath, type, name: file.name }]);
      toast({ title: 'File Uploaded', description: `${type === 'photo' ? 'Photo' : 'Video'} uploaded successfully` });
    } catch (error) {
      toast({ title: 'Upload Failed', description: 'Could not upload file', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProof = () => {
    if (uploadedProofs.length === 0) {
      toast({ title: 'No Files', description: 'Please upload at least one photo or video', variant: 'destructive' });
      return;
    }
    
    const proofUrls = uploadedProofs.map(p => p.url);
    updateShipmentMutation.mutate({
      id: shipment.id,
      data: { 
        packageProof: [...(shipment.packageProof || []), ...proofUrls],
      },
    });
    
    toast({ title: 'Proof Saved', description: `${uploadedProofs.length} file(s) saved as packaging proof` });
    setProofUploadOpen(false);
    setUploadedProofs([]);
    setProofRemarks('');
  };

  const removeUploadedProof = (index: number) => {
    setUploadedProofs(prev => prev.filter((_, i) => i !== index));
  };

  const timelineSteps = [
    { 
      status: 'Pending', 
      label: 'Pending',
      timestamp: shipment.createdAt && !isNaN(new Date(shipment.createdAt).getTime()) ? new Date(shipment.createdAt).toISOString() : undefined,
    },
    { 
      status: 'Ready for Dispatch', 
      label: 'Ready for Dispatch',
    },
    { 
      status: 'Dispatched', 
      label: 'Dispatched',
      timestamp: shipment.dispatchedAt ? new Date(shipment.dispatchedAt).toISOString() : undefined,
    },
    { 
      status: 'In Transit', 
      label: 'In Transit',
    },
    { 
      status: 'Out for Delivery', 
      label: 'Out for Delivery',
    },
    { 
      status: 'Delivered', 
      label: 'Delivered',
      timestamp: shipment.deliveredAt ? new Date(shipment.deliveredAt).toISOString() : undefined,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'view-order',
      label: 'View Order',
      icon: 'document',
      onClick: () => order && navigate(`/orders/${order.id}`),
    },
    {
      id: 'print-label',
      label: 'Print Label',
      icon: 'print',
      onClick: () => setPrintLabelOpen(true),
    },
    {
      id: 'track',
      label: 'Track Package',
      icon: 'truck',
      onClick: () => toast({ title: 'Tracking', description: `Tracking ID: ${shipment.trackingId || 'N/A'}` }),
      disabled: !shipment.trackingId,
    },
    {
      id: 'upload-proof',
      label: 'Upload Proof',
      icon: 'package',
      onClick: () => setProofUploadOpen(true),
    },
  ];

  return (
    <div className="space-y-6">
      <DetailPageHeader
        title={`Shipment #${shipment.id}`}
        subtitle={`Order: ${order?.orderNumber || 'Unknown'}`}
        entityId={shipment.trackingId || `SHP-${shipment.id}`}
        backPath="/shipments"
        status={shipment.status}
        primaryActions={
          <div className="flex gap-2">
            {shipment.status === 'Ready for Dispatch' && (
              <Button onClick={() => setDispatchDialogOpen(true)} data-testid="button-dispatch">
                <Truck className="mr-2 h-4 w-4" /> Dispatch
              </Button>
            )}
            {shipment.status === 'In Transit' && (
              <Button onClick={() => setDeliverDialogOpen(true)} data-testid="button-deliver">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Delivered
              </Button>
            )}
          </div>
        }
      />

      <StatusTimeline
        steps={timelineSteps}
        currentStatus={shipment.status}
        title="Shipment Progress"
        orientation="horizontal"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <ShippingLabel
            shipmentNumber={`SHP-${shipment.id}`}
            trackingNumber={shipment.trackingId || undefined}
            carrier={carrier?.name}
            status={shipment.status}
            from={{
              name: warehouse?.name || 'Warehouse',
              address: warehouse?.address || '',
              city: warehouse?.city || '',
              state: warehouse?.state || '',
              pincode: warehouse?.pincode || '',
              phone: warehouse?.phone || undefined,
            }}
            to={{
              name: doctor?.name || 'Customer',
              address: doctor?.address || '',
              city: doctor?.city || '',
              state: doctor?.state || '',
              pincode: '',
              phone: doctor?.phone || undefined,
            }}
            orderNumber={order?.orderNumber}
            weight={shipment.weight ? `${shipment.weight} kg` : undefined}
            items={shipment.packages || 1}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shipment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <StatusPill status={shipment.status} />
                </div>
                <div>
                  <Label className="text-muted-foreground">Tracking ID</Label>
                  <p className="font-mono font-medium">{shipment.trackingId || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Carrier</Label>
                  <p className="font-medium">{carrier?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Warehouse</Label>
                  <p className="font-medium">{warehouse?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Weight</Label>
                  <p className="font-medium">{shipment.weight ? `${shipment.weight} kg` : '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Packages</Label>
                  <p className="font-medium">{shipment.packages || 1}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <QuickActionsCard actions={quickActions} layout="grid" />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{doctor?.name || 'Unknown'}</p>
              <p className="text-muted-foreground">{doctor?.clinic || '-'}</p>
              <p className="text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {doctor?.city}, {doctor?.state}
              </p>
              {doctor?.phone && (
                <p className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {doctor.phone}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Key Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{new Date(shipment.createdAt).toLocaleDateString()}</span>
              </div>
              {shipment.dispatchedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Dispatched</span>
                  <span className="text-sm">{new Date(shipment.dispatchedAt).toLocaleDateString()}</span>
                </div>
              )}
              {shipment.deliveredAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Delivered</span>
                  <span className="text-sm">{new Date(shipment.deliveredAt).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communications Card */}
          <Card data-testid="card-communications">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Communications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => setSmsDialogOpen(true)}
                data-testid="button-resend-sms"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Resend Tracking SMS
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => setWhatsappDialogOpen(true)}
                data-testid="button-send-whatsapp"
              >
                <Send className="h-4 w-4 mr-2" />
                Send WhatsApp Update
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => setCarrierDialogOpen(true)}
                data-testid="button-contact-carrier"
              >
                <Phone className="h-4 w-4 mr-2" />
                Contact Carrier
              </Button>
              <Separator className="my-2" />
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => {
                  if (doctor?.phone) window.open(`tel:${doctor.phone}`);
                  else toast({ title: 'No phone number available' });
                }}
                data-testid="button-call-customer"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Customer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Package Proof Section */}
      <Card data-testid="card-package-proof">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Package Proof
              </CardTitle>
              <CardDescription>Photo/video evidence of packaging to prevent disputes</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setProofUploadOpen(true)} data-testid="button-upload-proof">
              <Upload className="h-4 w-4 mr-2" /> Upload Proof
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {shipment.packageProof && shipment.packageProof.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {shipment.packageProof.map((url, idx) => (
                <div key={idx} className="relative group">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                    {url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') ? (
                      <div className="flex items-center justify-center h-full">
                        <Video className="h-8 w-8 text-muted-foreground" />
                        <Badge variant="secondary" className="absolute bottom-2 left-2">Video</Badge>
                      </div>
                    ) : (
                      <img src={url} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                    <Button size="icon" variant="secondary" onClick={() => window.open(url, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="secondary" asChild>
                      <a href={url} download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No packaging proof uploaded yet</p>
              <p className="text-sm">Upload photos or videos during packaging to prevent disputes</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dispatchDialogOpen} onOpenChange={setDispatchDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle>Dispatch Shipment</DialogTitle>
            <DialogDescription>Confirm the shipment is ready to be dispatched.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDispatch} disabled={updateShipmentMutation.isPending} data-testid="button-confirm-dispatch">
              {updateShipmentMutation.isPending ? 'Processing...' : 'Dispatch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deliverDialogOpen} onOpenChange={setDeliverDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle>Mark as Delivered</DialogTitle>
            <DialogDescription>Confirm the shipment has been delivered.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeliver} disabled={updateShipmentMutation.isPending} data-testid="button-confirm-deliver">
              {updateShipmentMutation.isPending ? 'Processing...' : 'Mark Delivered'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={printLabelOpen} onOpenChange={setPrintLabelOpen}>
        <DialogContent className="w-[95vw] max-w-2xl sm:w-full print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Print Shipping Label
            </DialogTitle>
            <DialogDescription>Review the shipping label and click print when ready.</DialogDescription>
          </DialogHeader>
          <div className="py-4 print:py-0" id="printable-label">
            <ShippingLabel
              shipmentNumber={`SHP-${shipment.id}`}
              trackingNumber={shipment.trackingId || undefined}
              carrier={carrier?.name}
              status={shipment.status}
              from={{
                name: warehouse?.name || 'Warehouse',
                address: warehouse?.address || '',
                city: warehouse?.city || '',
                state: warehouse?.state || '',
                pincode: '',
                phone: warehouse?.phone || undefined,
              }}
              to={{
                name: doctor?.name || 'Customer',
                address: doctor?.address || '',
                city: doctor?.city || '',
                state: doctor?.state || '',
                pincode: '',
                phone: doctor?.phone || undefined,
              }}
              weight={shipment.weight ? `${shipment.weight} kg` : undefined}
            />
          </div>
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setPrintLabelOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                window.print();
                toast({ title: 'Print Dialog Opened', description: 'Use your browser to print or save as PDF.' });
              }} 
              data-testid="button-print-label"
            >
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Resend Tracking SMS
            </DialogTitle>
            <DialogDescription>
              Send tracking information via SMS to {doctor?.phone || 'the customer'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Message Preview:</p>
              <p className="text-muted-foreground">
                Your order #{order?.orderNumber} has been shipped via {carrier?.name || 'carrier'}. 
                Track: {shipment.trackingId || 'N/A'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleResendSMS} data-testid="button-confirm-sms">
              <MessageSquare className="mr-2 h-4 w-4" /> Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send WhatsApp Update
            </DialogTitle>
            <DialogDescription>
              Send tracking update via WhatsApp to {doctor?.phone || 'the customer'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Message Preview:</p>
              <p className="text-muted-foreground">
                Hello {doctor?.name || 'Customer'}, your order #{order?.orderNumber} is on its way! 
                Carrier: {carrier?.name || 'N/A'} | Tracking: {shipment.trackingId || 'N/A'} | 
                Status: {shipment.status}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsappDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendWhatsApp} data-testid="button-confirm-whatsapp">
              <Send className="mr-2 h-4 w-4" /> Send WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carrier Contact Dialog */}
      <Dialog open={carrierDialogOpen} onOpenChange={setCarrierDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Carrier
            </DialogTitle>
            <DialogDescription>
              Contact {carrier?.name || 'the carrier'} regarding this shipment
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {carrier ? (
              <>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Carrier</span>
                  <span className="text-sm">{carrier.name}</span>
                </div>
                {carrier.phone && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Phone</span>
                    <a href={`tel:${carrier.phone}`} className="text-sm text-primary hover:underline">{carrier.phone}</a>
                  </div>
                )}
                {carrier.email && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Email</span>
                    <a href={`mailto:${carrier.email}`} className="text-sm text-primary hover:underline">{carrier.email}</a>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Tracking ID</span>
                  <span className="font-mono text-sm">{shipment.trackingId || 'N/A'}</span>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No carrier assigned to this shipment
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCarrierDialogOpen(false)}>Close</Button>
            {carrier?.phone && (
              <Button onClick={() => window.open(`tel:${carrier.phone}`)} data-testid="button-call-carrier">
                <Phone className="mr-2 h-4 w-4" /> Call Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Proof Upload Dialog */}
      <Dialog open={proofUploadOpen} onOpenChange={setProofUploadOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Upload Packaging Proof
            </DialogTitle>
            <DialogDescription>
              Upload photos or videos of the packaging process to prevent disputes, theft, or malpractice
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex gap-3">
              <input
                type="file"
                accept="image/*"
                ref={photoInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'photo');
                }}
              />
              <input
                type="file"
                accept="video/*"
                ref={videoInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'video');
                }}
              />
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploading}
                data-testid="button-upload-photo"
              >
                <Camera className="h-4 w-4 mr-2" />
                Add Photo
              </Button>
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploading}
                data-testid="button-upload-video"
              >
                <Video className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            </div>

            {isUploading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </div>
            )}

            {uploadedProofs.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files ({uploadedProofs.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploadedProofs.map((proof, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        {proof.type === 'photo' ? (
                          <Image className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Video className="h-4 w-4 text-purple-500" />
                        )}
                        <span className="text-sm truncate max-w-[200px]">{proof.name}</span>
                        <Badge variant="secondary" className="text-xs">{proof.type}</Badge>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeUploadedProof(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Remarks (Optional)</Label>
              <Textarea 
                placeholder="Add any notes about the packaging..."
                value={proofRemarks}
                onChange={(e) => setProofRemarks(e.target.value)}
                className="mt-1"
                data-testid="input-proof-remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProofUploadOpen(false); setUploadedProofs([]); setProofRemarks(''); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveProof} 
              disabled={uploadedProofs.length === 0 || updateShipmentMutation.isPending}
              data-testid="button-save-proof"
            >
              <Upload className="mr-2 h-4 w-4" />
              {updateShipmentMutation.isPending ? 'Saving...' : 'Save Proof'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
