import { useEffect, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { SourceIcon, getSourceLabel } from '@/components/SourceIcon';

interface ClickWithDetails {
  id: string;
  clicked_at: string;
  source: string;
  source_name: string | null;
  email_name: string | null;
  offer: { name: string; slug: string } | null;
  video: { title: string; youtube_id: string } | null;
  is_attributed: boolean;
  is_discovery: boolean;
}

interface FreebieConversionInfo {
  id: string;
  converted_at: string;
  source: string | null;
  offer: { name: string; slug: string } | null;
}

interface ConversionWithJourney {
  id: string;
  email: string | null;
  visitor_id: string | null;
  revenue: number;
  converted_at: string;
  offer: { name: string; slug: string } | null;
  journey: ClickWithDetails[];
  freebie_conversion: FreebieConversionInfo | null;
}

function SourceBadge({ source, sourceName, emailName }: { source: string; sourceName?: string | null; emailName?: string | null }) {
  const hasIcon = ['youtube', 'tiktok', 'instagram', 'email'].includes(source);
  const displayName = sourceName || getSourceLabel(source);
  const formattedEmailName = emailName ? emailName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null;
  return (
    <span className="inline-flex items-center gap-2">
      {hasIcon && <SourceIcon type={source} size={24} />}
      <span className="text-sm font-medium text-foreground-primary">
        {displayName}
        {formattedEmailName && <span className="text-foreground-secondary font-normal"> - {formattedEmailName}</span>}
      </span>
    </span>
  );
}

function JourneyTimeline({
  journey,
  freebieConversion,
  purchaseDate
}: {
  journey: ClickWithDetails[];
  freebieConversion: FreebieConversionInfo | null;
  purchaseDate: string;
}) {
  if (journey.length === 0 && !freebieConversion) {
    return <p className="text-foreground-tertiary text-sm">No click history found</p>;
  }

  return (
    <div className="space-y-3">
      {journey.map((click, index) => {
        const dotColor = click.is_attributed
          ? 'bg-accent-primary'
          : click.is_discovery
            ? 'bg-blue-500'
            : 'bg-border-primary';
        return (
          <div key={click.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${dotColor}`} />
              {index < journey.length - 1 && <div className="w-0.5 h-8 bg-border-primary mt-1" />}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <SourceBadge source={click.source} sourceName={click.source_name} emailName={click.email_name} />
                {click.is_discovery && <span className="text-xs text-blue-500 font-medium">Discovery</span>}
                {click.is_attributed && <span className="text-xs text-accent-primary font-medium">Attributed</span>}
              </div>
              <p className="text-sm text-foreground-secondary mt-1">
                {click.offer?.name || 'Unknown offer'}
                {click.video && <span className="text-foreground-tertiary"> via "{click.video.title}"</span>}
              </p>
              <p className="text-xs text-foreground-tertiary">{formatDateTime(click.clicked_at)}</p>
            </div>
          </div>
        );
      })}

      {freebieConversion && (
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <div className="w-0.5 h-8 bg-border-primary mt-1" />
          </div>
          <div className="flex-1 pb-2">
            <span className="text-sm font-medium text-purple-500">Freebie Completed</span>
            <p className="text-sm text-foreground-secondary mt-1">{freebieConversion.offer?.name}</p>
            <p className="text-xs text-foreground-tertiary">{formatDateTime(freebieConversion.converted_at)}</p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <div className="flex-1 pb-2">
          <span className="text-sm font-medium text-green-500">Purchase</span>
          <p className="text-xs text-foreground-tertiary">{formatDateTime(purchaseDate)}</p>
        </div>
      </div>
    </div>
  );
}

export function ConversionsTab() {
  const { fetchApi } = useApi();
  const [conversions, setConversions] = useState<ConversionWithJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await fetchApi<ConversionWithJourney[]>('/conversions');
        setConversions(data);
      } catch (error) {
        console.error('Failed to fetch conversions:', error);
      }
      setLoading(false);
    }

    fetchData();
  }, [fetchApi]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-foreground-secondary">Loading conversions...</p>
        </CardContent>
      </Card>
    );
  }

  if (conversions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-foreground-secondary">
            No conversions yet. When someone purchases after clicking a tracked link, it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {conversions.map((conversion) => (
        <Card key={conversion.id}>
          <CardContent className="p-4 md:p-6">
            <div
              className="cursor-pointer"
              onClick={() => setExpandedId(expandedId === conversion.id ? null : conversion.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground-primary truncate">
                    {conversion.email || 'Unknown email'}
                  </p>
                  <p className="text-sm text-foreground-tertiary truncate">
                    {conversion.offer?.name || 'Unknown offer'}
                  </p>
                </div>

                <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-base md:text-lg font-semibold text-foreground-primary">
                      {formatCurrency(conversion.revenue)}
                    </p>
                    <p className="text-xs text-foreground-tertiary">
                      {formatDateTime(conversion.converted_at)}
                    </p>
                  </div>

                  <svg
                    className={`w-5 h-5 text-foreground-tertiary transition-transform flex-shrink-0 ${
                      expandedId === conversion.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {expandedId === conversion.id && (
              <div className="mt-6 pt-6 border-t border-border-primary">
                <h4 className="text-sm font-medium text-foreground-secondary mb-4">Click Journey</h4>
                <JourneyTimeline
                  journey={conversion.journey}
                  freebieConversion={conversion.freebie_conversion}
                  purchaseDate={conversion.converted_at}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
