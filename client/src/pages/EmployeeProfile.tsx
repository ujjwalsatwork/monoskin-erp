import { useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DetailPageHeader } from '@/components/shared/DetailPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  User, Mail, Phone, MapPin, Briefcase, Calendar, Building2, Shield, FileCheck,
  Award, TrendingUp, Clock, DollarSign, Lock, Users, ChevronRight,
  CheckCircle, AlertCircle, Target, BookOpen, ClipboardCheck, Heart, Plus, Trash2, Edit2, Star,
  Camera, Loader2, Download, ListTodo, LogOut, ClipboardList, Sun, Square, CheckSquare,
  Laptop, UserCheck, Wallet, Send, XCircle, ChevronDown
} from 'lucide-react';
import type { LeaveRequest, CompanyHoliday } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Employee, HRAttendance, EmergencyContact } from '@shared/schema';

interface EmployeeProfile {
  employee: Employee;
  manager: { id: number; name: string; role: string; department: string; profilePhotoUrl: string | null } | null;
  directReports: { id: number; name: string; role: string; department: string; profilePhotoUrl: string | null }[];
  attendanceSummary: {
    presentDays: number; absentDays: number; halfDays: number; leaveDays: number;
    holidays: number; totalWorkHours: number; avgWorkHours: number; monthName: string;
  };
  leaveSummary: {
    annualLeave: { total: number; used: number; remaining: number };
    sickLeave: { total: number; used: number; remaining: number };
    casualLeave: { total: number; used: number; remaining: number };
  };
  kycStatus: string;
  documents: { name: string; type: string; status: string; uploadDate: string }[];
  performance: {
    score: number; rating: string; lastReviewDate: string;
    goals: { title: string; progress: number; status: string }[];
  };
  recentAttendance: HRAttendance[];
  tenure: { years: number; months: number; days: number };
}

