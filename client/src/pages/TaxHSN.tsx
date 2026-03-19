import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus, Percent, Loader2, Search, Tag, ToggleLeft, Filter, MoreHorizontal,
  Edit, Power, FileText, ShieldCheck, Info, Download, RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { TaxHSNCode } from '@shared/schema';

// ── Category config ────────────────────────────────────────────────────────
const HSN_CATEGORIES = ['Dermatology', 'Cosmetics', 'RX', 'Device', 'General', 'Nutraceutical', 'Surgical'] as const;
type HsnCategory = typeof HSN_CATEGORIES[number];

const CATEGORY_CONFIG: Record<HsnCategory, { color: string; bg: string; dot: string }> = {
  Dermatology:  { color: 'text-purple-700 dark:text-purple-300',  bg: 'bg-purple-100 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',  dot: 'bg-purple-500' },
  Cosmetics:    { color: 'text-pink-700 dark:text-pink-300',      bg: 'bg-pink-100 dark:bg-pink-950/50 border-pink-200 dark:border-pink-800',          dot: 'bg-pink-500' },
  RX:           { color: 'text-red-700 dark:text-red-300',        bg: 'bg-red-100 dark:bg-red-950/50 border-red-200 dark:border-red-800',              dot: 'bg-red-500' },
  Device:       { color: 'text-blue-700 dark:text-blue-300',      bg: 'bg-blue-100 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',          dot: 'bg-blue-500' },
  General:      { color: 'text-slate-700 dark:text-slate-300',    bg: 'bg-slate-100 dark:bg-slate-950/50 border-slate-200 dark:border-slate-700',      dot: 'bg-slate-400' },
  Nutraceutical:{ color: 'text-green-700 dark:text-green-300',    bg: 'bg-green-100 dark:bg-green-950/50 border-green-200 dark:border-green-800',      dot: 'bg-green-500' },
  Surgical:     { color: 'text-orange-700 dark:text-orange-300',  bg: 'bg-orange-100 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800',  dot: 'bg-orange-500' },
};

function CategoryBadge({ category }: { category: string | null | undefined }) {
  const cat = (category || 'General') as HsnCategory;
  const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.General;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cat}
    </span>
  );
}

// ── RCM badge ──────────────────────────────────────────────────────────────
function RcmBadge({ active }: { active: boolean }) {
  if (!active) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
      <ShieldCheck className="h-3 w-3" /> RCM
    </span>
  );
}

// ── Empty form state ───────────────────────────────────────────────────────
type FormState = {
  hsnCode: string;
  description: string;
  gstRate: string;
  cgst: string;
  sgst: string;
  igst: string;
  category: string;
  isRcm: boolean;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  hsnCode: '', description: '', gstRate: '', cgst: '', sgst: '', igst: '',
  category: 'General', isRcm: false, isActive: true,
};

