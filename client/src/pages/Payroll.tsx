import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign, Download, FileSpreadsheet, CheckCircle, Clock, Users,
  RefreshCw, Loader2, ChevronDown, ChevronRight, Eye, EyeOff,
  Send, AlertCircle, Calendar, Building2, TrendingUp, Banknote,
  Printer, Filter, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/PageHeader';
import { useToast } from '@/hooks/use-toast';
import type { Employee } from '@shared/schema';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEARS = ['2026', '2025', '2024'];

type SalaryStatus = 'draft' | 'generated' | 'approved' | 'disbursed';

interface SalaryRecord {
  employeeId: number;
  employeeCode: string;
  name: string;
  department: string;
  designation: string;
  basic: number;
  hra: number;
  allowances: number;
  gross: number;
  pf: number;
  tds: number;
  other_deductions: number;
  net: number;
  status: SalaryStatus;
  bankAccount?: string;
}

function computeSalary(employee: Employee): Omit<SalaryRecord, 'status' | 'bankAccount'> {
  const basic = 35000;
  const hra = Math.round(basic * 0.4);
  const allowances = 5000;
  const gross = basic + hra + allowances;
  const pf = Math.round(basic * 0.12);
  const tds = gross > 50000 ? Math.round(gross * 0.05) : 0;
  const other_deductions = 0;
  const net = gross - pf - tds - other_deductions;
  return {
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    name: employee.name,
    department: employee.department,
    designation: employee.role,
    basic,
    hra,
    allowances,
    gross,
    pf,
    tds,
    other_deductions,
    net,
  };
}

