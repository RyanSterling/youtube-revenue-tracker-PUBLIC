import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { createServiceClient, getUserId } from '../lib/supabase.js'

const app = new Hono()

app.use('*', requireAuth)

const PAGE_SIZE = 1000

// Helper to fetch all clicks using pagination
async function fetchAllClicks(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  offerId: string,
  startDate: Date | null
): Promise<Array<{ id: string; source: string; source_id: string | null }>> {
  const allClicks: Array<{ id: string; source: string; source_id: string | null }> = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from('clicks')
      .select('id, source, source_id')
      .eq('user_id', userId)
      .eq('offer_id', offerId)
      .order('clicked_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (startDate) {
      query = query.gte('clicked_at', startDate.toISOString())
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      hasMore = false
    } else {
      allClicks.push(...data)
      offset += PAGE_SIZE
      hasMore = data.length === PAGE_SIZE
    }
  }

  return allClicks
}

// Helper to fetch all freebie conversions
async function fetchAllFreebieConversions(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  offerId: string,
  startDate: Date | null
): Promise<Array<{ id: string; source: string; click_id: string | null; first_click_id: string | null }>> {
  const allConversions: Array<{ id: string; source: string; click_id: string | null; first_click_id: string | null }> = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from('freebie_conversions')
      .select('id, source, click_id, first_click_id')
      .eq('user_id', userId)
      .eq('offer_id', offerId)
      .order('converted_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (startDate) {
      query = query.gte('converted_at', startDate.toISOString())
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      hasMore = false
    } else {
      allConversions.push(...data)
      offset += PAGE_SIZE
      hasMore = data.length === PAGE_SIZE
    }
  }

  return allConversions
}

// Helper to fetch all paid conversions
async function fetchAllConversions(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  offerId: string,
  startDate: Date | null
): Promise<Array<{ id: string; revenue: number; click_id: string | null; first_click_id: string | null }>> {
  const allConversions: Array<{ id: string; revenue: number; click_id: string | null; first_click_id: string | null }> = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from('conversions')
      .select('id, revenue, click_id, first_click_id')
      .eq('user_id', userId)
      .eq('offer_id', offerId)
      .order('converted_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (startDate) {
      query = query.gte('converted_at', startDate.toISOString())
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      hasMore = false
    } else {
      allConversions.push(...data)
      offset += PAGE_SIZE
      hasMore = data.length === PAGE_SIZE
    }
  }

  return allConversions
}

