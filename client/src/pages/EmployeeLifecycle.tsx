import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  UserPlus, LogOut, ClipboardCheck, Search, Plus, CheckCircle, Clock, AlertCircle,
  XCircle, Building2, Monitor, DollarSign, ChevronRight, FileText, Shield,
  Users, Calendar, ArrowRight, SkipForward
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { OnboardingChecklist, ExitWorkflow, Employee } from '@shared/schema';

type OnboardingCategory = 'HR' | 'IT' | 'Finance';

const categoryIcons: Record<OnboardingCategory, typeof Building2> = {
  HR: Building2,
  IT: Monitor,
  Finance: DollarSign,
};

const categoryColors: Record<OnboardingCategory, string> = {
  HR: 'text-blue-600 dark:text-blue-400',
  IT: 'text-purple-600 dark:text-purple-400',
  Finance: 'text-green-600 dark:text-green-400',
};

const statusConfig = {
  pending: { icon: Clock, variant: 'secondary' as const, label: 'Pending' },
  'in-progress': { icon: ArrowRight, variant: 'default' as const, label: 'In Progress' },
  completed: { icon: CheckCircle, variant: 'default' as const, label: 'Completed' },
  skipped: { icon: SkipForward, variant: 'outline' as const, label: 'Skipped' },
};

const exitStatusConfig = {
  initiated: { variant: 'secondary' as const, label: 'Initiated' },
  'in-progress': { variant: 'default' as const, label: 'In Progress' },
  completed: { variant: 'default' as const, label: 'Completed' },
  cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
};

