import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plug, CheckCircle, XCircle, AlertTriangle, Settings, RefreshCw, Truck, CreditCard, MessageSquare, FileSpreadsheet, Cloud, Loader2, Plus, RotateCcw, AlertOctagon, Clock, History, Webhook, Shield, Lock, Unlock, Eye, EyeOff, Volume2, VolumeX, CheckCircle2, Repeat, TimerReset, ShieldAlert, ShieldCheck, Info, Users, Ban, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { DataTable } from '@/components/shared/DataTable';
import type { Column } from '@/components/shared/DataTable';
import { Separator } from '@/components/ui/separator';
import type { Integration, IntegrationSyncRun, IntegrationWebhookEvent, IntegrationAlert } from '@shared/schema';

const typeIcons: Record<string, typeof Truck> = {
  logistics: Truck,
  payment: CreditCard,
  communication: MessageSquare,
  analytics: FileSpreadsheet,
  erp: Cloud,
};

const types = ['all', 'logistics', 'payment', 'communication', 'analytics', 'erp'];

const integrationPresets = [
  { name: 'Razorpay', type: 'payment', fields: ['apiKey', 'apiSecret', 'webhookSecret'] },
  { name: 'Shiprocket', type: 'logistics', fields: ['email', 'password'] },
  { name: 'Google Sheets', type: 'analytics', fields: ['clientEmail', 'privateKey'] },
  { name: 'WhatsApp Business', type: 'communication', fields: ['phoneNumberId', 'accessToken', 'webhookVerifyToken'] },
  { name: 'Tally ERP', type: 'erp', fields: ['serverUrl', 'companyName', 'username', 'password'] },
];

const fieldLabels: Record<string, string> = {
  apiKey: 'API Key',
  apiSecret: 'API Secret',
  webhookSecret: 'Webhook Secret (optional)',
  email: 'Email',
  password: 'Password',
  clientEmail: 'Service Account Email',
  privateKey: 'Private Key (JSON)',
  phoneNumberId: 'Phone Number ID',
  accessToken: 'Access Token',
  webhookVerifyToken: 'Webhook Verify Token (optional)',
  serverUrl: 'Tally Server URL',
  companyName: 'Company Name',
  username: 'Username (optional)',
  endpoint: 'Endpoint URL',
};

const fieldPlaceholders: Record<string, string> = {
  apiKey: 'rzp_live_xxxxxxxxxxxx',
  apiSecret: 'Enter your API secret...',
  webhookSecret: 'whsec_xxxxxxxxxxxx',
  email: 'your-email@company.com',
  password: 'Enter password...',
  clientEmail: 'service-account@project.iam.gserviceaccount.com',
  privateKey: '-----BEGIN PRIVATE KEY-----\n...',
  phoneNumberId: '1234567890123456',
  accessToken: 'EAAxxxxxxx...',
  webhookVerifyToken: 'your_verify_token',
  serverUrl: 'http://localhost:9000',
  companyName: 'Your Company Name',
  username: 'admin',
  endpoint: 'https://api.example.com',
};

interface FormState {
  name: string;
  type: string;
  autoRetry: boolean;
  retryLimit: number;
  retryIntervalSecs: number;
  [key: string]: string | boolean | number;
}

