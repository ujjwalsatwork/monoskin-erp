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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PackagePlus, Eye, Check, Plus, Search, Filter, Trash2, Loader2, Paperclip, X, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { GRN, Warehouse, Product } from '@shared/schema';

interface GRNItem {
  id: number;
  grnId: number;
  productId: number;
  batch: string;
  expiry: string;
  expectedQty: number;
  receivedQty: number;
}

interface GRNLineItem {
  productId: string;
  batch: string;
  expiry: string;
  quantity: number;
}

export default function GRNPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [skuFilter, setSkuFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);
  const [newGRN, setNewGRN] = useState({ warehouseId: '', supplier: 'Monoskin Manufacturing' });
  const [lineItems, setLineItems] = useState<GRNLineItem[]>([{ productId: '', batch: '', expiry: '', quantity: 0 }]);
  const [attachments, setAttachments] = useState<string[]>([]);

  const { data: grns = [], isLoading } = useQuery<GRN[]>({
    queryKey: ['/api/grns'],
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: grnItems = [] } = useQuery<GRNItem[]>({
    queryKey: ['/api/grn-items'],
  });

  // Memoized warehouse options for dropdown
  const warehouseOptions = useMemo(() => 
    warehouses.map(wh => ({ id: String(wh.id), name: wh.name })),
    [warehouses]
  );

  // Memoized product options for dropdown  
  const productOptions = useMemo(() => 
    products.map(p => ({ id: String(p.id), name: p.name, sku: p.sku })),
    [products]
  );

  // Get unique suppliers from GRNs for filter
  const uniqueSuppliers = useMemo(() => {
    const suppliers = [...new Set(grns.map(g => g.supplier).filter(Boolean))];
    return suppliers.sort();
  }, [grns]);

  // Get unique products from GRN items for SKU filter
  const productsInGRNs = useMemo(() => {
    const productIds = [...new Set(grnItems.map(item => item.productId))];
    return products.filter(p => productIds.includes(p.id));
  }, [grnItems, products]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<GRN>) => {
      return apiRequest('POST', '/api/grns', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/grn-items'] });
      toast({ title: 'GRN Created', description: 'Goods Receipt Note has been created' });
      setCreateDialogOpen(false);
      resetCreateForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create GRN', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<GRN> }) => {
      return apiRequest('PATCH', `/api/grns/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
    },
  });

  const filteredGRNs = useMemo(() => {
    return grns.filter(grn => {
      const matchesSearch = grn.grnNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        grn.supplier?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || grn.status === statusFilter;
      const matchesSupplier = supplierFilter === 'all' || grn.supplier === supplierFilter;
      
      // SKU filter - check if any line item in this GRN has the selected product
      let matchesSKU = true;
      if (skuFilter !== 'all') {
        const grnProductIds = grnItems.filter(item => item.grnId === grn.id).map(item => item.productId);
        matchesSKU = grnProductIds.includes(parseInt(skuFilter));
      }
      
      return matchesSearch && matchesStatus && matchesSupplier && matchesSKU;
    });
  }, [grns, searchQuery, statusFilter, supplierFilter, skuFilter, grnItems]);

  const exportColumns = [
    { key: 'grnNumber', label: 'GRN ID', defaultSelected: true },
    { key: 'warehouseId', label: 'Warehouse', defaultSelected: true },
    { key: 'supplier', label: 'Supplier', defaultSelected: true },
    { key: 'status', label: 'Status', defaultSelected: true },
    { key: 'receivedAt', label: 'Received At' },
  ];

  const addLineItem = () => {
    setLineItems([...lineItems, { productId: '', batch: '', expiry: '', quantity: 0 }]);
  };

  const updateLineItem = (index: number, field: keyof GRNLineItem, value: string | number) => {
    setLineItems(lineItems.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    const validItems = lineItems.filter(item => item.productId && item.quantity > 0);
    if (!newGRN.warehouseId || validItems.length === 0) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    
    const grnNumber = `GRN${String(grns.length + 1).padStart(5, '0')}`;
    createMutation.mutate({
      grnNumber,
      warehouseId: parseInt(newGRN.warehouseId),
      supplier: newGRN.supplier,
      status: 'Pending Verification',
      attachments: attachments.length > 0 ? attachments : undefined,
    } as Partial<GRN>);
  };

  const resetCreateForm = () => {
    setNewGRN({ warehouseId: '', supplier: 'Monoskin Manufacturing' });
    setLineItems([{ productId: '', batch: '', expiry: '', quantity: 0 }]);
    setAttachments([]);
  };

  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFiles = result.successful.map((file: any) => {
        const urlParts = file.uploadURL?.split('?')[0] || '';
        return urlParts;
      }).filter(Boolean);
      setAttachments(prev => [...prev, ...uploadedFiles]);
      toast({ title: 'File Uploaded', description: `${result.successful.length} file(s) uploaded successfully` });
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleVerify = (reason?: string) => {
    if (!selectedGRN) return;
    updateMutation.mutate(
      { id: selectedGRN.id, data: { status: 'Completed', verifiedAt: new Date() } },
      {
        onSuccess: () => {
          toast({ title: 'GRN Verified', description: `${selectedGRN.grnNumber} has been verified and inventory updated` });
          setVerifyDialogOpen(false);
        },
      }
    );
  };

  const columns: Column<GRN>[] = [
    { key: 'grnNumber', header: 'GRN ID', sortable: true, render: (row) => <span className="font-mono text-xs" data-testid={`text-grn-id-${row.id}`}>{row.grnNumber}</span> },
    { key: 'warehouseId', header: 'Warehouse', sortable: true, render: (row) => {
      const wh = warehouses.find(w => w.id === row.warehouseId);
      return wh?.name || `WH${row.warehouseId}`;
    }},
    { key: 'supplier', header: 'Supplier', sortable: true },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusPill status={row.status} /> },
    { key: 'receivedAt', header: 'Received', sortable: true, render: (row) => row.receivedAt ? new Date(row.receivedAt).toLocaleDateString() : '—' },
    { key: 'actions', header: '', render: (row) => (
      <RowActionsMenu actions={[
        { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => { setSelectedGRN(row); setDetailDrawerOpen(true); } },
        ...(row.status === 'Pending Verification' ? [{ label: 'Verify', icon: <Check className="h-4 w-4" />, onClick: () => { setSelectedGRN(row); setVerifyDialogOpen(true); } }] : []),
      ]} />
    )},
  ];

  const pendingCount = grns.filter(g => g.status === 'Pending Verification').length;
  const completedCount = grns.filter(g => g.status === 'Completed').length;

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
        title="Inward (GRN)" 
        description="Goods Receipt Notes - Manage inbound inventory"
        actions={<Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-grn"><Plus className="h-4 w-4 mr-2" /> Create GRN</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total GRNs" value={grns.length} icon={<PackagePlus className="h-5 w-5" />} />
        <StatCard title="Pending Verification" value={pendingCount} />
        <StatCard title="Completed" value={completedCount} />
        <StatCard title="This Month" value={grns.filter(g => new Date(g.createdAt).getMonth() === new Date().getMonth()).length} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search GRNs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending Verification">Pending Verification</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">Export</Button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-supplier-filter">
              <SelectValue placeholder="Filter by Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {uniqueSuppliers.map(supplier => (
                <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={skuFilter} onValueChange={setSkuFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-sku-filter">
              <SelectValue placeholder="Filter by SKU" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All SKUs</SelectItem>
              {productsInGRNs.map(product => (
                <SelectItem key={product.id} value={String(product.id)}>
                  {product.sku} - {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {(supplierFilter !== 'all' || skuFilter !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setSupplierFilter('all'); setSkuFilter('all'); }}
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-1" /> Clear Filters
            </Button>
          )}
        </div>
      </div>

      <DataTable columns={columns} data={filteredGRNs} onRowClick={(row) => navigate(`/warehouses/grn/${row.id}`)} emptyMessage="No GRNs found" />

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create GRN</DialogTitle>
            <DialogDescription>Record incoming goods receipt</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Warehouse <span className="text-destructive">*</span></Label>
                <Select value={newGRN.warehouseId} onValueChange={(v) => setNewGRN({ ...newGRN, warehouseId: v })}>
                  <SelectTrigger data-testid="select-warehouse"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouseOptions.length > 0 ? (
                      warehouseOptions.map(wh => <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>)
                    ) : (
                      <SelectItem value="_none" disabled>Loading warehouses...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Supplier <span className="text-destructive">*</span></Label>
                <Input value={newGRN.supplier} onChange={(e) => setNewGRN({ ...newGRN, supplier: e.target.value })} data-testid="input-supplier" placeholder="e.g., Monoskin Manufacturing" />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Line Items <span className="text-destructive">*</span></Label>
                <Button variant="outline" size="sm" onClick={addLineItem} data-testid="button-add-item"><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select value={item.productId} onValueChange={(v) => updateLineItem(idx, 'productId', v)}>
                          <SelectTrigger data-testid={`select-product-${idx}`}><SelectValue placeholder="Select product" /></SelectTrigger>
                          <SelectContent>
                            {productOptions.length > 0 ? (
                              productOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} - {p.name}</SelectItem>)
                            ) : (
                              <SelectItem value="_none" disabled>Loading products...</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input value={item.batch} onChange={(e) => updateLineItem(idx, 'batch', e.target.value)} placeholder="B2024XXX" data-testid={`input-batch-${idx}`} /></TableCell>
                      <TableCell><Input type="date" value={item.expiry} onChange={(e) => updateLineItem(idx, 'expiry', e.target.value)} data-testid={`input-expiry-${idx}`} /></TableCell>
                      <TableCell><Input type="number" value={item.quantity} onChange={(e) => updateLineItem(idx, 'quantity', Number(e.target.value))} data-testid={`input-quantity-${idx}`} min={1} /></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(idx)} disabled={lineItems.length === 1} data-testid={`button-remove-item-${idx}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <Label>Attachments</Label>
                  <p className="text-xs text-muted-foreground">Upload scanned invoices, QC slips, or other documents</p>
                </div>
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
                      headers: { "Content-Type": file.type },
                    };
                  }}
                  onComplete={handleUploadComplete}
                  buttonClassName="text-sm"
                >
                  <Paperclip className="h-4 w-4 mr-1" /> Attach Files
                </ObjectUploader>
              </div>
              
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2 text-sm truncate flex-1">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{file.split('/').pop() || `Document ${index + 1}`}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeAttachment(index)} className="shrink-0" data-testid={`button-remove-attachment-${index}`}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {attachments.length === 0 && (
                <div className="text-center p-4 border-2 border-dashed rounded-md text-muted-foreground text-sm">
                  No attachments added yet
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-grn">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create GRN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen} title="Verify GRN" description={`Verify ${selectedGRN?.grnNumber}? This will update inventory levels.`} requireReason confirmLabel="Verify & Update Inventory" onConfirm={handleVerify} />
      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} entityName="GRNs" columns={exportColumns} totalRecords={filteredGRNs.length} />
      
      <EntityDetailDrawer open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} title={`GRN ${selectedGRN?.grnNumber}`} entityId={selectedGRN?.grnNumber || ''} status={selectedGRN?.status || ''}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-muted-foreground">Warehouse</Label><p className="font-medium">{warehouses.find(w => w.id === selectedGRN?.warehouseId)?.name}</p></div>
            <div><Label className="text-muted-foreground">Supplier</Label><p className="font-medium">{selectedGRN?.supplier}</p></div>
            <div><Label className="text-muted-foreground">Received</Label><p className="font-medium">{selectedGRN?.receivedAt ? new Date(selectedGRN.receivedAt).toLocaleDateString() : '—'}</p></div>
          </div>
        </div>
      </EntityDetailDrawer>
    </div>
  );
}
