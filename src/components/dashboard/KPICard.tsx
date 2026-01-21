import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  loading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'muted';
  trend?: {
    value: number;
    label: string;
  };
  href?: string;
}

const variantStyles = {
  default: 'border-border',
  success: 'border-l-4 border-l-green-500',
  warning: 'border-l-4 border-l-amber-500',
  muted: 'border-l-4 border-l-muted-foreground',
};

const valueStyles = {
  default: 'text-foreground',
  success: 'text-green-600',
  warning: 'text-amber-600',
  muted: 'text-muted-foreground',
};

export function KPICard({ 
  title, 
  value, 
  icon, 
  description, 
  loading, 
  variant = 'default',
  trend,
  href
}: KPICardProps) {
  const navigate = useNavigate();
  const isClickable = !!href;

  const handleClick = () => {
    if (href) {
      navigate(href);
    }
  };

  return (
    <Card 
      className={cn(
        'transition-all hover:shadow-md',
        variantStyles[variant],
        isClickable && 'cursor-pointer hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]'
      )}
      onClick={isClickable ? handleClick : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-primary p-2 bg-primary/10 rounded-lg">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className={cn('text-2xl font-bold', valueStyles[variant])}>
              {value}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
              <div className={cn(
                'text-xs mt-2 flex items-center gap-1',
                trend.value >= 0 ? 'text-green-600' : 'text-destructive'
              )}>
                <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
                <span className="text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
