import { cn } from '@/lib/utils';

interface StatusPillProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  // General
  'Draft': 'bg-muted text-muted-foreground',
  'Pending': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'Pending Approval': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'Approved': 'bg-success/15 text-success',
  'Rejected': 'bg-destructive/15 text-destructive',
  'Active': 'bg-success/15 text-success',
  'Inactive': 'bg-muted text-muted-foreground',
  'Scheduled': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',

  // Orders
  'Picking': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'Packed': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'Delivered': 'bg-success/15 text-success',
  'Failed': 'bg-destructive/15 text-destructive',
  'Cancelled': 'bg-muted text-muted-foreground',
  'Returned': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',

  // Shipments
  'Ready for Dispatch': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'In Transit': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'Out for Delivery': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  'Dispatched': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',

  // Transfers
  'Pending Dispatch': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'Completed': 'bg-success/15 text-success',

  // GRN
  'Pending Verification': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',

  // Finance
  'Paid': 'bg-success/15 text-success',
  'Overdue': 'bg-destructive/15 text-destructive',
  'Partial': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',

  // Leads — all stages with explicit, visible colors
  'New': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'Contacted': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Qualified': 'bg-success/15 text-success',
  'Proposal': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'Negotiation': 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'Sent to MR': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'Converted': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Won': 'bg-success/15 text-success',
  'Lost': 'bg-destructive/15 text-destructive',

  // Priority
  'High': 'bg-destructive/15 text-destructive',
  'Medium': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'Low': 'bg-muted text-muted-foreground',

  // Import jobs (lowercase from backend)
  'completed': 'bg-success/15 text-success',
  'failed': 'bg-destructive/15 text-destructive',
  'processing': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'pending': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'completed_with_errors': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

const statusLabels: Record<string, string> = {
  'completed_with_errors': 'Partial Success',
};

export function getStatusStyle(status: string): string {
  return statusStyles[status] || 'bg-muted text-muted-foreground';
}

export function StatusPill({ status, className }: StatusPillProps) {
  const style = getStatusStyle(status);
  const label = statusLabels[status] || status;

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      style,
      className
    )}>
      {label}
    </span>
  );
}
