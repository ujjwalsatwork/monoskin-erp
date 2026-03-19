import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { RowActionsMenu } from '@/components/shared/RowActionsMenu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportModal } from '@/components/shared/ExportModal';
import { EntityDetailDrawer } from '@/components/shared/EntityDetailDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw, Eye, Check, X, Plus, Search, Filter, ClipboardCheck, Loader2, Camera, Upload, Clock, Calendar, CreditCard, Package, FileText, Image, Trash2, ExternalLink, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useUpload } from '@/hooks/use-upload';
import type { Return, Order, Doctor } from '@shared/schema';

const inspectionChecklist = [
  { id: 'packaging', label: 'Packaging intact' },
  { id: 'seal', label: 'Seal unbroken' },
  { id: 'expiry', label: 'Expiry date valid' },
  { id: 'quantity', label: 'Quantity matches claim' },
  { id: 'condition', label: 'Product condition acceptable' },
];

export default function Returns() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [newReturn, setNewReturn] = useState({ orderId: '', reason: '', warehouseId: '' });
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [photoData, setPhotoData] = useState<{ photos: string[]; notes: string }>({ photos: [], notes: '' });
  const [pickupData, setPickupData] = useState({ scheduledDate: '', timeSlot: '', notes: '' });
  const [internalNotesData, setInternalNotesData] = useState({ inspectorRemarks: '', internalNotes: '' });
  
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setPhotoData(prev => ({ ...prev, photos: [...prev.photos, response.objectPath] }));
      toast({ title: 'Photo Uploaded', description: 'Photo uploaded successfully' });
    },
    onError: () => {
      toast({ title: 'Upload Failed', description: 'Failed to upload photo', variant: 'destructive' });
    },
  });

  const { data: inventory = [] } = useQuery<{ id: number; productId: number; warehouseId: number; quantity: number }[]>({
    queryKey: ['/api/inventory'],
  });

  const { data: returnItems = [] } = useQuery<{ id: number; returnId: number; productId: number; quantity: number }[]>({
    queryKey: ['/api/return-items'],
  });

  const inventoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { quantity: number } }) => {
      return apiRequest('PATCH', `/api/inventory/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
    },
  });

  const { data: returns = [], isLoading } = useQuery<Return[]>({
    queryKey: ['/api/returns'],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: warehouses = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['/api/warehouses'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Return>) => {
      return apiRequest('POST', '/api/returns', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      toast({ title: 'Return Created', description: 'Return request has been created' });
      setCreateDialogOpen(false);
      setNewReturn({ orderId: '', reason: '', warehouseId: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Return> }) => {
      return apiRequest('PATCH', `/api/returns/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
    },
  });

  const filteredReturns = returns.filter(ret => {
    const matchesSearch = ret.returnNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(ret.orderId).includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || ret.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportColumns = [
    { key: 'id', label: 'Return ID', defaultSelected: true },
    { key: 'orderId', label: 'Order ID', defaultSelected: true },
    { key: 'status', label: 'Status', defaultSelected: true },
    { key: 'reason', label: 'Reason', defaultSelected: true },
    { key: 'createdAt', label: 'Created At' },
  ];

  const handleCreate = () => {
    if (!newReturn.orderId || !newReturn.warehouseId) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    const returnNumber = `RET${String(returns.length + 1).padStart(5, '0')}`;
    createMutation.mutate({
      returnNumber,
      orderId: parseInt(newReturn.orderId),
      warehouseId: parseInt(newReturn.warehouseId),
      reason: newReturn.reason,
      status: 'Pending',
    });
  };

  const handleInspection = () => {
    if (!selectedReturn) return;
    const checklistJson = JSON.stringify(checkedItems);
    updateMutation.mutate(
      { 
        id: selectedReturn.id, 
        data: { 
          status: 'Inspected',
          inspectionChecklist: checklistJson,
          inspectorRemarks: inspectionNotes,
        } 
      },
      {
        onSuccess: () => {
          toast({ title: 'Inspection Complete', description: 'Return has been inspected with remarks saved' });
          setInspectionDialogOpen(false);
          setCheckedItems({});
          setInspectionNotes('');
        },
      }
    );
  };

  const handleApprove = (reason?: string) => {
    if (!selectedReturn) return;
    
    // Get return items for this return
    const itemsToReturn = returnItems.filter(ri => ri.returnId === selectedReturn.id);
    
    // Adjust inventory for each returned item
    itemsToReturn.forEach(item => {
      const invRecord = inventory.find(
        inv => inv.productId === item.productId && inv.warehouseId === selectedReturn.warehouseId
      );
      if (invRecord) {
        inventoryMutation.mutate({
          id: invRecord.id,
          data: { quantity: invRecord.quantity + item.quantity }
        });
      }
    });
    
    updateMutation.mutate(
      { 
        id: selectedReturn.id, 
        data: { 
          status: 'Approved',
          inventoryAdjusted: true,
          inventoryAdjustedAt: new Date(),
        } 
      },
      {
        onSuccess: () => {
          toast({ 
            title: 'Return Approved', 
            description: itemsToReturn.length > 0 
              ? `Credit note request created. ${itemsToReturn.length} item(s) added back to inventory.`
              : 'Credit note request created. No items to adjust in inventory.'
          });
          setApproveDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
        },
      }
    );
  };

  const handleReject = (reason?: string) => {
    if (!selectedReturn) return;
    updateMutation.mutate(
      { id: selectedReturn.id, data: { status: 'Rejected' } },
      {
        onSuccess: () => {
          toast({ title: 'Return Rejected', description: 'Return request has been rejected', variant: 'destructive' });
          setRejectDialogOpen(false);
        },
      }
    );
  };

  const handleUploadPhoto = () => {
    if (!selectedReturn) return;
    if (photoData.photos.length === 0) {
      toast({ title: 'Photo Required', description: 'Please upload at least one photo', variant: 'destructive' });
      return;
    }
    
    const existingPhotos = selectedReturn.photos || [];
    const allPhotos = [...existingPhotos, ...photoData.photos];
    
    updateMutation.mutate(
      { 
        id: selectedReturn.id, 
        data: { 
          photos: allPhotos,
          internalNotes: photoData.notes || selectedReturn.internalNotes,
        } 
      },
      {
        onSuccess: () => {
          toast({ title: 'Photos Saved', description: `${photoData.photos.length} photo(s) added to return ${selectedReturn.returnNumber}` });
          setPhotoDialogOpen(false);
          setPhotoData({ photos: [], notes: '' });
        },
      }
    );
  };

  const handleSaveNotes = () => {
    if (!selectedReturn) return;
    updateMutation.mutate(
      { 
        id: selectedReturn.id, 
        data: { 
          inspectorRemarks: internalNotesData.inspectorRemarks,
          internalNotes: internalNotesData.internalNotes,
        } 
      },
      {
        onSuccess: () => {
          toast({ title: 'Notes Saved', description: 'Inspector remarks and internal notes updated' });
          setNotesDialogOpen(false);
          setInternalNotesData({ inspectorRemarks: '', internalNotes: '' });
        },
      }
    );
  };

  const createCreditNoteMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest('POST', '/api/credit-notes', data);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['/api/credit-notes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      toast({ title: 'Credit Note Created', description: `Credit note linked to return ${(vars as { returnNumber?: string }).returnNumber}` });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create credit note', variant: 'destructive' });
    },
  });

  const handleSchedulePickup = () => {
    if (!selectedReturn) return;
    if (!pickupData.scheduledDate) {
      toast({ title: 'Date Required', description: 'Please select a pickup date', variant: 'destructive' });
      return;
    }
    updateMutation.mutate(
      {
        id: selectedReturn.id,
        data: {
          pickupScheduledAt: new Date(pickupData.scheduledDate),
          pickupPartner: pickupData.timeSlot || 'Internal',
          status: 'Pickup Scheduled',
        },
      },
      {
        onSuccess: () => {
          toast({ title: 'Pickup Scheduled', description: `Pickup scheduled for ${pickupData.scheduledDate}${pickupData.timeSlot ? ` — ${pickupData.timeSlot}` : ''}` });
          setPickupDialogOpen(false);
          setPickupData({ scheduledDate: '', timeSlot: '', notes: '' });
        },
      }
    );
  };

  const handleLinkCreditNote = (ret: Return) => {
    if (ret.creditNoteId) {
      toast({ title: 'Already Linked', description: `This return already has a credit note linked.` });
      return;
    }
    const creditNoteNumber = `CN-RET-${ret.returnNumber}`;
    createCreditNoteMutation.mutate({
      creditNoteNumber,
      returnId: ret.id,
      doctorId: ret.doctorId,
      amount: '0',
      reason: `Return ${ret.returnNumber} — ${ret.reason || 'Customer return'}`,
      reasonCode: 'customer_return',
      status: 'draft',
      returnNumber: ret.returnNumber,
    });
  };

  const handleAdjustInventory = (ret: Return) => {
    const itemsToAdjust = returnItems.filter(ri => ri.returnId === ret.id);
    if (itemsToAdjust.length === 0) {
      toast({ title: 'No Items', description: 'No return items found to adjust', variant: 'destructive' });
      return;
    }
    itemsToAdjust.forEach(item => {
      const invRecord = inventory.find(inv => inv.productId === item.productId && inv.warehouseId === ret.warehouseId);
      if (invRecord) {
        inventoryMutation.mutate({ id: invRecord.id, data: { quantity: invRecord.quantity + item.quantity } });
      }
    });
    updateMutation.mutate({ id: ret.id, data: { inventoryAdjusted: true, inventoryAdjustedAt: new Date() } });
    toast({ title: 'Inventory Adjusted', description: `Stock adjusted for return ${ret.returnNumber}` });
  };

  const columns: Column<Return>[] = [
    { key: 'returnNumber', header: 'Return ID', sortable: true, render: (row) => <span className="font-mono text-xs" data-testid={`text-return-id-${row.id}`}>{row.returnNumber}</span> },
    { key: 'orderId', header: 'Order', sortable: true, render: (row) => {
      const order = orders.find(o => o.id === row.orderId);
      const doctor = row.doctorId ? doctors.find(d => d.id === row.doctorId) : null;
      return (
        <div>
          <p className="font-medium">{order?.orderNumber || `ORD${String(row.orderId).padStart(3, '0')}`}</p>
          <p className="text-xs text-muted-foreground">{doctor?.name || 'N/A'}</p>
        </div>
      );
    }},
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusPill status={row.status} /> },
    { key: 'reason', header: 'Reason', render: (row) => row.reason || '—' },
    { key: 'createdAt', header: 'Created', sortable: true, render: (row) => new Date(row.createdAt).toLocaleDateString() },
    { key: 'actions', header: '', render: (row) => (
      <RowActionsMenu actions={[
        { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => { setSelectedReturn(row); setDetailDrawerOpen(true); } },
        { label: 'Upload Photos', icon: <Camera className="h-4 w-4" />, onClick: () => { setSelectedReturn(row); setPhotoData({ photos: [], notes: '' }); setPhotoDialogOpen(true); } },
        { label: 'Add Notes', icon: <FileText className="h-4 w-4" />, onClick: () => { 
          setSelectedReturn(row); 
          setInternalNotesData({ 
            inspectorRemarks: row.inspectorRemarks || '', 
            internalNotes: row.internalNotes || '' 
          }); 
          setNotesDialogOpen(true); 
        } },
        { label: 'Schedule Pickup', icon: <Calendar className="h-4 w-4" />, onClick: () => { setSelectedReturn(row); setPickupDialogOpen(true); } },
        ...(row.status === 'Pending' ? [{ label: 'Inspect', icon: <ClipboardCheck className="h-4 w-4" />, onClick: () => { setSelectedReturn(row); setInspectionDialogOpen(true); } }] : []),
        ...(row.status === 'Inspected' ? [
          { label: 'Approve', icon: <Check className="h-4 w-4" />, onClick: () => { setSelectedReturn(row); setApproveDialogOpen(true); } },
          { label: 'Reject', icon: <X className="h-4 w-4" />, onClick: () => { setSelectedReturn(row); setRejectDialogOpen(true); }, destructive: true },
        ] : []),
        ...(row.status === 'Approved' ? [
          { label: 'Link Credit Note', icon: <CreditCard className="h-4 w-4" />, onClick: () => handleLinkCreditNote(row) },
        ] : []),
      ]} />
    )},
  ];

  const pendingCount = returns.filter(r => r.status === 'Pending').length;
  const approvedCount = returns.filter(r => r.status === 'Approved').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Returns" 
        description="Manage return requests and inspections"
        actions={<Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-return"><Plus className="h-4 w-4 mr-2" /> Create Return</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Returns" value={returns.length} icon={<RotateCcw className="h-5 w-5" />} />
        <StatCard title="Pending Inspection" value={pendingCount} />
        <StatCard title="Approved" value={approvedCount} />
        <StatCard title="This Month" value={returns.filter(r => new Date(r.createdAt).getMonth() === new Date().getMonth()).length} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search returns..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Inspected">Inspected</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">Export</Button>
      </div>

      <DataTable columns={columns} data={filteredReturns} onRowClick={(row) => navigate(`/returns/${row.id}`)} emptyMessage="No returns found" />

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle>Create Return Request</DialogTitle>
            <DialogDescription>Submit a return request for an order</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Order</Label>
              <Select value={newReturn.orderId} onValueChange={(v) => setNewReturn({ ...newReturn, orderId: v })}>
                <SelectTrigger data-testid="select-order"><SelectValue placeholder="Select order" /></SelectTrigger>
                <SelectContent>
                  {orders.map(o => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.orderNumber} - {doctors.find(d => d.id === o.doctorId)?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Warehouse</Label>
              <Select value={newReturn.warehouseId} onValueChange={(v) => setNewReturn({ ...newReturn, warehouseId: v })}>
                <SelectTrigger data-testid="select-warehouse"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={newReturn.reason} onValueChange={(v) => setNewReturn({ ...newReturn, reason: v })}>
                <SelectTrigger data-testid="select-reason"><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Damaged in Transit">Damaged in Transit</SelectItem>
                  <SelectItem value="Near Expiry">Near Expiry</SelectItem>
                  <SelectItem value="Wrong Product Shipped">Wrong Product Shipped</SelectItem>
                  <SelectItem value="Quality Issue">Quality Issue</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-return">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inspectionDialogOpen} onOpenChange={setInspectionDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle>Inspection Checklist</DialogTitle>
            <DialogDescription>Return {selectedReturn?.returnNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {inspectionChecklist.map(item => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox id={item.id} checked={checkedItems[item.id] || false} onCheckedChange={(checked) => setCheckedItems({ ...checkedItems, [item.id]: !!checked })} />
                <Label htmlFor={item.id}>{item.label}</Label>
              </div>
            ))}
            <div>
              <Label>Inspection Notes</Label>
              <Textarea value={inspectionNotes} onChange={(e) => setInspectionNotes(e.target.value)} placeholder="Additional observations..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInspectionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInspection} disabled={updateMutation.isPending}>Complete Inspection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen} title="Approve Return" description="This will create a credit note request for the return value." requireReason confirmLabel="Approve" onConfirm={handleApprove} />
      <ConfirmDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen} title="Reject Return" description="Are you sure you want to reject this return request?" requireReason confirmLabel="Reject" destructive onConfirm={handleReject} />
      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} entityName="Returns" columns={exportColumns} totalRecords={filteredReturns.length} />
      <EntityDetailDrawer open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} title={`Return ${selectedReturn?.returnNumber}`} entityId={selectedReturn?.returnNumber || ''} status={selectedReturn?.status || ''}>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-muted-foreground">Order ID</Label><p className="font-medium">{orders.find(o => o.id === selectedReturn?.orderId)?.orderNumber}</p></div>
            <div><Label className="text-muted-foreground">Reason</Label><p className="font-medium">{selectedReturn?.reason}</p></div>
            <div><Label className="text-muted-foreground">Created</Label><p className="font-medium">{selectedReturn?.createdAt ? new Date(selectedReturn.createdAt).toLocaleDateString() : '—'}</p></div>
            <div><Label className="text-muted-foreground">Inventory Adjusted</Label><p className="font-medium">{selectedReturn?.inventoryAdjusted ? 'Yes' : 'No'}</p></div>
          </div>

          {/* Photos Section */}
          {selectedReturn?.photos && selectedReturn.photos.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Image className="h-4 w-4" />
                Return Photos ({selectedReturn.photos.length})
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {selectedReturn.photos.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square bg-muted rounded-lg overflow-hidden border">
                    <img src={url} alt={`Return photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => window.open(url, '_blank')}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-7 w-7" asChild>
                        <a href={url} download>
                          <Download className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inspector Remarks */}
          {selectedReturn?.inspectorRemarks && (
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Inspector Remarks
              </Label>
              <div className="bg-muted p-3 rounded-lg text-sm">{selectedReturn.inspectorRemarks}</div>
            </div>
          )}

          {/* Internal Notes */}
          {selectedReturn?.internalNotes && (
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Internal Notes
              </Label>
              <div className="bg-muted p-3 rounded-lg text-sm">{selectedReturn.internalNotes}</div>
            </div>
          )}
        </div>
      </EntityDetailDrawer>

      {/* Photo Upload Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Upload Return Photos
            </DialogTitle>
            <DialogDescription>
              Upload photo evidence of the returned items for inspection and documentation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Photos</Label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  disabled={isUploading}
                  onClick={() => document.getElementById('photo-file-input')?.click()}
                  data-testid="button-upload-return-photo"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  {isUploading ? 'Uploading...' : 'Add Photo'}
                </Button>
                <input
                  type="file"
                  id="photo-file-input"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(file);
                  }}
                />
              </div>
            </div>

            {/* Uploaded photos preview */}
            {photoData.photos.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded ({photoData.photos.length})</Label>
                <div className="grid grid-cols-3 gap-2">
                  {photoData.photos.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square bg-muted rounded-lg overflow-hidden border">
                      <img src={url} alt={`Return photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => window.open(url, '_blank')}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          className="h-7 w-7"
                          onClick={() => setPhotoData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing photos on record */}
            {selectedReturn?.photos && selectedReturn.photos.length > 0 && (
              <div className="space-y-2">
                <Label>Previously Uploaded ({selectedReturn.photos.length})</Label>
                <div className="grid grid-cols-4 gap-2">
                  {selectedReturn.photos.map((url, idx) => (
                    <div key={idx} className="relative aspect-square bg-muted rounded-lg overflow-hidden border">
                      <img src={url} alt={`Existing photo ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="photo-notes">Notes (Optional)</Label>
              <Textarea
                id="photo-notes"
                placeholder="Describe the condition of the returned items..."
                value={photoData.notes}
                onChange={(e) => setPhotoData(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="textarea-return-photo-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPhotoDialogOpen(false); setPhotoData({ photos: [], notes: '' }); }} data-testid="button-cancel-photo">Cancel</Button>
            <Button onClick={handleUploadPhoto} disabled={photoData.photos.length === 0 || updateMutation.isPending} data-testid="button-submit-photo">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
              Save Photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Inspector Remarks & Notes
            </DialogTitle>
            <DialogDescription>
              Add inspector remarks or internal notes for return {selectedReturn?.returnNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inspector-remarks">Inspector Remarks</Label>
              <Textarea
                id="inspector-remarks"
                placeholder="Enter inspector observations and findings..."
                value={internalNotesData.inspectorRemarks}
                onChange={(e) => setInternalNotesData(prev => ({ ...prev, inspectorRemarks: e.target.value }))}
                className="min-h-[100px]"
                data-testid="textarea-inspector-remarks"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internal-notes">Internal Notes</Label>
              <Textarea
                id="internal-notes"
                placeholder="Add any internal notes or comments..."
                value={internalNotesData.internalNotes}
                onChange={(e) => setInternalNotesData(prev => ({ ...prev, internalNotes: e.target.value }))}
                className="min-h-[100px]"
                data-testid="textarea-internal-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)} data-testid="button-cancel-notes">Cancel</Button>
            <Button onClick={handleSaveNotes} disabled={updateMutation.isPending} data-testid="button-save-notes">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pickup Schedule Dialog */}
      <Dialog open={pickupDialogOpen} onOpenChange={setPickupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule Return Pickup
            </DialogTitle>
            <DialogDescription>
              Schedule a pickup for the return items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pickup-date">Pickup Date</Label>
              <Input
                id="pickup-date"
                type="date"
                value={pickupData.scheduledDate}
                onChange={(e) => setPickupData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                data-testid="input-pickup-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup-time">Time Slot</Label>
              <Select value={pickupData.timeSlot} onValueChange={(value) => setPickupData(prev => ({ ...prev, timeSlot: value }))}>
                <SelectTrigger data-testid="select-pickup-time">
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (9 AM - 12 PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12 PM - 4 PM)</SelectItem>
                  <SelectItem value="evening">Evening (4 PM - 7 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup-notes">Special Instructions</Label>
              <Textarea
                id="pickup-notes"
                placeholder="Any special instructions for pickup..."
                value={pickupData.notes}
                onChange={(e) => setPickupData(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="textarea-pickup-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickupDialogOpen(false)} data-testid="button-cancel-pickup">Cancel</Button>
            <Button onClick={handleSchedulePickup} data-testid="button-schedule-pickup">
              <Clock className="h-4 w-4 mr-2" />
              Schedule Pickup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
