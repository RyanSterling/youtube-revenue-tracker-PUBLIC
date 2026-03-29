import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requireAuth } from '../middleware/auth.js'
import { createServiceClient, getUserId } from '../lib/supabase.js'

const app = new Hono()

// Attribution logic (shared with stripe webhook)
function findAttributedClick(clicks: Array<{ id: string; offer_id: string; source: string; clicked_at: string }>) {
  if (!clicks || clicks.length === 0) return null
  if (clicks.length === 1) return clicks[0]

  const DORMANCY_THRESHOLD_DAYS = 3
  const PAID_SOURCES = ['meta']
  const firstClick = clicks[0]

  if (PAID_SOURCES.includes(firstClick.source)) return firstClick

  for (let i = clicks.length - 1; i > 0; i--) {
    const gap = daysBetween(clicks[i - 1].clicked_at, clicks[i].clicked_at)
    if (gap >= DORMANCY_THRESHOLD_DAYS) return clicks[i]
  }

  return clicks[clicks.length - 1]
}

function daysBetween(d1: string, d2: string) {
  return Math.abs(new Date(d2).getTime() - new Date(d1).getTime()) / (1000 * 60 * 60 * 24)
}

// Public endpoint for external/custom checkout conversions
app.post(
  '/external',
  cors({
    origin: '*',
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
  async (c) => {
    const supabase = createServiceClient()

    try {
      const body = await c.req.json()
      const { offer_slug, email, revenue, visitor_id, external_transaction_id } = body

      // Validate required fields
      if (!offer_slug) {
        return c.json({ error: 'offer_slug is required' }, 400)
      }
      if (!email) {
        return c.json({ error: 'email is required' }, 400)
      }
      if (typeof revenue !== 'number' || revenue < 0) {
        return c.json({ error: 'revenue must be a positive number' }, 400)
      }

      // Look up offer by slug
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .select('id, user_id, offer_type')
        .eq('slug', offer_slug)
        .single()

      if (offerError || !offer) {
        return c.json({ error: 'Offer not found' }, 404)
      }

      // Check for duplicate if external_transaction_id provided
      if (external_transaction_id) {
        const { data: existing } = await supabase
          .from('conversions')
          .select('id')
          .eq('external_transaction_id', external_transaction_id)
          .limit(1)

        if (existing && existing.length > 0) {
          return c.json({ success: true, duplicate: true }, 200)
        }
      }

      // Find clicks for attribution
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      let allClicks: Array<{ id: string; offer_id: string; source: string; clicked_at: string }> = []
      let attributionMethod: 'visitor_id' | 'email' | 'manual' = 'manual'

      // Try visitor_id first
      if (visitor_id) {
        const { data } = await supabase
          .from('clicks')
          .select('id, offer_id, source, clicked_at')
          .eq('visitor_id', visitor_id)
          .eq('user_id', offer.user_id)
          .gte('clicked_at', thirtyDaysAgo.toISOString())
          .order('clicked_at', { ascending: true })
        if (data && data.length > 0) {
          allClicks = data
          attributionMethod = 'visitor_id'
        }
      }

      // Email fallback
      if (allClicks.length === 0 && email) {
        const { data } = await supabase
          .from('clicks')
          .select('id, offer_id, source, clicked_at')
          .eq('email', email)
          .eq('user_id', offer.user_id)
          .gte('clicked_at', thirtyDaysAgo.toISOString())
          .order('clicked_at', { ascending: true })
        if (data && data.length > 0) {
          allClicks = data
          attributionMethod = 'email'
        }
      }

      const firstClick = allClicks[0] || null
      const attributedClick = findAttributedClick(allClicks)

      // Create conversion
      const { error: insertError } = await supabase.from('conversions').insert({
        user_id: offer.user_id,
        offer_id: offer.id,
        click_id: attributedClick?.id || null,
        first_click_id: firstClick?.id || null,
        visitor_id: visitor_id || null,
        email,
        revenue,
        external_transaction_id: external_transaction_id || null,
        attribution_method: attributionMethod,
      })

      if (insertError) {
        console.error('Failed to insert conversion:', insertError)
        return c.json({ error: 'Failed to record conversion' }, 500)
      }

      return c.json({
        success: true,
        attributed: !!attributedClick,
        attribution_method: attributionMethod,
        offer_id: offer.id,
      })
    } catch (error) {
      console.error('External conversion error:', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// Get conversions with journey data (authenticated)
app.get('/', requireAuth, async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const { data: conversions } = await supabase
    .from('conversions')
    .select(`
      id,
      email,
      visitor_id,
      revenue,
      converted_at,
      click_id,
      first_click_id,
      offer:offers(name, slug),
      freebie_conversion:freebie_conversions(
        id,
        converted_at,
        source,
        offer:offers(name, slug)
      )
    `)
    .eq('user_id', userId)
    .order('converted_at', { ascending: false })
    .limit(100)

  if (!conversions) return c.json([])

  // Get journey data for each conversion
  const conversionsWithJourney = await Promise.all(
    conversions.map(async (conversion) => {
      let journey: Array<{
        id: string
        clicked_at: string
        source: string
        source_name: string | null
        email_name: string | null
        offer: { name: string; slug: string } | null
        video: { title: string; youtube_id: string } | null
        is_attributed: boolean
        is_discovery: boolean
      }> = []

      if (conversion.visitor_id) {
        const { data: clicks } = await supabase
          .from('clicks')
          .select(`
            id,
            clicked_at,
            source,
            email_name,
            source_link:sources(name),
            offer:offers(name, slug),
            video:videos(title, youtube_id)
          `)
          .eq('visitor_id', conversion.visitor_id)
          .eq('user_id', userId)
          .order('clicked_at', { ascending: true })

        journey = (clicks || []).map((click) => {
          const rawSourceLink = (click as { source_link?: { name: string } | { name: string }[] }).source_link
          const sourceLink = Array.isArray(rawSourceLink) ? rawSourceLink[0] : rawSourceLink
          return {
            id: click.id,
            clicked_at: click.clicked_at,
            source: click.source || 'youtube',
            source_name: sourceLink?.name || null,
            email_name: (click as { email_name?: string }).email_name || null,
            is_attributed: click.id === conversion.click_id,
            is_discovery: click.id === conversion.first_click_id,
            offer: Array.isArray(click.offer) ? click.offer[0] : click.offer,
            video: Array.isArray(click.video) ? click.video[0] : click.video,
          }
        })
      }

      const offerData = Array.isArray(conversion.offer) ? conversion.offer[0] : conversion.offer
      const freebieRaw = Array.isArray(conversion.freebie_conversion)
        ? conversion.freebie_conversion[0]
        : conversion.freebie_conversion

      let freebieConversion = null
      if (freebieRaw && typeof freebieRaw === 'object') {
        const fc = freebieRaw as {
          id: string
          converted_at: string
          source: string | null
          offer: { name: string; slug: string } | { name: string; slug: string }[] | null
        }
        freebieConversion = {
          id: fc.id,
          converted_at: fc.converted_at,
          source: fc.source,
          offer: Array.isArray(fc.offer) ? fc.offer[0] : fc.offer,
        }
      }

      return {
        id: conversion.id,
        email: conversion.email,
        visitor_id: conversion.visitor_id,
        revenue: conversion.revenue,
        converted_at: conversion.converted_at,
        offer: offerData as { name: string; slug: string } | null,
        journey,
        freebie_conversion: freebieConversion,
      }
    })
  )

  return c.json(conversionsWithJourney)
})

export default app
