import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { CreateEditDrawer } from '@/components/shared/CreateEditDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Download, FileText, Lock, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { ExportControl } from '@shared/schema';

const entities = ['Doctors', 'Pharmacies', 'Orders', 'Invoices', 'Employees', 'Leads', 'Products', 'Inventory'];
const roles = ['Super Admin', 'Admin Ops', 'Warehouse Manager', 'Warehouse Staff', 'Logistics Manager', 'Finance Manager', 'Finance Staff', 'HR/Compliance', 'Analytics Viewer'];
const formats = ['CSV', 'Excel', 'PDF', 'JSON'];

export default function ExportControls() {
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<ExportControl | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [controlToDelete, setControlToDelete] = useState<ExportControl | null>(null);

  const { data: controls = [], isLoading } = useQuery<ExportControl[]>({
    queryKey: ['/api/export-controls'],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ExportControl>) =>
      apiRequest('POST', '/api/export-controls', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/export-controls'] });
      toast({ title: 'Success', description: 'Export control created.' });
      setDrawerOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ExportControl> }) =>
      apiRequest('PATCH', `/api/export-controls/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/export-controls'] });
      toast({ title: 'Success', description: 'Export control updated.' });
      setDrawerOpen(false);
      setEditingControl(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/export-controls/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/export-controls'] });
      toast({ title: 'Success', description: 'Export control deleted.' });
      setDeleteDialogOpen(false);
      setControlToDelete(null);
    },
  });

  const columns: Column<ExportControl>[] = [
    { key: 'entity', header: 'Entity', render: (control) => (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{control.entity}</span>
      </div>
    )},
    { key: 'role', header: 'Role', render: (control) => <Badge variant="outline">{control.role}</Badge> },
    { key: 'canExport', header: 'Can Export', render: (control) => (
      <Switch 
        checked={control.canExport} 
        onCheckedChange={(checked) => updateMutation.mutate({ id: control.id, data: { canExport: checked } })}
        data-testid={`switch-export-${control.id}`}
      />
    )},
    { key: 'formats', header: 'Formats', render: (control) => (
      <div className="flex gap-1 flex-wrap">
        {(control.formats || []).map(f => <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>)}
      </div>
    )},
    { key: 'maxRecords', header: 'Max Records', render: (control) => (
      <span className="font-mono text-sm">{control.maxRecords?.toLocaleString() || 0}</span>
    )},
    { key: 'watermark', header: 'Watermark', render: (control) => (
      control.watermark ? <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />Yes</Badge> : <span className="text-muted-foreground">No</span>
    )},
    { key: 'requiresApproval', header: 'Approval', render: (control) => (
      control.requiresApproval ? <Badge variant="default"><AlertTriangle className="h-3 w-3 mr-1" />Required</Badge> : <span className="text-muted-foreground">No</span>
    )},
  ];

  const handleSubmit = (data: Record<string, unknown>) => {
    const controlData = {
      entity: data.entity as string,
      role: data.role as string,
      canExport: (data.canExport as boolean) ?? true,
      watermark: (data.watermark as boolean) ?? false,
      maxRecords: parseInt(data.maxRecords as string) || 1000,
      formats: (data.formats as string[]) || [],
      requiresApproval: (data.requiresApproval as boolean) ?? false,
    };

    if (editingControl) {
      updateMutation.mutate({ id: editingControl.id, data: controlData });
    } else {
      createMutation.mutate(controlData);
    }
  };

  const handleEdit = (control: ExportControl) => {
    setEditingControl(control);
    setDrawerOpen(true);
  };

  const handleDelete = (control: ExportControl) => {
    setControlToDelete(control);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enabledCount = controls.filter(c => c.canExport).length;
  const watermarkedCount = controls.filter(c => c.watermark).length;
  const approvalCount = controls.filter(c => c.requiresApproval).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Export Controls"
        description="Manage data export permissions by role and entity"
        actions={
          <Button onClick={() => { setEditingControl(null); setDrawerOpen(true); }} data-testid="button-add-control">
            <Shield className="h-4 w-4 mr-2" />
            Add Control
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{controls.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Export Enabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{enabledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">With Watermark</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{watermarkedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Requires Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{approvalCount}</div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={controls}
        columns={columns}
        onRowClick={handleEdit}
        rowActions={[
          { label: 'Edit', onClick: handleEdit },
          { label: 'Delete', onClick: handleDelete, destructive: true },
        ]}
      />

      <CreateEditDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingControl ? 'Edit Export Control' : 'Add Export Control'}
        fields={[
          { name: 'entity', label: 'Entity', type: 'select', options: entities.map(e => ({ value: e, label: e })), required: true },
          { name: 'role', label: 'Role', type: 'select', options: roles.map(r => ({ value: r, label: r })), required: true },
          { name: 'canExport', label: 'Can Export', type: 'switch' },
          { name: 'watermark', label: 'Add Watermark', type: 'switch' },
          { name: 'maxRecords', label: 'Max Records', type: 'number' },
          { name: 'requiresApproval', label: 'Requires Approval', type: 'switch' },
        ]}
        initialData={editingControl ? {
          entity: editingControl.entity,
          role: editingControl.role,
          canExport: editingControl.canExport,
          watermark: editingControl.watermark,
          maxRecords: editingControl.maxRecords?.toString() || '1000',
          requiresApproval: editingControl.requiresApproval,
        } : { canExport: true, maxRecords: '1000' }}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Export Control"
        description={`Are you sure you want to delete the export control for "${controlToDelete?.entity}" - "${controlToDelete?.role}"?`}
        onConfirm={() => controlToDelete && deleteMutation.mutate(controlToDelete.id)}
        destructive
      />
    </div>
  );
}
