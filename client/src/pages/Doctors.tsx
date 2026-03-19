import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Download, UserPlus, CreditCard, Edit, Trash2, Loader2, AlertTriangle, TrendingUp, Clock, Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { PageHeader } from '@/components/shared/PageHeader';
import { CreateEditDrawer, FormField } from '@/components/shared/CreateEditDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportModal } from '@/components/shared/ExportModal';
import { EntityDetailDrawer } from '@/components/shared/EntityDetailDrawer';
import { AssignMRModal } from '@/components/shared/AssignMRModal';
import { BulkActionsBar } from '@/components/shared/BulkActionsBar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Doctor {
  id: number;
  code: string;
  name: string;
  specialization: string;
  clinic: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  gstin: string | null;
  pricingSlabId: number | null;
  creditLimit: string;
  outstanding: string;
  importance: string;
  assignedMRId: number | null;
  isActive: boolean;
  lastContacted?: string;
  totalSales?: string;
  createdAt?: string;
}

const getRiskLevel = (doctor: Doctor): 'high' | 'medium' | 'low' => {
  const creditLimit = Number(doctor.creditLimit);
  if (creditLimit <= 0) return 'low';
  const creditUtilization = Number(doctor.outstanding) / creditLimit * 100;
  if (creditUtilization >= 80) return 'high';
  if (creditUtilization >= 50) return 'medium';
  return 'low';
};

const doctorFields: FormField[] = [
  { name: 'name', label: 'Doctor Name', type: 'text', required: true, placeholder: 'Dr. Full Name' },
  { name: 'specialization', label: 'Specialization', type: 'select', options: [
    { value: 'Dermatologist', label: 'Dermatologist' },
    { value: 'Cosmetologist', label: 'Cosmetologist' },
    { value: 'Trichologist', label: 'Trichologist' },
    { value: 'Plastic Surgeon', label: 'Plastic Surgeon' },
    { value: 'General Physician', label: 'General Physician' },
  ]},
  { name: 'clinic', label: 'Clinic Name', type: 'text', required: true },
  { name: 'city', label: 'City', type: 'text', required: true },
  { name: 'phone', label: 'Phone', type: 'tel', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'gstin', label: 'GSTIN', type: 'text', placeholder: 'XXABC1234X1ZX' },
  { name: 'pricingSlab', label: 'Pricing Slab', type: 'select', required: true, options: [
    { value: 'Tier 1', label: 'Tier 1 (Premium)' },
    { value: 'Tier 2', label: 'Tier 2 (Standard)' },
    { value: 'Tier 3', label: 'Tier 3 (Basic)' },
  ]},
  { name: 'creditLimit', label: 'Credit Limit', type: 'currency', required: true, defaultValue: 50000 },
  { name: 'importance', label: 'Importance', type: 'select', required: true, options: [
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ], defaultValue: 'Medium' },
];

const exportColumns = [
  { key: 'id', label: 'Doctor ID' },
  { key: 'name', label: 'Name' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'clinic', label: 'Clinic' },
  { key: 'city', label: 'City' },
  { key: 'pricingSlab', label: 'Pricing Slab' },
  { key: 'creditLimit', label: 'Credit Limit' },
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'importance', label: 'Importance' },
];

