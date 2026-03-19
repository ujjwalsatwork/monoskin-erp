import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Target, TrendingUp, Users,
  Plus, Edit, Download, Loader2, Package, Clock, Navigation, Eye, EyeOff,
  Award, Activity, UserCheck, AlertTriangle, Wifi, WifiOff, Brain,
  Zap, CheckCircle2, XCircle, AlertCircle, ThumbsDown, MapPinOff,
  ChevronDown, ChevronRight, Star, Briefcase, Coffee, Building2,
  MessageSquare, BarChart3, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/shared/StatusPill';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { MR, MRVisit, MRAttendance, MRTarget, Lead } from '@shared/schema';

function getPerformanceBucket(mr: MR): string {
  const conversionRate = mr.leadsAssigned > 0 ? (mr.conversions / mr.leadsAssigned) * 100 : 0;
  if (conversionRate >= 20) return 'Top Performer';
  if (conversionRate >= 10) return 'On Track';
  if (conversionRate >= 5) return 'At Risk';
  return 'Under Performing';
}

const visitTypeColors: Record<string, string> = {
  'Doctor Visit': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'Lead Visit': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  'Pharmacy Visit': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  'Conference': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'Training': 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
};

const outcomeConfig: Record<string, { color: string; icon: typeof CheckCircle2; dot: string }> = {
  'Positive': { color: 'text-green-600 dark:text-green-400', icon: CheckCircle2, dot: 'bg-green-500' },
  'Neutral': { color: 'text-amber-600 dark:text-amber-400', icon: AlertCircle, dot: 'bg-amber-500' },
  'Negative': { color: 'text-red-600 dark:text-red-400', icon: XCircle, dot: 'bg-red-500' },
  'Follow-up Required': { color: 'text-blue-600 dark:text-blue-400', icon: Clock, dot: 'bg-blue-500' },
};

