import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Send, UserPlus, Download, Calendar, MessageSquare, Loader2, Filter, X, Upload, FileSpreadsheet, CheckCircle } from 'lucide-react';
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
import { StatusPill, getStatusStyle } from '@/components/shared/StatusPill';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { CreateEditDrawer, FormField } from '@/components/shared/CreateEditDrawer';
import { AssignMRModal } from '@/components/shared/AssignMRModal';
import { ExportModal } from '@/components/shared/ExportModal';
import { EntityDetailDrawer } from '@/components/shared/EntityDetailDrawer';
import { BulkActionsBar } from '@/components/shared/BulkActionsBar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { MR } from '@shared/schema';

interface Lead {
  id: number;
  name: string;
  clinic: string;
  city: string;
  phone: string;
  stage: string;
  priority: string;
  source: string;
  assignedMRId: number | null;
  nextFollowUp: string | null;
  createdAt: string;
}

const leadFields: FormField[] = [
  { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Dr. Name' },
  { name: 'designation', label: 'Designation', type: 'text', placeholder: 'e.g. Dermatologist' },
  { name: 'specialization', label: 'Specialization', type: 'text', placeholder: 'e.g. Skin Care' },
  { name: 'clinic', label: 'Clinic Name', type: 'text', placeholder: 'Clinic / Hospital' },
  { name: 'city', label: 'City', type: 'text', required: true },
  { name: 'state', label: 'State', type: 'text', placeholder: 'State' },
  { name: 'address', label: 'Address', type: 'textarea', placeholder: 'Full address' },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'whatsappNumber', label: 'WhatsApp Number', type: 'tel', placeholder: 'WhatsApp number' },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'Email address' },
  { 
    name: 'stage', 
    label: 'Stage', 
    type: 'select', 
    required: true,
    options: [
      { value: 'New', label: 'New' },
      { value: 'Contacted', label: 'Contacted' },
      { value: 'Qualified', label: 'Qualified' },
      { value: 'Proposal', label: 'Proposal' },
      { value: 'Negotiation', label: 'Negotiation' },
      { value: 'Sent to MR', label: 'Sent to MR' },
      { value: 'Converted', label: 'Converted' },
      { value: 'Lost', label: 'Lost' },
    ],
    defaultValue: 'New'
  },
  { 
    name: 'priority', 
    label: 'Priority', 
    type: 'select', 
    required: true,
    options: [
      { value: 'High', label: 'High' },
      { value: 'Medium', label: 'Medium' },
      { value: 'Low', label: 'Low' },
    ],
    defaultValue: 'Medium'
  },
  { 
    name: 'source', 
    label: 'Source', 
    type: 'select', 
    options: [
      { value: 'Referral', label: 'Referral' },
      { value: 'Conference', label: 'Conference' },
      { value: 'Website', label: 'Website' },
      { value: 'Cold Call', label: 'Cold Call' },
      { value: 'Other', label: 'Other' },
    ]
  },
  { name: 'nextFollowUp', label: 'Next Follow-up', type: 'date' },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes about this lead' },
];

const exportColumns = [
  { key: 'id', label: 'Lead ID' },
  { key: 'name', label: 'Name' },
  { key: 'clinic', label: 'Clinic' },
  { key: 'city', label: 'City' },
  { key: 'stage', label: 'Stage' },
  { key: 'priority', label: 'Priority' },
  { key: 'source', label: 'Source' },
  { key: 'assignedMRId', label: 'Assigned MR' },
  { key: 'nextFollowUp', label: 'Next Follow-up' },
];

