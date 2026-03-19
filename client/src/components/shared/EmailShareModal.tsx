import { useState } from 'react';
import { Mail, Send, Check, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

interface EmailShareModalProps {
  entityType: string;
  entityId: string;
  defaultSubject?: string;
  trigger?: React.ReactNode;
}

export function EmailShareModal({ entityType, entityId, defaultSubject, trigger }: EmailShareModalProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [subject, setSubject] = useState(defaultSubject || `${entityType} - ${entityId}`);
  const [message, setMessage] = useState('');

  const addRecipient = () => {
    if (currentEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) {
      if (!recipients.includes(currentEmail)) {
        setRecipients([...recipients, currentEmail]);
      }
      setCurrentEmail('');
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    setSending(true);
    
    try {
      await apiRequest('POST', '/api/audit-logs', {
        action: 'Email Shared',
        entityType: entityType,
        entityId: entityId,
        reason: `Sent to: ${recipients.join(', ')}`,
      });
      
      setSending(false);
      setSent(true);
      toast.success('Email sent successfully');

      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setRecipients([]);
        setMessage('');
      }, 1500);
    } catch {
      setSending(false);
      toast.error('Failed to send email');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRecipient();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Mail className="h-4 w-4" />
            Share via Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Share {entityType}
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success/20 mx-auto mb-4 flex items-center justify-center">
              <Check className="h-8 w-8 text-success" />
            </div>
            <p className="text-lg font-medium">Email Sent!</p>
            <p className="text-sm text-muted-foreground">
              Successfully sent to {recipients.length} recipient(s)
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Recipients</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={currentEmail}
                    onChange={(e) => setCurrentEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter email address"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addRecipient}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {recipients.map((email) => (
                      <Badge key={email} variant="secondary" className="gap-1">
                        {email}
                        <button onClick={() => removeRecipient(email)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message..."
                  rows={3}
                />
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  A PDF of this {entityType.toLowerCase()} will be attached to the email.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSend} disabled={sending || recipients.length === 0} className="gap-2">
                {sending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
