import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill } from '@/components/shared/StatusPill';
import { RowActionsMenu } from '@/components/shared/RowActionsMenu';
import { ExportModal } from '@/components/shared/ExportModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Download, Eye, CreditCard, Search, Filter, Loader2, IndianRupee, CheckCircle2, Clock, AlertCircle, ArrowRightLeft, Receipt, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Payment, Invoice, Doctor } from '@shared/schema';

const COLLECTION_SOURCES = ['MR', 'NEFT', 'Cheque', 'UPI', 'Cash', 'Field Rep', 'Online'] as const;
const PAYMENT_METHODS = ['Cash', 'Cheque', 'NEFT', 'RTGS', 'UPI'] as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function parseGstImpact(raw: string | null | undefined): { baseAmount: string; gstAmount: string; rate: string } | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function AllocationBadge({ status, id }: { status: string | null | undefined; id?: number }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: typeof CheckCircle2 }> = {
    full: { label: 'Fully Allocated', variant: 'default', icon: CheckCircle2 },
    partial: { label: 'Partial', variant: 'secondary', icon: Clock },
    unallocated: { label: 'Unallocated', variant: 'outline', icon: AlertCircle },
  };
  const cfg = map[status || 'unallocated'] || map.unallocated;
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} data-testid={id ? `badge-allocation-${id}` : 'badge-allocation'}>
      <Icon className="h-3 w-3 mr-1" />{cfg.label}
    </Badge>
  );
}

