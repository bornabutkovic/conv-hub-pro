import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Gift, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { RevenueBreakdown } from '@/hooks/useDashboardStats';
import { cn } from '@/lib/utils';

interface FinancialOverviewProps {
  revenue: RevenueBreakdown;
  loading?: boolean;
  isSuperAdmin?: boolean;
  selectedEventId?: string;
}

type MetricType = 'total' | 'tickets' | 'addons';

const COLORS = {
  paid: 'hsl(142.1, 76.2%, 36.3%)', // green
  pending: 'hsl(263, 70%, 58%)', // purple
};

export function FinancialOverview({ revenue, loading, isSuperAdmin, selectedEventId }: FinancialOverviewProps) {
  const navigate = useNavigate();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('total');
  const filterParam = selectedEventId && selectedEventId !== 'all' ? `&event=${selectedEventId}` : '';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Get chart data based on selected metric
  const getChartData = () => {
    let paid = 0;
    let pending = 0;
    let label = '';

    switch (selectedMetric) {
      case 'tickets':
        paid = revenue.ticketRevenue;
        pending = revenue.ticketPending;
        label = 'Tickets';
        break;
      case 'addons':
        paid = revenue.addonRevenue;
        pending = revenue.addonPending;
        label = 'Add-ons';
        break;
      case 'total':
      default:
        paid = revenue.totalRevenue;
        pending = revenue.totalPending;
        label = 'Total';
        break;
    }

    return {
      data: [
        { name: 'Paid', value: paid, color: COLORS.paid },
        { name: 'Pending', value: pending, color: COLORS.pending },
      ].filter(item => item.value > 0),
      total: paid + pending,
      paid,
      pending,
      label,
    };
  };

  const chartInfo = getChartData();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = chartInfo.total > 0 ? ((data.value / chartInfo.total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{data.name}</p>
          <p className="text-lg font-bold">{formatCurrency(data.value)}</p>
          <p className="text-sm text-muted-foreground">{percentage}% of {chartInfo.label.toLowerCase()}</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLegend = () => (
    <div className="flex justify-center gap-6 mt-2">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.paid }} />
        <span className="text-sm text-muted-foreground">
          Paid: <span className="font-medium text-foreground">{formatCurrency(chartInfo.paid)}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.pending }} />
        <span className="text-sm text-muted-foreground">
          Pending: <span className="font-medium text-foreground">{formatCurrency(chartInfo.pending)}</span>
        </span>
      </div>
    </div>
  );

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
              onClick={() => navigate(`/attendees?status=approved${filterParam}`)}
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
              onClick={() => navigate(`/attendees?status=approved${filterParam}`)}
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
                  <p className="text-3xl font-bold text-primary">{formatCurrency(revenue.totalRevenue)}</p>
                  {revenue.totalPending > 0 && (
                    <p className="text-sm font-medium text-warning">
                      Total Pending: {formatCurrency(revenue.totalPending)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Donut Chart with Metric Selector */}
          <div className="flex flex-col">
            {/* Metric Selector */}
            <div className="flex flex-col items-center mb-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Revenue Breakdown
              </h4>
              <Tabs 
                value={selectedMetric} 
                onValueChange={(v) => setSelectedMetric(v as MetricType)}
                className="w-full max-w-xs"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="total">Total</TabsTrigger>
                  <TabsTrigger value="tickets">Tickets</TabsTrigger>
                  <TabsTrigger value="addons">Add-ons</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Chart */}
            <div className="flex-1 flex flex-col items-center justify-center">
              {chartInfo.data.length > 0 ? (
                <>
                  <div className="relative w-full">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={chartInfo.data}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {chartInfo.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">{chartInfo.label}</p>
                        <p className="text-lg font-bold">{formatCurrency(chartInfo.total)}</p>
                      </div>
                    </div>
                  </div>
                  {renderCustomLegend()}
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
        </div>
      </CardContent>
    </Card>
  );
}
