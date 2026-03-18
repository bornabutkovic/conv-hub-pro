import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface RegistrationChartProps {
  data: { date: string; count: number }[];
  loading?: boolean;
}

export function RegistrationChart({ data, loading }: RegistrationChartProps) {
  if (loading) {
    return (
      <Card className="shadow-brand">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Registrations Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card className="shadow-brand glow-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-heading font-semibold">Registrations Timeline</CardTitle>
        <p className="text-sm text-muted-foreground">New registrations over the last 14 days</p>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          {data.every(d => d.count === 0) ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No registrations in the last 14 days
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(187, 94%, 43%)" />
                    <stop offset="100%" stopColor="hsl(263, 70%, 58%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  allowDecimals={false}
                  domain={[0, Math.ceil(maxCount * 1.2)]}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 24px -4px hsl(263 70% 50% / 0.12)',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                  formatter={(value: number) => [value, 'Registrations']}
                />
                <Bar 
                  dataKey="count" 
                  fill="url(#barGradient)" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
