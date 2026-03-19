import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { CreateEditDrawer, FormField } from '@/components/shared/CreateEditDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportModal } from '@/components/shared/ExportModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Calendar, Clock, Plus, Download, CheckCircle, XCircle, AlertCircle,
  FileText, Users, CalendarDays, Briefcase, Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { LeaveRequest, LeaveBalance, CompanyHoliday, Employee } from '@shared/schema';

interface LeaveRequestWithEmployee extends LeaveRequest {
  employee?: Employee;
  approver?: Employee;
}

const leaveTypes = ['annual', 'sick', 'casual', 'maternity', 'paternity', 'unpaid', 'compensatory', 'bereavement'];
const leaveTypeLabels: Record<string, string> = {
  annual: 'Annual Leave', sick: 'Sick Leave', casual: 'Casual Leave',
  maternity: 'Maternity Leave', paternity: 'Paternity Leave', unpaid: 'Unpaid Leave',
  compensatory: 'Compensatory Off', bereavement: 'Bereavement Leave',
};

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }> = {
  pending: { variant: 'secondary', icon: AlertCircle },
  approved: { variant: 'default', icon: CheckCircle },
  rejected: { variant: 'destructive', icon: XCircle },
  cancelled: { variant: 'outline', icon: XCircle },
};

