import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { createServiceClient, getUserId } from '../lib/supabase.js'

const app = new Hono()

app.use('*', requireAuth)

const TIMEZONE = 'America/Denver'
const PAGE_SIZE = 1000

function toDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
}

function getDateRange(period: string): { startDate: Date | null; endDate: Date } {
  const now = new Date()

  if (period === 'all') {
    return { startDate: null, endDate: now }
  }

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  return { startDate, endDate: now }
}

// Get freebie stats
app.get('/stats', async (c) => {
  const clerkId = c.get('clerkId')
  const period = c.req.query('period') || '30d'
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)
  const { startDate, endDate } = getDateRange(period)

  try {
    // Fetch freebie offers
    const { data: freebieOffers } = await supabase
      .from('offers')
      .select('id, name, slug')
      .eq('user_id', userId)
      .eq('offer_type', 'freebie')

    const freebieOfferIds = (freebieOffers || []).map((o) => o.id)
    const offerMap = new Map((freebieOffers || []).map((o) => [o.id, o]))

    if (freebieOfferIds.length === 0) {
      return c.json({
        kpis: { totalSignups: 0, totalClicks: 0, conversionRate: 0, signupsToday: 0 },
        signupsOverTime: [],
        signupsBySource: [],
        freebiePerformance: [],
        topVideos: [],
      })
    }

    // Fetch ALL freebie conversions using pagination
    const freebieConversions: Array<{
      id: string
      offer_id: string
      click_id: string | null
      source: string | null
      converted_at: string
    }> = []
    let freebieOffset = 0
    let hasMoreFreebies = true

    while (hasMoreFreebies) {
      let query = supabase
        .from('freebie_conversions')
        .select('id, offer_id, click_id, source, converted_at')
        .eq('user_id', userId)
        .in('offer_id', freebieOfferIds)
        .order('converted_at', { ascending: false })
        .range(freebieOffset, freebieOffset + PAGE_SIZE - 1)

      if (startDate) {
        query = query.gte('converted_at', startDate.toISOString())
      }

      const { data, error } = await query

      if (error || !data || data.length === 0) {
        hasMoreFreebies = false
      } else {
        freebieConversions.push(...data)
        freebieOffset += PAGE_SIZE
        hasMoreFreebies = data.length === PAGE_SIZE
      }
    }

    // Fetch ALL clicks to freebie offers using pagination
    const clicks: Array<{
      id: string
      video_id: string | null
      source: string
      clicked_at: string
      offer_id: string
    }> = []
    let clicksOffset = 0
    let hasMoreClicks = true

    while (hasMoreClicks) {
      let query = supabase
        .from('clicks')
        .select('id, video_id, source, clicked_at, offer_id')
        .eq('user_id', userId)
        .in('offer_id', freebieOfferIds)
        .order('clicked_at', { ascending: false })
        .range(clicksOffset, clicksOffset + PAGE_SIZE - 1)

      if (startDate) {
        query = query.gte('clicked_at', startDate.toISOString())
      }

      const { data, error } = await query

      if (error || !data || data.length === 0) {
        hasMoreClicks = false
      } else {
        clicks.push(...data)
        clicksOffset += PAGE_SIZE
        hasMoreClicks = data.length === PAGE_SIZE
      }
    }

    // Fetch click source info for conversions
    const clickIds = freebieConversions.map((f) => f.click_id).filter((id): id is string => !!id)
    const clickSourceMap = new Map<string, { source: string; video_id: string | null }>()

    if (clickIds.length > 0) {
      const { data: clickData } = await supabase
        .from('clicks')
        .select('id, source, video_id')
        .in('id', clickIds)

      ;(clickData || []).forEach((c) => clickSourceMap.set(c.id, { source: c.source, video_id: c.video_id }))
    }

    // Fetch videos for lookup
    const { data: videos } = await supabase
      .from('videos')
      .select('id, title, thumbnail_url, youtube_id')
      .eq('user_id', userId)

    const videoMap = new Map((videos || []).map((v) => [v.id, v]))

    // Calculate KPIs
    const todayStr = toDateString(new Date())
    const signupsToday = freebieConversions.filter(
      (f) => toDateString(f.converted_at) === todayStr
    ).length

    const kpis = {
      totalSignups: freebieConversions.length,
      totalClicks: clicks.length,
      conversionRate: clicks.length > 0 ? (freebieConversions.length / clicks.length) * 100 : 0,
      signupsToday,
    }

    // Calculate signups over time
    const signupsByDate = new Map<string, number>()

    let effectiveStart = startDate
    if (!effectiveStart && freebieConversions.length > 0) {
      const dates = freebieConversions.map((f) => new Date(f.converted_at))
      effectiveStart = new Date(Math.min(...dates.map((d) => d.getTime())))
    }
    if (!effectiveStart) {
      effectiveStart = new Date()
      effectiveStart.setDate(effectiveStart.getDate() - 30)
    }

    const current = new Date(effectiveStart)
    current.setHours(0, 0, 0, 0)
    while (current <= endDate) {
      signupsByDate.set(toDateString(current), 0)
      current.setDate(current.getDate() + 1)
    }

    freebieConversions.forEach((f) => {
      const dateKey = toDateString(f.converted_at)
      if (signupsByDate.has(dateKey)) {
        signupsByDate.set(dateKey, (signupsByDate.get(dateKey) || 0) + 1)
      }
    })

    const signupsOverTime = Array.from(signupsByDate.entries())
      .map(([date, signups]) => ({ date, signups }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate signups by source
    const sourceData = new Map<string, { clicks: number; signups: number }>()

    clicks.forEach((click) => {
      const source = click.source || 'direct'
      if (!sourceData.has(source)) {
        sourceData.set(source, { clicks: 0, signups: 0 })
      }
      sourceData.get(source)!.clicks += 1
    })

    freebieConversions.forEach((f) => {
      const clickInfo = f.click_id ? clickSourceMap.get(f.click_id) : null
      const source = clickInfo?.source || f.source || 'direct'
      if (!sourceData.has(source)) {
        sourceData.set(source, { clicks: 0, signups: 0 })
      }
      sourceData.get(source)!.signups += 1
    })

    const signupsBySource = Array.from(sourceData.entries())
      .map(([source, data]) => ({
        source,
        signups: data.signups,
        clicks: data.clicks,
        conversionRate: data.clicks > 0 ? (data.signups / data.clicks) * 100 : 0,
      }))
      .sort((a, b) => b.signups - a.signups)

    // Calculate freebie performance (per offer)
    const offerStats = new Map<string, { name: string; slug: string; clicks: number; signups: number }>()

    clicks.forEach((click) => {
      if (click.offer_id && !offerStats.has(click.offer_id)) {
        const offer = offerMap.get(click.offer_id)
        offerStats.set(click.offer_id, {
          name: offer?.name || 'Unknown',
          slug: offer?.slug || '',
          clicks: 0,
          signups: 0,
        })
      }
      if (click.offer_id) {
        offerStats.get(click.offer_id)!.clicks += 1
      }
    })

    freebieConversions.forEach((f) => {
      if (!offerStats.has(f.offer_id)) {
        const offer = offerMap.get(f.offer_id)
        offerStats.set(f.offer_id, {
          name: offer?.name || 'Unknown',
          slug: offer?.slug || '',
          clicks: 0,
          signups: 0,
        })
      }
      offerStats.get(f.offer_id)!.signups += 1
    })

    const freebiePerformance = Array.from(offerStats.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        slug: data.slug,
        signups: data.signups,
        clicks: data.clicks,
        conversionRate: data.clicks > 0 ? (data.signups / data.clicks) * 100 : 0,
      }))
      .sort((a, b) => b.signups - a.signups)

    // Calculate top videos
    const videoStats = new Map<string, { clicks: number; conversions: number }>()

    clicks.forEach((click) => {
      if (click.video_id) {
        if (!videoStats.has(click.video_id)) {
          videoStats.set(click.video_id, { clicks: 0, conversions: 0 })
        }
        videoStats.get(click.video_id)!.clicks += 1
      }
    })

    freebieConversions.forEach((f) => {
      const clickInfo = f.click_id ? clickSourceMap.get(f.click_id) : null
      const videoId = clickInfo?.video_id
      if (videoId) {
        if (!videoStats.has(videoId)) {
          videoStats.set(videoId, { clicks: 0, conversions: 0 })
        }
        videoStats.get(videoId)!.conversions += 1
      }
    })

    const topVideos = Array.from(videoStats.entries())
      .map(([videoId, stats]) => {
        const video = videoMap.get(videoId)
        if (!video) return null
        return {
          id: video.id,
          title: video.title,
          thumbnailUrl: video.thumbnail_url,
          youtubeId: video.youtube_id,
          conversions: stats.conversions,
          clicks: stats.clicks,
          conversionRate: stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0,
        }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null && v.conversions > 0)
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 10)

    return c.json({
      kpis,
      signupsOverTime,
      signupsBySource,
      freebiePerformance,
      topVideos,
    })
  } catch (error) {
    console.error('Freebies stats error:', error)
    return c.json({ error: 'Failed to fetch freebie stats' }, 500)
  }
})

export default app
