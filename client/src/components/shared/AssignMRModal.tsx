import { useState } from 'react';
import { UserPlus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { MR } from '@shared/schema';

interface AssignMRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'lead' | 'territory' | 'doctor';
  entityCount?: number;
  onAssign: (mrId: string, notes: string, sendNotification: boolean) => void;
}

export function AssignMRModal({
  open,
  onOpenChange,
  entityType,
  entityCount = 1,
  onAssign,
}: AssignMRModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMR, setSelectedMR] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { data: mrs = [], isLoading } = useQuery<MR[]>({
    queryKey: ['/api/mrs'],
    enabled: open,
  });

  const filteredMRs = mrs.filter(mr => {
    if (mr.status !== 'Active') return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      mr.name.toLowerCase().includes(query) ||
      mr.employeeId?.toLowerCase().includes(query) ||
      mr.territory?.toLowerCase().includes(query)
    );
  });

  const handleAssign = async () => {
    if (!selectedMR) {
      toast({
        title: 'No MR Selected',
        description: 'Please select an MR to assign.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await onAssign(selectedMR, notes, sendNotification);
      toast({
        title: 'Assignment Successful',
        description: `${entityCount} ${entityType}(s) assigned to MR.`,
      });
      onOpenChange(false);
      // Reset form
      setSelectedMR('');
      setNotes('');
    } catch (error) {
      toast({
        title: 'Assignment Failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMRData = mrs.find(mr => String(mr.id) === selectedMR);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign to MR
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm">
              Assigning <span className="font-medium">{entityCount}</span> {entityType}(s)
            </p>
          </div>

          {/* MR Search */}
          <div className="space-y-2">
            <Label>Select MR</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or territory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* MR List */}
          <div className="max-h-[200px] overflow-y-auto border rounded-lg">
            {isLoading ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <RadioGroup value={selectedMR} onValueChange={setSelectedMR}>
                {filteredMRs.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No active MRs found
                  </div>
                ) : (
                  filteredMRs.map((mr) => (
                    <div
                      key={mr.id}
                      className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedMR(String(mr.id))}
                    >
                      <RadioGroupItem value={String(mr.id)} id={`mr-${mr.id}`} />
                      <div className="flex-1">
                        <p className="font-medium">{mr.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {mr.employeeId || 'N/A'} • {mr.territory || 'Unassigned'} • {mr.leadsAssigned} leads
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </RadioGroup>
            )}
          </div>

          {/* Selected MR Summary */}
          {selectedMRData && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium">Selected: {selectedMRData.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Current workload: {selectedMRData.leadsAssigned} leads, {selectedMRData.visitsLogged} visits this month
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Assignment Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes for the MR..."
              rows={2}
            />
          </div>

          {/* Notification toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendNotification"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="sendNotification" className="text-sm font-normal cursor-pointer">
              Send notification to MR
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedMR || submitting}>
            {submitting ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
