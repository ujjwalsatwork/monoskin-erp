import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusPill } from './StatusPill';

interface Action {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

interface DetailPageHeaderProps {
  title: string;
  subtitle?: string;
  entityId?: string;
  status?: string;
  backPath?: string;
  primaryActions?: React.ReactNode;
  menuActions?: Action[];
}

export function DetailPageHeader({
  title,
  subtitle,
  entityId,
  status,
  backPath,
  primaryActions,
  menuActions,
}: DetailPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b">
      <div className="flex items-start gap-4">
        {backPath && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backPath)}
            className="mt-1 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-display font-semibold truncate">{title}</h1>
            {status && <StatusPill status={status} />}
          </div>
          {(subtitle || entityId) && (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {entityId && (
                <span className="font-mono text-sm text-muted-foreground">{entityId}</span>
              )}
              {entityId && subtitle && <span className="text-muted-foreground hidden sm:inline">•</span>}
              {subtitle && (
                <span className="text-sm text-muted-foreground">{subtitle}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {primaryActions}
        {menuActions && menuActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuActions.map((action, index) => (
                <div key={index}>
                  {index > 0 && action.variant === 'destructive' && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={action.variant === 'destructive' ? 'text-destructive' : ''}
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
