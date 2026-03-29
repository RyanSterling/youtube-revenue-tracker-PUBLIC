import { useEffect, useState } from 'react';
import { TimePeriod, DashboardData } from '@/types';
import { useApi } from '@/hooks/useApi';
import { KPICardsRow } from '../KPICard';
import { RevenueChart } from '../RevenueChart';
import { SourceAttributionChart } from '../SourceAttributionChart';
import { TopVideosByRevenue } from '../TopVideosByRevenue';
import { RecentConversionsFeed } from '../RecentConversionsFeed';

const emptyData: DashboardData = {
  kpis: {
    totalRevenue: 0,
    totalConversions: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    totalClicks: 0,
  },
  revenueOverTime: [],
  revenueBySource: [],
  topVideos: [],
  recentConversions: [],
};

interface OverviewTabProps {
  period: TimePeriod;
}

export function OverviewTab({ period }: OverviewTabProps) {
  const { fetchApi } = useApi();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const dashboardData = await fetchApi<DashboardData>(`/dashboard/stats?period=${period}`);
        setData(dashboardData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
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
      <KPICardsRow
        totalRevenue={data.kpis.totalRevenue}
        totalConversions={data.kpis.totalConversions}
        avgOrderValue={data.kpis.avgOrderValue}
        conversionRate={data.kpis.conversionRate}
        loading={loading}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={data.revenueOverTime} loading={loading} />
        <SourceAttributionChart data={data.revenueBySource} loading={loading} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopVideosByRevenue data={data.topVideos} loading={loading} />
        <RecentConversionsFeed data={data.recentConversions} loading={loading} />
      </div>
    </div>
  );
}
