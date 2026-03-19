import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Filter, Eye, Loader2, Download, MapPin, Globe, User, Clock, Calendar, Shield, Database, Trash2, Archive, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { ExportModal } from '@/components/shared/ExportModal';
import { StatCard } from '@/components/shared/StatCard';
import { CreateEditDrawer } from '@/components/shared/CreateEditDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { AuditLog, DataRetentionPolicy } from '@shared/schema';

export default function AuditLogs() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('logs');
  const [policyDrawerOpen, setPolicyDrawerOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DataRetentionPolicy | null>(null);
  const [deletePolicyOpen, setDeletePolicyOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<DataRetentionPolicy | null>(null);
  const [diffExpanded, setDiffExpanded] = useState(true);

  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/audit-logs'],
  });

  const { data: retentionPolicies = [] } = useQuery<DataRetentionPolicy[]>({
    queryKey: ['/api/data-retention-policies'],
  });

  const createPolicyMutation = useMutation({
    mutationFn: (data: Partial<DataRetentionPolicy>) =>
      apiRequest('POST', '/api/data-retention-policies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-retention-policies'] });
      toast({ title: 'Success', description: 'Retention policy created.' });
      setPolicyDrawerOpen(false);
    },
  });

  const updatePolicyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DataRetentionPolicy> }) =>
      apiRequest('PATCH', `/api/data-retention-policies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-retention-policies'] });
      toast({ title: 'Success', description: 'Retention policy updated.' });
      setPolicyDrawerOpen(false);
      setEditingPolicy(null);
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/data-retention-policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-retention-policies'] });
      toast({ title: 'Success', description: 'Retention policy deleted.' });
      setDeletePolicyOpen(false);
      setPolicyToDelete(null);
    },
  });

  const getDateRangeStart = (range: string): Date | null => {
    const now = new Date();
    switch (range) {
      case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case '7d': { const d = new Date(); d.setDate(d.getDate() - 7); return d; }
      case '30d': { const d = new Date(); d.setDate(d.getDate() - 30); return d; }
      case '90d': { const d = new Date(); d.setDate(d.getDate() - 90); return d; }
      default: return null;
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (userFilter !== 'all' && log.userEmail !== userFilter) return false;
    if (dateRange !== 'all') {
      const start = getDateRangeStart(dateRange);
      if (start && new Date(log.createdAt) < start) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.action.toLowerCase().includes(query) ||
        log.entityType.toLowerCase().includes(query) ||
        log.entityId.toLowerCase().includes(query) ||
        (log.userEmail || '').toLowerCase().includes(query)
      );
    }
    return true;
  });

  const actions = [...new Set(auditLogs.map(l => l.action))];
  const users = [...new Set(auditLogs.map(l => l.userEmail).filter(Boolean))] as string[];

  const formatDateTime = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const exportColumns = [
    { key: 'id', label: 'ID', defaultSelected: true },
    { key: 'action', label: 'Action', defaultSelected: true },
    { key: 'entityType', label: 'Entity Type', defaultSelected: true },
    { key: 'entityId', label: 'Entity ID', defaultSelected: true },
    { key: 'userEmail', label: 'User', defaultSelected: true },
    { key: 'ipAddress', label: 'IP Address', defaultSelected: true },
    { key: 'geoLocation', label: 'Location' },
    { key: 'beforeValue', label: 'Before Value' },
    { key: 'afterValue', label: 'After Value' },
    { key: 'reason', label: 'Reason' },
    { key: 'createdAt', label: 'Timestamp', defaultSelected: true },
  ];

  const todayLogs = auditLogs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length;
  const uniqueUsers = [...new Set(auditLogs.map(l => l.userEmail).filter(Boolean))].length;
  const uniqueIPs = [...new Set(auditLogs.map(l => l.ipAddress).filter(Boolean))].length;
  const modifyActions = auditLogs.filter(l => l.action === 'Update' || l.action === 'Delete').length;

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'Create': return 'default';
      case 'Delete': return 'destructive';
      case 'Update': return 'secondary';
      default: return 'outline';
    }
  };

  const renderDiffValue = (value: string | null, type: 'before' | 'after') => {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return (
        <pre className={`font-mono text-xs p-3 rounded-md overflow-auto max-h-48 ${type === 'before' ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return (
        <p className={`font-mono text-xs p-2 rounded ${type === 'before' ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
          {value}
        </p>
      );
    }
  };

  const columns = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      render: (item: AuditLog) => (
        <span className="text-sm font-mono" data-testid={`text-log-time-${item.id}`}>{formatDateTime(item.createdAt)}</span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (item: AuditLog) => (
        <Badge variant={getActionBadgeVariant(item.action)} data-testid={`badge-action-${item.id}`}>
          {item.action}
        </Badge>
      ),
    },
    {
      key: 'userEmail',
      header: 'User',
      sortable: true,
      render: (item: AuditLog) => (
        <span className="text-sm" data-testid={`text-user-${item.id}`}>{item.userEmail || 'System'}</span>
      ),
    },
    {
      key: 'entityType',
      header: 'Entity',
      sortable: true,
      render: (item: AuditLog) => (
        <div>
          <span className="capitalize font-medium">{item.entityType}</span>
          <span className="text-muted-foreground text-xs ml-1">({item.entityId})</span>
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP / Location',
      render: (item: AuditLog) => (
        <div className="text-xs" data-testid={`text-ip-${item.id}`}>
          <div className="font-mono">{item.ipAddress || '—'}</div>
          {item.geoLocation && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {item.geoLocation}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'changes',
      header: 'Changes',
      render: (item: AuditLog) => (
        <div>
          {(item.beforeValue || item.afterValue) ? (
            <Badge variant="outline" className="text-xs">Has Diff</Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (item: AuditLog) => (
        <Button variant="ghost" size="icon" onClick={() => setSelectedLog(item)} data-testid={`button-view-log-${item.id}`}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const handlePolicySubmit = (data: Record<string, unknown>) => {
    const policyData = {
      entityType: data.entityType as string,
      retentionDays: parseInt(data.retentionDays as string) || 90,
      description: data.description as string,
      isActive: true,
      autoDelete: (data.autoDelete as boolean) ?? false,
      archiveBeforeDelete: (data.archiveBeforeDelete as boolean) ?? true,
    };

    if (editingPolicy) {
      updatePolicyMutation.mutate({ id: editingPolicy.id, data: policyData });
    } else {
      createPolicyMutation.mutate(policyData);
    }
  };

  const retentionEntities = ['Audit Logs', 'Access Logs', 'Masked Data Logs', 'Export Logs', 'Session Data', 'Login History', 'API Request Logs', 'Error Logs'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Audit Logs"
        description="Track all system changes and user actions with IP & location info"
        actions={
          <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Logs" value={auditLogs.length} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="Today's Activity" value={todayLogs} />
        <StatCard title="Unique Users" value={uniqueUsers} icon={<User className="h-5 w-5" />} />
        <StatCard title="Modify Actions" value={modifyActions} icon={<Shield className="h-5 w-5" />} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-audit">
          <TabsTrigger value="logs" data-testid="tab-logs">
            <Eye className="h-4 w-4 mr-1" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="retention" data-testid="tab-retention">
            <Database className="h-4 w-4 mr-1" />
            Data Retention
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by action, entity, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-action">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-user">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
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

          <DataTable
            data={filteredLogs}
            columns={columns}
            onRowClick={(item) => setSelectedLog(item)}
            emptyMessage="No audit logs found"
          />
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold">Data Retention Policies</h3>
              <p className="text-sm text-muted-foreground">Configure how long different data types are retained before archival or deletion</p>
            </div>
            <Button onClick={() => { setEditingPolicy(null); setPolicyDrawerOpen(true); }} data-testid="button-add-policy">
              <Database className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
          </div>

          {retentionPolicies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">No retention policies configured yet</p>
                <p className="text-sm text-muted-foreground text-center mt-1">Add policies to control how long different types of data are stored</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {retentionPolicies.map((policy) => (
                <Card key={policy.id} data-testid={`policy-card-${policy.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${policy.isActive ? 'bg-green-500/10' : 'bg-muted'}`}>
                          <Database className={`h-4 w-4 ${policy.isActive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm" data-testid={`text-policy-entity-${policy.id}`}>{policy.entityType}</p>
                            <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                              {policy.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {policy.autoDelete && (
                              <Badge variant="destructive" className="text-xs">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Auto-Delete
                              </Badge>
                            )}
                            {policy.archiveBeforeDelete && (
                              <Badge variant="outline" className="text-xs">
                                <Archive className="h-3 w-3 mr-1" />
                                Archive First
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Retain for <span className="font-medium">{policy.retentionDays} days</span>
                            {policy.description && ` — ${policy.description}`}
                          </p>
                          {policy.lastExecutedAt && (
                            <p className="text-xs text-muted-foreground">
                              Last run: {formatDateTime(policy.lastExecutedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={policy.isActive}
                          onCheckedChange={(checked) =>
                            updatePolicyMutation.mutate({ id: policy.id, data: { isActive: checked } })
                          }
                          data-testid={`switch-policy-${policy.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingPolicy(policy); setPolicyDrawerOpen(true); }}
                          data-testid={`button-edit-policy-${policy.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setPolicyToDelete(policy); setDeletePolicyOpen(true); }}
                          data-testid={`button-delete-policy-${policy.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Audit Log Details</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div data-testid="field-timestamp">
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <p className="font-mono text-sm">{formatDateTime(selectedLog.createdAt)}</p>
                </div>
                <div data-testid="field-action">
                  <Label className="text-muted-foreground">Action</Label>
                  <p><Badge variant={getActionBadgeVariant(selectedLog.action)}>{selectedLog.action}</Badge></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div data-testid="field-entity">
                  <Label className="text-muted-foreground">Entity</Label>
                  <p className="capitalize">{selectedLog.entityType}</p>
                  <p className="text-sm font-mono text-muted-foreground">{selectedLog.entityId}</p>
                </div>
                <div data-testid="field-user">
                  <Label className="text-muted-foreground">User</Label>
                  <p>{selectedLog.userEmail || 'System'}</p>
                </div>
              </div>

              <div className="border-t pt-4" data-testid="section-network">
                <Label className="text-muted-foreground flex items-center gap-1 mb-2">
                  <Globe className="h-4 w-4" /> Network Information
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div data-testid="field-ip">
                    <p className="text-xs text-muted-foreground">IP Address</p>
                    <p className="font-mono text-sm">{selectedLog.ipAddress || '—'}</p>
                  </div>
                  <div data-testid="field-location">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm flex items-center gap-1">
                      {selectedLog.geoLocation ? (
                        <><MapPin className="h-3 w-3" /> {selectedLog.geoLocation}</>
                      ) : '—'}
                    </p>
                  </div>
                </div>
                {selectedLog.userAgent && (
                  <div className="mt-2" data-testid="field-user-agent">
                    <p className="text-xs text-muted-foreground">User Agent</p>
                    <p className="text-xs font-mono text-muted-foreground break-all">{selectedLog.userAgent}</p>
                  </div>
                )}
                {selectedLog.sessionId && (
                  <div className="mt-2" data-testid="field-session">
                    <p className="text-xs text-muted-foreground">Session ID</p>
                    <p className="text-xs font-mono">{selectedLog.sessionId}</p>
                  </div>
                )}
              </div>

              {(selectedLog.beforeValue || selectedLog.afterValue) && (
                <Collapsible open={diffExpanded} onOpenChange={setDiffExpanded}>
                  <div className="border-t pt-4" data-testid="section-changes">
                    <CollapsibleTrigger className="flex items-center gap-2 w-full">
                      <ChevronDown className={`h-4 w-4 transition-transform ${diffExpanded ? 'rotate-0' : '-rotate-90'}`} />
                      <Label className="text-muted-foreground cursor-pointer">Before / After Snapshot</Label>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 space-y-3">
                      {selectedLog.beforeValue && (
                        <div data-testid="field-before">
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Trash2 className="h-3 w-3" /> Before
                          </p>
                          {renderDiffValue(selectedLog.beforeValue, 'before')}
                        </div>
                      )}
                      {selectedLog.afterValue && (
                        <div data-testid="field-after">
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Archive className="h-3 w-3" /> After
                          </p>
                          {renderDiffValue(selectedLog.afterValue, 'after')}
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {selectedLog.reason && (
                <div className="border-t pt-4" data-testid="field-reason">
                  <Label className="text-muted-foreground">Reason</Label>
                  <p className="text-sm">{selectedLog.reason}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CreateEditDrawer
        open={policyDrawerOpen}
        onOpenChange={setPolicyDrawerOpen}
        title={editingPolicy ? 'Edit Retention Policy' : 'Add Retention Policy'}
        fields={[
          { name: 'entityType', label: 'Data Type', type: 'select', options: retentionEntities.map(e => ({ value: e, label: e })), required: true },
          { name: 'retentionDays', label: 'Retention Period (days)', type: 'number', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'autoDelete', label: 'Auto-delete expired data', type: 'switch' },
          { name: 'archiveBeforeDelete', label: 'Archive before deletion', type: 'switch' },
        ]}
        initialData={editingPolicy ? {
          entityType: editingPolicy.entityType,
          retentionDays: editingPolicy.retentionDays.toString(),
          description: editingPolicy.description || '',
          autoDelete: editingPolicy.autoDelete,
          archiveBeforeDelete: editingPolicy.archiveBeforeDelete,
        } : { retentionDays: '90', archiveBeforeDelete: true }}
        onSubmit={handlePolicySubmit}
        isLoading={createPolicyMutation.isPending || updatePolicyMutation.isPending}
      />

      <ConfirmDialog
        open={deletePolicyOpen}
        onOpenChange={setDeletePolicyOpen}
        title="Delete Retention Policy"
        description={`Are you sure you want to delete the retention policy for "${policyToDelete?.entityType}"?`}
        onConfirm={() => policyToDelete && deletePolicyMutation.mutate(policyToDelete.id)}
        destructive
      />

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        entityName="Audit Logs"
        columns={exportColumns}
        totalRecords={filteredLogs.length}
      />
    </div>
  );
}
