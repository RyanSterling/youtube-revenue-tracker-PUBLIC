'use client';

import { RevenueDataPoint } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency, formatDateShort } from '@/lib/utils';

interface RevenueChartProps {
  data: RevenueDataPoint[];
  loading?: boolean;
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground-secondary">Revenue Over Time</h3>
          </div>
          <div className="h-48 bg-background-tertiary rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground-secondary">Revenue Over Time</h3>
          </div>
          <div className="h-48 flex items-center justify-center text-foreground-tertiary">
            No revenue data for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

  // Generate SVG path for the area chart
  const width = 100;
  const height = 100;
  const padding = { top: 10, bottom: 20, left: 0, right: 0 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth,
    y: padding.top + chartHeight - (d.revenue / maxRevenue) * chartHeight,
    revenue: d.revenue,
    date: d.date,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1]?.x.toFixed(2) || 0} ${height} L ${padding.left} ${height} Z`;


  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground-secondary">Revenue Over Time</h3>
          <span className="text-lg font-bold text-foreground-primary">
            {formatCurrency(totalRevenue)}
          </span>
        </div>

        <div className="relative h-48">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EC5B6F" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#EC5B6F" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1={padding.left}
                y1={padding.top + chartHeight * (1 - ratio)}
                x2={width - padding.right}
                y2={padding.top + chartHeight * (1 - ratio)}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeWidth="0.5"
              />
            ))}

            {/* Area fill */}
            <path d={areaPath} fill="url(#revenueGradient)" />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#EC5B6F"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Data points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="1.5"
                fill="#EC5B6F"
                className="opacity-0 hover:opacity-100 transition-opacity"
              />
            ))}
          </svg>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-foreground-tertiary">
            <span>{data[0] && formatDateShort(data[0].date)}</span>
            <span>{data[data.length - 1] && formatDateShort(data[data.length - 1].date)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