function groupByDate(visits: MRVisit[]) {
  const groups: Record<string, MRVisit[]> = {};
  visits.forEach(v => {
    const key = new Date(v.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  });
  return groups;
}

export default function MRProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [addVisitDialog, setAddVisitDialog] = useState(false);
  const [addAttendanceDialog, setAddAttendanceDialog] = useState(false);
  const [showDoctorDetails, setShowDoctorDetails] = useState(false);
  const [expandedTimelineGroups, setExpandedTimelineGroups] = useState<Set<string>>(new Set());

  const [visitForm, setVisitForm] = useState({ visitType: '', outcome: '', location: '', duration: '', notes: '' });
  const [attendanceForm, setAttendanceForm] = useState({ date: '', status: '', checkIn: '', checkOut: '', notes: '' });

  const mrId = parseInt(id || '0');

  const { data: mr, isLoading: mrLoading } = useQuery<MR>({
    queryKey: ['/api/mrs', mrId],
    queryFn: async () => {
      const res = await fetch(`/api/mrs/${mrId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch MR');
      return res.json();
    },
    enabled: mrId > 0,
  });

  const { data: visits = [] } = useQuery<MRVisit[]>({
    queryKey: ['/api/mrs', mrId, 'visits'],
    queryFn: async () => {
      const res = await fetch(`/api/mrs/${mrId}/visits`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch visits');
      return res.json();
    },
    enabled: mrId > 0,
  });

  const { data: attendance = [] } = useQuery<MRAttendance[]>({
    queryKey: ['/api/mrs', mrId, 'attendance'],
    queryFn: async () => {
      const res = await fetch(`/api/mrs/${mrId}/attendance`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch attendance');
      return res.json();
    },
    enabled: mrId > 0,
  });

  const { data: targets = [] } = useQuery<MRTarget[]>({
    queryKey: ['/api/mrs', mrId, 'targets'],
    queryFn: async () => {
      const res = await fetch(`/api/mrs/${mrId}/targets`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch targets');
      return res.json();
    },
    enabled: mrId > 0,
  });

  const { data: allLeads = [] } = useQuery<Lead[]>({ queryKey: ['/api/leads'] });
  const { data: allMRs = [] } = useQuery<MR[]>({ queryKey: ['/api/mrs'] });
  const { data: doctors = [] } = useQuery<any[]>({ queryKey: ['/api/doctors'] });

  const visitMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest('POST', '/api/mr-visits', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mrs', mrId, 'visits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mrs', mrId] });
      toast({ title: 'Visit Logged', description: 'New visit has been added to the activity log.' });
      setAddVisitDialog(false);
      setVisitForm({ visitType: '', outcome: '', location: '', duration: '', notes: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to log visit.', variant: 'destructive' });
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest('POST', '/api/mr-attendance', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mrs', mrId, 'attendance'] });
      toast({ title: 'Attendance Updated', description: 'Attendance record has been added.' });
      setAddAttendanceDialog(false);
      setAttendanceForm({ date: '', status: '', checkIn: '', checkOut: '', notes: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to add attendance.', variant: 'destructive' });
    },
  });

  const assignedLeads = allLeads.filter(l => l.assignedMRId === mrId);
  const assignedDoctors = doctors.filter(d =>
    d.assignedMRId === mrId ||
    (d.city && mr?.territory && d.city.toLowerCase().includes(mr.territory.toLowerCase()))
  ).slice(0, 10);

  const reportingManagerMR = allMRs.find(m => mr?.reportingManager && m.name === mr.reportingManager);

  const calculateEngagementScore = () => {
    if (!mr) return 0;
    const visitScore = Math.min(mr.visitsLogged * 2, 30);
    const conversionScore = Math.min(mr.conversions * 5, 30);
    const leadUpdateScore = Math.min(mr.leadsUpdatedToday * 10, 20);
    const revenueScore = Math.min(Number(mr.revenueAttributed) / 10000, 20);
    return Math.round(visitScore + conversionScore + leadUpdateScore + revenueScore);
  };

  if (mrLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!mr) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h3 className="text-lg font-medium">MR Not Found</h3>
        <Button variant="link" onClick={() => navigate('/mr')}>Back to MR Directory</Button>
      </div>
    );
  }

  const performanceBucket = getPerformanceBucket(mr);
  const conversionRate = mr.leadsAssigned > 0 ? (mr.conversions / mr.leadsAssigned) * 100 : 0;

  // ─── Intelligence Signals (auto-computed) ───
  const daysSinceActivity = Math.floor((Date.now() - new Date(mr.lastActivity).getTime()) / (1000 * 60 * 60 * 24));
  const internetScore = Math.max(0, Math.min(100, 100 - daysSinceActivity * 8));

  const nonProductiveVisits = visits.filter(v => v.outcome === 'Negative' || v.outcome === 'Neutral').length;
  const nonProductiveRatio = visits.length > 0 ? (nonProductiveVisits / visits.length) * 100 : 0;

  const recentVisits = visits.filter(v => {
    const daysAgo = (Date.now() - new Date(v.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });
  const visitedLocations = new Set(recentVisits.map(v => v.location?.toLowerCase()).filter(Boolean));
  const avgVisitsPerDay = recentVisits.length / 7;
  const idleAlert = daysSinceActivity >= 2 && mr.visitsLogged < 5;

  const nearbyDoctorsNotVisited = assignedDoctors.filter(d => {
    const docCity = d.city?.toLowerCase();
    return docCity && !visitedLocations.has(docCity);
  }).slice(0, 3);

  const needsTraining = conversionRate < 5 && mr.leadsAssigned > 3;
  const tooManyNonProductiveVisits = nonProductiveRatio > 60 && visits.length >= 5;

  const signals = [
    ...(needsTraining ? [{
      id: 'needs-training',
      level: 'warning' as const,
      icon: Brain,
      title: 'Needs Training',
      description: `Conversion rate is ${conversionRate.toFixed(1)}% — below the 5% threshold. Schedule product training or coaching session.`,
      badge: 'Auto-tagged',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    }] : []),
    {
      id: 'internet-score',
      level: internetScore >= 70 ? 'success' as const : internetScore >= 40 ? 'warning' as const : 'danger' as const,
      icon: internetScore >= 60 ? Wifi : WifiOff,
      title: `Internet Reliability Score: ${internetScore}/100`,
      description: internetScore >= 70
        ? 'MR is consistently active — app usage and sync appear reliable.'
        : `Last activity was ${daysSinceActivity} day(s) ago. Possible connectivity issues or low engagement.`,
      badge: internetScore >= 70 ? 'Good' : internetScore >= 40 ? 'Moderate' : 'Low',
      badgeColor: internetScore >= 70
        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
        : internetScore >= 40
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
        : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    },
    ...(tooManyNonProductiveVisits ? [{
      id: 'non-productive',
      level: 'danger' as const,
      icon: ThumbsDown,
      title: 'Too Many Non-Productive Visits',
      description: `${nonProductiveRatio.toFixed(0)}% of visits resulted in Negative or Neutral outcomes (${nonProductiveVisits}/${visits.length}). Review doctor targeting and visit strategy.`,
      badge: 'Action Required',
      badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    }] : []),
    ...(idleAlert ? [{
      id: 'idle-time',
      level: 'warning' as const,
      icon: Coffee,
      title: 'Excessive Idle Time Detected',
      description: `No meaningful activity logged for ${daysSinceActivity} days. Average visits/day is ${avgVisitsPerDay.toFixed(1)} — significantly below expected field activity. Check geo-location patterns.`,
      badge: 'Idle Alert',
      badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    }] : []),
    ...(nearbyDoctorsNotVisited.length > 0 ? [{
      id: 'nearby-unvisited',
      level: 'info' as const,
      icon: MapPinOff,
      title: 'Nearby Doctors Not Yet Visited',
      description: `${nearbyDoctorsNotVisited.length} doctor(s) in ${mr.territory} territory have not been visited recently: ${nearbyDoctorsNotVisited.map(d => d.name).join(', ')}.`,
      badge: 'Recommendation',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    }] : []),
  ];

  const signalBorderColor: Record<string, string> = {
    warning: 'border-l-amber-500',
    danger: 'border-l-red-500',
    success: 'border-l-green-500',
    info: 'border-l-blue-500',
  };

  const signalBg: Record<string, string> = {
    warning: 'bg-amber-50 dark:bg-amber-950/20',
    danger: 'bg-red-50 dark:bg-red-950/20',
    success: 'bg-green-50 dark:bg-green-950/20',
    info: 'bg-blue-50 dark:bg-blue-950/20',
  };

  // Lead columns
  const leadColumns = [
    { key: 'id', header: 'ID', render: (item: Lead) => <span className="font-mono text-xs">{item.id}</span> },
    {
      key: 'name', header: 'Name',
      render: (item: Lead) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.clinic}</p>
        </div>
      ),
    },
    { key: 'city', header: 'City' },
    { key: 'stage', header: 'Stage', render: (item: Lead) => <StatusPill status={item.stage} /> },
    { key: 'priority', header: 'Priority', render: (item: Lead) => <StatusPill status={item.priority} /> },
    { key: 'nextFollowUp', header: 'Next Follow-up', render: (item: Lead) => <span className="text-sm">{item.nextFollowUp || '—'}</span> },
  ];

  // Visit columns
  const visitColumns = [
    { key: 'createdAt', header: 'Date', render: (item: MRVisit) => <span className="text-sm">{new Date(item.createdAt).toLocaleDateString()}</span> },
    { key: 'visitType', header: 'Type', render: (item: MRVisit) => <StatusPill status={item.visitType} /> },
    { key: 'outcome', header: 'Outcome', render: (item: MRVisit) => <StatusPill status={item.outcome} /> },
    { key: 'notes', header: 'Notes', render: (item: MRVisit) => <span className="text-sm truncate max-w-[200px] block">{item.notes}</span> },
    { key: 'duration', header: 'Duration', render: (item: MRVisit) => <span className="text-sm">{item.duration} mins</span> },
    {
      key: 'location', header: 'Location',
      render: (item: MRVisit) => (
        <div className="flex items-center gap-1">
          <Navigation className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{item.location}</span>
          {item.latitude && item.longitude && (
            <a href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline ml-1" onClick={e => e.stopPropagation()}>GPS</a>
          )}
        </div>
      )
    },
  ];

  // Attendance columns
  const attendanceColumns = [
    { key: 'date', header: 'Date', render: (item: MRAttendance) => <span className="text-sm">{item.date}</span> },
    { key: 'status', header: 'Status', render: (item: MRAttendance) => <StatusPill status={item.status} /> },
    { key: 'checkIn', header: 'Check In', render: (item: MRAttendance) => <span className="text-sm font-mono">{item.checkIn || '—'}</span> },
    { key: 'checkOut', header: 'Check Out', render: (item: MRAttendance) => <span className="text-sm font-mono">{item.checkOut || '—'}</span> },
    { key: 'location', header: 'Location', render: (item: MRAttendance) => <span className="text-sm text-muted-foreground">{item.location || '—'}</span> },
    { key: 'notes', header: 'Notes', render: (item: MRAttendance) => <span className="text-sm text-muted-foreground">{item.notes || '—'}</span> },
  ];

  const handleAddVisit = () => {
    if (!visitForm.visitType || !visitForm.outcome) {
      toast({ title: 'Validation Error', description: 'Visit type and outcome are required.', variant: 'destructive' });
      return;
    }
    visitMutation.mutate({
      mrId, visitType: visitForm.visitType, outcome: visitForm.outcome,
      location: visitForm.location || null,
      duration: visitForm.duration ? parseInt(visitForm.duration) : null,
      notes: visitForm.notes || null,
    });
  };

  const handleAddAttendance = () => {
    if (!attendanceForm.date || !attendanceForm.status) {
      toast({ title: 'Validation Error', description: 'Date and status are required.', variant: 'destructive' });
      return;
    }
    attendanceMutation.mutate({
      mrId, date: attendanceForm.date, status: attendanceForm.status,
      checkIn: attendanceForm.checkIn || null, checkOut: attendanceForm.checkOut || null,
      notes: attendanceForm.notes || null,
    });
  };

  const toggleTimelineGroup = (key: string) => {
    setExpandedTimelineGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const visitGroups = groupByDate(visits);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/mr')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-semibold">{mr.name}</h1>
              <StatusPill status={mr.status} />
              <StatusPill status={performanceBucket} />
              {needsTraining && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 text-xs flex items-center gap-1" data-testid="badge-needs-training">
                  <Brain className="h-3 w-3" /> Needs Training
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="font-mono">{mr.employeeId}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{mr.territory}</span>
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{mr.phone}</span>
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{mr.email}</span>
              <span className="flex items-center gap-1" data-testid="text-last-activity">
                <Clock className="h-3 w-3" />
                Last active: {new Date(mr.lastActivity).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export-mr"><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button variant="outline" data-testid="button-edit-mr"><Edit className="h-4 w-4 mr-2" />Edit</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Leads ({assignedLeads.length})</TabsTrigger>
          <TabsTrigger value="visits">Visits/Activity</TabsTrigger>
          <TabsTrigger value="orders">Orders Impact</TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-attendance">Attendance</TabsTrigger>
          <TabsTrigger value="samples" data-testid="tab-samples">Samples</TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline">
            Timeline
            {signals.some(s => s.level === 'danger') && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-red-500 inline-block" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Leads Assigned" value={mr.leadsAssigned} icon={<Users className="h-5 w-5" />} trend={{ value: mr.leadsUpdatedToday, label: 'updated today' }} />
            <StatCard title="Conversions" value={mr.conversions} icon={<Target className="h-5 w-5" />} trend={{ value: mr.leadsAssigned > 0 ? Math.round((mr.conversions / mr.leadsAssigned) * 100) : 0, label: '% rate' }} />
            <StatCard title="Visits Logged" value={mr.visitsLogged} icon={<Calendar className="h-5 w-5" />} />
            <StatCard title="Revenue Attributed" value={`₹${(Number(mr.revenueAttributed) / 1000).toFixed(0)}K`} icon={<TrendingUp className="h-5 w-5" />} />
          </div>

          {/* ─── Intelligence Signals & Alerts ─── */}
          {signals.length > 0 && (
            <Card className="border-primary/10" data-testid="card-intelligence-signals">
              <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-900/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Intelligence Signals & Alerts
                  <Badge variant="secondary" className="ml-auto text-xs">{signals.length} signal{signals.length !== 1 ? 's' : ''}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {signals.map(signal => {
                  const Icon = signal.icon;
                  return (
                    <div
                      key={signal.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${signalBorderColor[signal.level]} ${signalBg[signal.level]}`}
                      data-testid={`signal-${signal.id}`}
                    >
                      <div className="p-1.5 rounded-md bg-background/80 flex-shrink-0 mt-0.5">
                        <Icon className={`h-4 w-4 ${
                          signal.level === 'danger' ? 'text-red-600' :
                          signal.level === 'warning' ? 'text-amber-600' :
                          signal.level === 'success' ? 'text-green-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-semibold">{signal.title}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${signal.badgeColor}`}>{signal.badge}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{signal.description}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Info Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>MR Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-muted-foreground">Territory</p><p className="font-medium">{mr.territory}</p></div>
                  <div><p className="text-sm text-muted-foreground">Region</p><p className="font-medium">{mr.region}</p></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reporting Manager</p>
                    {reportingManagerMR ? (
                      <button onClick={() => navigate(`/mr/${reportingManagerMR.id}`)} className="font-medium hover:underline flex items-center gap-1" data-testid="link-reporting-manager">
                        <UserCheck className="h-3 w-3" />{mr.reportingManager}
                      </button>
                    ) : (
                      <p className="font-medium">{mr.reportingManager || '—'}</p>
                    )}
                  </div>
                  <div><p className="text-sm text-muted-foreground">Manager Role</p><p className="font-medium">{mr.managerRole || '—'}</p></div>
                  <div><p className="text-sm text-muted-foreground">Joining Date</p><p className="font-medium">{new Date(mr.joiningDate).toLocaleDateString()}</p></div>
                  <div><p className="text-sm text-muted-foreground">Last Activity</p><p className="font-medium">{new Date(mr.lastActivity).toLocaleString()}</p></div>
                </div>
              </CardContent>
            </Card>

            {/* ── TARGETS CARD ── */}
            <Card data-testid="card-mr-targets">
              <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> Targets
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {targets.length > 0 ? targets[0]?.period || 'Current Period' : 'Current Period'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const targetDefs = [
                    {
                      key: 'Conversions',
                      aliases: ['Conversions', 'Conversion'],
                      label: 'Conversion Target',
                      icon: TrendingUp,
                      color: 'text-primary',
                      ring: 'stroke-primary',
                      bg: 'bg-primary/10',
                      fallbackTarget: 30,
                      fallbackAchieved: mr.conversions,
                    },
                    {
                      key: 'Doctor Onboarding',
                      aliases: ['Doctor Onboarding', 'New Leads', 'New Doctors'],
                      label: 'Doctor Onboarding',
                      icon: UserCheck,
                      color: 'text-blue-600 dark:text-blue-400',
                      ring: 'stroke-blue-500',
                      bg: 'bg-blue-50 dark:bg-blue-950/40',
                      fallbackTarget: 20,
                      fallbackAchieved: assignedDoctors.length,
                    },
                    {
                      key: 'Sample Distribution',
                      aliases: ['Sample Distribution', 'Samples', 'Visits'],
                      label: 'Sample Distribution',
                      icon: Package,
                      color: 'text-amber-600 dark:text-amber-400',
                      ring: 'stroke-amber-500',
                      bg: 'bg-amber-50 dark:bg-amber-950/40',
                      fallbackTarget: 50,
                      fallbackAchieved: mr.visitsLogged,
                    },
                  ];

                  return targetDefs.map(({ key, aliases, label, icon: Icon, color, ring, bg, fallbackTarget, fallbackAchieved }) => {
                    const matched = targets.find(t => aliases.some(a => t.targetType?.toLowerCase() === a.toLowerCase()));
                    const achieved = matched ? Number(matched.achievedValue) : fallbackAchieved;
                    const total = matched ? Number(matched.targetValue) : fallbackTarget;
                    const pct = total > 0 ? Math.min(Math.round((achieved / total) * 100), 100) : 0;
                    const circumference = 2 * Math.PI * 22;
                    const strokeDash = (pct / 100) * circumference;
                    const statusColor = pct >= 100 ? 'text-green-600' : pct >= 70 ? 'text-amber-600' : 'text-red-500';

                    return (
                      <div key={key} className={`flex items-center gap-4 p-3 rounded-xl border ${bg}`} data-testid={`target-row-${key.toLowerCase().replace(/\s+/g, '-')}`}>
                        {/* Ring chart */}
                        <div className="relative flex-shrink-0 w-14 h-14">
                          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 52 52">
                            <circle cx="26" cy="26" r="22" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
                            <circle cx="26" cy="26" r="22" fill="none" strokeWidth="5"
                              className={ring}
                              strokeDasharray={`${strokeDash} ${circumference}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-xs font-bold ${statusColor}`}>{pct}%</span>
                          </div>
                        </div>
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={`h-3.5 w-3.5 ${color}`} />
                            <span className="text-xs font-semibold text-foreground">{label}</span>
                            {!matched && <span className="text-[9px] text-muted-foreground/60 italic">estimated</span>}
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-bold font-mono ${color}`}>{achieved}</span>
                            <span className="text-sm text-muted-foreground">/ {total}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-400'}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                {targets.length === 0 && (
                  <p className="text-xs text-muted-foreground/70 text-center pt-1">
                    Showing estimated targets. <button className="text-primary hover:underline" onClick={() => navigate('/mr/targets')}>Set real targets →</button>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── NEARBY DOCTORS NOT VISITED ── */}
          {nearbyDoctorsNotVisited.length > 0 && (
            <Card className="border-blue-200 dark:border-blue-800/50" data-testid="card-nearby-unvisited">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/30">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPinOff className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Nearby Doctors Not Visited Yet
                  <Badge className="ml-auto text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-0">
                    {nearbyDoctorsNotVisited.length} recommendation{nearbyDoctorsNotVisited.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground mb-3">
                  These doctors are in <span className="font-medium text-foreground">{mr.territory}</span> territory but haven't had a visit logged in the last 7 days.
                </p>
                {nearbyDoctorsNotVisited.map((doc, idx) => (
                  <div key={doc.id || idx}
                    className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                    data-testid={`nearby-doctor-${doc.id || idx}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {doc.specialization && <span>{doc.specialization}</span>}
                          {doc.city && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />{doc.city}
                            </span>
                          )}
                          {doc.clinic && <span className="truncate">{doc.clinic}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {doc.phone && (
                        <a href={`tel:${doc.phone}`}
                          className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                          title="Call" data-testid={`button-call-nearby-${doc.id || idx}`}>
                          <Phone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </a>
                      )}
                      {(doc.whatsappNumber || doc.phone) && (
                        <a href={`https://wa.me/${(doc.whatsappNumber || doc.phone).replace(/\D/g, '')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/40 hover:bg-green-100 dark:hover:bg-green-900/60 transition-colors"
                          title="WhatsApp" data-testid={`button-wa-nearby-${doc.id || idx}`}>
                          <MessageSquare className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        </a>
                      )}
                      <Button size="sm" variant="outline"
                        className="h-7 text-xs border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        onClick={() => setAddVisitDialog(true)}
                        data-testid={`button-log-visit-nearby-${doc.id || idx}`}>
                        Log Visit
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Performance + Doctors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Performance Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-total-conversions">{mr.conversions}</p>
                    <p className="text-sm text-muted-foreground">Conversions</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-conversion-rate">{conversionRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Conv. Rate</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-engagement-score">{calculateEngagementScore()}</p>
                    <p className="text-sm text-muted-foreground">CRM Score</p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">CRM Engagement Score</span>
                    <span className="text-sm font-medium">{calculateEngagementScore()}/100</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${calculateEngagementScore()}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Assigned Doctors ({assignedDoctors.length})</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowDoctorDetails(!showDoctorDetails)} data-testid="button-toggle-doctor-details">
                    {showDoctorDetails ? <><EyeOff className="h-4 w-4 mr-1" />Hide</> : <><Eye className="h-4 w-4 mr-1" />Show</>}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {assignedDoctors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No doctors assigned in this territory</p>
                ) : (
                  <div className="space-y-3">
                    {assignedDoctors.map((doc, idx) => (
                      <div key={doc.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50" data-testid={`doctor-row-${doc.id || idx}`}>
                        <div>
                          <p className="font-medium">{showDoctorDetails ? doc.name : `Dr. ${doc.name?.split(' ')[1]?.charAt(0) || 'X'}***`}</p>
                          <p className="text-xs text-muted-foreground">{showDoctorDetails ? doc.clinic : '******* Clinic'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{showDoctorDetails ? doc.phone : '***-***-' + (doc.phone?.slice(-4) || '****')}</p>
                          <p className="text-xs text-muted-foreground">{doc.city}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Assigned Leads</h3>
            <Button onClick={() => navigate('/leads')}><Plus className="h-4 w-4 mr-2" />Assign More Leads</Button>
          </div>
          <DataTable data={assignedLeads} columns={leadColumns} onRowClick={(item) => navigate(`/leads/${item.id}`)} emptyMessage="No leads assigned" />
        </TabsContent>

        {/* Visits Tab */}
        <TabsContent value="visits" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Activity Logs</h3>
            <Button onClick={() => setAddVisitDialog(true)} data-testid="button-add-visit"><Plus className="h-4 w-4 mr-2" />Add Visit</Button>
          </div>
          <DataTable data={visits} columns={visitColumns} emptyMessage="No visits logged" />
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-between items-center"><h3 className="text-lg font-medium">Orders Attributed to MR</h3></div>
          <Card>
            <CardContent className="py-6">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-3xl font-mono font-semibold">{mr.ordersAttributed}</p>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                </div>
                <div>
                  <p className="text-3xl font-mono font-semibold">₹{(Number(mr.revenueAttributed) / 1000).toFixed(0)}K</p>
                  <p className="text-sm text-muted-foreground">Revenue Generated</p>
                </div>
                <div>
                  <p className="text-3xl font-mono font-semibold">₹{mr.ordersAttributed > 0 ? Math.round(Number(mr.revenueAttributed) / mr.ordersAttributed / 1000) : 0}K</p>
                  <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Attendance Records</h3>
            <Button onClick={() => setAddAttendanceDialog(true)} data-testid="button-add-attendance"><Plus className="h-4 w-4 mr-2" />Add Entry</Button>
          </div>
          <DataTable data={attendance} columns={attendanceColumns} emptyMessage="No attendance records" />
        </TabsContent>

        {/* Samples Tab */}
        <TabsContent value="samples" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium" data-testid="text-samples-title">Samples Dispensed</h3>
            <Button data-testid="button-add-sample"><Plus className="h-4 w-4 mr-2" />Record Sample</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Samples This Month', value: '32', icon: Package, color: 'bg-primary/10' },
              { label: 'Total Samples (YTD)', value: '184', icon: Package, color: 'bg-accent/10' },
              { label: 'Sample Value', value: '₹28K', icon: TrendingUp, color: 'bg-muted' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${color}`}><Icon className="h-6 w-6 text-muted-foreground" /></div>
                    <div><p className="text-2xl font-mono font-semibold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── ENHANCED TIMELINE TAB ─── */}
        <TabsContent value="timeline" className="space-y-4">

          {/* Signals Summary at top of timeline */}
          {signals.filter(s => s.level === 'danger' || s.level === 'warning').length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20" data-testid="card-timeline-alerts">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Active Alerts:</span>
                  {signals.filter(s => s.level === 'danger' || s.level === 'warning').map(s => (
                    <span key={s.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badgeColor}`}>{s.title}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="timeline-stats">
            {[
              { label: 'Total Visits', value: visits.length, icon: Calendar, color: 'text-primary' },
              { label: 'Positive Outcomes', value: visits.filter(v => v.outcome === 'Positive').length, icon: CheckCircle2, color: 'text-green-600' },
              { label: 'Avg Duration', value: visits.length > 0 ? `${Math.round(visits.reduce((s, v) => s + (v.duration || 0), 0) / visits.length)}m` : '—', icon: Clock, color: 'text-amber-600' },
              { label: 'Unique Locations', value: new Set(visits.map(v => v.location)).size, icon: MapPin, color: 'text-blue-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                <div className={`p-2 rounded-lg bg-muted ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Grouped Timeline Feed */}
          {visits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No activity logged yet.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setAddVisitDialog(true)}>Log First Visit</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2" data-testid="timeline-feed">
              {Object.entries(visitGroups).map(([dateKey, dayVisits]) => {
                const isExpanded = expandedTimelineGroups.has(dateKey) || Object.keys(visitGroups).indexOf(dateKey) < 2;
                return (
                  <Card key={dateKey} className="overflow-hidden" data-testid={`timeline-group-${dateKey}`}>
                    {/* Date header */}
                    <button
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors border-b"
                      onClick={() => toggleTimelineGroup(dateKey)}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-semibold">{dateKey}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5">{dayVisits.length} visit{dayVisits.length !== 1 ? 's' : ''}</Badge>
                      </div>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>

                    {isExpanded && (
                      <div className="divide-y">
                        {dayVisits.map((visit, visitIdx) => {
                          const outcome = outcomeConfig[visit.outcome] || outcomeConfig['Neutral'];
                          const OutcomeIcon = outcome.icon;
                          const typeColor = visitTypeColors[visit.visitType] || 'bg-muted text-muted-foreground';
                          const isLast = visitIdx === dayVisits.length - 1;

                          return (
                            <div key={visit.id} className="flex gap-4 px-4 py-4 hover:bg-muted/20 transition-colors" data-testid={`timeline-visit-${visit.id}`}>
                              {/* Timeline spine */}
                              <div className="flex flex-col items-center flex-shrink-0 w-8">
                                <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${outcome.dot} ring-2 ring-background`} />
                                {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0 pb-1">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeColor}`}>{visit.visitType}</span>
                                    <span className={`flex items-center gap-1 text-xs font-medium ${outcome.color}`}>
                                      <OutcomeIcon className="h-3.5 w-3.5" />
                                      {visit.outcome}
                                    </span>
                                  </div>
                                  <time className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(visit.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </time>
                                </div>

                                {/* Pills row */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {visit.location && (
                                    <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                                      <Navigation className="h-3 w-3" />{visit.location}
                                      {visit.latitude && visit.longitude && (
                                        <a href={`https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-0.5" onClick={e => e.stopPropagation()}>↗</a>
                                      )}
                                    </span>
                                  )}
                                  {visit.duration && (
                                    <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                                      <Clock className="h-3 w-3" />{visit.duration} min
                                    </span>
                                  )}
                                </div>

                                {/* Notes */}
                                {visit.notes && (
                                  <div className="flex items-start gap-1.5 mt-1">
                                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-muted-foreground leading-relaxed">{visit.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}

              {/* Add Visit CTA */}
              <button
                onClick={() => setAddVisitDialog(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/3 transition-all text-sm text-muted-foreground hover:text-primary"
                data-testid="button-add-visit-timeline"
              >
                <Plus className="h-4 w-4" />
                Log new visit
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Visit Dialog */}
      <Dialog open={addVisitDialog} onOpenChange={(open) => { setAddVisitDialog(open); if (!open) setVisitForm({ visitType: '', outcome: '', location: '', duration: '', notes: '' }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Visit</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Visit Type</Label>
              <Select value={visitForm.visitType} onValueChange={(v) => setVisitForm(p => ({ ...p, visitType: v }))}>
                <SelectTrigger data-testid="select-visit-type"><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {['Lead Visit', 'Doctor Visit', 'Pharmacy Visit', 'Conference', 'Training'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={visitForm.outcome} onValueChange={(v) => setVisitForm(p => ({ ...p, outcome: v }))}>
                <SelectTrigger data-testid="select-visit-outcome"><SelectValue placeholder="Select outcome..." /></SelectTrigger>
                <SelectContent>
                  {['Positive', 'Neutral', 'Negative', 'Follow-up Required'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="City/Location" value={visitForm.location} onChange={(e) => setVisitForm(p => ({ ...p, location: e.target.value }))} data-testid="input-visit-location" />
              </div>
              <div className="space-y-2">
                <Label>Duration (mins)</Label>
                <Input type="number" placeholder="30" value={visitForm.duration} onChange={(e) => setVisitForm(p => ({ ...p, duration: e.target.value }))} data-testid="input-visit-duration" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Visit notes and observations..." value={visitForm.notes} onChange={(e) => setVisitForm(p => ({ ...p, notes: e.target.value }))} data-testid="input-visit-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddVisitDialog(false)} data-testid="button-cancel-visit">Cancel</Button>
            <Button onClick={handleAddVisit} disabled={visitMutation.isPending} data-testid="button-submit-visit">
              {visitMutation.isPending ? 'Saving...' : 'Log Visit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Attendance Dialog */}
      <Dialog open={addAttendanceDialog} onOpenChange={(open) => { setAddAttendanceDialog(open); if (!open) setAttendanceForm({ date: '', status: '', checkIn: '', checkOut: '', notes: '' }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Attendance Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm(p => ({ ...p, date: e.target.value }))} data-testid="input-attendance-date" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={attendanceForm.status} onValueChange={(v) => setAttendanceForm(p => ({ ...p, status: v }))}>
                <SelectTrigger data-testid="select-attendance-status"><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>
                  {['Present', 'Absent', 'Half Day', 'Leave', 'Holiday'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check In</Label>
                <Input type="time" value={attendanceForm.checkIn} onChange={(e) => setAttendanceForm(p => ({ ...p, checkIn: e.target.value }))} data-testid="input-attendance-checkin" />
              </div>
              <div className="space-y-2">
                <Label>Check Out</Label>
                <Input type="time" value={attendanceForm.checkOut} onChange={(e) => setAttendanceForm(p => ({ ...p, checkOut: e.target.value }))} data-testid="input-attendance-checkout" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input placeholder="Optional notes..." value={attendanceForm.notes} onChange={(e) => setAttendanceForm(p => ({ ...p, notes: e.target.value }))} data-testid="input-attendance-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAttendanceDialog(false)} data-testid="button-cancel-attendance">Cancel</Button>
            <Button onClick={handleAddAttendance} disabled={attendanceMutation.isPending} data-testid="button-submit-attendance">
              {attendanceMutation.isPending ? 'Saving...' : 'Save Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