const VALID_TABS = ['attendance', 'leave', 'performance', 'documents', 'salary', 'emergency', 'workflows'];

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const initialTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    return tab && VALID_TABS.includes(tab) ? tab : 'attendance';
  }, [location.search]);

  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '', relationship: '', phone: '', alternatePhone: '', email: '', address: '', isPrimary: false,
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [leaveRequestOpen, setLeaveRequestOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });
  const [workflowTab, setWorkflowTab] = useState<'onboarding' | 'exit' | 'audit'>('onboarding');

  const currentYear = new Date().getFullYear();

  const { data: employeeLeaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['/api/leave-requests', { employeeId: id }],
    queryFn: () => fetch(`/api/leave-requests?employeeId=${id}`, { credentials: 'include' }).then(r => r.json()),
    enabled: !!id,
  });
  const { data: companyHolidays = [] } = useQuery<CompanyHoliday[]>({
    queryKey: ['/api/company-holidays', { year: currentYear }],
    queryFn: () => fetch(`/api/company-holidays?year=${currentYear}`, { credentials: 'include' }).then(r => r.json()),
  });

  const leaveRequestMutation = useMutation({
    mutationFn: async (data: typeof leaveForm) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 864e5) + 1);
      return apiRequest('POST', '/api/leave-requests', {
        employeeId: Number(id),
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: String(totalDays),
        reason: data.reason,
        status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests'] });
      setLeaveRequestOpen(false);
      setLeaveForm({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });
      toast({ title: 'Leave Request Submitted', description: 'Your leave request is pending approval.' });
    },
    onError: () => toast({ title: 'Error', description: 'Could not submit leave request.', variant: 'destructive' }),
  });

  const LEAVE_TYPE_LABELS: Record<string, string> = {
    annual: 'Annual Leave', sick: 'Sick Leave', casual: 'Casual Leave',
    maternity: 'Maternity Leave', paternity: 'Paternity Leave', unpaid: 'Unpaid Leave',
    compensatory: 'Compensatory Off', bereavement: 'Bereavement Leave',
  };
  const LEAVE_STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle }> = {
    pending:   { color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20',   icon: Clock },
    approved:  { color: 'text-green-700 bg-green-50 dark:bg-green-950/20',   icon: CheckCircle },
    rejected:  { color: 'text-red-700 bg-red-50 dark:bg-red-950/20',         icon: XCircle },
    cancelled: { color: 'text-muted-foreground bg-muted',                     icon: XCircle },
  };

  type ChecklistItem = { id: string; label: string; dept: string; done: boolean };
  const [onboardingChecklist, setOnboardingChecklist] = useState<ChecklistItem[]>([
    { id: 'o1', label: 'Offer letter signed & received', dept: 'HR', done: false },
    { id: 'o2', label: 'KYC documents collected', dept: 'HR', done: false },
    { id: 'o3', label: 'Background verification initiated', dept: 'HR', done: false },
    { id: 'o4', label: 'Employee ID created in system', dept: 'HR', done: false },
    { id: 'o5', label: 'Laptop / device allocated', dept: 'IT', done: false },
    { id: 'o6', label: 'Email account & credentials created', dept: 'IT', done: false },
    { id: 'o7', label: 'System access & software licences assigned', dept: 'IT', done: false },
    { id: 'o8', label: 'Bank account details collected', dept: 'Finance', done: false },
    { id: 'o9', label: 'PF / ESI registration initiated', dept: 'Finance', done: false },
    { id: 'o10', label: 'Payroll set up complete', dept: 'Finance', done: false },
    { id: 'o11', label: 'Induction / orientation session completed', dept: 'HR', done: false },
    { id: 'o12', label: 'Reporting manager informed', dept: 'HR', done: false },
  ]);
  const [exitChecklist, setExitChecklist] = useState<ChecklistItem[]>([
    { id: 'e1', label: 'Resignation letter received & accepted', dept: 'HR', done: false },
    { id: 'e2', label: 'Notice period served / buyout confirmed', dept: 'HR', done: false },
    { id: 'e3', label: 'Knowledge transfer completed', dept: 'Manager', done: false },
    { id: 'e4', label: 'Laptop & devices returned', dept: 'IT', done: false },
    { id: 'e5', label: 'All system access revoked', dept: 'IT', done: false },
    { id: 'e6', label: 'Email account deactivated', dept: 'IT', done: false },
    { id: 'e7', label: 'Full & final settlement calculated', dept: 'Finance', done: false },
    { id: 'e8', label: 'Pending expenses reimbursed', dept: 'Finance', done: false },
    { id: 'e9', label: 'PF transfer / withdrawal processed', dept: 'Finance', done: false },
    { id: 'e10', label: 'Experience letter issued', dept: 'HR', done: false },
    { id: 'e11', label: 'Compliance clearance given', dept: 'HR', done: false },
    { id: 'e12', label: 'Exit interview completed', dept: 'HR', done: false },
  ]);
  const [auditChecklist, setAuditChecklist] = useState<ChecklistItem[]>([
    { id: 'a1', label: 'Employee records are complete and up to date', dept: 'HR', done: false },
    { id: 'a2', label: 'Offer letters and contracts on file', dept: 'HR', done: false },
    { id: 'a3', label: 'KYC / identity documents verified', dept: 'HR', done: false },
    { id: 'a4', label: 'Leave records match payroll', dept: 'Finance', done: false },
    { id: 'a5', label: 'Attendance data audited for the period', dept: 'HR', done: false },
    { id: 'a6', label: 'PF / ESI contributions reconciled', dept: 'Finance', done: false },
    { id: 'a7', label: 'Salary disbursement records audited', dept: 'Finance', done: false },
    { id: 'a8', label: 'Performance appraisals documented', dept: 'HR', done: false },
    { id: 'a9', label: 'Training and compliance certifications current', dept: 'HR', done: false },
    { id: 'a10', label: 'Data privacy consent on file', dept: 'HR', done: false },
  ]);

  const toggleChecklist = (
    list: ChecklistItem[],
    setList: React.Dispatch<React.SetStateAction<ChecklistItem[]>>,
    itemId: string,
  ) => {
    setList(list.map(i => i.id === itemId ? { ...i, done: !i.done } : i));
  };

  const exportLeaveCSV = () => {
    const header = 'Leave Type,Start Date,End Date,Days,Status,Reason\n';
    const rows = employeeLeaveRequests.map(r =>
      `${r.leaveType},${new Date(r.startDate).toLocaleDateString('en-IN')},${new Date(r.endDate).toLocaleDateString('en-IN')},${r.totalDays},${r.status},${r.reason || ''}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-history-emp-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Leave history downloaded as CSV.' });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const { uploadUrl, objectPath } = await fetch('/api/uploads/request-url', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: `employee-photo-${id}.${ext}`, contentType: file.type, folder: 'employee-photos' }),
      }).then(r => r.json());
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setLocalPhotoUrl(objectPath);
      await apiRequest('PATCH', `/api/employees/${id}`, { profilePhotoUrl: objectPath });
      queryClient.invalidateQueries({ queryKey: ['/api/employees', id, 'profile'] });
      toast({ title: 'Photo updated', description: 'Employee photo has been saved.' });
    } catch {
      toast({ title: 'Upload failed', description: 'Could not save photo. Please try again.', variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const { data: profile, isLoading } = useQuery<EmployeeProfile>({
    queryKey: ['/api/employees', id, 'profile'],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${id}/profile`, { credentials: 'include' });
      if (!res.ok) throw new Error('Employee not found');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: emergencyContacts = [] } = useQuery<EmergencyContact[]>({
    queryKey: [`/api/employees/${id}/emergency-contacts`],
    enabled: !!id,
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/employees/${id}/emergency-contacts`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${id}/emergency-contacts`] });
      setShowAddContactDialog(false);
      setContactForm({ name: '', relationship: '', phone: '', alternatePhone: '', email: '', address: '', isPrimary: false });
      toast({ title: 'Emergency contact added' });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      return apiRequest('DELETE', `/api/emergency-contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${id}/emergency-contacts`] });
      toast({ title: 'Emergency contact removed' });
    },
  });

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const formatDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-6">
          <Skeleton className="h-48 w-80" />
          <Skeleton className="h-48 flex-1" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <User className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Employee not found</p>
        <Button variant="outline" onClick={() => navigate('/hr/employees')} data-testid="button-back-to-list">Back to Employees</Button>
      </div>
    );
  }

  const { employee, manager, directReports, attendanceSummary, leaveSummary, kycStatus, documents, performance, recentAttendance, tenure } = profile;

  const employmentTypeVariant = (type: string | null | undefined) => {
    switch (type) {
      case 'Full-time': return 'default' as const;
      case 'Part-time': return 'secondary' as const;
      case 'Contract': return 'outline' as const;
      default: return 'secondary' as const;
    }
  };

  const attendanceStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 dark:text-green-400';
      case 'absent': return 'text-red-600 dark:text-red-400';
      case 'half-day': return 'text-yellow-600 dark:text-yellow-400';
      case 'leave': return 'text-blue-600 dark:text-blue-400';
      case 'holiday': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-muted-foreground';
    }
  };

  const goalStatusBadge = (status: string) => {
    if (status === 'completed') return <Badge variant="default" data-testid="badge-goal-completed"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
    if (status === 'on-track') return <Badge variant="secondary" data-testid="badge-goal-ontrack"><TrendingUp className="h-3 w-3 mr-1" />On Track</Badge>;
    return <Badge variant="destructive" data-testid="badge-goal-atrisk"><AlertCircle className="h-3 w-3 mr-1" />At Risk</Badge>;
  };

  return (
    <div className="space-y-6">
      <DetailPageHeader
        title={employee.name}
        subtitle={`${employee.role} - ${employee.department}`}
        entityId={employee.employeeCode}
        status={employee.status}
        backPath="/hr/employees"
        menuActions={[
          { label: 'Edit Employee', onClick: () => navigate('/hr/employees'), icon: undefined },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card data-testid="card-profile-summary">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Photo upload input (hidden) */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
                data-testid="input-employee-photo"
              />
              {/* Avatar with camera overlay */}
              <div
                className="relative group cursor-pointer"
                onClick={() => !uploadingPhoto && photoInputRef.current?.click()}
                data-testid="div-avatar-upload"
                title="Click to change photo"
              >
                <Avatar className="h-24 w-24" data-testid="avatar-profile">
                  <AvatarImage src={localPhotoUrl || employee.profilePhotoUrl || undefined} alt={employee.name} />
                  <AvatarFallback className="text-2xl">{getInitials(employee.name)}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingPhoto
                    ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                    : <Camera className="h-6 w-6 text-white" />
                  }
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold" data-testid="text-profile-name">{employee.name}</h2>
                <p className="text-muted-foreground" data-testid="text-profile-role">{employee.role}</p>
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                  <Badge variant={employmentTypeVariant(employee.employmentType)} data-testid="badge-employment-type">
                    <Briefcase className="h-3 w-3 mr-1" />{employee.employmentType || 'Full-time'}
                  </Badge>
                  <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'} data-testid="badge-profile-status">
                    {employee.status}
                  </Badge>
                </div>
              </div>
              <div className="w-full space-y-3 text-left text-sm">
                <div className="flex items-center gap-2" data-testid="text-profile-email">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{employee.email}</span>
                </div>
                <div className="flex items-center gap-2" data-testid="text-profile-phone">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{employee.phone}</span>
                </div>
                <div className="flex items-center gap-2" data-testid="text-profile-location">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{employee.workLocation || 'Not assigned'}</span>
                </div>
                <div className="flex items-center gap-2" data-testid="text-profile-department">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{employee.department}</span>
                </div>
                <div className="flex items-center gap-2" data-testid="text-profile-joined">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Joined {formatDate(employee.joiningDate)}</span>
                </div>
                {employee.territory && (
                  <div className="flex items-center gap-2" data-testid="text-profile-territory">
                    <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>Territory: {employee.territory}</span>
                  </div>
                )}
              </div>
              <div className="w-full pt-2 border-t text-sm text-center" data-testid="text-profile-tenure">
                <span className="text-muted-foreground">Tenure: </span>
                <span className="font-medium">
                  {tenure.years > 0 && `${tenure.years}y `}{tenure.months > 0 && `${tenure.months}m `}{tenure.days}d
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {manager && (
            <Card data-testid="card-reporting-manager">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Reporting Manager</CardTitle>
              </CardHeader>
              <CardContent>
                <button
                  className="flex items-center gap-3 hover-elevate rounded-md p-2 -m-2 w-full text-left"
                  onClick={() => navigate(`/hr/employees/${manager.id}`)}
                  data-testid="button-view-manager"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={manager.profilePhotoUrl || undefined} />
                    <AvatarFallback>{getInitials(manager.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium" data-testid="text-manager-name">{manager.name}</p>
                    <p className="text-sm text-muted-foreground">{manager.role} - {manager.department}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          )}

          {directReports.length > 0 && (
            <Card data-testid="card-direct-reports">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" /> Direct Reports ({directReports.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {directReports.map(report => (
                    <button
                      key={report.id}
                      className="flex items-center gap-3 hover-elevate rounded-md p-2 -m-1 w-full text-left"
                      onClick={() => navigate(`/hr/employees/${report.id}`)}
                      data-testid={`button-report-${report.id}`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={report.profilePhotoUrl || undefined} />
                        <AvatarFallback className="text-xs">{getInitials(report.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" data-testid={`text-report-name-${report.id}`}>{report.name}</p>
                        <p className="text-xs text-muted-foreground">{report.role}</p>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-kyc-status">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" /> KYC Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Badge
                  variant={kycStatus === 'Verified' ? 'default' : kycStatus === 'In Progress' ? 'secondary' : 'outline'}
                  data-testid="badge-kyc-status"
                >
                  <FileCheck className="h-3 w-3 mr-1" />{kycStatus}
                </Badge>
                <span className="text-sm text-muted-foreground" data-testid="text-kyc-description">
                  {kycStatus === 'Verified' ? 'All documents verified' : kycStatus === 'In Progress' ? 'Verification in progress' : 'Documents pending submission'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-4">
        <TabsList data-testid="tabs-profile-sections">
          <TabsTrigger value="attendance" data-testid="tab-attendance"><Clock className="h-4 w-4 mr-1" /> Attendance</TabsTrigger>
          <TabsTrigger value="leave" data-testid="tab-leave"><Calendar className="h-4 w-4 mr-1" /> Leave</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance"><Award className="h-4 w-4 mr-1" /> Performance</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents"><FileCheck className="h-4 w-4 mr-1" /> Documents</TabsTrigger>
          <TabsTrigger value="salary" data-testid="tab-salary"><DollarSign className="h-4 w-4 mr-1" /> Salary</TabsTrigger>
          <TabsTrigger value="emergency" data-testid="tab-emergency"><Heart className="h-4 w-4 mr-1" /> Emergency</TabsTrigger>
          <TabsTrigger value="workflows" data-testid="tab-workflows"><ListTodo className="h-4 w-4 mr-1" /> Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card data-testid="card-present-days">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-present-count">{attendanceSummary.presentDays}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </CardContent>
            </Card>
            <Card data-testid="card-absent-days">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-absent-count">{attendanceSummary.absentDays}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </CardContent>
            </Card>
            <Card data-testid="card-halfday-days">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-halfday-count">{attendanceSummary.halfDays}</p>
                <p className="text-xs text-muted-foreground">Half Days</p>
              </CardContent>
            </Card>
            <Card data-testid="card-leave-days">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-leave-count">{attendanceSummary.leaveDays}</p>
                <p className="text-xs text-muted-foreground">Leave</p>
              </CardContent>
            </Card>
            <Card data-testid="card-avg-hours">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold" data-testid="text-avg-hours">{attendanceSummary.avgWorkHours}</p>
                <p className="text-xs text-muted-foreground">Avg Hours/Day</p>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-recent-attendance">
            <CardHeader>
              <CardTitle className="text-base">Recent Attendance - {attendanceSummary.monthName}</CardTitle>
            </CardHeader>
            <CardContent>
              {recentAttendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-2 font-medium text-muted-foreground">Date</th>
                        <th className="p-2 font-medium text-muted-foreground">Status</th>
                        <th className="p-2 font-medium text-muted-foreground">Check In</th>
                        <th className="p-2 font-medium text-muted-foreground">Check Out</th>
                        <th className="p-2 font-medium text-muted-foreground">Hours</th>
                        <th className="p-2 font-medium text-muted-foreground">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAttendance.map((a, i) => (
                        <tr key={a.id} className="border-b last:border-0" data-testid={`row-attendance-${i}`}>
                          <td className="p-2">{formatDate(a.date)}</td>
                          <td className="p-2">
                            <span className={`font-medium capitalize ${attendanceStatusColor(a.status)}`} data-testid={`text-att-status-${i}`}>{a.status}</span>
                          </td>
                          <td className="p-2 font-mono text-xs">{a.checkIn || '-'}</td>
                          <td className="p-2 font-mono text-xs">{a.checkOut || '-'}</td>
                          <td className="p-2 font-mono text-xs">{a.workHours || '-'}</td>
                          <td className="p-2 text-muted-foreground text-xs">{a.location || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-attendance">No attendance records found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="space-y-5">
          {/* Actions row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Leave Dashboard</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportLeaveCSV} data-testid="button-export-leave">
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button size="sm" onClick={() => setLeaveRequestOpen(true)} data-testid="button-request-leave">
                <Plus className="h-4 w-4 mr-2" /> Request Leave
              </Button>
            </div>
          </div>

          {/* Leave Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Annual Leave', data: leaveSummary.annualLeave, color: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20' },
              { label: 'Sick Leave',   data: leaveSummary.sickLeave,   color: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20' },
              { label: 'Casual Leave', data: leaveSummary.casualLeave, color: 'bg-green-500',  bg: 'bg-green-50 dark:bg-green-950/20' },
            ].map((lt) => (
              <Card key={lt.label} className={lt.bg} data-testid={`card-${lt.label.toLowerCase().replace(' ', '-')}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${lt.color}`} />
                    <CardTitle className="text-sm font-semibold">{lt.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold" data-testid={`text-${lt.label.toLowerCase().replace(' ', '-')}-remaining`}>{lt.data.remaining}</span>
                    <span className="text-sm text-muted-foreground mb-0.5">/ {lt.data.total} days left</span>
                  </div>
                  <Progress value={(lt.data.used / lt.data.total) * 100} className="h-1.5"
                    data-testid={`progress-${lt.label.toLowerCase().replace(' ', '-')}`} />
                  <p className="text-xs text-muted-foreground">{lt.data.used} days used</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pending / Recent Leave Applications */}
          <Card data-testid="card-leave-requests">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> My Leave Applications
              </CardTitle>
              <Badge variant="secondary">{employeeLeaveRequests.length} total</Badge>
            </CardHeader>
            <CardContent>
              {employeeLeaveRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No leave applications yet.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setLeaveRequestOpen(true)} data-testid="btn-request-leave-empty">
                    <Plus className="h-4 w-4 mr-2" /> Apply for Leave
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {employeeLeaveRequests.slice().reverse().slice(0, 8).map(req => {
                    const sc = LEAVE_STATUS_CONFIG[req.status] || LEAVE_STATUS_CONFIG.pending;
                    const StatusIcon = sc.icon;
                    return (
                      <div key={req.id} className="flex items-center gap-4 p-3 border rounded-lg" data-testid={`row-leave-${req.id}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{LEAVE_TYPE_LABELS[req.leaveType] || req.leaveType}</p>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.color}`}
                              data-testid={`badge-leave-status-${req.id}`}>
                              <StatusIcon className="h-3 w-3" />
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(req.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} –{' '}
                            {new Date(req.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' '}· {req.totalDays} day{Number(req.totalDays) !== 1 ? 's' : ''}
                          </p>
                          {req.reason && <p className="text-xs text-muted-foreground/70 truncate">{req.reason}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Company Holidays */}
          <Card data-testid="card-upcoming-holidays">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-500" /> Company Holidays {currentYear}
              </CardTitle>
              <Badge variant="secondary">{companyHolidays.length} total</Badge>
            </CardHeader>
            <CardContent>
              {companyHolidays.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No holidays configured for {currentYear}.</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {companyHolidays
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(h => {
                      const isPast = new Date(h.date) < new Date();
                      const typeColors: Record<string, string> = {
                        public: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
                        company: 'bg-primary/10 text-primary',
                        restricted: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                      };
                      return (
                        <div key={h.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isPast ? 'opacity-50' : 'hover:bg-muted/40'}`}
                          data-testid={`holiday-row-${h.id}`}>
                          <div className="w-10 text-center flex-shrink-0">
                            <p className="text-[10px] text-muted-foreground">{new Date(h.date).toLocaleString('default', { month: 'short' })}</p>
                            <p className="text-base font-bold leading-none">{new Date(h.date).getDate()}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{h.name}</p>
                            <p className="text-xs text-muted-foreground">{new Date(h.date).toLocaleString('default', { weekday: 'long' })}</p>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColors[h.type] || typeColors.public}`}>
                            {h.type.charAt(0).toUpperCase() + h.type.slice(1)}
                          </span>
                          {h.isOptional && <Star className="h-3 w-3 text-amber-500 flex-shrink-0" title="Optional" />}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card data-testid="card-performance-score">
              <CardHeader>
                <CardTitle className="text-base">Performance Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 flex items-center justify-center">
                    <svg className="h-20 w-20 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"
                        className={performance.score >= 90 ? 'text-green-500' : performance.score >= 70 ? 'text-yellow-500' : 'text-red-500'}
                        strokeDasharray={`${performance.score * 2.51} 251`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-lg font-bold" data-testid="text-performance-score">{performance.score}%</span>
                  </div>
                  <div>
                    <p className="font-semibold text-lg" data-testid="text-performance-rating">{performance.rating}</p>
                    <p className="text-sm text-muted-foreground">Last review: {formatDate(performance.lastReviewDate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-goals">
              <CardHeader>
                <CardTitle className="text-base">Goals & Objectives</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {performance.goals.map((goal, i) => (
                  <div key={i} className="space-y-2" data-testid={`goal-${i}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium" data-testid={`text-goal-title-${i}`}>{goal.title}</span>
                      {goalStatusBadge(goal.status)}
                    </div>
                    <Progress value={goal.progress} className="h-1.5" data-testid={`progress-goal-${i}`} />
                    <p className="text-xs text-muted-foreground text-right">{goal.progress}%</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card data-testid="card-documents">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" /> Linked Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 p-3 border rounded-md" data-testid={`doc-row-${i}`}>
                    <div className="flex items-center gap-3">
                      <FileCheck className={`h-5 w-5 ${doc.status === 'verified' ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="text-sm font-medium" data-testid={`text-doc-name-${i}`}>{doc.name}</p>
                        <p className="text-xs text-muted-foreground">Type: {doc.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{formatDate(doc.uploadDate)}</span>
                      <Badge
                        variant={doc.status === 'verified' ? 'default' : 'secondary'}
                        data-testid={`badge-doc-status-${i}`}
                      >
                        {doc.status === 'verified' ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                        {doc.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="space-y-4">
          <Card data-testid="card-salary-restricted">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" /> Salary Details
                <Badge variant="outline" data-testid="badge-restricted">Restricted Access</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-md border border-dashed text-center" data-testid="salary-access-notice">
                  <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Salary information is restricted</p>
                  <p className="text-xs text-muted-foreground mt-1">Only HR Managers and authorized personnel can view salary details. Contact your HR department for access.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-md" data-testid="salary-field-ctc">
                    <Label className="text-xs text-muted-foreground">Annual CTC</Label>
                    <p className="font-mono text-lg font-semibold blur-sm select-none" aria-hidden="true">XX,XX,XXX</p>
                  </div>
                  <div className="p-3 border rounded-md" data-testid="salary-field-monthly">
                    <Label className="text-xs text-muted-foreground">Monthly Gross</Label>
                    <p className="font-mono text-lg font-semibold blur-sm select-none" aria-hidden="true">X,XX,XXX</p>
                  </div>
                  <div className="p-3 border rounded-md" data-testid="salary-field-bank">
                    <Label className="text-xs text-muted-foreground">Bank Account</Label>
                    <p className="font-mono blur-sm select-none" aria-hidden="true">XXXX XXXX XXXX</p>
                  </div>
                  <div className="p-3 border rounded-md" data-testid="salary-field-pf">
                    <Label className="text-xs text-muted-foreground">PF Number</Label>
                    <p className="font-mono blur-sm select-none" aria-hidden="true">XX/XXXXX/XXXXX</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => toast({ title: 'Access Required', description: 'Please contact HR Manager to view salary details' })}
                  data-testid="button-request-salary-access"
                >
                  <Lock className="h-4 w-4 mr-2" /> Request Access
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="emergency" className="space-y-4">
          <Card data-testid="card-emergency-contacts">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4" /> Emergency Contacts
              </CardTitle>
              <Button size="sm" onClick={() => setShowAddContactDialog(true)} data-testid="button-add-emergency-contact">
                <Plus className="h-4 w-4 mr-1" /> Add Contact
              </Button>
            </CardHeader>
            <CardContent>
              {emergencyContacts.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground" data-testid="text-no-emergency-contacts">No emergency contacts added yet</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddContactDialog(true)} data-testid="button-add-contact-empty">
                    <Plus className="h-4 w-4 mr-1" /> Add Emergency Contact
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {emergencyContacts.map((contact, i) => (
                    <div key={contact.id} className="flex items-start justify-between gap-4 p-4 border rounded-md" data-testid={`row-emergency-contact-${contact.id}`}>
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 mt-0.5">
                          <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium" data-testid={`text-contact-name-${contact.id}`}>{contact.name}</p>
                            {contact.isPrimary && (
                              <Badge variant="default" className="text-xs" data-testid={`badge-primary-contact-${contact.id}`}>
                                <Star className="h-3 w-3 mr-0.5" /> Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground" data-testid={`text-contact-relationship-${contact.id}`}>{contact.relationship}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1" data-testid={`text-contact-phone-${contact.id}`}>
                              <Phone className="h-3 w-3 text-muted-foreground" /> {contact.phone}
                            </span>
                            {contact.alternatePhone && (
                              <span className="flex items-center gap-1 text-muted-foreground" data-testid={`text-contact-alt-phone-${contact.id}`}>
                                <Phone className="h-3 w-3" /> {contact.alternatePhone}
                              </span>
                            )}
                            {contact.email && (
                              <span className="flex items-center gap-1 text-muted-foreground" data-testid={`text-contact-email-${contact.id}`}>
                                <Mail className="h-3 w-3" /> {contact.email}
                              </span>
                            )}
                          </div>
                          {contact.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-contact-address-${contact.id}`}>
                              <MapPin className="h-3 w-3" /> {contact.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteContactMutation.mutate(contact.id)}
                        data-testid={`button-delete-contact-${contact.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* ── WORKFLOWS TAB ── */}
        <TabsContent value="workflows" className="space-y-4">
          {/* Sub-tab navigation */}
          <div className="flex gap-2 flex-wrap">
            {([
              { key: 'onboarding', label: 'Onboarding Checklist', icon: UserCheck, color: 'text-green-600' },
              { key: 'exit',       label: 'Exit Process',          icon: LogOut,    color: 'text-red-500' },
              { key: 'audit',      label: 'HR Audit Easy Mode',    icon: ClipboardCheck, color: 'text-primary' },
            ] as const).map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => setWorkflowTab(key)}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                  workflowTab === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground',
                ].join(' ')}
                data-testid={`tab-workflow-${key}`}
              >
                <Icon className={`h-4 w-4 ${workflowTab === key ? '' : color}`} />
                {label}
              </button>
            ))}
          </div>

          {/* Onboarding Checklist */}
          {workflowTab === 'onboarding' && (
            <Card data-testid="card-onboarding">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-600" /> Onboarding Checklist
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {onboardingChecklist.filter(i => i.done).length}/{onboardingChecklist.length} completed
                    </span>
                    <Progress value={Math.round((onboardingChecklist.filter(i => i.done).length / onboardingChecklist.length) * 100)} className="w-24 h-2" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(['HR', 'IT', 'Finance'] as const).map(dept => {
                  const items = onboardingChecklist.filter(i => i.dept === dept);
                  const deptIcons = { HR: UserCheck, IT: Laptop, Finance: Wallet };
                  const DeptIcon = deptIcons[dept];
                  const deptColors = { HR: 'text-primary', IT: 'text-blue-600', Finance: 'text-green-600' };
                  return (
                    <div key={dept} className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <DeptIcon className={`h-4 w-4 ${deptColors[dept]}`} />
                        <h4 className="text-sm font-semibold">{dept}</h4>
                        <Badge variant="secondary" className="text-[10px] h-4">{items.filter(i => i.done).length}/{items.length}</Badge>
                      </div>
                      <div className="space-y-1.5 pl-6">
                        {items.map(item => (
                          <label key={item.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/40 px-2 py-1.5 rounded-md transition-colors"
                            data-testid={`check-onboarding-${item.id}`}>
                            <Checkbox
                              checked={item.done}
                              onCheckedChange={() => toggleChecklist(onboardingChecklist, setOnboardingChecklist, item.id)}
                              className="flex-shrink-0"
                            />
                            <span className={`text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
                            {item.done && <CheckCircle className="h-3.5 w-3.5 text-green-500 ml-auto flex-shrink-0" />}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Exit Process */}
          {workflowTab === 'exit' && (
            <Card data-testid="card-exit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <LogOut className="h-4 w-4 text-red-500" /> Exit Process Workflow
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {exitChecklist.filter(i => i.done).length}/{exitChecklist.length} cleared
                    </span>
                    <Progress value={Math.round((exitChecklist.filter(i => i.done).length / exitChecklist.length) * 100)} className="w-24 h-2" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Complete all clearances before the last working day.</p>
              </CardHeader>
              <CardContent>
                {(['HR', 'IT', 'Finance', 'Manager'] as const).map(dept => {
                  const items = exitChecklist.filter(i => i.dept === dept);
                  if (!items.length) return null;
                  const deptIcons: Record<string, typeof UserCheck> = { HR: UserCheck, IT: Laptop, Finance: Wallet, Manager: Users };
                  const DeptIcon = deptIcons[dept] || Users;
                  const deptColors: Record<string, string> = { HR: 'text-primary', IT: 'text-blue-600', Finance: 'text-green-600', Manager: 'text-amber-600' };
                  return (
                    <div key={dept} className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <DeptIcon className={`h-4 w-4 ${deptColors[dept]}`} />
                        <h4 className="text-sm font-semibold">{dept}</h4>
                        <Badge variant="secondary" className="text-[10px] h-4">{items.filter(i => i.done).length}/{items.length}</Badge>
                      </div>
                      <div className="space-y-1.5 pl-6">
                        {items.map(item => (
                          <label key={item.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/40 px-2 py-1.5 rounded-md transition-colors"
                            data-testid={`check-exit-${item.id}`}>
                            <Checkbox
                              checked={item.done}
                              onCheckedChange={() => toggleChecklist(exitChecklist, setExitChecklist, item.id)}
                              className="flex-shrink-0"
                            />
                            <span className={`text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
                            {item.done && <CheckCircle className="h-3.5 w-3.5 text-green-500 ml-auto flex-shrink-0" />}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {exitChecklist.every(i => i.done) && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="font-semibold text-green-700 dark:text-green-400">All clearances complete</p>
                    <p className="text-xs text-muted-foreground mt-1">Ready for full & final settlement.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* HR Audit Easy Mode */}
          {workflowTab === 'audit' && (
            <Card data-testid="card-audit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" /> HR Audit — Easy Mode
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {auditChecklist.filter(i => i.done).length}/{auditChecklist.length} verified
                    </span>
                    <Progress value={Math.round((auditChecklist.filter(i => i.done).length / auditChecklist.length) * 100)} className="w-24 h-2" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Simple audit checklist — tick each item once reviewed and verified for this employee's record.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {auditChecklist.map(item => {
                    const deptColors: Record<string, string> = { HR: 'text-primary', Finance: 'text-green-600' };
                    return (
                      <label key={item.id}
                        className={`flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg transition-colors border ${item.done ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800' : 'border-border hover:bg-muted/40'}`}
                        data-testid={`check-audit-${item.id}`}>
                        <Checkbox
                          checked={item.done}
                          onCheckedChange={() => toggleChecklist(auditChecklist, setAuditChecklist, item.id)}
                          className="flex-shrink-0"
                        />
                        <span className={`text-sm flex-1 ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
                        <Badge variant="outline" className={`text-[10px] h-4 flex-shrink-0 ${deptColors[item.dept] || ''}`}>{item.dept}</Badge>
                        {item.done && <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
                      </label>
                    );
                  })}
                </div>
                {auditChecklist.every(i => i.done) && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                    <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="font-semibold text-green-700 dark:text-green-400">Audit complete — all items verified</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>

      {/* Leave Request Dialog */}
      <Dialog open={leaveRequestOpen} onOpenChange={setLeaveRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Apply for Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select value={leaveForm.leaveType} onValueChange={v => setLeaveForm(f => ({ ...f, leaveType: v }))} data-testid="select-leave-type">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAVE_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={leaveForm.startDate}
                  onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))}
                  data-testid="input-leave-start" />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={leaveForm.endDate} min={leaveForm.startDate}
                  onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))}
                  data-testid="input-leave-end" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input placeholder="Brief reason for leave" value={leaveForm.reason}
                onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                data-testid="input-leave-reason" />
            </div>
            {leaveForm.startDate && leaveForm.endDate && leaveForm.endDate >= leaveForm.startDate && (
              <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">
                Duration: {Math.max(1, Math.ceil((new Date(leaveForm.endDate).getTime() - new Date(leaveForm.startDate).getTime()) / 864e5) + 1)} day(s)
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveRequestOpen(false)}>Cancel</Button>
            <Button onClick={() => leaveRequestMutation.mutate(leaveForm)}
              disabled={leaveRequestMutation.isPending || !leaveForm.startDate || !leaveForm.endDate}
              data-testid="btn-submit-leave">
              {leaveRequestMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" /> Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddContactDialog} onOpenChange={setShowAddContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={contactForm.name}
                  onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="Contact name"
                  data-testid="input-contact-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select value={contactForm.relationship} onValueChange={val => setContactForm({ ...contactForm, relationship: val })}>
                  <SelectTrigger data-testid="select-contact-relationship">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spouse">Spouse</SelectItem>
                    <SelectItem value="Parent">Parent</SelectItem>
                    <SelectItem value="Sibling">Sibling</SelectItem>
                    <SelectItem value="Child">Child</SelectItem>
                    <SelectItem value="Friend">Friend</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={contactForm.phone}
                  onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="Primary phone"
                  data-testid="input-contact-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Alternate Phone</Label>
                <Input
                  value={contactForm.alternatePhone}
                  onChange={e => setContactForm({ ...contactForm, alternatePhone: e.target.value })}
                  placeholder="Alternate phone (optional)"
                  data-testid="input-contact-alt-phone"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                value={contactForm.email}
                onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                placeholder="Email address"
                data-testid="input-contact-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Address (Optional)</Label>
              <Input
                value={contactForm.address}
                onChange={e => setContactForm({ ...contactForm, address: e.target.value })}
                placeholder="Home address"
                data-testid="input-contact-address"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={contactForm.isPrimary}
                onCheckedChange={(checked) => setContactForm({ ...contactForm, isPrimary: checked === true })}
                id="isPrimary"
                data-testid="checkbox-primary-contact"
              />
              <Label htmlFor="isPrimary" className="text-sm cursor-pointer">Set as primary emergency contact</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddContactDialog(false)} data-testid="button-cancel-contact">Cancel</Button>
            <Button
              onClick={() => {
                if (contactForm.name && contactForm.relationship && contactForm.phone) {
                  createContactMutation.mutate({
                    name: contactForm.name,
                    relationship: contactForm.relationship,
                    phone: contactForm.phone,
                    alternatePhone: contactForm.alternatePhone || undefined,
                    email: contactForm.email || undefined,
                    address: contactForm.address || undefined,
                    isPrimary: contactForm.isPrimary,
                  });
                }
              }}
              disabled={!contactForm.name || !contactForm.relationship || !contactForm.phone || createContactMutation.isPending}
              data-testid="button-save-contact"
            >
              {createContactMutation.isPending ? 'Saving...' : 'Save Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}