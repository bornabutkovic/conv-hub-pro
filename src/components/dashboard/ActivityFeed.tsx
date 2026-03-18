import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { UserPlus, ShoppingCart, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  userName: string;
  action: string;
  detail: string;
  timestamp: string;
  type: 'registration' | 'purchase';
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <Card className="shadow-brand">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-brand glow-hover">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-heading font-semibold">Recent Activity</CardTitle>
          <p className="text-sm text-muted-foreground">Latest registrations and purchases</p>
        </div>
        <Button variant="outline" size="sm" asChild className="rounded-xl">
          <Link to="/attendees?status=pending" className="gap-2">
            Review Pending
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map(activity => (
              <div 
                key={activity.id} 
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className={`p-2 rounded-xl ${
                  activity.type === 'registration' 
                    ? 'bg-brand-gradient text-white' 
                    : 'bg-emerald-500/10 text-emerald-600'
                }`}>
                  {activity.type === 'registration' 
                    ? <UserPlus className="h-4 w-4" />
                    : <ShoppingCart className="h-4 w-4" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{activity.userName}</span>
                    {' '}{activity.action}{' '}
                    <Badge variant="secondary" className="font-normal">
                      {activity.detail}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
