import { CheckCircle, Clock, AlertCircle, User, FileText, Package, Truck, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineEvent {
  id: string;
  type: 'status' | 'action' | 'note' | 'system';
  title: string;
  description?: string;
  user?: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error' | 'info';
}

interface EntityTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const typeIcons = {
  status: CheckCircle,
  action: Package,
  note: FileText,
  system: Clock,
};

const statusColors = {
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  error: 'bg-destructive text-destructive-foreground',
  info: 'bg-accent text-accent-foreground',
};

export function EntityTimeline({ events, className }: EntityTimelineProps) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {events.map((event, index) => {
        const Icon = typeIcons[event.type];
        const isLast = index === events.length - 1;

        return (
          <div key={event.id} className="relative flex gap-4">
            {/* Line */}
            {!isLast && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
            )}

            {/* Icon */}
            <div className={cn(
              'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background',
              event.status ? statusColors[event.status] : 'bg-muted text-muted-foreground'
            )}>
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{event.title}</p>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                  )}
                  {event.user && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{event.user}</span>
                    </div>
                  )}
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTime(event.timestamp)}
                </time>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
