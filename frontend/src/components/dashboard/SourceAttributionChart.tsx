'use client';

import { SourceRevenueData } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { SourceIcon, getSourceLabel } from '@/components/SourceIcon';
import { formatCurrency } from '@/lib/utils';

interface SourceAttributionChartProps {
  data: SourceRevenueData[];
  loading?: boolean;
}

export function SourceAttributionChart({ data, loading }: SourceAttributionChartProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-foreground-secondary mb-4">
            Revenue by Source
          </h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-background-tertiary rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

  // Filter to only show sources with revenue
  const sourcesWithRevenue = data.filter((d) => d.revenue > 0);

  if (sourcesWithRevenue.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-foreground-secondary mb-4">
            Revenue by Source
          </h3>
          <div className="h-32 flex items-center justify-center text-foreground-tertiary">
            No revenue data for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground-secondary">Revenue by Source</h3>
          <span className="text-lg font-bold text-foreground-primary">
            {formatCurrency(totalRevenue)}
          </span>
        </div>

        <div className="space-y-4">
          {sourcesWithRevenue.map((source) => {
            const percentage = (source.revenue / maxRevenue) * 100;
            const revenueShare = totalRevenue > 0 ? (source.revenue / totalRevenue) * 100 : 0;
            const hasIcon = ['youtube', 'tiktok', 'instagram', 'email'].includes(source.source);

            return (
              <div key={source.source} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasIcon && <SourceIcon type={source.source} size={20} />}
                    <span className="text-sm font-medium text-foreground-primary">
                      {getSourceLabel(source.source)}
                    </span>
                    <span className="text-xs text-foreground-tertiary">
                      ({revenueShare.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-foreground-primary">
                      {formatCurrency(source.revenue)}
                    </span>
                    <span className="text-xs text-foreground-tertiary ml-2">
                      {source.conversions} sales
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-primary/80 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
