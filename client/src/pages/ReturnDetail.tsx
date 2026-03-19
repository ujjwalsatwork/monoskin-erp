import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DetailPageHeader } from '@/components/shared/DetailPageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RotateCcw, Package, AlertTriangle, ClipboardCheck, Check, X,
  FileText, User, Calendar, Camera, Upload, Image as ImageIcon,
  ExternalLink, Truck, CreditCard, Clock, MapPin, Download
} from 'lucide-react';
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient as qc } from '@/lib/queryClient';
import type { Return, Order, Doctor, Warehouse, CreditNote } from '@shared/schema';

const inspectionChecklist = [
  { id: 'packaging', label: 'Packaging intact' },
  { id: 'seal', label: 'Seal unbroken' },
  { id: 'expiry', label: 'Expiry date valid' },
  { id: 'quantity', label: 'Quantity matches claim' },
  { id: 'condition', label: 'Product condition acceptable' },
];

const PICKUP_STEPS = ['Requested', 'Partner Assigned', 'Picked Up', 'In Transit', 'Received at Warehouse'];

export default function ReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const returnId = Number(id);

  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [inspectionNotes, setInspectionNotes] = useState('');

  const [internalNotes, setInternalNotes] = useState('');
  const [inspectorRemarks, setInspectorRemarks] = useState('');
  const [pickupPartner, setPickupPartner] = useState('');
  const [resolutionType, setResolutionType] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: returnItem, isLoading } = useQuery<Return>({
    queryKey: ['/api/returns', returnId],
    queryFn: async () => {
      const res = await fetch(`/api/returns/${returnId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch return');
      const data = await res.json();
      setInternalNotes(data.internalNotes || '');
      setInspectorRemarks(data.inspectorRemarks || '');
      setPickupPartner(data.pickupPartner || '');
      setResolutionType(data.resolutionType || '');
      return data;
    },
  });

  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ['/api/orders'] });
  const { data: doctors = [] } = useQuery<Doctor[]>({ queryKey: ['/api/doctors'] });
  const { data: warehouses = [] } = useQuery<Warehouse[]>({ queryKey: ['/api/warehouses'] });
  const { data: creditNotes = [] } = useQuery<CreditNote[]>({ queryKey: ['/api/credit-notes'] });

  const updateReturnMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Return> }) => {
      const res = await apiRequest('PATCH', `/api/returns/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/returns', returnId] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update return', variant: 'destructive' });
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

  if (!returnItem) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Return Not Found</h2>
        <p className="text-muted-foreground">The return you're looking for doesn't exist.</p>
        <Button className="mt-4" onClick={() => navigate('/returns')} data-testid="button-back">
          Back to Returns
        </Button>
      </div>
    );
  }

  const order = orders.find(o => o.id === returnItem.orderId);
  const doctor = doctors.find(d => d.id === returnItem.doctorId);
  const warehouse = warehouses.find(w => w.id === returnItem.warehouseId);
  const linkedCreditNote = creditNotes.find(cn => cn.returnId === returnItem.id || cn.id === returnItem.creditNoteId);

  const handleStartInspection = () => {
    updateReturnMutation.mutate({ id: returnItem.id, data: { status: 'Inspecting' } });
    setInspectionDialogOpen(true);
  };

  const handleCompleteInspection = () => {
    const allChecked = inspectionChecklist.every(item => checkedItems[item.id]);
    updateReturnMutation.mutate({
      id: returnItem.id,
      data: {
        status: allChecked ? 'Approved' : 'Pending Approval',
        inspectorRemarks: inspectionNotes,
      },
    });
    setInspectionDialogOpen(false);
    toast({ title: 'Inspection Complete', description: 'Return inspection has been recorded' });
  };

  const handleApprove = () => {
    updateReturnMutation.mutate({ id: returnItem.id, data: { status: 'Approved', processedAt: new Date() } });
    setApproveDialogOpen(false);
    toast({ title: 'Return Approved', description: 'Credit note will be issued' });
  };

  const handleReject = () => {
    updateReturnMutation.mutate({ id: returnItem.id, data: { status: 'Rejected', processedAt: new Date() } });
    setRejectDialogOpen(false);
    toast({ title: 'Return Rejected', description: 'Customer will be notified' });
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await apiRequest('PATCH', `/api/returns/${returnId}`, {
        internalNotes,
        inspectorRemarks,
        pickupPartner: pickupPartner || null,
        resolutionType: resolutionType || null,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/returns', returnId] });
      toast({ title: 'Saved', description: 'Notes and remarks updated' });
    } catch {
      toast({ title: 'Error', description: 'Could not save notes', variant: 'destructive' });
    } finally {
      setSavingNotes(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhotos(true);
    try {
      const res = await fetch('/api/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error('Could not get upload URL');
      const { uploadURL, objectPath } = await res.json();
      await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const currentPhotos = returnItem.photos || [];
      await apiRequest('PATCH', `/api/returns/${returnId}`, { photos: [...currentPhotos, objectPath] });
      queryClient.invalidateQueries({ queryKey: ['/api/returns', returnId] });
      toast({ title: 'Photo Added', description: 'Evidence photo saved to return record' });
    } catch {
      toast({ title: 'Upload Failed', description: 'Could not upload photo', variant: 'destructive' });
    } finally {
      setUploadingPhotos(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async (url: string) => {
    const updated = (returnItem.photos || []).filter(p => p !== url);
    await apiRequest('PATCH', `/api/returns/${returnId}`, { photos: updated });
    queryClient.invalidateQueries({ queryKey: ['/api/returns', returnId] });
    toast({ title: 'Photo Removed' });
  };

  const getPickupStepIndex = () => {
    const s = returnItem.status;
    if (s === 'Pending Pickup' || s === 'Pending') return 0;
    if (returnItem.pickupPartner && s !== 'Completed' && s !== 'In Transit' && s !== 'Inspecting') return 1;
    if (s === 'Pending Approval' || s === 'Inspecting') return 3;
    if (s === 'Completed' || s === 'Approved' || s === 'Rejected') return 4;
    if (s === 'In Transit') return 3;
    return 2;
  };

  const currentPickupStep = getPickupStepIndex();

  return (
    <div className="space-y-6">
      <DetailPageHeader
        title={`Return ${returnItem.returnNumber}`}
        subtitle={returnItem.reason || 'Return Request'}
        entityId={returnItem.returnNumber}
        backPath="/returns"
        status={returnItem.status}
        primaryActions={
          <div className="flex gap-2 flex-wrap">
            {returnItem.status === 'Pending Pickup' && (
              <Button onClick={handleStartInspection} data-testid="button-inspect">
                <ClipboardCheck className="mr-2 h-4 w-4" /> Start Inspection
              </Button>
            )}
            {(returnItem.status === 'Completed' || returnItem.status === 'In Transit' || returnItem.status === 'Pending Approval') && (
              <>
                <Button variant="outline" onClick={() => setRejectDialogOpen(true)} data-testid="button-reject">
                  <X className="mr-2 h-4 w-4" /> Reject
                </Button>
                <Button onClick={() => setApproveDialogOpen(true)} data-testid="button-approve">
                  <Check className="mr-2 h-4 w-4" /> Approve
                </Button>
              </>
            )}
          </div>
        }
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList data-testid="tabs-return">
          <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
          <TabsTrigger value="photos" data-testid="tab-photos">
            Item Photos
            {returnItem.photos && returnItem.photos.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{returnItem.photos.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pickup" data-testid="tab-pickup">Pickup & Logistics</TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes">Inspector Notes</TabsTrigger>
          <TabsTrigger value="resolution" data-testid="tab-resolution">Resolution</TabsTrigger>
        </TabsList>

        {/* ─── Tab: Details ─── */}
        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card data-testid="card-return-details">
                <CardHeader><CardTitle>Return Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide">Return Number</Label>
                      <p className="font-medium font-mono">{returnItem.returnNumber}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide">Status</Label>
                      <div className="mt-0.5"><StatusPill status={returnItem.status} /></div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide">Reason</Label>
                      <p className="font-medium">{returnItem.reason || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide">Order</Label>
                      {order ? (
                        <button onClick={() => navigate(`/orders/${order.id}`)} className="font-medium text-primary hover:underline text-sm" data-testid="link-order">
                          {order.orderNumber}
                        </button>
                      ) : <p className="font-medium">—</p>}
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide">Customer</Label>
                      {doctor ? (
                        <button onClick={() => navigate(`/doctors/${doctor.id}`)} className="font-medium text-primary hover:underline text-sm" data-testid="link-doctor">
                          {doctor.name}
                        </button>
                      ) : <p className="font-medium">—</p>}
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide">Warehouse</Label>
                      <p className="font-medium">{warehouse?.name || '—'}</p>
                    </div>
                    {returnItem.pickupPartner && (
                      <div>
                        <Label className="text-muted-foreground text-xs uppercase tracking-wide">Pickup Partner</Label>
                        <p className="font-medium">{returnItem.pickupPartner}</p>
                      </div>
                    )}
                    {returnItem.resolutionType && (
                      <div>
                        <Label className="text-muted-foreground text-xs uppercase tracking-wide">Resolution</Label>
                        <Badge variant="secondary">{returnItem.resolutionType}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card data-testid="card-return-timeline">
                <CardHeader><CardTitle>Return Timeline</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Return Created</p>
                        <p className="text-sm text-muted-foreground">
                          {returnItem.createdAt ? new Date(returnItem.createdAt).toLocaleString() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    {returnItem.pickupScheduledAt && (
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-blue-500/10 rounded-full flex-shrink-0">
                          <Truck className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">Pickup Scheduled</p>
                          <p className="text-sm text-muted-foreground">{new Date(returnItem.pickupScheduledAt).toLocaleString()}</p>
                          {returnItem.pickupPartner && <p className="text-xs text-muted-foreground">Partner: {returnItem.pickupPartner}</p>}
                        </div>
                      </div>
                    )}
                    {returnItem.receivedAt && (
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-green-500/10 rounded-full flex-shrink-0">
                          <Package className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">Items Received</p>
                          <p className="text-sm text-muted-foreground">{new Date(returnItem.receivedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    {returnItem.pickupCompletedAt && (
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-indigo-500/10 rounded-full flex-shrink-0">
                          <Check className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div>
                          <p className="font-medium">Pickup Completed</p>
                          <p className="text-sm text-muted-foreground">{new Date(returnItem.pickupCompletedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    {returnItem.processedAt && (
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-purple-500/10 rounded-full flex-shrink-0">
                          <ClipboardCheck className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium">Return Processed — {returnItem.status}</p>
                          <p className="text-sm text-muted-foreground">{new Date(returnItem.processedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {/* Quick Actions */}
              <Card data-testid="card-quick-actions">
                <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => order && navigate(`/orders/${order.id}`)} data-testid="button-view-order">
                    <FileText className="mr-2 h-4 w-4" /> View Original Order
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => doctor && navigate(`/doctors/${doctor.id}`)} data-testid="button-view-customer">
                    <User className="mr-2 h-4 w-4" /> View Customer
                  </Button>
                  {linkedCreditNote && (
                    <Button variant="outline" className="w-full justify-start" onClick={() => navigate(`/finance/credit-notes`)} data-testid="button-view-credit-note">
                      <CreditCard className="mr-2 h-4 w-4" /> View Credit Note
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Credit Note Resolution */}
              {linkedCreditNote && (
                <Card className="border-green-200 dark:border-green-800" data-testid="card-linked-credit-note">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Linked Credit Note
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Credit Note #</span>
                      <span className="text-sm font-medium font-mono">{linkedCreditNote.creditNoteNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="text-sm font-bold">₹{Number(linkedCreditNote.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <StatusPill status={linkedCreditNote.status} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ─── Tab: Item Photos ─── */}
        <TabsContent value="photos" className="mt-4">
          <Card data-testid="card-item-photos">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Photos of Returned Items
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Upload photo evidence of returned items for audit and dispute resolution.</p>
                </div>
                <div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    data-testid="input-return-photo"
                  />
                  <Button
                    variant="outline"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhotos}
                    data-testid="button-upload-return-photo"
                  >
                    {uploadingPhotos ? (
                      <><div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" /> Uploading…</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-2" /> Add Photo</>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {returnItem.photos && returnItem.photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {returnItem.photos.map((url, idx) => (
                    <div key={idx} className="relative group" data-testid={`img-return-photo-${idx}`}>
                      <div className="aspect-square bg-muted rounded-xl overflow-hidden border">
                        <img src={url} alt={`Return evidence ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                        <Button size="icon" variant="secondary" onClick={() => window.open(url, '_blank')} data-testid={`button-view-photo-${idx}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="secondary" asChild>
                          <a href={url} download><Download className="h-4 w-4" /></a>
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => handleRemovePhoto(url)} data-testid={`button-remove-photo-${idx}`}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-1">Photo {idx + 1}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-25" />
                  <p className="font-medium">No photos uploaded yet</p>
                  <p className="text-sm mt-1">Upload photos of the returned items for evidence and quality inspection.</p>
                  <Button variant="outline" className="mt-4" onClick={() => photoInputRef.current?.click()} data-testid="button-upload-first-photo">
                    <Camera className="h-4 w-4 mr-2" /> Take / Upload First Photo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Pickup & Logistics ─── */}
        <TabsContent value="pickup" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card data-testid="card-pickup-timeline">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Pickup Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {PICKUP_STEPS.map((step, index) => {
                    const done = index < currentPickupStep;
                    const active = index === currentPickupStep;
                    return (
                      <div key={step} className="flex items-center gap-3" data-testid={`pickup-step-${index}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                          ${done ? 'bg-green-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${active ? 'text-primary' : done ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                            {step}
                          </p>
                          {index === 1 && returnItem.pickupPartner && (
                            <p className="text-xs text-muted-foreground">{returnItem.pickupPartner}</p>
                          )}
                          {index === 0 && returnItem.createdAt && (
                            <p className="text-xs text-muted-foreground">{new Date(returnItem.createdAt).toLocaleDateString()}</p>
                          )}
                          {index === 4 && returnItem.receivedAt && (
                            <p className="text-xs text-muted-foreground">{new Date(returnItem.receivedAt).toLocaleDateString()}</p>
                          )}
                        </div>
                        {active && <Badge variant="outline" className="text-xs text-primary border-primary">Current</Badge>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-pickup-partner">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Pickup Partner & Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="pickup-partner">Pickup Partner / Carrier</Label>
                  <Input
                    id="pickup-partner"
                    value={pickupPartner}
                    onChange={e => setPickupPartner(e.target.value)}
                    placeholder="e.g. Blue Dart, Delhivery, Shiprocket"
                    className="mt-1"
                    data-testid="input-pickup-partner"
                  />
                </div>
                <div>
                  <Label>Pickup Scheduled At</Label>
                  <Input
                    type="datetime-local"
                    defaultValue={returnItem.pickupScheduledAt ? new Date(returnItem.pickupScheduledAt).toISOString().slice(0, 16) : ''}
                    onChange={e => {
                      if (e.target.value) {
                        updateReturnMutation.mutate({ id: returnItem.id, data: { pickupScheduledAt: new Date(e.target.value) } });
                      }
                    }}
                    className="mt-1"
                    data-testid="input-pickup-scheduled"
                  />
                </div>
                <div>
                  <Label>Pickup Completed At</Label>
                  <Input
                    type="datetime-local"
                    defaultValue={returnItem.pickupCompletedAt ? new Date(returnItem.pickupCompletedAt).toISOString().slice(0, 16) : ''}
                    onChange={e => {
                      if (e.target.value) {
                        updateReturnMutation.mutate({ id: returnItem.id, data: { pickupCompletedAt: new Date(e.target.value) } });
                      }
                    }}
                    className="mt-1"
                    data-testid="input-pickup-completed"
                  />
                </div>
                <Button onClick={handleSaveNotes} disabled={savingNotes} className="w-full" data-testid="button-save-pickup">
                  {savingNotes ? 'Saving…' : 'Save Pickup Info'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Tab: Inspector Notes ─── */}
        <TabsContent value="notes" className="mt-4">
          <Card data-testid="card-inspector-notes">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" /> Inspector Remarks & Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="inspector-remarks" className="text-sm font-medium">
                  Inspector Remarks <span className="text-muted-foreground font-normal">(visible to approvers)</span>
                </Label>
                <Textarea
                  id="inspector-remarks"
                  value={inspectorRemarks}
                  onChange={e => setInspectorRemarks(e.target.value)}
                  placeholder="Describe the condition of returned items, any damage observed, packaging state, product quality assessment…"
                  className="mt-1.5 min-h-[120px] resize-none"
                  data-testid="textarea-inspector-remarks"
                />
              </div>
              <div>
                <Label htmlFor="internal-notes" className="text-sm font-medium">
                  Internal Notes <span className="text-muted-foreground font-normal">(team only)</span>
                </Label>
                <Textarea
                  id="internal-notes"
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder="Internal handling notes, escalation details, special instructions…"
                  className="mt-1.5 min-h-[100px] resize-none"
                  data-testid="textarea-internal-notes"
                />
              </div>
              <Button onClick={handleSaveNotes} disabled={savingNotes} data-testid="button-save-notes">
                {savingNotes ? 'Saving…' : 'Save Notes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Resolution ─── */}
        <TabsContent value="resolution" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card data-testid="card-resolution">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Resolution Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Resolution Decision</Label>
                  <Select value={resolutionType} onValueChange={setResolutionType}>
                    <SelectTrigger className="mt-1" data-testid="select-resolution-type">
                      <SelectValue placeholder="Select resolution…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit Note">Credit Note</SelectItem>
                      <SelectItem value="Refund">Refund</SelectItem>
                      <SelectItem value="Replacement">Replacement</SelectItem>
                      <SelectItem value="No Action">No Action</SelectItem>
                      <SelectItem value="Partial Credit">Partial Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveNotes} disabled={savingNotes} data-testid="button-save-resolution">
                  {savingNotes ? 'Saving…' : 'Save Resolution'}
                </Button>
              </CardContent>
            </Card>

            <Card data-testid="card-credit-note-info">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Linked Credit Note
                </CardTitle>
              </CardHeader>
              <CardContent>
                {linkedCreditNote ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Credit Note #</span>
                      <span className="font-mono font-medium text-sm">{linkedCreditNote.creditNoteNumber}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="text-lg font-bold text-green-700 dark:text-green-400">
                        ₹{Number(linkedCreditNote.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <StatusPill status={linkedCreditNote.status} />
                    </div>
                    {linkedCreditNote.notes && (
                      <div className="py-2">
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm">{linkedCreditNote.notes}</p>
                      </div>
                    )}
                    <Button variant="outline" className="w-full" onClick={() => navigate('/finance/credit-notes')} data-testid="button-open-credit-note">
                      <ExternalLink className="h-4 w-4 mr-2" /> Open in Finance
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-25" />
                    <p className="font-medium">No credit note linked</p>
                    <p className="text-sm mt-1">A credit note will appear here once the return is approved and processed.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Inspection Dialog */}
      <Dialog open={inspectionDialogOpen} onOpenChange={setInspectionDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle>Return Inspection</DialogTitle>
            <DialogDescription>Complete the inspection checklist</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {inspectionChecklist.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <Checkbox id={item.id} checked={checkedItems[item.id] || false}
                  onCheckedChange={(checked) => setCheckedItems({ ...checkedItems, [item.id]: !!checked })} />
                <Label htmlFor={item.id}>{item.label}</Label>
              </div>
            ))}
            <div>
              <Label>Notes</Label>
              <Textarea value={inspectionNotes} onChange={(e) => setInspectionNotes(e.target.value)} placeholder="Add inspection notes..." data-testid="input-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInspectionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCompleteInspection} data-testid="button-complete-inspection">Complete Inspection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle>Approve Return</DialogTitle>
            <DialogDescription>This will approve the return and issue a credit note.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} data-testid="button-confirm-approve">Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle>Reject Return</DialogTitle>
            <DialogDescription>This will reject the return request.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} data-testid="button-confirm-reject">Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
