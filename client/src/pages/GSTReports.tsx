import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Download, FileText, Loader2, FileSpreadsheet, CheckCircle, AlertCircle, Clock,
  Search, ArrowDownRight, AlertTriangle, ShieldCheck, IndianRupee, RotateCcw, CalendarDays,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatCurrencyCompact(n: number) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getMonthOptions() {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    months.push({
      value: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
  }
  return months;
}

interface GSTSummary {
  month: string;
  summary: { totalSales: number; totalCGST: number; totalSGST: number; totalIGST: number; totalGST: number };
  invoiceCount: number;
  hsnSummary: { hsnCode: string; description: string; taxableValue: number; cgst: number; sgst: number; total: number }[];
  reverseGST: {
    creditNotesTotal: number; creditNotesGST: number; returnsCount: number; creditNotesCount: number;
    items: { type: string; number: string; amount: number; gstAmount: number; reason: string; date: string }[];
  };
}

interface GSTR1Data {
  month: string; period: string;
  b2bInvoices: { invoiceNumber: string; invoiceDate: string; recipientGSTIN: string; recipientName: string; invoiceValue: number; taxableValue: number; cgst: number; sgst: number; igst: number; placeOfSupply: string; reverseCharge: string }[];
  creditDebitNotes: { noteNumber: string; noteDate: string; noteType: string; noteValue: number; taxableValue: number; cgst: number; sgst: number; reason: string }[];
  totalInvoices: number; totalCreditNotes: number; totalTaxableValue: number; totalTax: number;
}

interface GSTR3BData {
  month: string; period: string;
  section31: { description: string; taxableValue: number; cgst: number; sgst: number; igst: number };
  section32: { description: string; taxableValue: number; cgst: number; sgst: number; igst: number };
  creditNoteAdjustment: { taxableValue: number; cgst: number; sgst: number; igst: number };
  netTaxLiability: { cgst: number; sgst: number; igst: number; total: number };
  totalInvoices: number; totalCreditNotes: number;
}

interface FilingEntry {
  month: string; label: string;
  gstr1: { status: string; filedAt: string | null; dueDate: string };
  gstr3b: { status: string; filedAt: string | null; dueDate: string };
}

interface MismatchData {
  month: string; totalMismatches: number; highSeverity: number; mediumSeverity: number; lowSeverity: number;
  mismatches: { type: string; invoiceNumber: string; doctorName: string; gstin: string; issue: string; severity: 'high' | 'medium' | 'low'; invoiceAmount: number }[];
}

interface GSTINValidation {
  valid: boolean; message: string;
  details: { stateCode: string; stateName: string; pan: string; entityType: string; gstin: string } | null;
}

const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

const GSTReports = () => {
  const { toast } = useToast();
  const months = useMemo(getMonthOptions, []);
  const [selectedMonth, setSelectedMonth] = useState(months[0].value);
  const [activeTab, setActiveTab] = useState('overview');
  const [gstinInput, setGstinInput] = useState('');
  const [gstinResult, setGstinResult] = useState<GSTINValidation | null>(null);

  const { data: overview, isLoading: loadingOverview } = useQuery<GSTSummary>({
    queryKey: ['/api/gst-reports', selectedMonth],
    queryFn: async () => { const r = await fetch(`/api/gst-reports?month=${selectedMonth}`, { credentials: 'include' }); return r.json(); },
  });

  const { data: gstr1, isLoading: loadingGSTR1 } = useQuery<GSTR1Data>({
    queryKey: ['/api/gst-reports/gstr1', selectedMonth],
    queryFn: async () => { const r = await fetch(`/api/gst-reports/gstr1?month=${selectedMonth}`, { credentials: 'include' }); return r.json(); },
    enabled: activeTab === 'gstr1',
  });

  const { data: gstr3b, isLoading: loadingGSTR3B } = useQuery<GSTR3BData>({
    queryKey: ['/api/gst-reports/gstr3b', selectedMonth],
    queryFn: async () => { const r = await fetch(`/api/gst-reports/gstr3b?month=${selectedMonth}`, { credentials: 'include' }); return r.json(); },
    enabled: activeTab === 'gstr3b',
  });

  const { data: filingStatus, isLoading: loadingFiling } = useQuery<FilingEntry[]>({
    queryKey: ['/api/gst-reports/filing-status'],
    enabled: activeTab === 'filing',
  });

  const { data: mismatches, isLoading: loadingMismatches } = useQuery<MismatchData>({
    queryKey: ['/api/gst-reports/mismatches', selectedMonth],
    queryFn: async () => { const r = await fetch(`/api/gst-reports/mismatches?month=${selectedMonth}`, { credentials: 'include' }); return r.json(); },
    enabled: activeTab === 'mismatches',
  });

  const validateMutation = useMutation({
    mutationFn: async (gstin: string) => {
      const res = await apiRequest('POST', '/api/gst-reports/validate-gstin', { gstin });
      return res.json() as Promise<GSTINValidation>;
    },
    onSuccess: (data) => {
      setGstinResult(data);
      if (data.valid) {
        toast({ title: 'Valid GSTIN', description: data.message });
      } else {
        toast({ title: 'Invalid GSTIN', description: data.message, variant: 'destructive' });
      }
    },
    onError: () => toast({ title: 'Error', description: 'GSTIN validation failed', variant: 'destructive' }),
  });

  const handleExportCSV = (type: string) => {
    if (type === 'gstr1' && gstr1) {
      const headers = ['Invoice Number', 'Date', 'GSTIN', 'Recipient', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Value'];
      const rows = gstr1.b2bInvoices.map(i => [i.invoiceNumber, i.invoiceDate, i.recipientGSTIN, i.recipientName, i.taxableValue, i.cgst, i.sgst, i.igst, i.invoiceValue]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csv, `GSTR1_${selectedMonth}.csv`);
    } else if (type === 'gstr3b' && gstr3b) {
      const rows = [
        ['Section', 'Taxable Value', 'CGST', 'SGST', 'IGST'],
        ['3.1 Outward Supplies', gstr3b.section31.taxableValue.toFixed(2), gstr3b.section31.cgst.toFixed(2), gstr3b.section31.sgst.toFixed(2), gstr3b.section31.igst.toFixed(2)],
        ['3.2 Inter-State Supplies', gstr3b.section32.taxableValue.toFixed(2), gstr3b.section32.cgst.toFixed(2), gstr3b.section32.sgst.toFixed(2), gstr3b.section32.igst.toFixed(2)],
        ['Credit Note Adj', gstr3b.creditNoteAdjustment.taxableValue.toFixed(2), gstr3b.creditNoteAdjustment.cgst.toFixed(2), gstr3b.creditNoteAdjustment.sgst.toFixed(2), gstr3b.creditNoteAdjustment.igst.toFixed(2)],
        ['Net Tax Liability', '', gstr3b.netTaxLiability.cgst.toFixed(2), gstr3b.netTaxLiability.sgst.toFixed(2), gstr3b.netTaxLiability.igst.toFixed(2)],
      ];
      const csv = rows.map(r => r.join(',')).join('\n');
      downloadCSV(csv, `GSTR3B_${selectedMonth}.csv`);
    }
    toast({ title: 'Export Started', description: `${type.toUpperCase()} report downloaded` });
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const summary = overview?.summary || { totalSales: 0, totalCGST: 0, totalSGST: 0, totalIGST: 0, totalGST: 0 };
  const reverseGST = overview?.reverseGST || { creditNotesTotal: 0, creditNotesGST: 0, returnsCount: 0, creditNotesCount: 0, items: [] };

  const filingBadge = (status: string) => {
    if (status === 'filed') return <Badge variant="default" data-testid="badge-filing-filed"><CheckCircle className="h-3 w-3 mr-1" />Filed</Badge>;
    if (status === 'overdue') return <Badge variant="destructive" data-testid="badge-filing-overdue"><AlertCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
    return <Badge variant="secondary" data-testid="badge-filing-pending"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const severityBadge = (s: string) => {
    if (s === 'high') return <Badge variant="destructive" data-testid="badge-severity-high">High</Badge>;
    if (s === 'medium') return <Badge variant="secondary" data-testid="badge-severity-medium">Medium</Badge>;
    return <Badge variant="outline" data-testid="badge-severity-low">Low</Badge>;
  };

  const hsnData = (overview?.hsnSummary || []).map((item, i) => ({ ...item, id: i }));
  const hsnColumns: Column<typeof hsnData[0]>[] = [
    { key: 'hsnCode', header: 'HSN Code', render: (r) => <span className="font-mono font-medium" data-testid={`text-hsn-${r.id}`}>{r.hsnCode}</span> },
    { key: 'description', header: 'Description', render: (r) => <span data-testid={`text-desc-${r.id}`}>{r.description}</span> },
    { key: 'taxableValue', header: 'Taxable Value', render: (r) => <span className="font-mono" data-testid={`text-taxable-${r.id}`}>{formatCurrency(r.taxableValue)}</span> },
    { key: 'cgst', header: 'CGST', render: (r) => <span className="font-mono" data-testid={`text-cgst-${r.id}`}>{formatCurrency(r.cgst)}</span> },
    { key: 'sgst', header: 'SGST', render: (r) => <span className="font-mono" data-testid={`text-sgst-${r.id}`}>{formatCurrency(r.sgst)}</span> },
    { key: 'total', header: 'Total Tax', render: (r) => <span className="font-mono font-semibold" data-testid={`text-total-${r.id}`}>{formatCurrency(r.total)}</span> },
  ];

  if (loadingOverview && activeTab === 'overview') {
    return <div className="flex items-center justify-center h-64" data-testid="loading-gst"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="GST Reports"
        description="Generate GST returns, track filing status, and manage compliance"
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]" data-testid="select-month"><CalendarDays className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview" data-testid="tab-overview"><IndianRupee className="h-4 w-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="gstr1" data-testid="tab-gstr1"><FileText className="h-4 w-4 mr-1" />GSTR-1</TabsTrigger>
          <TabsTrigger value="gstr3b" data-testid="tab-gstr3b"><FileSpreadsheet className="h-4 w-4 mr-1" />GSTR-3B</TabsTrigger>
          <TabsTrigger value="reverse" data-testid="tab-reverse"><RotateCcw className="h-4 w-4 mr-1" />Reverse GST</TabsTrigger>
          <TabsTrigger value="filing" data-testid="tab-filing"><CheckCircle className="h-4 w-4 mr-1" />Filing Status</TabsTrigger>
          <TabsTrigger value="mismatches" data-testid="tab-mismatches"><AlertTriangle className="h-4 w-4 mr-1" />Mismatches</TabsTrigger>
          <TabsTrigger value="gstin" data-testid="tab-gstin"><ShieldCheck className="h-4 w-4 mr-1" />GSTIN Validator</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Sales" value={`₹${formatCurrencyCompact(summary.totalSales)}`} subtitle={`${overview?.invoiceCount || 0} invoices`} icon={<IndianRupee className="h-5 w-5" />} />
            <StatCard title="CGST + SGST" value={`₹${formatCurrencyCompact(summary.totalCGST + summary.totalSGST)}`} subtitle="Intra-state tax" icon={<ArrowDownRight className="h-5 w-5" />} />
            <StatCard title="IGST" value={`₹${formatCurrencyCompact(summary.totalIGST)}`} subtitle="Inter-state tax" />
            <StatCard title="Total GST" value={`₹${formatCurrencyCompact(summary.totalGST)}`} subtitle="Tax payable" icon={<FileText className="h-5 w-5" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Tax Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: 'CGST', value: Math.round(summary.totalCGST) },
                        { name: 'SGST', value: Math.round(summary.totalSGST) },
                        { name: 'IGST', value: Math.round(summary.totalIGST) },
                      ]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                        {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Tax Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                    <span className="text-sm font-medium">Total Taxable Value</span>
                    <span className="font-mono font-semibold" data-testid="text-total-sales">{formatCurrency(summary.totalSales)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
                    <span className="text-sm">CGST (9%)</span>
                    <span className="font-mono" data-testid="text-total-cgst">{formatCurrency(summary.totalCGST)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
                    <span className="text-sm">SGST (9%)</span>
                    <span className="font-mono" data-testid="text-total-sgst">{formatCurrency(summary.totalSGST)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
                    <span className="text-sm">IGST (18%)</span>
                    <span className="font-mono" data-testid="text-total-igst">{formatCurrency(summary.totalIGST)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-md border border-primary/20">
                    <span className="text-sm font-bold">Total Tax Payable</span>
                    <span className="font-mono font-bold" data-testid="text-total-gst">{formatCurrency(summary.totalGST)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">HSN-wise Summary</CardTitle></CardHeader>
            <CardContent>
              <DataTable columns={hsnColumns} data={hsnData} emptyMessage="No HSN data for the selected period" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GSTR-1 TAB */}
        <TabsContent value="gstr1" className="space-y-6 mt-4">
          {loadingGSTR1 ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : gstr1 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-gstr1-period">GSTR-1 - {gstr1.period}</h3>
                  <p className="text-sm text-muted-foreground">{gstr1.totalInvoices} invoices, {gstr1.totalCreditNotes} credit/debit notes</p>
                </div>
                <Button onClick={() => handleExportCSV('gstr1')} data-testid="button-export-gstr1">
                  <Download className="h-4 w-4 mr-2" /> Export GSTR-1
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="B2B Invoices" value={gstr1.totalInvoices} />
                <StatCard title="Total Taxable Value" value={formatCurrency(gstr1.totalTaxableValue)} />
                <StatCard title="Total Tax" value={formatCurrency(gstr1.totalTax)} />
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">B2B Invoices (Section 4A)</CardTitle></CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'invoiceNumber', header: 'Invoice #', render: (r) => <span className="font-mono text-sm" data-testid={`text-gstr1-inv-${r.invoiceNumber}`}>{r.invoiceNumber}</span> },
                      { key: 'invoiceDate', header: 'Date', render: (r) => <span data-testid={`text-gstr1-date-${r.invoiceNumber}`}>{r.invoiceDate}</span> },
                      { key: 'recipientGSTIN', header: 'GSTIN', render: (r) => (
                        <span className={`font-mono text-xs ${r.recipientGSTIN === 'UNREGISTERED' ? 'text-orange-600 dark:text-orange-400' : ''}`} data-testid={`text-gstr1-gstin-${r.invoiceNumber}`}>
                          {r.recipientGSTIN}
                        </span>
                      )},
                      { key: 'recipientName', header: 'Recipient' },
                      { key: 'taxableValue', header: 'Taxable', render: (r) => <span className="font-mono">{formatCurrency(r.taxableValue)}</span> },
                      { key: 'cgst', header: 'CGST', render: (r) => <span className="font-mono">{formatCurrency(r.cgst)}</span> },
                      { key: 'sgst', header: 'SGST', render: (r) => <span className="font-mono">{formatCurrency(r.sgst)}</span> },
                      { key: 'invoiceValue', header: 'Total', render: (r) => <span className="font-mono font-semibold">{formatCurrency(r.invoiceValue)}</span> },
                    ] as any}
                    data={gstr1.b2bInvoices.map((inv, i) => ({ ...inv, id: i }))}
                    emptyMessage="No B2B invoices for this period"
                  />
                </CardContent>
              </Card>

              {gstr1.creditDebitNotes.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Credit/Debit Notes (Section 9B)</CardTitle></CardHeader>
                  <CardContent>
                    <DataTable
                      columns={[
                        { key: 'noteNumber', header: 'Note #', render: (r) => <span className="font-mono text-sm">{r.noteNumber}</span> },
                        { key: 'noteDate', header: 'Date' },
                        { key: 'noteType', header: 'Type', render: (r) => <Badge variant="outline">{r.noteType}</Badge> },
                        { key: 'taxableValue', header: 'Taxable', render: (r) => <span className="font-mono">{formatCurrency(r.taxableValue)}</span> },
                        { key: 'cgst', header: 'CGST', render: (r) => <span className="font-mono">{formatCurrency(r.cgst)}</span> },
                        { key: 'sgst', header: 'SGST', render: (r) => <span className="font-mono">{formatCurrency(r.sgst)}</span> },
                        { key: 'reason', header: 'Reason' },
                      ] as any}
                      data={gstr1.creditDebitNotes.map((cn, i) => ({ ...cn, id: i }))}
                      emptyMessage="No credit/debit notes"
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* GSTR-3B TAB */}
        <TabsContent value="gstr3b" className="space-y-6 mt-4">
          {loadingGSTR3B ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : gstr3b && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-gstr3b-period">GSTR-3B - {gstr3b.period}</h3>
                  <p className="text-sm text-muted-foreground">{gstr3b.totalInvoices} invoices, {gstr3b.totalCreditNotes} credit notes adjusted</p>
                </div>
                <Button onClick={() => handleExportCSV('gstr3b')} data-testid="button-export-gstr3b">
                  <Download className="h-4 w-4 mr-2" /> Export GSTR-3B
                </Button>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">3.1 - Details of Outward Supplies</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium text-muted-foreground">Nature of Supplies</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">Taxable Value</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">CGST</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">SGST</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">IGST</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b" data-testid="row-section31">
                          <td className="p-2 text-sm">{gstr3b.section31.description}</td>
                          <td className="p-2 text-right font-mono" data-testid="text-s31-taxable">{formatCurrency(gstr3b.section31.taxableValue)}</td>
                          <td className="p-2 text-right font-mono" data-testid="text-s31-cgst">{formatCurrency(gstr3b.section31.cgst)}</td>
                          <td className="p-2 text-right font-mono" data-testid="text-s31-sgst">{formatCurrency(gstr3b.section31.sgst)}</td>
                          <td className="p-2 text-right font-mono" data-testid="text-s31-igst">{formatCurrency(gstr3b.section31.igst)}</td>
                        </tr>
                        <tr className="border-b" data-testid="row-section32">
                          <td className="p-2 text-sm">{gstr3b.section32.description}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(gstr3b.section32.taxableValue)}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(gstr3b.section32.cgst)}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(gstr3b.section32.sgst)}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(gstr3b.section32.igst)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Credit Note Adjustments</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Taxable Value</Label>
                      <p className="font-mono font-medium text-orange-600 dark:text-orange-400" data-testid="text-cn-taxable">-{formatCurrency(gstr3b.creditNoteAdjustment.taxableValue)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">CGST Reversal</Label>
                      <p className="font-mono font-medium text-orange-600 dark:text-orange-400" data-testid="text-cn-cgst">-{formatCurrency(gstr3b.creditNoteAdjustment.cgst)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">SGST Reversal</Label>
                      <p className="font-mono font-medium text-orange-600 dark:text-orange-400" data-testid="text-cn-sgst">-{formatCurrency(gstr3b.creditNoteAdjustment.sgst)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">IGST Reversal</Label>
                      <p className="font-mono font-medium text-orange-600 dark:text-orange-400" data-testid="text-cn-igst">-{formatCurrency(gstr3b.creditNoteAdjustment.igst)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Net Tax Liability</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">CGST Payable</Label>
                      <p className="font-mono font-bold text-lg" data-testid="text-net-cgst">{formatCurrency(gstr3b.netTaxLiability.cgst)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">SGST Payable</Label>
                      <p className="font-mono font-bold text-lg" data-testid="text-net-sgst">{formatCurrency(gstr3b.netTaxLiability.sgst)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">IGST Payable</Label>
                      <p className="font-mono font-bold text-lg" data-testid="text-net-igst">{formatCurrency(gstr3b.netTaxLiability.igst)}</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
                      <Label className="text-xs text-muted-foreground">Total Payable</Label>
                      <p className="font-mono font-bold text-lg" data-testid="text-net-total">{formatCurrency(gstr3b.netTaxLiability.total)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* REVERSE GST TAB */}
        <TabsContent value="reverse" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Credit Notes" value={reverseGST.creditNotesCount} subtitle={formatCurrency(reverseGST.creditNotesTotal)} icon={<RotateCcw className="h-5 w-5" />} />
            <StatCard title="GST Reversed" value={formatCurrency(reverseGST.creditNotesGST)} subtitle="Total reversal" icon={<ArrowDownRight className="h-5 w-5" />} />
            <StatCard title="Returns" value={reverseGST.returnsCount} subtitle="Processing returns" icon={<AlertTriangle className="h-5 w-5" />} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Reverse GST Details</CardTitle></CardHeader>
            <CardContent>
              {reverseGST.items.length > 0 ? (
                <DataTable
                  columns={[
                    { key: 'type', header: 'Type', render: (r) => <Badge variant="outline" data-testid={`badge-reverse-type-${r.number}`}>{r.type}</Badge> },
                    { key: 'number', header: 'Number', render: (r) => <span className="font-mono text-sm" data-testid={`text-reverse-num-${r.number}`}>{r.number}</span> },
                    { key: 'amount', header: 'Amount', render: (r) => <span className="font-mono" data-testid={`text-reverse-amt-${r.number}`}>{formatCurrency(r.amount)}</span> },
                    { key: 'gstAmount', header: 'GST Reversed', render: (r) => <span className="font-mono text-orange-600 dark:text-orange-400" data-testid={`text-reverse-gst-${r.number}`}>-{formatCurrency(r.gstAmount)}</span> },
                    { key: 'reason', header: 'Reason', render: (r) => <span className="text-sm" data-testid={`text-reverse-reason-${r.number}`}>{r.reason}</span> },
                    { key: 'date', header: 'Date', render: (r) => <span data-testid={`text-reverse-date-${r.number}`}>{formatDate(r.date)}</span> },
                  ] as any}
                  data={reverseGST.items.map((item, i) => ({ ...item, id: i }))}
                  emptyMessage="No reverse GST entries"
                />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center" data-testid="text-no-reverse">No credit notes or returns with GST reversal in this period</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FILING STATUS TAB */}
        <TabsContent value="filing" className="space-y-6 mt-4">
          {loadingFiling ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" />Filing Status Tracker</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-muted-foreground">Period</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">GSTR-1 Status</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">GSTR-1 Due</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">GSTR-3B Status</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">GSTR-3B Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(filingStatus || []).map((entry) => (
                        <tr key={entry.month} className="border-b" data-testid={`row-filing-${entry.month}`}>
                          <td className="p-3 font-medium" data-testid={`text-filing-period-${entry.month}`}>{entry.label}</td>
                          <td className="p-3 text-center" data-testid={`filing-gstr1-status-${entry.month}`}>{filingBadge(entry.gstr1.status)}</td>
                          <td className="p-3 text-center text-xs text-muted-foreground" data-testid={`text-gstr1-due-${entry.month}`}>{formatDate(entry.gstr1.dueDate)}</td>
                          <td className="p-3 text-center" data-testid={`filing-gstr3b-status-${entry.month}`}>{filingBadge(entry.gstr3b.status)}</td>
                          <td className="p-3 text-center text-xs text-muted-foreground" data-testid={`text-gstr3b-due-${entry.month}`}>{formatDate(entry.gstr3b.dueDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* MISMATCHES TAB */}
        <TabsContent value="mismatches" className="space-y-6 mt-4">
          {loadingMismatches ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : mismatches && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <StatCard title="Total Mismatches" value={mismatches.totalMismatches} icon={<AlertTriangle className="h-5 w-5" />} />
                <StatCard title="High Severity" value={mismatches.highSeverity} subtitle="Requires immediate action" />
                <StatCard title="Medium Severity" value={mismatches.mediumSeverity} subtitle="Review recommended" />
                <StatCard title="Low Severity" value={mismatches.lowSeverity} subtitle="Informational" />
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Mismatch Report</CardTitle></CardHeader>
                <CardContent>
                  {mismatches.mismatches.length > 0 ? (
                    <DataTable
                      columns={[
                        { key: 'severity', header: 'Severity', render: (r) => severityBadge(r.severity) },
                        { key: 'type', header: 'Type', render: (r) => <Badge variant="outline" data-testid={`badge-mismatch-type-${r.invoiceNumber}`}>{r.type}</Badge> },
                        { key: 'invoiceNumber', header: 'Invoice', render: (r) => <span className="font-mono text-sm" data-testid={`text-mismatch-inv-${r.invoiceNumber}`}>{r.invoiceNumber}</span> },
                        { key: 'doctorName', header: 'Doctor' },
                        { key: 'gstin', header: 'GSTIN', render: (r) => <span className={`font-mono text-xs ${r.gstin === 'N/A' ? 'text-destructive' : ''}`}>{r.gstin}</span> },
                        { key: 'issue', header: 'Issue', render: (r) => <span className="text-sm" data-testid={`text-mismatch-issue-${r.invoiceNumber}`}>{r.issue}</span> },
                        { key: 'invoiceAmount', header: 'Amount', render: (r) => <span className="font-mono">{formatCurrency(r.invoiceAmount)}</span> },
                      ] as any}
                      data={mismatches.mismatches.map((m, i) => ({ ...m, id: i }))}
                      emptyMessage="No mismatches found - all data is consistent"
                    />
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                      <p className="font-medium" data-testid="text-no-mismatches">No mismatches found</p>
                      <p className="text-sm text-muted-foreground">All invoices and payments are consistent for this period</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* GSTIN VALIDATOR TAB */}
        <TabsContent value="gstin" className="space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" />GSTIN Validation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Validate GSTIN format and extract registration details. The validator checks format compliance, state code validity, and PAN structure.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                  <Input
                    value={gstinInput}
                    onChange={(e) => { setGstinInput(e.target.value.toUpperCase()); setGstinResult(null); }}
                    placeholder="Enter GSTIN (e.g., 27AAAAA0000A1Z5)"
                    className={`font-mono ${gstinResult ? (gstinResult.valid ? 'border-green-500' : 'border-destructive') : ''}`}
                    maxLength={15}
                    data-testid="input-gstin"
                  />
                </div>
                <Button onClick={() => validateMutation.mutate(gstinInput)} disabled={!gstinInput || validateMutation.isPending} data-testid="button-validate-gstin">
                  {validateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Validate
                </Button>
              </div>

              {gstinResult && (
                <Card className="mt-4">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      {gstinResult.valid ? (
                        <Badge variant="default" data-testid="badge-gstin-valid"><CheckCircle className="h-3 w-3 mr-1" />Valid GSTIN</Badge>
                      ) : (
                        <Badge variant="destructive" data-testid="badge-gstin-invalid"><AlertCircle className="h-3 w-3 mr-1" />Invalid GSTIN</Badge>
                      )}
                      <span className="text-sm text-muted-foreground" data-testid="text-gstin-message">{gstinResult.message}</span>
                    </div>

                    {gstinResult.details && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">GSTIN</Label>
                          <p className="font-mono font-medium" data-testid="text-gstin-full">{gstinResult.details.gstin}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">State</Label>
                          <p className="font-medium" data-testid="text-gstin-state">{gstinResult.details.stateName} ({gstinResult.details.stateCode})</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">PAN</Label>
                          <p className="font-mono font-medium" data-testid="text-gstin-pan">{gstinResult.details.pan}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Entity Code</Label>
                          <p className="font-mono font-medium" data-testid="text-gstin-entity">{gstinResult.details.entityType}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GSTReports;
