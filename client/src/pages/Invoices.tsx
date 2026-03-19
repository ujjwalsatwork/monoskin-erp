import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { RowActionsMenu } from '@/components/shared/RowActionsMenu';
import { ExportModal } from '@/components/shared/ExportModal';
import { EntityDetailDrawer } from '@/components/shared/EntityDetailDrawer';
import { EntityTimeline, TimelineEvent } from '@/components/shared/EntityTimeline';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  FileText, Eye, Send, Download, Search, Plus, CreditCard,
  MessageSquare, AlertTriangle, Percent, Copy, Mail, Bell,
  Package, Truck, RotateCcw, ExternalLink, Loader2, CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Invoice, Doctor, CreditNote, Order, Shipment, Return, Product, MR, Territory, OrderItem } from '@shared/schema';

export default function Invoices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [territoryFilter, setTerritoryFilter] = useState('all');
  const [salesRepFilter, setSalesRepFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [bulkReminderDialogOpen, setBulkReminderDialogOpen] = useState(false);
  const [reminderMethod, setReminderMethod] = useState<'email' | 'whatsapp'>('email');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({ utr: '', amount: 0, mode: 'Bank Transfer' });
  const [emailTo, setEmailTo] = useState('');
  const [selectedOverdue, setSelectedOverdue] = useState<number[]>([]);
  const [newInvoice, setNewInvoice] = useState({ orderId: '', doctorId: '', amount: '', dueDate: '' });
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: creditNotes = [] } = useQuery<CreditNote[]>({
    queryKey: ['/api/credit-notes'],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: shipments = [] } = useQuery<Shipment[]>({
    queryKey: ['/api/shipments'],
  });

  const { data: returns = [] } = useQuery<Return[]>({
    queryKey: ['/api/returns'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: mrs = [] } = useQuery<MR[]>({
    queryKey: ['/api/mrs'],
  });

  const { data: territories = [] } = useQuery<Territory[]>({
    queryKey: ['/api/territories'],
  });

  const { data: orderItems = [] } = useQuery<OrderItem[]>({
    queryKey: ['/api/order-items'],
  });

  const hasCreditRestriction = (invoiceId: number) => {
    return creditNotes.some(cn => cn.invoiceId === invoiceId && cn.status === 'approved');
  };

  const getDiscountBreakup = (invoice: Invoice) => {
    const subtotal = Number(invoice.amount) * 1.1;
    const discount = subtotal - Number(invoice.amount);
    const discountPercent = ((discount / subtotal) * 100).toFixed(1);
    return { subtotal, discount, discountPercent };
  };

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Invoice> }) => {
      const res = await apiRequest('PATCH', `/api/invoices/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: Partial<Invoice>) => {
      const res = await apiRequest('POST', '/api/invoices', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { invoiceId: number; amount: number; paymentMethod: string; referenceNumber: string }) => {
      const res = await apiRequest('POST', '/api/payments', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
    },
  });

  const uniqueTerritories = useMemo(() => {
    const terrs = new Set<string>();
    mrs.forEach(m => { if (m.territory) terrs.add(m.territory); });
    territories.forEach(t => { if (t.name) terrs.add(t.name); });
    return Array.from(terrs).sort();
  }, [mrs, territories]);

  const uniqueSalesReps = useMemo(() => {
    return mrs.filter(m => m.status === 'Active').map(m => ({ id: m.id, name: m.name }));
  }, [mrs]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv: Invoice) => {
      const doctor = doctors.find(d => d.id === inv.doctorId);
      const order = orders.find(o => o.id === inv.orderId);
      const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doctor?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doctor?.clinic || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const assignedMR = mrs.find(m => m.id === order?.mrId);
      const matchesTerritory = territoryFilter === 'all' || (assignedMR?.territory === territoryFilter) || (doctor?.city === territoryFilter);
      const matchesSalesRep = salesRepFilter === 'all' || (order?.mrId === Number(salesRepFilter));
      const matchesProduct = productFilter === 'all' || (
        inv.orderId && orderItems.some(oi => oi.orderId === inv.orderId && oi.productId === Number(productFilter))
      );
      return matchesSearch && matchesStatus && matchesTerritory && matchesSalesRep && matchesProduct;
    });
  }, [invoices, doctors, orders, mrs, orderItems, searchQuery, statusFilter, territoryFilter, salesRepFilter, productFilter]);

  const overdueInvoices = useMemo(() => {
    return invoices.filter(i => i.status === 'Overdue');
  }, [invoices]);

  const exportColumns = [
    { key: 'invoiceNumber', label: 'Invoice ID', defaultSelected: true },
    { key: 'orderId', label: 'Order ID', defaultSelected: true },
    { key: 'doctorId', label: 'Customer', defaultSelected: true },
    { key: 'amount', label: 'Amount', defaultSelected: true },
    { key: 'status', label: 'Status', defaultSelected: true },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'paidAt', label: 'Paid At' },
  ];

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    try {
      await createPaymentMutation.mutateAsync({
        invoiceId: selectedInvoice.id,
        amount: paymentDetails.amount,
        paymentMethod: paymentDetails.mode,
        referenceNumber: paymentDetails.utr,
      });

      toast({ title: 'Payment Recorded', description: `₹${paymentDetails.amount.toLocaleString()} received via ${paymentDetails.mode}` });
      setPaymentDialogOpen(false);
      setPaymentDetails({ utr: '', amount: 0, mode: 'Bank Transfer' });
    } catch {
      toast({ title: 'Error', description: 'Failed to record payment', variant: 'destructive' });
    }
  };

  const handleSendEmail = () => {
    toast({ title: 'Invoice Sent', description: `Invoice sent to ${emailTo}` });
    setEmailDialogOpen(false);
    setEmailTo('');
  };

  const handleGeneratePaymentLink = (invoice: Invoice) => {
    const paymentUrl = `pay.monoskin.com/inv/${invoice.invoiceNumber}`;
    navigator.clipboard.writeText(paymentUrl);
    toast({ title: 'Payment Link Generated', description: `Link copied: ${paymentUrl}` });
  };

  const handleSendWhatsAppInvoice = (invoice: Invoice) => {
    const doctor = doctors.find(d => d.id === invoice.doctorId);
    if (!doctor?.phone) {
      toast({ title: 'No Phone Number', description: 'Customer has no phone number', variant: 'destructive' });
      return;
    }
    toast({ title: 'WhatsApp Sent', description: `Invoice sent via WhatsApp to ${doctor.name}` });
  };

  const handleGenerateInvoice = () => {
    if (!newInvoice.orderId || !newInvoice.amount) {
      toast({ title: 'Missing Fields', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    const order = orders.find(o => o.id === Number(newInvoice.orderId));
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;
    createInvoiceMutation.mutate(
      {
        invoiceNumber,
        orderId: Number(newInvoice.orderId),
        doctorId: order?.doctorId || Number(newInvoice.doctorId) || null,
        amount: newInvoice.amount,
        status: 'Pending',
        dueDate: newInvoice.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      },
      {
        onSuccess: () => {
          toast({ title: 'Invoice Generated', description: `${invoiceNumber} created successfully` });
          setGenerateDialogOpen(false);
          setNewInvoice({ orderId: '', doctorId: '', amount: '', dueDate: '' });
        },
        onError: () => {
          toast({ title: 'Error', description: 'Failed to create invoice', variant: 'destructive' });
        },
      }
    );
  };

  const handleBulkReminder = async () => {
    if (selectedOverdue.length === 0) {
      toast({ title: 'No Invoices Selected', description: 'Please select at least one overdue invoice', variant: 'destructive' });
      return;
    }
    setIsSendingReminders(true);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const sentCount = selectedOverdue.length;
    const method = reminderMethod === 'email' ? 'Email' : 'WhatsApp';
    toast({
      title: `Reminders Sent (${sentCount})`,
      description: `${method} reminders sent to ${sentCount} customer(s) for overdue invoices`,
    });
    setIsSendingReminders(false);
    setBulkReminderDialogOpen(false);
    setSelectedOverdue([]);
  };

  const toggleOverdueSelection = (invoiceId: number) => {
    setSelectedOverdue(prev =>
      prev.includes(invoiceId) ? prev.filter(id => id !== invoiceId) : [...prev, invoiceId]
    );
  };

  const selectAllOverdue = () => {
    if (selectedOverdue.length === overdueInvoices.length) {
      setSelectedOverdue([]);
    } else {
      setSelectedOverdue(overdueInvoices.map(i => i.id));
    }
  };

  const getDoctorName = (doctorId: number | null) => {
    if (!doctorId) return '-';
    const doctor = doctors.find(d => d.id === doctorId);
    return doctor?.name || '-';
  };

  const getDoctorClinic = (doctorId: number | null) => {
    if (!doctorId) return '';
    const doctor = doctors.find(d => d.id === doctorId);
    return doctor?.clinic || '';
  };

  const getLinkedOrder = (inv: Invoice) => orders.find(o => o.id === inv.orderId);
  const getLinkedShipments = (inv: Invoice) => shipments.filter(s => s.orderId === inv.orderId);
  const getLinkedReturns = (inv: Invoice) => returns.filter(r => r.orderId === inv.orderId);
  const getLinkedCreditNotes = (inv: Invoice) => creditNotes.filter(cn => cn.invoiceId === inv.id);

  const columns: Column<Invoice>[] = [
    { key: 'invoiceNumber', header: 'Invoice ID', sortable: true, render: (row) => (
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold" data-testid={`text-invoice-${row.id}`}>{row.invoiceNumber}</span>
        {hasCreditRestriction(row.id) && (
          <Badge variant="destructive" className="text-xs" data-testid={`badge-credit-restricted-${row.id}`}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            Credit
          </Badge>
        )}
      </div>
    )},
    { key: 'orderId', header: 'Order', render: (row) => {
      const order = getLinkedOrder(row);
      return <span className="font-mono text-sm" data-testid={`text-order-${row.id}`}>{order?.orderNumber || (row.orderId ? `ORD-${row.orderId}` : '-')}</span>;
    }},
    { key: 'doctorId', header: 'Customer', render: (row) => (
      <div data-testid={`text-customer-${row.id}`}>
        <p className="font-medium text-sm">{getDoctorName(row.doctorId)}</p>
        <p className="text-xs text-muted-foreground">{getDoctorClinic(row.doctorId)}</p>
      </div>
    )},
    { key: 'amount', header: 'Amount', sortable: true, render: (row) => (
      <div>
        <span className="font-mono font-medium" data-testid={`text-amount-${row.id}`}>₹{Number(row.amount).toLocaleString()}</span>
        {Number(row.paidAmount || 0) > 0 && Number(row.paidAmount || 0) < Number(row.amount) && (
          <p className="text-xs text-muted-foreground">Paid: ₹{Number(row.paidAmount).toLocaleString()}</p>
        )}
      </div>
    )},
    { key: 'status', header: 'Status', sortable: true, render: (row) => <span data-testid={`status-${row.id}`}><StatusPill status={row.status} /></span> },
    { key: 'dueDate', header: 'Due Date', sortable: true, render: (row) => <span className="text-sm" data-testid={`text-due-date-${row.id}`}>{row.dueDate || '-'}</span> },
    { key: 'actions', header: '', render: (row) => (
      <RowActionsMenu
        testId={`button-actions-${row.id}`}
        actions={[
          { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => { setSelectedInvoice(row); setDetailDrawerOpen(true); } },
          { label: 'Download PDF', icon: <Download className="h-4 w-4" />, onClick: () => toast({ title: 'PDF Downloaded' }) },
          { separator: true, label: '', onClick: () => {} },
          { label: 'Send Email', icon: <Mail className="h-4 w-4" />, onClick: () => { setSelectedInvoice(row); setEmailTo(doctors.find(d => d.id === row.doctorId)?.email || ''); setEmailDialogOpen(true); } },
          { label: 'Send WhatsApp', icon: <MessageSquare className="h-4 w-4" />, onClick: () => handleSendWhatsAppInvoice(row) },
          { label: 'Copy Payment Link', icon: <Copy className="h-4 w-4" />, onClick: () => handleGeneratePaymentLink(row) },
          { separator: true, label: '', onClick: () => {} },
          ...(getLinkedOrder(row) ? [{ label: `View Order ${getLinkedOrder(row)?.orderNumber || ''}`, icon: <Package className="h-4 w-4" />, onClick: () => navigate(`/orders/${row.orderId}`) }] : []),
          ...(getLinkedShipments(row).length > 0 ? [{ label: `View Shipment`, icon: <Truck className="h-4 w-4" />, onClick: () => navigate(`/shipments/${getLinkedShipments(row)[0].id}`) }] : []),
          ...(getLinkedCreditNotes(row).length > 0 ? [{ label: `View Credit Notes (${getLinkedCreditNotes(row).length})`, icon: <CreditCard className="h-4 w-4" />, onClick: () => navigate('/finance/credit-notes') }] : []),
          ...(getLinkedReturns(row).length > 0 ? [{ label: `View Returns (${getLinkedReturns(row).length})`, icon: <RotateCcw className="h-4 w-4" />, onClick: () => navigate('/returns') }] : []),
          { separator: true, label: '', onClick: () => {} },
          ...(row.status !== 'Paid' ? [
            { label: 'Record Payment', icon: <CreditCard className="h-4 w-4" />, onClick: () => { setSelectedInvoice(row); setPaymentDetails({ ...paymentDetails, amount: Number(row.amount) - Number(row.paidAmount || 0) }); setPaymentDialogOpen(true); } },
          ] : []),
        ]}
      />
    )},
  ];

  const timeline: TimelineEvent[] = selectedInvoice ? [
    { id: '1', type: 'system', title: 'Invoice Created', description: `Amount: ₹${Number(selectedInvoice.amount).toLocaleString()}`, user: 'System', timestamp: selectedInvoice.createdAt?.toString() || '' },
    ...(selectedInvoice.status === 'Paid' ? [{ id: '3', type: 'status' as const, title: 'Payment Received', description: 'Payment completed', user: 'System', timestamp: selectedInvoice.paidAt?.toString() || '', status: 'success' as const }] : []),
  ] : [];

  const totalAmount = invoices.reduce((sum: number, i: Invoice) => sum + Number(i.amount), 0);
  const pendingAmount = invoices.filter((i: Invoice) => i.status !== 'Paid').reduce((sum: number, i: Invoice) => sum + Number(i.amount), 0);
  const overdueCount = overdueInvoices.length;
  const paidCount = invoices.filter(i => i.status === 'Paid').length;

  if (invoicesLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoices" description="Manage invoices and payments" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Invoices"
        description="Manage invoices, payments, and follow-ups"
        actions={
          <div className="flex gap-2 flex-wrap">
            {overdueCount > 0 && (
              <Button
                variant="outline"
                onClick={() => { setSelectedOverdue(overdueInvoices.map(i => i.id)); setBulkReminderDialogOpen(true); }}
                data-testid="button-bulk-reminder"
              >
                <Bell className="h-4 w-4 mr-2" />
                Send Reminders ({overdueCount})
              </Button>
            )}
            <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setGenerateDialogOpen(true)} data-testid="button-generate-invoice">
              <Plus className="h-4 w-4 mr-2" />
              Generate Invoice
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Invoices" value={invoices.length} icon={<FileText className="h-5 w-5" />} />
        <StatCard title="Total Value" value={`₹${(totalAmount / 1000).toFixed(0)}K`} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard title="Pending" value={`₹${(pendingAmount / 1000).toFixed(0)}K`} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard title="Collected" value={`${paidCount}/${invoices.length}`} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices, customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
            <SelectItem value="Partially Paid">Partially Paid</SelectItem>
          </SelectContent>
        </Select>
        <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-territory">
            <SelectValue placeholder="Territory" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Territories</SelectItem>
            {uniqueTerritories.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={salesRepFilter} onValueChange={setSalesRepFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-sales-rep">
            <SelectValue placeholder="Sales Rep" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sales Reps</SelectItem>
            {uniqueSalesReps.map(m => (
              <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-product">
            <SelectValue placeholder="Product SKU" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.slice(0, 20).map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.sku || p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredInvoices}
        onRowClick={(item) => navigate(`/finance/invoices/${item.id}`)}
        emptyMessage="No invoices found matching your filters"
      />

      {/* Generate Invoice Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Generate Invoice
            </DialogTitle>
            <DialogDescription>Create a new invoice for an order</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Order *</Label>
              <Select value={newInvoice.orderId} onValueChange={(v) => {
                const order = orders.find(o => o.id === Number(v));
                setNewInvoice({
                  ...newInvoice,
                  orderId: v,
                  doctorId: order?.doctorId ? String(order.doctorId) : '',
                  amount: order?.total ? String(order.total) : newInvoice.amount,
                });
              }}>
                <SelectTrigger data-testid="select-order-for-invoice">
                  <SelectValue placeholder="Select an order" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map(o => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.orderNumber} - {getDoctorName(o.doctorId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              <Input
                value={getDoctorName(Number(newInvoice.doctorId) || null)}
                readOnly
                className="bg-muted"
                data-testid="input-invoice-customer"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                value={newInvoice.amount}
                onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                placeholder="Enter invoice amount"
                data-testid="input-invoice-amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={newInvoice.dueDate}
                onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                data-testid="input-invoice-due-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)} data-testid="button-cancel-invoice">Cancel</Button>
            <Button
              onClick={handleGenerateInvoice}
              disabled={createInvoiceMutation.isPending || !newInvoice.orderId || !newInvoice.amount}
              data-testid="button-create-invoice"
            >
              {createInvoiceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reminder Dialog */}
      <Dialog open={bulkReminderDialogOpen} onOpenChange={setBulkReminderDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Send Payment Reminders
            </DialogTitle>
            <DialogDescription>
              Send automated follow-up reminders to customers with overdue invoices
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reminder Method</Label>
              <div className="flex gap-2">
                <Button
                  variant={reminderMethod === 'email' ? 'default' : 'outline'}
                  onClick={() => setReminderMethod('email')}
                  className="flex-1"
                  data-testid="button-reminder-email"
                >
                  <Mail className="h-4 w-4 mr-2" /> Email
                </Button>
                <Button
                  variant={reminderMethod === 'whatsapp' ? 'default' : 'outline'}
                  onClick={() => setReminderMethod('whatsapp')}
                  className="flex-1"
                  data-testid="button-reminder-whatsapp"
                >
                  <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Overdue Invoices ({selectedOverdue.length} / {overdueInvoices.length} selected)</Label>
                <Button variant="ghost" size="sm" onClick={selectAllOverdue} data-testid="button-select-all-overdue">
                  {selectedOverdue.length === overdueInvoices.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                {overdueInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No overdue invoices</p>
                ) : (
                  overdueInvoices.map(inv => {
                    const doctor = doctors.find(d => d.id === inv.doctorId);
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover-elevate cursor-pointer"
                        onClick={() => toggleOverdueSelection(inv.id)}
                        data-testid={`overdue-item-${inv.id}`}
                      >
                        <Checkbox
                          checked={selectedOverdue.includes(inv.id)}
                          onCheckedChange={() => toggleOverdueSelection(inv.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-medium">{inv.invoiceNumber}</span>
                            <span className="font-mono text-sm text-destructive">₹{Number(inv.amount).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {doctor?.name || 'Unknown'} {doctor?.phone ? `| ${doctor.phone}` : ''} {doctor?.email ? `| ${doctor.email}` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Message Preview:</p>
              <p className="text-muted-foreground">
                Dear Customer, this is a reminder that your invoice [INV-XXXX] for ₹XX,XXX is overdue.
                Please arrange payment at your earliest convenience. For queries, contact accounts@monoskin.in
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkReminderDialogOpen(false)} data-testid="button-cancel-reminder">Cancel</Button>
            <Button
              onClick={handleBulkReminder}
              disabled={selectedOverdue.length === 0 || isSendingReminders}
              data-testid="button-send-reminders"
            >
              {isSendingReminders ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Send {selectedOverdue.length} Reminder{selectedOverdue.length !== 1 ? 's' : ''}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Invoice {selectedInvoice?.invoiceNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>UTR / Transaction Reference</Label>
              <Input value={paymentDetails.utr} onChange={(e) => setPaymentDetails({ ...paymentDetails, utr: e.target.value })} placeholder="Enter UTR or reference number" data-testid="input-utr" />
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" value={paymentDetails.amount} onChange={(e) => setPaymentDetails({ ...paymentDetails, amount: Number(e.target.value) })} data-testid="input-amount" />
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={paymentDetails.mode} onValueChange={(v) => setPaymentDetails({ ...paymentDetails, mode: v })}>
                <SelectTrigger data-testid="select-payment-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} data-testid="button-cancel">Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={!paymentDetails.utr || createPaymentMutation.isPending} data-testid="button-record-payment">
              {createPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogDescription>Email invoice {selectedInvoice?.invoiceNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="email@example.com" data-testid="input-email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)} data-testid="button-cancel-email">Cancel</Button>
            <Button onClick={handleSendEmail} disabled={!emailTo} data-testid="button-send-email"><Send className="h-4 w-4 mr-2" /> Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} entityName="Invoices" columns={exportColumns} totalRecords={filteredInvoices.length} />

      {/* Detail Drawer */}
      <EntityDetailDrawer open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} title={`Invoice ${selectedInvoice?.invoiceNumber}`} entityId={selectedInvoice?.invoiceNumber || ''} status={selectedInvoice?.status || ''} timeline={timeline}>
        {selectedInvoice && (
          <div className="space-y-5">
            {hasCreditRestriction(selectedInvoice.id) && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2" data-testid="alert-credit-restricted">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive text-sm">Credit Restricted</p>
                  <p className="text-xs text-muted-foreground">This invoice has active credit notes applied.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div data-testid="detail-order-id">
                <Label className="text-muted-foreground">Order ID</Label>
                <p className="font-medium">{getLinkedOrder(selectedInvoice)?.orderNumber || (selectedInvoice.orderId || '-')}</p>
              </div>
              <div data-testid="detail-customer">
                <Label className="text-muted-foreground">Customer</Label>
                <p className="font-medium">{getDoctorName(selectedInvoice.doctorId)}</p>
              </div>
              <div data-testid="detail-due-date">
                <Label className="text-muted-foreground">Due Date</Label>
                <p className="font-medium">{selectedInvoice.dueDate || '-'}</p>
              </div>
              <div data-testid="detail-paid-amount">
                <Label className="text-muted-foreground">Paid Amount</Label>
                <p className="font-medium">₹{Number(selectedInvoice.paidAmount || 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Price Breakup */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-2" data-testid="detail-discount-breakup">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Price Breakup</Label>
              </div>
              {(() => {
                const breakup = getDiscountBreakup(selectedInvoice);
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span data-testid="text-subtotal">₹{breakup.subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                      <span>Discount ({breakup.discountPercent}%)</span>
                      <span data-testid="text-discount">-₹{breakup.discount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t pt-2">
                      <span>Net Amount</span>
                      <span data-testid="text-net-amount">₹{Number(selectedInvoice.amount).toLocaleString()}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Payment Link */}
            {selectedInvoice.status !== 'Paid' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg" data-testid="detail-payment-link">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Label className="font-medium text-blue-700 dark:text-blue-300">Payment Link</Label>
                    <p className="text-xs text-muted-foreground font-mono truncate">pay.monoskin.com/inv/{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGeneratePaymentLink(selectedInvoice)}
                    data-testid="button-copy-payment-link"
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
              </div>
            )}

            {/* Linked Documents */}
            <div className="space-y-2">
              <Label className="font-medium flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                Linked Documents
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {getLinkedOrder(selectedInvoice) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => { setDetailDrawerOpen(false); navigate(`/orders/${selectedInvoice.orderId}`); }}
                    data-testid="button-view-linked-order"
                  >
                    <Package className="h-3 w-3 mr-2" />
                    Order {getLinkedOrder(selectedInvoice)?.orderNumber}
                  </Button>
                )}
                {getLinkedShipments(selectedInvoice).map(s => (
                  <Button
                    key={s.id}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => { setDetailDrawerOpen(false); navigate(`/shipments/${s.id}`); }}
                    data-testid={`button-view-linked-shipment-${s.id}`}
                  >
                    <Truck className="h-3 w-3 mr-2" />
                    Shipment SHP-{s.id}
                  </Button>
                ))}
                {getLinkedCreditNotes(selectedInvoice).map(cn => (
                  <Button
                    key={cn.id}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => { setDetailDrawerOpen(false); navigate('/finance/credit-notes'); }}
                    data-testid={`button-view-linked-cn-${cn.id}`}
                  >
                    <CreditCard className="h-3 w-3 mr-2" />
                    CN-{cn.id}
                  </Button>
                ))}
                {getLinkedReturns(selectedInvoice).map(r => (
                  <Button
                    key={r.id}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => { setDetailDrawerOpen(false); navigate('/returns'); }}
                    data-testid={`button-view-linked-return-${r.id}`}
                  >
                    <RotateCcw className="h-3 w-3 mr-2" />
                    Return {r.returnNumber}
                  </Button>
                ))}
                {!getLinkedOrder(selectedInvoice) && getLinkedShipments(selectedInvoice).length === 0 && getLinkedCreditNotes(selectedInvoice).length === 0 && getLinkedReturns(selectedInvoice).length === 0 && (
                  <p className="text-xs text-muted-foreground col-span-2 py-2">No linked documents found</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-2">
              {selectedInvoice.status !== 'Paid' && (
                <Button
                  className="flex-1"
                  onClick={() => {
                    setPaymentDetails({ ...paymentDetails, amount: Number(selectedInvoice.amount) - Number(selectedInvoice.paidAmount || 0) });
                    setPaymentDialogOpen(true);
                    setDetailDrawerOpen(false);
                  }}
                  data-testid="button-record-payment-drawer"
                >
                  <CreditCard className="h-4 w-4 mr-2" /> Record Payment
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => toast({ title: 'PDF Downloaded' })}
                data-testid="button-download-pdf-drawer"
              >
                <Download className="h-4 w-4 mr-2" /> PDF
              </Button>
            </div>
          </div>
        )}
      </EntityDetailDrawer>
    </div>
  );
}
