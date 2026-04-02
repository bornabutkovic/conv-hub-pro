import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminNotifications, useUnreadNotificationCount, useMarkNotificationRead } from '@/hooks/useAdminNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const userIsAdmin = isAdmin(profile?.role);
  const { data: notifications } = useAdminNotifications(5);
  const { data: unreadCount } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();

  if (!userIsAdmin) return null;

  const count = unreadCount || 0;

  const isUnread = (n: { read_by: string[] | null }) =>
    user?.id ? !(n.read_by || []).includes(user.id) : false;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <h4 className="font-semibold text-sm">Notifications</h4>
        </div>
        {!notifications?.length ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No pending notifications
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-80">
              <div className="divide-y">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors',
                      isUnread(n) && 'bg-primary/5'
                    )}
                    onClick={() => {
                      markRead.mutate(n.id);
                      if (n.event_id) {
                        navigate(`/events/${n.event_id}?tab=approvals`);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {isUnread(n) && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm leading-snug">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {n.created_at && formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
            <div className="border-t px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-primary hover:text-primary"
                onClick={() => navigate('/notifications')}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
