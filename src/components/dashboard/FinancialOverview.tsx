import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Gift, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { RevenueBreakdown } from '@/hooks/useDashboardStats';
import { cn } from '@/lib/utils';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';

interface FinancialOverviewProps {
  revenue: RevenueBreakdown;
  loading?: boolean;
  isSuperAdmin?: boolean;
  selectedEventId?: string;
}

type MetricType = 'total' | 'tickets' | 'addons';

const COLORS = {
  paid: 'hsl(187, 94%, 43%)',   // brand cyan
  pending: 'hsl(263, 70%, 58%)', // brand purple
};

export function FinancialOverview({ revenue, loading, isSuperAdmin, selectedEventId }: FinancialOverviewProps) {
  const navigate = useNavigate();
  const { t } = useAdminLanguage();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('total');
  const filterParam = selectedEventId && selectedEventId !== 'all' ? `&event=${selectedEventId}` : '';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getChartData = () => {
    let paid = 0;
    let pending = 0;
    let label = '';

    switch (selectedMetric) {
      case 'tickets':
        paid = revenue.ticketRevenue;
        pending = revenue.ticketPending;
        label = t('dashboard.tickets');
        break;
      case 'addons':
        paid = revenue.addonRevenue;
        pending = revenue.addonPending;
        label = t('dashboard.addons');
        break;
      case 'total':
      default:
        paid = revenue.totalRevenue;
        pending = revenue.totalPending;
        label = t('dashboard.total');
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
        <div className="bg-card border border-border/50 rounded-xl shadow-brand p-3 backdrop-blur-sm">
          <p className="font-medium text-sm">{data.name}</p>
          <p className="text-lg font-heading font-bold">{formatCurrency(data.value)}</p>
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
          {t('dashboard.paid')}: <span className="font-medium text-foreground">{formatCurrency(chartInfo.paid)}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.pending }} />
        <span className="text-sm text-muted-foreground">
          {t('dashboard.pending')}: <span className="font-medium text-foreground">{formatCurrency(chartInfo.pending)}</span>
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className="shadow-brand">
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
    <Card className="shadow-brand glow-hover relative overflow-hidden">
      {/* Subtle watermark C */}
      <div className="absolute -right-16 -top-16 text-[200px] font-heading font-bold text-primary/[0.03] pointer-events-none select-none leading-none">
        C
      </div>

      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading">
          <div className="p-1.5 rounded-lg bg-brand-gradient text-white">
            <TrendingUp className="h-4 w-4" />
          </div>
          {isSuperAdmin ? t('dashboard.financialOverview') : t('dashboard.financialOverviewOrg')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Revenue Cards */}
          <div className="space-y-4">
            {/* Ticket Revenue */}
            <div 
              className="p-4 rounded-xl border border-border/50 bg-card shadow-sm transition-all cursor-pointer hover:scale-[1.02] hover:shadow-brand active:scale-[0.98]"
              onClick={() => navigate(`/attendees?status=approved${filterParam}`)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-gradient text-white">
                  <Ticket className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{t('dashboard.ticketRevenue')}</p>
                  <p className="text-2xl font-heading font-bold">{formatCurrency(revenue.ticketRevenue)}</p>
                  {revenue.ticketPending > 0 && (
                    <p className="text-sm text-amber-600">
                      {t('dashboard.pending')}: {formatCurrency(revenue.ticketPending)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Add-on Revenue */}
            <div 
              className="p-4 rounded-xl border border-border/50 bg-card shadow-sm transition-all cursor-pointer hover:scale-[1.02] hover:shadow-brand active:scale-[0.98]"
              onClick={() => navigate(`/attendees?status=approved${filterParam}`)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-gradient text-white">
                  <Gift className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{t('dashboard.addonRevenue')}</p>
                  <p className="text-2xl font-heading font-bold">{formatCurrency(revenue.addonRevenue)}</p>
                  {revenue.addonPending > 0 && (
                    <p className="text-sm text-amber-600">
                      {t('dashboard.pending')}: {formatCurrency(revenue.addonPending)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 relative overflow-hidden">
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 rounded-xl bg-brand-gradient text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{t('dashboard.totalPaidRevenue')}</p>
                  <p className="text-3xl font-heading font-bold text-brand-gradient">{formatCurrency(revenue.totalRevenue)}</p>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-sm text-emerald-600">
                      ✅ {t('dashboard.confirmed')}: {formatCurrency(revenue.totalRevenue)}
                    </p>
                    {revenue.totalPending > 0 && (
                      <p className="text-sm text-amber-600">
                        ⏳ {t('dashboard.pending')}: {formatCurrency(revenue.totalPending)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="flex flex-col">
            <div className="flex flex-col items-center mb-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {t('dashboard.revenueBreakdown')}
              </h4>
              <Tabs 
                value={selectedMetric} 
                onValueChange={(v) => setSelectedMetric(v as MetricType)}
                className="w-full max-w-xs"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="total">{t('dashboard.total')}</TabsTrigger>
                  <TabsTrigger value="tickets">{t('dashboard.tickets')}</TabsTrigger>
                  <TabsTrigger value="addons">{t('dashboard.addons')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

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
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">{chartInfo.label}</p>
                        <p className="text-lg font-heading font-bold">{formatCurrency(chartInfo.total)}</p>
                      </div>
                    </div>
                  </div>
                  {renderCustomLegend()}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">{t('dashboard.noRevenue')}</p>
                  <p className="text-sm text-muted-foreground/70">
                    {t('dashboard.noRevenueSub')}
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