// ── Main component ─────────────────────────────────────────────────────────
const TaxHSN = () => {
  const { toast } = useToast();

  // Filter / search state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [rcmFilter, setRcmFilter] = useState<'all' | 'rcm' | 'non-rcm'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: taxCodes = [], isLoading } = useQuery<TaxHSNCode[]>({
    queryKey: ['/api/tax-hsn-codes'],
  });

  // ── Mutations ──────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('POST', '/api/tax-hsn-codes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tax-hsn-codes'] });
      toast({ title: 'HSN Code Created', description: `${form.hsnCode} — ${form.category} category added.` });
      setDialogOpen(false);
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create HSN code', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest('PATCH', `/api/tax-hsn-codes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tax-hsn-codes'] });
      toast({ title: 'HSN Code Updated' });
      setDialogOpen(false);
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update HSN code', variant: 'destructive' }),
  });

  // Inline RCM toggle (no dialog needed)
  const rcmToggleMutation = useMutation({
    mutationFn: ({ id, isRcm }: { id: number; isRcm: boolean }) =>
      apiRequest('PATCH', `/api/tax-hsn-codes/${id}`, { isRcm }),
    onSuccess: (_, { isRcm }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tax-hsn-codes'] });
      toast({ title: isRcm ? 'RCM Enabled' : 'RCM Disabled', description: 'Reverse Charge Mechanism updated.' });
    },
    onError: () => toast({ title: 'Error', description: 'Could not toggle RCM', variant: 'destructive' }),
  });

  // ── Filter logic ───────────────────────────────────────────────────────
  const filtered = taxCodes.filter(c => {
    const q = search.toLowerCase();
    if (q && !c.hsnCode.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
    if (categoryFilter !== 'all' && (c.category || 'General') !== categoryFilter) return false;
    if (rcmFilter === 'rcm' && !c.isRcm) return false;
    if (rcmFilter === 'non-rcm' && c.isRcm) return false;
    if (statusFilter === 'active' && !c.isActive) return false;
    if (statusFilter === 'inactive' && c.isActive) return false;
    return true;
  });

  // ── Stats ──────────────────────────────────────────────────────────────
  const rcmCount   = taxCodes.filter(c => c.isRcm).length;
  const activeCount = taxCodes.filter(c => c.isActive).length;
  const avgGst     = taxCodes.length > 0 ? (taxCodes.reduce((s, c) => s + Number(c.gstRate), 0) / taxCodes.length).toFixed(1) : '0.0';

  // Category breakdown for the audit panel
  const categoryBreakdown = HSN_CATEGORIES.map(cat => ({
    cat,
    count: taxCodes.filter(c => (c.category || 'General') === cat).length,
    rcm:   taxCodes.filter(c => (c.category || 'General') === cat && c.isRcm).length,
  })).filter(x => x.count > 0);

  // ── Dialog helpers ─────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (code: TaxHSNCode) => {
    setEditingId(code.id);
    setForm({
      hsnCode: code.hsnCode,
      description: code.description,
      gstRate: String(code.gstRate),
      cgst: String(code.cgst),
      sgst: String(code.sgst),
      igst: String(code.igst),
      category: code.category || 'General',
      isRcm: code.isRcm,
      isActive: code.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      hsnCode: form.hsnCode,
      description: form.description,
      gstRate: form.gstRate,
      cgst: form.cgst,
      sgst: form.sgst,
      igst: form.igst,
      category: form.category,
      isRcm: form.isRcm,
      isActive: form.isActive,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── GST auto-split ─────────────────────────────────────────────────────
  const handleGstChange = (v: string) => {
    const rate = parseFloat(v) || 0;
    const half = (rate / 2).toFixed(2);
    setForm(f => ({ ...f, gstRate: v, cgst: half, sgst: half, igst: v }));
  };

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ['HSN Code', 'Description', 'Category', 'GST%', 'CGST%', 'SGST%', 'IGST%', 'RCM', 'Status'];
    const rows = filtered.map(c => [
      c.hsnCode, `"${c.description}"`, c.category || 'General',
      c.gstRate, c.cgst, c.sgst, c.igst,
      c.isRcm ? 'Yes' : 'No', c.isActive ? 'Active' : 'Inactive',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'hsn_master.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${filtered.length} HSN codes exported to CSV.` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Tax / HSN Master"
          description="Audit-ready HSN code management with category tagging and RCM rules"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport} data-testid="button-export-hsn">
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button onClick={openCreate} data-testid="button-create-hsn">
                <Plus className="h-4 w-4 mr-2" /> Add HSN Code
              </Button>
            </div>
          }
        />

        {/* ── KPI Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total HSN Codes" value={taxCodes.length.toString()} subtitle="Configured" color="blue" />
          <StatCard title="Active Codes"     value={activeCount.toString()}      subtitle="In use"     color="green" />
          <StatCard title="RCM Applicable"   value={rcmCount.toString()}          subtitle="Reverse charge" color="yellow" />
          <StatCard title="Avg GST Rate"     value={`${avgGst}%`}                subtitle="Average" color="pink" />
        </div>

        {/* ── Audit Summary Panel ── */}
        <Card data-testid="card-audit-summary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Category Distribution — Audit Overview
            </CardTitle>
            <CardDescription className="text-xs">
              Category-wise HSN breakdown with RCM indicators for compliance reporting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categoryBreakdown.map(({ cat, count, rcm }) => {
                const cfg = CATEGORY_CONFIG[cat as HsnCategory] ?? CATEGORY_CONFIG.General;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
                    className={[
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                      categoryFilter === cat
                        ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1 ring-current`
                        : 'border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                    data-testid={`filter-category-${cat.toLowerCase()}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span>{cat}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 ml-1">{count}</Badge>
                    {rcm > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                            <ShieldCheck className="h-2.5 w-2.5" />{rcm}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{rcm} RCM code{rcm > 1 ? 's' : ''}</TooltipContent>
                      </Tooltip>
                    )}
                  </button>
                );
              })}
              {categoryBreakdown.length === 0 && (
                <p className="text-xs text-muted-foreground">No categories assigned yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search HSN code or description…"
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-hsn"
            />
          </div>

          <Select value={rcmFilter} onValueChange={v => setRcmFilter(v as typeof rcmFilter)} data-testid="select-rcm-filter">
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All RCM</SelectItem>
              <SelectItem value="rcm">RCM Only</SelectItem>
              <SelectItem value="non-rcm">Non-RCM</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)} data-testid="select-status-filter">
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {(categoryFilter !== 'all' || rcmFilter !== 'all' || statusFilter !== 'all' || search) && (
            <button
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={() => { setCategoryFilter('all'); setRcmFilter('all'); setStatusFilter('all'); setSearch(''); }}
              data-testid="btn-clear-filters"
            >
              Clear all
            </button>
          )}

          <span className="text-xs text-muted-foreground ml-auto">
            Showing {filtered.length} of {taxCodes.length}
          </span>
        </div>

        {/* ── Main Table ── */}
        <Card data-testid="card-hsn-table">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">HSN Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead className="text-right w-20">GST %</TableHead>
                    <TableHead className="text-right w-16">CGST</TableHead>
                    <TableHead className="text-right w-16">SGST</TableHead>
                    <TableHead className="text-right w-16">IGST</TableHead>
                    <TableHead className="w-24 text-center">
                      <div className="flex items-center justify-center gap-1">
                        RCM
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] text-xs">
                            Reverse Charge Mechanism — applicable for B2B pharma transactions where the buyer pays GST directly
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableHead>
                    <TableHead className="w-20 text-center">Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                        <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No HSN codes match your filters.</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={openCreate} data-testid="btn-add-hsn-empty">
                          <Plus className="h-4 w-4 mr-2" /> Add HSN Code
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(code => (
                      <TableRow
                        key={code.id}
                        className={`group ${!code.isActive ? 'opacity-50' : ''}`}
                        data-testid={`row-hsn-${code.id}`}
                      >
                        <TableCell>
                          <span className="font-mono font-semibold text-sm" data-testid={`text-hsn-${code.id}`}>
                            {code.hsnCode}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm truncate" title={code.description}>{code.description}</p>
                        </TableCell>
                        <TableCell>
                          <CategoryBadge category={code.category} />
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono font-semibold text-primary">{Number(code.gstRate)}%</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm text-muted-foreground">{Number(code.cgst)}%</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm text-muted-foreground">{Number(code.sgst)}%</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm text-muted-foreground">{Number(code.igst)}%</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={code.isRcm}
                              onCheckedChange={v => rcmToggleMutation.mutate({ id: code.id, isRcm: v })}
                              disabled={rcmToggleMutation.isPending}
                              data-testid={`switch-rcm-${code.id}`}
                              className="scale-75"
                            />
                            {code.isRcm && <RcmBadge active />}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            code.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                          }`} data-testid={`badge-status-${code.id}`}>
                            {code.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                data-testid={`menu-hsn-${code.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(code)} data-testid={`action-edit-${code.id}`}>
                                <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => rcmToggleMutation.mutate({ id: code.id, isRcm: !code.isRcm })}
                                data-testid={`action-rcm-${code.id}`}
                              >
                                <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                                {code.isRcm ? 'Remove RCM' : 'Enable RCM'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => updateMutation.mutate({ id: code.id, data: { isActive: !code.isActive } })}
                                className={code.isActive ? 'text-destructive focus:text-destructive' : ''}
                                data-testid={`action-toggle-status-${code.id}`}
                              >
                                <Power className="h-3.5 w-3.5 mr-2" />
                                {code.isActive ? 'Deactivate' : 'Reactivate'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── Add / Edit Dialog ── */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                {editingId ? 'Edit HSN Code' : 'Add HSN Code'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-2">
              {/* HSN Code */}
              <div className="space-y-1.5 col-span-1">
                <Label>HSN Code <span className="text-destructive">*</span></Label>
                <Input
                  value={form.hsnCode}
                  onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))}
                  placeholder="e.g. 3304"
                  data-testid="input-hsn-code"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5 col-span-1">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))} data-testid="select-category">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HSN_CATEGORIES.map(cat => {
                      const cfg = CATEGORY_CONFIG[cat];
                      return (
                        <SelectItem key={cat} value={cat}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            {cat}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-1.5 col-span-2">
                <Label>Description <span className="text-destructive">*</span></Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Beauty or make-up preparations"
                  rows={2}
                  data-testid="input-description"
                />
              </div>

              {/* GST Rate (auto-splits) */}
              <div className="space-y-1.5 col-span-2">
                <Label>GST Rate (%) <span className="text-destructive">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={form.gstRate}
                    onChange={e => handleGstChange(e.target.value)}
                    placeholder="e.g. 18"
                    data-testid="input-gst-rate"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-3 rounded-md whitespace-nowrap">
                        <RefreshCw className="h-3 w-3" /> auto-splits
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">CGST & SGST are set to GST/2; IGST mirrors GST total</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* CGST / SGST / IGST */}
              {[
                { field: 'cgst' as const, label: 'CGST (%)' },
                { field: 'sgst' as const, label: 'SGST (%)' },
                { field: 'igst' as const, label: 'IGST (%)' },
              ].map(({ field, label }) => (
                <div key={field} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    data-testid={`input-${field}`}
                  />
                </div>
              ))}

              {/* RCM Toggle */}
              <div className="col-span-2">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-600" />
                      <Label className="text-sm font-semibold text-amber-800 dark:text-amber-200 cursor-pointer"
                        htmlFor="rcm-toggle">
                        Reverse Charge Mechanism (RCM)
                      </Label>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 pl-6">
                      Enable for B2B pharma transactions where buyer pays GST directly to govt.
                    </p>
                  </div>
                  <Switch
                    id="rcm-toggle"
                    checked={form.isRcm}
                    onCheckedChange={v => setForm(f => ({ ...f, isRcm: v }))}
                    data-testid="switch-rcm-form"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="col-span-2 flex items-center justify-between px-1">
                <Label className="text-sm" htmlFor="active-toggle">Active</Label>
                <Switch
                  id="active-toggle"
                  checked={form.isActive}
                  onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
                  data-testid="switch-active-form"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={isSaving || !form.hsnCode || !form.description || !form.gstRate}
                data-testid="btn-save-hsn"
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingId ? 'Save Changes' : 'Create HSN Code'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default TaxHSN;
