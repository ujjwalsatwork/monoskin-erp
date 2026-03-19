import { useState, Fragment } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill } from '@/components/shared/StatusPill';
import { CreateEditDrawer, FormField } from '@/components/shared/CreateEditDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Shield, Users, Key, Edit, Trash2, Check, X, Grid, History, UserX, UserCheck, Lock, ShieldCheck, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { User, LoginHistory, RoleTemplate, ModulePermission } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';

interface RoleTemplateEnriched extends RoleTemplate {
  userCount: number;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

const ALL_MODULES: { key: string; label: string; category: string }[] = [
  { key: 'dashboard', label: 'Dashboard', category: 'Core' },
  { key: 'approvals', label: 'Approvals', category: 'Core' },
  { key: 'leads', label: 'Leads & CRM', category: 'Sales' },
  { key: 'mr_management', label: 'MR Management', category: 'Sales' },
  { key: 'doctors_pharmacies', label: 'Doctors & Pharmacies', category: 'Sales' },
  { key: 'orders', label: 'Orders', category: 'Operations' },
  { key: 'inventory', label: 'Inventory', category: 'Operations' },
  { key: 'warehouses', label: 'Warehouses', category: 'Operations' },
  { key: 'products', label: 'Products & Pricing', category: 'Operations' },
  { key: 'logistics', label: 'Logistics & Shipments', category: 'Operations' },
  { key: 'finance', label: 'Finance', category: 'Finance' },
  { key: 'hr_compliance', label: 'HR & Compliance', category: 'HR' },
  { key: 'reports', label: 'Reports & Analytics', category: 'Analytics' },
  { key: 'security', label: 'Security & Audit', category: 'System' },
  { key: 'master_data', label: 'Master Data', category: 'System' },
];

const MODULE_CATEGORIES = ['Core', 'Sales', 'Operations', 'Finance', 'HR', 'Analytics', 'System'];

const roles: Role[] = [
  { id: '1', name: 'Super Admin', description: 'Full system access', permissions: ['all'], userCount: 1 },
  { id: '2', name: 'Admin Ops', description: 'Operations management', permissions: ['orders', 'inventory', 'reports'], userCount: 2 },
  { id: '3', name: 'Warehouse Manager', description: 'Warehouse operations', permissions: ['inventory', 'grn', 'transfers', 'shipments'], userCount: 3 },
  { id: '4', name: 'Warehouse Staff', description: 'Basic warehouse tasks', permissions: ['inventory.view', 'shipments.view'], userCount: 5 },
  { id: '5', name: 'Finance Manager', description: 'Financial operations', permissions: ['finance', 'invoices', 'receipts', 'reports'], userCount: 2 },
  { id: '6', name: 'Finance Staff', description: 'Basic finance tasks', permissions: ['invoices.view', 'receipts.create'], userCount: 3 },
  { id: '7', name: 'HR/Compliance', description: 'HR and compliance', permissions: ['employees', 'compliance', 'audit-logs'], userCount: 1 },
  { id: '8', name: 'Analytics Viewer', description: 'View-only analytics', permissions: ['reports.view', 'analytics.view'], userCount: 4 },
];

const featureGroups = [
  { name: 'Dashboard', features: ['view'] },
  { name: 'Leads', features: ['view', 'create', 'edit', 'delete'] },
  { name: 'Orders', features: ['view', 'create', 'edit', 'approve'] },
  { name: 'Inventory', features: ['view', 'adjust', 'transfer'] },
  { name: 'Invoices', features: ['view', 'create', 'edit', 'delete'] },
  { name: 'Receipts', features: ['view', 'create', 'allocate'] },
  { name: 'Employees', features: ['view', 'create', 'edit', 'delete'] },
  { name: 'Compliance', features: ['view', 'create', 'edit', 'delete'] },
  { name: 'Reports', features: ['view', 'export'] },
  { name: 'Audit Logs', features: ['view', 'export'] },
  { name: 'Users', features: ['view', 'create', 'edit', 'delete'] },
  { name: 'Integrations', features: ['view', 'configure'] },
];

const rolePermissionMatrix: Record<string, Record<string, string[]>> = {
  'Super Admin': Object.fromEntries(featureGroups.map(fg => [fg.name, fg.features])),
  'Admin Ops': { 'Dashboard': ['view'], 'Leads': ['view', 'create', 'edit'], 'Orders': ['view', 'create', 'edit', 'approve'], 'Inventory': ['view', 'adjust'], 'Reports': ['view', 'export'] },
  'Warehouse Manager': { 'Dashboard': ['view'], 'Inventory': ['view', 'adjust', 'transfer'], 'Orders': ['view'] },
  'Warehouse Staff': { 'Dashboard': ['view'], 'Inventory': ['view'], 'Orders': ['view'] },
  'Finance Manager': { 'Dashboard': ['view'], 'Invoices': ['view', 'create', 'edit', 'delete'], 'Receipts': ['view', 'create', 'allocate'], 'Reports': ['view', 'export'] },
  'Finance Staff': { 'Dashboard': ['view'], 'Invoices': ['view', 'create'], 'Receipts': ['view', 'create'] },
  'HR/Compliance': { 'Dashboard': ['view'], 'Employees': ['view', 'create', 'edit', 'delete'], 'Compliance': ['view', 'create', 'edit', 'delete'], 'Audit Logs': ['view'] },
  'Analytics Viewer': { 'Dashboard': ['view'], 'Reports': ['view', 'export'] },
};

const featureCategories: Record<string, string[]> = {
  'CRM': ['Dashboard', 'Leads'],
  'Operations': ['Orders', 'Inventory'],
  'Finance': ['Invoices', 'Receipts'],
  'HR & Compliance': ['Employees', 'Compliance'],
  'System': ['Reports', 'Audit Logs', 'Users', 'Integrations'],
};

const loginStatusStyles: Record<string, { label: string; className: string }> = {
  'success': { label: 'Success', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  'failed': { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  'blocked': { label: 'Blocked', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  'expired': { label: 'Expired', className: 'bg-muted text-muted-foreground' },
};

const CRUD_COLS = ['canRead', 'canCreate', 'canUpdate', 'canDelete'] as const;
const CRUD_LABELS: Record<string, string> = { canRead: 'Read', canCreate: 'Create', canUpdate: 'Update', canDelete: 'Delete' };

function defaultModules(): ModulePermission[] {
  return ALL_MODULES.map(m => ({ module: m.key, canRead: false, canCreate: false, canUpdate: false, canDelete: false }));
}

interface RoleTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  template?: RoleTemplateEnriched | null;
  users: User[];
}

function RoleTemplateDialog({ open, onClose, template, users }: RoleTemplateDialogProps) {
  const { toast } = useToast();
  const isEdit = !!template;

  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [modules, setModules] = useState<ModulePermission[]>(() => {
    if (template?.modules && Array.isArray(template.modules) && template.modules.length > 0) {
      const existing = template.modules as ModulePermission[];
      return ALL_MODULES.map(m => {
        const found = existing.find(e => e.module === m.key);
        return found || { module: m.key, canRead: false, canCreate: false, canUpdate: false, canDelete: false };
      });
    }
    return defaultModules();
  });

  const [assignUserId, setAssignUserId] = useState<string>('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: name.trim(), description: description.trim() || null, modules, isActive };
      if (isEdit) {
        await apiRequest('PATCH', `/api/role-templates/${template!.id}`, payload);
      } else {
        await apiRequest('POST', '/api/role-templates', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/role-templates'] });
      toast({ title: isEdit ? 'Role Template Updated' : 'Role Template Created' });
      onClose();
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ userId, roleTemplateId }: { userId: number; roleTemplateId: number | null }) => {
      await apiRequest('PATCH', `/api/users/${userId}/assign-role-template`, { roleTemplateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/role-templates'] });
      toast({ title: 'User assigned to role template' });
      setAssignUserId('');
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const togglePerm = (moduleKey: string, col: typeof CRUD_COLS[number]) => {
    setModules(prev => prev.map(m => {
      if (m.module !== moduleKey) return m;
      const updated = { ...m, [col]: !m[col] };
      if (col === 'canRead' && !updated.canRead) {
        updated.canCreate = false;
        updated.canUpdate = false;
        updated.canDelete = false;
      }
      if (col !== 'canRead' && updated[col]) {
        updated.canRead = true;
      }
      return updated;
    }));
  };

  const toggleCategory = (category: string, col: typeof CRUD_COLS[number], value: boolean) => {
    const catModules = ALL_MODULES.filter(m => m.category === category).map(m => m.key);
    setModules(prev => prev.map(m => {
      if (!catModules.includes(m.module)) return m;
      const updated = { ...m, [col]: value };
      if (col === 'canRead' && !value) {
        updated.canCreate = false;
        updated.canUpdate = false;
        updated.canDelete = false;
      }
      if (col !== 'canRead' && value) updated.canRead = true;
      return updated;
    }));
  };

  const assignedUsers = users.filter(u => u.roleTemplateId === template?.id);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {isEdit ? 'Edit Role Template' : 'Create Role Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Role Name <span className="text-destructive">*</span></Label>
              <Input id="tpl-name" placeholder="e.g., Field MR, Regional Manager" value={name} onChange={e => setName(e.target.value)} data-testid="input-role-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-desc">Description</Label>
              <Input id="tpl-desc" placeholder="Brief description of this role" value={description} onChange={e => setDescription(e.target.value)} data-testid="input-role-desc" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="tpl-active" checked={isActive} onCheckedChange={setIsActive} data-testid="switch-role-active" />
            <Label htmlFor="tpl-active" className="cursor-pointer">Active (users can be assigned to this role)</Label>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Module Permissions
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Module</th>
                    {CRUD_COLS.map(col => (
                      <th key={col} className="text-center p-3 font-medium text-muted-foreground w-20">{CRUD_LABELS[col]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULE_CATEGORIES.map(cat => {
                    const catMods = ALL_MODULES.filter(m => m.category === cat);
                    return (
                      <Fragment key={cat}>
                        <tr className="bg-muted/20 border-y">
                          <td colSpan={5} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</td>
                        </tr>
                        {catMods.map((mod, idx) => {
                          const perms = modules.find(m => m.module === mod.key) || { module: mod.key, canRead: false, canCreate: false, canUpdate: false, canDelete: false };
                          return (
                            <tr key={mod.key} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                              <td className="px-3 py-2 font-medium">{mod.label}</td>
                              {CRUD_COLS.map(col => (
                                <td key={col} className="text-center px-3 py-2">
                                  <Checkbox
                                    checked={!!perms[col]}
                                    onCheckedChange={() => togglePerm(mod.key, col)}
                                    disabled={col !== 'canRead' && !perms.canRead}
                                    data-testid={`checkbox-perm-${mod.key}-${col}`}
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note: Create, Update, Delete require Read access. Enabling them automatically enables Read.
            </p>
          </div>

          {isEdit && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Assign Users to this Role Template
              </h3>
              <div className="flex gap-2">
                <Select value={assignUserId} onValueChange={setAssignUserId}>
                  <SelectTrigger className="flex-1" data-testid="select-assign-user">
                    <SelectValue placeholder="Select a user to assign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.roleTemplateId !== template?.id).map(u => (
                      <SelectItem key={u.id} value={String(u.id)} data-testid={`option-user-${u.id}`}>
                        {u.name} ({u.email}) — {u.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => assignUserId && assignMutation.mutate({ userId: parseInt(assignUserId), roleTemplateId: template!.id })}
                  disabled={!assignUserId || assignMutation.isPending}
                  data-testid="button-assign-user"
                >
                  Assign
                </Button>
              </div>
              {assignedUsers.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Currently assigned ({assignedUsers.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {assignedUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-1 bg-background border rounded-full px-3 py-1 text-xs">
                        <span>{u.name}</span>
                        <button
                          className="ml-1 text-muted-foreground hover:text-destructive"
                          onClick={() => assignMutation.mutate({ userId: u.id, roleTemplateId: null })}
                          data-testid={`button-unassign-user-${u.id}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-template">Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!name.trim() || saveMutation.isPending}
            data-testid="button-save-template"
          >
            {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersRoles() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'Super Admin';

  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [loginHistoryFilter, setLoginHistoryFilter] = useState<string>('all');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RoleTemplateEnriched | null>(null);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<RoleTemplateEnriched | null>(null);
  const [showDeleteTemplateDialog, setShowDeleteTemplateDialog] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: loginHistoryData = [], isLoading: isLoginHistoryLoading } = useQuery<LoginHistory[]>({
    queryKey: ['/api/login-history'],
  });

  const { data: roleTemplates = [], isLoading: isTemplatesLoading } = useQuery<RoleTemplateEnriched[]>({
    queryKey: ['/api/role-templates'],
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('POST', '/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'User Created' });
      setIsUserDrawerOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create user', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest('PATCH', `/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'User Updated' });
      setIsUserDrawerOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest('PATCH', `/api/users/${id}`, { isActive }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: variables.isActive ? 'User Reactivated' : 'User Deactivated' });
      setShowDeactivateDialog(false);
      setDeactivateUser(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update user status', variant: 'destructive' });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/role-templates/${id}`);
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/role-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'Role Template Deleted' });
      setShowDeleteTemplateDialog(false);
      setDeleteTemplateTarget(null);
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' }),
  });

  const userFormFields: FormField[] = [
    { name: 'username', label: 'Username', type: 'text', required: true },
    { name: 'name', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'password', label: 'Password', type: 'text', required: !selectedUser },
    { name: 'role', label: 'Role', type: 'select', required: true, options: roles.map(r => ({ value: r.name, label: r.name })) },
    { name: 'isActive', label: 'Active', type: 'select', options: [
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' },
    ]},
  ];

  const userColumns: Column<User>[] = [
    { key: 'username', header: 'Username', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (item) => (
      <div className="flex items-center gap-2">
        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded" data-testid={`text-role-${item.id}`}>{item.role}</span>
        {item.roleTemplateId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs border-purple-400 text-purple-600 dark:text-purple-400" data-testid={`badge-custom-role-${item.id}`}>
                <ShieldCheck className="h-3 w-3 mr-1" />
                Custom
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {roleTemplates.find(t => t.id === item.roleTemplateId)?.name ?? 'Custom role template assigned'}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    )},
    { key: 'isActive', header: 'Status', render: (item) => <StatusPill status={item.isActive ? 'Active' : 'Inactive'} /> },
    { key: 'lastLoginAt', header: 'Last Login', render: (item) => item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : '-' },
    { key: 'actions', header: '', render: (item) => (
      <div className="flex gap-2">
        <Button size="icon" variant="ghost" onClick={() => { setSelectedUser(item); setIsUserDrawerOpen(true); }} data-testid={`button-edit-user-${item.id}`}>
          <Edit className="h-4 w-4" />
        </Button>
        {item.isActive ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setDeactivateUser(item); setShowDeactivateDialog(true); }}
                data-testid={`button-deactivate-user-${item.id}`}
              >
                <UserX className="h-4 w-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Deactivate user</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setDeactivateUser(item); setShowDeactivateDialog(true); }}
                data-testid={`button-reactivate-user-${item.id}`}
              >
                <UserCheck className="h-4 w-4 text-success" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reactivate user</TooltipContent>
          </Tooltip>
        )}
      </div>
    )},
  ];

  const roleColumns: Column<Role>[] = [
    { key: 'name', header: 'Role Name' },
    { key: 'description', header: 'Description' },
    { key: 'permissions', header: 'Permissions', render: (item) => (
      <div className="flex flex-wrap gap-1">
        {item.permissions.slice(0, 3).map((p, i) => (
          <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
        ))}
        {item.permissions.length > 3 && <Badge variant="outline" className="text-xs">+{item.permissions.length - 3}</Badge>}
      </div>
    )},
    { key: 'userCount', header: 'Users', render: (item) => <span className="font-medium">{item.userCount}</span> },
  ];

  const filteredLoginHistory = loginHistoryFilter === 'all'
    ? loginHistoryData
    : loginHistoryData.filter(lh => lh.userEmail === loginHistoryFilter);

  const loginHistoryColumns: Column<LoginHistory>[] = [
    { key: 'userEmail', header: 'User Email', render: (item) => (
      <span data-testid={`text-login-email-${item.id}`}>{item.userEmail}</span>
    )},
    { key: 'ipAddress', header: 'IP Address', render: (item) => (
      <span className="font-mono text-xs" data-testid={`text-login-ip-${item.id}`}>{item.ipAddress || '-'}</span>
    )},
    { key: 'userAgent', header: 'User Agent', render: (item) => (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-muted-foreground max-w-[200px] truncate block cursor-default" data-testid={`text-login-ua-${item.id}`}>
            {item.userAgent ? (item.userAgent.length > 50 ? item.userAgent.substring(0, 50) + '...' : item.userAgent) : '-'}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p className="text-xs break-all">{item.userAgent || 'N/A'}</p>
        </TooltipContent>
      </Tooltip>
    )},
    { key: 'status', header: 'Status', render: (item) => (
      <Badge variant="secondary" className={loginStatusStyles[item.status]?.className || ''}>
        {loginStatusStyles[item.status]?.label || item.status}
      </Badge>
    )},
    { key: 'geoLocation', header: 'Location', render: (item) => (
      <span data-testid={`text-login-location-${item.id}`}>{item.geoLocation || '-'}</span>
    )},
    { key: 'createdAt', header: 'Date/Time', render: (item) => (
      <span className="text-xs" data-testid={`text-login-date-${item.id}`}>
        {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
      </span>
    )},
  ];

  const stats = [
    { title: 'Total Users', value: users.length.toString(), subtitle: 'Active accounts', color: 'blue' as const },
    { title: 'Active', value: users.filter(u => u.isActive).length.toString(), subtitle: 'Currently active', color: 'green' as const },
    { title: 'System Roles', value: roles.length.toString(), subtitle: 'Built-in roles', color: 'purple' as const },
    { title: 'Custom Templates', value: roleTemplates.length.toString(), subtitle: 'Role templates', color: 'yellow' as const },
  ];

  const handleUserSubmit = (data: Record<string, unknown>) => {
    const payload = {
      ...data,
      isActive: data.isActive === 'true' || data.isActive === true,
    };
    
    if (selectedUser) {
      const updatePayload: Record<string, unknown> = { ...payload };
      if (!data.password || (data.password as string).trim() === '') {
        delete updatePayload['password'];
      }
      updateMutation.mutate({ id: selectedUser.id, data: updatePayload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setIsUserDrawerOpen(true);
  };

  const handleConfirmToggleActive = () => {
    if (!deactivateUser) return;
    toggleActiveMutation.mutate({
      id: deactivateUser.id,
      isActive: !deactivateUser.isActive,
    });
  };

  const uniqueEmails = Array.from(new Set(loginHistoryData.map(lh => lh.userEmail)));

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
        title="Users & Roles"
        description="Manage system users, role templates, and access permissions"
        actions={
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Button variant="outline" onClick={() => { setSelectedTemplate(null); setTemplateDialogOpen(true); }} data-testid="button-create-template">
                <ShieldCheck className="h-4 w-4 mr-2" /> New Role Template
              </Button>
            )}
            <Button onClick={handleOpenCreate} data-testid="button-add-user">
              <Plus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" /> Users
          </TabsTrigger>
          <TabsTrigger value="roles" data-testid="tab-roles">
            <Shield className="h-4 w-4 mr-2" /> System Roles
          </TabsTrigger>
          <TabsTrigger value="role-templates" data-testid="tab-role-templates">
            <ShieldCheck className="h-4 w-4 mr-2" /> Role Templates
          </TabsTrigger>
          <TabsTrigger value="matrix" data-testid="tab-matrix">
            <Grid className="h-4 w-4 mr-2" /> Permission Matrix
          </TabsTrigger>
          <TabsTrigger value="login-history" data-testid="tab-login-history">
            <History className="h-4 w-4 mr-2" /> Login History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <DataTable
            columns={userColumns}
            data={users}
            emptyMessage="No users found. Create your first user to get started."
          />
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <DataTable
            columns={roleColumns}
            data={roles}
            emptyMessage="No roles defined."
          />
        </TabsContent>

        <TabsContent value="role-templates" className="mt-4">
          <div className="space-y-4">
            {!isSuperAdmin && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                <CardContent className="py-3 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Lock className="h-4 w-4 shrink-0" />
                  <p className="text-sm">Only Super Admins can create, edit, or delete role templates.</p>
                </CardContent>
              </Card>
            )}

            {isTemplatesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : roleTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground font-medium">No custom role templates yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create role templates to define custom permission sets for your users.</p>
                  {isSuperAdmin && (
                    <Button className="mt-4" onClick={() => { setSelectedTemplate(null); setTemplateDialogOpen(true); }} data-testid="button-create-first-template">
                      <Plus className="h-4 w-4 mr-2" /> Create First Template
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roleTemplates.map(template => {
                  const modules = (template.modules as ModulePermission[] | null) ?? [];
                  const enabledModules = modules.filter(m => m.canRead);
                  const fullAccess = modules.filter(m => m.canRead && m.canCreate && m.canUpdate && m.canDelete);
                  return (
                    <Card key={template.id} className="relative" data-testid={`card-template-${template.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1 min-w-0">
                            <CardTitle className="text-base flex items-center gap-2" data-testid={`text-template-name-${template.id}`}>
                              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                              <span className="truncate">{template.name}</span>
                            </CardTitle>
                            {template.description && (
                              <CardDescription className="text-xs line-clamp-2">{template.description}</CardDescription>
                            )}
                          </div>
                          <Badge
                            variant={template.isActive ? 'default' : 'secondary'}
                            className="ml-2 shrink-0 text-xs"
                            data-testid={`badge-template-status-${template.id}`}
                          >
                            {template.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-muted/30 rounded-lg p-2">
                            <p className="text-lg font-bold text-primary">{enabledModules.length}</p>
                            <p className="text-xs text-muted-foreground">Modules</p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-2">
                            <p className="text-lg font-bold text-green-600">{fullAccess.length}</p>
                            <p className="text-xs text-muted-foreground">Full Access</p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-2">
                            <p className="text-lg font-bold text-blue-600">{template.userCount}</p>
                            <p className="text-xs text-muted-foreground">Users</p>
                          </div>
                        </div>

                        {enabledModules.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {enabledModules.slice(0, 4).map(m => {
                              const mod = ALL_MODULES.find(a => a.key === m.module);
                              return (
                                <Badge key={m.module} variant="outline" className="text-xs">
                                  {mod?.label ?? m.module}
                                </Badge>
                              );
                            })}
                            {enabledModules.length > 4 && (
                              <Badge variant="outline" className="text-xs">+{enabledModules.length - 4} more</Badge>
                            )}
                          </div>
                        )}

                        {isSuperAdmin && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => { setSelectedTemplate(template); setTemplateDialogOpen(true); }}
                              data-testid={`button-edit-template-${template.id}`}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => { setDeleteTemplateTarget(template); setShowDeleteTemplateDialog(true); }}
                              data-testid={`button-delete-template-${template.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Role-Feature Permission Matrix</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b font-medium text-muted-foreground sticky left-0 bg-card z-10">Feature / Permission</th>
                    {roles.map(role => (
                      <th key={role.id} className="text-center p-2 border-b font-medium text-xs" data-testid={`header-role-${role.id}`}>
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(featureCategories).map(([category, featureNames]) => {
                    const categoryFeatures = featureGroups.filter(fg => featureNames.includes(fg.name));
                    return (
                      <Fragment key={`cat-${category}`}>
                        <tr>
                          <td
                            colSpan={roles.length + 1}
                            className="p-2 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b bg-muted/30"
                            data-testid={`text-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {category}
                          </td>
                        </tr>
                        {categoryFeatures.map((fg, fgIdx) => (
                          <tr key={fg.name} className={fgIdx % 2 === 0 ? 'bg-muted/10' : ''}>
                            <td className="p-2 border-b font-medium sticky left-0 bg-card z-10" data-testid={`text-feature-${fg.name.toLowerCase().replace(/\s+/g, '-')}`}>
                              {fg.name}
                              <span className="ml-2 text-xs text-muted-foreground">({fg.features.join(', ')})</span>
                            </td>
                            {roles.map(role => {
                              const perms = rolePermissionMatrix[role.name]?.[fg.name] || [];
                              const hasAll = perms.length === fg.features.length;
                              const hasSome = perms.length > 0 && perms.length < fg.features.length;
                              const hasNone = perms.length === 0;
                              return (
                                <td key={role.id} className="text-center p-2 border-b" data-testid={`cell-${role.id}-${fg.name.toLowerCase().replace(/\s+/g, '-')}`}>
                                  {hasAll && (
                                    <div className="flex items-center justify-center">
                                      <Checkbox checked disabled className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600" data-testid={`checkbox-${role.id}-${fg.name.toLowerCase().replace(/\s+/g, '-')}`} />
                                    </div>
                                  )}
                                  {hasSome && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center justify-center cursor-default">
                                          <Badge variant="secondary" className="text-xs" data-testid={`badge-partial-${role.id}-${fg.name.toLowerCase().replace(/\s+/g, '-')}`}>
                                            {perms.length}/{fg.features.length}
                                          </Badge>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs font-medium mb-1">{role.name} - {fg.name}</p>
                                        <ul className="text-xs space-y-0.5">
                                          {fg.features.map(f => (
                                            <li key={f} className="flex items-center gap-1">
                                              {perms.includes(f) ? (
                                                <Check className="h-3 w-3 text-green-500" />
                                              ) : (
                                                <X className="h-3 w-3 text-muted-foreground" />
                                              )}
                                              <span className={perms.includes(f) ? '' : 'text-muted-foreground'}>{f}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {hasNone && (
                                    <div className="flex items-center justify-center">
                                      <Checkbox checked={false} disabled data-testid={`checkbox-none-${role.id}-${fg.name.toLowerCase().replace(/\s+/g, '-')}`} />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="login-history" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={loginHistoryFilter} onValueChange={setLoginHistoryFilter}>
                <SelectTrigger className="w-[250px]" data-testid="select-login-history-filter">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="select-filter-all">All Users</SelectItem>
                  {uniqueEmails.map(email => (
                    <SelectItem key={email} value={email} data-testid={`select-filter-${email}`}>
                      {email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground" data-testid="text-login-history-count">
                {filteredLoginHistory.length} records
              </span>
            </div>
            <DataTable
              columns={loginHistoryColumns}
              data={filteredLoginHistory}
              isLoading={isLoginHistoryLoading}
              emptyMessage="No login history found."
            />
          </div>
        </TabsContent>
      </Tabs>

      <CreateEditDrawer
        open={isUserDrawerOpen}
        onClose={() => setIsUserDrawerOpen(false)}
        title={selectedUser ? 'Edit User' : 'Add User'}
        fields={userFormFields}
        initialData={selectedUser ? {
          ...selectedUser,
          isActive: selectedUser.isActive ? 'true' : 'false',
        } : undefined}
        onSubmit={handleUserSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={showDeactivateDialog}
        onClose={() => { setShowDeactivateDialog(false); setDeactivateUser(null); }}
        title={deactivateUser?.isActive ? 'Deactivate User' : 'Reactivate User'}
        description={deactivateUser?.isActive
          ? `Are you sure you want to deactivate ${deactivateUser?.name}? They will lose access immediately.`
          : `Reactivate ${deactivateUser?.name}? They will regain access to the system.`
        }
        confirmLabel={deactivateUser?.isActive ? 'Deactivate' : 'Reactivate'}
        variant={deactivateUser?.isActive ? 'destructive' : 'default'}
        onConfirm={handleConfirmToggleActive}
        isLoading={toggleActiveMutation.isPending}
      />

      {templateDialogOpen && (
        <RoleTemplateDialog
          open={templateDialogOpen}
          onClose={() => { setTemplateDialogOpen(false); setSelectedTemplate(null); }}
          template={selectedTemplate}
          users={users}
        />
      )}

      <ConfirmDialog
        open={showDeleteTemplateDialog}
        onClose={() => { setShowDeleteTemplateDialog(false); setDeleteTemplateTarget(null); }}
        title="Delete Role Template"
        description={`Are you sure you want to delete "${deleteTemplateTarget?.name}"? Users assigned to this template will revert to their default role permissions. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTemplateTarget && deleteTemplateMutation.mutate(deleteTemplateTarget.id)}
        isLoading={deleteTemplateMutation.isPending}
      />
    </div>
  );
}