export default function Receipts() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [allocationFilter, setAllocationFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [allocateData, setAllocateData] = useState({ invoiceId: '', amount: '' });
  const [newPayment, setNewPayment] = useState({
    invoiceId: '',
    amount: '',
    paymentMethod: 'NEFT',
    referenceNumber: '',
    collectionSource: 'NEFT' as string,
    notes: '',
  });

  const { data: payments = [], isLoading } = useQuery<Payment[]>({ queryKey: ['/api/payments'] });
  const { data: invoices = [] } = useQuery<Invoice[]>({ queryKey: ['/api/invoices'] });
  const { data: doctors = [] } = useQuery<Doctor[]>({ queryKey: ['/api/doctors'] });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Payment>) => apiRequest('POST', '/api/payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      const hasInvoice = !!newPayment.invoiceId;
      toast({ title: 'Payment Recorded', description: hasInvoice ? 'Receipt created and allocated to invoice' : 'Receipt recorded as unallocated' });
      setCreateDialogOpen(false);
      setNewPayment({ invoiceId: '', amount: '', paymentMethod: 'NEFT', referenceNumber: '', collectionSource: 'NEFT', notes: '' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to record payment', variant: 'destructive' }),
  });

  const allocateMutation = useMutation({
    mutationFn: async ({ paymentId, invoiceId, amount }: { paymentId: number; invoiceId: number; amount: string }) => {
      const res = await apiRequest('POST', `/api/payments/${paymentId}/allocate`, { invoiceId, amount });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: 'Allocation Complete', description: 'Payment allocated to invoice' });
      setAllocateDialogOpen(false);
      setAllocateData({ invoiceId: '', amount: '' });
      if (selectedPayment) {
        const updated = payments.find(p => p.id === selectedPayment.id);
        if (updated) setSelectedPayment(updated);
      }
    },
    onError: (error: any) => {
      const msg = error?.message || 'Failed to allocate payment';
      toast({ title: 'Allocation Failed', description: msg, variant: 'destructive' });
    },
  });

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = !searchQuery ||
        p.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.id).includes(searchQuery) ||
        invoices.find(i => i.id === p.invoiceId)?.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesAllocation = allocationFilter === 'all' || p.allocationStatus === allocationFilter;
      const matchesSource = sourceFilter === 'all' || p.collectionSource === sourceFilter;
      const matchesDateFrom = !dateRange.from || new Date(p.createdAt) >= new Date(dateRange.from);
      const matchesDateTo = !dateRange.to || new Date(p.createdAt) <= new Date(dateRange.to + 'T23:59:59');
      return matchesSearch && matchesStatus && matchesAllocation && matchesSource && matchesDateFrom && matchesDateTo;
    });
  }, [payments, searchQuery, statusFilter, allocationFilter, sourceFilter, dateRange, invoices]);

  const stats = useMemo(() => {
    const total = payments.reduce((s, p) => s + Number(p.amount), 0);
    const thisMonth = payments.filter(p => {
      const d = new Date(p.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthTotal = thisMonth.reduce((s, p) => s + Number(p.amount), 0);
    const unallocated = payments.filter(p => p.allocationStatus === 'unallocated' || !p.allocationStatus);
    const unallocatedTotal = unallocated.reduce((s, p) => s + Number(p.amount), 0);
    return { total, monthCount: thisMonth.length, monthTotal, unallocatedCount: unallocated.length, unallocatedTotal };
  }, [payments]);

  const handleCreate = () => {
    if (!newPayment.amount) {
      toast({ title: 'Validation Error', description: 'Amount is required', variant: 'destructive' });
      return;
    }
    const data: Partial<Payment> = {
      amount: String(parseFloat(newPayment.amount)),
      paymentMethod: newPayment.paymentMethod,
      referenceNumber: newPayment.referenceNumber,
      collectionSource: newPayment.collectionSource as any,
      notes: newPayment.notes || undefined,
      status: 'Verified' as any,
    };
    if (newPayment.invoiceId) {
      data.invoiceId = parseInt(newPayment.invoiceId);
    }
    createMutation.mutate(data);
  };

  const handleAllocate = () => {
    if (!selectedPayment || !allocateData.invoiceId || !allocateData.amount) {
      toast({ title: 'Validation Error', description: 'Invoice and amount are required', variant: 'destructive' });
      return;
    }
    allocateMutation.mutate({
      paymentId: selectedPayment.id,
      invoiceId: parseInt(allocateData.invoiceId),
      amount: allocateData.amount,
    });
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setAllocationFilter('all');
    setSourceFilter('all');
    setDateRange({ from: '', to: '' });
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'all' || allocationFilter !== 'all' || sourceFilter !== 'all' || dateRange.from || dateRange.to;

  const getInvoiceForPayment = (p: Payment) => invoices.find(i => i.id === p.invoiceId);
  const getDoctorForInvoice = (inv?: Invoice) => inv?.doctorId ? doctors.find(d => d.id === inv.doctorId) : null;

  const selectedInvoice = selectedPayment ? getInvoiceForPayment(selectedPayment) : null;
  const selectedDoctor = getDoctorForInvoice(selectedInvoice);
  const selectedGst = selectedPayment ? parseGstImpact(selectedPayment.gstImpact) : null;

  const selectedInvoiceForCreate = newPayment.invoiceId ? invoices.find(i => i.id === parseInt(newPayment.invoiceId)) : null;
  const createGstPreview = newPayment.amount ? (() => {
    const amt = parseFloat(newPayment.amount);
    if (isNaN(amt) || amt <= 0) return null;
    const base = amt / 1.18;
    return { base: base.toFixed(2), gst: (amt - base).toFixed(2) };
  })() : null;

  const columns: Column<Payment>[] = [
    {
      key: 'id', header: 'Receipt ID', sortable: true,
      render: (row) => <span className="font-mono text-xs" data-testid={`text-receipt-id-${row.id}`}>RCP{String(row.id).padStart(5, '0')}</span>,
    },
    {
      key: 'invoiceId', header: 'Invoice', sortable: true,
      render: (row) => {
        const inv = getInvoiceForPayment(row);
        const doc = getDoctorForInvoice(inv);
        return (
          <div data-testid={`invoice-cell-${row.id}`}>
            <p className="font-medium" data-testid={`text-invoice-number-${row.id}`}>{inv?.invoiceNumber || `INV${String(row.invoiceId).padStart(5, '0')}`}</p>
            <p className="text-xs text-muted-foreground" data-testid={`text-doctor-${row.id}`}>{doc?.name || 'N/A'}</p>
          </div>
        );
      },
    },
    {
      key: 'amount', header: 'Amount', sortable: true,
      render: (row) => <span className="font-semibold text-green-600 dark:text-green-400" data-testid={`text-amount-${row.id}`}>{formatCurrency(Number(row.amount))}</span>,
    },
    {
      key: 'allocationStatus', header: 'Allocation',
      render: (row) => <AllocationBadge status={row.allocationStatus} id={row.id} />,
    },
    {
      key: 'collectionSource', header: 'Source', sortable: true,
      render: (row) => (
        <Badge variant="outline" className="text-xs" data-testid={`badge-source-${row.id}`}>
          {row.collectionSource || row.paymentMethod || 'N/A'}
        </Badge>
      ),
    },
    {
      key: 'referenceNumber', header: 'Reference',
      render: (row) => <span className="font-mono text-xs" data-testid={`text-reference-${row.id}`}>{row.referenceNumber || '—'}</span>,
    },
    {
      key: 'status', header: 'Status', sortable: true,
      render: (row) => <span data-testid={`status-${row.id}`}><StatusPill status={row.status || 'Verified'} /></span>,
    },
    {
      key: 'createdAt', header: 'Date', sortable: true,
      render: (row) => <span data-testid={`text-date-${row.id}`}>{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions', header: '',
      render: (row) => (
        <RowActionsMenu
          testId={`button-actions-${row.id}`}
          actions={[
            { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => { setSelectedPayment(row); setDetailDrawerOpen(true); }, testId: `menu-item-view-${row.id}` },
            ...(row.allocationStatus !== 'full' ? [{
              label: 'Allocate to Invoice', icon: <ArrowRightLeft className="h-4 w-4" />,
              onClick: () => { setSelectedPayment(row); setAllocateData({ invoiceId: '', amount: String(Number(row.amount) - Number(row.allocatedAmount || 0)) }); setAllocateDialogOpen(true); },
              testId: `menu-item-allocate-${row.id}`,
            }] : []),
          ]}
        />
      ),
    },
  ];

  const exportColumns = [
    { key: 'id', label: 'Receipt ID', defaultSelected: true },
    { key: 'invoiceId', label: 'Invoice ID', defaultSelected: true },
    { key: 'amount', label: 'Amount', defaultSelected: true },
    { key: 'allocatedAmount', label: 'Allocated Amount', defaultSelected: true },
    { key: 'allocationStatus', label: 'Allocation Status', defaultSelected: true },
    { key: 'paymentMethod', label: 'Payment Method', defaultSelected: true },
    { key: 'collectionSource', label: 'Collection Source', defaultSelected: true },
    { key: 'referenceNumber', label: 'Reference' },
    { key: 'status', label: 'Status', defaultSelected: true },
    { key: 'gstImpact', label: 'GST Impact' },
    { key: 'createdAt', label: 'Date', defaultSelected: true },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-receipts">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        description="Record, track and allocate payments received"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-receipt">
              <Plus className="h-4 w-4 mr-2" /> Record Payment
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Receipts" value={payments.length} icon={<Receipt className="h-5 w-5" />} />
        <StatCard title="Total Received" value={formatCurrency(stats.total)} icon={<IndianRupee className="h-5 w-5" />} />
        <StatCard title="This Month" value={`${stats.monthCount} (${formatCurrency(stats.monthTotal)})`} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard title="Unallocated" value={`${stats.unallocatedCount} (${formatCurrency(stats.unallocatedTotal)})`} icon={<AlertCircle className="h-5 w-5" />} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by receipt ID, reference, invoice..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search" />
          </div>
          <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} data-testid="button-toggle-filters">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && <Badge variant="secondary" className="ml-2 text-xs">{[statusFilter !== 'all', allocationFilter !== 'all', sourceFilter !== 'all', dateRange.from, dateRange.to].filter(Boolean).length}</Badge>}
          </Button>
        </div>

        {showAdvancedFilters && (
          <Card data-testid="advanced-filters-panel">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Payment Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Verified">Verified</SelectItem>
                      <SelectItem value="Allocated">Allocated</SelectItem>
                      <SelectItem value="Refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Allocation Status</Label>
                  <Select value={allocationFilter} onValueChange={setAllocationFilter}>
                    <SelectTrigger data-testid="select-allocation-filter"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="full">Fully Allocated</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="unallocated">Unallocated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Collection Source</Label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger data-testid="select-source-filter"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {COLLECTION_SOURCES.map(src => <SelectItem key={src} value={src}>{src}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Date From</Label>
                  <Input type="date" value={dateRange.from} onChange={(e) => setDateRange(r => ({ ...r, from: e.target.value }))} data-testid="input-date-from" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Date To</Label>
                  <Input type="date" value={dateRange.to} onChange={(e) => setDateRange(r => ({ ...r, to: e.target.value }))} data-testid="input-date-to" />
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                    <X className="h-3 w-3 mr-1" /> Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredPayments}
        onRowClick={(row) => { setSelectedPayment(row); setDetailDrawerOpen(true); }}
        emptyMessage="No receipts found"
      />

      {/* Create Payment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Enter payment details to create a new receipt</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Invoice <span className="text-xs text-muted-foreground">(optional - leave blank for unallocated receipt)</span></Label>
              <Select value={newPayment.invoiceId} onValueChange={(v) => setNewPayment(p => ({ ...p, invoiceId: v }))}>
                <SelectTrigger data-testid="select-invoice"><SelectValue placeholder="Select invoice (optional)" /></SelectTrigger>
                <SelectContent>
                  {invoices.filter(i => i.status !== 'Paid').map(inv => {
                    const doc = getDoctorForInvoice(inv);
                    return (
                      <SelectItem key={inv.id} value={String(inv.id)}>
                        {inv.invoiceNumber} - {formatCurrency(Number(inv.amount))} {doc ? `(${doc.name})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedInvoiceForCreate && (
                <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1" data-testid="invoice-preview">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Invoice Total:</span>
                    <span className="font-medium">{formatCurrency(Number(selectedInvoiceForCreate.amount))}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Already Paid:</span>
                    <span className="font-medium">{formatCurrency(Number(selectedInvoiceForCreate.paidAmount || 0))}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Balance Due:</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(Number(selectedInvoiceForCreate.amount) - Number(selectedInvoiceForCreate.paidAmount || 0))}</span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label>Amount *</Label>
              <Input type="number" value={newPayment.amount} onChange={(e) => setNewPayment(p => ({ ...p, amount: e.target.value }))} placeholder="Enter amount" data-testid="input-amount" />
              {createGstPreview && (
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-gst-preview">
                  Base: {formatCurrency(Number(createGstPreview.base))} + GST (18%): {formatCurrency(Number(createGstPreview.gst))}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Method</Label>
                <Select value={newPayment.paymentMethod} onValueChange={(v) => setNewPayment(p => ({ ...p, paymentMethod: v }))}>
                  <SelectTrigger data-testid="select-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Collection Source</Label>
                <Select value={newPayment.collectionSource} onValueChange={(v) => setNewPayment(p => ({ ...p, collectionSource: v }))}>
                  <SelectTrigger data-testid="select-source"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLLECTION_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Reference Number</Label>
              <Input value={newPayment.referenceNumber} onChange={(e) => setNewPayment(p => ({ ...p, referenceNumber: e.target.value }))} placeholder="UTR / Cheque number / Transaction ID" data-testid="input-reference" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={newPayment.notes} onChange={(e) => setNewPayment(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" data-testid="input-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-create">Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-payment">
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocate to Invoice Dialog */}
      <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Payment to Invoice</DialogTitle>
            <DialogDescription>
              Allocate receipt RCP{String(selectedPayment?.id).padStart(5, '0')} ({formatCurrency(Number(selectedPayment?.amount || 0))}) to an invoice
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPayment && (
              <div className="p-3 bg-muted rounded text-sm space-y-1" data-testid="allocate-payment-info">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">{formatCurrency(Number(selectedPayment.amount))}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Already Allocated:</span>
                  <span className="font-medium">{formatCurrency(Number(selectedPayment.allocatedAmount || 0))}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(Number(selectedPayment.amount) - Number(selectedPayment.allocatedAmount || 0))}</span>
                </div>
              </div>
            )}
            <div>
              <Label>Invoice</Label>
              <Select value={allocateData.invoiceId} onValueChange={(v) => setAllocateData(d => ({ ...d, invoiceId: v }))}>
                <SelectTrigger data-testid="select-allocate-invoice"><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  {invoices.filter(i => i.status !== 'Paid').map(inv => (
                    <SelectItem key={inv.id} value={String(inv.id)}>
                      {inv.invoiceNumber} - Due: {formatCurrency(Number(inv.amount) - Number(inv.paidAmount || 0))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount to Allocate</Label>
              <Input type="number" value={allocateData.amount} onChange={(e) => setAllocateData(d => ({ ...d, amount: e.target.value }))} data-testid="input-allocate-amount" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAllocate} disabled={allocateMutation.isPending} data-testid="button-confirm-allocate">
              {allocateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Allocate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} entityName="Receipts" columns={exportColumns} totalRecords={filteredPayments.length} />

      {/* Detail Drawer */}
      <Sheet open={detailDrawerOpen} onOpenChange={setDetailDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2" data-testid="text-drawer-title">
              <Receipt className="h-5 w-5" />
              Receipt RCP{String(selectedPayment?.id).padStart(5, '0')}
            </SheetTitle>
          </SheetHeader>

          {selectedPayment && (
            <Tabs defaultValue="details" className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1" data-testid="tab-details">Details</TabsTrigger>
                <TabsTrigger value="reconciliation" className="flex-1" data-testid="tab-reconciliation">Reconciliation</TabsTrigger>
                <TabsTrigger value="gst" className="flex-1" data-testid="tab-gst">GST Impact</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-receipt-amount">{formatCurrency(Number(selectedPayment.amount))}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(selectedPayment.createdAt)}</p>
                  </div>
                  <AllocationBadge status={selectedPayment.allocationStatus} />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Payment Status</Label>
                    <div className="mt-1" data-testid="text-payment-status"><StatusPill status={selectedPayment.status || 'Verified'} /></div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Payment Method</Label>
                    <p className="font-medium mt-1" data-testid="text-payment-method">{selectedPayment.paymentMethod || '—'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Collection Source</Label>
                    <div className="mt-1"><Badge variant="outline" data-testid="text-collection-source">{selectedPayment.collectionSource || 'N/A'}</Badge></div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Reference</Label>
                    <p className="font-mono text-sm mt-1" data-testid="text-reference">{selectedPayment.referenceNumber || '—'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Allocated Amount</Label>
                    <p className="font-medium mt-1" data-testid="text-allocated-amount">{formatCurrency(Number(selectedPayment.allocatedAmount || 0))}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Remaining</Label>
                    <p className="font-medium mt-1 text-orange-600 dark:text-orange-400" data-testid="text-remaining">{formatCurrency(Number(selectedPayment.amount) - Number(selectedPayment.allocatedAmount || 0))}</p>
                  </div>
                </div>

                {selectedPayment.notes && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <p className="text-sm mt-1 bg-muted p-3 rounded" data-testid="text-receipt-notes">{selectedPayment.notes}</p>
                    </div>
                  </>
                )}

                {selectedPayment.allocationStatus !== 'full' && (
                  <>
                    <Separator />
                    <Button className="w-full" onClick={() => {
                      setAllocateData({ invoiceId: '', amount: String(Number(selectedPayment.amount) - Number(selectedPayment.allocatedAmount || 0)) });
                      setAllocateDialogOpen(true);
                    }} data-testid="button-allocate-from-drawer">
                      <ArrowRightLeft className="h-4 w-4 mr-2" /> Allocate to Invoice
                    </Button>
                  </>
                )}
              </TabsContent>

              <TabsContent value="reconciliation" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Linked Invoice</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedInvoice ? (
                      <div className="space-y-3">
                        <div className="flex justify-between gap-2 items-center">
                          <span className="font-mono text-sm" data-testid="text-linked-invoice-number">{selectedInvoice.invoiceNumber}</span>
                          <StatusPill status={selectedInvoice.status || 'Pending'} />
                        </div>
                        <Separator />
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Invoice Amount</span>
                            <span className="font-medium" data-testid="text-invoice-total">{formatCurrency(Number(selectedInvoice.amount))}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Total Paid</span>
                            <span className="font-medium text-green-600 dark:text-green-400" data-testid="text-invoice-paid">{formatCurrency(Number(selectedInvoice.paidAmount || 0))}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Balance Due</span>
                            <span className="font-semibold text-orange-600 dark:text-orange-400" data-testid="text-invoice-balance">
                              {formatCurrency(Number(selectedInvoice.amount) - Number(selectedInvoice.paidAmount || 0))}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Invoice Date</span>
                            <span data-testid="text-invoice-date">{selectedInvoice.createdAt ? formatDate(selectedInvoice.createdAt) : '—'}</span>
                          </div>
                          {selectedInvoice.dueDate && (
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">Due Date</span>
                              <span data-testid="text-invoice-due-date">{formatDate(selectedInvoice.dueDate)}</span>
                            </div>
                          )}
                        </div>
                        {selectedDoctor && (
                          <>
                            <Separator />
                            <div className="text-sm">
                              <span className="text-muted-foreground">Doctor: </span>
                              <span className="font-medium" data-testid="text-reconcile-doctor">{selectedDoctor.name}</span>
                              {selectedDoctor.specialization && <span className="text-muted-foreground"> ({selectedDoctor.specialization})</span>}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground" data-testid="text-no-invoice">No invoice linked</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Allocation Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Receipt Amount</span>
                        <span className="font-medium">{formatCurrency(Number(selectedPayment.amount))}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Allocated</span>
                        <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(Number(selectedPayment.allocatedAmount || 0))}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Unallocated</span>
                        <span className="font-medium text-orange-600 dark:text-orange-400">{formatCurrency(Number(selectedPayment.amount) - Number(selectedPayment.allocatedAmount || 0))}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between gap-2 items-center">
                        <span className="text-muted-foreground">Status</span>
                        <AllocationBadge status={selectedPayment.allocationStatus} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="gst" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><IndianRupee className="h-4 w-4" /> GST Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedGst ? (
                      <div className="space-y-3">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Total Amount</span>
                            <span className="font-bold" data-testid="text-gst-total">{formatCurrency(Number(selectedPayment.amount))}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Base Amount (excl. GST)</span>
                            <span className="font-medium" data-testid="text-gst-base">{formatCurrency(Number(selectedGst.baseAmount))}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">GST ({selectedGst.rate})</span>
                            <span className="font-medium" data-testid="text-gst-amount">{formatCurrency(Number(selectedGst.gstAmount))}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">CGST (9%)</span>
                            <span data-testid="text-cgst">{formatCurrency(Number(selectedGst.gstAmount) / 2)}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">SGST (9%)</span>
                            <span data-testid="text-sgst">{formatCurrency(Number(selectedGst.gstAmount) / 2)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm space-y-3">
                        <p className="text-muted-foreground" data-testid="text-no-gst">GST impact not computed for this receipt.</p>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Estimated at 18% GST:</p>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Base Amount</span>
                            <span className="font-medium">{formatCurrency(Number(selectedPayment.amount) / 1.18)}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">GST (18%)</span>
                            <span className="font-medium">{formatCurrency(Number(selectedPayment.amount) - Number(selectedPayment.amount) / 1.18)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
