import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { CreateEditDrawer } from '@/components/shared/CreateEditDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Shield, Users, Loader2, Phone, MessageCircle, Lock, FileText, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { DataMaskingRule, MaskedDataAccessLog, Doctor } from '@shared/schema';

const entities = ['Doctor', 'Pharmacy', 'Lead', 'Employee', 'Order', 'Invoice'];
const maskTypes = ['full', 'partial', 'hash'];
const allRoles = ['Super Admin', 'Admin Ops', 'Warehouse Manager', 'Warehouse Staff', 'Logistics Manager', 'Finance Manager', 'Finance Staff', 'HR/Compliance', 'Analytics Viewer'];

interface MaskedQuickAction {
  entityType: string;
  entityId: string;
  fieldName: string;
  maskedValue: string;
  originalValue: string;
}

export default function DataMasking() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DataMaskingRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<DataMaskingRule | null>(null);
  const [activeTab, setActiveTab] = useState('rules');
  const [quickActionDialogOpen, setQuickActionDialogOpen] = useState(false);
  const [quickActionData, setQuickActionData] = useState<MaskedQuickAction | null>(null);
  const [quickActionType, setQuickActionType] = useState<'click-to-call' | 'whatsapp' | 'view'>('view');

  const { data: rules = [], isLoading } = useQuery<DataMaskingRule[]>({
    queryKey: ['/api/data-masking-rules'],
  });

  const { data: maskedLogs = [] } = useQuery<MaskedDataAccessLog[]>({
    queryKey: ['/api/masked-data-access-logs'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<DataMaskingRule>) =>
      apiRequest('POST', '/api/data-masking-rules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-masking-rules'] });
      toast({ title: 'Success', description: 'Masking rule created.' });
      setDrawerOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DataMaskingRule> }) =>
      apiRequest('PATCH', `/api/data-masking-rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-masking-rules'] });
      toast({ title: 'Success', description: 'Masking rule updated.' });
      setDrawerOpen(false);
      setEditingRule(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/data-masking-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-masking-rules'] });
      toast({ title: 'Success', description: 'Masking rule deleted.' });
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    },
  });

  const logMaskedAccessMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest('POST', '/api/masked-data-access-logs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/masked-data-access-logs'] });
    },
  });

  const handleQuickAction = (action: 'click-to-call' | 'whatsapp' | 'view', data: MaskedQuickAction) => {
    setQuickActionData(data);
    setQuickActionType(action);
    setQuickActionDialogOpen(true);
  };

  const confirmQuickAction = () => {
    if (!quickActionData) return;

    logMaskedAccessMutation.mutate({
      action: quickActionType,
      fieldName: quickActionData.fieldName,
      entityType: quickActionData.entityType,
      entityId: quickActionData.entityId,
      userEmail: user?.email || 'unknown',
      maskedValue: quickActionData.maskedValue,
      accessReason: `${quickActionType} action on ${quickActionData.fieldName}`,
    });

    if (quickActionType === 'click-to-call') {
      toast({ title: 'Call Initiated', description: `Calling ${quickActionData.maskedValue}... (action logged)` });
    } else if (quickActionType === 'whatsapp') {
      toast({ title: 'WhatsApp Opened', description: `Opening WhatsApp for ${quickActionData.maskedValue}... (action logged)` });
    } else {
      toast({ title: 'Data Revealed', description: `Revealed value for ${quickActionData.fieldName} (action logged)` });
    }

    setQuickActionDialogOpen(false);
    setQuickActionData(null);
  };

  const maskPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) return phone;
    return digits.substring(0, 2) + 'XX XXX ' + digits.slice(-3);
  };

  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    return local.substring(0, 2) + '***@' + domain;
  };

  const maskedContacts: MaskedQuickAction[] = doctors
    .filter(d => d.phone || d.email)
    .slice(0, 8)
    .flatMap(d => {
      const contacts: MaskedQuickAction[] = [];
      if (d.phone) {
        contacts.push({
          entityType: 'Doctor',
          entityId: d.code,
          fieldName: 'phone',
          maskedValue: maskPhone(d.phone),
          originalValue: d.phone,
        });
      }
      if (d.email) {
        contacts.push({
          entityType: 'Doctor',
          entityId: d.code,
          fieldName: 'email',
          maskedValue: maskEmail(d.email),
          originalValue: d.email,
        });
      }
      return contacts;
    })
    .slice(0, 6);

  const columns: Column<DataMaskingRule>[] = [
    { key: 'fieldName', header: 'Field Name', render: (rule) => (
      <div className="flex items-center gap-2">
        {rule.isActive ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
        <span className="font-medium">{rule.fieldName}</span>
      </div>
    )},
    { key: 'entity', header: 'Entity', render: (rule) => <Badge variant="outline">{rule.entity}</Badge> },
    { key: 'maskType', header: 'Mask Type', render: (rule) => (
      <Badge variant={rule.maskType === 'full' ? 'destructive' : rule.maskType === 'partial' ? 'default' : 'secondary'}>
        {rule.maskType}
      </Badge>
    )},
    { key: 'roles', header: 'Applied To', render: (rule) => (
      <div className="flex items-center gap-1">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{rule.roles?.length || 0} roles</span>
      </div>
    )},
    { key: 'isActive', header: 'Status', render: (rule) => (
      <Switch
        checked={rule.isActive}
        onCheckedChange={(checked) => updateMutation.mutate({ id: rule.id, data: { isActive: checked } })}
        data-testid={`switch-rule-${rule.id}`}
      />
    )},
  ];

  const maskedLogColumns: Column<MaskedDataAccessLog>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs">
          {new Date(row.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      )
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <Badge variant={row.action === 'click-to-call' ? 'default' : row.action === 'whatsapp' ? 'secondary' : 'outline'}>
          {row.action === 'click-to-call' && <Phone className="h-3 w-3 mr-1" />}
          {row.action === 'whatsapp' && <MessageCircle className="h-3 w-3 mr-1" />}
          {row.action === 'view' && <Eye className="h-3 w-3 mr-1" />}
          {row.action}
        </Badge>
      )
    },
    {
      key: 'entityType',
      header: 'Entity',
      render: (row) => (
        <div>
          <span className="capitalize font-medium">{row.entityType}</span>
          <span className="text-muted-foreground text-xs ml-1">({row.entityId})</span>
        </div>
      )
    },
    { key: 'fieldName', header: 'Field', render: (row) => <span className="font-mono text-sm">{row.fieldName}</span> },
    { key: 'userEmail', header: 'User', render: (row) => <span className="text-sm">{row.userEmail}</span> },
    {
      key: 'ipAddress',
      header: 'IP',
      render: (row) => (
        <div className="text-xs">
          <span className="font-mono">{row.ipAddress || '—'}</span>
          {row.geoLocation && <span className="text-muted-foreground ml-1">({row.geoLocation})</span>}
        </div>
      )
    },
  ];

  const handleSubmit = (data: Record<string, unknown>) => {
    const ruleData = {
      fieldName: data.fieldName as string,
      entity: data.entity as string,
      maskType: data.maskType as 'full' | 'partial' | 'hash',
      roles: (data.roles as string[]) || [],
      description: data.description as string,
      isActive: true,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: ruleData });
    } else {
      createMutation.mutate(ruleData);
    }
  };

  const handleEdit = (rule: DataMaskingRule) => {
    setEditingRule(rule);
    setDrawerOpen(true);
  };

  const handleDelete = (rule: DataMaskingRule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeRules = rules.filter(r => r.isActive).length;
  const callActions = maskedLogs.filter(l => l.action === 'click-to-call').length;
  const whatsappActions = maskedLogs.filter(l => l.action === 'whatsapp').length;
  const totalActions = maskedLogs.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Data Masking & Quick Actions"
        description="Configure field-level data masking and track masked data interactions"
        actions={
          <Button onClick={() => { setEditingRule(null); setDrawerOpen(true); }} data-testid="button-add-rule">
            <Shield className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Rules" value={activeRules} icon={<Shield className="h-5 w-5" />} />
        <StatCard title="Call Actions" value={callActions} icon={<Phone className="h-5 w-5" />} />
        <StatCard title="WhatsApp Actions" value={whatsappActions} icon={<MessageCircle className="h-5 w-5" />} />
        <StatCard title="Total Actions" value={totalActions} icon={<FileText className="h-5 w-5" />} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-masking">
          <TabsTrigger value="rules" data-testid="tab-rules">
            <Shield className="h-4 w-4 mr-1" />
            Masking Rules
          </TabsTrigger>
          <TabsTrigger value="actions" data-testid="tab-actions">
            <Phone className="h-4 w-4 mr-1" />
            Quick Actions
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-action-logs">
            <FileText className="h-4 w-4 mr-1" />
            Action Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <DataTable
            data={rules}
            columns={columns}
            onRowClick={handleEdit}
            emptyMessage="No masking rules configured"
          />
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Masked Data Quick Actions</CardTitle>
              <CardDescription>Click-to-call and WhatsApp actions on masked data fields. All actions are logged for compliance.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {maskedContacts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No doctor contacts available. Add doctors with phone numbers to see masked quick actions.</p>
                )}
                {maskedContacts.map((contact, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg border"
                    data-testid={`masked-contact-${idx}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{contact.entityType}</Badge>
                          <span className="font-mono text-xs text-muted-foreground">{contact.entityId}</span>
                        </div>
                        <p className="text-sm mt-1">
                          <span className="text-muted-foreground">{contact.fieldName}:</span>
                          <span className="font-mono ml-2">{contact.maskedValue}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction('view', contact)}
                        data-testid={`button-reveal-${idx}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Reveal
                      </Button>
                      {contact.fieldName === 'phone' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction('click-to-call', contact)}
                            data-testid={`button-call-${idx}`}
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            Call
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction('whatsapp', contact)}
                            data-testid={`button-whatsapp-${idx}`}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Masked Data Access Audit Trail</CardTitle>
              <CardDescription>Complete log of all interactions with masked data including reveals, calls, and messages</CardDescription>
            </CardHeader>
            <CardContent>
              {maskedLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-4" />
                  <p>No masked data access actions recorded yet</p>
                  <p className="text-sm mt-1">Actions will appear here when users interact with masked data</p>
                </div>
              ) : (
                <DataTable columns={maskedLogColumns} data={maskedLogs} emptyMessage="No access logs" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={quickActionDialogOpen} onOpenChange={setQuickActionDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {quickActionType === 'click-to-call' && (
                <>
                  <Phone className="h-5 w-5" />
                  Confirm Call
                </>
              )}
              {quickActionType === 'whatsapp' && (
                <>
                  <MessageCircle className="h-5 w-5" />
                  Confirm WhatsApp
                </>
              )}
              {quickActionType === 'view' && (
                <>
                  <Eye className="h-5 w-5" />
                  Reveal Masked Data
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {quickActionData && (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{quickActionData.entityType}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">{quickActionData.entityId}</span>
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">{quickActionData.fieldName}:</span>
                  <span className="font-mono ml-2">{quickActionData.maskedValue}</span>
                </p>
              </div>
              <div className="p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  This action will be logged for compliance and audit purposes.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickActionDialogOpen(false)} data-testid="button-cancel-action">
              Cancel
            </Button>
            <Button onClick={confirmQuickAction} disabled={logMaskedAccessMutation.isPending} data-testid="button-confirm-action">
              {quickActionType === 'click-to-call' && 'Call Now'}
              {quickActionType === 'whatsapp' && 'Open WhatsApp'}
              {quickActionType === 'view' && 'Reveal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateEditDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingRule ? 'Edit Masking Rule' : 'Add Masking Rule'}
        fields={[
          { name: 'fieldName', label: 'Field Name', type: 'text', required: true },
          { name: 'entity', label: 'Entity', type: 'select', options: entities.map(e => ({ value: e, label: e })), required: true },
          { name: 'maskType', label: 'Mask Type', type: 'select', options: maskTypes.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })), required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
        ]}
        initialData={editingRule ? {
          fieldName: editingRule.fieldName,
          entity: editingRule.entity,
          maskType: editingRule.maskType,
          description: editingRule.description || '',
        } : undefined}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Masking Rule"
        description={`Are you sure you want to delete the masking rule for "${ruleToDelete?.fieldName}"?`}
        onConfirm={() => ruleToDelete && deleteMutation.mutate(ruleToDelete.id)}
        destructive
      />
    </div>
  );
}
