import { useEffect, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { TimePeriod, JourneyKPIs, TimeDistributionBucket, FreebiePerformanceData, JourneyData } from '@/types';
import { KPICard } from '../KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDistanceToNow, formatCurrency } from '@/lib/utils';

interface JourneyDataState {
  kpis: JourneyKPIs;
  timeDistribution: TimeDistributionBucket[];
  freebiePerformance: FreebiePerformanceData[];
  recentJourneys: JourneyData[];
}

const emptyData: JourneyDataState = {
  kpis: {
    freebieToSaleRate: 0,
    avgTimeToConversion: 0,
    medianTimeToConversion: 0,
    totalJourneyRevenue: 0,
  },
  timeDistribution: [],
  freebiePerformance: [],
  recentJourneys: [],
};

interface FunnelTabProps {
  period: TimePeriod;
}

export function FunnelTab({ period }: FunnelTabProps) {
  const { fetchApi } = useApi();
  const [data, setData] = useState<JourneyDataState>(emptyData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const journeyData = await fetchApi<JourneyDataState>(`/dashboard/journey?period=${period}`);
        setData(journeyData);
      } catch (error) {
        console.error('Failed to fetch journey data:', error);
        setData(emptyData);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [period, fetchApi]);

  const formatDays = (days: number) => {
    if (days < 1) return 'Same day';
    if (days < 2) return '1 day';
    return `${Math.round(days)} days`;
  };

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Freebie → Sale Rate"
          value={`${data.kpis.freebieToSaleRate.toFixed(1)}%`}
          subtitle="Lifetime conversion rate"
          loading={loading}
        />
        <KPICard
          title="Avg Time to Purchase"
          value={formatDays(data.kpis.avgTimeToConversion)}
          subtitle="From freebie signup"
          loading={loading}
        />
        <KPICard
          title="Median Time"
          value={formatDays(data.kpis.medianTimeToConversion)}
          subtitle="50% convert within"
          loading={loading}
        />
        <KPICard
          title="Journey Revenue"
          value={formatCurrency(data.kpis.totalJourneyRevenue)}
          subtitle="From freebie leads"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Time to Purchase Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-8 bg-background-tertiary rounded animate-pulse" />
                ))}
              </div>
            ) : data.timeDistribution.length === 0 ? (
              <p className="text-foreground-tertiary text-center py-8">No journey data yet</p>
            ) : (
              <div className="space-y-3">
                {data.timeDistribution.map((bucket) => (
                  <div key={bucket.label} className="flex items-center gap-4">
                    <span className="w-24 text-sm text-foreground-tertiary">{bucket.label}</span>
                    <div className="flex-1 h-8 bg-background-tertiary rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-accent-primary rounded-lg transition-all duration-500"
                        style={{ width: `${Math.max(bucket.percentage, 2)}%` }}
                      />
                    </div>
                    <span className="w-20 text-right">
                      <span className="font-medium text-foreground-primary">{bucket.count}</span>
                      <span className="text-foreground-tertiary text-sm ml-1">
                        ({bucket.percentage.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Freebie Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Which Freebies Drive Sales?</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-background-tertiary rounded animate-pulse" />
                ))}
              </div>
            ) : data.freebiePerformance.length === 0 ? (
              <p className="text-foreground-tertiary text-center py-8">No freebie sales yet</p>
            ) : (
              <div className="space-y-3">
                {data.freebiePerformance.map((freebie) => (
                  <div key={freebie.freebieId} className="p-4 bg-background-secondary rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground-primary">{freebie.freebieName}</span>
                      <span className="font-bold text-green-500">{formatCurrency(freebie.revenue)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-foreground-tertiary">
                      <div>
                        <span className="block font-medium text-foreground-primary">{freebie.signups}</span>
                        <span>Signups</span>
                      </div>
                      <div>
                        <span className="block font-medium text-foreground-primary">{freebie.purchases}</span>
                        <span>Purchases</span>
                      </div>
                      <div>
                        <span className="block font-medium text-foreground-primary">{freebie.conversionRate.toFixed(1)}%</span>
                        <span>Conv Rate</span>
                      </div>
                    </div>
                    {freebie.purchases > 0 && (
                      <p className="mt-2 text-xs text-foreground-tertiary">
                        Avg {formatDays(freebie.avgDaysToConvert)} to purchase
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Journeys */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Customer Journeys</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-background-tertiary rounded animate-pulse" />
              ))}
            </div>
          ) : data.recentJourneys.length === 0 ? (
            <p className="text-foreground-tertiary text-center py-8">
              No completed journeys yet. When someone signs up for a freebie and later makes a purchase, their journey will appear here.
            </p>
          ) : (
            <div className="space-y-4">
              {data.recentJourneys.map((journey) => (
                <div key={journey.id} className="p-4 bg-background-secondary rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Freebie Step */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-foreground-primary">{journey.freebieName}</p>
                          <p className="text-sm text-foreground-tertiary">
                            {journey.freebieSource && <span className="capitalize">{journey.freebieSource} • </span>}
                            {formatDistanceToNow(new Date(journey.freebieConvertedAt))} ago
                          </p>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="ml-4 my-2 border-l-2 border-dashed border-border-primary h-6 flex items-center">
                        <span className="ml-4 text-xs text-foreground-tertiary">
                          {formatDays(journey.daysToConvert)} later
                        </span>
                      </div>

                      {/* Purchase Step */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-foreground-primary">{journey.purchaseOfferName}</p>
                          <p className="text-sm text-foreground-tertiary">
                            {formatDistanceToNow(new Date(journey.purchaseConvertedAt))} ago
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Revenue */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-500">{formatCurrency(journey.purchaseRevenue)}</p>
                      <p className="text-sm text-foreground-tertiary">{journey.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