export default function LeaveManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('requests');
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [holidayDrawerOpen, setHolidayDrawerOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithEmployee | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ['/api/employees'] });
  const { data: leaveRequests = [], isLoading: requestsLoading } = useQuery<LeaveRequest[]>({ queryKey: ['/api/leave-requests'] });
  const { data: pendingRequests = [] } = useQuery<LeaveRequest[]>({ queryKey: ['/api/leave-requests/pending'] });
  const { data: leaveBalances = [], isLoading: balancesLoading } = useQuery<LeaveBalance[]>({
    queryKey: ['/api/leave-balances', { year: selectedYear }],
    queryFn: () => fetch(`/api/leave-balances?year=${selectedYear}`, { credentials: 'include' }).then(r => r.json()),
  });
  const { data: holidays = [], isLoading: holidaysLoading } = useQuery<CompanyHoliday[]>({
    queryKey: ['/api/company-holidays', { year: selectedYear }],
    queryFn: () => fetch(`/api/company-holidays?year=${selectedYear}`, { credentials: 'include' }).then(r => r.json()),
  });

  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  const enrichedRequests: LeaveRequestWithEmployee[] = useMemo(() =>
    leaveRequests.map(r => ({
      ...r,
      employee: employeeMap.get(r.employeeId),
      approver: r.approverId ? employeeMap.get(r.approverId) : undefined,
    })), [leaveRequests, employeeMap]);

  const enrichedPending: LeaveRequestWithEmployee[] = useMemo(() =>
    pendingRequests.map(r => ({
      ...r,
      employee: employeeMap.get(r.employeeId),
    })), [pendingRequests, employeeMap]);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const diffTime = endDate.getTime() - startDate.getTime();
      const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

      await apiRequest('POST', '/api/leave-requests', {
        employeeId: parseInt(data.employeeId),
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: totalDays.toString(),
        reason: data.reason,
        status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests/pending'] });
      setCreateDrawerOpen(false);
      toast({ title: 'Leave request submitted successfully' });
    },
    onError: () => toast({ title: 'Failed to submit leave request', variant: 'destructive' }),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, remarks }: { id: number; remarks?: string }) => {
      await apiRequest('POST', `/api/leave-requests/${id}/approve`, {
        approverId: 1,
        remarks,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-balances'] });
      setApproveDialogOpen(false);
      toast({ title: 'Leave request approved' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, remarks }: { id: number; remarks?: string }) => {
      await apiRequest('POST', `/api/leave-requests/${id}/reject`, {
        approverId: 1,
        remarks,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests/pending'] });
      setRejectDialogOpen(false);
      toast({ title: 'Leave request rejected' });
    },
  });

  const holidayMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      await apiRequest('POST', '/api/company-holidays', {
        name: data.name,
        date: data.date,
        type: data.type || 'public',
        isOptional: data.isOptional === 'true',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company-holidays'] });
      setHolidayDrawerOpen(false);
      toast({ title: 'Holiday added successfully' });
    },
  });

  const stats = useMemo(() => ({
    totalRequests: leaveRequests.length,
    pending: pendingRequests.length,
    approved: leaveRequests.filter(r => r.status === 'approved').length,
    rejected: leaveRequests.filter(r => r.status === 'rejected').length,
    upcomingHolidays: holidays.filter(h => new Date(h.date) >= new Date()).length,
  }), [leaveRequests, pendingRequests, holidays]);

  const leaveRequestFields: FormField[] = [
    { name: 'employeeId', label: 'Employee', type: 'select', required: true, options: employees.map(e => ({ value: e.id.toString(), label: e.name })) },
    { name: 'leaveType', label: 'Leave Type', type: 'select', required: true, options: leaveTypes.map(t => ({ value: t, label: leaveTypeLabels[t] || t })) },
    { name: 'startDate', label: 'Start Date', type: 'date', required: true },
    { name: 'endDate', label: 'End Date', type: 'date', required: true },
    { name: 'reason', label: 'Reason', type: 'textarea', required: true },
  ];

  const holidayFields: FormField[] = [
    { name: 'name', label: 'Holiday Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'type', label: 'Type', type: 'select', required: true, options: [
      { value: 'public', label: 'Public Holiday' },
      { value: 'restricted', label: 'Restricted Holiday' },
      { value: 'company', label: 'Company Holiday' },
    ]},
    { name: 'isOptional', label: 'Optional Holiday', type: 'select', options: [
      { value: 'false', label: 'No' },
      { value: 'true', label: 'Yes' },
    ]},
  ];

  const requestColumns: Column<LeaveRequestWithEmployee>[] = [
    { key: 'employee', header: 'Employee', render: (record) => (
      <div>
        <div className="font-medium" data-testid={`text-leave-emp-${record.id}`}>{record.employee?.name || 'Unknown'}</div>
        <div className="text-xs text-muted-foreground">{record.employee?.department}</div>
      </div>
    )},
    { key: 'leaveType', header: 'Type', render: (record) => (
      <Badge variant="outline" data-testid={`badge-leave-type-${record.id}`}>{leaveTypeLabels[record.leaveType] || record.leaveType}</Badge>
    )},
    { key: 'startDate', header: 'From', render: (record) => (
      <span className="text-sm" data-testid={`text-leave-from-${record.id}`}>{new Date(record.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
    )},
    { key: 'endDate', header: 'To', render: (record) => (
      <span className="text-sm" data-testid={`text-leave-to-${record.id}`}>{new Date(record.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
    )},
    { key: 'totalDays', header: 'Days', render: (record) => (
      <span className="font-mono font-medium" data-testid={`text-leave-days-${record.id}`}>{Number(record.totalDays)}</span>
    )},
    { key: 'reason', header: 'Reason', render: (record) => (
      <span className="text-sm truncate max-w-[200px] block" data-testid={`text-leave-reason-${record.id}`}>{record.reason}</span>
    )},
    { key: 'status', header: 'Status', render: (record) => {
      const config = statusConfig[record.status] || statusConfig.pending;
      const IconComponent = config.icon;
      return (
        <Badge variant={config.variant} data-testid={`badge-leave-status-${record.id}`}>
          <IconComponent className="h-3 w-3 mr-1" />
          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
        </Badge>
      );
    }},
    { key: 'approver', header: 'Approver', render: (record) => (
      <span className="text-sm text-muted-foreground" data-testid={`text-leave-approver-${record.id}`}>
        {record.approver?.name || (record.status === 'pending' ? 'Awaiting' : '-')}
      </span>
    )},
  ];

  const pendingColumns: Column<LeaveRequestWithEmployee>[] = [
    ...requestColumns.filter(c => c.key !== 'approver'),
    { key: 'actions', header: 'Actions', render: (record) => (
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => { setSelectedRequest(record); setApproveDialogOpen(true); }}
          data-testid={`button-approve-${record.id}`}
        >
          <CheckCircle className="h-3 w-3 mr-1" /> Approve
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => { setSelectedRequest(record); setRejectDialogOpen(true); }}
          data-testid={`button-reject-${record.id}`}
        >
          <XCircle className="h-3 w-3 mr-1" /> Reject
        </Button>
      </div>
    )},
  ];

  const balancesByEmployee = useMemo(() => {
    const grouped = new Map<number, LeaveBalance[]>();
    for (const b of leaveBalances) {
      const existing = grouped.get(b.employeeId) || [];
      existing.push(b);
      grouped.set(b.employeeId, existing);
    }
    return Array.from(grouped.entries()).map(([empId, balances]) => ({
      id: empId,
      employeeId: empId,
      employeeName: employeeMap.get(empId)?.name || 'Unknown',
      employeeCode: employeeMap.get(empId)?.employeeCode || '',
      department: employeeMap.get(empId)?.department || '',
      balances,
      totalAllotted: balances.reduce((s, b) => s + Number(b.totalAllotted), 0),
      totalUsed: balances.reduce((s, b) => s + Number(b.used), 0),
      totalRemaining: balances.reduce((s, b) => s + Number(b.remaining), 0),
    }));
  }, [leaveBalances, employeeMap]);

  const balanceColumns: Column<typeof balancesByEmployee[0]>[] = [
    { key: 'employeeName', header: 'Employee', render: (record) => (
      <div>
        <div className="font-medium" data-testid={`text-bal-name-${record.employeeId}`}>{record.employeeName}</div>
        <div className="text-xs text-muted-foreground">{record.employeeCode}</div>
      </div>
    )},
    { key: 'department', header: 'Department', render: (record) => <Badge variant="outline">{record.department || '-'}</Badge> },
    ...leaveTypes.slice(0, 5).map(type => ({
      key: type,
      header: leaveTypeLabels[type]?.split(' ')[0] || type,
      render: (record: typeof balancesByEmployee[0]) => {
        const bal = record.balances.find(b => b.leaveType === type);
        if (!bal) return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <div className="text-center" data-testid={`text-bal-${type}-${record.employeeId}`}>
            <span className="font-mono text-sm font-medium">{Number(bal.remaining)}</span>
            <span className="text-xs text-muted-foreground">/{Number(bal.totalAllotted)}</span>
          </div>
        );
      },
    })),
    { key: 'totalRemaining', header: 'Total Left', render: (record) => (
      <span className={`font-mono font-medium ${record.totalRemaining <= 5 ? 'text-destructive' : ''}`} data-testid={`text-bal-total-${record.employeeId}`}>
        {record.totalRemaining}
      </span>
    )},
  ];

  const holidayColumns: Column<CompanyHoliday>[] = [
    { key: 'name', header: 'Holiday', render: (record) => (
      <div className="font-medium" data-testid={`text-holiday-name-${record.id}`}>{record.name}</div>
    )},
    { key: 'date', header: 'Date', render: (record) => (
      <div>
        <div className="text-sm" data-testid={`text-holiday-date-${record.id}`}>
          {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    )},
    { key: 'type', header: 'Type', render: (record) => (
      <Badge variant={record.type === 'public' ? 'default' : record.type === 'company' ? 'secondary' : 'outline'} data-testid={`badge-holiday-type-${record.id}`}>
        {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
      </Badge>
    )},
    { key: 'isOptional', header: 'Optional', render: (record) => (
      <span data-testid={`text-holiday-optional-${record.id}`}>
        {record.isOptional ? <Badge variant="outline">Optional</Badge> : '-'}
      </span>
    )},
    { key: 'status', header: 'Status', render: (record) => {
      const isPast = new Date(record.date) < new Date();
      return (
        <Badge variant={isPast ? 'secondary' : 'default'} data-testid={`badge-holiday-status-${record.id}`}>
          {isPast ? 'Past' : 'Upcoming'}
        </Badge>
      );
    }},
  ];

  const exportColumns = [
    { key: 'employee', label: 'Employee' },
    { key: 'leaveType', label: 'Leave Type' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'totalDays', label: 'Days' },
    { key: 'status', label: 'Status' },
    { key: 'reason', label: 'Reason' },
  ];

  const isLoading = requestsLoading || balancesLoading || holidaysLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        description="Submit leave requests, manage approvals, track balances, and view company holidays"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => setCreateDrawerOpen(true)} data-testid="button-new-leave">
              <Plus className="h-4 w-4 mr-2" />New Leave Request
            </Button>
            <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export-leave">
              <Download className="h-4 w-4 mr-2" />Export
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-requests">{stats.totalRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-approved">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="stat-rejected">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Holidays</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-holidays">{stats.upcomingHolidays}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList data-testid="leave-tabs">
            <TabsTrigger value="requests" data-testid="tab-requests">
              <FileText className="h-4 w-4 mr-1" /> All Requests
            </TabsTrigger>
            <TabsTrigger value="approvals" data-testid="tab-approvals">
              <CheckCircle className="h-4 w-4 mr-1" /> Pending Approvals
              {stats.pending > 0 && <Badge variant="destructive" className="ml-1">{stats.pending}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="balances" data-testid="tab-balances">
              <Briefcase className="h-4 w-4 mr-1" /> Leave Balances
            </TabsTrigger>
            <TabsTrigger value="holidays" data-testid="tab-holidays">
              <Calendar className="h-4 w-4 mr-1" /> Holiday Calendar
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Year:</span>
            <Input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="w-24"
              min={2020}
              max={2030}
              data-testid="input-year"
            />
          </div>
        </div>

        <TabsContent value="requests" className="mt-4">
          <DataTable
            data={enrichedRequests}
            columns={requestColumns}
            emptyMessage="No leave requests found. Submit a new leave request to get started."
          />
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          {enrichedPending.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium" data-testid="text-no-pending">No pending approvals</p>
                <p className="text-sm text-muted-foreground">All leave requests have been processed.</p>
              </CardContent>
            </Card>
          ) : (
            <DataTable
              data={enrichedPending}
              columns={pendingColumns}
              emptyMessage="No pending leave requests."
            />
          )}
        </TabsContent>

        <TabsContent value="balances" className="mt-4">
          {balancesByEmployee.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium" data-testid="text-no-balances">No leave balances configured</p>
                <p className="text-sm text-muted-foreground">Leave balances will appear here once configured for employees.</p>
              </CardContent>
            </Card>
          ) : (
            <DataTable
              data={balancesByEmployee}
              columns={balanceColumns}
              emptyMessage="No leave balance records found."
            />
          )}
        </TabsContent>

        <TabsContent value="holidays" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={() => setHolidayDrawerOpen(true)} data-testid="button-add-holiday">
              <Plus className="h-4 w-4 mr-2" />Add Holiday
            </Button>
          </div>
          {holidays.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium" data-testid="text-no-holidays">No holidays configured for {selectedYear}</p>
                <p className="text-sm text-muted-foreground">Add company holidays to the calendar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['public', 'company', 'restricted'].map(type => {
                  const typeHolidays = holidays.filter(h => h.type === type);
                  return (
                    <Card key={type}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
                        <CardTitle className="text-sm font-medium">{type.charAt(0).toUpperCase() + type.slice(1)} Holidays</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid={`stat-${type}-holidays`}>{typeHolidays.length}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <DataTable
                data={holidays}
                columns={holidayColumns}
                emptyMessage="No holidays found."
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateEditDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Submit Leave Request"
        fields={leaveRequestFields}
        onSubmit={(data) => createMutation.mutate(data)}
      />

      <CreateEditDrawer
        open={holidayDrawerOpen}
        onClose={() => setHolidayDrawerOpen(false)}
        title="Add Company Holiday"
        fields={holidayFields}
        onSubmit={(data) => holidayMutation.mutate(data)}
      />

      <ConfirmDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        title="Approve Leave Request"
        description={`Approve ${selectedRequest?.employee?.name}'s ${leaveTypeLabels[selectedRequest?.leaveType || ''] || ''} request for ${Number(selectedRequest?.totalDays)} day(s)?`}
        confirmLabel="Approve"
        requireReason
        onConfirm={(reason) => selectedRequest && approveMutation.mutate({ id: selectedRequest.id, remarks: reason })}
      />

      <ConfirmDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title="Reject Leave Request"
        description={`Reject ${selectedRequest?.employee?.name}'s ${leaveTypeLabels[selectedRequest?.leaveType || ''] || ''} request?`}
        confirmLabel="Reject"
        destructive
        requireReason
        onConfirm={(reason) => selectedRequest && rejectMutation.mutate({ id: selectedRequest.id, remarks: reason })}
      />

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        entityName="Leave Requests"
        columns={exportColumns}
        totalRecords={leaveRequests.length}
      />
    </div>
  );
}
