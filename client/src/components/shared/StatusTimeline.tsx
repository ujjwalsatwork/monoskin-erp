import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, Circle, Clock, Package, Truck, 
  MapPin, Home, XCircle, AlertTriangle
} from 'lucide-react';

interface TimelineStep {
  status: string;
  label: string;
  timestamp?: string;
  location?: string;
  description?: string;
}

interface StatusTimelineProps {
  steps: TimelineStep[];
  currentStatus: string;
  title?: string;
  orientation?: 'vertical' | 'horizontal';
}

const statusIcons: Record<string, typeof CheckCircle> = {
  'Pending': Clock,
  'Ready for Dispatch': Package,
  'Dispatched': Truck,
  'In Transit': Truck,
  'Out for Delivery': MapPin,
  'Delivered': Home,
  'Failed': XCircle,
  'Returned': AlertTriangle,
  'Cancelled': XCircle,
  'Draft': Circle,
  'Approved': CheckCircle,
  'Rejected': XCircle,
  'Picking': Package,
  'Packed': Package,
  'Completed': CheckCircle,
};

export function StatusTimeline({
  steps,
  currentStatus,
  title = 'Status Timeline',
  orientation = 'vertical',
}: StatusTimelineProps) {
  const currentIndex = steps.findIndex(s => s.status === currentStatus);
  const isCancelled = currentStatus === 'Cancelled' || currentStatus === 'Failed' || currentStatus === 'Returned';

  if (orientation === 'horizontal') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-1 bg-muted" />
            <div 
              className="absolute top-5 left-0 h-1 bg-primary transition-all duration-500"
              style={{ width: `${Math.max(0, (currentIndex / (steps.length - 1)) * 100)}%` }}
            />
            {steps.map((step, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const Icon = statusIcons[step.status] || Circle;
              
              return (
                <div key={step.status} className="flex flex-col items-center relative z-10" data-testid={`timeline-step-${step.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-primary text-primary-foreground' :
                    isCurrent ? (isCancelled ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground animate-pulse') :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className={`text-xs mt-2 text-center max-w-[80px] ${
                    isCurrent ? 'font-semibold' : 'text-muted-foreground'
                  }`} data-testid={`text-step-label-${step.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {step.label}
                  </p>
                  {step.timestamp && (isCompleted || isCurrent) && (
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`text-step-timestamp-${step.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {new Date(step.timestamp).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-muted" />
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const Icon = statusIcons[step.status] || Circle;
              
              return (
                <div key={step.status} className="relative flex items-start gap-4 pl-2" data-testid={`timeline-step-${step.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-primary text-primary-foreground' :
                    isCurrent ? (isCancelled ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground') :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${isCurrent ? '' : 'text-muted-foreground'}`} data-testid={`text-step-label-vertical-${step.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <Badge variant={isCancelled ? 'destructive' : 'default'} className="text-xs" data-testid={`badge-current-${step.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          Current
                        </Badge>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-sm text-muted-foreground mt-1" data-testid={`text-step-description-${step.status.toLowerCase().replace(/\s+/g, '-')}`}>{step.description}</p>
                    )}
                    {step.timestamp && (isCompleted || isCurrent) && (
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`text-step-timestamp-vertical-${step.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {new Date(step.timestamp).toLocaleString()}
                      </p>
                    )}
                    {step.location && (isCompleted || isCurrent) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1" data-testid={`text-step-location-${step.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        <MapPin className="h-3 w-3" />
                        {step.location}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
