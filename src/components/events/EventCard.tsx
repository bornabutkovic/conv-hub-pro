import { Calendar, Tag, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';

interface EventCardProps {
  event: {
    id: string;
    name: string;
    event_id: string | null;
    start_date: string | null;
    price: number | null;
    currency: string | null;
    status: string | null;
    institution_name?: string | null;
  };
}

export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isSuperAdmin = isAdmin(profile?.role);

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'published':
        return 'default';
      case 'active':
        return 'default';
      case 'pending_approval':
        return 'outline' as const;
      case 'draft':
        return 'secondary';
      case 'past':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'published':
        return 'Published';
      case 'active':
        return 'Active';
      case 'pending_approval':
        return 'Pending Approval';
      case 'draft':
        return 'Draft';
      case 'past':
        return 'Past';
      default:
        return 'Draft';
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
            {isSuperAdmin && event.institution_name && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-sm truncate">{event.institution_name}</span>
              </div>
            )}
          </div>
          <Badge variant={getStatusVariant(event.status)} className="shrink-0 ml-2">
            {getStatusLabel(event.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              {event.start_date
                ? format(new Date(event.start_date), 'MMM d, yyyy')
                : 'No date set'}
            </span>
          </div>
          <span className="text-lg font-bold text-primary">
            {formatPrice(event.price, event.currency)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
