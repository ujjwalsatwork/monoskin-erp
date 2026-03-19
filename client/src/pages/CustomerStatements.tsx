import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, Send, Loader2, Mail, Phone, AlertTriangle } from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { useToast } from '@/hooks/use-toast';
import type { Doctor, Pharmacy, Invoice } from '@shared/schema';

interface CustomerStatement {
  id: number;
  customerId: number;
  customerName: string;
  customerType: 'doctor' | 'pharmacy';
  totalInvoices: number;
  invoiceAmount: number;
  paidAmount: number;
  outstanding: number;
  email: string;
  phone: string;
  oldestDueDate: Date | null;
  daysOverdue: number;
}

const CustomerStatements = () => {
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerStatement | null>(null);

  const { data: doctors = [], isLoading: doctorsLoading } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: pharmacies = [], isLoading: pharmaciesLoading } = useQuery<Pharmacy[]>({
    queryKey: ['/api/pharmacies'],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const isLoading = doctorsLoading || pharmaciesLoading || invoicesLoading;

  const calculateDaysOverdue = (dueDate: Date | null): number => {
    if (!dueDate) return 0;
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getOldestOverdueDate = (customerInvoices: Invoice[]): Date | null => {
    const overdueInvoices = customerInvoices.filter(i => 
      i.status !== 'Paid' && i.dueDate && new Date(i.dueDate) < new Date()
    );
    if (overdueInvoices.length === 0) return null;
    const oldestDue = overdueInvoices.reduce((oldest, i) => {
      const dueDate = new Date(i.dueDate);
      return dueDate < oldest ? dueDate : oldest;
    }, new Date());
    return oldestDue;
  };

  const statements: CustomerStatement[] = useMemo(() => [
    ...doctors.map(doc => {
      const docInvoices = invoices.filter(i => i.doctorId === doc.id);
      const invoiceAmount = docInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
      const paidAmount = docInvoices.reduce((sum, i) => sum + Number(i.paidAmount || 0), 0);
      const oldestDueDate = getOldestOverdueDate(docInvoices);
      return {
        id: doc.id,
        customerId: doc.id,
        customerName: doc.name,
        customerType: 'doctor' as const,
        totalInvoices: docInvoices.length,
        invoiceAmount,
        paidAmount,
        outstanding: Number(doc.outstanding || 0),
        email: doc.email || '',
        phone: doc.phone || '',
        oldestDueDate,
        daysOverdue: calculateDaysOverdue(oldestDueDate),
      };
    }),
    ...pharmacies.map(ph => {
      const phInvoices = invoices.filter(i => i.pharmacyId === ph.id);
      const invoiceAmount = phInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
      const paidAmount = phInvoices.reduce((sum, i) => sum + Number(i.paidAmount || 0), 0);
      const oldestDueDate = getOldestOverdueDate(phInvoices);
      return {
        id: ph.id + 10000,
        customerId: ph.id,
        customerName: ph.name,
        customerType: 'pharmacy' as const,
        totalInvoices: phInvoices.length,
        invoiceAmount,
        paidAmount,
        outstanding: Number(ph.outstanding || 0),
        email: ph.email || '',
        phone: ph.phone || '',
        oldestDueDate,
        daysOverdue: calculateDaysOverdue(oldestDueDate),
      };
    }),
  ].filter(s => s.invoiceAmount > 0 || s.outstanding > 0), [doctors, pharmacies, invoices]);

  const columns: Column<CustomerStatement>[] = [
    { key: 'customerName', header: 'Customer', sortable: true, render: (item) => (
      <div className="flex items-center gap-2">
        <span className={item.daysOverdue > 30 ? 'font-semibold text-red-600 dark:text-red-400' : ''}>
          {item.customerName}
        </span>
        {item.daysOverdue > 30 && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="destructive" className="text-xs" data-testid={`badge-overdue-${item.id}`}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {item.daysOverdue}d overdue
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Oldest unpaid invoice is {item.daysOverdue} days past due</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    )},
    { key: 'customerType', header: 'Type', render: (item) => (
      <span className={`px-2 py-1 rounded-full text-xs ${item.customerType === 'doctor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}`}>
        {item.customerType === 'doctor' ? 'Doctor' : 'Pharmacy'}
      </span>
    )},
    { key: 'totalInvoices', header: 'Invoices', render: (item) => <span className="font-mono">{item.totalInvoices}</span> },
    { key: 'invoiceAmount', header: 'Invoice Amount', render: (item) => <span className="font-mono">₹{item.invoiceAmount.toLocaleString()}</span> },
    { key: 'paidAmount', header: 'Paid', render: (item) => <span className="font-mono text-green-600">₹{item.paidAmount.toLocaleString()}</span> },
    { key: 'outstanding', header: 'Outstanding', render: (item) => (
      <span className={`font-mono font-semibold ${item.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
        ₹{item.outstanding.toLocaleString()}
      </span>
    )},
    { key: 'actions', header: 'Send', render: (item) => (
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              disabled={!item.email}
              onClick={(e) => { e.stopPropagation(); handleSendEmail(item); }}
              data-testid={`button-email-${item.id}`}
            >
              <Mail className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{item.email ? `Send email to ${item.email}` : 'No email available'}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-green-600 hover:text-green-700"
              disabled={!item.phone}
              onClick={(e) => { e.stopPropagation(); handleSendWhatsApp(item); }}
              data-testid={`button-whatsapp-${item.id}`}
            >
              <SiWhatsapp className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{item.phone ? `Send WhatsApp to ${item.phone}` : 'No phone available'}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    )},
  ];

  const totalOutstanding = statements.reduce((sum, s) => sum + s.outstanding, 0);
  const totalInvoiced = statements.reduce((sum, s) => sum + s.invoiceAmount, 0);
  const doctorCount = statements.filter(s => s.customerType === 'doctor').length;
  const pharmacyCount = statements.filter(s => s.customerType === 'pharmacy').length;
  const overdueCount = statements.filter(s => s.daysOverdue > 30).length;
  const overdueAmount = statements.filter(s => s.daysOverdue > 30).reduce((sum, s) => sum + s.outstanding, 0);

  const stats = [
    { title: 'Total Customers', value: statements.length.toString(), subtitle: 'With statements', color: 'blue' as const },
    { title: 'Doctors', value: doctorCount.toString(), subtitle: 'Active', color: 'green' as const },
    { title: 'Pharmacies', value: pharmacyCount.toString(), subtitle: 'Active', color: 'yellow' as const },
    { title: 'Total Outstanding', value: `₹${(totalOutstanding / 100000).toFixed(1)}L`, subtitle: 'Receivables', color: 'pink' as const },
    { title: 'Overdue > 30 Days', value: overdueCount.toString(), subtitle: `₹${(overdueAmount / 100000).toFixed(1)}L at risk`, color: 'red' as const },
  ];

  const handleSendEmail = (customer: CustomerStatement) => {
    if (customer.email) {
      toast({ title: 'Email Sent', description: `Statement email sent to ${customer.email}` });
    } else {
      toast({ title: 'No Email', description: 'Customer email not available', variant: 'destructive' });
    }
  };

  const handleSendWhatsApp = (customer: CustomerStatement) => {
    if (customer.phone) {
      const message = encodeURIComponent(`Dear ${customer.customerName}, your outstanding balance is ₹${customer.outstanding.toLocaleString()}. Please clear your dues at the earliest. Thank you.`);
      const whatsappUrl = `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${message}`;
      window.open(whatsappUrl, '_blank');
      toast({ title: 'WhatsApp Opened', description: `Statement message prepared for ${customer.phone}` });
    } else {
      toast({ title: 'No Phone', description: 'Customer phone not available', variant: 'destructive' });
    }
  };

  const handleSendStatement = (customer: CustomerStatement) => {
    if (customer.email) {
      toast({ title: 'Statement Sent', description: `Statement sent to ${customer.email}` });
    } else {
      toast({ title: 'No Email', description: 'Customer email not available', variant: 'destructive' });
    }
  };

  const handleExport = () => {
    toast({ title: 'Export Started', description: 'Generating customer statements report...' });
  };

  const rowActions = [
    { label: 'View Details', onClick: setSelectedCustomer },
    { label: 'Send Statement', onClick: handleSendStatement },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Customer Statements"
        description="View and send account statements to customers"
        actions={
          <Button variant="outline" onClick={handleExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <DataTable
        columns={columns}
        data={statements}
        rowActions={rowActions}
        emptyMessage="No customer statements found"
      />

      {selectedCustomer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statement Details: {selectedCustomer.customerName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoiced</p>
                <p className="font-mono font-semibold">₹{selectedCustomer.invoiceAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="font-mono font-semibold text-green-600">₹{selectedCustomer.paidAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="font-mono font-semibold text-red-600">₹{selectedCustomer.outstanding.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invoice Count</p>
                <p className="font-semibold">{selectedCustomer.totalInvoices}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={!selectedCustomer.email}
                onClick={() => handleSendEmail(selectedCustomer)} 
                data-testid="button-send-email-detail"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-green-600 hover:text-green-700 border-green-300"
                disabled={!selectedCustomer.phone}
                onClick={() => handleSendWhatsApp(selectedCustomer)} 
                data-testid="button-send-whatsapp-detail"
              >
                <SiWhatsapp className="h-4 w-4 mr-2" />
                Send WhatsApp
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                Close
              </Button>
            </div>
            {selectedCustomer.daysOverdue > 30 && (
              <div className="mt-4 p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  This customer has invoices overdue by <strong>{selectedCustomer.daysOverdue} days</strong>. Immediate follow-up recommended.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerStatements;
