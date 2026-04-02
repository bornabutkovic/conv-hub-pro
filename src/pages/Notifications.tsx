import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { Bell, CheckCheck } from 'lucide-react';
import { useAdminNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useAdminNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PAGE_SIZE = 20;

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: allNotifications, isLoading } = useAdminNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [page, setPage] = useState(0);

  const notifications = allNotifications || [];
  const totalPages = Math.ceil(notifications.length / PAGE_SIZE);
  const paged = notifications.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const isUnread = (n: { read_by: string[] | null }) =>
    user?.id ? !(n.read_by || []).includes(user.id) : false;

  const unreadCount = notifications.filter(isUnread).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : notifications.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          No notifications
        </div>
      ) : (
        <>
          <div className="rounded-lg border divide-y">
            {paged.map((n) => (
              <button
                key={n.id}
                className={cn(
                  'w-full text-left px-5 py-4 hover:bg-muted/50 transition-colors flex items-start gap-3',
                  isUnread(n) && 'bg-primary/5'
                )}
                onClick={() => {
                  markRead.mutate(n.id);
                  if (n.event_id) {
                    navigate(`/events/${n.event_id}?tab=approvals`);
                  }
                }}
              >
                {isUnread(n) && (
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{n.message}</p>
                  {n.event_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">{n.event_name}</p>
                  )}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                      {n.created_at && formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {n.created_at && format(new Date(n.created_at), 'PPpp')}
                  </TooltipContent>
                </Tooltip>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
