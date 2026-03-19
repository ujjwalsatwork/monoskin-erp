import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Bell, Send } from 'lucide-react';

interface FollowUpFormProps {
  entityType: 'lead' | 'doctor' | 'order';
  entityName: string;
  currentFollowUp?: string;
  onSchedule: (data: FollowUpData) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export interface FollowUpData {
  date: string;
  time: string;
  type: 'call' | 'email' | 'meeting' | 'visit';
  priority: 'high' | 'medium' | 'low';
  notes: string;
  reminder: boolean;
}

export function FollowUpForm({ 
  entityType, 
  entityName, 
  currentFollowUp,
  onSchedule, 
  onCancel,
  compact = false 
}: FollowUpFormProps) {
  const [date, setDate] = useState(currentFollowUp?.split('T')[0] || '');
  const [time, setTime] = useState('10:00');
  const [type, setType] = useState<FollowUpData['type']>('call');
  const [priority, setPriority] = useState<FollowUpData['priority']>('medium');
  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState(true);

  const handleSubmit = () => {
    if (!date) return;
    
    onSchedule({
      date,
      time,
      type,
      priority,
      notes,
      reminder,
    });
  };

  const quickDateOptions = [
    { label: 'Tomorrow', days: 1 },
    { label: 'In 3 days', days: 3 },
    { label: 'Next week', days: 7 },
    { label: 'In 2 weeks', days: 14 },
  ];

  const setQuickDate = (days: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    setDate(newDate.toISOString().split('T')[0]);
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {quickDateOptions.map((opt) => (
            <Button 
              key={opt.days}
              variant="outline" 
              size="sm"
              onClick={() => setQuickDate(opt.days)}
              data-testid={`button-quick-date-${opt.days}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Date</Label>
            <Input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="input-followup-date"
            />
          </div>
          <div>
            <Label className="text-xs">Time</Label>
            <Input 
              type="time" 
              value={time}
              onChange={(e) => setTime(e.target.value)}
              data-testid="input-followup-time"
            />
          </div>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel} className="flex-1" data-testid="button-cancel-followup-compact">
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={handleSubmit} className="flex-1" data-testid="button-schedule-followup-compact">
            <Calendar className="h-4 w-4 mr-1" />
            Schedule
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Schedule Follow-up
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Schedule next follow-up for <span className="font-medium">{entityName}</span>
        </p>

        <div className="flex gap-2 flex-wrap">
          {quickDateOptions.map((opt) => (
            <Button 
              key={opt.days}
              variant="outline" 
              size="sm"
              onClick={() => setQuickDate(opt.days)}
              data-testid={`button-quick-date-${opt.days}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <Input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="input-followup-date"
            />
          </div>
          <div>
            <Label>Time</Label>
            <Input 
              type="time" 
              value={time}
              onChange={(e) => setTime(e.target.value)}
              data-testid="input-followup-time"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FollowUpData['type'])}>
              <SelectTrigger data-testid="select-followup-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Phone Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="visit">Site Visit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as FollowUpData['priority'])}>
              <SelectTrigger data-testid="select-followup-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes for the follow-up..."
            className="h-20"
            data-testid="input-followup-notes"
          />
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="reminder" 
            checked={reminder}
            onChange={(e) => setReminder(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="reminder" className="text-sm flex items-center gap-1">
            <Bell className="h-3 w-3" />
            Set reminder notification
          </Label>
        </div>

        <div className="flex gap-2 pt-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1" data-testid="button-cancel-followup">
              Cancel
            </Button>
          )}
          <Button onClick={handleSubmit} className="flex-1" data-testid="button-schedule-followup">
            <Send className="h-4 w-4 mr-2" />
            Schedule Follow-up
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
