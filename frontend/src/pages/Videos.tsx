import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatNumber, formatDateShort } from '@/lib/utils'

interface VideoStats {
  id: string
  youtubeId: string
  title: string
  thumbnailUrl: string | null
  viewCount: number
  publishedAt: string | null
  isShort: boolean
  clicks: number
  conversions: number
  revenue: number
  conversionRate: number
}

interface YouTubeStatus {
  connected: boolean
  channel?: {
    id: string
    title: string
    thumbnailUrl: string
    lastSyncedAt: string | null
  }
  videoCount?: number
}

type FilterType = 'all' | 'long' | 'shorts'
type SortBy = 'published_at' | 'clicks' | 'conversions' | 'revenue'

export default function Videos() {
  const { fetchApi } = useApi()
  const navigate = useNavigate()

  // Data state
  const [videos, setVideos] = useState<VideoStats[]>([])
  const [youtubeStatus, setYoutubeStatus] = useState<YouTubeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // UI state
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortBy>('published_at')
  const [searchQuery, setSearchQuery] = useState('')

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [statsRes, statusRes] = await Promise.all([
          fetchApi<{ videos: VideoStats[] }>('/videos/stats?period=30d'),
          fetchApi<YouTubeStatus>('/youtube/status'),
        ])

        setVideos(statsRes.videos)
        setYoutubeStatus(statusRes)
      } catch (error) {
        console.error('Failed to fetch videos:', error)
      }
      setLoading(false)
    }
    loadData()
  }, [fetchApi])

  // Sync videos from YouTube
  async function handleSync() {
    setSyncing(true)
    try {
      await fetchApi('/youtube/sync', { method: 'POST' })
      // Reload data after sync
      const [statsRes, statusRes] = await Promise.all([
        fetchApi<{ videos: VideoStats[] }>('/videos/stats?period=30d'),
        fetchApi<YouTubeStatus>('/youtube/status'),
      ])
      setVideos(statsRes.videos)
      setYoutubeStatus(statusRes)
    } catch (error) {
      console.error('Failed to sync videos:', error)
      alert('Failed to sync videos. Please try again.')
    }
    setSyncing(false)
  }

  // Filter and sort videos
  const filteredVideos = useMemo(() => {
    let result = [...videos]

    // Filter by type
    if (filterType === 'shorts') {
      result = result.filter(v => v.isShort)
    } else if (filterType === 'long') {
      result = result.filter(v => !v.isShort)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(v => v.title.toLowerCase().includes(query))
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'published_at':
          return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
        case 'views':
          return b.viewCount - a.viewCount
        case 'clicks':
          return b.clicks - a.clicks
        case 'conversions':
          return b.conversions - a.conversions
        case 'revenue':
          return b.revenue - a.revenue
        default:
          return 0
      }
    })

    return result
  }, [videos, filterType, sortBy, searchQuery])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-background-secondary rounded animate-pulse" />
          <div className="h-9 w-28 bg-background-secondary rounded animate-pulse" />
        </div>
        <div className="h-12 bg-background-secondary rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-background-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Not connected state
  if (!youtubeStatus?.connected) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground-primary">Videos</h1>
        <Card>
          <div className="p-8 text-center">
            <svg
              className="w-16 h-16 mx-auto text-foreground-tertiary mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h2 className="text-lg font-semibold text-foreground-primary mb-2">
              Connect Your YouTube Channel
            </h2>
            <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
              Connect your YouTube channel to sync your videos and track which ones drive the most conversions.
            </p>
            <Button onClick={() => window.location.href = '/dashboard/settings'}>
              Go to Settings
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground-primary">Videos</h1>
          {youtubeStatus.channel && (
            <p className="text-sm text-foreground-tertiary mt-1">
              {youtubeStatus.videoCount} videos synced
              {youtubeStatus.channel.lastSyncedAt && (
                <> · Last synced {formatDateShort(youtubeStatus.channel.lastSyncedAt)}</>
              )}
            </p>
          )}
        </div>
        <Button onClick={handleSync} disabled={syncing} variant="secondary">
          <svg className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? 'Syncing...' : 'Sync Videos'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Type filter */}
        <div className="flex items-center gap-1 p-1 bg-background-secondary rounded-lg">
          {(['all', 'long', 'shorts'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filterType === type
                  ? 'bg-background-tertiary text-foreground-primary'
                  : 'text-foreground-secondary hover:text-foreground-primary'
              }`}
            >
              {type === 'all' ? 'All' : type === 'long' ? 'Long-form' : 'Shorts'}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="px-3 py-2 bg-background-secondary border border-border-primary rounded-lg text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
        >
          <option value="published_at">Newest First</option>
          <option value="views">Most Views</option>
          <option value="clicks">Most Clicks</option>
          <option value="conversions">Most Conversions</option>
          <option value="revenue">Highest Revenue</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-tertiary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos..."
            className="w-full pl-10 pr-3 py-2 bg-background-secondary border border-border-primary rounded-lg text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
        </div>
      </div>

      {/* Videos grid */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12 bg-background-secondary rounded-lg border border-border-primary">
          <svg
            className="w-12 h-12 mx-auto text-foreground-tertiary mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-foreground-secondary">
            {videos.length === 0
              ? 'No videos synced yet. Click "Sync Videos" to import your YouTube videos.'
              : 'No videos match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map(video => (
            <Card
              key={video.id}
              className="overflow-hidden cursor-pointer hover:border-accent-primary/50 transition-colors"
              onClick={() => navigate(`/dashboard/videos/${video.id}`)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-background-tertiary group">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-foreground-tertiary">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">View Details</span>
                </div>
                {/* Short badge */}
                {video.isShort && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded">
                    Short
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-medium text-foreground-primary line-clamp-2 mb-2" title={video.title}>
                  {video.title}
                </h3>

                {video.publishedAt && (
                  <p className="text-xs text-foreground-tertiary mb-3">
                    {formatDateShort(video.publishedAt)} · {formatNumber(video.viewCount)} views
                  </p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border-primary">
                  <div className="text-center">
                    <span className="text-xs text-foreground-tertiary block">Clicks</span>
                    <span className="font-bold text-foreground-primary">{formatNumber(video.clicks)}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-foreground-tertiary block">Conv.</span>
                    <span className="font-bold text-foreground-primary">{video.conversions}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-foreground-tertiary block">Revenue</span>
                    <span className="font-bold text-green-400">{formatCurrency(video.revenue)}</span>
                  </div>
                </div>

                {video.clicks > 0 && (
                  <div className="mt-2 text-center">
                    <span className="text-xs text-foreground-tertiary">
                      {video.conversionRate.toFixed(1)}% conversion rate
                    </span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