// Get offer stats (for OffersTab)
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

  // Fetch all offers
  const { data: offers } = await supabase
    .from('offers')
    .select('id, name, slug, offer_type')
    .eq('user_id', userId)
    .order('name')

  if (!offers) return c.json([])

  // Fetch all sources for lookup
  const { data: allSources } = await supabase
    .from('sources')
    .select('id, name, type')
    .eq('user_id', userId)

  const sourceNameMap = new Map<string, { name: string; type: string }>()
  ;(allSources || []).forEach((s) => {
    const type = s.type && ['youtube', 'tiktok', 'instagram', 'email'].includes(s.type) ? s.type : 'other'
    sourceNameMap.set(s.id, { name: s.name, type })
  })

  // Build stats for each offer
  const offerStats = await Promise.all(
    offers.map(async (offer) => {
      const clicks = await fetchAllClicks(supabase, userId, offer.id, startDate)

      // Group clicks by source
      const sourceMap = new Map<string, { clicks: number; conversions: number; discoveries: number; revenue: number; name: string; type: string }>()

      clicks.forEach((click) => {
        const sourceType = click.source || 'youtube'
        let key: string
        let name: string
        let type: string

        if (click.source_id && sourceNameMap.has(click.source_id)) {
          key = click.source_id
          const sourceInfo = sourceNameMap.get(click.source_id)!
          name = sourceInfo.name
          type = sourceInfo.type
        } else {
          key = `type:${sourceType}`
          const capitalizedType = sourceType.charAt(0).toUpperCase() + sourceType.slice(1)
          name = sourceType === 'youtube' ? capitalizedType : `${capitalizedType} (Untracked)`
          type = sourceType
        }

        if (!sourceMap.has(key)) {
          sourceMap.set(key, { clicks: 0, conversions: 0, discoveries: 0, revenue: 0, name, type })
        }
        sourceMap.get(key)!.clicks++
      })

      // Build click lookup for attribution
      const clickSourceIdMap = new Map<string, { source_id: string | null; source: string }>()
      clicks.forEach((click) => {
        clickSourceIdMap.set(click.id, { source_id: click.source_id, source: click.source || 'youtube' })
      })

      const getSourceKeyInfo = (clickId: string | null): { key: string; name: string; type: string } | null => {
        if (!clickId || !clickSourceIdMap.has(clickId)) return null
        const clickInfo = clickSourceIdMap.get(clickId)!
        if (clickInfo.source_id && sourceNameMap.has(clickInfo.source_id)) {
          const sourceInfo = sourceNameMap.get(clickInfo.source_id)!
          return { key: clickInfo.source_id, name: sourceInfo.name, type: sourceInfo.type }
        } else {
          const capitalizedType = clickInfo.source.charAt(0).toUpperCase() + clickInfo.source.slice(1)
          return {
            key: `type:${clickInfo.source}`,
            name: clickInfo.source === 'youtube' ? capitalizedType : `${capitalizedType} (Untracked)`,
            type: clickInfo.source,
          }
        }
      }

      if (offer.offer_type === 'freebie') {
        const freebieConversions = await fetchAllFreebieConversions(supabase, userId, offer.id, startDate)

        freebieConversions.forEach((conv) => {
          const attrInfo = getSourceKeyInfo(conv.click_id)
          if (attrInfo) {
            if (!sourceMap.has(attrInfo.key)) {
              sourceMap.set(attrInfo.key, { clicks: 0, conversions: 0, discoveries: 0, revenue: 0, name: attrInfo.name, type: attrInfo.type })
            }
            sourceMap.get(attrInfo.key)!.conversions++
          } else {
            if (!sourceMap.has('type:direct')) {
              sourceMap.set('type:direct', { clicks: 0, conversions: 0, discoveries: 0, revenue: 0, name: 'Direct', type: 'direct' })
            }
            sourceMap.get('type:direct')!.conversions++
          }

          const discInfo = getSourceKeyInfo(conv.first_click_id)
          if (discInfo) {
            if (!sourceMap.has(discInfo.key)) {
              sourceMap.set(discInfo.key, { clicks: 0, conversions: 0, discoveries: 0, revenue: 0, name: discInfo.name, type: discInfo.type })
            }
            sourceMap.get(discInfo.key)!.discoveries++
          }
        })

        const totalClicks = clicks.length
        const totalConversions = freebieConversions.length

        return {
          id: offer.id,
          name: offer.name,
          slug: offer.slug,
          offerType: offer.offer_type,
          totalClicks,
          totalConversions,
          totalRevenue: 0,
          conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
          sourceBreakdown: Array.from(sourceMap.entries())
            .filter(([, stats]) => stats.clicks > 0 || stats.conversions > 0)
            .map(([, stats]) => ({
              source: stats.type,
              sourceName: stats.name,
              clicks: stats.clicks,
              conversions: stats.conversions,
              discoveries: stats.discoveries,
              revenue: 0,
              conversionRate: stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0,
            }))
            .sort((a, b) => b.conversions - a.conversions),
        }
      } else {
        const conversions = await fetchAllConversions(supabase, userId, offer.id, startDate)

        // Fetch click data for conversions
        const allClickIds = [...conversions.map((c) => c.click_id), ...conversions.map((c) => c.first_click_id)].filter(
          (id): id is string => !!id
        )
        const uniqueClickIds = [...new Set(allClickIds)]

        if (uniqueClickIds.length > 0) {
          const { data: clickSources } = await supabase.from('clicks').select('id, source, source_id').in('id', uniqueClickIds)
          ;(clickSources || []).forEach((click) => {
            clickSourceIdMap.set(click.id, { source_id: click.source_id, source: click.source || 'youtube' })
          })
        }

        conversions.forEach((conv) => {
          const attrInfo = getSourceKeyInfo(conv.click_id)
          if (attrInfo) {
            if (!sourceMap.has(attrInfo.key)) {
              sourceMap.set(attrInfo.key, { clicks: 0, conversions: 0, discoveries: 0, revenue: 0, name: attrInfo.name, type: attrInfo.type })
            }
            sourceMap.get(attrInfo.key)!.conversions++
            sourceMap.get(attrInfo.key)!.revenue += Number(conv.revenue)
          } else {
            if (!sourceMap.has('type:unattributed')) {
              sourceMap.set('type:unattributed', { clicks: 0, conversions: 0, discoveries: 0, revenue: 0, name: 'Unattributed', type: 'other' })
            }
            sourceMap.get('type:unattributed')!.conversions++
            sourceMap.get('type:unattributed')!.revenue += Number(conv.revenue)
          }

          const discInfo = getSourceKeyInfo(conv.first_click_id)
          if (discInfo) {
            if (!sourceMap.has(discInfo.key)) {
              sourceMap.set(discInfo.key, { clicks: 0, conversions: 0, discoveries: 0, revenue: 0, name: discInfo.name, type: discInfo.type })
            }
            sourceMap.get(discInfo.key)!.discoveries++
          }
        })

        const totalClicks = clicks.length
        const totalConversions = conversions.length
        const totalRevenue = conversions.reduce((sum, c) => sum + Number(c.revenue), 0)

        return {
          id: offer.id,
          name: offer.name,
          slug: offer.slug,
          offerType: offer.offer_type,
          totalClicks,
          totalConversions,
          totalRevenue,
          conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
          sourceBreakdown: Array.from(sourceMap.entries())
            .filter(([, stats]) => stats.clicks > 0 || stats.conversions > 0 || stats.revenue > 0)
            .map(([, stats]) => ({
              source: stats.type,
              sourceName: stats.name,
              clicks: stats.clicks,
              conversions: stats.conversions,
              discoveries: stats.discoveries,
              revenue: stats.revenue,
              conversionRate: stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0,
            }))
            .sort((a, b) => b.revenue - a.revenue || b.conversions - a.conversions),
        }
      }
    })
  )

  // Sort: paid offers first (by revenue), then freebies (by conversions)
  offerStats.sort((a, b) => {
    if (a.offerType === 'paid' && b.offerType === 'freebie') return -1
    if (a.offerType === 'freebie' && b.offerType === 'paid') return 1
    if (a.offerType === 'paid') return b.totalRevenue - a.totalRevenue
    return b.totalConversions - a.totalConversions
  })

  return c.json(offerStats)
})