const statusConfig: Record<SalaryStatus, { label: string; color: string; icon: typeof Clock }> = {
  draft:     { label: 'Draft',     color: 'bg-muted text-muted-foreground',                                      icon: Clock },
  generated: { label: 'Generated', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',   icon: FileSpreadsheet },
  approved:  { label: 'Approved',  color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',icon: CheckCircle },
  disbursed: { label: 'Disbursed', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',icon: Banknote },
};

export default function Payroll() {
  const { toast } = useToast();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [sheetStatus, setSheetStatus] = useState<SalaryStatus>('draft');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showAmounts, setShowAmounts] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [slipDialogOpen, setSlipDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SalaryRecord | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const activeEmployees = employees.filter(e => e.status === 'Active');

  const [overrides, setOverrides] = useState<Record<number, Partial<SalaryRecord>>>({});

  const records: SalaryRecord[] = useMemo(() => {
    return activeEmployees.map(emp => {
      const computed = computeSalary(emp);
      const override = overrides[emp.id] || {};
      const merged = { ...computed, ...override };
      const net = merged.gross - merged.pf - merged.tds - merged.other_deductions;
      return { ...merged, net, status: sheetStatus };
    });
  }, [activeEmployees, overrides, sheetStatus]);

  const filtered = records.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.employeeCode.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'all' || r.department === deptFilter;
    return matchSearch && matchDept;
  });

  const departments = [...new Set(records.map(r => r.department))].sort();

  const totalGross = filtered.reduce((s, r) => s + r.gross, 0);
  const totalNet = filtered.reduce((s, r) => s + r.net, 0);
  const totalPF = filtered.reduce((s, r) => s + r.pf, 0);
  const totalTDS = filtered.reduce((s, r) => s + r.tds, 0);

  const fmt = (n: number) => showAmounts
    ? `₹${n.toLocaleString('en-IN')}`
    : '₹ ****';

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1200));
    setSheetStatus('generated');
    setGenerating(false);
    toast({ title: 'Salary Sheet Generated', description: `${filtered.length} employees — ${selectedMonth} ${selectedYear}` });
  };

  const handleApprove = () => {
    setSheetStatus('approved');
    toast({ title: 'Salary Sheet Approved', description: 'Ready for disbursement.' });
  };

  const handleDisburse = () => {
    setSheetStatus('disbursed');
    toast({ title: 'Salary Disbursed', description: `Salary for ${selectedMonth} ${selectedYear} marked as disbursed.` });
  };

  const handleDownloadCSV = () => {
    const header = 'Emp Code,Name,Department,Designation,Basic,HRA,Allowances,Gross,PF,TDS,Net Pay\n';
    const rows = filtered.map(r =>
      `${r.employeeCode},${r.name},${r.department},${r.designation},${r.basic},${r.hra},${r.allowances},${r.gross},${r.pf},${r.tds},${r.net}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-sheet-${selectedMonth}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV Downloaded', description: `salary-sheet-${selectedMonth}-${selectedYear}.csv` });
  };

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openSlip = (record: SalaryRecord) => {
    setSelectedRecord(record);
    setSlipDialogOpen(true);
  };

  const statusInfo = statusConfig[sheetStatus];
  const StatusIcon = statusInfo.icon;

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
        title="Payroll & Salary Generation"
        description="Generate, review, and disburse monthly salary sheets from the HR portal"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowAmounts(v => !v)} data-testid="button-toggle-amounts">
              {showAmounts ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showAmounts ? 'Hide' : 'Show'} Amounts
            </Button>
            {sheetStatus === 'generated' || sheetStatus === 'approved' || sheetStatus === 'disbursed' ? (
              <Button variant="outline" onClick={handleDownloadCSV} data-testid="button-download-csv">
                <Download className="h-4 w-4 mr-2" /> Download CSV
              </Button>
            ) : null}
            {sheetStatus === 'draft' && (
              <Button onClick={handleGenerate} disabled={generating} data-testid="button-generate-sheet">
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                {generating ? 'Generating…' : 'Generate Salary Sheet'}
              </Button>
            )}
            {sheetStatus === 'generated' && (
              <Button onClick={handleApprove} className="bg-amber-600 hover:bg-amber-700" data-testid="button-approve-sheet">
                <CheckCircle className="h-4 w-4 mr-2" /> Approve Sheet
              </Button>
            )}
            {sheetStatus === 'approved' && (
              <Button onClick={handleDisburse} className="bg-green-600 hover:bg-green-700" data-testid="button-disburse-sheet">
                <Send className="h-4 w-4 mr-2" /> Mark as Disbursed
              </Button>
            )}
          </div>
        }
      />

      {/* Month/Year Selector + Status */}
      <Card data-testid="card-period-selector">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Pay Period:</span>
            </div>
            <Select value={selectedMonth} onValueChange={m => { setSelectedMonth(m); setSheetStatus('draft'); }} data-testid="select-month">
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={y => { setSelectedYear(y); setSheetStatus('draft'); }} data-testid="select-year">
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 ml-auto">
              <StatusIcon className="h-4 w-4" />
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.color}`}
                data-testid="badge-sheet-status">
                {statusInfo.label}
              </span>
              {sheetStatus !== 'draft' && (
                <Button variant="ghost" size="sm" onClick={() => setSheetStatus('draft')} className="h-7 text-xs" data-testid="button-reset-status">
                  <RefreshCw className="h-3 w-3 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: filtered.length.toString(), icon: Users, color: 'text-primary', sub: `${activeEmployees.length} active` },
          { label: 'Total Gross Salary', value: fmt(totalGross), icon: TrendingUp, color: 'text-green-600', sub: `${selectedMonth} ${selectedYear}` },
          { label: 'Total Deductions', value: fmt(totalPF + totalTDS), icon: DollarSign, color: 'text-amber-600', sub: `PF + TDS` },
          { label: 'Net Payroll', value: fmt(totalNet), icon: Banknote, color: 'text-blue-600', sub: 'Take-home total' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <Card key={label} data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold font-mono leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  <p className="text-[10px] text-muted-foreground/70">{sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflow progress */}
      <Card data-testid="card-workflow-progress">
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-0">
            {(['draft', 'generated', 'approved', 'disbursed'] as SalaryStatus[]).map((step, idx, arr) => {
              const stepInfo = statusConfig[step];
              const StepIcon = stepInfo.icon;
              const isActive = sheetStatus === step;
              const isPast = arr.indexOf(sheetStatus) > idx;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center gap-1 flex-shrink-0 ${isActive ? 'text-primary' : isPast ? 'text-green-600' : 'text-muted-foreground/40'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                      ${isActive ? 'border-primary bg-primary/10' : isPast ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-muted'}`}>
                      <StepIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-medium">{stepInfo.label}</span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${isPast ? 'bg-green-400' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employee name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter} data-testid="select-dept-filter">
          <SelectTrigger className="w-44">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Salary Sheet Table */}
      <Card data-testid="card-salary-sheet">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            Salary Sheet — {selectedMonth} {selectedYear}
            <Badge className={`ml-2 text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No employees match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-salary-sheet">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide w-8"></th>
                    <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Employee</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Dept</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Basic</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">HRA</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Allow.</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Gross</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">PF</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">TDS</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide font-bold text-foreground">Net Pay</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((record) => {
                    const isExpanded = expandedRows.has(record.employeeId);
                    return (
                      <>
                        <tr
                          key={record.employeeId}
                          className="hover:bg-muted/30 transition-colors"
                          data-testid={`row-salary-${record.employeeId}`}
                        >
                          <td className="px-3 py-3">
                            <button onClick={() => toggleRow(record.employeeId)} className="text-muted-foreground hover:text-foreground transition-colors">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{record.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{record.employeeCode} · {record.designation}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-xs">{record.department}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">{fmt(record.basic)}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">{fmt(record.hra)}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">{fmt(record.allowances)}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-semibold">{fmt(record.gross)}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-red-600 dark:text-red-400">-{fmt(record.pf)}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-red-600 dark:text-red-400">-{fmt(record.tds)}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-bold text-green-700 dark:text-green-400">{fmt(record.net)}</td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => openSlip(record)}
                              data-testid={`button-slip-${record.employeeId}`}
                              title="View Salary Slip"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`expanded-${record.employeeId}`} className="bg-muted/20">
                            <td colSpan={11} className="px-8 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Earnings Breakdown</Label>
                                  <div className="mt-2 space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Basic</span><span className="font-mono">{fmt(record.basic)}</span></div>
                                    <div className="flex justify-between"><span>HRA</span><span className="font-mono">{fmt(record.hra)}</span></div>
                                    <div className="flex justify-between"><span>Special Allow.</span><span className="font-mono">{fmt(record.allowances)}</span></div>
                                    <div className="flex justify-between font-semibold border-t pt-1"><span>Gross</span><span className="font-mono">{fmt(record.gross)}</span></div>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Deductions</Label>
                                  <div className="mt-2 space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Provident Fund</span><span className="font-mono text-red-600">-{fmt(record.pf)}</span></div>
                                    <div className="flex justify-between"><span>TDS</span><span className="font-mono text-red-600">-{fmt(record.tds)}</span></div>
                                    <div className="flex justify-between"><span>Other</span><span className="font-mono text-red-600">-{fmt(record.other_deductions)}</span></div>
                                    <div className="flex justify-between font-semibold border-t pt-1 text-red-600"><span>Total</span><span className="font-mono">-{fmt(record.pf + record.tds + record.other_deductions)}</span></div>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Net Pay</Label>
                                  <div className="mt-2">
                                    <p className="text-2xl font-bold font-mono text-green-700 dark:text-green-400">{fmt(record.net)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Take-home for {selectedMonth}</p>
                                  </div>
                                  <div className="mt-3">
                                    <Progress value={Math.round((record.net / record.gross) * 100)} className="h-2" />
                                    <p className="text-[10px] text-muted-foreground mt-1">{Math.round((record.net / record.gross) * 100)}% of gross</p>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Actions</Label>
                                  <div className="mt-2 space-y-2">
                                    <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => openSlip(record)}
                                      data-testid={`button-view-slip-expanded-${record.employeeId}`}>
                                      <Printer className="h-3 w-3 mr-1" /> View Salary Slip
                                    </Button>
                                    <Button size="sm" variant="outline" className="w-full h-8 text-xs"
                                      onClick={() => toast({ title: 'Slip Sent', description: `Salary slip sent to ${record.name}` })}
                                      data-testid={`button-send-slip-${record.employeeId}`}>
                                      <Send className="h-3 w-3 mr-1" /> Send to Employee
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/50 font-semibold">
                    <td colSpan={3} className="px-4 py-3 text-sm">
                      <span className="text-muted-foreground">Total ({filtered.length} employees)</span>
                    </td>
                    <td colSpan={3} className="px-4 py-3 text-right font-mono text-sm">{fmt(totalGross)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{fmt(totalGross)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-red-600">-{fmt(totalPF)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-red-600">-{fmt(totalTDS)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-green-700 dark:text-green-400">{fmt(totalNet)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salary Slip Dialog */}
      <Dialog open={slipDialogOpen} onOpenChange={setSlipDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-salary-slip">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" /> Salary Slip
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 text-sm" data-testid="section-slip-content">
              {/* Header */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/15 text-center">
                <p className="font-bold text-lg text-primary">Monoskin Pharma Pvt. Ltd.</p>
                <p className="text-muted-foreground text-xs">Salary Slip — {selectedMonth} {selectedYear}</p>
              </div>
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
                <div><p className="text-xs text-muted-foreground">Employee</p><p className="font-semibold">{selectedRecord.name}</p></div>
                <div><p className="text-xs text-muted-foreground">Emp Code</p><p className="font-mono">{selectedRecord.employeeCode}</p></div>
                <div><p className="text-xs text-muted-foreground">Designation</p><p>{selectedRecord.designation}</p></div>
                <div><p className="text-xs text-muted-foreground">Department</p><p>{selectedRecord.department}</p></div>
              </div>
              {/* Earnings / Deductions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Earnings</p>
                  <div className="space-y-1.5">
                    {[
                      ['Basic Salary', selectedRecord.basic],
                      ['HRA', selectedRecord.hra],
                      ['Special Allowance', selectedRecord.allowances],
                    ].map(([l, v]) => (
                      <div key={l as string} className="flex justify-between">
                        <span className="text-muted-foreground">{l}</span>
                        <span className="font-mono">{fmt(v as number)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Gross Salary</span>
                      <span className="font-mono">{fmt(selectedRecord.gross)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Deductions</p>
                  <div className="space-y-1.5">
                    {[
                      ['Provident Fund (12%)', selectedRecord.pf],
                      ['TDS', selectedRecord.tds],
                      ['Other', selectedRecord.other_deductions],
                    ].map(([l, v]) => (
                      <div key={l as string} className="flex justify-between">
                        <span className="text-muted-foreground">{l}</span>
                        <span className="font-mono text-red-600">-{fmt(v as number)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold border-t pt-1 text-red-600">
                      <span>Total Deductions</span>
                      <span className="font-mono">-{fmt(selectedRecord.pf + selectedRecord.tds + selectedRecord.other_deductions)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Net Pay */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div>
                  <p className="text-xs text-muted-foreground">Net Take-Home Pay</p>
                  <p className="text-2xl font-bold font-mono text-green-700 dark:text-green-400">{fmt(selectedRecord.net)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                This is a computer-generated salary slip. No signature required.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlipDialogOpen(false)} data-testid="button-close-slip">Close</Button>
            <Button onClick={() => { toast({ title: 'Slip Sent', description: `Salary slip sent to ${selectedRecord?.name}` }); setSlipDialogOpen(false); }}
              data-testid="button-send-slip-dialog">
              <Send className="h-4 w-4 mr-2" /> Send to Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
