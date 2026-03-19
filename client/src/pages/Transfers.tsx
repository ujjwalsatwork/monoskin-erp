import { useState, useMemo } from 'react';
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
import { ObjectUploader } from '@/components/ObjectUploader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeftRight, Eye, Check, Truck, Plus, Search, Filter, AlertTriangle, Loader2, Paperclip, X, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Transfer, Warehouse } from '@shared/schema';

export default function Transfers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [discrepancyDialogOpen, setDiscrepancyDialogOpen] = useState(false);
  const [uploadProofDialogOpen, setUploadProofDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [newTransfer, setNewTransfer] = useState({ fromWarehouseId: '', toWarehouseId: '', notes: '' });
  const [proofFiles, setProofFiles] = useState<string[]>([]);

  const { data: transfers = [], isLoading } = useQuery<Transfer[]>({
    queryKey: ['/api/transfers'],
  });

  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const warehouseOptions = useMemo(() => {
    if (!warehouses || warehouses.length === 0) return [];
    return warehouses.map(wh => ({
      id: String(wh.id),
      name: wh.name,
    }));
  }, [warehouses]);

  const destinationOptions = useMemo(() => {
    if (!warehouses || warehouses.length === 0) return [];
    return warehouses
      .filter(w => String(w.id) !== newTransfer.fromWarehouseId)
      .map(wh => ({
        id: String(wh.id),
        name: wh.name,
      }));
  }, [warehouses, newTransfer.fromWarehouseId]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Transfer>) => {
      return apiRequest('POST', '/api/transfers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      toast({ title: 'Transfer Created', description: 'Transfer request has been created' });
      setCreateDialogOpen(false);
      setNewTransfer({ fromWarehouseId: '', toWarehouseId: '', notes: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Transfer> }) => {
      return apiRequest('PATCH', `/api/transfers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = transfer.transferNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transfer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportColumns = [
    { key: 'transferNumber', label: 'Transfer ID', defaultSelected: true },
    { key: 'fromWarehouseId', label: 'From', defaultSelected: true },
    { key: 'toWarehouseId', label: 'To', defaultSelected: true },
    { key: 'status', label: 'Status', defaultSelected: true },
    { key: 'createdAt', label: 'Created' },
    { key: 'completedAt', label: 'Completed' },
  ];

  const handleCreate = () => {
    if (newTransfer.fromWarehouseId === newTransfer.toWarehouseId) {
      toast({ title: 'Invalid Transfer', description: 'Source and destination must be different', variant: 'destructive' });
      return;
    }
    if (!newTransfer.fromWarehouseId || !newTransfer.toWarehouseId) {
      toast({ title: 'Validation Error', description: 'Please select both warehouses', variant: 'destructive' });
      return;
    }
    
    const transferNumber = `TRF${String(transfers.length + 1).padStart(5, '0')}`;
    createMutation.mutate({
      transferNumber,
      fromWarehouseId: parseInt(newTransfer.fromWarehouseId),
      toWarehouseId: parseInt(newTransfer.toWarehouseId),
      status: 'Pending Dispatch',
      notes: newTransfer.notes,
    });
  };

  const handleDispatch = (reason?: string) => {
    if (!selectedTransfer) return;
    updateMutation.mutate(
      { id: selectedTransfer.id, data: { status: 'In Transit', dispatchedAt: new Date() } },
      {
        onSuccess: () => {
          toast({ title: 'Transfer Dispatched', description: `${selectedTransfer.transferNumber} is now in transit` });
          setDispatchDialogOpen(false);
        },
      }
    );
  };

  const handleReceive = (reason?: string) => {
    if (!selectedTransfer) return;
    updateMutation.mutate(
      { id: selectedTransfer.id, data: { status: 'Completed', completedAt: new Date() } },
      {
        onSuccess: () => {
          toast({ title: 'Transfer Received', description: `${selectedTransfer.transferNumber} completed successfully` });
          setReceiveDialogOpen(false);
        },
      }
    );
  };

  const handleDiscrepancy = (reason?: string) => {
    if (!selectedTransfer) return;
    const discrepancyNote = `[DISCREPANCY REPORTED] ${reason || 'No reason provided'} — ${new Date().toLocaleDateString()}`;
    const existingNotes = selectedTransfer.notes ? `${selectedTransfer.notes}\n${discrepancyNote}` : discrepancyNote;
    updateMutation.mutate(
      { id: selectedTransfer.id, data: { status: 'Completed', notes: existingNotes, completedAt: new Date() } },
      {
        onSuccess: () => {
          toast({ title: 'Discrepancy Reported', description: 'Transfer completed with discrepancy note recorded' });
          setDiscrepancyDialogOpen(false);
        },
      }
    );
  };

  const handleUploadProof = () => {
    if (!selectedTransfer || proofFiles.length === 0) return;
    const existingProofs = selectedTransfer.proofOfDelivery || [];
    updateMutation.mutate(
      { id: selectedTransfer.id, data: { proofOfDelivery: [...existingProofs, ...proofFiles] } },
      {
        onSuccess: () => {
          toast({ title: 'Proof Uploaded', description: 'Proof of delivery uploaded successfully' });
          setUploadProofDialogOpen(false);
          setProofFiles([]);
          setSelectedTransfer(null);
        },
      }
    );
  };

  const columns: Column<Transfer>[] = [
    { key: 'transferNumber', header: 'Transfer ID', sortable: true, render: (row) => <span className="font-mono text-xs" data-testid={`text-transfer-id-${row.id}`}>{row.transferNumber}</span> },
    { key: 'fromWarehouseId', header: 'From', sortable: true, render: (row) => warehouses.find(w => w.id === row.fromWarehouseId)?.name || `WH${row.fromWarehouseId}` },
    { key: 'toWarehouseId', header: 'To', sortable: true, render: (row) => warehouses.find(w => w.id === row.toWarehouseId)?.name || `WH${row.toWarehouseId}` },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusPill status={row.status} /> },
    { key: 'proofOfDelivery', header: 'Proof', render: (row) => (
      <div className="flex items-center gap-1">
        {row.proofOfDelivery && row.proofOfDelivery.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Paperclip className="h-3 w-3" />
            {row.proofOfDelivery.length}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
    )},
    { key: 'createdAt', header: 'Created', sortable: true, render: (row) => new Date(row.createdAt).toLocaleDateString() },
    { key: 'completedAt', header: 'Completed', sortable: true, render: (row) => row.completedAt ? new Date(row.completedAt).toLocaleDateString() : '—' },
    { key: 'actions', header: '', render: (row) => (
      <RowActionsMenu actions={[
        { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => { setSelectedTransfer(row); setDetailDrawerOpen(true); } },
        { label: 'Upload Proof', icon: <Paperclip className="h-4 w-4" />, onClick: () => { setSelectedTransfer(row); setUploadProofDialogOpen(true); } },
        ...(row.status === 'Pending Dispatch' ? [{ label: 'Dispatch', icon: <Truck className="h-4 w-4" />, onClick: () => { setSelectedTransfer(row); setDispatchDialogOpen(true); } }] : []),
        ...(row.status === 'In Transit' ? [
          { label: 'Receive', icon: <Check className="h-4 w-4" />, onClick: () => { setSelectedTransfer(row); setReceiveDialogOpen(true); } },
          { label: 'Report Discrepancy', icon: <AlertTriangle className="h-4 w-4" />, onClick: () => { setSelectedTransfer(row); setDiscrepancyDialogOpen(true); }, destructive: true },
        ] : []),
      ]} />
    )},
  ];

  const inTransitCount = transfers.filter(t => t.status === 'In Transit').length;
  const pendingCount = transfers.filter(t => t.status === 'Pending Dispatch').length;
  const completedCount = transfers.filter(t => t.status === 'Completed').length;

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
        title="Transfers" 
        description="Inter-warehouse stock transfers"
        actions={<Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-transfer"><Plus className="h-4 w-4 mr-2" /> Create Transfer</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Transfers" value={transfers.length} icon={<ArrowLeftRight className="h-5 w-5" />} />
        <StatCard title="In Transit" value={inTransitCount} />
        <StatCard title="Pending Dispatch" value={pendingCount} />
        <StatCard title="Completed" value={completedCount} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search transfers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending Dispatch">Pending Dispatch</SelectItem>
            <SelectItem value="In Transit">In Transit</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">Export</Button>
      </div>

      <DataTable columns={columns} data={filteredTransfers} onRowClick={(item) => navigate(`/warehouses/transfers/${item.id}`)} emptyMessage="No transfers found" />

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Transfer</DialogTitle>
            <DialogDescription>Transfer stock between warehouses</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>From Warehouse *</Label>
              {warehousesLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading warehouses...</span>
                </div>
              ) : warehouseOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No warehouses available</p>
              ) : (
                <Select value={newTransfer.fromWarehouseId} onValueChange={(v) => setNewTransfer({ ...newTransfer, fromWarehouseId: v, toWarehouseId: '' })}>
                  <SelectTrigger data-testid="select-from-warehouse"><SelectValue placeholder="Select source warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouseOptions.map(wh => (
                      <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>To Warehouse *</Label>
              {warehousesLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading warehouses...</span>
                </div>
              ) : destinationOptions.length === 0 && newTransfer.fromWarehouseId ? (
                <p className="text-sm text-muted-foreground py-2">No other warehouses available</p>
              ) : !newTransfer.fromWarehouseId ? (
                <p className="text-sm text-muted-foreground py-2">Select source warehouse first</p>
              ) : (
                <Select value={newTransfer.toWarehouseId} onValueChange={(v) => setNewTransfer({ ...newTransfer, toWarehouseId: v })}>
                  <SelectTrigger data-testid="select-to-warehouse"><SelectValue placeholder="Select destination warehouse" /></SelectTrigger>
                  <SelectContent>
                    {destinationOptions.map(wh => (
                      <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={newTransfer.notes} onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })} placeholder="Optional notes..." data-testid="input-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-transfer">Cancel</Button>
            <Button onClick={handleCreate} disabled={!newTransfer.fromWarehouseId || !newTransfer.toWarehouseId || createMutation.isPending} data-testid="button-submit-transfer">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadProofDialogOpen} onOpenChange={setUploadProofDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Proof of Delivery</DialogTitle>
            <DialogDescription>
              Upload signed slips, photos, or documents as proof for transfer {selectedTransfer?.transferNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTransfer?.proofOfDelivery && selectedTransfer.proofOfDelivery.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Existing Proofs</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedTransfer.proofOfDelivery.map((url, i) => (
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
                      <button onClick={() => setProofFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 hover:text-red-500">
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
            <Button onClick={handleUploadProof} disabled={proofFiles.length === 0 || updateMutation.isPending} data-testid="button-submit-proof">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Upload Proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={dispatchDialogOpen} onOpenChange={setDispatchDialogOpen} title="Dispatch Transfer" description={`Dispatch ${selectedTransfer?.transferNumber}?`} requireReason confirmLabel="Dispatch" onConfirm={handleDispatch} />
      <ConfirmDialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen} title="Receive Transfer" description={`Confirm receipt of ${selectedTransfer?.transferNumber}?`} requireReason confirmLabel="Confirm Receipt" onConfirm={handleReceive} />
      <ConfirmDialog open={discrepancyDialogOpen} onOpenChange={setDiscrepancyDialogOpen} title="Report Discrepancy" description="Report a discrepancy in this transfer. Please provide details." requireReason reasonLabel="Discrepancy Details" confirmLabel="Report" destructive onConfirm={handleDiscrepancy} />
      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} entityName="Transfers" columns={exportColumns} totalRecords={filteredTransfers.length} />
      
      <EntityDetailDrawer open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} title={`Transfer ${selectedTransfer?.transferNumber}`} entityId={selectedTransfer?.transferNumber || ''} status={selectedTransfer?.status || ''}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-muted-foreground">From</Label><p className="font-medium">{warehouses.find(w => w.id === selectedTransfer?.fromWarehouseId)?.name}</p></div>
            <div><Label className="text-muted-foreground">To</Label><p className="font-medium">{warehouses.find(w => w.id === selectedTransfer?.toWarehouseId)?.name}</p></div>
            <div><Label className="text-muted-foreground">Created</Label><p className="font-medium">{selectedTransfer?.createdAt ? new Date(selectedTransfer.createdAt).toLocaleDateString() : '—'}</p></div>
            <div><Label className="text-muted-foreground">Notes</Label><p className="font-medium">{selectedTransfer?.notes || '—'}</p></div>
          </div>
          {selectedTransfer?.proofOfDelivery && selectedTransfer.proofOfDelivery.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Proof of Delivery</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedTransfer.proofOfDelivery.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded hover:bg-green-100 dark:hover:bg-green-900/50">
                    <FileText className="h-3 w-3" />
                    Proof {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => { setDetailDrawerOpen(false); setUploadProofDialogOpen(true); }} data-testid="button-drawer-upload-proof">
              <Paperclip className="h-4 w-4 mr-2" />
              Upload Proof
            </Button>
          </div>
        </div>
      </EntityDetailDrawer>
    </div>
  );
}
