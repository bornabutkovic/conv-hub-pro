import { DollarSign, Users, Calendar, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}!
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Revenue"
          value="€0.00"
          icon={<DollarSign className="h-5 w-5" />}
          description="From all events"
        />
        <StatCard
          title="Total Attendees"
          value="0"
          icon={<Users className="h-5 w-5" />}
          description="Across all events"
        />
        <StatCard
          title="Active Events"
          value="0"
          icon={<Calendar className="h-5 w-5" />}
          description="Currently running"
        />
      </div>

      {/* Recent Events Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Events</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              No events yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first event to get started
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
