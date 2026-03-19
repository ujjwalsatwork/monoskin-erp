import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill } from '@/components/shared/StatusPill';
import { ExportModal } from '@/components/shared/ExportModal';
import { RowActionsMenu } from '@/components/shared/RowActionsMenu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Download, Phone, Mail, Loader2, FileText, Calendar, MessageSquare, User, Eye, StickyNote, UserPlus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface NoteEntry {
  text: string;
  userId: number;
  timestamp: string;
}

interface AgeingRecord {
  customerId: number;
  customerName: string;
  customerType: 'doctor' | 'pharmacy';
  totalOutstanding: number;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days90Plus: number;
  lastPaymentDate: string | null;
  creditLimit: number;
  collectionOwnerId?: number | null;
  collectionOwnerName?: string | null;
  notes?: NoteEntry[];
  lastInteractionDate?: string | null;
}

interface UserRecord {
  id: number;
  username: string;
  fullName?: string;
  role?: string;
}

const chartColors = {
  current: 'hsl(var(--primary))',
  moderate: 'hsl(var(--muted-foreground))',
  warning: 'hsl(var(--destructive) / 0.7)',
  critical: 'hsl(var(--destructive))',
};

export default function ARAgeing() {
  const { toast } = useToast();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AgeingRecord | null>(null);
  const [followUpNote, setFollowUpNote] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');

  const { data: records = [], isLoading, isError } = useQuery<AgeingRecord[]>({
    queryKey: ['/api/ar-ageing'],
  });

  const { data: users = [] } = useQuery<UserRecord[]>({
    queryKey: ['/api/users'],
  });

  interface InvoiceSummary {
    id: number;
    invoiceNumber: string;
    amount: number;
    paidAmount: number;
    outstanding: number;
    dueDate: string;
    status: string;
  }

  const { data: customerInvoices = [], isLoading: invoicesLoading } = useQuery<InvoiceSummary[]>({
    queryKey: ['/api/ar-ageing', selectedRecord?.customerType, selectedRecord?.customerId, 'invoices'],
    queryFn: async () => {
      if (!selectedRecord) return [];
      const res = await fetch(`/api/ar-ageing/${selectedRecord.customerType}/${selectedRecord.customerId}/invoices`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedRecord && detailDrawerOpen,
  });

  useEffect(() => {
    if (selectedRecord && records.length > 0) {
      const updated = records.find(r => r.customerId === selectedRecord.customerId && r.customerType === selectedRecord.customerType);
      if (updated && (updated.collectionOwnerName !== selectedRecord.collectionOwnerName || (updated.notes?.length || 0) !== (selectedRecord.notes?.length || 0))) {
        setSelectedRecord(updated);
      }
    }
  }, [records, selectedRecord]);

  const assignOwnerMutation = useMutation({
    mutationFn: async ({ customerId, customerType, collectionOwnerId }: { customerId: number; customerType: string; collectionOwnerId: number | null }) => {
      return apiRequest('PUT', `/api/ar-collection-accounts/${customerType}/${customerId}`, { collectionOwnerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar-ageing'] });
      toast({ title: 'Owner Assigned', description: 'Collection owner has been updated.' });
      setOwnerDialogOpen(false);
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ customerId, customerType, text }: { customerId: number; customerType: string; text: string }) => {
      return apiRequest('POST', `/api/ar-collection-accounts/${customerType}/${customerId}/notes`, { text, userId: 0 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar-ageing'] });
      toast({ title: 'Note Added', description: 'Follow-up note has been saved.' });
      setNotesDialogOpen(false);
      setFollowUpNote('');
    },
  });

  const handleExportPDF = () => {
    window.open('/api/ar-ageing/export-pdf', '_blank');
  };

  const handleAddFollowUpNote = () => {
    if (!selectedRecord || !followUpNote.trim()) return;
    addNoteMutation.mutate({
      customerId: selectedRecord.customerId,
      customerType: selectedRecord.customerType,
      text: followUpNote.trim(),
    });
  };

  const handleAssignOwner = () => {
    if (!selectedRecord) return;
    const ownerId = selectedOwnerId === 'unassigned' ? null : parseInt(selectedOwnerId);
    assignOwnerMutation.mutate({
      customerId: selectedRecord.customerId,
      customerType: selectedRecord.customerType,
      collectionOwnerId: ownerId,
    });
  };

  const openOwnerDialog = (record: AgeingRecord) => {
    setSelectedRecord(record);
    setSelectedOwnerId(record.collectionOwnerId ? String(record.collectionOwnerId) : 'unassigned');
    setOwnerDialogOpen(true);
  };

  const totalOutstanding = records.reduce((sum, r) => sum + r.totalOutstanding, 0);
  const totalCurrent = records.reduce((sum, r) => sum + r.current, 0);
  const total30Days = records.reduce((sum, r) => sum + r.days30, 0);
  const total60Days = records.reduce((sum, r) => sum + r.days60, 0);
  const total90Days = records.reduce((sum, r) => sum + r.days90, 0);
  const total90Plus = records.reduce((sum, r) => sum + r.days90Plus, 0);

  const getRiskLevel = (record: AgeingRecord): 'low' | 'medium' | 'high' => {
    if (record.totalOutstanding <= 0) return 'low';
    const overduePercentage = (record.days60 + record.days90 + record.days90Plus) / record.totalOutstanding;
    if (overduePercentage > 0.5 || record.days90Plus > 0) return 'high';
    if (overduePercentage > 0.25 || record.days60 > 0) return 'medium';
    return 'low';
  };

  const exportColumns = [
    { key: 'customerName', label: 'Customer', defaultSelected: true },
    { key: 'customerType', label: 'Type', defaultSelected: true },
    { key: 'totalOutstanding', label: 'Total Outstanding', defaultSelected: true },
    { key: 'current', label: 'Current' },
    { key: 'days30', label: '1-30 Days' },
    { key: 'days60', label: '31-60 Days' },
    { key: 'days90', label: '61-90 Days' },
    { key: 'days90Plus', label: '90+ Days' },
    { key: 'creditLimit', label: 'Credit Limit' },
    { key: 'lastPaymentDate', label: 'Last Payment' },
    { key: 'collectionOwnerName', label: 'Collection Owner' },
  ];

  const columns: Column<AgeingRecord & { id: number }>[] = [
    { key: 'customerName', header: 'Customer', sortable: true, render: (item) => (
      <div data-testid={`text-customer-${item.customerId}`}>
        <span className="font-medium">{item.customerName}</span>
        {item.collectionOwnerName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <User className="h-3 w-3" />
            <span data-testid={`text-owner-${item.customerId}`}>{item.collectionOwnerName}</span>
          </div>
        )}
      </div>
    )},
    { key: 'customerType', header: 'Type', render: (item) => <Badge variant="outline" className="capitalize" data-testid={`badge-type-${item.customerId}`}>{item.customerType}</Badge> },
    { key: 'totalOutstanding', header: 'Total Outstanding', sortable: true, render: (item) => <span className="font-mono font-semibold" data-testid={`text-total-${item.customerId}`}>₹{item.totalOutstanding.toLocaleString()}</span> },
    { key: 'current', header: 'Current', render: (item) => <span className="font-mono" data-testid={`text-current-${item.customerId}`}>₹{item.current.toLocaleString()}</span> },
    { key: 'days30', header: '1-30 Days', render: (item) => <span className="font-mono text-muted-foreground" data-testid={`text-days30-${item.customerId}`}>₹{item.days30.toLocaleString()}</span> },
    { key: 'days60', header: '31-60 Days', render: (item) => <span className="font-mono text-muted-foreground" data-testid={`text-days60-${item.customerId}`}>₹{item.days60.toLocaleString()}</span> },
    { key: 'days90', header: '61-90 Days', render: (item) => <span className="font-mono text-destructive/70" data-testid={`text-days90-${item.customerId}`}>₹{item.days90.toLocaleString()}</span> },
    { key: 'days90Plus', header: '90+ Days', render: (item) => <span className="font-mono text-destructive font-semibold" data-testid={`text-days90plus-${item.customerId}`}>₹{item.days90Plus.toLocaleString()}</span> },
    { key: 'lastInteractionDate', header: 'Last Interaction', render: (item) => (
      <span className="text-sm text-muted-foreground" data-testid={`text-last-interaction-${item.customerId}`}>
        {item.lastInteractionDate ? new Date(item.lastInteractionDate).toLocaleDateString() : 'Never'}
      </span>
    )},
    { key: 'riskLevel', header: 'Risk', render: (item) => <span data-testid={`status-risk-${item.customerId}`}><StatusPill status={getRiskLevel(item)} /></span> },
    { key: 'actions', header: '', render: (item) => (
      <RowActionsMenu
        testId={`button-actions-${item.customerId}`}
        actions={[
          { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => { setSelectedRecord(item); setDetailDrawerOpen(true); }, testId: `menu-item-view-${item.customerId}` },
          { label: 'Assign Owner', icon: <UserPlus className="h-4 w-4" />, onClick: () => openOwnerDialog(item), testId: `menu-item-assign-${item.customerId}` },
          { label: 'Add Follow-up Note', icon: <StickyNote className="h-4 w-4" />, onClick: () => { setSelectedRecord(item); setNotesDialogOpen(true); }, testId: `menu-item-note-${item.customerId}` },
          { label: 'Call Customer', icon: <Phone className="h-4 w-4" />, onClick: () => handleCall(item), testId: `menu-item-call-${item.customerId}` },
          { label: 'Send Reminder', icon: <Mail className="h-4 w-4" />, onClick: () => handleEmail(item), testId: `menu-item-email-${item.customerId}` },
        ]}
      />
    )},
  ];

  const stats = [
    { title: 'Total Outstanding', value: `₹${(totalOutstanding / 100000).toFixed(1)}L`, subtitle: 'All customers', color: 'blue' as const },
    { title: 'Current', value: `₹${(totalCurrent / 100000).toFixed(1)}L`, subtitle: 'Not overdue', color: 'green' as const },
    { title: 'Overdue (30-60)', value: `₹${((total30Days + total60Days) / 100000).toFixed(1)}L`, subtitle: 'Moderate risk', color: 'yellow' as const },
    { title: 'Critical (90+)', value: `₹${(total90Plus / 100000).toFixed(1)}L`, subtitle: 'High risk', color: 'pink' as const },
  ];

  const chartData = [
    { name: 'Current', value: totalCurrent },
    { name: '1-30 Days', value: total30Days },
    { name: '31-60 Days', value: total60Days },
    { name: '61-90 Days', value: total90Days },
    { name: '90+ Days', value: total90Plus },
  ];

  const pieData = [
    { name: 'Current', value: totalCurrent },
    { name: '1-60 Days', value: total30Days + total60Days },
    { name: '61-90 Days', value: total90Days },
    { name: '90+ Days', value: total90Plus },
  ].filter(d => d.value > 0);

  const handleCall = (record: AgeingRecord) => {
    toast({ title: 'Calling...', description: `Opening phone for ${record.customerName}` });
  };

  const handleEmail = (record: AgeingRecord) => {
    toast({ title: 'Opening Email', description: `Sending reminder to ${record.customerName}` });
  };

  const notesForSelected = selectedRecord?.notes || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="AR Ageing Report" description="Track accounts receivable by aging buckets" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-center gap-3 pt-8">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <p className="font-semibold text-lg">Failed to load AR Ageing data</p>
              <p className="text-sm text-muted-foreground mt-1">Please check your connection or contact your administrator.</p>
            </div>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/ar-ageing'] })} data-testid="button-retry">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="AR Ageing Report"
        description="Track accounts receivable by aging buckets"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF} data-testid="button-export-pdf">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {records.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ageing Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v/1000)}K`} />
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => {
                        const colors = [chartColors.current, chartColors.moderate, chartColors.warning, chartColors.critical];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <DataTable
        columns={columns}
        data={records.map(r => ({ ...r, id: r.customerId }))}
        emptyMessage="No outstanding receivables found. All invoices are paid!"
      />

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        entityName="AR Ageing Report"
        columns={exportColumns}
        totalRecords={records.length}
      />

      {/* Detail Drawer */}
      <Sheet open={detailDrawerOpen} onOpenChange={setDetailDrawerOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle data-testid="detail-title">{selectedRecord?.customerName}</SheetTitle>
          </SheetHeader>
          {selectedRecord && (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div data-testid="detail-type">
                  <Label className="text-muted-foreground">Customer Type</Label>
                  <p className="font-medium capitalize">{selectedRecord.customerType}</p>
                </div>
                <div data-testid="detail-credit-limit">
                  <Label className="text-muted-foreground">Credit Limit</Label>
                  <p className="font-medium">₹{selectedRecord.creditLimit.toLocaleString()}</p>
                </div>
                <div data-testid="detail-total-outstanding">
                  <Label className="text-muted-foreground">Total Outstanding</Label>
                  <p className="font-medium text-lg">₹{selectedRecord.totalOutstanding.toLocaleString()}</p>
                </div>
                <div data-testid="detail-last-payment">
                  <Label className="text-muted-foreground">Last Payment</Label>
                  <p className="font-medium">{selectedRecord.lastPaymentDate ? new Date(selectedRecord.lastPaymentDate).toLocaleDateString() : 'Never'}</p>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg" data-testid="detail-collection-owner">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Collection Owner</Label>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openOwnerDialog(selectedRecord)} data-testid="button-change-owner">
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> Change
                  </Button>
                </div>
                <p className="text-sm">{selectedRecord.collectionOwnerName || 'Not Assigned'}</p>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg" data-testid="detail-last-interaction">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-medium">Last Interaction</Label>
                </div>
                <p className="text-sm">{selectedRecord.lastInteractionDate ? new Date(selectedRecord.lastInteractionDate).toLocaleString() : 'No interactions recorded'}</p>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg" data-testid="detail-follow-up-notes">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Follow-up Notes ({notesForSelected.length})</Label>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setNotesDialogOpen(true)} data-testid="button-add-note">
                    Add Note
                  </Button>
                </div>
                {notesForSelected.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {[...notesForSelected].reverse().map((note, idx) => (
                      <div key={idx} className="text-sm border-l-2 border-primary/30 pl-2 py-1" data-testid={`note-entry-${idx}`}>
                        <p>{note.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(note.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2" data-testid="detail-invoice-summary">
                <Label className="font-medium">Outstanding Invoices ({customerInvoices.length})</Label>
                {invoicesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading invoices...
                  </div>
                ) : customerInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No outstanding invoices</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {customerInvoices.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30" data-testid={`invoice-row-${inv.id}`}>
                        <div>
                          <span className="font-mono font-medium">{inv.invoiceNumber}</span>
                          <span className="text-xs text-muted-foreground ml-2">Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-semibold">₹{inv.outstanding.toLocaleString()}</span>
                          <Badge variant="outline" className="ml-2 text-xs">{inv.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2" data-testid="detail-ageing-breakdown">
                <Label className="font-medium">Ageing Breakdown</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <span className="text-muted-foreground">Current</span>
                    <p className="font-mono font-medium">₹{selectedRecord.current.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <span className="text-muted-foreground">1-30 Days</span>
                    <p className="font-mono font-medium">₹{selectedRecord.days30.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                    <span className="text-muted-foreground">31-60 Days</span>
                    <p className="font-mono font-medium">₹{selectedRecord.days60.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <span className="text-muted-foreground">61-90 Days</span>
                    <p className="font-mono font-medium">₹{selectedRecord.days90.toLocaleString()}</p>
                  </div>
                  <div className="col-span-2 p-2 bg-destructive/10 rounded">
                    <span className="text-muted-foreground">90+ Days</span>
                    <p className="font-mono font-semibold text-destructive">₹{selectedRecord.days90Plus.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handleCall(selectedRecord)} data-testid="button-call-drawer">
                  <Phone className="h-4 w-4 mr-2" /> Call
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => handleEmail(selectedRecord)} data-testid="button-email-drawer">
                  <Mail className="h-4 w-4 mr-2" /> Send Reminder
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Follow-up Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Follow-up Note</DialogTitle>
            <DialogDescription>
              Add a note for {selectedRecord?.customerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Note</Label>
              <Textarea
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="Enter follow-up details..."
                rows={4}
                data-testid="input-follow-up-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)} data-testid="button-cancel-note">Cancel</Button>
            <Button onClick={handleAddFollowUpNote} disabled={!followUpNote.trim() || addNoteMutation.isPending} data-testid="button-save-note">
              {addNoteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Owner Dialog */}
      <Dialog open={ownerDialogOpen} onOpenChange={setOwnerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Collection Owner</DialogTitle>
            <DialogDescription>
              Assign a team member to manage collections for {selectedRecord?.customerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Collection Owner</Label>
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                <SelectTrigger data-testid="select-owner">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={String(user.id)} data-testid={`option-owner-${user.id}`}>
                      {user.fullName || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOwnerDialogOpen(false)} data-testid="button-cancel-owner">Cancel</Button>
            <Button onClick={handleAssignOwner} disabled={assignOwnerMutation.isPending} data-testid="button-save-owner">
              {assignOwnerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
