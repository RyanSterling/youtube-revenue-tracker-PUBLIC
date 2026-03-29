import { TopVideoData } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface TopVideosByRevenueProps {
  data: TopVideoData[];
  loading?: boolean;
}

export function TopVideosByRevenue({ data, loading }: TopVideosByRevenueProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-foreground-secondary mb-4">
            Top Videos by Revenue
          </h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-24 h-14 bg-background-tertiary rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-background-tertiary rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-background-tertiary rounded animate-pulse" />
                </div>
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
            Top Videos by Revenue
          </h3>
          <div className="py-8 text-center text-foreground-tertiary">
            No videos with revenue in this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-sm font-medium text-foreground-secondary mb-4">
          Top Videos by Revenue
        </h3>

        <div className="space-y-4">
          {data.map((video, index) => (
            <div key={video.id} className="flex items-center gap-4">
              {/* Rank */}
              <span className="text-lg font-bold text-foreground-tertiary w-6 text-center">
                {index + 1}
              </span>

              {/* Thumbnail */}
              <div className="relative w-24 h-14 rounded overflow-hidden bg-background-tertiary flex-shrink-0">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-foreground-tertiary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Video info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground-primary truncate">
                  {video.title}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-foreground-tertiary">
                  <span>{video.conversions} sales</span>
                  <span>{video.clicks} clicks</span>
                  <span>{video.conversionRate.toFixed(1)}% conv.</span>
                </div>
              </div>

              {/* Revenue */}
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-semibold text-foreground-primary">
                  {formatCurrency(video.revenue)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
