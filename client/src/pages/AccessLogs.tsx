import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, Column } from '@/components/shared/DataTable';
import { ExportModal } from '@/components/shared/ExportModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Shield, Eye, Search, Filter, AlertTriangle, Loader2, Download, Settings, Lock, Globe, Bell, Users, Check, Calendar, MapPin, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { AccessLog, SuspiciousActivity, MaskedDataAccessLog } from '@shared/schema';

export default function AccessLogs() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [activeTab, setActiveTab] = useState('logs');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SuspiciousActivity | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [alertSettings, setAlertSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('monoskin_alert_settings');
      return saved ? JSON.parse(saved) : {
        failedLoginThreshold: 5,
        bulkExportAlert: true,
        geoAnomalyAlert: true,
        afterHoursAlert: true,
        emailNotifications: true,
      };
    } catch {
      return { failedLoginThreshold: 5, bulkExportAlert: true, geoAnomalyAlert: true, afterHoursAlert: true, emailNotifications: true };
    }
  });

  useEffect(() => {
    localStorage.setItem('monoskin_alert_settings', JSON.stringify(alertSettings));
  }, [alertSettings]);

  const { data: logs = [], isLoading } = useQuery<AccessLog[]>({
    queryKey: ['/api/access-logs'],
  });

  const { data: suspiciousActivities = [] } = useQuery<SuspiciousActivity[]>({
    queryKey: ['/api/suspicious-activities'],
  });

  const { data: maskedAccessLogs = [] } = useQuery<MaskedDataAccessLog[]>({
    queryKey: ['/api/masked-data-access-logs'],
  });

  const resolveActivityMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SuspiciousActivity> }) =>
      apiRequest('PATCH', `/api/suspicious-activities/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suspicious-activities'] });
      toast({ title: 'Success', description: 'Activity resolved successfully.' });
      setResolveDialogOpen(false);
      setSelectedAlert(null);
      setResolutionNotes('');
    },
  });

  const getDateRangeStart = (range: string): Date | null => {
    switch (range) {
      case 'today': return new Date(new Date().setHours(0, 0, 0, 0));
      case '7d': { const d = new Date(); d.setDate(d.getDate() - 7); return d; }
      case '30d': { const d = new Date(); d.setDate(d.getDate() - 30); return d; }
      case '90d': { const d = new Date(); d.setDate(d.getDate() - 90); return d; }
      default: return null;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery || (
      (log.entityType?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.action?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    let matchesDate = true;
    if (dateRange !== 'all') {
      const start = getDateRangeStart(dateRange);
      if (start) matchesDate = new Date(log.createdAt) >= start;
    }
    return matchesSearch && matchesAction && matchesDate;
  });

  const actions = [...new Set(logs.map(l => l.action))];

  const exportColumns = [
    { key: 'id', label: 'ID', defaultSelected: true },
    { key: 'action', label: 'Action', defaultSelected: true },
    { key: 'entityType', label: 'Entity Type', defaultSelected: true },
    { key: 'entityId', label: 'Entity ID', defaultSelected: true },
    { key: 'userEmail', label: 'User', defaultSelected: true },
    { key: 'ipAddress', label: 'IP Address', defaultSelected: true },
    { key: 'geoLocation', label: 'Location' },
    { key: 'isSuspicious', label: 'Suspicious' },
    { key: 'suspiciousReason', label: 'Reason' },
    { key: 'createdAt', label: 'Timestamp', defaultSelected: true },
  ];

  const formatDateTime = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns: Column<AccessLog>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      render: (row) => <span className="font-mono text-xs" data-testid={`text-log-time-${row.id}`}>{formatDateTime(row.createdAt)}</span>
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant={row.action === 'Create' ? 'default' : row.action === 'Delete' ? 'destructive' : 'secondary'} data-testid={`badge-action-${row.id}`}>
            {row.action}
          </Badge>
          {row.isSuspicious && (
            <Badge variant="destructive" className="text-xs" data-testid={`badge-suspicious-${row.id}`}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              Suspicious
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'entityType',
      header: 'Entity Type',
      sortable: true,
      render: (row) => <span className="capitalize">{row.entityType}</span>
    },
    {
      key: 'userEmail',
      header: 'User',
      render: (row) => <span className="text-sm" data-testid={`text-user-${row.id}`}>{row.userEmail || 'System'}</span>
    },
    {
      key: 'ipAddress',
      header: 'IP / Location',
      render: (row) => (
        <div className="text-xs" data-testid={`text-ip-${row.id}`}>
          <div className="font-mono">{row.ipAddress || '—'}</div>
          {row.geoLocation && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Globe className="h-3 w-3" />
              {row.geoLocation}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button variant="ghost" size="icon" onClick={() => { setSelectedLog(row); setDetailDialogOpen(true); }} data-testid={`button-view-log-${row.id}`}>
          <Eye className="h-4 w-4" />
        </Button>
      )
    },
  ];

  const todayLogs = logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length;
  const sensitiveActions = logs.filter(l => l.action === 'Delete' || l.action === 'Update').length;
  const unresolvedAlerts = suspiciousActivities.filter(a => a.status === 'open' || a.status === 'investigating').length;
  const uniqueIPs = [...new Set(logs.map(l => l.ipAddress).filter(Boolean))].length;
  const suspiciousLogCount = logs.filter(l => l.isSuspicious).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-500/10';
      case 'high': return 'text-destructive bg-destructive/10';
      case 'medium': return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getSeverityBadgeVariant = (severity: string): "destructive" | "default" | "secondary" | "outline" => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const handleResolveActivity = (activity: SuspiciousActivity) => {
    setSelectedAlert(activity);
    setResolutionNotes('');
    setResolveDialogOpen(true);
  };

  const submitResolve = () => {
    if (!selectedAlert) return;
    resolveActivityMutation.mutate({
      id: selectedAlert.id,
      data: {
        status: 'resolved' as const,
        resolutionNotes,
        resolvedAt: new Date(),
      },
    });
  };

  const maskedActionColumns: Column<MaskedDataAccessLog>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      render: (row) => <span className="font-mono text-xs">{formatDateTime(row.createdAt)}</span>
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <Badge variant={row.action === 'click-to-call' ? 'default' : row.action === 'whatsapp' ? 'secondary' : 'outline'}>
          {row.action}
        </Badge>
      )
    },
    {
      key: 'entityType',
      header: 'Entity',
      render: (row) => <span className="capitalize">{row.entityType} ({row.entityId})</span>
    },
    {
      key: 'fieldName',
      header: 'Field',
      render: (row) => <span className="font-mono text-sm">{row.fieldName}</span>
    },
    {
      key: 'userEmail',
      header: 'User',
      render: (row) => <span className="text-sm">{row.userEmail}</span>
    },
    {
      key: 'ipAddress',
      header: 'IP',
      render: (row) => <span className="font-mono text-xs">{row.ipAddress || '—'}</span>
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Access Control"
        description="Monitor access, manage permissions, and track security alerts"
        actions={
          <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Logs" value={logs.length} icon={<Shield className="h-5 w-5" />} />
        <StatCard title="Today's Activity" value={todayLogs} />
        <StatCard title="Suspicious" value={suspiciousLogCount} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard title="Unique IPs" value={uniqueIPs} icon={<Globe className="h-5 w-5" />} />
        <StatCard title="Open Alerts" value={unresolvedAlerts} icon={<Bell className="h-5 w-5" />} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-security">
          <TabsTrigger value="logs" data-testid="tab-logs">
            <Eye className="h-4 w-4 mr-1" />
            Access Logs
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Security Alerts
            {unresolvedAlerts > 0 && <Badge variant="destructive" className="ml-2">{unresolvedAlerts}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="masked" data-testid="tab-masked">
            <Lock className="h-4 w-4 mr-1" />
            Masked Data Actions
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="h-4 w-4 mr-1" />
            Alert Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-action">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px]" data-testid="select-date-range">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable columns={columns} data={filteredLogs} onRowClick={(row) => { setSelectedLog(row); setDetailDialogOpen(true); }} emptyMessage="No access logs found" />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Suspicious Activity Alerts</CardTitle>
              <CardDescription>Review and resolve security incidents detected by the system</CardDescription>
            </CardHeader>
            <CardContent>
              {suspiciousActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4" />
                  <p>No suspicious activities detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suspiciousActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`flex items-start justify-between gap-4 p-4 rounded-lg border ${activity.status === 'resolved' || activity.status === 'dismissed' ? 'opacity-60' : ''}`}
                      data-testid={`alert-${activity.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${getSeverityColor(activity.severity)}`}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm" data-testid={`text-activity-type-${activity.id}`}>{activity.type}</p>
                            <Badge variant={getSeverityBadgeVariant(activity.severity)}>
                              {activity.severity}
                            </Badge>
                            <Badge variant="outline">
                              {activity.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground" data-testid={`text-activity-desc-${activity.id}`}>{activity.description}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              IP: {activity.ipAddress}
                            </span>
                            {activity.geoLocation && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {activity.geoLocation}
                              </span>
                            )}
                            {activity.userEmail && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {activity.userEmail}
                              </span>
                            )}
                            <span>{formatDateTime(activity.detectedAt)}</span>
                          </div>
                          {activity.resolutionNotes && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              <span className="font-medium">Resolution: </span>
                              {activity.resolutionNotes}
                              {activity.resolvedByEmail && (
                                <span className="text-muted-foreground"> — {activity.resolvedByEmail}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {(activity.status === 'open' || activity.status === 'investigating') && (
                        <Button size="sm" variant="outline" onClick={() => handleResolveActivity(activity)} data-testid={`button-resolve-${activity.id}`}>
                          <Check className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="masked" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Masked Data Access Log</CardTitle>
              <CardDescription>Track click-to-call, WhatsApp, and other masked data actions</CardDescription>
            </CardHeader>
            <CardContent>
              {maskedAccessLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-4" />
                  <p>No masked data actions recorded yet</p>
                  <p className="text-sm mt-1">Actions like click-to-call and WhatsApp will appear here</p>
                </div>
              ) : (
                <DataTable columns={maskedActionColumns} data={maskedAccessLogs} emptyMessage="No masked data actions" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alert Configuration</CardTitle>
              <CardDescription>Configure security alert triggers and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Failed Login Alert</Label>
                  <p className="text-xs text-muted-foreground">Alert after {alertSettings.failedLoginThreshold} failed login attempts</p>
                </div>
                <Select
                  value={alertSettings.failedLoginThreshold.toString()}
                  onValueChange={(v) => setAlertSettings(prev => ({ ...prev, failedLoginThreshold: parseInt(v) }))}
                >
                  <SelectTrigger className="w-[100px]" data-testid="select-failed-threshold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Bulk Export Detection</Label>
                  <p className="text-xs text-muted-foreground">Alert on large data exports</p>
                </div>
                <Switch
                  checked={alertSettings.bulkExportAlert}
                  onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, bulkExportAlert: checked }))}
                  data-testid="switch-bulk-export"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Geographic Anomaly Detection</Label>
                  <p className="text-xs text-muted-foreground">Alert on logins from new locations</p>
                </div>
                <Switch
                  checked={alertSettings.geoAnomalyAlert}
                  onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, geoAnomalyAlert: checked }))}
                  data-testid="switch-geo-anomaly"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>After-Hours Access Alert</Label>
                  <p className="text-xs text-muted-foreground">Alert on access outside business hours</p>
                </div>
                <Switch
                  checked={alertSettings.afterHoursAlert}
                  onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, afterHoursAlert: checked }))}
                  data-testid="switch-after-hours"
                />
              </div>
              <div className="flex items-center justify-between gap-4 pt-4 border-t">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Send alerts via email to admins</p>
                </div>
                <Switch
                  checked={alertSettings.emailNotifications}
                  onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, emailNotifications: checked }))}
                  data-testid="switch-email-notifications"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Access Log Details
              {selectedLog?.isSuspicious && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Suspicious
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div data-testid="field-timestamp">
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <p className="font-mono text-sm">{formatDateTime(selectedLog.createdAt)}</p>
                </div>
                <div data-testid="field-action">
                  <Label className="text-muted-foreground">Action</Label>
                  <p>
                    <Badge variant={selectedLog.action === 'Create' ? 'default' : selectedLog.action === 'Delete' ? 'destructive' : 'secondary'}>
                      {selectedLog.action}
                    </Badge>
                  </p>
                </div>
                <div data-testid="field-entity">
                  <Label className="text-muted-foreground">Entity Type</Label>
                  <p className="capitalize">{selectedLog.entityType}</p>
                </div>
                <div data-testid="field-entity-id">
                  <Label className="text-muted-foreground">Entity ID</Label>
                  <p className="font-mono text-sm">{selectedLog.entityId || '—'}</p>
                </div>
                <div data-testid="field-user">
                  <Label className="text-muted-foreground">User</Label>
                  <p>{selectedLog.userEmail || 'System'}</p>
                </div>
                <div data-testid="field-ip">
                  <Label className="text-muted-foreground">IP Address</Label>
                  <p className="font-mono text-sm">{selectedLog.ipAddress || '—'}</p>
                </div>
              </div>

              {(selectedLog.geoLocation || selectedLog.userAgent) && (
                <div className="border-t pt-4" data-testid="section-network">
                  <Label className="text-muted-foreground flex items-center gap-1 mb-2">
                    <Globe className="h-4 w-4" /> Network Details
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.geoLocation && (
                      <div data-testid="field-location">
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="text-sm flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedLog.geoLocation}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedLog.userAgent && (
                    <div className="mt-2" data-testid="field-user-agent">
                      <p className="text-xs text-muted-foreground">User Agent</p>
                      <p className="text-xs font-mono text-muted-foreground break-all">{selectedLog.userAgent}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedLog.isSuspicious && selectedLog.suspiciousReason && (
                <div className="border-t pt-4 bg-destructive/10 p-3 rounded-lg" data-testid="section-suspicious">
                  <Label className="text-destructive flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-4 w-4" /> Suspicious Activity Detected
                  </Label>
                  <p className="text-sm">{selectedLog.suspiciousReason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Security Alert</DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{selectedAlert.type}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedAlert.description}</p>
              </div>
              <div>
                <Label>Resolution Notes</Label>
                <Textarea
                  placeholder="Describe how this was resolved..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="mt-1"
                  data-testid="textarea-resolution"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)} data-testid="button-cancel-resolve">
              Cancel
            </Button>
            <Button onClick={submitResolve} disabled={resolveActivityMutation.isPending} data-testid="button-submit-resolve">
              {resolveActivityMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} entityName="Access Logs" columns={exportColumns} totalRecords={filteredLogs.length} />
    </div>
  );
}