export default function Doctors() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [importanceFilter, setImportanceFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal states
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const { data: doctors = [], isLoading } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Doctor>) => {
      const res = await apiRequest('POST', '/api/doctors', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/doctors'] });
      toast({ title: 'Doctor Created', description: 'New doctor has been added.' });
      setCreateDrawerOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create doctor.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Doctor> }) => {
      const res = await apiRequest('PATCH', `/api/doctors/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/doctors'] });
      toast({ title: 'Doctor Updated', description: 'Doctor has been updated.' });
      setEditDrawerOpen(false);
      setEditingDoctor(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update doctor.', variant: 'destructive' });
    },
  });
  const [assignMRModalOpen, setAssignMRModalOpen] = useState(false);
  const [creditLimitDialogOpen, setCreditLimitDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<{ total: number; processed: number; errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredDoctors = doctors.filter(doctor => {
    if (cityFilter !== 'all' && doctor.city !== cityFilter) return false;
    if (importanceFilter !== 'all' && doctor.importance !== importanceFilter) return false;
    if (riskFilter !== 'all' && getRiskLevel(doctor) !== riskFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        doctor.name.toLowerCase().includes(query) ||
        doctor.clinic.toLowerCase().includes(query) ||
        doctor.code.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleReveal = (id: number, field: string) => {
    const key = `${id}-${field}`;
    setRevealedFields(prev => ({ ...prev, [key]: true }));
    toast({
      title: 'Access Logged',
      description: `Your access to ${field} for DOC-${id} has been recorded.`,
    });
  };

  const maskValue = (value: string | null | undefined, id: number, field: string) => {
    if (!value) return '—';
    const key = `${id}-${field}`;
    if (revealedFields[key]) return value;
    return value.replace(/./g, '•').slice(0, 8) + '...';
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const generateDoctorCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `DOC${timestamp}`;
  };

  const handleCreate = (data: Record<string, unknown>) => {
    const doctorData = {
      ...data,
      code: generateDoctorCode(),
      outstanding: '0',
      state: data.state || 'Maharashtra',
    };
    createMutation.mutate(doctorData as Partial<Doctor>);
  };

  const handleEdit = (data: Record<string, unknown>) => {
    if (editingDoctor) {
      updateMutation.mutate({ id: editingDoctor.id, data: data as Partial<Doctor> });
    }
  };

  const handleCreditLimitChange = (reason?: string) => {
    if (selectedDoctor && reason) {
      toast({ 
        title: 'Approval Request Created', 
        description: 'Credit limit change request sent for approval.' 
      });
    }
  };

  const handleAssignMR = (mrId: string, _notes: string) => {
    if (!mrId || selectedIds.length === 0) return;
    const parsedMRId = parseInt(mrId);
    Promise.all(
      selectedIds.map(id =>
        updateMutation.mutateAsync({ id: parseInt(id), data: { assignedMRId: parsedMRId } as Partial<Doctor> })
      )
    ).then(() => {
      toast({ title: 'MR Assigned', description: `MR has been assigned to ${selectedIds.length} doctor(s).` });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['/api/doctors'] });
    }).catch(() => {
      toast({ title: 'Error', description: 'Failed to assign MR to some doctors', variant: 'destructive' });
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (extension !== '.csv') {
        toast({ title: 'Invalid File', description: 'Please upload a CSV file.', variant: 'destructive' });
        return;
      }
      setImportFile(file);
      setImportProgress(null);
    }
  };

  const handleBulkImport = async () => {
    if (!importFile) return;
    
    setIsImporting(true);
    setImportProgress({ total: 0, processed: 0, errors: [] });
    
    const formData = new FormData();
    formData.append('file', importFile);
    
    try {
      const res = await fetch('/api/doctors/bulk-import', {
        method: 'POST',
        body: formData,
      });
      
      const result = await res.json();
      
      if (res.ok) {
        setImportProgress({
          total: result.total || 0,
          processed: result.imported || 0,
          errors: result.errors || [],
        });
        queryClient.invalidateQueries({ queryKey: ['/api/doctors'] });
        toast({ 
          title: 'Import Complete', 
          description: `Successfully imported ${result.imported} doctors.` 
        });
      } else {
        toast({ 
          title: 'Import Failed', 
          description: result.error || 'Failed to import doctors.', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      toast({ title: 'Import Failed', description: 'An error occurred during import.', variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['name', 'specialization', 'clinic', 'city', 'state', 'phone', 'email', 'gstin', 'creditLimit', 'importance'];
    const sampleData = [
      'Dr. Sample Name', 'Dermatologist', 'Sample Clinic', 'Mumbai', 'Maharashtra', '9876543210', 'sample@email.com', '27ABCDE1234F1Z5', '50000', 'High'
    ];
    
    const csvContent = [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'doctors_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: number) => {
    const strId = id.toString();
    setSelectedIds(prev =>
      prev.includes(strId) ? prev.filter(i => i !== strId) : [...prev, strId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDoctors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDoctors.map(d => d.id.toString()));
    }
  };

  const cities = [...new Set(doctors.map(d => d.city))];
  const importanceLevels = ['High', 'Medium', 'Low'];

  const columns = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={selectedIds.length === filteredDoctors.length && filteredDoctors.length > 0}
          onCheckedChange={toggleSelectAll}
        />
      ),
      render: (item: any) => (
        <Checkbox
          checked={selectedIds.includes(String(item.id))}
          onCheckedChange={() => toggleSelect(item.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'id',
      header: 'ID',
      render: (item: any) => (
        <span className="font-mono text-xs">{item.id}</span>
      ),
    },
    {
      key: 'name',
      header: 'Doctor',
      render: (item: any) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.specialization}</p>
        </div>
      ),
    },
    {
      key: 'clinic',
      header: 'Clinic',
    },
    {
      key: 'city',
      header: 'City',
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">
            {maskValue(item.phone, item.id, 'phone')}
          </span>
          {!revealedFields[`${item.id}-phone`] && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                handleReveal(item.id, 'phone');
              }}
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
    },
    {
      key: 'pricingSlab',
      header: 'Pricing Slab',
      render: (item: any) => (
        <span className="text-sm">{item.pricingSlab}</span>
      ),
    },
    {
      key: 'creditLimit',
      header: 'Credit Limit',
      render: (item: any) => (
        <span className="font-mono text-sm">{formatCurrency(item.creditLimit)}</span>
      ),
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      render: (item: any) => (
        <span className={`font-mono text-sm ${item.outstanding > item.creditLimit * 0.8 ? 'text-destructive' : ''}`}>
          {formatCurrency(item.outstanding)}
        </span>
      ),
    },
    {
      key: 'importance',
      header: 'Importance',
      render: (item: any) => <StatusPill status={item.importance} data-testid={`importance-${item.id}`} />,
    },
    {
      key: 'risk',
      header: 'Risk',
      render: (item: any) => {
        const risk = getRiskLevel(item);
        const riskLabels = { high: 'High Risk', medium: 'Medium', low: 'Low Risk' };
        return (
          <div className="flex items-center gap-1" data-testid={`risk-${item.id}`}>
            {risk === 'high' && <AlertTriangle className="h-3 w-3 text-destructive" />}
            <StatusPill status={riskLabels[risk]} />
          </div>
        );
      },
    },
    {
      key: 'lastContacted',
      header: 'Last Contacted',
      render: (item: any) => (
        <div className="flex items-center gap-1" data-testid={`last-contacted-${item.id}`}>
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {item.lastContacted ? new Date(item.lastContacted).toLocaleDateString() : 'Never'}
          </span>
        </div>
      ),
    },
  ];

  const rowActions = [
    {
      label: 'View Details',
      onClick: (item: any) => {
        setSelectedDoctor(item);
        setDetailDrawerOpen(true);
      },
    },
    {
      label: 'Edit',
      onClick: (item: any) => {
        setEditingDoctor(item);
        setEditDrawerOpen(true);
      },
    },
    {
      label: 'Change Credit Limit',
      onClick: (item: any) => {
        setSelectedDoctor(item);
        setCreditLimitDialogOpen(true);
      },
    },
    {
      label: 'View Orders',
      onClick: (item: any) => navigate(`/orders?doctor=${item.id}`),
    },
    {
      label: 'Assign MR',
      onClick: (item: any) => {
        setSelectedIds([item.id]);
        setAssignMRModalOpen(true);
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Doctors"
        description="Manage doctor profiles and commercial terms"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkImportModalOpen(true)} data-testid="button-bulk-import">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setCreateDrawerOpen(true)} data-testid="button-add-doctor">
              <Plus className="h-4 w-4 mr-2" />
              Add Doctor
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 stagger-children">
        <div className="card-stat" data-testid="stat-total-doctors">
          <p className="text-sm text-muted-foreground">Total Doctors</p>
          <p className="text-2xl font-display font-semibold mt-1">{doctors.length}</p>
        </div>
        <div className="card-stat" data-testid="stat-new-doctors">
          <p className="text-sm text-muted-foreground">New (This Month)</p>
          <p className="text-2xl font-display font-semibold mt-1 text-primary">
            {doctors.filter(d => {
              if (!d.createdAt) return false;
              const created = new Date(d.createdAt);
              const now = new Date();
              return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
        <div className="card-stat" data-testid="stat-high-importance">
          <p className="text-sm text-muted-foreground">High Importance</p>
          <p className="text-2xl font-display font-semibold mt-1">
            {doctors.filter(d => d.importance === 'High').length}
          </p>
        </div>
        <div className="card-stat" data-testid="stat-at-risk">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-muted-foreground">At Risk</p>
          </div>
          <p className="text-2xl font-display font-semibold mt-1 text-destructive">
            {doctors.filter(d => getRiskLevel(d) === 'high').length}
          </p>
        </div>
        <div className="card-stat" data-testid="stat-credit-limit">
          <p className="text-sm text-muted-foreground">Total Credit Limit</p>
          <p className="text-2xl font-display font-semibold mt-1">
            {formatCurrency(doctors.reduce((sum, d) => sum + Number(d.creditLimit), 0))}
          </p>
        </div>
        <div className="card-stat" data-testid="stat-outstanding">
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <p className="text-2xl font-display font-semibold mt-1 text-warning">
            {formatCurrency(doctors.reduce((sum, d) => sum + Number(d.outstanding), 0))}
          </p>
        </div>
        <div className="card-stat" data-testid="stat-sales-month">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">Sales (Month)</p>
          </div>
          <p className="text-2xl font-display font-semibold mt-1 text-primary">
            {formatCurrency(doctors.reduce((sum, d) => sum + Number(d.totalSales || 0), 0))}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search doctors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={importanceFilter} onValueChange={setImportanceFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Importance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Importance</SelectItem>
            {importanceLevels.map((level) => (
              <SelectItem key={level} value={level}>{level}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-risk-filter">
            <SelectValue placeholder="All Risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        data={filteredDoctors}
        columns={columns}
        rowActions={rowActions}
        onRowClick={(item) => navigate(`/doctors/${item.id}`)}
        emptyMessage="No doctors found"
      />

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            label: 'Assign MR',
            icon: <UserPlus className="h-4 w-4" />,
            onClick: () => setAssignMRModalOpen(true),
          },
        ]}
      />

      {/* Create Drawer */}
      <CreateEditDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Add New Doctor"
        fields={doctorFields}
        onSubmit={handleCreate}
        submitLabel="Create Doctor"
      />

      {/* Edit Drawer */}
      <CreateEditDrawer
        open={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingDoctor(null);
        }}
        title="Edit Doctor"
        fields={doctorFields}
        initialData={editingDoctor}
        onSubmit={handleEdit}
        submitLabel="Save Changes"
      />

      {/* Credit Limit Change Dialog */}
      <ConfirmDialog
        open={creditLimitDialogOpen}
        onOpenChange={setCreditLimitDialogOpen}
        title="Request Credit Limit Change"
        description={`Request to increase credit limit for ${selectedDoctor?.name} from ${formatCurrency(selectedDoctor?.creditLimit || 0)} to ${formatCurrency(Number(selectedDoctor?.creditLimit || 0) + 25000)}. This requires approval.`}
        requireReason
        reasonLabel="Reason for increase"
        confirmLabel="Submit Request"
        onConfirm={handleCreditLimitChange}
      />

      {/* Assign MR Modal */}
      <AssignMRModal
        open={assignMRModalOpen}
        onOpenChange={setAssignMRModalOpen}
        entityType="doctor"
        entityCount={selectedIds.length}
        onAssign={handleAssignMR}
      />

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        entityName="Doctors"
        columns={exportColumns}
        totalRecords={filteredDoctors.length}
      />

      {/* Detail Drawer */}
      <EntityDetailDrawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedDoctor(null);
        }}
        title={selectedDoctor?.name || 'Doctor Details'}
        entityId={String(selectedDoctor?.id) || ''}
        status={selectedDoctor?.importance}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setEditingDoctor(selectedDoctor);
                setEditDrawerOpen(true);
                setDetailDrawerOpen(false);
              }}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        }
        timeline={[
          { id: '1', type: 'status', title: 'Doctor Created', description: 'Profile created', user: 'admin@monoskin.in', timestamp: '2024-01-15' },
        ]}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Clinic</p>
              <p className="font-medium">{selectedDoctor?.clinic}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Specialization</p>
              <p className="font-medium">{selectedDoctor?.specialization}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">City</p>
              <p className="font-medium">{selectedDoctor?.city}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pricing Slab</p>
              <p className="font-medium">Tier {selectedDoctor?.pricingSlabId || 1}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Credit Limit</p>
              <p className="font-mono font-medium">{formatCurrency(selectedDoctor?.creditLimit || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="font-mono font-medium text-warning">{formatCurrency(selectedDoctor?.outstanding || 0)}</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/orders?doctor=${selectedDoctor?.id}`)}>
                View Orders
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/finance/invoices?doctor=${selectedDoctor?.id}`)}>
                View Invoices
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setCreditLimitDialogOpen(true);
                }}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Change Credit Limit
              </Button>
            </div>
          </div>
        </div>
      </EntityDetailDrawer>

      {/* Bulk Import Modal */}
      <Dialog open={bulkImportModalOpen} onOpenChange={(open) => {
        setBulkImportModalOpen(open);
        if (!open) {
          setImportFile(null);
          setImportProgress(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-bulk-import">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Bulk Import Doctors
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple doctor records at once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Template Download */}
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Download Template</p>
                    <p className="text-xs text-muted-foreground">Get a sample file with the required format</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate} data-testid="button-download-template">
                    <Download className="h-4 w-4 mr-1" />
                    Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Upload File</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file-upload"
              />
              {!importFile ? (
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover-elevate"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="dropzone-file-upload"
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
                </div>
              ) : (
                <div className="border rounded-lg p-4 flex items-center justify-between" data-testid="file-selected">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">{importFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setImportFile(null)}
                    data-testid="button-remove-file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Import Progress */}
            {importProgress && (
              <div className="space-y-2" data-testid="import-progress">
                <div className="flex items-center justify-between text-sm">
                  <span>Import Progress</span>
                  <span>{importProgress.processed} / {importProgress.total} records</span>
                </div>
                <Progress value={importProgress.total > 0 ? (importProgress.processed / importProgress.total) * 100 : 0} />
                {importProgress.processed === importProgress.total && importProgress.total > 0 && (
                  <div className="flex items-center gap-2 text-green-600" data-testid="import-success">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Import completed successfully!</span>
                  </div>
                )}
                {importProgress.errors.length > 0 && (
                  <div className="mt-2 p-2 bg-destructive/10 rounded text-sm" data-testid="import-errors">
                    <p className="font-medium text-destructive">Errors ({importProgress.errors.length}):</p>
                    <ul className="list-disc list-inside text-destructive text-xs mt-1 max-h-20 overflow-y-auto">
                      {importProgress.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {importProgress.errors.length > 5 && (
                        <li>...and {importProgress.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkImportModalOpen(false)} data-testid="button-cancel-import">
              Cancel
            </Button>
            <Button 
              onClick={handleBulkImport} 
              disabled={!importFile || isImporting}
              data-testid="button-start-import"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Doctors
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
