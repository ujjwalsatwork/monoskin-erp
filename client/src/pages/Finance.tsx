import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  IndianRupee,
  FileText,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Receipt,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill } from '@/components/shared/StatusPill';
import { PageHeader } from '@/components/shared/PageHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { Invoice, Doctor } from '@shared/schema';

interface KPIs {
  revenueMonth: number;
  revenueTrend: number;
  arAgeing30: number;
  arAgeing60: number;
  arAgeing90: number;
  pendingApprovals: number;
}

export default function Finance() {
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: kpis } = useQuery<KPIs>({
    queryKey: ['/api/dashboard/kpis'],
  });

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const pendingAmount = invoices.filter(i => i.status !== 'Paid').reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const overdueAmount = invoices.filter(i => i.status === 'Overdue').reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

  const recentInvoices = invoices.slice(0, 5);

  const cashFlowData = useMemo(() => {
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const getMonthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

    const monthlyInflows: Record<string, number> = {};
    const monthlyOutflows: Record<string, number> = {};

    invoices.forEach(inv => {
      const invDate = new Date(inv.createdAt);
      const key = getMonthKey(invDate);
      const amount = Number(inv.amount || 0);

      if (inv.status === 'Paid') {
        monthlyInflows[key] = (monthlyInflows[key] || 0) + amount;
      }
      monthlyOutflows[key] = (monthlyOutflows[key] || 0) + (amount * 0.35);
    });

    const months: { month: string; inflow: number; outflow: number; net: number; isForecast: boolean }[] = [];

    for (let i = 3; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(d);
      let inflow = monthlyInflows[key] || 0;
      let outflow = monthlyOutflows[key] || 0;


      months.push({
        month: monthNames[d.getMonth()],
        inflow: Math.round(inflow),
        outflow: Math.round(outflow),
        net: Math.round(inflow - outflow),
        isForecast: false,
      });
    }

    const recentInflows = months.map(m => m.inflow);
    const recentOutflows = months.map(m => m.outflow);
    const avgInflow = recentInflows.reduce((a, b) => a + b, 0) / (recentInflows.length || 1);
    const avgOutflow = recentOutflows.reduce((a, b) => a + b, 0) / (recentOutflows.length || 1);

    const inflowTrend = recentInflows.length >= 2 ? (recentInflows[recentInflows.length - 1] - recentInflows[0]) / (recentInflows.length - 1) : 0;
    const forecastInflow = Math.round(Math.max(0, avgInflow + inflowTrend * 0.5));
    const forecastOutflow = Math.round(Math.max(0, avgOutflow));

    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    months.push({
      month: `${monthNames[nextMonth.getMonth()]} (F)`,
      inflow: forecastInflow,
      outflow: forecastOutflow,
      net: forecastInflow - forecastOutflow,
      isForecast: true,
    });

    return months;
  }, [invoices, kpis, totalInvoiced]);

  const cashFlowSummary = useMemo(() => {
    const actuals = cashFlowData.filter(m => !m.isForecast);
    const forecast = cashFlowData.find(m => m.isForecast);
    const totalNet = actuals.reduce((sum, m) => sum + m.net, 0);
    const avgNet = actuals.length > 0 ? totalNet / actuals.length : 0;
    const lastMonth = actuals[actuals.length - 1];
    const prevMonth = actuals[actuals.length - 2];
    const trend = lastMonth && prevMonth ? ((lastMonth.net - prevMonth.net) / (prevMonth.net || 1)) * 100 : 0;
    return { totalNet, avgNet, forecast, trend };
  }, [cashFlowData]);

  const getDoctorName = (doctorId: number | null) => {
    if (!doctorId) return 'N/A';
    const doctor = doctors.find(d => d.id === doctorId);
    return doctor?.name || `Doctor #${doctorId}`;
  };

  if (invoicesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Finance Dashboard"
        description="Overview of financial operations and receivables"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenue (MTD)"
          value={formatCurrency(kpis?.revenueMonth || 0)}
          icon={<IndianRupee className="h-5 w-5" />}
          trend={kpis?.revenueTrend ? { value: kpis.revenueTrend, label: 'vs last month' } : undefined}
        />
        <StatCard
          title="Total Invoiced"
          value={formatCurrency(totalInvoiced)}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Pending Collection"
          value={formatCurrency(pendingAmount)}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Overdue Amount"
          value={formatCurrency(overdueAmount)}
          icon={<AlertTriangle className="h-5 w-5" />}
          className="border-destructive/30 bg-destructive/5"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-display">AR Ageing Overview</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/finance/ar-ageing">
              View Details <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="p-3 md:p-4 rounded-lg bg-success/10 border border-success/20">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-lg md:text-xl font-display font-semibold text-success">
                {formatCurrency(totalInvoiced - pendingAmount)}
              </p>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-xs text-muted-foreground">30 Days</p>
              <p className="text-lg md:text-xl font-display font-semibold text-warning">
                {formatCurrency(kpis?.arAgeing30 || 0)}
              </p>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-xs text-muted-foreground">60 Days</p>
              <p className="text-lg md:text-xl font-display font-semibold text-accent">
                {formatCurrency(kpis?.arAgeing60 || 0)}
              </p>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-muted-foreground">90+ Days</p>
              <p className="text-lg md:text-xl font-display font-semibold text-destructive">
                {formatCurrency(kpis?.arAgeing90 || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow Snapshot */}
      <Card data-testid="card-cash-flow-snapshot">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Cash Flow Snapshot
            </CardTitle>
            <CardDescription>Last 3 months actuals + next month forecast</CardDescription>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Avg Monthly Net</p>
              <p className="font-mono font-semibold text-sm" data-testid="text-avg-monthly-net">
                {formatCurrency(Math.round(cashFlowSummary.avgNet))}
              </p>
            </div>
            <Badge
              variant={cashFlowSummary.trend >= 0 ? 'default' : 'destructive'}
              className="gap-1"
              data-testid="badge-cash-flow-trend"
            >
              {cashFlowSummary.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(cashFlowSummary.trend).toFixed(1)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={cashFlowData} barGap={2} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => {
                      if (v >= 100000) return `${(v / 100000).toFixed(0)}L`;
                      if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                      return v;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'inflow' ? 'Inflow' : name === 'outflow' ? 'Outflow' : 'Net']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <Bar dataKey="inflow" name="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" name="Outflow" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {cashFlowData.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${item.isForecast ? 'border-dashed border-primary/40 bg-primary/5' : ''}`}
                  data-testid={`cashflow-month-${idx}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.month}</span>
                    {item.isForecast && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Forecast</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>In: {formatCurrency(item.inflow)}</span>
                    <span>Out: {formatCurrency(item.outflow)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    {item.net >= 0
                      ? <TrendingUp className="h-3 w-3 text-success" />
                      : <TrendingDown className="h-3 w-3 text-destructive" />
                    }
                    <span className={`text-sm font-mono font-semibold ${item.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {item.net >= 0 ? '+' : ''}{formatCurrency(item.net)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-display">Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/finance/invoices">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No invoices found</p>
              ) : (
                recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {getDoctorName(invoice.doctorId)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium">{formatCurrency(Number(invoice.amount))}</p>
                      <StatusPill status={invoice.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-display">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/finance/invoices">
                <FileText className="h-6 w-6" />
                <span>Invoices</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/finance/receipts">
                <Receipt className="h-6 w-6" />
                <span>Receipts</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/finance/ar-ageing">
                <Clock className="h-6 w-6" />
                <span>AR Ageing</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/finance/credit-notes">
                <CreditCard className="h-6 w-6" />
                <span>Credit Notes</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-display">Top Outstanding Accounts</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/finance/ar-ageing">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {doctors
              .filter(d => Number(d.outstanding || 0) > 0)
              .sort((a, b) => Number(b.outstanding || 0) - Number(a.outstanding || 0))
              .slice(0, 5)
              .map((doctor) => (
                <div
                  key={doctor.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-medium">{doctor.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium">{doctor.name}</p>
                      <p className="text-xs text-muted-foreground">{doctor.city}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-medium text-destructive">
                      {formatCurrency(Number(doctor.outstanding || 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Limit: {formatCurrency(Number(doctor.creditLimit || 0))}
                    </p>
                  </div>
                </div>
              ))}
            {doctors.filter(d => Number(d.outstanding || 0) > 0).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No outstanding accounts
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
