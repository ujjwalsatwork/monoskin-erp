import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DiffChange {
  field: string;
  label?: string;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
}

// Alias for backwards compatibility
export type DiffItem = DiffChange;

interface AuditDiffViewerProps {
  changes: DiffChange[];
  className?: string;
}

export function AuditDiffViewer({ changes, className }: AuditDiffViewerProps) {
  const formatValue = (value: string | number | boolean | null) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString('en-IN');
    return String(value);
  };

  if (changes.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground text-center py-4', className)}>
        No changes detected
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {changes.map((change, index) => (
        <div key={index} className="rounded-lg border bg-muted/20 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">{change.label}</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 p-2 rounded bg-destructive/10 border border-destructive/20">
              <p className="text-sm font-mono text-destructive line-through">
                {formatValue(change.before)}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 p-2 rounded bg-success/10 border border-success/20">
              <p className="text-sm font-mono text-success">
                {formatValue(change.after)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Utility to compute diff between two objects
export function computeDiff(
  before: Record<string, any>,
  after: Record<string, any>,
  fieldLabels: Record<string, string>
): DiffItem[] {
  const changes: DiffItem[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  allKeys.forEach(key => {
    const beforeVal = before[key];
    const afterVal = after[key];
    
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes.push({
        field: key,
        label: fieldLabels[key] || key,
        before: beforeVal,
        after: afterVal,
      });
    }
  });
  
  return changes;
}
