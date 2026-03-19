import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckSquare, Package, Truck, Receipt, Shield, Loader2, AlertCircle, CheckCheck, ShoppingCart, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import type { Notification } from '@shared/schema';

interface NotificationsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryIcons: Record<string, typeof Bell> = {
  Approvals: CheckSquare,
  Inventory: Package,
  Logistics: Truck,
  Finance: Receipt,
  Security: Shield,
  Orders: ShoppingCart,
  CRM: Users,
};

const categoryColors: Record<string, string> = {
  Approvals: 'text-blue-600 dark:text-blue-400',
  Inventory: 'text-amber-600 dark:text-amber-400',
  Logistics: 'text-indigo-600 dark:text-indigo-400',
  Finance: 'text-emerald-600 dark:text-emerald-400',
  Security: 'text-red-600 dark:text-red-400',
  Orders: 'text-violet-600 dark:text-violet-400',
  CRM: 'text-cyan-600 dark:text-cyan-400',
};

type FilterCategory = 'All' | 'Unread';

export function NotificationsDrawer({ open, onOpenChange }: NotificationsDrawerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notifications = [], isLoading, isError } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest('PATCH', `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({ title: 'Done', description: 'All notifications marked as read.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to mark notifications as read.', variant: 'destructive' });
    },
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const [filter, setFilter] = useState<FilterCategory>('All');

  const filteredNotifications = filter === 'Unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const formatTime = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 min-w-[20px] justify-center">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          <div className="flex gap-1 mt-2">
            {(['All', 'Unread'] as FilterCategory[]).map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
                data-testid={`button-filter-${f.toLowerCase()}`}
              >
                {f}
                {f === 'Unread' && unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1 min-w-[18px] justify-center">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-destructive">
              <AlertCircle className="h-6 w-6 mb-2" />
              <p className="text-sm">Failed to load notifications</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-3 opacity-40" />
              <p className="text-sm font-medium">
                {filter === 'Unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-xs mt-1">
                {filter === 'Unread' ? 'You\'re all caught up' : 'Notifications will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => {
                const Icon = categoryIcons[notification.category] || Bell;
                const color = categoryColors[notification.category] || 'text-muted-foreground';

                return (
                  <Link
                    key={notification.id}
                    to={notification.link || '#'}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-colors',
                      !notification.isRead
                        ? 'bg-accent/5 hover:bg-accent/10'
                        : 'hover:bg-muted/50'
                    )}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className={cn('mt-0.5 flex-shrink-0', color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          'text-sm leading-tight',
                          !notification.isRead ? 'font-medium' : 'text-muted-foreground'
                        )}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {notification.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
