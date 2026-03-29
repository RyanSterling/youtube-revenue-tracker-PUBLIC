import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { createServiceClient, getUserId } from '../lib/supabase.js'

const app = new Hono()

app.use('*', requireAuth)

// Timezone for date formatting
const TIMEZONE = 'America/Denver'

function toDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
}

// Helper to calculate date range
function getDateRange(period: string): { startDate: Date | null; endDate: Date } {
  const now = new Date()

  if (period === 'all') {
    return { startDate: null, endDate: now }
  }

  let startDate: Date
  switch (period) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  startDate.setHours(0, 0, 0, 0)
  return { startDate, endDate: now }
}

const PAGE_SIZE = 1000

// Get dashboard stats for Overview tab
app.get('/stats', async (c) => {
  const clerkId = c.get('clerkId')
  const period = c.req.query('period') || '30d'
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)
  const { startDate, endDate } = getDateRange(period)

  try {
    // Fetch ALL clicks using pagination
    const clicks: Array<{ id: string; video_id: string | null; source: string; clicked_at: string }> = []
    let clicksOffset = 0
    let hasMoreClicks = true

    while (hasMoreClicks) {
      let query = supabase
        .from('clicks')
        .select('id, video_id, source, clicked_at')
        .eq('user_id', userId)
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

    // Fetch ALL conversions using pagination
    const conversions: Array<{
      id: string
      revenue: number
      converted_at: string
      email: string | null
      click_id: string | null
      offer_id: string | null
    }> = []
    let conversionsOffset = 0
    let hasMoreConversions = true

    while (hasMoreConversions) {
      let query = supabase
        .from('conversions')
        .select('id, revenue, converted_at, email, click_id, offer_id')
        .eq('user_id', userId)
        .order('converted_at', { ascending: false })
        .range(conversionsOffset, conversionsOffset + PAGE_SIZE - 1)

      if (startDate) {
        query = query.gte('converted_at', startDate.toISOString())
      }

      const { data, error } = await query

      if (error || !data || data.length === 0) {
        hasMoreConversions = false
      } else {
        conversions.push(...data)
        conversionsOffset += PAGE_SIZE
        hasMoreConversions = data.length === PAGE_SIZE
      }
    }

    // Fetch click data for attribution
    const clickIds = conversions.map((c) => c.click_id).filter((id): id is string => !!id)
    const clickMap = new Map<string, { source: string; video_id: string | null }>()

    if (clickIds.length > 0) {
      const { data: clickData } = await supabase
        .from('clicks')
        .select('id, source, video_id')
        .in('id', clickIds)

      ;(clickData || []).forEach((c) => clickMap.set(c.id, { source: c.source, video_id: c.video_id }))
    }

    // Fetch offer names
    const offerIds = [...new Set(conversions.map((c) => c.offer_id).filter((id): id is string => !!id))]
    const offerMap = new Map<string, string>()

    if (offerIds.length > 0) {
      const { data: offerData } = await supabase.from('offers').select('id, name').in('id', offerIds)
      ;(offerData || []).forEach((o) => offerMap.set(o.id, o.name))
    }

    // Fetch videos for lookup
    const { data: videos } = await supabase
      .from('videos')
      .select('id, title, thumbnail_url, youtube_id')
      .eq('user_id', userId)

    const videoMap = new Map((videos || []).map((v) => [v.id, v]))

    // Process conversions with click data
    const processedConversions = conversions.map((c) => ({
      ...c,
      click: c.click_id ? clickMap.get(c.click_id) : null,
      offerName: c.offer_id ? offerMap.get(c.offer_id) : null,
    }))

    // Calculate KPIs
    const totalClicks = clicks.length
    const totalConversions = processedConversions.length
    const totalRevenue = processedConversions.reduce((sum, c) => sum + Number(c.revenue || 0), 0)
    const avgOrderValue = totalConversions > 0 ? totalRevenue / totalConversions : 0
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

    // Calculate revenue over time
    const revenueByDate = new Map<string, { revenue: number; conversions: number }>()

    // Initialize date range
    let effectiveStart = startDate
    if (!effectiveStart && processedConversions.length > 0) {
      const dates = processedConversions.map((c) => new Date(c.converted_at))
      effectiveStart = new Date(Math.min(...dates.map((d) => d.getTime())))
    }
    if (!effectiveStart) {
      effectiveStart = new Date()
      effectiveStart.setDate(effectiveStart.getDate() - 30)
    }

    const current = new Date(effectiveStart)
    current.setHours(0, 0, 0, 0)
    while (current <= endDate) {
      const dateKey = toDateString(current)
      revenueByDate.set(dateKey, { revenue: 0, conversions: 0 })
      current.setDate(current.getDate() + 1)
    }

    processedConversions.forEach((c) => {
      const dateKey = toDateString(c.converted_at)
      const existing = revenueByDate.get(dateKey)
      if (existing) {
        existing.revenue += Number(c.revenue || 0)
        existing.conversions += 1
      }
    })

    const revenueOverTime = Array.from(revenueByDate.entries())
      .map(([date, data]) => ({ date, revenue: data.revenue, conversions: data.conversions }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate revenue by source
    const sourceData = new Map<string, { clicks: number; conversions: number; revenue: number }>()

    clicks.forEach((click) => {
      const source = click.source || 'youtube'
      if (!sourceData.has(source)) {
        sourceData.set(source, { clicks: 0, conversions: 0, revenue: 0 })
      }
      sourceData.get(source)!.clicks += 1
    })

    processedConversions.forEach((conversion) => {
      const source = conversion.click?.source || 'unattributed'
      if (!sourceData.has(source)) {
        sourceData.set(source, { clicks: 0, conversions: 0, revenue: 0 })
      }
      sourceData.get(source)!.conversions += 1
      sourceData.get(source)!.revenue += Number(conversion.revenue || 0)
    })

    const revenueBySource = Array.from(sourceData.entries())
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.revenue - a.revenue)

    // Calculate top videos
    const videoStats = new Map<string, { clicks: number; conversions: number; revenue: number }>()

    clicks.forEach((click) => {
      if (click.video_id) {
        if (!videoStats.has(click.video_id)) {
          videoStats.set(click.video_id, { clicks: 0, conversions: 0, revenue: 0 })
        }
        videoStats.get(click.video_id)!.clicks += 1
      }
    })

    processedConversions.forEach((conversion) => {
      const videoId = conversion.click?.video_id
      if (videoId) {
        if (!videoStats.has(videoId)) {
          videoStats.set(videoId, { clicks: 0, conversions: 0, revenue: 0 })
        }
        videoStats.get(videoId)!.conversions += 1
        videoStats.get(videoId)!.revenue += Number(conversion.revenue || 0)
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
          revenue: stats.revenue,
          conversions: stats.conversions,
          clicks: stats.clicks,
          conversionRate: stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0,
        }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null && v.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Get recent conversions
    const recentConversions = processedConversions.slice(0, 5).map((c) => ({
      id: c.id,
      revenue: Number(c.revenue || 0),
      convertedAt: c.converted_at,
      email: c.email,
      source: c.click?.source || 'unattributed',
      offerName: c.offerName || null,
    }))

    return c.json({
      kpis: {
        totalRevenue,
        totalConversions,
        avgOrderValue,
        conversionRate,
        totalClicks,
      },
      revenueOverTime,
      revenueBySource,
      topVideos,
      recentConversions,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return c.json({ error: 'Failed to fetch dashboard stats' }, 500)
  }
})

// Get journey/funnel data
app.get('/journey', async (c) => {
  const clerkId = c.get('clerkId')
  const period = c.req.query('period') || '30d'
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)
  const { startDate } = getDateRange(period)

  try {
    // Get all freebie conversions in the period
    let freebieQuery = supabase
      .from('freebie_conversions')
      .select('id, converted_at, offer_id, email, visitor_id')
      .eq('user_id', userId)

    if (startDate) {
      freebieQuery = freebieQuery.gte('converted_at', startDate.toISOString())
    }

    const { data: freebieConversions } = await freebieQuery

    // Get paid conversions linked to freebies
    let conversionQuery = supabase
      .from('conversions')
      .select('id, revenue, converted_at, email, freebie_conversion_id')
      .eq('user_id', userId)
      .not('freebie_conversion_id', 'is', null)

    if (startDate) {
      conversionQuery = conversionQuery.gte('converted_at', startDate.toISOString())
    }

    const { data: paidConversions } = await conversionQuery

    // Build freebie conversion lookup
    const freebieMap = new Map((freebieConversions || []).map((f) => [f.id, f]))

    // Calculate journey stats
    const journeys = (paidConversions || [])
      .map((conversion) => {
        const freebie = conversion.freebie_conversion_id
          ? freebieMap.get(conversion.freebie_conversion_id)
          : null
        if (!freebie) return null

        const freebieDate = new Date(freebie.converted_at)
        const purchaseDate = new Date(conversion.converted_at)
        const daysToConvert = (purchaseDate.getTime() - freebieDate.getTime()) / (1000 * 60 * 60 * 24)

        return {
          freebieId: freebie.id,
          conversionId: conversion.id,
          revenue: Number(conversion.revenue || 0),
          daysToConvert,
          freebieOfferId: freebie.offer_id,
        }
      })
      .filter((j): j is NonNullable<typeof j> => j !== null)

    // Calculate KPIs
    const totalFreebieSignups = freebieConversions?.length || 0
    const totalPurchasers = journeys.length
    const freebieToSaleRate = totalFreebieSignups > 0 ? (totalPurchasers / totalFreebieSignups) * 100 : 0
    const totalJourneyRevenue = journeys.reduce((sum, j) => sum + j.revenue, 0)

    // Calculate time to conversion stats
    const sortedDays = journeys.map((j) => j.daysToConvert).sort((a, b) => a - b)
    const avgTimeToConversion =
      sortedDays.length > 0 ? sortedDays.reduce((a, b) => a + b, 0) / sortedDays.length : 0
    const medianTimeToConversion =
      sortedDays.length > 0 ? sortedDays[Math.floor(sortedDays.length / 2)] : 0

    // Calculate time distribution buckets
    const buckets = [
      { label: 'Same day', min: 0, max: 1 },
      { label: '1-3 days', min: 1, max: 3 },
      { label: '4-7 days', min: 3, max: 7 },
      { label: '1-2 weeks', min: 7, max: 14 },
      { label: '2-4 weeks', min: 14, max: 28 },
      { label: '1-2 months', min: 28, max: 60 },
      { label: '2+ months', min: 60, max: Infinity },
    ]

    const timeDistribution = buckets.map((bucket) => {
      const count = journeys.filter((j) => j.daysToConvert >= bucket.min && j.daysToConvert < bucket.max).length
      const revenue = journeys
        .filter((j) => j.daysToConvert >= bucket.min && j.daysToConvert < bucket.max)
        .reduce((sum, j) => sum + j.revenue, 0)

      return {
        label: bucket.label,
        count,
        revenue,
        percentage: totalPurchasers > 0 ? (count / totalPurchasers) * 100 : 0,
      }
    })

    // Calculate freebie performance (which freebies convert best)
    const { data: freebieOffers } = await supabase
      .from('offers')
      .select('id, name')
      .eq('user_id', userId)
      .eq('offer_type', 'freebie')

    const freebieStats = new Map<string, { signups: number; purchases: number; revenue: number }>()

    ;(freebieConversions || []).forEach((f) => {
      if (!freebieStats.has(f.offer_id)) {
        freebieStats.set(f.offer_id, { signups: 0, purchases: 0, revenue: 0 })
      }
      freebieStats.get(f.offer_id)!.signups += 1
    })

    journeys.forEach((j) => {
      if (freebieStats.has(j.freebieOfferId)) {
        freebieStats.get(j.freebieOfferId)!.purchases += 1
        freebieStats.get(j.freebieOfferId)!.revenue += j.revenue
      }
    })

    const offerMap = new Map((freebieOffers || []).map((o) => [o.id, o.name]))

    const freebiePerformance = Array.from(freebieStats.entries())
      .map(([offerId, stats]) => ({
        offerId,
        offerName: offerMap.get(offerId) || 'Unknown',
        signups: stats.signups,
        purchases: stats.purchases,
        revenue: stats.revenue,
        conversionRate: stats.signups > 0 ? (stats.purchases / stats.signups) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // Recent journeys
    const recentJourneys = journeys
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((j) => ({
        freebieOfferId: j.freebieOfferId,
        freebieOfferName: offerMap.get(j.freebieOfferId) || 'Unknown',
        revenue: j.revenue,
        daysToConvert: Math.round(j.daysToConvert * 10) / 10,
      }))

    return c.json({
      kpis: {
        freebieToSaleRate,
        avgTimeToConversion: Math.round(avgTimeToConversion * 10) / 10,
        medianTimeToConversion: Math.round(medianTimeToConversion * 10) / 10,
        totalJourneyRevenue,
        totalFreebieSignups,
        totalPurchasers,
      },
      timeDistribution,
      freebiePerformance,
      recentJourneys,
    })
  } catch (error) {
    console.error('Journey stats error:', error)
    return c.json({ error: 'Failed to fetch journey stats' }, 500)
  }
})

export default app
