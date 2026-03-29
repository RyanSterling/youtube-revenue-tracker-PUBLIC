import { Hono } from 'hono'
import { google } from 'googleapis'
import { requireAuth } from '../middleware/auth.js'
import { createServiceClient, getUserId } from '../lib/supabase.js'

const app = new Hono()

// OAuth client for YouTube API
let _oauth2Client: InstanceType<typeof google.auth.OAuth2> | null = null
function getOAuth2Client() {
  if (!_oauth2Client) {
    _oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
  }
  return _oauth2Client
}

app.use('*', requireAuth)

// Get all videos for user
app.get('/', async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .order('published_at', { ascending: false })

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ videos: data })
})

// Get video stats
app.get('/stats', async (c) => {
  const clerkId = c.get('clerkId')
  const period = c.req.query('period') || '30d'
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  // Calculate start date
  let startDate: Date | null = null
  if (period !== 'all') {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
    startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)
  }

  // Get all videos
  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('id, youtube_id, title, thumbnail_url, published_at, is_short')
    .eq('user_id', userId)
    .order('published_at', { ascending: false })

  console.log('[Videos Stats] userId:', userId, 'videosCount:', videos?.length, 'error:', videosError)

  if (!videos || videos.length === 0) {
    return c.json({ videos: [] })
  }

  const videoIds = videos.map(v => v.id)

  // Get clicks for these videos
  let clicksQuery = supabase
    .from('clicks')
    .select('id, video_id')
    .eq('user_id', userId)
    .in('video_id', videoIds)

  if (startDate) {
    clicksQuery = clicksQuery.gte('clicked_at', startDate.toISOString())
  }

  const { data: clicks } = await clicksQuery

  // Get conversions for these videos (via click attribution)
  const clickIds = (clicks || []).map(c => c.id)

  let conversionsData: Array<{ click_id: string; revenue: number }> = []
  if (clickIds.length > 0) {
    let conversionsQuery = supabase
      .from('conversions')
      .select('click_id, revenue')
      .eq('user_id', userId)
      .in('click_id', clickIds)

    if (startDate) {
      conversionsQuery = conversionsQuery.gte('converted_at', startDate.toISOString())
    }

    const { data } = await conversionsQuery
    conversionsData = data || []
  }

  // Get freebie conversions for these videos
  let freebieConversionsData: Array<{ click_id: string }> = []
  if (clickIds.length > 0) {
    let freebieQuery = supabase
      .from('freebie_conversions')
      .select('click_id')
      .eq('user_id', userId)
      .in('click_id', clickIds)

    if (startDate) {
      freebieQuery = freebieQuery.gte('converted_at', startDate.toISOString())
    }

    const { data } = await freebieQuery
    freebieConversionsData = data || []
  }

  // Build click to video mapping
  const clickToVideo = new Map<string, string>()
  ;(clicks || []).forEach(click => {
    if (click.video_id) {
      clickToVideo.set(click.id, click.video_id)
    }
  })

  // Aggregate stats per video
  const videoStats = new Map<string, { clicks: number; conversions: number; revenue: number }>()

  // Initialize all videos with zero stats
  videos.forEach(video => {
    videoStats.set(video.id, { clicks: 0, conversions: 0, revenue: 0 })
  })

  // Count clicks per video
  ;(clicks || []).forEach(click => {
    if (click.video_id && videoStats.has(click.video_id)) {
      videoStats.get(click.video_id)!.clicks++
    }
  })

  // Count conversions and revenue per video
  conversionsData.forEach(conv => {
    if (conv.click_id) {
      const videoId = clickToVideo.get(conv.click_id)
      if (videoId && videoStats.has(videoId)) {
        videoStats.get(videoId)!.conversions++
        videoStats.get(videoId)!.revenue += Number(conv.revenue)
      }
    }
  })

  // Count freebie conversions per video
  freebieConversionsData.forEach(conv => {
    if (conv.click_id) {
      const videoId = clickToVideo.get(conv.click_id)
      if (videoId && videoStats.has(videoId)) {
        videoStats.get(videoId)!.conversions++
      }
    }
  })

  // Build response
  const result = videos.map(video => {
    const stats = videoStats.get(video.id) || { clicks: 0, conversions: 0, revenue: 0 }
    return {
      id: video.id,
      youtubeId: video.youtube_id,
      title: video.title,
      thumbnailUrl: video.thumbnail_url,
      viewCount: 0,
      publishedAt: video.published_at,
      isShort: video.is_short ?? false,
      clicks: stats.clicks,
      conversions: stats.conversions,
      revenue: stats.revenue,
      conversionRate: stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0,
    }
  })

  // Sort by conversions (most converting first), then by clicks
  result.sort((a, b) => {
    if (b.conversions !== a.conversions) return b.conversions - a.conversions
    return b.clicks - a.clicks
  })

  return c.json({ videos: result })
})

