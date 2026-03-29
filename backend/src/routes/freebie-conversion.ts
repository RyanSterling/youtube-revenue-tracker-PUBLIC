import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createServiceClient } from '../lib/supabase.js'

interface FreebieConversionRequest {
  offer_slug: string
  email: string
  visitor_id?: string
  source?: string
  campaign?: string
  metadata?: Record<string, unknown>
  page_url?: string
  referrer?: string
}

interface Click {
  id: string
  source: string
  offer_id: string | null
  video_id: string | null
  clicked_at: string
}

// Dormancy threshold for re-activation attribution (in days)
const DORMANCY_THRESHOLD_DAYS = 3

// Paid sources where first-click attribution should always win
const PAID_SOURCES = ['meta']

// Calculate days between two dates
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffMs = Math.abs(d2.getTime() - d1.getTime())
  return diffMs / (1000 * 60 * 60 * 24)
}

// Find the attributed click using re-activation aware logic
function findAttributedClick(clicks: Click[]): Click | null {
  if (!clicks || clicks.length === 0) return null
  if (clicks.length === 1) return clicks[0]

  const firstClick = clicks[0]

  // Paid sources always get first-click attribution
  if (PAID_SOURCES.includes(firstClick.source)) {
    return firstClick
  }

  // Walk backward from most recent to find dormancy gaps
  for (let i = clicks.length - 1; i > 0; i--) {
    const currentClick = clicks[i]
    const previousClick = clicks[i - 1]

    const gapDays = daysBetween(previousClick.clicked_at, currentClick.clicked_at)

    if (gapDays >= DORMANCY_THRESHOLD_DAYS) {
      // Found dormancy gap - this click re-activated them
      return currentClick
    }
  }

  // No dormancy gap - use last click
  return clicks[clicks.length - 1]
}

const app = new Hono()

// Enable CORS for cross-origin requests from tracker.js
app.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

app.post('/', async (c) => {
  const supabase = createServiceClient()

  try {
    const body: FreebieConversionRequest = await c.req.json()

    // Validate required fields
    if (!body.email) {
      return c.json({ error: 'email is required' }, 400)
    }

    if (!body.offer_slug) {
      return c.json({ error: 'offer_slug is required' }, 400)
    }

    // 1. Look up the offer by slug
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('id, name, offer_type, user_id')
      .eq('slug', body.offer_slug)
      .single()

    if (offerError || !offer) {
      return c.json({ error: 'Offer not found', slug: body.offer_slug }, 404)
    }

    // Warn if tracking a paid offer (should be a freebie)
    if (offer.offer_type === 'paid') {
      console.warn(`Freebie conversion tracked for paid offer: ${offer.name} (${body.offer_slug})`)
    }

    // 2. Find ALL clicks for dual attribution (within last 30 days)
    let allClicks: Click[] = []
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Try visitor_id first
    if (body.visitor_id) {
      const { data: clicks } = await supabase
        .from('clicks')
        .select('id, source, offer_id, video_id, clicked_at')
        .eq('visitor_id', body.visitor_id)
        .eq('offer_id', offer.id)
        .gte('clicked_at', thirtyDaysAgo.toISOString())
        .order('clicked_at', { ascending: true })

      if (clicks && clicks.length > 0) {
        allClicks = clicks
      }
    }

    // Fallback to email if no visitor match
    if (allClicks.length === 0 && body.email) {
      const { data: emailClicks } = await supabase
        .from('clicks')
        .select('id, source, offer_id, video_id, clicked_at')
        .eq('email', body.email)
        .eq('offer_id', offer.id)
        .gte('clicked_at', thirtyDaysAgo.toISOString())
        .order('clicked_at', { ascending: true })

      if (emailClicks && emailClicks.length > 0) {
        allClicks = emailClicks
      }
    }

    // Dual attribution
    const firstClick = allClicks.length > 0 ? allClicks[0] : null
    const click = findAttributedClick(allClicks)

    // 3. Determine source
    const source = click?.source || body.source || 'direct'

    // 4. Check for duplicate (same email + offer within last hour)
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const { data: existing } = await supabase
      .from('freebie_conversions')
      .select('id')
      .eq('email', body.email)
      .eq('offer_id', offer.id)
      .gte('converted_at', oneHourAgo.toISOString())
      .limit(1)

    if (existing && existing.length > 0) {
      return c.json({
        success: true,
        message: 'Already tracked',
        duplicate: true,
      }, 200)
    }

    // 5. Create freebie conversion record with dual attribution
    const conversionData = {
      user_id: offer.user_id,
      offer_id: offer.id,
      click_id: click?.id || null,
      first_click_id: firstClick?.id || null,
      visitor_id: body.visitor_id || null,
      email: body.email,
      source: source,
      campaign: body.campaign || null,
      metadata: body.metadata ? {
        ...body.metadata,
        page_url: body.page_url,
        referrer: body.referrer,
      } : null,
      converted_at: new Date().toISOString(),
    }

    const { error: insertError } = await supabase
      .from('freebie_conversions')
      .insert(conversionData)

    if (insertError) {
      console.error('Error creating freebie conversion:', insertError)
      return c.json({
        error: 'Failed to track conversion',
        details: insertError.message,
      }, 500)
    }

    // 6. Update click with email if found via visitor_id
    if (click && body.email) {
      await supabase
        .from('clicks')
        .update({ email: body.email })
        .eq('id', click.id)
        .is('email', null)
    }

    return c.json({
      success: true,
      attributed: !!click,
      attribution_method: click ? (body.visitor_id ? 'visitor_id' : 'email') : 'none',
      offer_id: offer.id,
      offer_name: offer.name,
      discovery_click_id: firstClick?.id || null,
      attributed_click_id: click?.id || null,
      total_journey_clicks: allClicks.length,
    }, 200)
  } catch (error) {
    console.error('Error processing freebie conversion:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default app
