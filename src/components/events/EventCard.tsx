import { Calendar, Tag, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { useEventsWithPendingItems } from '@/hooks/useAdminNotifications';
import { useEventRevenue, formatEur } from '@/hooks/useEventRevenue';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';

interface EventCardProps {
  event: {
    id: string;
    name: string;
    event_id: string | null;
    start_date: string | null;
    end_date?: string | null;
    price: number | null;
    currency: string | null;
    status: string | null;
    institution_name?: string | null;
  };
}

export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userIsAdminRole = isAdmin(profile?.role);
  const { data: eventsWithPending } = useEventsWithPendingItems();
  const { data: revenueMap } = useEventRevenue();
  const { t } = useAdminLanguage();

  const hasPendingItems = userIsAdminRole && eventsWithPending?.has(event.id);
  const revenue = revenueMap?.get(event.id) || { paid: 0, pending: 0 };
  const hasRevenue = revenue.paid > 0 || revenue.pending > 0;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/25">
            {getStatusLabel(status)}
          </Badge>
        );
      case 'test':
        return (
          <Badge className="bg-yellow-400/20 text-yellow-700 border-yellow-500/40 hover:bg-yellow-400/30 dark:text-yellow-400">
            {getStatusLabel(status)}
          </Badge>
        );
      case 'pending_approval':
        return (
          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/25">
            {getStatusLabel(status)}
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/25">
            {getStatusLabel(status)}
          </Badge>
        );
      case 'archived':
        return <Badge variant="secondary">{getStatusLabel(status)}</Badge>;
      case 'draft':
        return <Badge variant="secondary">{getStatusLabel(status)}</Badge>;
      default:
        return <Badge variant="secondary">{getStatusLabel(status)}</Badge>;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'active':
        return t('status.active');
      case 'test':
        return t('status.test');
      case 'pending_approval':
        return t('status.pendingApproval');
      case 'completed':
        return t('status.completed');
      case 'draft':
        return t('status.draft');
      case 'archived':
        return t('status.archived');
      default:
        return t('status.draft');
    }
  };

  const formatPrice = (price: number | null, currency: string | null) => {
    if (price === null) return 'Free';
    const curr = currency || 'EUR';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(price);
  };

  const handleClick = () => {
    navigate(`/events/${event.id}`);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors truncate">
              {event.name}
            </h3>
            {event.event_id && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                <span className="text-sm font-mono">{event.event_id}</span>
              </div>
            )}
            {userIsAdminRole && event.institution_name && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-sm truncate">{event.institution_name}</span>
              </div>
            )}
          </div>
          <div className="shrink-0 ml-2 flex flex-col items-end gap-1">
            {getStatusBadge(event.status)}
            {userIsAdminRole && event.status === 'pending_approval' && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Needs Review
              </Badge>
            )}
            {hasPendingItems && event.status !== 'pending_approval' && (
              <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 text-white hover:bg-amber-600">
                Needs Review
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            {(() => {
              if (!event.start_date) return 'No date set';
              const start = new Date(event.start_date);
              const end = event.end_date ? new Date(event.end_date) : null;
              const sameDay =
                end &&
                start.getFullYear() === end.getFullYear() &&
                start.getMonth() === end.getMonth() &&
                start.getDate() === end.getDate();
              if (!end || sameDay) {
                return format(start, 'MMM d, yyyy');
              }
              if (start.getFullYear() === end.getFullYear()) {
                return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
              }
              return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
            })()}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{t('eventCard.revenue')}</p>
            <p className="text-sm font-semibold">
              {hasRevenue ? formatEur(revenue.paid) : '—'}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{t('eventCard.pending')}</p>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {hasRevenue ? formatEur(revenue.pending) : '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
