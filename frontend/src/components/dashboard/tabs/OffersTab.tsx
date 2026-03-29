import { useEffect, useState } from 'react';
import { TimePeriod } from '@/types';
import { useApi } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SourceIcon } from '@/components/SourceIcon';
import { formatCurrency } from '@/lib/utils';

interface SourceStats {
  source: string;
  sourceName: string;
  clicks: number;
  conversions: number;
  discoveries: number;
  revenue: number;
  conversionRate: number;
}

interface OfferStats {
  id: string;
  name: string;
  slug: string;
  offer_type: 'paid' | 'freebie';
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: number;
  sourceBreakdown: SourceStats[];
}

interface OffersTabProps {
  period: TimePeriod;
}

export function OffersTab({ period }: OffersTabProps) {
  const { fetchApi } = useApi();
  const [offers, setOffers] = useState<OfferStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await fetchApi<OfferStats[]>(`/offers/stats?period=${period}`);
        setOffers(data);
      } catch (error) {
        console.error('Failed to fetch offer stats:', error);
      }
      setLoading(false);
    }

    loadData();
  }, [period, fetchApi]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-32 bg-background-tertiary rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-foreground-secondary">No offers found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {offers.map((offer) => (
        <Card key={offer.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">{offer.name}</CardTitle>
                {offer.offer_type === 'freebie' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 rounded-full">
                    <span className="text-xs font-medium text-purple-500">Lead Magnet</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 rounded-full">
                    <span className="text-xs font-medium text-green-500">Paid</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <span className="text-xs text-foreground-tertiary block">Clicks</span>
                  <span className="text-lg font-bold text-foreground-primary">{offer.totalClicks.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xs text-foreground-tertiary block">
                    {offer.offer_type === 'freebie' ? 'Signups' : 'Sales'}
                  </span>
                  <span className="text-lg font-bold text-foreground-primary">{offer.totalConversions}</span>
                </div>
                {offer.offer_type === 'paid' && (
                  <div>
                    <span className="text-xs text-foreground-tertiary block">Revenue</span>
                    <span className="text-lg font-bold text-green-500">{formatCurrency(offer.totalRevenue)}</span>
                  </div>
                )}
                <div>
                  <span className="text-xs text-foreground-tertiary block">Conv. Rate</span>
                  <span className="text-lg font-bold text-foreground-primary">{offer.conversionRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {offer.sourceBreakdown.length === 0 ? (
              <p className="text-foreground-tertiary text-sm py-4">No traffic data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-primary">
                      <th className="text-left py-2 px-3 text-xs font-medium text-foreground-tertiary">Source</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-foreground-tertiary">Clicks</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-foreground-tertiary">
                        <span title="First touch - how many people discovered you through this source">Discovered</span>
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-foreground-tertiary">
                        <span title="Attributed conversions - this source got credit for the conversion">
                          {offer.offer_type === 'freebie' ? 'Converted' : 'Sales'}
                        </span>
                      </th>
                      {offer.offer_type === 'paid' && (
                        <th className="text-right py-2 px-3 text-xs font-medium text-foreground-tertiary">Revenue</th>
                      )}
                      <th className="text-right py-2 px-3 text-xs font-medium text-foreground-tertiary">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offer.sourceBreakdown.map((source, idx) => (
                      <tr key={`${source.source}-${source.sourceName}-${idx}`} className="border-b border-border-primary last:border-0">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <SourceIcon type={source.source} size={20} />
                            <span className="text-sm font-medium text-foreground-primary">
                              {source.sourceName}
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-3 text-sm text-foreground-primary">
                          {source.clicks.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-3 text-sm text-blue-500">
                          {source.discoveries || 0}
                        </td>
                        <td className="text-right py-3 px-3 text-sm text-foreground-primary">
                          {source.conversions}
                        </td>
                        {offer.offer_type === 'paid' && (
                          <td className="text-right py-3 px-3 text-sm font-medium text-foreground-primary">
                            {formatCurrency(source.revenue)}
                          </td>
                        )}
                        <td className="text-right py-3 px-3 text-sm text-foreground-primary">
                          {source.conversionRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