export default function EmployeeLifecyclePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUserName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'System' : 'System';
  const [activeTab, setActiveTab] = useState('onboarding');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [exitDetailSheet, setExitDetailSheet] = useState<ExitWorkflow | null>(null);

  const [newExitForm, setNewExitForm] = useState({
    employeeId: '',
    exitDate: '',
    reason: '',
    notes: '',
  });

  const [newTaskForm, setNewTaskForm] = useState({
    employeeId: '',
    taskName: '',
    category: 'HR' as OnboardingCategory,
    description: '',
    assignedTo: '',
  });

  const { data: onboardingItems = [], isLoading: loadingOnboarding } = useQuery<OnboardingChecklist[]>({
    queryKey: ['/api/onboarding-checklists'],
  });

  const { data: exitWorkflows = [], isLoading: loadingExits } = useQuery<ExitWorkflow[]>({
    queryKey: ['/api/exit-workflows'],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const generateMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      return apiRequest('POST', '/api/onboarding-checklists/generate', { employeeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding-checklists'] });
      setShowGenerateDialog(false);
      toast({ title: 'Onboarding checklist generated', description: 'Default HR, IT, and Finance tasks have been created.' });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<OnboardingChecklist> }) => {
      return apiRequest('PATCH', `/api/onboarding-checklists/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding-checklists'] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/onboarding-checklists', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding-checklists'] });
      setShowAddTaskDialog(false);
      setNewTaskForm({ employeeId: '', taskName: '', category: 'HR', description: '', assignedTo: '' });
      toast({ title: 'Task added' });
    },
  });

  const createExitMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/exit-workflows', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exit-workflows'] });
      setShowExitDialog(false);
      setNewExitForm({ employeeId: '', exitDate: '', reason: '', notes: '' });
      toast({ title: 'Exit workflow initiated', description: 'Clearance, documentation, and approval steps have been created.' });
    },
  });

  const updateExitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ExitWorkflow> }) => {
      return apiRequest('PATCH', `/api/exit-workflows/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exit-workflows'] });
    },
  });

  const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || `Employee #${id}`;
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const formatDate = (d: string | Date | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  const filteredOnboarding = onboardingItems.filter(item => {
    if (searchQuery && !item.taskName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (selectedEmployee !== 'all' && item.employeeId !== parseInt(selectedEmployee)) return false;
    return true;
  });

  const groupedByEmployee = filteredOnboarding.reduce<Record<number, OnboardingChecklist[]>>((acc, item) => {
    if (!acc[item.employeeId]) acc[item.employeeId] = [];
    acc[item.employeeId].push(item);
    return acc;
  }, {});

  const getOnboardingProgress = (items: OnboardingChecklist[]) => {
    if (items.length === 0) return 0;
    const completed = items.filter(i => i.status === 'completed' || i.status === 'skipped').length;
    return Math.round((completed / items.length) * 100);
  };

  const onboardingStats = {
    total: onboardingItems.length,
    completed: onboardingItems.filter(i => i.status === 'completed').length,
    inProgress: onboardingItems.filter(i => i.status === 'in-progress').length,
    pending: onboardingItems.filter(i => i.status === 'pending').length,
  };

  const exitStats = {
    total: exitWorkflows.length,
    initiated: exitWorkflows.filter(w => w.status === 'initiated').length,
    inProgress: exitWorkflows.filter(w => w.status === 'in-progress').length,
    completed: exitWorkflows.filter(w => w.status === 'completed').length,
  };

  const handleTaskStatusChange = (item: OnboardingChecklist, newStatus: string) => {
    updateTaskMutation.mutate({
      id: item.id,
      data: {
        status: newStatus as any,
        ...(newStatus === 'completed' ? { completedAt: new Date(), completedBy: currentUserName } : {}),
      },
    });
  };

  const handleClearanceUpdate = (workflow: ExitWorkflow, deptIndex: number, status: 'cleared' | 'hold') => {
    const clearances = [...(workflow.clearances as any[] || [])];
    clearances[deptIndex] = {
      ...clearances[deptIndex],
      status,
      clearedBy: status === 'cleared' ? currentUserName : null,
      clearedAt: status === 'cleared' ? new Date().toISOString() : null,
    };

    const allCleared = clearances.every(c => c.status === 'cleared');
    updateExitMutation.mutate({
      id: workflow.id,
      data: {
        clearances,
        status: allCleared ? 'completed' : 'in-progress',
      },
    });
    if (exitDetailSheet?.id === workflow.id) {
      setExitDetailSheet({ ...workflow, clearances, status: allCleared ? 'completed' : workflow.status } as any);
    }
  };

  const handleDocumentStatusUpdate = (workflow: ExitWorkflow, docIndex: number, status: 'submitted' | 'verified') => {
    const documents = [...(workflow.documents as any[] || [])];
    documents[docIndex] = {
      ...documents[docIndex],
      status,
      submittedAt: new Date().toISOString(),
    };
    updateExitMutation.mutate({ id: workflow.id, data: { documents } });
    if (exitDetailSheet?.id === workflow.id) {
      setExitDetailSheet({ ...workflow, documents } as any);
    }
  };

  const handleApprovalUpdate = (workflow: ExitWorkflow, approvalIndex: number, status: 'approved' | 'rejected', remarks?: string) => {
    const approvals = [...(workflow.approvals as any[] || [])];
    approvals[approvalIndex] = {
      ...approvals[approvalIndex],
      status,
      remarks: remarks || null,
      timestamp: new Date().toISOString(),
    };
    updateExitMutation.mutate({ id: workflow.id, data: { approvals } });
    if (exitDetailSheet?.id === workflow.id) {
      setExitDetailSheet({ ...workflow, approvals } as any);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Employee Lifecycle</h1>
          <p className="text-muted-foreground text-sm">Manage onboarding checklists and exit workflows</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList data-testid="tabs-lifecycle">
          <TabsTrigger value="onboarding" data-testid="tab-onboarding">
            <UserPlus className="h-4 w-4 mr-1" /> Onboarding
          </TabsTrigger>
          <TabsTrigger value="exit" data-testid="tab-exit">
            <LogOut className="h-4 w-4 mr-1" /> Exit Workflows
          </TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card data-testid="card-onboarding-total">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold" data-testid="text-onboarding-total">{onboardingStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </CardContent>
            </Card>
            <Card data-testid="card-onboarding-completed">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-onboarding-completed">{onboardingStats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card data-testid="card-onboarding-progress">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-onboarding-inprogress">{onboardingStats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </CardContent>
            </Card>
            <Card data-testid="card-onboarding-pending">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-onboarding-pending">{onboardingStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-onboarding"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-category-filter">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[180px]" data-testid="select-employee-filter">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowAddTaskDialog(true)} data-testid="button-add-task">
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
            <Button variant="outline" onClick={() => setShowGenerateDialog(true)} data-testid="button-generate-checklist">
              <ClipboardCheck className="h-4 w-4 mr-1" /> Generate Checklist
            </Button>
          </div>

          {loadingOnboarding ? (
            <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>
          ) : Object.keys(groupedByEmployee).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UserPlus className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-lg font-medium" data-testid="text-no-onboarding">No onboarding tasks found</p>
                <p className="text-sm text-muted-foreground mb-4">Generate a checklist for a new employee to get started</p>
                <Button onClick={() => setShowGenerateDialog(true)} data-testid="button-generate-empty">
                  <Plus className="h-4 w-4 mr-1" /> Generate Checklist
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByEmployee).map(([empIdStr, tasks]) => {
                const empId = parseInt(empIdStr);
                const empName = getEmployeeName(empId);
                const progress = getOnboardingProgress(tasks);
                const hrTasks = tasks.filter(t => t.category === 'HR');
                const itTasks = tasks.filter(t => t.category === 'IT');
                const financeTasks = tasks.filter(t => t.category === 'Finance');

                return (
                  <Card key={empId} data-testid={`card-onboarding-employee-${empId}`}>
                    <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{getInitials(empName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <button
                            className="font-semibold hover:underline text-left"
                            onClick={() => navigate(`/hr/employees/${empId}`)}
                            data-testid={`button-employee-${empId}`}
                          >
                            {empName}
                          </button>
                          <p className="text-xs text-muted-foreground">{tasks.length} tasks</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium" data-testid={`text-progress-${empId}`}>{progress}%</p>
                          <p className="text-xs text-muted-foreground">Complete</p>
                        </div>
                        <Progress value={progress} className="w-24 h-2" data-testid={`progress-onboarding-${empId}`} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { label: 'HR Tasks', tasks: hrTasks, cat: 'HR' as OnboardingCategory },
                        { label: 'IT Tasks', tasks: itTasks, cat: 'IT' as OnboardingCategory },
                        { label: 'Finance Tasks', tasks: financeTasks, cat: 'Finance' as OnboardingCategory },
                      ].filter(g => g.tasks.length > 0).map(group => {
                        const CatIcon = categoryIcons[group.cat];
                        return (
                          <div key={group.cat} data-testid={`section-${group.cat.toLowerCase()}-${empId}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <CatIcon className={`h-4 w-4 ${categoryColors[group.cat]}`} />
                              <span className="text-sm font-medium">{group.label}</span>
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-${group.cat.toLowerCase()}-count-${empId}`}>
                                {group.tasks.filter(t => t.status === 'completed').length}/{group.tasks.length}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              {group.tasks.map(task => {
                                const sc = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.pending;
                                const StatusIcon = sc.icon;
                                return (
                                  <div
                                    key={task.id}
                                    className="flex items-center justify-between gap-3 p-2 border rounded-md"
                                    data-testid={`row-task-${task.id}`}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <StatusIcon className={`h-4 w-4 shrink-0 ${task.status === 'completed' ? 'text-green-500' : task.status === 'in-progress' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium truncate" data-testid={`text-task-name-${task.id}`}>{task.taskName}</p>
                                        {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {task.assignedTo && (
                                        <span className="text-xs text-muted-foreground" data-testid={`text-assigned-${task.id}`}>{task.assignedTo}</span>
                                      )}
                                      <Select
                                        value={task.status}
                                        onValueChange={(val) => handleTaskStatusChange(task, val)}
                                      >
                                        <SelectTrigger className="w-[130px] h-8 text-xs" data-testid={`select-task-status-${task.id}`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">Pending</SelectItem>
                                          <SelectItem value="in-progress">In Progress</SelectItem>
                                          <SelectItem value="completed">Completed</SelectItem>
                                          <SelectItem value="skipped">Skipped</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="exit" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card data-testid="card-exit-total">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold" data-testid="text-exit-total">{exitStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Exits</p>
              </CardContent>
            </Card>
            <Card data-testid="card-exit-initiated">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-exit-initiated">{exitStats.initiated}</p>
                <p className="text-xs text-muted-foreground">Initiated</p>
              </CardContent>
            </Card>
            <Card data-testid="card-exit-inprogress">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-exit-inprogress">{exitStats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </CardContent>
            </Card>
            <Card data-testid="card-exit-completed">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-exit-completed">{exitStats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-semibold">Active Exit Workflows</h3>
            <Button onClick={() => setShowExitDialog(true)} data-testid="button-initiate-exit">
              <Plus className="h-4 w-4 mr-1" /> Initiate Exit
            </Button>
          </div>

          {loadingExits ? (
            <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-32" />)}</div>
          ) : exitWorkflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <LogOut className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-lg font-medium" data-testid="text-no-exits">No exit workflows found</p>
                <p className="text-sm text-muted-foreground mb-4">Initiate an exit workflow when an employee is leaving</p>
                <Button onClick={() => setShowExitDialog(true)} data-testid="button-initiate-exit-empty">
                  <Plus className="h-4 w-4 mr-1" /> Initiate Exit
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {exitWorkflows.map(workflow => {
                const empName = getEmployeeName(workflow.employeeId);
                const clearances = (workflow.clearances as any[]) || [];
                const documents = (workflow.documents as any[]) || [];
                const approvals = (workflow.approvals as any[]) || [];
                const clearedCount = clearances.filter(c => c.status === 'cleared').length;
                const docsSubmitted = documents.filter(d => d.status !== 'pending').length;
                const approvalsCount = approvals.filter(a => a.status === 'approved').length;
                const sc = exitStatusConfig[workflow.status as keyof typeof exitStatusConfig] || exitStatusConfig.initiated;

                return (
                  <Card key={workflow.id} className="hover-elevate" data-testid={`card-exit-${workflow.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{getInitials(empName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold" data-testid={`text-exit-employee-${workflow.id}`}>{empName}</p>
                            <p className="text-xs text-muted-foreground">
                              Exit Date: {formatDate(workflow.exitDate)} | Reason: {workflow.reason}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={sc.variant} data-testid={`badge-exit-status-${workflow.id}`}>{sc.label}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExitDetailSheet(workflow)}
                            data-testid={`button-exit-details-${workflow.id}`}
                          >
                            Details <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium">Clearances</span>
                          </div>
                          <Progress value={(clearedCount / Math.max(clearances.length, 1)) * 100} className="h-1.5" />
                          <p className="text-xs text-muted-foreground" data-testid={`text-clearances-${workflow.id}`}>{clearedCount}/{clearances.length} cleared</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium">Documents</span>
                          </div>
                          <Progress value={(docsSubmitted / Math.max(documents.length, 1)) * 100} className="h-1.5" />
                          <p className="text-xs text-muted-foreground" data-testid={`text-documents-${workflow.id}`}>{docsSubmitted}/{documents.length} processed</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium">Approvals</span>
                          </div>
                          <Progress value={(approvalsCount / Math.max(approvals.length, 1)) * 100} className="h-1.5" />
                          <p className="text-xs text-muted-foreground" data-testid={`text-approvals-${workflow.id}`}>{approvalsCount}/{approvals.length} approved</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Onboarding Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select
                value={newExitForm.employeeId}
                onValueChange={val => setNewExitForm({ ...newExitForm, employeeId: val })}
              >
                <SelectTrigger data-testid="select-generate-employee">
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name} ({emp.employeeCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">This will create default onboarding tasks across HR, IT, and Finance categories.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
            <Button
              onClick={() => newExitForm.employeeId && generateMutation.mutate(parseInt(newExitForm.employeeId))}
              disabled={!newExitForm.employeeId || generateMutation.isPending}
              data-testid="button-confirm-generate"
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Onboarding Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={newTaskForm.employeeId} onValueChange={val => setNewTaskForm({ ...newTaskForm, employeeId: val })}>
                <SelectTrigger data-testid="select-task-employee">
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Task Name</Label>
              <Input
                value={newTaskForm.taskName}
                onChange={e => setNewTaskForm({ ...newTaskForm, taskName: e.target.value })}
                placeholder="e.g. Complete safety training"
                data-testid="input-task-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newTaskForm.category} onValueChange={val => setNewTaskForm({ ...newTaskForm, category: val as OnboardingCategory })}>
                <SelectTrigger data-testid="select-task-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTaskForm.description}
                onChange={e => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                placeholder="Task details..."
                data-testid="input-task-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Input
                value={newTaskForm.assignedTo}
                onChange={e => setNewTaskForm({ ...newTaskForm, assignedTo: e.target.value })}
                placeholder="Person responsible"
                data-testid="input-task-assigned"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTaskDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (newTaskForm.employeeId && newTaskForm.taskName) {
                  createTaskMutation.mutate({
                    employeeId: parseInt(newTaskForm.employeeId),
                    taskName: newTaskForm.taskName,
                    category: newTaskForm.category,
                    description: newTaskForm.description || undefined,
                    assignedTo: newTaskForm.assignedTo || undefined,
                    status: 'pending',
                  });
                }
              }}
              disabled={!newTaskForm.employeeId || !newTaskForm.taskName || createTaskMutation.isPending}
              data-testid="button-confirm-add-task"
            >
              {createTaskMutation.isPending ? 'Adding...' : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Exit Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={newExitForm.employeeId} onValueChange={val => setNewExitForm({ ...newExitForm, employeeId: val })}>
                <SelectTrigger data-testid="select-exit-employee">
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name} ({emp.employeeCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exit Date</Label>
              <Input
                type="date"
                value={newExitForm.exitDate}
                onChange={e => setNewExitForm({ ...newExitForm, exitDate: e.target.value })}
                data-testid="input-exit-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={newExitForm.reason} onValueChange={val => setNewExitForm({ ...newExitForm, reason: val })}>
                <SelectTrigger data-testid="select-exit-reason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Resignation">Resignation</SelectItem>
                  <SelectItem value="Retirement">Retirement</SelectItem>
                  <SelectItem value="Termination">Termination</SelectItem>
                  <SelectItem value="Contract End">Contract End</SelectItem>
                  <SelectItem value="Mutual Separation">Mutual Separation</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={newExitForm.notes}
                onChange={e => setNewExitForm({ ...newExitForm, notes: e.target.value })}
                placeholder="Additional notes..."
                data-testid="input-exit-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (newExitForm.employeeId && newExitForm.exitDate && newExitForm.reason) {
                  createExitMutation.mutate({
                    employeeId: parseInt(newExitForm.employeeId),
                    exitDate: new Date(newExitForm.exitDate).toISOString(),
                    reason: newExitForm.reason,
                    notes: newExitForm.notes || undefined,
                    status: 'initiated',
                  });
                }
              }}
              disabled={!newExitForm.employeeId || !newExitForm.exitDate || !newExitForm.reason || createExitMutation.isPending}
              data-testid="button-confirm-exit"
            >
              {createExitMutation.isPending ? 'Creating...' : 'Initiate Exit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!exitDetailSheet} onOpenChange={() => setExitDetailSheet(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {exitDetailSheet && (() => {
            const empName = getEmployeeName(exitDetailSheet.employeeId);
            const clearances = (exitDetailSheet.clearances as any[]) || [];
            const documents = (exitDetailSheet.documents as any[]) || [];
            const approvals = (exitDetailSheet.approvals as any[]) || [];
            const sc = exitStatusConfig[exitDetailSheet.status as keyof typeof exitStatusConfig] || exitStatusConfig.initiated;

            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    Exit Workflow - {empName}
                    <Badge variant={sc.variant} data-testid="badge-detail-exit-status">{sc.label}</Badge>
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Exit Date</p>
                      <p className="font-medium" data-testid="text-detail-exit-date">{formatDate(exitDetailSheet.exitDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reason</p>
                      <p className="font-medium" data-testid="text-detail-exit-reason">{exitDetailSheet.reason}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4" /> Department Clearances
                    </h4>
                    <div className="space-y-2">
                      {clearances.map((c, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 border rounded-md" data-testid={`row-clearance-${i}`}>
                          <div className="flex items-center gap-2">
                            {c.status === 'cleared' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : c.status === 'hold' ? (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <p className="text-sm font-medium" data-testid={`text-clearance-dept-${i}`}>{c.department}</p>
                              {c.clearedBy && <p className="text-xs text-muted-foreground">by {c.clearedBy} on {formatDate(c.clearedAt)}</p>}
                            </div>
                          </div>
                          {c.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => handleClearanceUpdate(exitDetailSheet, i, 'cleared')} data-testid={`button-clear-${i}`}>
                                Clear
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleClearanceUpdate(exitDetailSheet, i, 'hold')} data-testid={`button-hold-${i}`}>
                                Hold
                              </Button>
                            </div>
                          )}
                          {c.status !== 'pending' && (
                            <Badge variant={c.status === 'cleared' ? 'default' : 'destructive'} data-testid={`badge-clearance-${i}`}>
                              {c.status === 'cleared' ? 'Cleared' : 'On Hold'}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4" /> Exit Documents
                    </h4>
                    <div className="space-y-2">
                      {documents.map((doc, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 border rounded-md" data-testid={`row-document-${i}`}>
                          <div className="flex items-center gap-2">
                            {doc.status === 'verified' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : doc.status === 'submitted' ? (
                              <Clock className="h-4 w-4 text-blue-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <p className="text-sm font-medium" data-testid={`text-doc-name-${i}`}>{doc.name}</p>
                              <p className="text-xs text-muted-foreground">Type: {doc.type}</p>
                            </div>
                          </div>
                          {doc.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => handleDocumentStatusUpdate(exitDetailSheet, i, 'submitted')} data-testid={`button-submit-doc-${i}`}>
                              Mark Submitted
                            </Button>
                          )}
                          {doc.status === 'submitted' && (
                            <Button size="sm" onClick={() => handleDocumentStatusUpdate(exitDetailSheet, i, 'verified')} data-testid={`button-verify-doc-${i}`}>
                              Verify
                            </Button>
                          )}
                          {doc.status === 'verified' && (
                            <Badge variant="default" data-testid={`badge-doc-verified-${i}`}>Verified</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4" /> Approvals
                    </h4>
                    <div className="space-y-2">
                      {approvals.map((a, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 border rounded-md" data-testid={`row-approval-${i}`}>
                          <div className="flex items-center gap-2">
                            {a.status === 'approved' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : a.status === 'rejected' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <p className="text-sm font-medium" data-testid={`text-approver-${i}`}>{a.approver}</p>
                              <p className="text-xs text-muted-foreground">{a.role}</p>
                              {a.remarks && <p className="text-xs text-muted-foreground mt-1">"{a.remarks}"</p>}
                            </div>
                          </div>
                          {a.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => handleApprovalUpdate(exitDetailSheet, i, 'approved')} data-testid={`button-approve-${i}`}>
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleApprovalUpdate(exitDetailSheet, i, 'rejected')} data-testid={`button-reject-${i}`}>
                                Reject
                              </Button>
                            </div>
                          )}
                          {a.status !== 'pending' && (
                            <Badge
                              variant={a.status === 'approved' ? 'default' : 'destructive'}
                              data-testid={`badge-approval-${i}`}
                            >
                              {a.status === 'approved' ? 'Approved' : 'Rejected'}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {exitDetailSheet.notes && (
                    <div>
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <p className="text-sm text-muted-foreground" data-testid="text-exit-notes">{exitDetailSheet.notes}</p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
