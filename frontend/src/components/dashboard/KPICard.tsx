'use client';

import { Card, CardContent } from '@/components/ui/Card';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  loading?: boolean;
}

export function KPICard({ title, value, subtitle, loading }: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-foreground-tertiary">{title}</p>
        {loading ? (
          <div className="mt-2 h-8 w-24 bg-background-tertiary rounded animate-pulse" />
        ) : (
          <p className="mt-2 text-2xl font-bold text-foreground-primary">{value}</p>
        )}
        {subtitle && !loading && (
          <p className="mt-1 text-xs text-foreground-tertiary">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface KPICardsRowProps {
  totalRevenue: number;
  totalConversions: number;
  avgOrderValue: number;
  conversionRate: number;
  loading?: boolean;
}

export function KPICardsRow({
  totalRevenue,
  totalConversions,
  avgOrderValue,
  conversionRate,
  loading,
}: KPICardsRowProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard
        title="Total Revenue"
        value={formatCurrency(totalRevenue)}
        loading={loading}
      />
      <KPICard
        title="Conversions"
        value={totalConversions.toString()}
        loading={loading}
      />
      <KPICard
        title="Avg Order Value"
        value={formatCurrency(avgOrderValue)}
        loading={loading}
      />
      <KPICard
        title="Conversion Rate"
        value={`${conversionRate.toFixed(1)}%`}
        loading={loading}
      />
    </div>
  );
}
