import { useState } from 'react';
import { Download, Loader2, CheckCircle, XCircle, RefreshCw, FileSpreadsheet, Clock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ExportCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExportJob {
  id: string;
  name: string;
  type: 'csv' | 'xlsx' | 'pdf';
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

const mockJobs: ExportJob[] = [
  { id: 'EXP001', name: 'Orders Report - Dec 2024', type: 'xlsx', status: 'completed', createdAt: '2024-12-16T10:30:00', completedAt: '2024-12-16T10:31:15' },
  { id: 'EXP002', name: 'Inventory Master', type: 'csv', status: 'running', progress: 65, createdAt: '2024-12-16T11:00:00' },
  { id: 'EXP003', name: 'AR Ageing Report', type: 'pdf', status: 'queued', createdAt: '2024-12-16T11:05:00' },
  { id: 'EXP004', name: 'Doctor List Export', type: 'csv', status: 'failed', createdAt: '2024-12-16T09:00:00', error: 'Permission denied for masked fields' },
];

const statusConfig = {
  queued: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
  running: { icon: Loader2, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/30' },
  completed: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
  failed: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

export function ExportCenter({ open, onOpenChange }: ExportCenterProps) {
  const [jobs] = useState<ExportJob[]>(mockJobs);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[400px] md:w-[480px]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Center
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="space-y-3 pr-4">
            {jobs.map((job) => {
              const { icon: StatusIcon, color, bg } = statusConfig[job.status];
              
              return (
                <div
                  key={job.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-md', bg)}>
                      <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{job.name}</p>
                        <span className="text-xs font-mono text-muted-foreground uppercase">
                          {job.type}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <StatusIcon className={cn(
                          'h-4 w-4',
                          color,
                          job.status === 'running' && 'animate-spin'
                        )} />
                        <span className={cn('text-xs capitalize', color)}>
                          {job.status}
                          {job.status === 'running' && job.progress && ` (${job.progress}%)`}
                        </span>
                      </div>

                      {job.status === 'running' && job.progress && (
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      )}

                      {job.error && (
                        <p className="text-xs text-destructive mt-2">{job.error}</p>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        Started at {formatTime(job.createdAt)}
                        {job.completedAt && ` • Completed at ${formatTime(job.completedAt)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    {job.status === 'completed' && (
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    )}
                    {job.status === 'failed' && (
                      <Button size="sm" variant="outline">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
