import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DetailPageHeader } from '@/components/shared/DetailPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Download, Mail, Printer, CreditCard, Building2, Calendar, Loader2, Zap, PenLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Invoice, Doctor, Pharmacy, Order, OrderItem, Product } from '@shared/schema';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'Bank Transfer',
    referenceNumber: '',
    notes: '',
  });

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ['/api/invoices', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Invoice not found');
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

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest('POST', '/api/payments', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      toast({ title: 'Payment Recorded', description: 'Payment has been recorded successfully' });
      setPaymentDialogOpen(false);
      setPaymentForm({ amount: '', paymentMethod: 'Bank Transfer', referenceNumber: '', notes: '' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to record payment', variant: 'destructive' });
    },
  });

  const handleRecordPayment = () => {
    if (!invoice) return;
    const paid = Number(invoice.paidAmount || 0);
    const total = Number(invoice.amount);
    const remaining = total - paid;
    setPaymentForm(prev => ({ ...prev, amount: String(remaining > 0 ? remaining.toFixed(2) : total.toFixed(2)) }));
    setPaymentDialogOpen(true);
  };

  const handleSubmitPayment = () => {
    if (!invoice || !paymentForm.amount) return;
    recordPaymentMutation.mutate({
      invoiceId: invoice.id,
      amount: paymentForm.amount,
      paymentMethod: paymentForm.paymentMethod,
      referenceNumber: paymentForm.referenceNumber || null,
      notes: paymentForm.notes || null,
      status: 'Received',
      allocationStatus: 'allocated',
      allocatedAmount: paymentForm.amount,
    });
  };

  const handleSendReminder = () => {
    toast({ title: 'Reminder Sent', description: 'Payment reminder sent to customer' });
  };

  const handleDownload = () => {
    toast({ title: 'Download Started', description: 'Generating invoice PDF...' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Invoice not found</p>
      </div>
    );
  }

  const doctor = doctors.find(d => d.id === invoice.doctorId);
  const pharmacy = pharmacies.find(p => p.id === invoice.pharmacyId);
  const order = orders.find(o => o.id === invoice.orderId);
  const customer = doctor || pharmacy;

  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const daysOverdue = dueDate && new Date() > dueDate ? 
    Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const paidAmount = Number(invoice.paidAmount || 0);
  const totalAmount = Number(invoice.amount);
  const balanceDue = totalAmount - paidAmount;

  return (
    <div className="space-y-6 animate-fade-in">
      <DetailPageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        subtitle={`Order: ${order?.orderNumber || '-'}`}
        status={invoice.status}
        backPath="/invoices"
        primaryActions={
          <>
            <Button variant="outline" onClick={handleDownload} data-testid="button-download">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={() => toast({ title: 'Print', description: 'Opening print dialog...' })} data-testid="button-print">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            {invoice.status !== 'Paid' && (
              <Button onClick={handleRecordPayment} data-testid="button-record-payment">
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-mono font-medium">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className={`font-medium ${daysOverdue > 0 ? 'text-destructive' : ''}`}>
                    {dueDate?.toLocaleDateString() || '-'}
                    {daysOverdue > 0 && ` (${daysOverdue} days overdue)`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={invoice.status === 'Paid' ? 'default' : invoice.status === 'Overdue' ? 'destructive' : 'secondary'}>
                    {invoice.status}
                  </Badge>
                </div>
                <div data-testid="text-creation-source">
                  <p className="text-sm text-muted-foreground">Creation Source</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {invoice.creationSource === 'auto_generated' ? (
                      <Zap className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="font-medium capitalize text-sm">
                      {invoice.creationSource === 'auto_generated' ? 'Auto-generated' : 'Manually Created'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer Name</p>
                  <p className="font-medium">{customer?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer Type</p>
                  <Badge variant="outline">{doctor ? 'Doctor' : pharmacy ? 'Pharmacy' : '-'}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{doctor?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{customer?.phone || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{customer?.address || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Invoice Amount</span>
                <span className="font-mono font-semibold">₹{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Paid Amount</span>
                <span className="font-mono text-green-600">₹{paidAmount.toLocaleString()}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-semibold">Balance Due</span>
                <span className={`font-mono font-bold text-lg ${balanceDue > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  ₹{balanceDue.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {invoice.status !== 'Paid' && balanceDue > 0 && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Payment Pending</span>
                  </div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">
                    {daysOverdue > 0 
                      ? `This invoice is ${daysOverdue} days overdue.` 
                      : `Payment due on ${dueDate?.toLocaleDateString()}`}
                  </p>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleSendReminder} data-testid="button-send-reminder">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reminder
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a payment received for invoice {invoice?.invoiceNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Payment Amount (₹)</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter amount"
                data-testid="input-payment-amount"
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentForm.paymentMethod} onValueChange={(v) => setPaymentForm(prev => ({ ...prev, paymentMethod: v }))}>
                <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="NEFT">NEFT</SelectItem>
                  <SelectItem value="RTGS">RTGS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference Number</Label>
              <Input
                value={paymentForm.referenceNumber}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                placeholder="Transaction / Cheque number"
                data-testid="input-payment-ref"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes"
                rows={2}
                data-testid="textarea-payment-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitPayment}
              disabled={!paymentForm.amount || recordPaymentMutation.isPending}
              data-testid="button-submit-payment"
            >
              {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
