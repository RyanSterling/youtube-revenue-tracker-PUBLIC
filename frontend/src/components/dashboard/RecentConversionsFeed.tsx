'use client';

import { RecentConversionData } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { SourceIcon, getSourceLabel } from '@/components/SourceIcon';
import { formatCurrency } from '@/lib/utils';

interface RecentConversionsFeedProps {
  data: RecentConversionData[];
  loading?: boolean;
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return 'Unknown';
  // Parse as UTC (Supabase returns timestamps without Z suffix)
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      timeZone: 'America/Denver',
      month: 'short',
      day: 'numeric'
    });
  }
}

export function RecentConversionsFeed({ data, loading }: RecentConversionsFeedProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-foreground-secondary mb-4">
            Recent Conversions
          </h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-background-tertiary rounded animate-pulse" />
                  <div className="h-3 w-24 bg-background-tertiary rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-background-tertiary rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-foreground-secondary mb-4">
            Recent Conversions
          </h3>
          <div className="py-8 text-center text-foreground-tertiary">
            No conversions in this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-sm font-medium text-foreground-secondary mb-4">
          Recent Conversions
        </h3>

        <div className="space-y-4">
          {data.map((conversion) => {
            const hasIcon = ['youtube', 'tiktok', 'instagram', 'email'].includes(conversion.source);

            return (
              <div key={conversion.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Source icon */}
                  <div className="flex-shrink-0">
                    {hasIcon ? (
                      <SourceIcon type={conversion.source} size={24} />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-background-tertiary flex items-center justify-center">
                        <span className="text-xs text-foreground-tertiary">?</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground-primary truncate">
                      {conversion.email || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
                      <span>{conversion.offer_name || 'Unknown offer'}</span>
                      <span>via {getSourceLabel(conversion.source)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm font-semibold text-foreground-primary">
                    {formatCurrency(conversion.revenue)}
                  </p>
                  <p className="text-xs text-foreground-tertiary">
                    {formatDate(conversion.converted_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