// Get single video with detailed offer stats
app.get('/:id', async (c) => {
  const clerkId = c.get('clerkId')
  const videoId = c.req.param('id')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  // Get video
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .eq('user_id', userId)
    .single()

  if (videoError || !video) {
    return c.json({ error: 'Video not found' }, 404)
  }

  // Get channel to fetch live description from YouTube
  const { data: channel } = await supabase
    .from('channels')
    .select('*')
    .eq('user_id', userId)
    .single()

  let liveDescription = ''
  if (channel?.access_token && channel?.refresh_token) {
    try {
      getOAuth2Client().setCredentials({
        access_token: channel.access_token,
        refresh_token: channel.refresh_token,
      })
      const youtube = google.youtube({ version: 'v3', auth: getOAuth2Client() })
      const response = await youtube.videos.list({
        part: ['snippet'],
        id: [video.youtube_id],
      })
      if (response.data.items && response.data.items.length > 0) {
        liveDescription = response.data.items[0].snippet?.description || ''
      }
    } catch (error) {
      console.error('Failed to fetch live description:', error)
    }
  }

  // Get all offers
  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .eq('user_id', userId)

  // Get clicks for this video
  const { data: clicks } = await supabase
    .from('clicks')
    .select('id, offer_id')
    .eq('video_id', videoId)
    .eq('user_id', userId)

  // Get conversions for clicks on this video
  const clickIds = (clicks || []).map(c => c.id)
  let conversionsData: Array<{ click_id: string; revenue: number }> = []
  if (clickIds.length > 0) {
    const { data } = await supabase
      .from('conversions')
      .select('click_id, revenue')
      .in('click_id', clickIds)
    conversionsData = data || []
  }

  // Get freebie conversions
  let freebieConversionsData: Array<{ click_id: string }> = []
  if (clickIds.length > 0) {
    const { data } = await supabase
      .from('freebie_conversions')
      .select('click_id')
      .in('click_id', clickIds)
    freebieConversionsData = data || []
  }

  // Build stats per offer
  const offerStats = (offers || []).map(offer => {
    const offerClicks = (clicks || []).filter(c => c.offer_id === offer.id)
    const offerClickIds = offerClicks.map(c => c.id)

    const paidConversions = conversionsData.filter(c => offerClickIds.includes(c.click_id))
    const freebieConversions = freebieConversionsData.filter(c => offerClickIds.includes(c.click_id))

    const totalConversions = paidConversions.length + freebieConversions.length
    const revenue = paidConversions.reduce((sum, c) => sum + Number(c.revenue), 0)

    // Check if tracked link is in description
    const trackedLink = `learn.maggiesterling.com/v/${video.youtube_id}/${offer.slug}`
    const hasTrackedLink = liveDescription.includes(trackedLink)

    // Check for any link to this offer (untracked)
    const hasUntrackedLink = !hasTrackedLink && liveDescription.includes(offer.slug)

    return {
      id: offer.id,
      name: offer.name,
      slug: offer.slug,
      trackedLink,
      clicks: offerClicks.length,
      conversions: totalConversions,
      revenue,
      conversionRate: offerClicks.length > 0 ? (totalConversions / offerClicks.length) * 100 : 0,
      linkStatus: hasTrackedLink ? 'tracked' : hasUntrackedLink ? 'untracked' : 'none',
    }
  })

  // Calculate totals
  const totalClicks = (clicks || []).length
  const totalConversions = conversionsData.length + freebieConversionsData.length
  const totalRevenue = conversionsData.reduce((sum, c) => sum + Number(c.revenue), 0)

  return c.json({
    video: {
      id: video.id,
      youtubeId: video.youtube_id,
      title: video.title,
      thumbnailUrl: video.thumbnail_url,
      publishedAt: video.published_at,
      isShort: video.is_short,
      description: liveDescription,
    },
    channelId: channel?.id,
    offers: offerStats,
    totalClicks,
    totalConversions,
    totalRevenue,
  })
})

// Update video description on YouTube
app.post('/:id/description', async (c) => {
  const clerkId = c.get('clerkId')
  const videoId = c.req.param('id')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const { description, originalDescription } = await c.req.json<{
    description: string
    originalDescription?: string
  }>()

  // Get video
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .eq('user_id', userId)
    .single()

  if (videoError || !video) {
    return c.json({ error: 'Video not found' }, 404)
  }

  // Get channel
  const { data: channel } = await supabase
    .from('channels')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!channel?.access_token || !channel?.refresh_token) {
    return c.json({ error: 'YouTube not connected' }, 400)
  }

  try {
    // Set up YouTube client
    getOAuth2Client().setCredentials({
      access_token: channel.access_token,
      refresh_token: channel.refresh_token,
    })
    const youtube = google.youtube({ version: 'v3', auth: getOAuth2Client() })

    // Get current video snippet (need full snippet to update)
    const videoResponse = await youtube.videos.list({
      part: ['snippet'],
      id: [video.youtube_id],
    })

    const currentVideo = videoResponse.data.items?.[0]
    if (!currentVideo || !currentVideo.snippet) {
      return c.json({ error: 'Video not found on YouTube' }, 404)
    }

    // Update the description
    await youtube.videos.update({
      part: ['snippet'],
      requestBody: {
        id: video.youtube_id,
        snippet: {
          title: currentVideo.snippet.title!,
          description: description,
          categoryId: currentVideo.snippet.categoryId!,
        },
      },
    })

    // Create backup if originalDescription provided
    if (originalDescription) {
      await supabase.from('video_description_backups').insert({
        user_id: userId,
        video_id: video.id,
        youtube_video_id: video.youtube_id,
        original_description: originalDescription,
        backup_reason: 'description_update',
      })
    }

    return c.json({ success: true })
  } catch (error: unknown) {
    console.error('YouTube update error:', error)
    const message = error instanceof Error ? error.message : 'Update failed'
    return c.json({ error: message }, 500)
  }
})

export default app
