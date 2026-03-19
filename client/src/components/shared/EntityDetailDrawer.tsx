import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StatusPill } from './StatusPill';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EntityTimeline, TimelineEvent } from './EntityTimeline';

interface EntityDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  entityId: string;
  status?: string;
  children: React.ReactNode;
  timeline?: TimelineEvent[];
  actions?: React.ReactNode;
}

export function EntityDetailDrawer({
  open,
  onClose,
  title,
  entityId,
  status,
  children,
  timeline,
  actions,
}: EntityDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:w-[500px] md:w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-lg font-display">{title}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground font-mono">{entityId}</span>
                {status && <StatusPill status={status} />}
              </div>
            </div>
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            {timeline && <TabsTrigger value="timeline">Timeline</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="mt-4">
            {children}
          </TabsContent>

          {timeline && (
            <TabsContent value="timeline" className="mt-4">
              <EntityTimeline events={timeline} />
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
