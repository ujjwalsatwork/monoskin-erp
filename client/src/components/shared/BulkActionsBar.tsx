import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline';
}

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
}

export function BulkActionsBar({ selectedCount, onClear, actions }: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="hidden sm:block h-6 w-px bg-primary-foreground/20" />
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
              size="sm"
              onClick={action.onClick}
              className="gap-2 flex-1 sm:flex-none"
            >
              {action.icon}
              <span className="hidden xs:inline">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
