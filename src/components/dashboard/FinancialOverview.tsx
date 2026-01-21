import { useNavigate } from 'react-router-dom';
import { Ticket, Gift, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { RevenueBreakdown } from '@/hooks/useDashboardStats';
import { cn } from '@/lib/utils';

interface FinancialOverviewProps {
  revenue: RevenueBreakdown;
  loading?: boolean;
  isSuperAdmin?: boolean;
}

const COLORS = {
  tickets: 'hsl(24.6, 95%, 53.1%)',
  addons: 'hsl(210, 70%, 50%)',
};

export function FinancialOverview({ revenue, loading, isSuperAdmin }: FinancialOverviewProps) {
  const navigate = useNavigate();
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const chartData = [
    { 
      name: 'Kotizacije (Tickets)', 
      value: revenue.ticketRevenue, 
      color: COLORS.tickets 
    },
    { 
      name: 'Dodatne usluge (Add-ons)', 
      value: revenue.addonRevenue, 
      color: COLORS.addons 
    },
  ].filter(item => item.value > 0);

  const totalPaid = revenue.totalRevenue;
  const totalPending = revenue.totalPending;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalPaid > 0 ? ((data.value / totalPaid) * 100).toFixed(1) : 0;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{data.name}</p>
          <p className="text-lg font-bold">{formatCurrency(data.value)}</p>
          <p className="text-sm text-muted-foreground">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {isSuperAdmin ? 'Platform Financial Overview' : 'Financial Overview'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Revenue Breakdown Cards */}
          <div className="space-y-4">
            {/* Ticket Revenue */}
            <div 
              className={cn(
                "p-4 rounded-lg border bg-card transition-all",
                "cursor-pointer hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              )}
              onClick={() => navigate('/attendees?status=approved')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Ticket className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Ticket Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(revenue.ticketRevenue)}</p>
                  {revenue.ticketPending > 0 && (
                    <p className="text-sm text-warning">
                      Pending: {formatCurrency(revenue.ticketPending)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Add-on Revenue */}
            <div 
              className={cn(
                "p-4 rounded-lg border bg-card transition-all",
                "cursor-pointer hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              )}
              onClick={() => navigate('/attendees?status=approved')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-accent">
                  <Gift className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Add-on Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(revenue.addonRevenue)}</p>
                  {revenue.addonPending > 0 && (
                    <p className="text-sm text-warning">
                      Pending: {formatCurrency(revenue.addonPending)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Total Paid Revenue</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(totalPaid)}</p>
                  {totalPending > 0 && (
                    <p className="text-sm font-medium text-warning">
                      Total Pending: {formatCurrency(totalPending)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="flex flex-col items-center justify-center">
            {chartData.length > 0 ? (
              <>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Revenue Breakdown
                </h4>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => (
                        <span className="text-sm text-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No revenue data yet</p>
                <p className="text-sm text-muted-foreground/70">
                  Revenue will appear here once payments are received
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
