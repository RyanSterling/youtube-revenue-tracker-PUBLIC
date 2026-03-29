import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatNumber, formatDateShort } from '@/lib/utils'
import { DescriptionEditor } from '@/components/videos/DescriptionEditor'

interface OfferStats {
  id: string
  name: string
  slug: string
  trackedLink: string
  clicks: number
  conversions: number
  revenue: number
  conversionRate: number
  linkStatus: 'tracked' | 'untracked' | 'none'
}

interface VideoData {
  video: {
    id: string
    youtubeId: string
    title: string
    thumbnailUrl: string | null
    publishedAt: string | null
    isShort: boolean
    description: string
  }
  channelId: string | null
  offers: OfferStats[]
  totalClicks: number
  totalConversions: number
  totalRevenue: number
}

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchApi } = useApi()

  const [data, setData] = useState<VideoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadVideo() {
      if (!id) return
      setLoading(true)
      try {
        const result = await fetchApi<VideoData>(`/videos/${id}`)
        setData(result)
      } catch (err: unknown) {
        console.error('Failed to load video:', err)
        setError(err instanceof Error ? err.message : 'Failed to load video')
      }
      setLoading(false)
    }
    loadVideo()
  }, [id, fetchApi])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-background-secondary rounded animate-pulse" />
        <div className="h-64 bg-background-secondary rounded-lg animate-pulse" />
        <div className="h-96 bg-background-secondary rounded-lg animate-pulse" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/dashboard/videos')}>
          ← Back to Videos
        </Button>
        <Card>
          <div className="p-8 text-center">
            <p className="text-red-400">{error || 'Video not found'}</p>
          </div>
        </Card>
      </div>
    )
  }

  const { video, channelId, offers, totalClicks, totalConversions, totalRevenue } = data

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard/videos')}>
          ← Back to Videos
        </Button>
      </div>

      {/* Video Info Card */}
      <Card>
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Thumbnail */}
            <div className="flex-shrink-0">
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full lg:w-80 rounded-lg object-cover border border-border-primary"
                />
              ) : (
                <div className="w-full lg:w-80 aspect-video bg-background-tertiary rounded-lg flex items-center justify-center text-foreground-tertiary border border-border-primary">
                  No thumbnail
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground-primary mb-2">{video.title}</h1>
              <div className="flex items-center gap-4 text-sm text-foreground-secondary mb-4">
                <a
                  href={`https://youtube.com/watch?v=${video.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary hover:text-accent-hover transition-colors"
                >
                  View on YouTube →
                </a>
                {video.publishedAt && (
                  <span>Published: {formatDateShort(video.publishedAt)}</span>
                )}
                {video.isShort && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded">
                    Short
                  </span>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-foreground-tertiary">Views</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground-primary">
                    {formatNumber(0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-foreground-tertiary">Clicks</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground-primary">
                    {formatNumber(totalClicks)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-foreground-tertiary">Sales</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground-primary">
                    {formatNumber(totalConversions)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-foreground-tertiary">Revenue</div>
                  <div className="mt-1 text-2xl font-semibold text-green-400">
                    {formatCurrency(totalRevenue)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tracked Links */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-foreground-primary mb-4">Tracked Links</h2>

          {offers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-foreground-secondary mb-4">No offers created yet.</p>
              <Button onClick={() => navigate('/dashboard/offers')}>
                Create Your First Offer
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => {
                let statusColor = 'bg-background-tertiary text-foreground-secondary border-border-primary'
                let statusText = 'Not in description'
                let statusIcon = '—'

                if (offer.linkStatus === 'tracked') {
                  statusColor = 'bg-green-500/20 text-green-400 border-green-500/30'
                  statusText = 'In description'
                  statusIcon = '✓'
                } else if (offer.linkStatus === 'untracked') {
                  statusColor = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  statusText = 'Old link detected'
                  statusIcon = '!'
                }

                return (
                  <div
                    key={offer.id}
                    className="p-4 border border-border-primary rounded-lg bg-background-tertiary/50 hover:border-border-secondary transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground-primary">{offer.name}</h3>
                        <div className="mt-1 flex items-center gap-2">
                          <code className="text-sm bg-background-primary px-2 py-1 rounded font-mono text-foreground-secondary border border-border-primary">
                            {offer.trackedLink}
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(`https://${offer.trackedLink}`)}
                            className="p-1 hover:bg-background-secondary rounded transition-colors"
                            title="Copy link"
                          >
                            <svg className="w-4 h-4 text-foreground-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor}`}>
                        {statusIcon} {statusText}
                      </span>
                    </div>

                    {/* Stats for this offer */}
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-foreground-tertiary">Clicks</div>
                        <div className="font-semibold text-foreground-primary">{offer.clicks}</div>
                      </div>
                      <div>
                        <div className="text-foreground-tertiary">Sales</div>
                        <div className="font-semibold text-foreground-primary">{offer.conversions}</div>
                      </div>
                      <div>
                        <div className="text-foreground-tertiary">Revenue</div>
                        <div className="font-semibold text-foreground-primary">{formatCurrency(offer.revenue)}</div>
                      </div>
                      <div>
                        <div className="text-foreground-tertiary">Conv. Rate</div>
                        <div className="font-semibold text-foreground-primary">{offer.conversionRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Description Editor */}
      {channelId && (
        <DescriptionEditor
          videoId={video.id}
          youtubeId={video.youtubeId}
          initialDescription={video.description}
          offers={offers.map(o => ({ id: o.id, name: o.name, slug: o.slug }))}
          onUpdate={() => {
            // Reload data after update
            fetchApi<VideoData>(`/videos/${id}`).then(setData)
          }}
        />
      )}
    </div>
  )
}
