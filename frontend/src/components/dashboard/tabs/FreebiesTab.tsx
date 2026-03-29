import { useEffect, useState } from 'react';
import { TimePeriod, FreebieKPIs, FreebieSignupData, FreebieSourceData, FreebieOfferData, TopVideoData } from '@/types';
import { useApi } from '@/hooks/useApi';
import { KPICard } from '../KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SourceIcon } from '@/components/SourceIcon';

interface FreebieData {
  kpis: FreebieKPIs;
  signupsOverTime: FreebieSignupData[];
  signupsBySource: FreebieSourceData[];
  freebiePerformance: FreebieOfferData[];
  topVideos: TopVideoData[];
}

const emptyData: FreebieData = {
  kpis: {
    totalSignups: 0,
    totalClicks: 0,
    conversionRate: 0,
    signupsToday: 0,
  },
  signupsOverTime: [],
  signupsBySource: [],
  freebiePerformance: [],
  topVideos: [],
};

interface FreebiesTabProps {
  period: TimePeriod;
}

export function FreebiesTab({ period }: FreebiesTabProps) {
  const { fetchApi } = useApi();
  const [data, setData] = useState<FreebieData>(emptyData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const freebieData = await fetchApi<FreebieData>(`/freebies/stats?period=${period}`);
        setData(freebieData);
      } catch (error) {
        console.error('Failed to fetch freebie data:', error);
        setData(emptyData);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [period, fetchApi]);

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Signups"
          value={data.kpis.totalSignups.toString()}
          loading={loading}
        />
        <KPICard
          title="Total Clicks"
          value={data.kpis.totalClicks.toString()}
          loading={loading}
        />
        <KPICard
          title="Conversion Rate"
          value={`${data.kpis.conversionRate.toFixed(1)}%`}
          subtitle="Clicks → Signups"
          loading={loading}
        />
        <KPICard
          title="Signups Today"
          value={data.kpis.signupsToday.toString()}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signups by Source */}
        <Card>
          <CardHeader>
            <CardTitle>Signups by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-background-tertiary rounded animate-pulse" />
                ))}
              </div>
            ) : data.signupsBySource.length === 0 ? (
              <p className="text-foreground-tertiary text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {data.signupsBySource.map((source) => (
                  <div key={source.source} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <SourceIcon type={source.source} size={24} />
                      <span className="font-medium text-foreground-primary capitalize">
                        {source.source}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground-primary">{source.signups}</span>
                      <span className="text-foreground-tertiary text-sm ml-2">
                        ({source.conversionRate.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Freebie Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Freebie Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-background-tertiary rounded animate-pulse" />
                ))}
              </div>
            ) : data.freebiePerformance.length === 0 ? (
              <p className="text-foreground-tertiary text-center py-8">No freebies yet</p>
            ) : (
              <div className="space-y-3">
                {data.freebiePerformance.map((freebie) => (
                  <div key={freebie.id} className="p-3 bg-background-secondary rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground-primary">{freebie.name}</span>
                      <span className="font-bold text-foreground-primary">{freebie.signups} signups</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-foreground-tertiary">
                      <span>{freebie.clicks} clicks</span>
                      <span>{freebie.conversionRate.toFixed(1)}% conversion</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Videos */}
      <Card>
        <CardHeader>
          <CardTitle>Top Videos by Signups</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-background-tertiary rounded animate-pulse" />
              ))}
            </div>
          ) : data.topVideos.length === 0 ? (
            <p className="text-foreground-tertiary text-center py-8">No video data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topVideos.map((video, index) => (
                <div key={video.id} className="flex items-center gap-4">
                  <span className="text-foreground-tertiary font-medium w-6">{index + 1}</span>
                  {video.thumbnail_url && (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-20 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground-primary truncate">{video.title}</p>
                    <p className="text-sm text-foreground-tertiary">
                      {video.clicks} clicks → {video.conversions} signups ({video.conversionRate.toFixed(1)}%)
                    </p>
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
