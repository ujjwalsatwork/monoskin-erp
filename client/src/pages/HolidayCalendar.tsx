import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Edit2, Trash2,
  Sun, Building2, Lock, Star, Filter, Loader2, Info, Search, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/shared/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { CompanyHoliday } from '@shared/schema';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const HOLIDAY_TYPES = [
  { value: 'public',     label: 'Public Holiday',     icon: Sun,      bg: 'bg-red-100 dark:bg-red-950/40',     text: 'text-red-700 dark:text-red-300',     dot: 'bg-red-500',     border: 'border-red-200 dark:border-red-800' },
  { value: 'company',    label: 'Company Holiday',    icon: Building2, bg: 'bg-primary/10',                   text: 'text-primary',                       dot: 'bg-primary',     border: 'border-primary/25' },
  { value: 'restricted', label: 'Restricted Holiday', icon: Lock,     bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500',   border: 'border-amber-200 dark:border-amber-800' },
];

function getTypeConfig(type: string) {
  return HOLIDAY_TYPES.find(t => t.value === type) ?? HOLIDAY_TYPES[0];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

interface MiniCalendarProps {
  year: number;
  month: number;
  holidays: CompanyHoliday[];
  onDayClick?: (date: Date) => void;
}

function MiniCalendar({ year, month, holidays, onDayClick }: MiniCalendarProps) {
  const days = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = new Date();

  const holidayMap = useMemo(() => {
    const map = new Map<number, CompanyHoliday[]>();
    holidays.forEach(h => {
      const d = new Date(h.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        const existing = map.get(day) || [];
        map.set(day, [...existing, h]);
      }
    });
    return map;
  }, [holidays, year, month]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_ABBR.map(d => (
          <div key={d} className="text-center text-[9px] font-semibold text-muted-foreground py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const hs = holidayMap.get(day) || [];
          const isHoliday = hs.length > 0;
          const isSunday = (firstDay + day - 1) % 7 === 0;
          const isSaturday = (firstDay + day - 1) % 7 === 6;

          return (
            <TooltipProvider key={idx} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onDayClick && onDayClick(new Date(year, month, day))}
                    className={[
                      'relative flex flex-col items-center py-0.5 rounded text-[11px] leading-tight transition-colors',
                      isToday(day) ? 'bg-primary text-primary-foreground font-bold' : '',
                      !isToday(day) && isHoliday ? 'font-semibold' : '',
                      !isToday(day) && (isSunday || isSaturday) ? 'text-muted-foreground/60' : '',
                      !isToday(day) && !isHoliday ? 'hover:bg-muted' : '',
                      !isToday(day) && isHoliday ? 'hover:bg-muted/60' : '',
                    ].join(' ')}
                    data-testid={`day-${year}-${month + 1}-${day}`}
                  >
                    <span>{day}</span>
                    {isHoliday && (
                      <span className="flex gap-0.5 mt-0.5">
                        {hs.slice(0, 2).map((h, i) => (
                          <span key={i} className={`w-1 h-1 rounded-full ${getTypeConfig(h.type).dot}`} />
                        ))}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                {isHoliday && (
                  <TooltipContent side="top" className="max-w-[180px]">
                    {hs.map(h => (
                      <div key={h.id} className="text-xs">
                        <span className="font-medium">{h.name}</span>
                        <span className="text-muted-foreground ml-1">({h.type})</span>
                        {h.isOptional && <span className="ml-1 text-amber-500">[Optional]</span>}
                      </div>
                    ))}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}

const EMPTY_FORM = { name: '', date: '', type: 'public', isOptional: false };

export default function HolidayCalendar() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [typeFilter, setTypeFilter] = useState('all');
  const [optionalFilter, setOptionalFilter] = useState<'all' | 'optional' | 'mandatory'>('all');
  const [search, setSearch] = useState('');
  const [listView, setListView] = useState<'month' | 'list'>('month');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CompanyHoliday | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyHoliday | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data: holidays = [], isLoading } = useQuery<CompanyHoliday[]>({
    queryKey: ['/api/company-holidays', { year: selectedYear }],
    queryFn: () => fetch(`/api/company-holidays?year=${selectedYear}`, { credentials: 'include' }).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) =>
      apiRequest('POST', '/api/company-holidays', {
        name: data.name,
        date: new Date(data.date).toISOString(),
        type: data.type,
        isOptional: data.isOptional,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company-holidays'] });
      setDialogOpen(false);
      toast({ title: 'Holiday added', description: `${form.name} added to the calendar.` });
    },
    onError: () => toast({ title: 'Error', description: 'Could not add holiday.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof EMPTY_FORM }) =>
      apiRequest('PATCH', `/api/company-holidays/${id}`, {
        name: data.name,
        date: new Date(data.date).toISOString(),
        type: data.type,
        isOptional: data.isOptional,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company-holidays'] });
      setDialogOpen(false);
      setEditingHoliday(null);
      toast({ title: 'Holiday updated' });
    },
    onError: () => toast({ title: 'Error', description: 'Could not update holiday.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/company-holidays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company-holidays'] });
      setDeleteTarget(null);
      toast({ title: 'Holiday deleted' });
    },
    onError: () => toast({ title: 'Error', description: 'Could not delete holiday.', variant: 'destructive' }),
  });

  const openAdd = (prefillDate?: Date) => {
    setEditingHoliday(null);
    setForm({
      ...EMPTY_FORM,
      date: prefillDate ? prefillDate.toISOString().slice(0, 10) : '',
    });
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (h: CompanyHoliday) => {
    setEditingHoliday(h);
    setForm({
      name: h.name,
      date: new Date(h.date).toISOString().slice(0, 10),
      type: h.type,
      isOptional: h.isOptional ?? false,
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { setFormError('Holiday name is required.'); return; }
    if (!form.date) { setFormError('Please select a date.'); return; }
    setFormError('');
    if (editingHoliday) {
      updateMutation.mutate({ id: editingHoliday.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = useMemo(() => {
    let list = [...holidays];
    if (typeFilter !== 'all') list = list.filter(h => h.type === typeFilter);
    if (optionalFilter === 'optional') list = list.filter(h => h.isOptional);
    if (optionalFilter === 'mandatory') list = list.filter(h => !h.isOptional);
    if (search) list = list.filter(h => h.name.toLowerCase().includes(search.toLowerCase()));
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays, typeFilter, optionalFilter, search]);

  const byMonth = useMemo(() => {
    const map = new Map<number, CompanyHoliday[]>();
    for (let m = 0; m < 12; m++) map.set(m, []);
    filtered.forEach(h => {
      const month = new Date(h.date).getMonth();
      map.get(month)!.push(h);
    });
    return map;
  }, [filtered]);

  const stats = useMemo(() => ({
    total: holidays.length,
    public: holidays.filter(h => h.type === 'public').length,
    company: holidays.filter(h => h.type === 'company').length,
    restricted: holidays.filter(h => h.type === 'restricted').length,
    optional: holidays.filter(h => h.isOptional).length,
    upcoming: holidays.filter(h => new Date(h.date) >= new Date()).length,
  }), [holidays]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Holiday Calendar"
        description={`Official holiday schedule for ${selectedYear} — visible to all employees`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 border rounded-md overflow-hidden">
              <Button size="sm" variant={listView === 'month' ? 'default' : 'ghost'}
                className="rounded-none h-8 px-3" onClick={() => setListView('month')} data-testid="btn-view-month">
                <CalendarDays className="h-4 w-4 mr-1" /> Calendar
              </Button>
              <Button size="sm" variant={listView === 'list' ? 'default' : 'ghost'}
                className="rounded-none h-8 px-3" onClick={() => setListView('list')} data-testid="btn-view-list">
                <Filter className="h-4 w-4 mr-1" /> List
              </Button>
            </div>
            <Button onClick={() => openAdd()} data-testid="button-add-holiday">
              <Plus className="h-4 w-4 mr-2" /> Add Holiday
            </Button>
          </div>
        }
      />

      {/* Year picker + Stats */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setSelectedYear(y => y - 1)} data-testid="btn-prev-year">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-base font-semibold w-12 text-center" data-testid="text-selected-year">{selectedYear}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setSelectedYear(y => y + 1)} data-testid="btn-next-year">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 ml-auto">
          {[
            { label: 'Total', value: stats.total, className: 'bg-muted text-foreground' },
            { label: 'Public', value: stats.public, className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
            { label: 'Company', value: stats.company, className: 'bg-primary/10 text-primary' },
            { label: 'Restricted', value: stats.restricted, className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
            { label: 'Optional', value: stats.optional, className: 'bg-muted text-muted-foreground' },
          ].map(({ label, value, className }) => (
            <span key={label} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${className}`}
              data-testid={`stat-${label.toLowerCase()}`}>
              {label}: <strong>{value}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 items-center text-xs text-muted-foreground">
        <span className="font-medium">Legend:</span>
        {HOLIDAY_TYPES.map(({ value, label, dot }) => (
          <span key={value} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <Star className="h-3 w-3 text-amber-500" /> Optional
        </span>
      </div>

      {/* Filters for list view */}
      {listView === 'list' && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search holidays…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9" data-testid="input-search" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter} data-testid="select-type-filter">
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {HOLIDAY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={optionalFilter} onValueChange={v => setOptionalFilter(v as typeof optionalFilter)} data-testid="select-optional-filter">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Mandatory / Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Holidays</SelectItem>
              <SelectItem value="optional">Optional Only</SelectItem>
              <SelectItem value="mandatory">Mandatory Only</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filtered.length} holiday{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : listView === 'month' ? (
        /* 12-month Calendar Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="grid-calendar">
          {MONTH_NAMES.map((monthName, m) => {
            const monthHolidays = byMonth.get(m) || [];
            const allHolidays = holidays.filter(h => new Date(h.date).getMonth() === m);
            const isCurrentMonth = new Date().getMonth() === m && new Date().getFullYear() === selectedYear;
            return (
              <Card key={m}
                className={`transition-shadow hover:shadow-md ${isCurrentMonth ? 'ring-2 ring-primary/40' : ''}`}
                data-testid={`card-month-${m}`}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className={`text-sm font-semibold ${isCurrentMonth ? 'text-primary' : ''}`}>
                      {monthName}
                      {isCurrentMonth && <span className="ml-1 text-[10px] font-normal text-primary">(current)</span>}
                    </CardTitle>
                    {allHolidays.length > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                        {allHolidays.length}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <MiniCalendar
                    year={selectedYear}
                    month={m}
                    holidays={holidays}
                    onDayClick={(d) => openAdd(d)}
                  />
                  {allHolidays.length > 0 && (
                    <div className="mt-3 space-y-1 border-t pt-2">
                      {allHolidays.slice(0, 3).map(h => {
                        const cfg = getTypeConfig(h.type);
                        return (
                          <div key={h.id}
                            className={`flex items-center gap-2 text-[11px] px-2 py-1 rounded-md cursor-pointer hover:opacity-80 transition-opacity ${cfg.bg} ${cfg.border} border`}
                            onClick={() => openEdit(h)}
                            data-testid={`holiday-chip-${h.id}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <span className={`flex-1 truncate font-medium ${cfg.text}`}>{h.name}</span>
                            <span className="text-muted-foreground flex-shrink-0">
                              {new Date(h.date).getDate()}
                            </span>
                            {h.isOptional && <Star className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" />}
                          </div>
                        );
                      })}
                      {allHolidays.length > 3 && (
                        <p className="text-[10px] text-muted-foreground pl-2">+{allHolidays.length - 3} more</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-6" data-testid="section-list-view">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mb-4 opacity-30" />
                <p className="font-medium">No holidays found</p>
                <p className="text-sm mt-1">Try adjusting your filters or add a new holiday.</p>
                <Button className="mt-4" onClick={() => openAdd()} data-testid="btn-add-empty">
                  <Plus className="h-4 w-4 mr-2" /> Add Holiday
                </Button>
              </CardContent>
            </Card>
          ) : (
            (() => {
              const grouped = new Map<number, CompanyHoliday[]>();
              filtered.forEach(h => {
                const m = new Date(h.date).getMonth();
                grouped.set(m, [...(grouped.get(m) || []), h]);
              });
              return Array.from(grouped.entries())
                .sort(([a], [b]) => a - b)
                .map(([month, mHolidays]) => (
                  <div key={month} data-testid={`group-month-${month}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        {MONTH_NAMES[month]}
                      </h3>
                      <div className="flex-1 border-t" />
                      <span className="text-xs text-muted-foreground">{mHolidays.length}</span>
                    </div>
                    <div className="space-y-2">
                      {mHolidays.map(h => {
                        const cfg = getTypeConfig(h.type);
                        const TypeIcon = cfg.icon;
                        const d = new Date(h.date);
                        const isPast = d < new Date();
                        return (
                          <Card key={h.id}
                            className={`border transition-shadow hover:shadow-sm ${isPast ? 'opacity-60' : ''}`}
                            data-testid={`row-holiday-${h.id}`}>
                            <CardContent className="p-0">
                              <div className="flex items-center gap-4 px-4 py-3">
                                {/* Date box */}
                                <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center ${cfg.bg} ${cfg.border} border`}>
                                  <span className={`text-xs font-medium leading-none ${cfg.text}`}>
                                    {d.toLocaleString('default', { month: 'short' })}
                                  </span>
                                  <span className={`text-lg font-bold leading-tight ${cfg.text}`}>{d.getDate()}</span>
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium text-sm" data-testid={`text-holiday-name-${h.id}`}>{h.name}</p>
                                    {h.isOptional && (
                                      <Badge variant="outline" className="text-[10px] h-5 gap-1 border-amber-400 text-amber-600">
                                        <Star className="h-2.5 w-2.5" /> Optional
                                      </Badge>
                                    )}
                                    {isPast && <Badge variant="secondary" className="text-[10px] h-5">Past</Badge>}
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs text-muted-foreground">
                                      {d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                                {/* Type badge */}
                                <span className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                                  <TypeIcon className="h-3 w-3" />
                                  {cfg.label.replace(' Holiday', '')}
                                </span>
                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8"
                                    onClick={() => openEdit(h)} data-testid={`btn-edit-${h.id}`}>
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteTarget(h)} data-testid={`btn-delete-${h.id}`}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ));
            })()
          )}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setEditingHoliday(null); }}>
        <DialogContent className="max-w-md" data-testid="dialog-holiday-form">
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add Company Holiday'}</DialogTitle>
            <DialogDescription>
              {editingHoliday ? 'Update the holiday details below.' : 'Add a new holiday to the company calendar. It will be visible to all employees.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="holiday-name">Holiday Name <span className="text-destructive">*</span></Label>
              <Input
                id="holiday-name"
                placeholder="e.g. Diwali, Republic Day"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                data-testid="input-holiday-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holiday-date">Date <span className="text-destructive">*</span></Label>
              <Input
                id="holiday-date"
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                data-testid="input-holiday-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holiday-type">Holiday Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))} data-testid="select-holiday-type">
                <SelectTrigger id="holiday-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOLIDAY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {form.type === 'public' && 'National / state government declared holiday.'}
                {form.type === 'company' && 'Company-wide day off for all employees.'}
                {form.type === 'restricted' && 'Employees may choose from a list of restricted holidays.'}
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <Switch
                id="holiday-optional"
                checked={form.isOptional}
                onCheckedChange={v => setForm(f => ({ ...f, isOptional: v }))}
                data-testid="switch-holiday-optional"
              />
              <div>
                <Label htmlFor="holiday-optional" className="text-sm cursor-pointer">Optional Holiday</Label>
                <p className="text-[11px] text-muted-foreground">Employees can choose whether to take this day off.</p>
              </div>
            </div>
            {formError && (
              <div className="flex items-center gap-2 text-destructive text-sm p-2 bg-destructive/10 rounded-md">
                <Info className="h-4 w-4 flex-shrink-0" />
                {formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="btn-cancel-holiday">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} data-testid="btn-save-holiday">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingHoliday ? 'Save Changes' : 'Add Holiday'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="dialog-delete-holiday">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong> from the {selectedYear} calendar.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              data-testid="btn-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