export default function Leads() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [lastContactedFilter, setLastContactedFilter] = useState<string>('all');
  const [lastSalesFilter, setLastSalesFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Modal states
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<{ total: number; processed: number; errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [stageChangeDialogOpen, setStageChangeDialogOpen] = useState(false);
  const [newStage, setNewStage] = useState('');

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
  });

  const { data: mrs = [] } = useQuery<MR[]>({
    queryKey: ['/api/mrs'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Lead>) => {
      const res = await apiRequest('POST', '/api/leads', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/kpis'] });
      toast({ title: 'Lead Created', description: 'New lead has been added.' });
      setCreateDrawerOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create lead.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Lead> }) => {
      const res = await apiRequest('PATCH', `/api/leads/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/kpis'] });
      toast({ title: 'Lead Updated', description: 'Lead has been updated.' });
      setEditDrawerOpen(false);
      setEditingLead(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update lead.', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Extract unique values for filter dropdowns
  const uniqueStates = [...new Set(leads.map(l => (l as any).state).filter(Boolean))];
  const uniqueCities = [...new Set(leads.map(l => l.city).filter(Boolean))];

  // Date filter helper
  const isWithinDateRange = (dateStr: string | null | undefined, range: string): boolean => {
    if (!dateStr || range === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (range) {
      case 'today': return daysDiff === 0;
      case 'week': return daysDiff <= 7;
      case 'month': return daysDiff <= 30;
      case 'quarter': return daysDiff <= 90;
      case 'never': return !dateStr;
      default: return true;
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (stageFilter !== 'all' && lead.stage !== stageFilter) return false;
    if (priorityFilter !== 'all' && lead.priority !== priorityFilter) return false;
    if (stateFilter !== 'all' && (lead as any).state !== stateFilter) return false;
    if (cityFilter !== 'all' && lead.city !== cityFilter) return false;
    if (lastContactedFilter !== 'all' && !isWithinDateRange((lead as any).lastContactedAt, lastContactedFilter)) return false;
    if (lastSalesFilter !== 'all' && !isWithinDateRange((lead as any).lastSalesDate, lastSalesFilter)) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        lead.name.toLowerCase().includes(query) ||
        lead.clinic.toLowerCase().includes(query) ||
        lead.city.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const activeFilterCount = [stageFilter, priorityFilter, stateFilter, cityFilter, lastContactedFilter, lastSalesFilter].filter(f => f !== 'all').length;

  const clearAllFilters = () => {
    setStageFilter('all');
    setPriorityFilter('all');
    setStateFilter('all');
    setCityFilter('all');
    setLastContactedFilter('all');
    setLastSalesFilter('all');
  };

  const toggleSelect = (id: number) => {
    const strId = id.toString();
    setSelectedLeads(prev =>
      prev.includes(strId) ? prev.filter(i => i !== strId) : [...prev, strId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id.toString()));
    }
  };

  const handleCreate = (data: Record<string, unknown>) => {
    // Auto-generate a unique lead code
    const timestamp = Date.now().toString().slice(-6);
    const leadCode = `LED${timestamp}`;
    createMutation.mutate({ ...data, code: leadCode } as Partial<Lead>);
  };

  const handleEdit = (data: Record<string, unknown>) => {
    if (editingLead) {
      updateMutation.mutate({ id: editingLead.id, data: data as Partial<Lead> });
    }
  };

  const handleAssign = async (mrId: string, _notes: string, _sendNotification: boolean) => {
    const mr = mrs.find(m => String(m.id) === mrId);
    try {
      await Promise.all(
        selectedLeads.map(leadId =>
          apiRequest('PATCH', `/api/leads/${leadId}`, { assignedMRId: Number(mrId) })
        )
      );
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({ 
        title: 'Leads Assigned', 
        description: `${selectedLeads.length} leads assigned to ${mr?.name}.` 
      });
      setSelectedLeads([]);
    } catch (error) {
      toast({ 
        title: 'Assignment Failed', 
        description: 'Could not assign leads. Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  const handleSendToMR = () => {
    const selectedLeadObjects = leads.filter(l => selectedLeads.includes(l.id.toString()));
    const assignedLeads = selectedLeadObjects.filter(l => l.assignedMRId);
    const unassignedLeads = selectedLeadObjects.filter(l => !l.assignedMRId);

    if (assignedLeads.length === 0) {
      toast({
        title: 'No MR Assigned',
        description: 'None of the selected leads have an MR assigned. Please assign MRs first.',
        variant: 'destructive',
      });
      return;
    }

    Promise.all(
      assignedLeads.map(l =>
        apiRequest('PATCH', `/api/leads/${l.id}`, { stage: 'Sent to MR' })
      )
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      const skippedMsg = unassignedLeads.length > 0
        ? ` ${unassignedLeads.length} lead(s) without an MR were skipped.`
        : '';
      toast({
        title: 'Leads Sent',
        description: `${assignedLeads.length} lead(s) sent to their assigned MRs.${skippedMsg}`,
      });
      setSelectedLeads([]);
    }).catch(() => {
      toast({ title: 'Error', description: 'Failed to send some leads. Please try again.', variant: 'destructive' });
    });
  };

  const handleStageChange = () => {
    if (selectedLead && newStage) {
      updateMutation.mutate({ id: selectedLead.id, data: { stage: newStage } });
      setStageChangeDialogOpen(false);
      setSelectedLead(null);
      setNewStage('');
    }
  };

  const handleFollowUp = (reason?: string) => {
    if (selectedLead && reason) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 3);
      updateMutation.mutate({ 
        id: selectedLead.id, 
        data: { nextFollowUp: nextDate.toISOString().split('T')[0] } 
      });
      toast({ title: 'Follow-up Scheduled', description: `Next follow-up set for ${nextDate.toLocaleDateString()}.` });
    }
  };

  const getMRName = (mrId: number | null) => {
    if (!mrId) return '—';
    const mr = mrs.find(m => m.id === mrId);
    return mr?.name || `MR-${mrId}`;
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
      const res = await fetch('/api/leads/bulk-import', {
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
        queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
        toast({ 
          title: 'Import Complete', 
          description: `Successfully imported ${result.imported} leads.` 
        });
      } else {
        toast({ 
          title: 'Import Failed', 
          description: result.error || 'Failed to import leads.', 
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
    const headers = ['name', 'clinic', 'city', 'state', 'phone', 'email', 'stage', 'priority', 'source'];
    const sampleData = [
      'Dr. Sample Name', 'Sample Clinic', 'Mumbai', 'Maharashtra', '9876543210', 'sample@email.com', 'New', 'High', 'Referral'
    ];
    
    const csvContent = [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
          onCheckedChange={toggleSelectAll}
        />
      ),
      render: (item: any) => (
        <Checkbox
          checked={selectedLeads.includes(item.id.toString())}
          onCheckedChange={() => toggleSelect(item.id)}
          onClick={(e) => e.stopPropagation()}
          data-testid={`checkbox-lead-${item.id}`}
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
      header: 'Name',
      render: (item: any) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.clinic}</p>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'City',
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (item: any) => <StatusPill status={item.stage} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item: any) => <StatusPill status={item.priority} />,
    },
    {
      key: 'source',
      header: 'Source',
      render: (item: any) => (
        <span className="text-sm text-muted-foreground">{item.source}</span>
      ),
    },
    {
      key: 'assignedMRId',
      header: 'Assigned MR',
      render: (item: any) => (
        <span className="text-sm">{getMRName(item.assignedMRId)}</span>
      ),
    },
    {
      key: 'nextFollowUp',
      header: 'Next Follow-up',
      render: (item: any) => (
        <span className="text-sm">{item.nextFollowUp || '—'}</span>
      ),
    },
  ];

  const rowActions = [
    {
      label: 'View Details',
      onClick: (item: any) => {
        setSelectedLead(item);
        setDetailDrawerOpen(true);
      },
    },
    {
      label: 'Edit',
      onClick: (item: any) => {
        setEditingLead(item);
        setEditDrawerOpen(true);
      },
    },
    {
      label: 'Assign to MR',
      onClick: (item: any) => {
        setSelectedLeads([item.id.toString()]);
        setAssignModalOpen(true);
      },
    },
    {
      label: 'Send to MR',
      onClick: (item: Lead) => {
        if (!item.assignedMRId) {
          toast({
            title: 'No MR Assigned',
            description: `Please assign an MR to "${item.name}" before sending.`,
            variant: 'destructive',
          });
          return;
        }
        updateMutation.mutate(
          { id: item.id, data: { stage: 'Sent to MR' } },
          {
            onSuccess: () => {
              toast({
                title: 'Lead Sent',
                description: `${item.name} has been sent to ${getMRName(item.assignedMRId)}.`,
              });
            },
          }
        );
      },
    },
    {
      label: 'Change Stage',
      onClick: (item: any) => {
        setSelectedLead(item);
        setStageChangeDialogOpen(true);
      },
    },
    {
      label: 'Schedule Follow-up',
      onClick: (item: any) => {
        setSelectedLead(item);
        setFollowUpDialogOpen(true);
      },
    },
  ];

  const stages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Sent to MR', 'Converted', 'Lost'];
  const priorities = ['High', 'Medium', 'Low'];

  const selectedLeadMR = selectedLead?.assignedMRId ? mrs.find(m => m.id === selectedLead.assignedMRId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Leads"
        description="Manage and track potential customers"
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
            <Button onClick={() => setCreateDrawerOpen(true)} data-testid="button-add-lead">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-card" data-testid="card-total-leads">
          <p className="text-sm text-muted-foreground">Total Leads</p>
          <p className="text-2xl font-display font-semibold" data-testid="text-total-leads">{leads.length}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card" data-testid="card-new-leads">
          <p className="text-sm text-muted-foreground">New Leads</p>
          <p className="text-2xl font-display font-semibold" data-testid="text-new-leads">{leads.filter(l => l.stage === 'New').length}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card" data-testid="card-high-priority">
          <p className="text-sm text-muted-foreground">High Priority</p>
          <p className="text-2xl font-display font-semibold text-warning" data-testid="text-high-priority">{leads.filter(l => l.priority === 'High').length}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card" data-testid="card-unassigned">
          <p className="text-sm text-muted-foreground">Unassigned</p>
          <p className="text-2xl font-display font-semibold" data-testid="text-unassigned">{leads.filter(l => !l.assignedMRId).length}</p>
        </div>
      </div>

      {/* Filters & Bulk Actions */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-leads"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-stage-filter">
                {stageFilter && stageFilter !== 'all' ? (
                  <StatusPill status={stageFilter} />
                ) : (
                  <span className="text-muted-foreground text-sm">All Stages</span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    <StatusPill status={stage} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-importance-filter">
                <SelectValue placeholder="Importance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Importance</SelectItem>
                {priorities.map((priority) => (
                  <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            data-testid="button-toggle-advanced-filters"
          >
            <Filter className="h-4 w-4 mr-2" />
            More Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="p-4 rounded-lg border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Advanced Filters</h4>
              {activeFilterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  data-testid="button-clear-all-filters"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">State</label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger data-testid="select-state-filter">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {uniqueStates.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                    {uniqueStates.length === 0 && (
                      <SelectItem value="none" disabled>No states available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">City</label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger data-testid="select-city-filter">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {uniqueCities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Last Contacted</label>
                <Select value={lastContactedFilter} onValueChange={setLastContactedFilter}>
                  <SelectTrigger data-testid="select-last-contacted-filter">
                    <SelectValue placeholder="Any Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="quarter">Last 90 Days</SelectItem>
                    <SelectItem value="never">Never Contacted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Last Sales Date</label>
                <Select value={lastSalesFilter} onValueChange={setLastSalesFilter}>
                  <SelectTrigger data-testid="select-last-sales-filter">
                    <SelectValue placeholder="Any Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="quarter">Last 90 Days</SelectItem>
                    <SelectItem value="never">No Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <DataTable
        data={filteredLeads}
        columns={columns}
        rowActions={rowActions}
        onRowClick={(item) => navigate(`/leads/${item.id}`)}
        emptyMessage="No leads found"
      />

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedLeads.length}
        onClear={() => setSelectedLeads([])}
        actions={[
          {
            label: 'Assign to MR',
            icon: <UserPlus className="h-4 w-4" />,
            onClick: () => setAssignModalOpen(true),
          },
          {
            label: 'Send to MR',
            icon: <Send className="h-4 w-4" />,
            onClick: () => setSendDialogOpen(true),
          },
        ]}
      />

      {/* Create Drawer */}
      <CreateEditDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Add New Lead"
        fields={leadFields}
        onSubmit={handleCreate}
        submitLabel="Create Lead"
      />

      {/* Edit Drawer */}
      <CreateEditDrawer
        open={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingLead(null);
        }}
        title="Edit Lead"
        fields={leadFields}
        initialData={editingLead}
        onSubmit={handleEdit}
        submitLabel="Save Changes"
      />

      {/* Assign MR Modal */}
      <AssignMRModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        entityType="lead"
        entityCount={selectedLeads.length}
        onAssign={handleAssign}
      />

      {/* Send to MR Dialog */}
      <ConfirmDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        title="Send Leads to MR"
        description={`Send ${selectedLeads.length} lead(s) to their assigned MRs for follow-up?`}
        confirmLabel="Send"
        onConfirm={handleSendToMR}
      />

      {/* Stage Change Dialog */}
      <Dialog open={stageChangeDialogOpen} onOpenChange={(open) => {
        setStageChangeDialogOpen(open);
        if (!open) setNewStage('');
      }}>
        <DialogContent data-testid="dialog-stage-change">
          <DialogHeader>
            <DialogTitle>Change Lead Stage</DialogTitle>
            <DialogDescription>
              Change stage for "{selectedLead?.name}" from {selectedLead?.stage}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">Select New Stage</label>
              <div className="grid grid-cols-2 gap-2" data-testid="grid-stage-chips">
                {stages.filter(s => s !== selectedLead?.stage).map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setNewStage(stage)}
                    data-testid={`chip-stage-${stage.toLowerCase().replace(/\s+/g, '-')}`}
                    className={cn(
                      'inline-flex items-center justify-center px-3 py-2 rounded-full text-xs font-semibold transition-all border-2',
                      getStatusStyle(stage),
                      newStage === stage
                        ? 'border-primary ring-2 ring-primary ring-offset-2 scale-105 shadow-sm'
                        : 'border-transparent hover:border-primary/40 hover:scale-[1.02]'
                    )}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStageChangeDialogOpen(false); setNewStage(''); }} data-testid="button-cancel-stage">
              Cancel
            </Button>
            <Button 
              onClick={() => handleStageChange()} 
              disabled={!newStage}
              data-testid="button-confirm-stage"
            >
              Update Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <ConfirmDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        title="Schedule Follow-up"
        description={`Schedule next follow-up for "${selectedLead?.name}"`}
        requireReason
        reasonLabel="Follow-up notes"
        confirmLabel="Schedule"
        onConfirm={handleFollowUp}
      />

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        entityName="Leads"
        columns={exportColumns}
        totalRecords={filteredLeads.length}
      />

      {/* Lead Detail Drawer */}
      <EntityDetailDrawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedLead(null);
        }}
        title={selectedLead?.name || 'Lead Details'}
        entityId={selectedLead?.id?.toString() || ''}
        status={selectedLead?.stage}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setEditingLead(selectedLead);
                setEditDrawerOpen(true);
                setDetailDrawerOpen(false);
              }}
              data-testid="button-drawer-edit"
            >
              Edit
            </Button>
            <Button 
              size="sm" 
              onClick={() => {
                if (selectedLead) {
                  setSelectedLeads([selectedLead.id.toString()]);
                  setAssignModalOpen(true);
                }
              }}
              data-testid="button-drawer-assign-mr"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Assign MR
            </Button>
          </div>
        }
        timeline={[
          { id: '1', type: 'status', title: 'Lead Created', description: `Source: ${selectedLead?.source}`, user: 'admin@monoskin.in', timestamp: selectedLead?.createdAt || '' },
          ...(selectedLead?.assignedMRId ? [{ id: '2', type: 'action' as const, title: 'MR Assigned', description: `Assigned to ${getMRName(selectedLead.assignedMRId)}`, user: 'admin@monoskin.in', timestamp: new Date().toISOString() }] : []),
        ]}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Clinic</p>
              <p className="font-medium">{selectedLead?.clinic}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">City</p>
              <p className="font-medium">{selectedLead?.city}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <StatusPill status={selectedLead?.priority || ''} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Source</p>
              <p className="font-medium">{selectedLead?.source}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assigned MR</p>
              <p className="font-medium">{getMRName(selectedLead?.assignedMRId)}</p>
              {selectedLeadMR && (
                <p className="text-xs text-muted-foreground">{selectedLeadMR.territory}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Follow-up</p>
              <p className="font-medium">{selectedLead?.nextFollowUp || 'Not scheduled'}</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setFollowUpDialogOpen(true);
                }}
                data-testid="button-drawer-follow-up"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Schedule Follow-up
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setStageChangeDialogOpen(true);
                }}
                data-testid="button-drawer-change-stage"
              >
                Change Stage
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (!selectedLead) return;
                  if (!selectedLead.assignedMRId) {
                    toast({
                      title: 'No MR Assigned',
                      description: 'Please assign an MR to this lead before sending.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  updateMutation.mutate(
                    { id: selectedLead.id, data: { stage: 'Sent to MR' } },
                    {
                      onSuccess: () => {
                        toast({
                          title: 'Lead Sent',
                          description: `${selectedLead.name} has been sent to ${getMRName(selectedLead.assignedMRId)}.`,
                        });
                      },
                    }
                  );
                }}
                data-testid="button-drawer-send-to-mr"
              >
                <Send className="h-4 w-4 mr-1" />
                Send to MR
              </Button>
              <Button 
                size="sm"
                onClick={() => navigate('/orders/create?leadId=' + selectedLead?.id)}
                data-testid="button-drawer-create-order"
              >
                Create Order
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
              Bulk Import Leads
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple lead records at once.
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
                  Import Leads
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
