import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  ClipboardList, Bell, Send, Plus, CheckCircle, Clock, Loader2, AlertTriangle,
  ArrowUpCircle, ArrowDownCircle, Minus, Search, Filter, X, Edit2, Trash2,
  Users, MessageSquare, Calendar, ChevronDown, MoreHorizontal, RefreshCw
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { ComplianceItem, Employee } from '@shared/schema';

const TEAMS = ['Accounts', 'HR', 'Manufacturing', 'IT', 'Logistics', 'Management', 'Operations', 'Quality', 'Finance'];

const TASK_STATUS = [
  { value: 'todo',        label: 'Pending',    color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',  dot: 'bg-amber-500',  border: 'border-amber-200 dark:border-amber-800' },
  { value: 'in-progress', label: 'Ongoing',    color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',     dot: 'bg-blue-500',   border: 'border-blue-200 dark:border-blue-800' },
  { value: 'done',        label: 'Completed',  color: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300', dot: 'bg-green-500',  border: 'border-green-200 dark:border-green-800' },
  { value: 'blocked',     label: 'Blocked',    color: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',         dot: 'bg-red-500',    border: 'border-red-200 dark:border-red-800' },
];

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', icon: ArrowUpCircle, color: 'text-destructive' },
  high:     { label: 'High',     icon: ArrowUpCircle, color: 'text-orange-500' },
  medium:   { label: 'Medium',   icon: Minus,         color: 'text-muted-foreground' },
  low:      { label: 'Low',      icon: ArrowDownCircle, color: 'text-blue-400' },
};

function getStatusConfig(status: string) {
  return TASK_STATUS.find(s => s.value === status) ?? TASK_STATUS[0];
}
function getPriorityConfig(priority: string) {
  return PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
}
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
function formatDate(d: string | Date | null | undefined) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function isOverdue(item: ComplianceItem) {
  return item.taskStatus !== 'done' && new Date(item.dueDate) < new Date();
}
function isDueSoon(item: ComplianceItem) {
  if (item.taskStatus === 'done') return false;
  const days = (new Date(item.dueDate).getTime() - Date.now()) / 864e5;
  return days > 0 && days <= 7;
}

const EMPTY_FORM = {
  title: '', description: '', team: '', assignee: '', dueDate: '', priority: 'medium', notes: '',
};

const NOTIFY_FORM = { message: '', channel: 'message' };

export default function Compliance() {
  const { toast } = useToast();

  const [teamFilter, setTeamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'board'>('list');

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ComplianceItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<ComplianceItem | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNote, setReminderNote] = useState('');

  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState<ComplianceItem | null>(null);
  const [notifyForm, setNotifyForm] = useState(NOTIFY_FORM);

  const [statusTarget, setStatusTarget] = useState<ComplianceItem | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ComplianceItem | null>(null);

  const { data: tasks = [], isLoading } = useQuery<ComplianceItem[]>({
    queryKey: ['/api/compliance'],
  });
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('POST', '/api/compliance', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance'] });
      setTaskDialogOpen(false);
      toast({ title: 'Task created', description: `"${form.title}" added.` });
    },
    onError: () => toast({ title: 'Error', description: 'Could not create task.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest('PATCH', `/api/compliance/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance'] });
      setTaskDialogOpen(false);
      setEditingTask(null);
      setStatusTarget(null);
      setReminderTarget(null);
      toast({ title: 'Task updated' });
    },
    onError: () => toast({ title: 'Error', description: 'Could not update task.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/compliance/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance'] });
      setDeleteTarget(null);
      toast({ title: 'Task deleted' });
    },
    onError: () => toast({ title: 'Error', description: 'Could not delete task.', variant: 'destructive' }),
  });

  const openAdd = () => {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setTaskDialogOpen(true);
  };

  const openEdit = (task: ComplianceItem) => {
    setEditingTask(task);
    setForm({
      title: task.requirement,
      description: task.description || '',
      team: task.category,
      assignee: task.assignee || '',
      dueDate: new Date(task.dueDate).toISOString().slice(0, 10),
      priority: task.priority || 'medium',
      notes: task.notes || '',
    });
    setFormError('');
    setTaskDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { setFormError('Task title is required.'); return; }
    if (!form.team) { setFormError('Please select a team.'); return; }
    if (!form.dueDate) { setFormError('Please set a due date.'); return; }
    setFormError('');
    const payload = {
      requirement: form.title,
      description: form.description,
      category: form.team,
      assignee: form.assignee,
      dueDate: new Date(form.dueDate).toISOString(),
      priority: form.priority,
      notes: form.notes,
      status: 'pending' as const,
      taskStatus: editingTask ? editingTask.taskStatus : 'todo',
    };
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleStatusChange = () => {
    if (!statusTarget || !newStatus) return;
    updateMutation.mutate({
      id: statusTarget.id,
      data: {
        taskStatus: newStatus,
        ...(newStatus === 'done' ? { completedAt: new Date().toISOString() } : {}),
      },
    });
  };

  const handleReminderSave = () => {
    if (!reminderTarget) return;
    updateMutation.mutate({
      id: reminderTarget.id,
      data: { reminderDate: reminderDate ? new Date(reminderDate).toISOString() : null, reminderNote },
    });
    setReminderDialogOpen(false);
  };

  const handleNotify = () => {
    if (!notifyTarget || !notifyForm.message.trim()) {
      toast({ title: 'Message required', description: 'Please type a message before sending.', variant: 'destructive' });
      return;
    }
    toast({
      title: 'Notification sent',
      description: `Message sent to ${notifyTarget.assignedTeam?.length ? notifyTarget.assignedTeam.join(', ') : notifyTarget.category + ' team'}.`,
    });
    setNotifyDialogOpen(false);
    setNotifyForm(NOTIFY_FORM);
  };

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (teamFilter !== 'all') list = list.filter(t => t.category === teamFilter);
    if (statusFilter !== 'all') list = list.filter(t => t.taskStatus === statusFilter);
    if (search) list = list.filter(t =>
      t.requirement.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      (t.assignee || '').toLowerCase().includes(search.toLowerCase())
    );
    return list.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2) - (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2);
    });
  }, [tasks, teamFilter, statusFilter, search]);

  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.taskStatus === 'todo').length,
    ongoing: tasks.filter(t => t.taskStatus === 'in-progress').length,
    completed: tasks.filter(t => t.taskStatus === 'done').length,
    blocked: tasks.filter(t => t.taskStatus === 'blocked').length,
    overdue: tasks.filter(t => isOverdue(t)).length,
  }), [tasks]);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Tasks & Reminders"
        description="Centrally manage pending work, reminders, and task assignments across all departments"
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={openAdd} data-testid="button-add-task">
              <Plus className="h-4 w-4 mr-2" /> Add Task
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total',     value: stats.total,     className: 'text-foreground',                                     bg: 'bg-muted' },
          { label: 'Pending',   value: stats.pending,   className: 'text-amber-700 dark:text-amber-300',                  bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Ongoing',   value: stats.ongoing,   className: 'text-blue-700 dark:text-blue-300',                    bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Completed', value: stats.completed, className: 'text-green-700 dark:text-green-400',                  bg: 'bg-green-50 dark:bg-green-950/30' },
          { label: 'Blocked',   value: stats.blocked,   className: 'text-red-700 dark:text-red-300',                      bg: 'bg-red-50 dark:bg-red-950/30' },
          { label: 'Overdue',   value: stats.overdue,   className: 'text-destructive',                                    bg: 'bg-destructive/5' },
        ].map(({ label, value, className, bg }) => (
          <Card key={label} className={`${bg} border-0`} data-testid={`kpi-${label.toLowerCase()}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${className}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion Progress */}
      <Card data-testid="card-completion">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium whitespace-nowrap">Overall Completion</span>
            <Progress value={completionRate} className="flex-1 h-2" data-testid="progress-completion" />
            <span className="text-sm font-bold text-primary w-10 text-right">{completionRate}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Team filter pills */}
      <div className="flex flex-wrap gap-2">
        {['all', ...TEAMS].map(team => (
          <button
            key={team}
            onClick={() => setTeamFilter(team)}
            className={[
              'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
              teamFilter === team
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground',
            ].join(' ')}
            data-testid={`pill-team-${team}`}
          >
            {team === 'all' ? 'All Teams' : team}
          </button>
        ))}
      </div>

      {/* Search + Status filter + View toggle */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks, team, assignee…" value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-search" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status-filter">
          <SelectTrigger className="w-36">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TASK_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 border rounded-md overflow-hidden">
          <Button size="sm" variant={view === 'list' ? 'default' : 'ghost'} className="rounded-none h-8 px-3"
            onClick={() => setView('list')} data-testid="btn-list-view">
            <ClipboardList className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={view === 'board' ? 'default' : 'ghost'} className="rounded-none h-8 px-3"
            onClick={() => setView('board')} data-testid="btn-board-view">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mb-4 opacity-30" />
            <p className="font-medium">No tasks found</p>
            <p className="text-sm mt-1">Try adjusting filters or add a new task.</p>
            <Button className="mt-4" onClick={openAdd} data-testid="btn-add-empty">
              <Plus className="h-4 w-4 mr-2" /> Add Task
            </Button>
          </CardContent>
        </Card>
      ) : view === 'list' ? (
        /* ── LIST VIEW ── */
        <div className="space-y-2" data-testid="section-list">
          {filtered.map(task => {
            const sc = getStatusConfig(task.taskStatus || 'todo');
            const pc = getPriorityConfig(task.priority || 'medium');
            const PriIcon = pc.icon;
            const overdue = isOverdue(task);
            const dueSoon = isDueSoon(task);
            const owner = task.ownerId ? employeeMap.get(task.ownerId) : null;

            return (
              <Card key={task.id}
                className={`border transition-shadow hover:shadow-sm ${overdue ? 'border-l-4 border-l-destructive' : ''}`}
                data-testid={`card-task-${task.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-start gap-4 px-4 py-3">
                    {/* Priority indicator */}
                    <div className={`mt-1 flex-shrink-0 ${pc.color}`}>
                      <PriIcon className="h-4 w-4" />
                    </div>
                    {/* Main content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start gap-2 flex-wrap">
                        <p className="font-medium text-sm" data-testid={`text-task-title-${task.id}`}>{task.requirement}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.color}`}
                          data-testid={`badge-status-${task.id}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                        {overdue && <Badge variant="destructive" className="text-[10px] h-4">Overdue</Badge>}
                        {dueSoon && !overdue && <Badge variant="outline" className="text-[10px] h-4 border-orange-400 text-orange-600">Due Soon</Badge>}
                        {task.reminderDate && (
                          <Bell className="h-3 w-3 text-orange-500 animate-pulse mt-0.5" title={`Reminder: ${formatDate(task.reminderDate)}`} />
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground truncate" data-testid={`text-task-desc-${task.id}`}>{task.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> <span data-testid={`text-team-${task.id}`}>{task.category}</span>
                        </span>
                        {task.assignee && (
                          <span className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="text-[8px]">{getInitials(task.assignee)}</AvatarFallback>
                            </Avatar>
                            <span data-testid={`text-assignee-${task.id}`}>{task.assignee}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className={overdue ? 'text-destructive font-medium' : ''} data-testid={`text-due-${task.id}`}>
                            Due {formatDate(task.dueDate)}
                          </span>
                        </span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1"
                        onClick={() => { setNotifyTarget(task); setNotifyForm(NOTIFY_FORM); setNotifyDialogOpen(true); }}
                        data-testid={`btn-notify-${task.id}`}>
                        <MessageSquare className="h-3.5 w-3.5" /> Notify
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`btn-more-${task.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(task)} data-testid={`menu-edit-${task.id}`}>
                            <Edit2 className="h-4 w-4 mr-2" /> Edit Task
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setStatusTarget(task); setNewStatus(task.taskStatus || 'todo'); }}
                            data-testid={`menu-status-${task.id}`}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Change Status
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => { setReminderTarget(task); setReminderDate(task.reminderDate ? new Date(task.reminderDate).toISOString().slice(0, 10) : ''); setReminderNote(task.reminderNote || ''); setReminderDialogOpen(true); }}
                            data-testid={`menu-reminder-${task.id}`}>
                            <Bell className="h-4 w-4 mr-2" /> Set Reminder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(task)}
                            data-testid={`menu-delete-${task.id}`}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ── BOARD VIEW ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-board">
          {TASK_STATUS.map(col => {
            const colTasks = filtered.filter(t => t.taskStatus === col.value);
            return (
              <div key={col.value} className="space-y-3" data-testid={`column-${col.value}`}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${col.border} ${col.color}`}>
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="text-xs font-semibold flex-1">{col.label}</span>
                  <span className="text-xs font-bold">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(task => {
                    const pc = getPriorityConfig(task.priority || 'medium');
                    const PriIcon = pc.icon;
                    const overdue = isOverdue(task);
                    return (
                      <Card key={task.id}
                        className={`cursor-pointer hover:shadow-md transition-shadow ${overdue ? 'border-l-4 border-l-destructive' : ''}`}
                        data-testid={`board-card-${task.id}`}
                        onClick={() => openEdit(task)}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <PriIcon className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${pc.color}`} />
                            <p className="text-xs font-medium leading-tight">{task.requirement}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="secondary" className="text-[10px] h-4">{task.category}</Badge>
                            <span className={`text-[10px] ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {formatDate(task.dueDate)}
                            </span>
                          </div>
                          {task.assignee && (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[8px]">{getInitials(task.assignee)}</AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                            </div>
                          )}
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 flex-1"
                              onClick={e => { e.stopPropagation(); setNotifyTarget(task); setNotifyForm(NOTIFY_FORM); setNotifyDialogOpen(true); }}
                              data-testid={`board-notify-${task.id}`}>
                              <MessageSquare className="h-3 w-3 mr-1" /> Notify
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Task Dialog ── */}
      <Dialog open={taskDialogOpen} onOpenChange={open => { setTaskDialogOpen(open); if (!open) setEditingTask(null); }}>
        <DialogContent className="max-w-lg" data-testid="dialog-task-form">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Update task details and assignment.' : 'Create a task or reminder for a team or individual.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Task Title <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Submit GST returns, Update payroll records…"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                data-testid="input-task-title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Additional details, links, or context…" rows={2}
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                data-testid="input-task-desc" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Team <span className="text-destructive">*</span></Label>
                <Select value={form.team} onValueChange={v => setForm(f => ({ ...f, team: v }))} data-testid="select-team">
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {TEAMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assignee</Label>
                <Input placeholder="Name or email" value={form.assignee}
                  onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
                  data-testid="input-assignee" />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  data-testid="input-due-date" />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))} data-testid="select-priority">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
                      <SelectItem key={val} value={val}>
                        <span className="flex items-center gap-2">
                          <cfg.icon className={`h-3 w-3 ${cfg.color}`} /> {cfg.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Internal Notes</Label>
              <Input placeholder="Optional notes for context" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                data-testid="input-notes" />
            </div>
            {formError && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} data-testid="btn-save-task">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Status Dialog ── */}
      <Dialog open={!!statusTarget} onOpenChange={open => !open && setStatusTarget(null)}>
        <DialogContent className="max-w-sm" data-testid="dialog-status-change">
          <DialogHeader>
            <DialogTitle>Change Task Status</DialogTitle>
            <DialogDescription>{statusTarget?.requirement}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {TASK_STATUS.map(s => (
              <button
                key={s.value}
                onClick={() => setNewStatus(s.value)}
                className={[
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                  newStatus === s.value ? `${s.color} ${s.border}` : 'hover:bg-muted border-border',
                ].join(' ')}
                data-testid={`status-option-${s.value}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                <span className="text-sm font-medium">{s.label}</span>
                {newStatus === s.value && <CheckCircle className="h-4 w-4 ml-auto text-primary" />}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>Cancel</Button>
            <Button onClick={handleStatusChange} disabled={updateMutation.isPending} data-testid="btn-confirm-status">
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reminder Dialog ── */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-reminder">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" /> Set Reminder
            </DialogTitle>
            <DialogDescription>{reminderTarget?.requirement}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Reminder Date</Label>
              <Input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                data-testid="input-reminder-date" />
            </div>
            <div className="space-y-1.5">
              <Label>Reminder Note</Label>
              <Textarea placeholder="What needs to be done by this date?" rows={2}
                value={reminderNote} onChange={e => setReminderNote(e.target.value)}
                data-testid="input-reminder-note" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReminderSave} disabled={updateMutation.isPending} data-testid="btn-save-reminder">
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Notify Team Dialog ── */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-notify">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" /> Notify Team
            </DialogTitle>
            <DialogDescription>
              Send a message about: <strong>{notifyTarget?.requirement}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <p className="font-medium">Recipient</p>
              <p className="text-muted-foreground">
                {notifyTarget?.assignedTeam?.length
                  ? notifyTarget.assignedTeam.join(', ')
                  : notifyTarget?.assignee || `${notifyTarget?.category} Team`
                }
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={notifyForm.channel} onValueChange={v => setNotifyForm(f => ({ ...f, channel: v }))}
                data-testid="select-channel">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">In-App Message</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Message <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Type your message or reminder to the team…"
                rows={3}
                value={notifyForm.message}
                onChange={e => setNotifyForm(f => ({ ...f, message: e.target.value }))}
                data-testid="input-notify-message"
              />
            </div>
            {notifyTarget?.reminderDate && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                <Bell className="h-3.5 w-3.5 flex-shrink-0" />
                Reminder set for {formatDate(notifyTarget.reminderDate)}
                {notifyTarget.reminderNote && `: ${notifyTarget.reminderNote}`}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleNotify} data-testid="btn-send-notify">
              <Send className="h-4 w-4 mr-2" /> Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="dialog-delete-task">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.requirement}</strong>. This action cannot be undone.
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
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
