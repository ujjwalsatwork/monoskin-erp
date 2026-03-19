import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Phone, Mail, Calendar, Clock, User, MessageSquare, 
  CheckCircle, XCircle, ArrowRight, Plus, Send, FileText 
} from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'status_change' | 'task' | 'follow_up';
  title: string;
  description?: string;
  user: string;
  timestamp: string;
  outcome?: 'positive' | 'negative' | 'neutral';
  metadata?: Record<string, string>;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  onAddActivity?: (activity: Omit<ActivityItem, 'id' | 'timestamp' | 'user'>) => void;
  showAddForm?: boolean;
  entityType?: 'lead' | 'doctor' | 'order';
}

const activityIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
  status_change: ArrowRight,
  task: CheckCircle,
  follow_up: Clock,
};

const activityColors: Record<string, string> = {
  call: 'bg-primary',
  email: 'bg-primary/80',
  meeting: 'bg-primary/70',
  note: 'bg-muted-foreground',
  status_change: 'bg-primary/60',
  task: 'bg-primary/90',
  follow_up: 'bg-primary/50',
};

export function ActivityTimeline({ 
  activities, 
  onAddActivity, 
  showAddForm = true,
  entityType = 'lead' 
}: ActivityTimelineProps) {
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivityType, setNewActivityType] = useState<ActivityItem['type']>('note');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityDescription, setNewActivityDescription] = useState('');
  const [newActivityOutcome, setNewActivityOutcome] = useState<'positive' | 'negative' | 'neutral'>('neutral');

  const handleAddActivity = () => {
    if (!newActivityTitle.trim() || !onAddActivity) return;
    
    onAddActivity({
      type: newActivityType,
      title: newActivityTitle,
      description: newActivityDescription || undefined,
      outcome: newActivityOutcome,
    });
    
    setNewActivityTitle('');
    setNewActivityDescription('');
    setNewActivityType('note');
    setNewActivityOutcome('neutral');
    setIsAddingActivity(false);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Activity Timeline
        </CardTitle>
        {showAddForm && onAddActivity && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsAddingActivity(!isAddingActivity)}
            data-testid="button-add-activity"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Activity
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isAddingActivity && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Activity Type</Label>
                <Select value={newActivityType} onValueChange={(v) => setNewActivityType(v as ActivityItem['type'])}>
                  <SelectTrigger data-testid="select-activity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Outcome</Label>
                <Select value={newActivityOutcome} onValueChange={(v) => setNewActivityOutcome(v as 'positive' | 'negative' | 'neutral')}>
                  <SelectTrigger data-testid="select-activity-outcome">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input 
                value={newActivityTitle}
                onChange={(e) => setNewActivityTitle(e.target.value)}
                placeholder="Activity title..."
                data-testid="input-activity-title"
              />
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Textarea 
                value={newActivityDescription}
                onChange={(e) => setNewActivityDescription(e.target.value)}
                placeholder="Add details..."
                className="h-20"
                data-testid="input-activity-description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddingActivity(false)} data-testid="button-cancel-activity">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddActivity} data-testid="button-save-activity">
                <Send className="h-4 w-4 mr-1" />
                Save Activity
              </Button>
            </div>
          </div>
        )}

        {activities.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No activities recorded yet</p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = activityIcons[activity.type] || FileText;
                const colorClass = activityColors[activity.type] || 'bg-gray-500';
                
                return (
                  <div key={activity.id} className="relative pl-10" data-testid={`activity-item-${activity.id}`}>
                    <div className={`absolute left-2 top-1 w-5 h-5 rounded-full ${colorClass} flex items-center justify-center`}>
                      <Icon className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm" data-testid={`text-activity-title-${activity.id}`}>{activity.title}</p>
                            {activity.outcome && activity.outcome !== 'neutral' && (
                              <Badge 
                                variant={activity.outcome === 'positive' ? 'default' : 'destructive'}
                                className="text-xs"
                                data-testid={`badge-activity-outcome-${activity.id}`}
                              >
                                {activity.outcome === 'positive' ? (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                {activity.outcome}
                              </Badge>
                            )}
                          </div>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1" data-testid={`text-activity-description-${activity.id}`}>{activity.description}</p>
                          )}
                        </div>
                        <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                          <p data-testid={`text-activity-timestamp-${activity.id}`}>{formatTimestamp(activity.timestamp)}</p>
                          <p className="flex items-center gap-1 justify-end mt-1" data-testid={`text-activity-user-${activity.id}`}>
                            <User className="h-3 w-3" />
                            {activity.user}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
