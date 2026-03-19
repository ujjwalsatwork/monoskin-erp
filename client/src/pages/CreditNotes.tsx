import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill } from '@/components/shared/StatusPill';
import { CreateEditDrawer, FormField } from '@/components/shared/CreateEditDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportModal } from '@/components/shared/ExportModal';
import { EntityDetailDrawer } from '@/components/shared/EntityDetailDrawer';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText, Plus, Download, Loader2, User, CheckCircle, Clock,
  Paperclip, Upload, AlertTriangle, ArrowRight, ExternalLink, Shield, XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUpload } from '@/hooks/use-upload';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { CreditNote, Invoice, Doctor, Pharmacy, User as UserType, TaxHSNCode } from '@shared/schema';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const REASON_MAP: Record<string, string> = {
  'returns': 'Product Returns',
  'price_adjustment': 'Price Adjustment',
  'billing_error': 'Billing Error',
  'near_expiry': 'Near Expiry',
  'damaged_goods': 'Damaged Goods',
  'other': 'Other',
};

export default function CreditNotes() {
  const { toast } = useToast();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<CreditNote | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: creditNotes = [], isLoading } = useQuery<CreditNote[]>({
    queryKey: ['/api/credit-notes'],
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: pharmacies = [] } = useQuery<Pharmacy[]>({
    queryKey: ['/api/pharmacies'],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });

  const { data: taxCodes = [] } = useQuery<TaxHSNCode[]>({
    queryKey: ['/api/tax-hsn-codes'],
  });

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      if (selectedNote) {
        const currentAttachments = (selectedNote.attachments as string[]) || [];
        const updated = [...currentAttachments, response.objectPath];
        updateMutation.mutate({
          id: selectedNote.id,
          data: { attachments: updated },
        });
        setSelectedNote({ ...selectedNote, attachments: updated } as CreditNote);
      } else {
        setPendingAttachments(prev => [...prev, response.objectPath]);
      }
      toast({ title: 'File Uploaded', description: 'Document attached successfully' });
    },
    onError: () => {
      toast({ title: 'Upload Failed', description: 'Could not upload file', variant: 'destructive' });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('POST', '/api/credit-notes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/credit-notes'] });
      toast({ title: 'Credit Note Created', description: 'New credit note has been created' });
      setIsDrawerOpen(false);
      setPendingAttachments([]);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create credit note', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest('PATCH', `/api/credit-notes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/credit-notes'] });
      toast({ title: 'Credit Note Updated' });
      setIsDrawerOpen(false);
      setIsApproveDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update credit note', variant: 'destructive' });
    },
  });

  const getCustomerName = (note: CreditNote) => {
    if (note.doctorId) {
      const doctor = doctors.find(d => d.id === note.doctorId);
      return doctor?.name || 'Unknown Doctor';
    }
    if (note.pharmacyId) {
      const pharmacy = pharmacies.find(p => p.id === note.pharmacyId);
      return pharmacy?.name || 'Unknown Pharmacy';
    }
    return 'N/A';
  };

  const getInvoiceNumber = (note: CreditNote) => {
    if (note.invoiceId) {
      const invoice = invoices.find(i => i.id === note.invoiceId);
      return invoice?.invoiceNumber || `INV-${note.invoiceId}`;
    }
    return '-';
  };

  const getUserName = (userId: number | null | undefined) => {
    if (!userId) return 'System';
    const user = users.find(u => u.id === userId);
    return user?.name || user?.username || 'Unknown User';
  };

  const getReasonLabel = (reason: string) => REASON_MAP[reason] || reason;

  const getGstRecord = (note: CreditNote) => {
    if (!note.gstRecordId) return null;
    return taxCodes.find(tc => tc.id === note.gstRecordId) || null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildAuditTimeline = (note: CreditNote) => {
    const steps: {
      id: string;
      label: string;
      user: string;
      timestamp: string | null;
      completed: boolean;
      current: boolean;
      icon: 'created' | 'approved' | 'applied' | 'cancelled';
    }[] = [];

    steps.push({
      id: 'created',
      label: 'Created',
      user: getUserName(note.createdById),
      timestamp: note.createdAt ? new Date(note.createdAt).toISOString() : null,
      completed: true,
      current: note.status === 'draft',
      icon: 'created',
    });

    if (note.status === 'cancelled') {
      steps.push({
        id: 'cancelled',
        label: 'Cancelled',
        user: 'System',
        timestamp: note.updatedAt ? new Date(note.updatedAt).toISOString() : null,
        completed: true,
        current: true,
        icon: 'cancelled',
      });
    } else {
      steps.push({
        id: 'approved',
        label: 'Approved',
        user: note.approvedById ? getUserName(note.approvedById) : 'Pending',
        timestamp: note.approvedAt ? new Date(note.approvedAt).toISOString() : null,
        completed: note.status === 'approved' || note.status === 'applied',
        current: note.status === 'approved',
        icon: 'approved',
      });

      steps.push({
        id: 'applied',
        label: 'Applied',
        user: note.appliedById ? getUserName(note.appliedById) : 'Pending',
        timestamp: note.appliedAt ? new Date(note.appliedAt).toISOString() : null,
        completed: note.status === 'applied',
        current: note.status === 'applied',
        icon: 'applied',
      });
    }

    return steps;
  };

  const getReasonAnalytics = () => {
    const counts: Record<string, number> = {};
    const amounts: Record<string, number> = {};
    creditNotes.forEach(cn => {
      const code = cn.reasonCode || 'other';
      counts[code] = (counts[code] || 0) + 1;
      amounts[code] = (amounts[code] || 0) + Number(cn.amount);
    });
    return Object.entries(counts).map(([key, count]) => ({
      name: REASON_MAP[key] || key,
      value: count,
      amount: amounts[key],
    }));
  };

  const handleViewDetails = (note: CreditNote) => {
    setSelectedNote(note);
    setDetailDrawerOpen(true);
  };

  const formFields: FormField[] = [
    {
      name: 'invoiceId',
      label: 'Invoice',
      type: 'select',
      options: invoices.map(inv => ({
        value: String(inv.id),
        label: `${inv.invoiceNumber} - ₹${Number(inv.amount).toLocaleString()}`
      }))
    },
    {
      name: 'doctorId',
      label: 'Doctor (if no invoice)',
      type: 'select',
      options: doctors.map(d => ({ value: String(d.id), label: d.name }))
    },
    {
      name: 'pharmacyId',
      label: 'Pharmacy (if no invoice)',
      type: 'select',
      options: pharmacies.map(p => ({ value: String(p.id), label: p.name }))
    },
    { name: 'amount', label: 'Amount', type: 'currency', required: true },
    {
      name: 'reasonCode', label: 'Reason Category', type: 'select', required: true, options: [
        { value: 'returns', label: 'Product Returns' },
        { value: 'price_adjustment', label: 'Price Adjustment' },
        { value: 'billing_error', label: 'Billing Error' },
        { value: 'near_expiry', label: 'Near Expiry' },
        { value: 'damaged_goods', label: 'Damaged Goods' },
        { value: 'other', label: 'Other' },
      ]
    },
    { name: 'reason', label: 'Reason Details', type: 'textarea', required: true, helpText: 'Provide specific details for this credit note' },
    {
      name: 'gstRecordId',
      label: 'GST/HSN Record',
      type: 'select',
      helpText: 'Link to GST record for reversal tracking',
      options: taxCodes.map(tc => ({
        value: String(tc.id),
        label: `${tc.hsnCode} - ${tc.description} (${tc.gstRate}%)`
      }))
    },
    { name: 'notes', label: 'Internal Notes', type: 'textarea' },
  ];

  const exportColumns = [
    { key: 'creditNoteNumber', label: 'Credit Note #', defaultSelected: true },
    { key: 'amount', label: 'Amount', defaultSelected: true },
    { key: 'reason', label: 'Reason', defaultSelected: true },
    { key: 'reasonCode', label: 'Reason Category', defaultSelected: true },
    { key: 'status', label: 'Status', defaultSelected: true },
    { key: 'gstReversal', label: 'GST Reversal', defaultSelected: true },
    { key: 'createdAt', label: 'Created Date', defaultSelected: true },
  ];

  const columns: Column<CreditNote>[] = [
    { key: 'creditNoteNumber', header: 'Credit Note #', sortable: true, render: (item) => <span className="font-mono" data-testid={`text-cn-number-${item.id}`}>{item.creditNoteNumber}</span> },
    { key: 'invoiceId', header: 'Invoice #', sortable: true, render: (item) => <span data-testid={`text-invoice-${item.id}`}>{getInvoiceNumber(item)}</span> },
    { key: 'customer', header: 'Customer', sortable: true, render: (item) => <span data-testid={`text-customer-${item.id}`}>{getCustomerName(item)}</span> },
    { key: 'amount', header: 'Amount', sortable: true, render: (item) => <span className="font-mono font-medium" data-testid={`text-amount-${item.id}`}>₹{Number(item.amount).toLocaleString()}</span> },
    {
      key: 'reasonCode', header: 'Reason', render: (item) => (
        <Badge variant="outline" data-testid={`badge-reason-${item.id}`}>
          {item.reasonCode ? getReasonLabel(item.reasonCode) : item.reason?.split(' - ')[0] || '-'}
        </Badge>
      )
    },
    { key: 'status', header: 'Status', render: (item) => <span data-testid={`status-${item.id}`}><StatusPill status={item.status} /></span> },
    {
      key: 'gstReversal', header: 'GST', render: (item) => (
        item.gstReversal ? (
          <Badge variant="destructive" className="text-xs" data-testid={`badge-gst-${item.id}`}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            Reversal
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground" data-testid={`text-gst-na-${item.id}`}>-</span>
        )
      )
    },
    {
      key: 'createdById', header: 'Created By', render: (item) => (
        <div className="flex items-center gap-1 text-sm" data-testid={`text-created-by-${item.id}`}>
          <User className="h-3 w-3 text-muted-foreground" />
          {getUserName(item.createdById)}
        </div>
      )
    },
    { key: 'createdAt', header: 'Created Date', sortable: true, render: (item) => <span data-testid={`text-date-${item.id}`}>{new Date(item.createdAt).toLocaleDateString()}</span> },
    {
      key: 'attachments', header: 'Docs', render: (item) => (
        <div className="flex items-center gap-1" data-testid={`docs-count-${item.id}`}>
          <Paperclip className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm" data-testid={`text-docs-count-${item.id}`}>{(item.attachments as string[] || []).length}</span>
        </div>
      )
    },
  ];

  const gstReversalCount = creditNotes.filter(cn => cn.gstReversal).length;
  const gstReversalAmount = creditNotes.filter(cn => cn.gstReversal).reduce((s, cn) => s + Number(cn.gstAmount || 0), 0);

  const stats = [
    { title: 'Total Credit Notes', value: creditNotes.length.toString(), subtitle: 'All time', color: 'blue' as const },
    { title: 'Pending Approval', value: creditNotes.filter(c => c.status === 'draft').length.toString(), subtitle: 'Awaiting review', color: 'yellow' as const },
    { title: 'Total Value', value: `₹${creditNotes.reduce((sum, c) => sum + Number(c.amount), 0).toLocaleString()}`, subtitle: 'All credit notes', color: 'green' as const },
    { title: 'GST Reversals', value: gstReversalCount.toString(), subtitle: gstReversalAmount > 0 ? `₹${gstReversalAmount.toLocaleString()} GST` : 'No reversals', color: 'red' as const },
  ];

  const handleCreate = () => {
    setSelectedNote(null);
    setPendingAttachments([]);
    setIsDrawerOpen(true);
  };

  const handleEdit = (note: CreditNote) => {
    setSelectedNote(note);
    setPendingAttachments([]);
    setIsDrawerOpen(true);
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    const nextNumber = `CN-${new Date().getFullYear()}-${String(creditNotes.length + 1).padStart(4, '0')}`;
    const gstRecordId = data.gstRecordId ? parseInt(data.gstRecordId as string) : null;
    const linkedGst = gstRecordId ? taxCodes.find(tc => tc.id === gstRecordId) : null;
    const amount = parseFloat(data.amount as string);
    const gstAmount = linkedGst ? (amount * Number(linkedGst.gstRate) / (100 + Number(linkedGst.gstRate))) : 0;

    const payload: Record<string, unknown> = {
      creditNoteNumber: selectedNote?.creditNoteNumber || nextNumber,
      invoiceId: data.invoiceId ? parseInt(data.invoiceId as string) : null,
      doctorId: data.doctorId ? parseInt(data.doctorId as string) : null,
      pharmacyId: data.pharmacyId ? parseInt(data.pharmacyId as string) : null,
      amount,
      reason: data.reason,
      reasonCode: data.reasonCode,
      notes: data.notes || null,
      gstReversal: !!gstRecordId,
      gstAmount: gstRecordId ? gstAmount.toFixed(2) : "0",
      gstRecordId,
      status: selectedNote?.status || 'draft',
    };

    if (pendingAttachments.length > 0) {
      const existing = selectedNote ? (selectedNote.attachments as string[] || []) : [];
      payload.attachments = [...existing, ...pendingAttachments];
    }

    if (selectedNote) {
      updateMutation.mutate({ id: selectedNote.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleApprove = (note: CreditNote) => {
    setSelectedNote(note);
    setIsApproveDialogOpen(true);
  };

  const confirmApprove = () => {
    if (selectedNote) {
      updateMutation.mutate({ id: selectedNote.id, data: { status: 'approved', approvedAt: new Date() } });
    }
  };

  const handleApply = (note: CreditNote) => {
    updateMutation.mutate({ id: note.id, data: { status: 'applied', appliedAt: new Date() } });
  };

  const rowActions = [
    { label: 'View Details', onClick: (note: CreditNote) => handleViewDetails(note) },
    { label: 'Edit', onClick: (note: CreditNote) => handleEdit(note), condition: (note: CreditNote) => note.status === 'draft' },
    { label: 'Approve', onClick: (note: CreditNote) => handleApprove(note), condition: (note: CreditNote) => note.status === 'draft' },
    { label: 'Apply to Account', onClick: (note: CreditNote) => handleApply(note), condition: (note: CreditNote) => note.status === 'approved' },
  ];

  const reasonAnalytics = getReasonAnalytics();

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
        title="Credit Notes"
        description="Manage credit notes, adjustments, and GST reversals"
        actions={
          <>
            <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleCreate} data-testid="button-create-credit-note">
              <Plus className="h-4 w-4 mr-2" />
              Create Credit Note
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {creditNotes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card data-testid="card-reason-analytics">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Reason Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              {reasonAnalytics.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="w-48 h-48 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reasonAnalytics}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {reasonAnalytics.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [`${value} notes`, name]}
                          contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {reasonAnalytics.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between text-sm" data-testid={`reason-stat-${index}`}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{item.value}</span>
                          <span className="text-xs text-muted-foreground font-mono">₹{item.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-gst-summary">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                GST Reversal Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Flagged for Reversal</p>
                  <p className="text-2xl font-semibold" data-testid="text-gst-reversal-count">{gstReversalCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GST Amount</p>
                  <p className="text-2xl font-semibold font-mono" data-testid="text-gst-reversal-amount">₹{gstReversalAmount.toLocaleString()}</p>
                </div>
              </div>
              {creditNotes.filter(cn => cn.gstReversal).length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Recent GST Reversals</p>
                  {creditNotes.filter(cn => cn.gstReversal).slice(0, 3).map(cn => {
                    const gstRec = getGstRecord(cn);
                    return (
                      <div key={cn.id} className="flex items-center justify-between text-sm p-2 rounded border" data-testid={`gst-reversal-item-${cn.id}`}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                          <span className="font-mono">{cn.creditNoteNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {gstRec && (
                            <Badge
                              variant="outline"
                              className="text-xs cursor-pointer"
                              onClick={() => navigate('/finance/gst')}
                              data-testid={`badge-hsn-${cn.id}`}
                            >
                              HSN: {gstRec.hsnCode}
                              <ExternalLink className="h-2 w-2 ml-1" />
                            </Badge>
                          )}
                          <span className="font-mono text-destructive">₹{Number(cn.gstAmount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <DataTable
        columns={columns}
        data={creditNotes}
        rowActions={rowActions}
        onRowClick={handleViewDetails}
        emptyMessage="No credit notes found. Create your first credit note to get started."
      />

      <CreateEditDrawer
        open={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); setPendingAttachments([]); }}
        title={selectedNote ? 'Edit Credit Note' : 'Create Credit Note'}
        fields={formFields}
        initialData={selectedNote ? {
          ...selectedNote,
          invoiceId: selectedNote.invoiceId ? String(selectedNote.invoiceId) : '',
          doctorId: selectedNote.doctorId ? String(selectedNote.doctorId) : '',
          pharmacyId: selectedNote.pharmacyId ? String(selectedNote.pharmacyId) : '',
          gstRecordId: selectedNote.gstRecordId ? String(selectedNote.gstRecordId) : '',
          amount: String(selectedNote.amount),
        } : undefined}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={isApproveDialogOpen}
        onOpenChange={setIsApproveDialogOpen}
        title="Approve Credit Note"
        description={`Are you sure you want to approve credit note ${selectedNote?.creditNoteNumber} for ₹${Number(selectedNote?.amount || 0).toLocaleString()}?${selectedNote?.gstReversal ? ' This credit note is flagged for GST reversal.' : ''}`}
        confirmLabel="Approve"
        onConfirm={confirmApprove}
      />

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        entityName="Credit Notes"
        columns={exportColumns}
        totalRecords={creditNotes.length}
      />

      <EntityDetailDrawer
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        title={`Credit Note ${selectedNote?.creditNoteNumber || ''}`}
        entityId={String(selectedNote?.id || '')}
        status={selectedNote?.status}
      >
        {selectedNote && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base">Credit Note Details</CardTitle>
                  <span data-testid="detail-status"><StatusPill status={selectedNote.status} /></span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-mono font-semibold text-lg" data-testid="detail-amount">₹{Number(selectedNote.amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice</p>
                    <p className="font-medium" data-testid="detail-invoice">{getInvoiceNumber(selectedNote)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium" data-testid="detail-customer">{getCustomerName(selectedNote)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reason Category</p>
                    <Badge variant="outline" data-testid="detail-reason-category">{selectedNote.reasonCode ? getReasonLabel(selectedNote.reasonCode) : '-'}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reason Details</p>
                  <p className="mt-1 text-sm" data-testid="detail-reason">{selectedNote.reason}</p>
                </div>
                {selectedNote.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Internal Notes</p>
                    <p className="mt-1 text-sm bg-muted p-2 rounded" data-testid="detail-notes">{selectedNote.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedNote.gstReversal && (
              <Card className="border-destructive/30" data-testid="card-gst-reversal">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    GST Reversal Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">GST Amount</p>
                      <p className="font-mono font-semibold" data-testid="detail-gst-amount">₹{Number(selectedNote.gstAmount || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Linked GST Record</p>
                      {(() => {
                        const gstRec = getGstRecord(selectedNote);
                        return gstRec ? (
                          <div className="flex items-center gap-1" data-testid="detail-gst-record">
                            <Badge
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => navigate('/finance/gst')}
                              data-testid="link-gst-record"
                            >
                              HSN: {gstRec.hsnCode}
                              <ExternalLink className="h-2 w-2 ml-1" />
                            </Badge>
                            <span className="text-sm text-muted-foreground">({gstRec.gstRate}%)</span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground" data-testid="detail-gst-no-record">No record linked</p>
                        );
                      })()}
                    </div>
                  </div>
                  {(() => {
                    const gstRec = getGstRecord(selectedNote);
                    return gstRec ? (
                      <div className="bg-muted p-3 rounded space-y-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Tax Breakdown</p>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div data-testid="detail-cgst">
                            <span className="text-muted-foreground">CGST:</span>{' '}
                            <span className="font-mono">{gstRec.cgst}%</span>
                          </div>
                          <div data-testid="detail-sgst">
                            <span className="text-muted-foreground">SGST:</span>{' '}
                            <span className="font-mono">{gstRec.sgst}%</span>
                          </div>
                          <div data-testid="detail-igst">
                            <span className="text-muted-foreground">IGST:</span>{' '}
                            <span className="font-mono">{gstRec.igst}%</span>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}

            <Card data-testid="card-audit-trail">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative" data-testid="audit-timeline-container">
                  {buildAuditTimeline(selectedNote).map((step, index, arr) => (
                    <div
                      key={step.id}
                      className={`relative flex gap-3 pb-6 cursor-pointer ${index === arr.length - 1 ? 'pb-0' : ''}`}
                      data-testid={`audit-step-${step.id}`}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          step.completed
                            ? step.icon === 'cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {step.icon === 'created' && <User className="h-4 w-4" />}
                          {step.icon === 'approved' && <CheckCircle className="h-4 w-4" />}
                          {step.icon === 'applied' && <ArrowRight className="h-4 w-4" />}
                          {step.icon === 'cancelled' && <XCircle className="h-4 w-4" />}
                        </div>
                        {index < arr.length - 1 && (
                          <div className={`w-px flex-1 mt-1 ${step.completed ? 'bg-primary/30' : 'bg-border'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-medium ${step.completed ? '' : 'text-muted-foreground'}`}>
                            {step.label}
                          </p>
                          {step.current && (
                            <Badge variant="outline" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span data-testid={`audit-user-${step.id}`}>{step.user}</span>
                          </div>
                          {step.timestamp && (
                            <span className="text-xs text-muted-foreground" data-testid={`audit-time-${step.id}`}>
                              {new Date(step.timestamp).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-attachments">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Supporting Documents
                  </CardTitle>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    data-testid="input-file-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-upload-document"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    Upload
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(selectedNote.attachments as string[] || []).length > 0 ? (
                  <div className="space-y-2" data-testid="attachments-list">
                    {(selectedNote.attachments as string[]).map((attachment, index) => {
                      const filename = attachment.split('/').pop() || attachment;
                      return (
                        <div key={index} className="flex items-center justify-between p-2 border rounded" data-testid={`attachment-item-${index}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate" data-testid={`text-attachment-${index}`}>{filename}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(`/api/uploads/${attachment}`, '_blank')}
                            data-testid={`button-view-attachment-${index}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-attachments">No documents attached. Upload supporting files like invoices, return forms, or approval letters.</p>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2 justify-end flex-wrap">
              {selectedNote.status === 'draft' && (
                <>
                  <Button variant="outline" onClick={() => { setDetailDrawerOpen(false); handleEdit(selectedNote); }} data-testid="button-edit">
                    Edit
                  </Button>
                  <Button onClick={() => { setDetailDrawerOpen(false); handleApprove(selectedNote); }} data-testid="button-approve">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
              {selectedNote.status === 'approved' && (
                <Button onClick={() => { setDetailDrawerOpen(false); handleApply(selectedNote); }} data-testid="button-apply">
                  Apply to Account
                </Button>
              )}
            </div>
          </div>
        )}
      </EntityDetailDrawer>
    </div>
  );
}