// Get all offers for user
app.get('/', async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ offers: data })
})

// Get single offer
app.get('/:id', async (c) => {
  const clerkId = c.get('clerkId')
  const offerId = c.req.param('id')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const { data, error } = await supabase.from('offers').select('*').eq('id', offerId).eq('user_id', userId).single()

  if (error) {
    return c.json({ error: error.message }, 404)
  }

  return c.json({ offer: data })
})

// Create offer
app.post('/', async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const body = await c.req.json()
  const { name, slug, price, destination_url, offer_type, stripe_product_id, stripe_price_id } = body

  const { data, error } = await supabase
    .from('offers')
    .insert({
      user_id: userId,
      name,
      slug,
      price,
      destination_url,
      offer_type,
      stripe_product_id: stripe_product_id || null,
      stripe_price_id: stripe_price_id || null,
    })
    .select()
    .single()

  if (error) {
    return c.json({ error: error.message }, 400)
  }

  return c.json({ offer: data })
})

// Update offer
app.patch('/:id', async (c) => {
  const clerkId = c.get('clerkId')
  const offerId = c.req.param('id')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const body = await c.req.json()

  const { data, error } = await supabase.from('offers').update(body).eq('id', offerId).eq('user_id', userId).select().single()

  if (error) {
    return c.json({ error: error.message }, 400)
  }

  return c.json({ offer: data })
})

// Delete offer
app.delete('/:id', async (c) => {
  const clerkId = c.get('clerkId')
  const offerId = c.req.param('id')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const { error } = await supabase.from('offers').delete().eq('id', offerId).eq('user_id', userId)

  if (error) {
    return c.json({ error: error.message }, 400)
  }

  return c.json({ success: true })
})

export default app
