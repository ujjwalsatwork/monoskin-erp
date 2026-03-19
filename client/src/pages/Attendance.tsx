import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FilterDrawer } from '@/components/shared/FilterDrawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Calendar, Clock, MapPin, Users, CheckCircle, XCircle, AlertCircle,
  Download, Navigation, Coffee, AlertTriangle, Timer, Shield, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { HRAttendance, Employee } from '@shared/schema';

interface AttendanceWithEmployee extends HRAttendance {
  employee?: Employee;
}

interface AttendanceAlert {
  type: string;
  severity: string;
  employeeId: number;
  employeeName: string;
  message: string;
  date?: string;
  details?: string;
}

interface AttendanceSummary {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  lateDays: number;
  earlyDays: number;
  totalHours: number;
  avgHoursPerDay: number;
  totalBreakMinutes: number;
  gpsVerifiedPercentage: number;
  totalRecords: number;
}

function getWeekRange(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    label: `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
  };
}

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    label: start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function Attendance() {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateStr = formatDate(selectedDate);
  const weekRange = useMemo(() => getWeekRange(selectedDate), [dateStr]);
  const monthRange = useMemo(() => getMonthRange(selectedDate), [selectedDate.getMonth(), selectedDate.getFullYear()]);

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const { data: dailyAttendance = [], isLoading: dailyLoading } = useQuery<HRAttendance[]>({
    queryKey: ['/api/hr-attendance', dateStr],
    queryFn: () => fetch(`/api/hr-attendance?date=${dateStr}`, { credentials: 'include' }).then(r => r.json()),
    enabled: activeView === 'daily',
  });

  const { data: weeklyAttendance = [], isLoading: weeklyLoading } = useQuery<HRAttendance[]>({
    queryKey: [`/api/hr-attendance/range?startDate=${weekRange.startDate}&endDate=${weekRange.endDate}`],
    enabled: activeView === 'weekly',
  });

  const { data: monthlySummaries = [], isLoading: monthlyLoading } = useQuery<AttendanceSummary[]>({
    queryKey: [`/api/hr-attendance/summary?startDate=${monthRange.startDate}&endDate=${monthRange.endDate}`],
    enabled: activeView === 'monthly',
  });

  const { data: alerts = [] } = useQuery<AttendanceAlert[]>({
    queryKey: ['/api/hr-attendance/alerts?days=7'],
  });

  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  const enrichRecords = (records: HRAttendance[]): AttendanceWithEmployee[] =>
    records.map(a => ({ ...a, employee: employeeMap.get(a.employeeId) }));

  const dailyRecords = useMemo(() => enrichRecords(dailyAttendance), [dailyAttendance, employeeMap]);
  const weeklyRecords = useMemo(() => enrichRecords(weeklyAttendance), [weeklyAttendance, employeeMap]);

  const departments = useMemo(() => [...new Set(employees.map(e => e.department))], [employees]);
  const statuses = ['present', 'absent', 'half-day', 'leave', 'holiday'];

  const filterOptions = [
    { key: 'department', label: 'Department', type: 'select' as const, options: departments.map(d => ({ value: d, label: d })) },
    { key: 'status', label: 'Status', type: 'select' as const, options: statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })) },
    { key: 'gpsVerified', label: 'GPS Verified', type: 'select' as const, options: [{ value: 'true', label: 'Verified' }, { value: 'false', label: 'Not Verified' }] },
    { key: 'lateOnly', label: 'Late Arrivals', type: 'select' as const, options: [{ value: 'true', label: 'Late Only' }] },
  ];

  const applyFilters = (records: AttendanceWithEmployee[]) =>
    records.filter(record => {
      if (activeFilters.department && record.employee?.department !== activeFilters.department) return false;
      if (activeFilters.status && record.status !== activeFilters.status) return false;
      if (activeFilters.gpsVerified === 'true' && !record.gpsVerified) return false;
      if (activeFilters.gpsVerified === 'false' && record.gpsVerified) return false;
      if (activeFilters.lateOnly === 'true' && !record.isLate) return false;
      return true;
    });

  const filteredDaily = useMemo(() => applyFilters(dailyRecords), [dailyRecords, activeFilters]);
  const filteredWeekly = useMemo(() => applyFilters(weeklyRecords), [weeklyRecords, activeFilters]);

  const currentRecords = activeView === 'daily' ? dailyRecords : weeklyRecords;
  const stats = useMemo(() => {
    if (activeView === 'monthly' && monthlySummaries.length > 0) {
      const totalPresent = monthlySummaries.reduce((s, r) => s + r.presentDays, 0);
      const totalAbsent = monthlySummaries.reduce((s, r) => s + r.absentDays, 0);
      const totalLeave = monthlySummaries.reduce((s, r) => s + r.leaveDays, 0);
      const totalLate = monthlySummaries.reduce((s, r) => s + r.lateDays, 0);
      const totalRecords = monthlySummaries.reduce((s, r) => s + r.totalRecords, 0);
      const avgGps = monthlySummaries.length > 0
        ? Math.round(monthlySummaries.reduce((s, r) => s + r.gpsVerifiedPercentage, 0) / monthlySummaries.length) : 0;
      const avgHrs = monthlySummaries.filter(r => r.avgHoursPerDay > 0).length > 0
        ? (monthlySummaries.reduce((s, r) => s + r.avgHoursPerDay, 0) / monthlySummaries.filter(r => r.avgHoursPerDay > 0).length).toFixed(1) : '0.0';
      const avgBrk = monthlySummaries.filter(r => r.totalBreakMinutes > 0).length > 0
        ? Math.round(monthlySummaries.reduce((s, r) => s + r.totalBreakMinutes, 0) / monthlySummaries.filter(r => r.totalBreakMinutes > 0).length) : 0;
      return {
        total: totalRecords,
        present: totalPresent,
        absent: totalAbsent,
        leave: totalLeave,
        late: totalLate,
        gpsVerified: avgGps,
        gpsIsPercentage: true,
        avgHours: avgHrs,
        avgBreak: avgBrk,
      };
    }
    return {
      total: currentRecords.length,
      present: currentRecords.filter(r => r.status === 'present').length,
      absent: currentRecords.filter(r => r.status === 'absent').length,
      leave: currentRecords.filter(r => r.status === 'leave').length,
      late: currentRecords.filter(r => r.isLate).length,
      gpsVerified: currentRecords.filter(r => r.gpsVerified).length,
      gpsIsPercentage: false,
      avgHours: currentRecords.filter(r => Number(r.workHours) > 0).length > 0
        ? (currentRecords.reduce((sum, r) => sum + Number(r.workHours), 0) / currentRecords.filter(r => Number(r.workHours) > 0).length).toFixed(1)
        : '0.0',
      avgBreak: currentRecords.filter(r => (r.breakDurationMinutes || 0) > 0).length > 0
        ? Math.round(currentRecords.reduce((sum, r) => sum + (r.breakDurationMinutes || 0), 0) / currentRecords.filter(r => (r.breakDurationMinutes || 0) > 0).length)
        : 0,
    };
  }, [currentRecords, activeView, monthlySummaries]);

  const navigateDate = (direction: number) => {
    const d = new Date(selectedDate);
    if (activeView === 'daily') d.setDate(d.getDate() + direction);
    else if (activeView === 'weekly') d.setDate(d.getDate() + direction * 7);
    else d.setMonth(d.getMonth() + direction);
    setSelectedDate(d);
  };

  const handleExport = () => {
    toast({ title: 'Export started', description: 'Attendance report is being generated.' });
  };

  const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }> = {
    present: { variant: 'default', icon: CheckCircle },
    absent: { variant: 'destructive', icon: XCircle },
    'half-day': { variant: 'secondary', icon: AlertCircle },
    leave: { variant: 'outline', icon: Calendar },
    holiday: { variant: 'outline', icon: Calendar },
  };

  const dailyColumns: Column<AttendanceWithEmployee>[] = [
    { key: 'employee', header: 'Employee', render: (record) => (
      <div>
        <div className="font-medium" data-testid={`text-employee-name-${record.id}`}>{record.employee?.name || 'Unknown'}</div>
        <div className="text-xs text-muted-foreground" data-testid={`text-employee-code-${record.id}`}>{record.employee?.employeeCode}</div>
      </div>
    )},
    { key: 'department', header: 'Department', render: (record) => <Badge variant="outline" data-testid={`badge-department-${record.id}`}>{record.employee?.department || '-'}</Badge> },
    { key: 'checkIn', header: 'Check In', render: (record) => (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-sm" data-testid={`text-checkin-${record.id}`}>{record.checkIn || '-'}</span>
        </div>
        {record.isLate && (
          <Badge variant="destructive" className="text-[10px]" data-testid={`badge-late-${record.id}`}>
            <Timer className="h-2.5 w-2.5 mr-0.5" />
            Late {record.lateMinutes}min
          </Badge>
        )}
      </div>
    )},
    { key: 'checkOut', header: 'Check Out', render: (record) => (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-sm" data-testid={`text-checkout-${record.id}`}>{record.checkOut || '-'}</span>
        </div>
        {record.isEarlyDeparture && (
          <Badge variant="secondary" className="text-[10px]" data-testid={`badge-early-${record.id}`}>
            <Timer className="h-2.5 w-2.5 mr-0.5" />
            Early {record.earlyMinutes}min
          </Badge>
        )}
      </div>
    )},
    { key: 'break', header: 'Break', render: (record) => (
      <div className="flex items-center gap-1">
        <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm" data-testid={`text-break-${record.id}`}>
          {record.breakDurationMinutes ? `${record.breakDurationMinutes}min` : '-'}
        </span>
        {record.breakStart && record.breakEnd && (
          <span className="text-xs text-muted-foreground">({record.breakStart}-{record.breakEnd})</span>
        )}
      </div>
    )},
    { key: 'workHours', header: 'Hours', render: (record) => {
      const hours = Number(record.workHours);
      return (
        <span className={`font-mono text-sm ${hours >= 8 ? '' : hours > 0 ? 'text-muted-foreground' : 'text-destructive'}`} data-testid={`text-hours-${record.id}`}>
          {hours > 0 ? `${hours.toFixed(1)}h` : '-'}
        </span>
      );
    }},
    { key: 'status', header: 'Status', render: (record) => {
      const config = statusConfig[record.status] || statusConfig.present;
      const IconComponent = config.icon;
      return (
        <Badge variant={config.variant} data-testid={`badge-attendance-status-${record.id}`}>
          <IconComponent className="h-3 w-3 mr-1" />
          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
        </Badge>
      );
    }},
    { key: 'gps', header: 'GPS', render: (record) => (
      <div className="flex items-center gap-1" data-testid={`gps-status-${record.id}`}>
        {record.gpsVerified ? (
          <Badge variant="default" className="text-[10px]">
            <Navigation className="h-2.5 w-2.5 mr-0.5" />
            Verified
          </Badge>
        ) : record.status === 'present' ? (
          <Badge variant="outline" className="text-[10px]">
            <Navigation className="h-2.5 w-2.5 mr-0.5" />
            Unverified
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>
    )},
    { key: 'location', header: 'Location', render: (record) => (
      <div className="flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm truncate max-w-[120px]" data-testid={`text-location-${record.id}`}>{record.location || '-'}</span>
      </div>
    )},
  ];

  const weeklyColumns: Column<AttendanceWithEmployee>[] = [
    { key: 'employee', header: 'Employee', render: (record) => (
      <div>
        <div className="font-medium" data-testid={`text-employee-name-${record.id}`}>{record.employee?.name || 'Unknown'}</div>
        <div className="text-xs text-muted-foreground">{record.employee?.employeeCode}</div>
      </div>
    )},
    { key: 'date', header: 'Date', render: (record) => (
      <span className="text-sm" data-testid={`text-date-${record.id}`}>
        {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
      </span>
    )},
    { key: 'checkIn', header: 'In', render: (record) => (
      <div className="flex items-center gap-1">
        <span className="font-mono text-sm" data-testid={`text-checkin-${record.id}`}>{record.checkIn || '-'}</span>
        {record.isLate && <Badge variant="destructive" className="text-[10px]">Late</Badge>}
      </div>
    )},
    { key: 'checkOut', header: 'Out', render: (record) => (
      <div className="flex items-center gap-1">
        <span className="font-mono text-sm" data-testid={`text-checkout-${record.id}`}>{record.checkOut || '-'}</span>
        {record.isEarlyDeparture && <Badge variant="secondary" className="text-[10px]">Early</Badge>}
      </div>
    )},
    { key: 'break', header: 'Break', render: (record) => (
      <span className="text-sm" data-testid={`text-break-${record.id}`}>
        {record.breakDurationMinutes ? `${record.breakDurationMinutes}m` : '-'}
      </span>
    )},
    { key: 'workHours', header: 'Hours', render: (record) => (
      <span className="font-mono text-sm" data-testid={`text-hours-${record.id}`}>
        {Number(record.workHours) > 0 ? `${Number(record.workHours).toFixed(1)}h` : '-'}
      </span>
    )},
    { key: 'status', header: 'Status', render: (record) => {
      const config = statusConfig[record.status] || statusConfig.present;
      const IconComponent = config.icon;
      return (
        <Badge variant={config.variant} data-testid={`badge-status-${record.id}`}>
          <IconComponent className="h-3 w-3 mr-1" />
          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
        </Badge>
      );
    }},
    { key: 'gps', header: 'GPS', render: (record) => (
      record.gpsVerified ? (
        <Badge variant="default" className="text-[10px]" data-testid={`gps-badge-${record.id}`}>
          <Navigation className="h-2.5 w-2.5 mr-0.5" />
          OK
        </Badge>
      ) : record.status === 'present' ? (
        <Badge variant="outline" className="text-[10px]" data-testid={`gps-badge-${record.id}`}>
          <Navigation className="h-2.5 w-2.5 mr-0.5" />
          No
        </Badge>
      ) : <span className="text-xs text-muted-foreground">-</span>
    )},
  ];

  const monthlyColumns: Column<AttendanceSummary & { id: number }>[] = [
    { key: 'employeeName', header: 'Employee', render: (record) => (
      <div>
        <div className="font-medium" data-testid={`text-summary-name-${record.employeeId}`}>{record.employeeName}</div>
        <div className="text-xs text-muted-foreground">{record.employeeCode}</div>
      </div>
    )},
    { key: 'department', header: 'Department', render: (record) => <Badge variant="outline" data-testid={`badge-summary-dept-${record.employeeId}`}>{record.department || '-'}</Badge> },
    { key: 'presentDays', header: 'Present', render: (record) => (
      <span className="font-mono text-sm font-medium" data-testid={`text-summary-present-${record.employeeId}`}>{record.presentDays}</span>
    )},
    { key: 'absentDays', header: 'Absent', render: (record) => (
      <span className={`font-mono text-sm ${record.absentDays > 3 ? 'text-destructive font-medium' : ''}`} data-testid={`text-summary-absent-${record.employeeId}`}>{record.absentDays}</span>
    )},
    { key: 'leaveDays', header: 'Leave', render: (record) => (
      <span className="font-mono text-sm" data-testid={`text-summary-leave-${record.employeeId}`}>{record.leaveDays}</span>
    )},
    { key: 'lateDays', header: 'Late', render: (record) => (
      <span className={`font-mono text-sm ${record.lateDays >= 3 ? 'text-destructive font-medium' : ''}`} data-testid={`text-summary-late-${record.employeeId}`}>
        {record.lateDays}
      </span>
    )},
    { key: 'earlyDays', header: 'Early Out', render: (record) => (
      <span className="font-mono text-sm" data-testid={`text-summary-early-${record.employeeId}`}>{record.earlyDays}</span>
    )},
    { key: 'avgHoursPerDay', header: 'Avg Hours', render: (record) => (
      <span className={`font-mono text-sm ${record.avgHoursPerDay < 7 ? 'text-destructive' : ''}`} data-testid={`text-summary-avghrs-${record.employeeId}`}>
        {record.avgHoursPerDay}h
      </span>
    )},
    { key: 'totalBreakMinutes', header: 'Breaks', render: (record) => (
      <span className="text-sm" data-testid={`text-summary-breaks-${record.employeeId}`}>
        {record.totalBreakMinutes > 0 ? `${Math.round(record.totalBreakMinutes / 60)}h ${record.totalBreakMinutes % 60}m` : '-'}
      </span>
    )},
    { key: 'gpsVerifiedPercentage', header: 'GPS %', render: (record) => (
      <div className="flex items-center gap-1" data-testid={`text-summary-gps-${record.employeeId}`}>
        <div className="w-12 bg-muted rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${record.gpsVerifiedPercentage >= 80 ? 'bg-primary' : record.gpsVerifiedPercentage >= 50 ? 'bg-yellow-500' : 'bg-destructive'}`}
            style={{ width: `${record.gpsVerifiedPercentage}%` }}
          />
        </div>
        <span className="text-xs font-mono">{record.gpsVerifiedPercentage}%</span>
      </div>
    )},
  ];

  const isLoading = (activeView === 'daily' && dailyLoading) || (activeView === 'weekly' && weeklyLoading) || (activeView === 'monthly' && monthlyLoading);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const dateLabel = activeView === 'daily'
    ? selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : activeView === 'weekly'
      ? weekRange.label
      : monthRange.label;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Track employee attendance with GPS verification, breaks, and pattern analysis"
        actions={<Button variant="outline" onClick={handleExport} data-testid="button-export"><Download className="h-4 w-4 mr-2" />Export</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-present">{stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="stat-absent">{stats.absent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-leave">{stats.leave}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <Timer className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-late">{stats.late}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">GPS Verified</CardTitle>
            <Navigation className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-gps">
              {stats.gpsIsPercentage ? stats.gpsVerified : (stats.total > 0 ? Math.round((stats.gpsVerified / stats.total) * 100) : 0)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-hours">{stats.avgHours}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Avg Break</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-break">{stats.avgBreak}m</div>
          </CardContent>
        </Card>
      </div>

      {alerts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Irregular Pattern Alerts ({alerts.length})
            </CardTitle>
            <Badge variant="destructive">{alerts.filter(a => a.severity === 'high').length} High</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto" data-testid="alerts-container">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between gap-4 p-2 rounded-md border ${
                    alert.severity === 'high' ? 'border-destructive/30 bg-destructive/5' :
                    alert.severity === 'medium' ? 'border-yellow-500/30 bg-yellow-500/5' :
                    'border-border'
                  }`}
                  data-testid={`alert-item-${idx}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Shield className={`h-4 w-4 shrink-0 ${
                      alert.severity === 'high' ? 'text-destructive' :
                      alert.severity === 'medium' ? 'text-yellow-500' :
                      'text-muted-foreground'
                    }`} />
                    <div className="min-w-0">
                      <span className="font-medium text-sm">{alert.employeeName}</span>
                      <span className="text-muted-foreground text-sm"> - {alert.message}</span>
                      {alert.details && <p className="text-xs text-muted-foreground">{alert.details}</p>}
                    </div>
                  </div>
                  <Badge variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'secondary' : 'outline'} className="shrink-0">
                    {alert.type.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList data-testid="view-tabs">
            <TabsTrigger value="daily" data-testid="tab-daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly" data-testid="tab-weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate(-1)} data-testid="button-prev">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[200px] text-center" data-testid="text-date-label">{dateLabel}</span>
            <Button variant="outline" size="icon" onClick={() => navigateDate(1)} data-testid="button-next">
              <ChevronRight className="h-4 w-4" />
            </Button>
            {activeView === 'daily' && (
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
                className="w-auto"
                data-testid="input-date-picker"
              />
            )}
            <FilterDrawer
              filters={filterOptions}
              activeFilters={activeFilters}
              onApply={(f) => { setActiveFilters(f); toast({ title: 'Filters applied' }); }}
              onReset={() => setActiveFilters({})}
            />
          </div>
        </div>

        <TabsContent value="daily" className="mt-4">
          <DataTable
            data={filteredDaily}
            columns={dailyColumns}
            emptyMessage="No attendance records found for this date. Records will appear as employees check in."
          />
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <DataTable
            data={filteredWeekly}
            columns={weeklyColumns}
            emptyMessage="No attendance records found for this week."
          />
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <DataTable
            data={monthlySummaries.map((s, i) => ({ ...s, id: s.employeeId || i }))}
            columns={monthlyColumns}
            emptyMessage="No attendance summary available for this month."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}