const RETRY_LIMIT_OPTIONS = [1, 2, 3, 5, 10];
const RETRY_INTERVAL_OPTIONS = [
  { value: 30,  label: '30 seconds' },
  { value: 60,  label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
];

// RBAC matrix used in the Access Control tab
const RBAC_MATRIX = [
  { role: 'Super Admin',          level: 'Full Access',  canConfigure: true,  canToggle: true,  canRetry: true,  canViewLogs: true,  superAdminOnly: true },
  { role: 'Admin Ops',            level: 'Full Access',  canConfigure: true,  canToggle: true,  canRetry: true,  canViewLogs: true,  superAdminOnly: false },
  { role: 'Finance Manager',      level: 'Read Only',    canConfigure: false, canToggle: false, canRetry: false, canViewLogs: true,  superAdminOnly: false },
  { role: 'Finance Staff',        level: 'Read Only',    canConfigure: false, canToggle: false, canRetry: false, canViewLogs: true,  superAdminOnly: false },
  { role: 'Warehouse Manager',    level: 'Read Only',    canConfigure: false, canToggle: false, canRetry: false, canViewLogs: true,  superAdminOnly: false },
  { role: 'Warehouse Staff',      level: 'No Access',    canConfigure: false, canToggle: false, canRetry: false, canViewLogs: false, superAdminOnly: false },
  { role: 'Logistics Manager',    level: 'Read Only',    canConfigure: false, canToggle: false, canRetry: false, canViewLogs: true,  superAdminOnly: false },
  { role: 'Sales Manager',        level: 'Read Only',    canConfigure: false, canToggle: false, canRetry: false, canViewLogs: true,  superAdminOnly: false },
  { role: 'Medical Representative', level: 'No Access',  canConfigure: false, canToggle: false, canRetry: false, canViewLogs: false, superAdminOnly: false },
  { role: 'HR/Compliance',        level: 'No Access',    canConfigure: false, canToggle: false, canRetry: false, canViewLogs: false, superAdminOnly: false },
  { role: 'Analytics Viewer',     level: 'Read Only',    canConfigure: false, canToggle: false, canRetry: false, canViewLogs: true,  superAdminOnly: false },
];

const roleAccessMap: Record<string, string> = {
  'Super Admin': 'Full Access',
  'Admin Ops': 'Full Access',
  'Finance Manager': 'Read Only',
  'Finance Staff': 'Read Only',
  'Warehouse Manager': 'Read Only',
  'Warehouse Staff': 'No Access',
  'Logistics Manager': 'Read Only',
  'Sales Manager': 'Read Only',
  'Medical Representative': 'No Access',
  'HR/Compliance': 'No Access',
  'Analytics Viewer': 'Read Only',
};

const accessibleRoles: Record<string, string[]> = {
  'Full Access': ['Super Admin', 'Admin Ops'],
  'Read Only': ['Finance Manager', 'Finance Staff', 'Warehouse Manager', 'Logistics Manager', 'Sales Manager', 'Analytics Viewer'],
};

function formatDuration(startedAt: string | Date, finishedAt: string | Date | null): string {
  if (!finishedAt) return 'Running...';
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  const diff = end - start;
  if (diff < 1000) return `${diff}ms`;
  if (diff < 60000) return `${(diff / 1000).toFixed(1)}s`;
  return `${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`;
}

function getIntegrationName(id: number, integrations: Integration[]): string {
  return integrations.find(i => i.id === id)?.name || `Integration #${id}`;
}

export default function Integrations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [formState, setFormState] = useState<FormState>({ name: '', type: 'logistics', autoRetry: false, retryLimit: 3, retryIntervalSecs: 60 });
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [primaryTab, setPrimaryTab] = useState('integrations');
  const [syncFilter, setSyncFilter] = useState('all');
  const [webhookFilter, setWebhookFilter] = useState('all');
  const [webhookPayloadDialog, setWebhookPayloadDialog] = useState<IntegrationWebhookEvent | null>(null);
  const [expandedRetry, setExpandedRetry] = useState<number | null>(null);

  const { data: integrations = [], isLoading } = useQuery<Integration[]>({
    queryKey: ['/api/integrations'],
  });

  const { data: syncRuns = [], isLoading: syncRunsLoading } = useQuery<IntegrationSyncRun[]>({
    queryKey: ['/api/integration-sync-runs'],
  });

  const { data: webhookEvents = [], isLoading: webhooksLoading } = useQuery<IntegrationWebhookEvent[]>({
    queryKey: ['/api/integration-webhook-events'],
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<IntegrationAlert[]>({
    queryKey: ['/api/integration-alerts'],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Integration>) => apiRequest('POST', '/api/integrations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      toast({ title: 'Success', description: 'Integration added.' });
      setConfigDialogOpen(false);
      setAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add integration.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Integration> }) =>
      apiRequest('PATCH', `/api/integrations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      toast({ title: 'Success', description: 'Integration updated.' });
      setConfigDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update integration.', variant: 'destructive' });
    },
  });

  const createSyncRunMutation = useMutation({
    mutationFn: (data: Partial<IntegrationSyncRun>) => apiRequest('POST', '/api/integration-sync-runs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integration-sync-runs'] });
    },
  });

  const alertMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<IntegrationAlert> }) =>
      apiRequest('PATCH', `/api/integration-alerts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integration-alerts'] });
      toast({ title: 'Success', description: 'Alert updated.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update alert.', variant: 'destructive' });
    },
  });

  // Auto-retry inline toggle mutation
  const autoRetryMutation = useMutation({
    mutationFn: ({ id, autoRetry }: { id: number; autoRetry: boolean }) =>
      apiRequest('PATCH', `/api/integrations/${id}`, { autoRetry }),
    onSuccess: (_, { autoRetry }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      toast({ title: autoRetry ? 'Auto-Retry Enabled' : 'Auto-Retry Disabled', description: 'Integration retry policy updated.' });
    },
    onError: () => toast({ title: 'Error', description: 'Could not update retry policy', variant: 'destructive' }),
  });

  const resetForm = () => {
    setFormState({ name: '', type: 'logistics', autoRetry: false, retryLimit: 3, retryIntervalSecs: 60 });
    setSelectedIntegration(null);
  };

  // RBAC helpers
  const getUserRole = (): string => (user as Record<string, unknown>)?.role as string || '';
  const getCurrentAccess = (): string => roleAccessMap[getUserRole()] || 'No Access';
  const canModify = (): boolean => getCurrentAccess() === 'Full Access';
  const isSuperAdmin = (): boolean => getUserRole() === 'Super Admin';

  const handleToggle = (integration: Integration, enabled: boolean) => {
    updateMutation.mutate({
      id: integration.id,
      data: {
        status: enabled ? 'connected' : 'disconnected',
        lastSyncAt: enabled ? new Date() : undefined,
      },
    });
  };

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    const config = integration.config as Record<string, string> | null;
    setFormState({
      name: integration.name,
      type: integration.type,
      autoRetry: integration.autoRetry ?? false,
      retryLimit: integration.retryLimit ?? 3,
      retryIntervalSecs: integration.retryIntervalSecs ?? 60,
      ...(config || {}),
    });
    setConfigDialogOpen(true);
  };

  const handleAddNew = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const handleSelectPreset = (preset: typeof integrationPresets[0]) => {
    setFormState({ name: preset.name, type: preset.type, autoRetry: false, retryLimit: 3, retryIntervalSecs: 60 });
    setAddDialogOpen(false);
    setConfigDialogOpen(true);
  };

  const handleSync = (integration: Integration) => {
    updateMutation.mutate({
      id: integration.id,
      data: { lastSyncAt: new Date() },
    });
    toast({ title: 'Sync Started', description: `Syncing ${integration.name}...` });
  };

  const handleRetry = (integration: Integration) => {
    const latestRun = getLatestSyncRun(integration.id);
    const nextAttempt = latestRun ? latestRun.attempt + 1 : 1;
    updateMutation.mutate({
      id: integration.id,
      data: {
        status: 'connected',
        lastSyncAt: new Date(),
        errorMessage: '',
      },
    });
    createSyncRunMutation.mutate({
      integrationId: integration.id,
      status: 'running',
      direction: 'outbound',
      attempt: nextAttempt,
      triggeredBy: 'manual',
    });
    toast({ title: 'Retry Initiated', description: `Retrying connection to ${integration.name} (attempt #${nextAttempt})...` });
  };

  const getFieldsForIntegration = (name: string): string[] => {
    const preset = integrationPresets.find(p => p.name === name);
    return preset?.fields || ['apiKey', 'endpoint'];
  };

  const handleSaveIntegration = () => {
    if (!formState.name.trim()) {
      toast({ title: 'Error', description: 'Integration name is required.', variant: 'destructive' });
      return;
    }

    const fields = getFieldsForIntegration(formState.name);
    const config: Record<string, string> = {};
    fields.forEach(field => {
      if (formState[field]) {
        config[field] = String(formState[field]);
      }
    });

    const integrationData = {
      name: formState.name,
      type: formState.type,
      config,
      status: 'disconnected' as const,
      autoRetry: formState.autoRetry as boolean,
      retryLimit: formState.retryLimit as number,
      retryIntervalSecs: formState.retryIntervalSecs as number,
    };

    if (selectedIntegration) {
      updateMutation.mutate({ id: selectedIntegration.id, data: integrationData });
    } else {
      createMutation.mutate(integrationData);
    }
  };

  const filteredIntegrations = activeTab === 'all'
    ? integrations
    : integrations.filter(i => i.type === activeTab);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Disconnected</Badge>;
    }
  };

  const getLatestSyncRun = (integrationId: number): IntegrationSyncRun | undefined => {
    return syncRuns
      .filter(r => r.integrationId === integrationId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  };

  const getUserAccessLevel = (): string => getCurrentAccess();

  const filteredSyncRuns = syncFilter === 'all'
    ? syncRuns
    : syncRuns.filter(r => r.integrationId === Number(syncFilter));

  const filteredWebhookEvents = webhookFilter === 'all'
    ? webhookEvents
    : webhookEvents.filter(e => e.integrationId === Number(webhookFilter));

  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    return (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
  });

  const syncColumns: Column<IntegrationSyncRun>[] = [
    {
      key: 'integrationId',
      header: 'Integration',
      render: (item) => <span data-testid={`sync-integration-${item.id}`}>{getIntegrationName(item.integrationId, integrations)}</span>,
    },
    {
      key: 'direction',
      header: 'Direction',
      render: (item) => (
        <Badge variant={item.direction === 'inbound' ? 'default' : 'secondary'} data-testid={`sync-direction-${item.id}`}>
          {item.direction}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const colors: Record<string, string> = {
          running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        };
        return (
          <Badge className={colors[item.status] || ''} data-testid={`sync-status-${item.id}`}>
            {item.status === 'running' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {item.status}
          </Badge>
        );
      },
    },
    {
      key: 'records',
      header: 'Records',
      render: (item) => (
        <span data-testid={`sync-records-${item.id}`}>
          {item.recordsProcessed ?? 0} / {item.recordsFailed ?? 0}
        </span>
      ),
    },
    {
      key: 'attempt',
      header: 'Attempt #',
      render: (item) => <span data-testid={`sync-attempt-${item.id}`}>{item.attempt}</span>,
    },
    {
      key: 'triggeredBy',
      header: 'Triggered By',
      render: (item) => <span data-testid={`sync-triggered-${item.id}`}>{item.triggeredBy || 'system'}</span>,
    },
    {
      key: 'startedAt',
      header: 'Started At',
      render: (item) => <span data-testid={`sync-started-${item.id}`}>{new Date(item.startedAt).toLocaleString()}</span>,
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (item) => <span data-testid={`sync-duration-${item.id}`}>{formatDuration(item.startedAt, item.finishedAt)}</span>,
    },
  ];

  const webhookColumns: Column<IntegrationWebhookEvent>[] = [
    {
      key: 'integrationId',
      header: 'Integration',
      render: (item) => <span data-testid={`webhook-integration-${item.id}`}>{getIntegrationName(item.integrationId, integrations)}</span>,
    },
    {
      key: 'eventType',
      header: 'Event Type',
      render: (item) => <span data-testid={`webhook-event-type-${item.id}`}>{item.eventType}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const colors: Record<string, string> = {
          received: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          processed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          ignored: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        };
        return (
          <Badge className={colors[item.status] || ''} data-testid={`webhook-status-${item.id}`}>
            {item.status}
          </Badge>
        );
      },
    },
    {
      key: 'responseCode',
      header: 'Response Code',
      render: (item) => {
        if (!item.responseCode) return <span data-testid={`webhook-response-${item.id}`}>--</span>;
        const code = item.responseCode;
        let color = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        if (code >= 400 && code < 500) color = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        if (code >= 500) color = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        return <Badge className={color} data-testid={`webhook-response-${item.id}`}>{code}</Badge>;
      },
    },
    {
      key: 'processingTimeMs',
      header: 'Processing Time',
      render: (item) => <span data-testid={`webhook-time-${item.id}`}>{item.processingTimeMs != null ? `${item.processingTimeMs}ms` : '--'}</span>,
    },
    {
      key: 'receivedAt',
      header: 'Received At',
      render: (item) => <span data-testid={`webhook-received-${item.id}`}>{new Date(item.receivedAt).toLocaleString()}</span>,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const errorCount = integrations.filter(i => i.status === 'error').length;
  const autoRetryCount = integrations.filter(i => i.autoRetry).length;
  const isEnabled = (status: string) => status === 'connected';
  const currentAccess = getUserAccessLevel();
  const userCanModify = canModify();
  const userIsSuperAdmin = isSuperAdmin();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Integrations"
        description="Connect and manage third-party services"
        actions={
          <Button onClick={handleAddNew} data-testid="button-add-integration">
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        }
      />

      <Tabs value={primaryTab} onValueChange={setPrimaryTab} data-testid="primary-tabs">
        <TabsList data-testid="primary-tabs-list">
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Plug className="h-4 w-4 mr-1" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="sync-history" data-testid="tab-sync-history">
            <History className="h-4 w-4 mr-1" />
            Sync History
          </TabsTrigger>
          <TabsTrigger value="webhooks" data-testid="tab-webhooks">
            <Webhook className="h-4 w-4 mr-1" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <Shield className="h-4 w-4 mr-1" />
            Alerts
            {alerts.filter(a => a.status === 'active').length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0" data-testid="alerts-count">
                {alerts.filter(a => a.status === 'active').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="access-control" data-testid="tab-access-control">
            <ShieldAlert className="h-4 w-4 mr-1" />
            Access Control
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="mt-4 space-y-4">
          {/* RBAC access banner */}
          {!userCanModify && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
              currentAccess === 'No Access'
                ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`} data-testid="banner-rbac-access">
              {currentAccess === 'No Access' ? <Ban className="h-4 w-4 flex-shrink-0" /> : <Eye className="h-4 w-4 flex-shrink-0" />}
              <div>
                <span className="font-semibold">{currentAccess}:</span>{' '}
                {currentAccess === 'No Access'
                  ? 'You do not have access to view integration details. Contact a Super Admin.'
                  : 'You can view integration details but cannot modify settings, toggle connections, or configure auto-retry. Contact a Super Admin for changes.'}
              </div>
            </div>
          )}

          {userIsSuperAdmin && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-primary/5 border-primary/20 text-sm text-primary" data-testid="banner-super-admin">
              <ShieldCheck className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">Super Admin:</span>
              <span className="text-muted-foreground">You have full control over all integration settings, including auto-retry policies and access configuration.</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-integrations">{integrations.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Connected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-connected-count">{connectedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="text-error-count">{errorCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Repeat className="h-3.5 w-3.5 text-primary" /> Auto-Retry On
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary" data-testid="text-auto-retry-count">{autoRetryCount}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList data-testid="type-filter-tabs">
              {types.map(type => (
                <TabsTrigger key={type} value={type} className="capitalize" data-testid={`tab-${type}`}>
                  {type === 'all' ? 'All' : type}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIntegrations.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground" data-testid="text-no-integrations">
                    No integrations found. Add your first integration to get started.
                  </div>
                ) : (
                  filteredIntegrations.map(integration => {
                    const Icon = typeIcons[integration.type] || Plug;
                    const hasError = integration.status === 'error';
                    const latestSync = getLatestSyncRun(integration.id);
                    return (
                      <Card key={integration.id} className={`hover-elevate ${hasError ? 'border-destructive' : ''}`} data-testid={`card-integration-${integration.id}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-md ${hasError ? 'bg-destructive/10' : 'bg-muted'}`}>
                                <Icon className={`h-5 w-5 ${hasError ? 'text-destructive' : ''}`} />
                              </div>
                              <div>
                                <CardTitle className="text-base">{integration.name}</CardTitle>
                                <CardDescription className="text-xs capitalize">{integration.type}</CardDescription>
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-access-${integration.id}`}>
                                  {currentAccess === 'Full Access' ? (
                                    <Unlock className="h-4 w-4 text-green-600" />
                                  ) : currentAccess === 'Read Only' ? (
                                    <Eye className="h-4 w-4 text-yellow-600" />
                                  ) : (
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent data-testid={`tooltip-access-${integration.id}`}>
                                <div className="space-y-1 text-xs">
                                  <p className="font-medium">Your Access: {currentAccess}</p>
                                  <p className="text-muted-foreground">Full Access: {accessibleRoles['Full Access'].join(', ')}</p>
                                  <p className="text-muted-foreground">Read Only: {accessibleRoles['Read Only'].join(', ')}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {/* Status + enable toggle */}
                            <div className="flex items-center justify-between">
                              {getStatusBadge(integration.status)}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Switch
                                      checked={isEnabled(integration.status)}
                                      onCheckedChange={(checked) => userCanModify && handleToggle(integration, checked)}
                                      disabled={!userCanModify}
                                      data-testid={`switch-integration-${integration.id}`}
                                    />
                                  </span>
                                </TooltipTrigger>
                                {!userCanModify && (
                                  <TooltipContent className="text-xs max-w-[180px]">
                                    <Lock className="h-3 w-3 inline mr-1" />
                                    {currentAccess === 'No Access' ? 'No access' : 'Super Admin / Admin Ops only'}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </div>

                            {/* Error message */}
                            {hasError && integration.errorMessage && (
                              <div className="p-2 bg-destructive/10 rounded-md" data-testid={`error-message-${integration.id}`}>
                                <div className="flex items-start gap-2">
                                  <AlertOctagon className="h-4 w-4 text-destructive mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium text-destructive">Connection Error</p>
                                    <p className="text-xs text-muted-foreground">{integration.errorMessage}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Sync info */}
                            {latestSync && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`sync-info-${integration.id}`}>
                                <RefreshCw className="h-3 w-3" />
                                Last attempt: #{latestSync.attempt} — {latestSync.status}
                              </div>
                            )}
                            {integration.lastSyncAt && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`last-sync-${integration.id}`}>
                                <Clock className="h-3 w-3" />
                                Last sync: {new Date(integration.lastSyncAt).toLocaleString()}
                              </p>
                            )}

                            {/* Auto-Retry status line */}
                            {integration.autoRetry && (
                              <div className="flex items-center gap-1.5 text-xs text-primary font-medium" data-testid={`auto-retry-status-${integration.id}`}>
                                <Repeat className="h-3 w-3" />
                                Auto-retry on · up to {integration.retryLimit} attempt{integration.retryLimit !== 1 ? 's' : ''} · every {
                                  RETRY_INTERVAL_OPTIONS.find(o => o.value === integration.retryIntervalSecs)?.label || `${integration.retryIntervalSecs}s`
                                }
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm" variant="outline"
                                onClick={() => userCanModify && handleConfigure(integration)}
                                disabled={!userCanModify}
                                data-testid={`button-configure-${integration.id}`}
                              >
                                {userCanModify ? <Settings className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                                Configure
                              </Button>
                              {hasError && (
                                <Button
                                  size="sm" variant="default"
                                  onClick={() => userCanModify && handleRetry(integration)}
                                  disabled={!userCanModify}
                                  data-testid={`button-retry-${integration.id}`}
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" /> Retry
                                </Button>
                              )}
                              {isEnabled(integration.status) && (
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => userCanModify && handleSync(integration)}
                                  disabled={!userCanModify}
                                  data-testid={`button-sync-${integration.id}`}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" /> Sync
                                </Button>
                              )}
                            </div>

                            {/* Auto-Retry inline toggle row (Full Access only) */}
                            {userCanModify && (
                              <>
                                <Separator className="my-1" />
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span className="text-xs font-medium">Auto-Retry on Failure</span>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="text-xs max-w-[200px]">
                                          Automatically retries failed connections without manual intervention
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={integration.autoRetry}
                                        onCheckedChange={v => autoRetryMutation.mutate({ id: integration.id, autoRetry: v })}
                                        disabled={autoRetryMutation.isPending}
                                        className="scale-[0.8]"
                                        data-testid={`switch-auto-retry-${integration.id}`}
                                      />
                                      <button
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => setExpandedRetry(expandedRetry === integration.id ? null : integration.id)}
                                        data-testid={`btn-expand-retry-${integration.id}`}
                                      >
                                        {expandedRetry === integration.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Expanded retry config */}
                                  {expandedRetry === integration.id && (
                                    <div className="pl-5 space-y-2 border-l-2 border-primary/20">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-20 flex-shrink-0">Retry limit</span>
                                        <Select
                                          value={String(integration.retryLimit)}
                                          onValueChange={v => updateMutation.mutate({ id: integration.id, data: { retryLimit: Number(v) } })}
                                          data-testid={`select-retry-limit-${integration.id}`}
                                        >
                                          <SelectTrigger className="h-6 text-xs flex-1">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {RETRY_LIMIT_OPTIONS.map(n => (
                                              <SelectItem key={n} value={String(n)}>{n} attempt{n !== 1 ? 's' : ''}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-20 flex-shrink-0">Interval</span>
                                        <Select
                                          value={String(integration.retryIntervalSecs)}
                                          onValueChange={v => updateMutation.mutate({ id: integration.id, data: { retryIntervalSecs: Number(v) } })}
                                          data-testid={`select-retry-interval-${integration.id}`}
                                        >
                                          <SelectTrigger className="h-6 text-xs flex-1">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {RETRY_INTERVAL_OPTIONS.map(o => (
                                              <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="sync-history" className="mt-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={syncFilter} onValueChange={setSyncFilter}>
              <SelectTrigger className="w-[220px]" data-testid="select-sync-filter">
                <SelectValue placeholder="Filter by integration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="sync-filter-all">All Integrations</SelectItem>
                {integrations.map(i => (
                  <SelectItem key={i.id} value={String(i.id)} data-testid={`sync-filter-${i.id}`}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DataTable<IntegrationSyncRun>
            data={filteredSyncRuns}
            columns={syncColumns}
            isLoading={syncRunsLoading}
            emptyMessage="No sync runs recorded yet."
          />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={webhookFilter} onValueChange={setWebhookFilter}>
              <SelectTrigger className="w-[220px]" data-testid="select-webhook-filter">
                <SelectValue placeholder="Filter by integration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="webhook-filter-all">All Integrations</SelectItem>
                {integrations.map(i => (
                  <SelectItem key={i.id} value={String(i.id)} data-testid={`webhook-filter-${i.id}`}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DataTable<IntegrationWebhookEvent>
            data={filteredWebhookEvents}
            columns={webhookColumns}
            isLoading={webhooksLoading}
            emptyMessage="No webhook events recorded yet."
            onRowClick={(event) => setWebhookPayloadDialog(event)}
          />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4 space-y-4">
          {alertsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-alerts">
              No alerts at this time.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAlerts.map(alert => {
                const severityColors: Record<string, string> = {
                  critical: 'border-red-500/50',
                  warning: 'border-yellow-500/50',
                  info: 'border-blue-500/50',
                };
                const severityBadge: Record<string, string> = {
                  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                };
                const statusBadge: Record<string, string> = {
                  active: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                  acknowledged: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                  muted: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                };
                return (
                  <Card key={alert.id} className={`border-l-0 ${severityColors[alert.severity] || ''}`} data-testid={`card-alert-${alert.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={severityBadge[alert.severity] || ''} data-testid={`alert-severity-${alert.id}`}>
                              {alert.severity}
                            </Badge>
                            <Badge className={statusBadge[alert.status] || ''} data-testid={`alert-status-${alert.id}`}>
                              {alert.status}
                            </Badge>
                            <span className="text-sm font-medium" data-testid={`alert-integration-${alert.id}`}>
                              {getIntegrationName(alert.integrationId, integrations)}
                            </span>
                          </div>
                          <p className="text-sm font-medium" data-testid={`alert-condition-${alert.id}`}>{alert.condition}</p>
                          <p className="text-sm text-muted-foreground" data-testid={`alert-message-${alert.id}`}>{alert.message}</p>
                          {alert.lastTriggeredAt && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`alert-triggered-${alert.id}`}>
                              <Clock className="h-3 w-3" />
                              Last triggered: {new Date(alert.lastTriggeredAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {alert.status === 'active' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => alertMutation.mutate({
                                  id: alert.id,
                                  data: { status: 'acknowledged', acknowledgedBy: 'current-user', acknowledgedAt: new Date() },
                                })}
                                disabled={alertMutation.isPending}
                                data-testid={`button-acknowledge-${alert.id}`}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Acknowledge
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => alertMutation.mutate({
                                  id: alert.id,
                                  data: { status: 'resolved', resolvedAt: new Date() },
                                })}
                                disabled={alertMutation.isPending}
                                data-testid={`button-resolve-${alert.id}`}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => alertMutation.mutate({
                                  id: alert.id,
                                  data: { status: 'muted' },
                                })}
                                disabled={alertMutation.isPending}
                                data-testid={`button-mute-${alert.id}`}
                              >
                                <VolumeX className="h-3 w-3 mr-1" />
                                Mute
                              </Button>
                            </>
                          )}
                          {alert.status === 'acknowledged' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => alertMutation.mutate({
                                id: alert.id,
                                data: { status: 'resolved', resolvedAt: new Date() },
                              })}
                              disabled={alertMutation.isPending}
                              data-testid={`button-resolve-${alert.id}`}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="access-control" className="mt-4 space-y-6">
          {/* Current user access highlight */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Your Access Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                  currentAccess === 'Full Access' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                  currentAccess === 'Read Only' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' :
                  'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                }`} data-testid="text-current-user-access">
                  {currentAccess === 'Full Access' ? <ShieldCheck className="h-3.5 w-3.5 inline mr-1.5" /> :
                   currentAccess === 'Read Only' ? <Eye className="h-3.5 w-3.5 inline mr-1.5" /> :
                   <Ban className="h-3.5 w-3.5 inline mr-1.5" />}
                  {currentAccess}
                </div>
                <span className="text-sm text-muted-foreground">Role: <span className="font-medium text-foreground">{getUserRole() || 'Unknown'}</span></span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {currentAccess === 'Full Access'
                  ? 'You can manage all integrations, configure connections, set auto-retry policies, and adjust access control settings.'
                  : currentAccess === 'Read Only'
                  ? 'You can view integration status, sync logs, webhook events, and alerts — but cannot modify settings or trigger actions.'
                  : 'You do not have access to the Integrations module. Contact your Super Admin for access.'}
              </p>
            </CardContent>
          </Card>

          {/* Super Admin-only operations */}
          {userIsSuperAdmin && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  Super Admin — Restricted Operations
                </CardTitle>
                <CardDescription className="text-xs">These operations are exclusive to Super Admin and cannot be performed by any other role, including Admin Ops.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  {['Delete or archive integrations permanently', 'Modify the RBAC matrix for this module', 'Grant or revoke access for Admin Ops users', 'View raw API credentials in configure dialog', 'Reset webhook secrets and tokens'].map(op => (
                    <li key={op} className="flex items-center gap-2 text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                      {op}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Full RBAC matrix */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role Permission Matrix
              </CardTitle>
              <CardDescription className="text-xs">Access levels for all roles across the Integrations module.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="table-rbac-matrix">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-44">Role</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Access Level</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Configure</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Toggle</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Retry</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">View Logs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RBAC_MATRIX.map((row, i) => {
                      const isCurrentUser = row.role === getUserRole();
                      return (
                        <tr
                          key={row.role}
                          className={`border-b last:border-0 transition-colors ${isCurrentUser ? 'bg-primary/5 font-semibold' : i % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}`}
                          data-testid={`row-rbac-${row.role.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <td className="px-4 py-2.5 flex items-center gap-1.5">
                            {isCurrentUser && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                            {row.superAdminOnly && <ShieldAlert className="h-3 w-3 text-amber-500" />}
                            {row.role}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              row.level === 'Full Access' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              row.level === 'Read Only' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>{row.level}</span>
                          </td>
                          {(['canConfigure', 'canToggle', 'canRetry', 'canViewLogs'] as const).map(cap => (
                            <td key={cap} className="px-3 py-2.5 text-center">
                              {row[cap]
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mx-auto" />
                                : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Integration</DialogTitle>
            <DialogDescription>
              Select an integration to configure
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            {integrationPresets.map(preset => {
              const Icon = typeIcons[preset.type] || Plug;
              const exists = integrations.some(i => i.name === preset.name);
              return (
                <Button
                  key={preset.name}
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  disabled={exists}
                  onClick={() => handleSelectPreset(preset)}
                  data-testid={`button-add-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{preset.type}</div>
                  </div>
                  {exists && <Badge variant="secondary" className="ml-auto">Configured</Badge>}
                </Button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-cancel-add">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={configDialogOpen} onOpenChange={(open) => { setConfigDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {formState.name || 'Integration'}</DialogTitle>
            <DialogDescription>
              Enter your API credentials to connect this service
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {getFieldsForIntegration(formState.name).map(field => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>{fieldLabels[field] || field}</Label>
                {field === 'privateKey' ? (
                  <textarea
                    id={field}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={String(formState[field] || '')}
                    onChange={(e) => setFormState(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={fieldPlaceholders[field]}
                    data-testid={`input-${field}`}
                  />
                ) : (
                  <Input
                    id={field}
                    type={field.toLowerCase().includes('key') || field.toLowerCase().includes('secret') || field.toLowerCase().includes('password') || field.toLowerCase().includes('token') ? 'password' : 'text'}
                    value={String(formState[field] || '')}
                    onChange={(e) => setFormState(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={fieldPlaceholders[field]}
                    data-testid={`input-${field}`}
                  />
                )}
              </div>
            ))}
          </div>

          <Separator />
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Auto-Retry Settings</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="text-xs max-w-[220px]">
                  Automatically retries failed sync or connection attempts on your behalf — no manual intervention needed.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-retry-toggle" className="text-sm text-muted-foreground">Enable Auto-Retry on Failure</Label>
              <Switch
                id="auto-retry-toggle"
                checked={formState.autoRetry as boolean}
                onCheckedChange={v => setFormState(prev => ({ ...prev, autoRetry: v }))}
                data-testid="switch-dialog-auto-retry"
              />
            </div>
            {formState.autoRetry && (
              <div className="grid grid-cols-2 gap-4 pl-1">
                <div className="space-y-1">
                  <Label htmlFor="retry-limit" className="text-xs text-muted-foreground">Max Attempts</Label>
                  <Select
                    value={String(formState.retryLimit)}
                    onValueChange={v => setFormState(prev => ({ ...prev, retryLimit: Number(v) }))}
                  >
                    <SelectTrigger id="retry-limit" className="h-8 text-xs" data-testid="select-dialog-retry-limit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RETRY_LIMIT_OPTIONS.map(n => (
                        <SelectItem key={n} value={String(n)}>{n} attempt{n !== 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="retry-interval" className="text-xs text-muted-foreground">Retry Interval</Label>
                  <Select
                    value={String(formState.retryIntervalSecs)}
                    onValueChange={v => setFormState(prev => ({ ...prev, retryIntervalSecs: Number(v) }))}
                  >
                    <SelectTrigger id="retry-interval" className="h-8 text-xs" data-testid="select-dialog-retry-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RETRY_INTERVAL_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)} data-testid="button-cancel">Cancel</Button>
            <Button
              onClick={handleSaveIntegration}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-integration"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save & Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!webhookPayloadDialog} onOpenChange={(open) => { if (!open) setWebhookPayloadDialog(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Webhook Event Payload</DialogTitle>
            <DialogDescription>
              {webhookPayloadDialog ? `${webhookPayloadDialog.eventType} - ${getIntegrationName(webhookPayloadDialog.integrationId, integrations)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-[400px]" data-testid="webhook-payload-json">
              {webhookPayloadDialog?.payload ? JSON.stringify(webhookPayloadDialog.payload, null, 2) : 'No payload data'}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookPayloadDialog(null)} data-testid="button-close-payload">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
