import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';

interface TicketDistributionChartProps {
  data: { name: string; value: number; color: string }[];
  loading?: boolean;
  eventName?: string;
  selectedEventId?: string | null;
}

export function TicketDistributionChart({ data, loading, eventName, selectedEventId }: TicketDistributionChartProps) {
  const isAllEvents = !selectedEventId || selectedEventId === 'all';
  const chartTitle = isAllEvents ? 'Revenue by Event' : 'Ticket Distribution';
  const chartSubtitle = isAllEvents ? 'Paid ticket revenue per event' : (eventName ? `Breakdown for ${eventName}` : 'Breakdown by ticket type');

  if (loading) {
    return (
      <Card className="shadow-brand">
        <CardHeader>
          <CardTitle className="text-lg font-heading">{chartTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="shadow-brand glow-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-heading font-semibold">{chartTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {chartSubtitle}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          {data.length === 0 || total === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No ticket data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => {
                    const display = name.length > 22 ? name.slice(0, 22) + '…' : name;
                    return `${display} (${(percent * 100).toFixed(0)}%)`;
                  }}
                  labelLine={false}
                  fontSize={11}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 24px -4px hsl(263 70% 50% / 0.12)',
                  }}
                  formatter={(value: number) => [isAllEvents ? `€${value.toLocaleString('de-DE')}` : value, isAllEvents ? 'Revenue' : 'Attendees']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
