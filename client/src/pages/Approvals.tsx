import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, Search, Loader2, Eye, ArrowRight, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { PageHeader } from '@/components/shared/PageHeader';
import { EntityDetailDrawer } from '@/components/shared/EntityDetailDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import type { Approval, User } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getTypeBadgeClass(type: string) {
  switch (type) {
    case 'Credit Limit': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'Price Override': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'Stock Adjustment': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'Return Request': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'Discount Override': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'Order Exception': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

export default function Approvals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    approval: Approval | null;
    action: 'approve' | 'reject';
  }>({ open: false, approval: null, action: 'approve' });

  const { data: approvals = [], isLoading } = useQuery<Approval[]>({
    queryKey: ['/api/approvals'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const getUserName = (userId: number | null | undefined) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user ? user.name || user.username : `User #${userId}`;
  };

  const updateApprovalMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: number; status: string; reason?: string }) => {
      return apiRequest('PATCH', `/api/approvals/${id}`, { status, approvalReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
    },
  });

  const filteredApprovals = approvals.filter(approval => {
    if (statusFilter !== 'all' && approval.status !== statusFilter) return false;
    if (typeFilter !== 'all' && approval.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        String(approval.id).includes(query) ||
        approval.entityType.toLowerCase().includes(query) ||
        approval.type.toLowerCase().includes(query) ||
        (approval.requestReason || '').toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleAction = (approval: Approval, action: 'approve' | 'reject') => {
    setConfirmDialog({ open: true, approval, action });
  };

  const confirmAction = (reason?: string) => {
    if (!confirmDialog.approval) return;

    const newStatus = confirmDialog.action === 'approve' ? 'Approved' : 'Rejected';
    updateApprovalMutation.mutate(
      { id: confirmDialog.approval.id, status: newStatus, reason },
      {
        onSuccess: () => {
          toast({
            title: confirmDialog.action === 'approve' ? 'Approved' : 'Rejected',
            description: `${confirmDialog.approval?.type} request has been ${confirmDialog.action === 'approve' ? 'approved' : 'rejected'}.`,
          });
          setConfirmDialog({ open: false, approval: null, action: 'approve' });
          if (selectedApproval?.id === confirmDialog.approval?.id) {
            setSelectedApproval(null);
          }
        },
        onError: () => {
          toast({
            title: 'Error',
            description: `Failed to ${confirmDialog.action} the request. Please try again.`,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (item: Approval) => (
        <span data-testid={`text-approval-id-${item.id}`} className="font-mono text-xs">APR-{item.id}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (item: Approval) => (
        <Badge data-testid={`badge-approval-type-${item.id}`} variant="secondary" className={getTypeBadgeClass(item.type)}>
          {item.type}
        </Badge>
      ),
    },
    {
      key: 'entityType',
      header: 'Entity',
      render: (item: Approval) => (
        <span data-testid={`text-approval-entity-${item.id}`} className="font-mono text-xs capitalize">{item.entityType} #{item.entityId}</span>
      ),
    },
    {
      key: 'change',
      header: 'Change',
      render: (item: Approval) => (
        <div data-testid={`text-approval-change-${item.id}`} className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">{item.beforeValue || 'N/A'}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="font-medium">{item.afterValue || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'requestReason',
      header: 'Reason',
      render: (item: Approval) => (
        <span data-testid={`text-approval-reason-${item.id}`} className="text-sm text-muted-foreground max-w-[200px] truncate block">
          {item.requestReason || '-'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Requested',
      render: (item: Approval) => (
        <span data-testid={`text-approval-date-${item.id}`} className="text-xs text-muted-foreground">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Approval) => (
        <span data-testid={`status-approval-${item.id}`}>
          <StatusPill status={item.status} />
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Approval) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedApproval(item);
            }}
            data-testid={`button-view-approval-${item.id}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {item.status === 'Pending' && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="text-success"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(item, 'approve');
                }}
                data-testid={`button-approve-${item.id}`}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(item, 'reject');
                }}
                data-testid={`button-reject-${item.id}`}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const pendingCount = approvals.filter(a => a.status === 'Pending').length;
  const approvedCount = approvals.filter(a => a.status === 'Approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'Rejected').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loader-approvals">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Approvals"
        description="Review and manage pending approval requests"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer ${statusFilter === 'Pending' ? 'ring-2 ring-warning' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'all' : 'Pending')}
          data-testid="card-pending-count"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p data-testid="text-pending-count" className="text-2xl font-display font-semibold mt-2">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer ${statusFilter === 'Approved' ? 'ring-2 ring-success' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'Approved' ? 'all' : 'Approved')}
          data-testid="card-approved-count"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-sm font-medium">Approved</span>
            </div>
            <p data-testid="text-approved-count" className="text-2xl font-display font-semibold mt-2">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer ${statusFilter === 'Rejected' ? 'ring-2 ring-destructive' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'Rejected' ? 'all' : 'Rejected')}
          data-testid="card-rejected-count"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium">Rejected</span>
            </div>
            <p data-testid="text-rejected-count" className="text-2xl font-display font-semibold mt-2">{rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, type, entity, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-approvals"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Credit Limit">Credit Limit</SelectItem>
              <SelectItem value="Price Override">Price Override</SelectItem>
              <SelectItem value="Stock Adjustment">Stock Adjustment</SelectItem>
              <SelectItem value="Return Request">Return Request</SelectItem>
              <SelectItem value="Discount Override">Discount Override</SelectItem>
              <SelectItem value="Order Exception">Order Exception</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredApprovals.length === 0 ? (
        <Card data-testid="empty-approvals">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No approvals found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {statusFilter !== 'all' || typeFilter !== 'all' || searchQuery
                ? 'Try adjusting your filters or search query'
                : 'Approval requests will appear here when created'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={filteredApprovals}
          columns={columns}
          onRowClick={(item) => setSelectedApproval(item)}
        />
      )}

      <EntityDetailDrawer
        open={!!selectedApproval}
        onClose={() => setSelectedApproval(null)}
        title={selectedApproval?.type || 'Approval'}
        entityId={selectedApproval ? `APR-${selectedApproval.id}` : ''}
        status={selectedApproval?.status}
        actions={selectedApproval?.status === 'Pending' ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-success"
              onClick={() => selectedApproval && handleAction(selectedApproval, 'approve')}
              data-testid="button-drawer-approve"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => selectedApproval && handleAction(selectedApproval, 'reject')}
              data-testid="button-drawer-reject"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </>
        ) : undefined}
      >
        {selectedApproval && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Type</p>
                <Badge data-testid="text-drawer-type" variant="secondary" className={getTypeBadgeClass(selectedApproval.type)}>
                  {selectedApproval.type}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                <span data-testid="text-drawer-status">
                  <StatusPill status={selectedApproval.status} />
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Entity Type</p>
                <p data-testid="text-drawer-entity-type" className="text-sm font-medium capitalize">{selectedApproval.entityType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Entity ID</p>
                <p data-testid="text-drawer-entity-id" className="text-sm font-mono">#{selectedApproval.entityId}</p>
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Change Details</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-3 rounded-md bg-destructive/5 border border-destructive/10">
                    <p className="text-xs text-muted-foreground mb-1">Before</p>
                    <p data-testid="text-drawer-before" className="text-sm font-medium">{selectedApproval.beforeValue || 'N/A'}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 p-3 rounded-md bg-success/5 border border-success/10">
                    <p className="text-xs text-muted-foreground mb-1">After</p>
                    <p data-testid="text-drawer-after" className="text-sm font-medium">{selectedApproval.afterValue || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Request Reason</p>
              <p data-testid="text-drawer-request-reason" className="text-sm">
                {selectedApproval.requestReason || 'No reason provided'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {selectedApproval.requestedById && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Requested By</p>
                  <p data-testid="text-drawer-requested-by" className="text-sm font-medium">
                    {getUserName(selectedApproval.requestedById)}
                  </p>
                </div>
              )}
              {selectedApproval.approvedById && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {selectedApproval.status === 'Rejected' ? 'Rejected By' : 'Approved By'}
                  </p>
                  <p data-testid="text-drawer-approved-by" className="text-sm font-medium">
                    {getUserName(selectedApproval.approvedById)}
                  </p>
                </div>
              )}
            </div>

            {selectedApproval.approvalReason && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {selectedApproval.status === 'Rejected' ? 'Rejection Reason' : 'Approval Notes'}
                </p>
                <p data-testid="text-drawer-approval-reason" className="text-sm">{selectedApproval.approvalReason}</p>
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Timestamps</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p data-testid="text-drawer-created" className="text-sm">{formatDate(selectedApproval.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Updated</p>
                    <p data-testid="text-drawer-updated" className="text-sm">{formatDate(selectedApproval.updatedAt)}</p>
                  </div>
                </div>
              </div>
              {selectedApproval.approvedAt && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {selectedApproval.status === 'Rejected' ? 'Rejected At' : 'Approved At'}
                    </p>
                    <p data-testid="text-drawer-approved-at" className="text-sm">{formatDate(selectedApproval.approvedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </EntityDetailDrawer>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.action === 'approve' ? 'Approve Request' : 'Reject Request'}
        description={`Are you sure you want to ${confirmDialog.action} this ${confirmDialog.approval?.type} request?`}
        onConfirm={confirmAction}
        confirmLabel={confirmDialog.action === 'approve' ? 'Approve' : 'Reject'}
        destructive={confirmDialog.action === 'reject'}
        requireReason={confirmDialog.action === 'reject'}
      />
    </div>
  );
}
