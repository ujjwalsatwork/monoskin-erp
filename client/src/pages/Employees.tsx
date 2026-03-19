import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { RowActionsMenu } from '@/components/shared/RowActionsMenu';
import { CreateEditDrawer, FormField } from '@/components/shared/CreateEditDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportModal } from '@/components/shared/ExportModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Eye, Edit, Plus, Search, Filter, UserPlus, UserMinus, FileCheck, Award, Calendar, DollarSign, MapPin, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Employee } from '@shared/schema';

export default function Employees() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('POST', '/api/employees', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({ title: 'Employee Added', description: 'New employee has been created' });
      setCreateDrawerOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => 
      apiRequest('PATCH', `/api/employees/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({ title: 'Employee Updated' });
      setEditDrawerOpen(false);
    },
  });

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const departments = [...new Set(employees.map(e => e.department))];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getEmploymentTypeVariant = (type: string | null | undefined) => {
    switch (type) {
      case 'Full-time': return 'default';
      case 'Part-time': return 'secondary';
      case 'Contract': return 'outline';
      case 'Intern': return 'outline';
      default: return 'secondary';
    }
  };

  const formFields: FormField[] = [
    { name: 'employeeCode', label: 'Employee Code', type: 'text', required: true },
    { name: 'name', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'text', required: true },
    { name: 'phone', label: 'Phone', type: 'text', required: true },
    { name: 'role', label: 'Role', type: 'select', required: true, options: [
      { value: 'Medical Representative', label: 'Medical Representative' },
      { value: 'Warehouse Manager', label: 'Warehouse Manager' },
      { value: 'Warehouse Staff', label: 'Warehouse Staff' },
      { value: 'Finance Manager', label: 'Finance Manager' },
      { value: 'Finance Staff', label: 'Finance Staff' },
      { value: 'Logistics Manager', label: 'Logistics Manager' },
      { value: 'HR Manager', label: 'HR Manager' },
      { value: 'Admin', label: 'Admin' },
    ]},
    { name: 'department', label: 'Department', type: 'select', required: true, options: [
      { value: 'Sales', label: 'Sales' },
      { value: 'Operations', label: 'Operations' },
      { value: 'Finance', label: 'Finance' },
      { value: 'HR', label: 'HR' },
      { value: 'Admin', label: 'Admin' },
      { value: 'Warehouse', label: 'Warehouse' },
      { value: 'Logistics', label: 'Logistics' },
      { value: 'IT', label: 'IT' },
    ]},
    { name: 'employmentType', label: 'Employment Type', type: 'select', options: [
      { value: 'Full-time', label: 'Full-time' },
      { value: 'Part-time', label: 'Part-time' },
      { value: 'Contract', label: 'Contract' },
      { value: 'Intern', label: 'Intern' },
    ]},
    { name: 'workLocation', label: 'Work Location', type: 'text' },
    { name: 'territory', label: 'Territory (for MRs)', type: 'text' },
    { name: 'reportingManager', label: 'Reporting Manager', type: 'text' },
    { name: 'joiningDate', label: 'Joining Date', type: 'date', required: true },
  ];

  const exportColumns = [
    { key: 'employeeCode', label: 'ID', defaultSelected: true },
    { key: 'name', label: 'Name', defaultSelected: true },
    { key: 'email', label: 'Email', defaultSelected: true },
    { key: 'role', label: 'Role', defaultSelected: true },
    { key: 'department', label: 'Department', defaultSelected: true },
    { key: 'status', label: 'Status' },
    { key: 'joiningDate', label: 'Joining Date' },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    const payload = {
      ...data,
      joiningDate: data.joiningDate ? new Date(data.joiningDate as string) : new Date(),
    };
    createMutation.mutate(payload);
  };

  const handleEdit = (data: Record<string, unknown>) => {
    if (!selectedEmployee) return;
    const payload = {
      ...data,
      joiningDate: data.joiningDate ? new Date(data.joiningDate as string) : undefined,
    };
    updateMutation.mutate({ id: selectedEmployee.id, data: payload });
  };

  const handleDeactivate = (reason: string) => {
    if (!selectedEmployee) return;
    const newStatus = selectedEmployee.status === 'Active' ? 'Inactive' : 'Active';
    updateMutation.mutate({ id: selectedEmployee.id, data: { status: newStatus } });
    setDeactivateDialogOpen(false);
  };

  const getKycStatus = (emp: Employee) => {
    const daysEmployed = Math.floor((new Date().getTime() - new Date(emp.joiningDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysEmployed < 30) return 'Pending';
    if (daysEmployed < 90) return 'In Progress';
    return 'Verified';
  };

  const getPerformanceScore = (emp: Employee) => {
    const daysEmployed = Math.floor((new Date().getTime() - new Date(emp.joiningDate).getTime()) / (1000 * 60 * 60 * 24));
    const baseScore = 70 + Math.min(20, Math.floor(daysEmployed / 30));
    const departmentBonus = emp.department === 'Sales' ? 5 : emp.department === 'Operations' ? 3 : 2;
    return Math.min(100, baseScore + departmentBonus);
  };

  const columns: Column<Employee>[] = [
    { key: 'employeeCode', header: 'ID', render: (row) => <span className="font-mono text-xs" data-testid={`text-emp-id-${row.id}`}>{row.employeeCode}</span> },
    { key: 'name', header: 'Employee', render: (row) => (
      <button
        className="flex items-center gap-3 text-left hover-elevate rounded-md p-1 -m-1"
        onClick={() => navigate(`/hr/employees/${row.id}`)}
        data-testid={`button-employee-${row.id}`}
      >
        <Avatar className="h-8 w-8" data-testid={`avatar-employee-${row.id}`}>
          <AvatarImage src={row.profilePhotoUrl || undefined} alt={row.name} />
          <AvatarFallback className="text-xs">{getInitials(row.name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground hover:underline" data-testid={`text-employee-name-${row.id}`}>{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      </button>
    )},
    { key: 'role', header: 'Role', render: (row) => <span data-testid={`text-role-${row.id}`}>{row.role}</span> },
    { key: 'employmentType', header: 'Type', render: (row) => (
      <Badge variant={getEmploymentTypeVariant(row.employmentType)} data-testid={`badge-type-${row.id}`}>
        <Briefcase className="h-3 w-3 mr-1" />
        {row.employmentType || 'Full-time'}
      </Badge>
    )},
    { key: 'workLocation', header: 'Location', render: (row) => (
      <div className="flex items-center gap-1 text-sm" data-testid={`text-location-${row.id}`}>
        {row.workLocation && <MapPin className="h-3 w-3 text-muted-foreground" />}
        <span>{row.workLocation || '-'}</span>
      </div>
    )},
    { key: 'department', header: 'Department', render: (row) => <span data-testid={`text-department-${row.id}`}>{row.department}</span> },
    { key: 'kycStatus', header: 'KYC', render: (row) => {
      const status = getKycStatus(row);
      const variant = status === 'Verified' ? 'default' : status === 'In Progress' ? 'secondary' : 'outline';
      return <Badge variant={variant} data-testid={`badge-kyc-${row.id}`}><FileCheck className="h-3 w-3 mr-1" />{status}</Badge>;
    }},
    { key: 'performance', header: 'Performance', render: (row) => {
      const score = getPerformanceScore(row);
      return (
        <div className="flex items-center gap-2" data-testid={`text-performance-${row.id}`}>
          <Award className={`h-4 w-4 ${score >= 90 ? 'text-success' : score >= 70 ? 'text-warning' : 'text-destructive'}`} />
          <span className="font-mono text-sm">{score}%</span>
        </div>
      );
    }},
    { key: 'status', header: 'Status', render: (row) => <span data-testid={`badge-status-${row.id}`}><StatusPill status={row.status} /></span> },
    { key: 'joiningDate', header: 'Joined', render: (row) => <span data-testid={`text-joined-${row.id}`}>{new Date(row.joiningDate).toLocaleDateString()}</span> },
    { key: 'actions', header: '', render: (row) => (
      <RowActionsMenu 
        testId={`button-actions-${row.id}`}
        actions={[
          { label: 'View Profile', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/hr/employees/${row.id}`), testId: `menu-item-view-${row.id}` },
          { label: 'View Documents', icon: <FileCheck className="h-4 w-4" />, onClick: () => navigate(`/hr/employees/${row.id}?tab=documents`), testId: `menu-item-documents-${row.id}` },
          { label: 'Salary History', icon: <DollarSign className="h-4 w-4" />, onClick: () => navigate(`/hr/employees/${row.id}?tab=salary`), testId: `menu-item-salary-${row.id}` },
          { label: 'Leave Summary', icon: <Calendar className="h-4 w-4" />, onClick: () => navigate(`/hr/employees/${row.id}?tab=leave`), testId: `menu-item-leave-${row.id}` },
          { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => { setSelectedEmployee(row); setEditDrawerOpen(true); }, testId: `menu-item-edit-${row.id}` },
          { label: row.status === 'Active' ? 'Deactivate' : 'Activate', icon: row.status === 'Active' ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />, onClick: () => { setSelectedEmployee(row); setDeactivateDialogOpen(true); }, destructive: row.status === 'Active', testId: `menu-item-toggle-status-${row.id}` },
        ]} 
      />
    )},
  ];

  const activeCount = employees.filter(e => e.status === 'Active').length;
  const salesCount = employees.filter(e => e.department === 'Sales').length;
  const newThisMonth = employees.filter(e => {
    const joining = new Date(e.joiningDate);
    const now = new Date();
    return joining.getMonth() === now.getMonth() && joining.getFullYear() === now.getFullYear();
  }).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Employees" 
        description="Manage employee records and roles"
        actions={<Button onClick={() => setCreateDrawerOpen(true)} data-testid="button-add-employee"><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={employees.length} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Active" value={activeCount} trend={{ value: 5 }} />
        <StatCard title="Sales Team" value={salesCount} />
        <StatCard title="New This Month" value={newThisMonth} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search-employees" />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-department-filter"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Depts</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]" data-testid="select-status-filter"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="On Leave">On Leave</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">Export</Button>
      </div>

      <DataTable columns={columns} data={filteredEmployees} emptyMessage="No employees found. Add your first employee to get started." />

      <CreateEditDrawer open={createDrawerOpen} onClose={() => setCreateDrawerOpen(false)} title="Add Employee" fields={formFields} onSubmit={handleCreate} />
      <CreateEditDrawer open={editDrawerOpen} onClose={() => setEditDrawerOpen(false)} title="Edit Employee" fields={formFields} initialData={selectedEmployee ? {
        ...selectedEmployee,
        joiningDate: selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toISOString().split('T')[0] : '',
      } : undefined} onSubmit={handleEdit} />
      <ConfirmDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen} title={selectedEmployee?.status === 'Active' ? 'Deactivate Employee' : 'Activate Employee'} description={`Are you sure you want to ${selectedEmployee?.status === 'Active' ? 'deactivate' : 'activate'} ${selectedEmployee?.name}?`} requireReason confirmLabel={selectedEmployee?.status === 'Active' ? 'Deactivate' : 'Activate'} destructive={selectedEmployee?.status === 'Active'} onConfirm={handleDeactivate} />
      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} entityName="Employees" columns={exportColumns} totalRecords={filteredEmployees.length} />
      
      
    </div>
  );
}
