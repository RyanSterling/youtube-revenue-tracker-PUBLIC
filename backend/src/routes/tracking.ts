import { Hono } from 'hono'
import { createServiceClient } from '../lib/supabase.js'
import { isBot } from '../lib/bot-detection.js'
import { v4 as uuidv4 } from 'uuid'

// Video tracking routes (/v/:youtubeId/:offerSlug)
export const videoTracking = new Hono()

videoTracking.get('/:youtubeId/:offerSlug', async (c) => {
  const youtubeId = c.req.param('youtubeId')
  const offerSlug = c.req.param('offerSlug')
  const supabase = createServiceClient()

  try {
    // Find the video
    const { data: video } = await supabase
      .from('videos')
      .select('id, user_id')
      .eq('youtube_id', youtubeId)
      .single()

    if (!video) {
      return c.text('Video not found', 404)
    }

    // Find the offer
    const { data: offer } = await supabase
      .from('offers')
      .select('id, destination_url, user_id')
      .eq('slug', offerSlug)
      .eq('user_id', video.user_id)
      .single()

    if (!offer) {
      return c.text('Offer not found', 404)
    }

    // Get or create visitor ID
    let visitorId = c.req.query('vid')
    if (!visitorId) {
      visitorId = uuidv4()
    }

    // Get tracking params
    const fbclid = c.req.query('fbclid')
    const source = fbclid ? 'meta' : 'youtube'

    // Only log clicks from real users (not bots)
    const userAgent = c.req.header('user-agent') || null
    if (!isBot(userAgent)) {
      await supabase.from('clicks').insert({
        user_id: video.user_id,
        video_id: video.id,
        offer_id: offer.id,
        visitor_id: visitorId,
        source,
        fbclid: fbclid || null,
        user_agent: userAgent,
        ip_address: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
      })
    }

    // Build redirect URL with visitor ID
    const destinationUrl = new URL(offer.destination_url)
    destinationUrl.searchParams.set('vid', visitorId)

    // Pass through query params (UTM, fbclid, etc.)
    const url = new URL(c.req.url)
    url.searchParams.forEach((value, key) => {
      if (key !== 'vid') {
        destinationUrl.searchParams.set(key, value)
      }
    })

    // For Stripe Payment Links, set client_reference_id
    if (destinationUrl.hostname === 'buy.stripe.com') {
      destinationUrl.searchParams.set('client_reference_id', `yt_${visitorId}`)
    }

    return c.redirect(destinationUrl.toString(), 302)
  } catch (error) {
    console.error('Error in video tracking:', error)
    return c.text('Internal server error', 500)
  }
})

// Source tracking routes (/u/:username/l/:sourceSlug)
export const sourceTracking = new Hono()

sourceTracking.get('/:username/l/:sourceSlug', async (c) => {
  const username = c.req.param('username')
  const sourceSlug = c.req.param('sourceSlug')
  const supabase = createServiceClient()

  try {
    // First, look up user by username
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (!user) {
      return c.text('User not found', 404)
    }

    // Look up source by slug scoped to this user
    const { data: source } = await supabase
      .from('sources')
      .select(`
        id,
        user_id,
        name,
        type,
        destination_url
      `)
      .eq('slug', sourceSlug)
      .eq('user_id', user.id)
      .single()

    if (!source || !source.destination_url) {
      return c.text('Link not found', 404)
    }

    // Get or create visitor ID
    let visitorId = c.req.query('vid')
    if (!visitorId) {
      visitorId = uuidv4()
    }

    // Map source type to click source
    // sources.type: youtube, tiktok, instagram, email, custom
    // clicks.source: youtube, tiktok, instagram, email, direct, other, meta
    const rawType = source.type as string | null
    const sourceType = rawType && rawType !== 'custom' ? rawType : 'other'

    // Check for fbclid (Meta ads)
    const fbclid = c.req.query('fbclid')
    const finalSource = fbclid ? 'meta' : sourceType

    // Get optional email tracking param
    const emailName = c.req.query('email') || null

    // Only log clicks from real users (not bots)
    const userAgent = c.req.header('user-agent') || null
    if (!isBot(userAgent)) {
      await supabase.from('clicks').insert({
        user_id: source.user_id,
        video_id: null,
        offer_id: null,
        source_id: source.id,
        visitor_id: visitorId,
        source: finalSource,
        fbclid: fbclid || null,
        email_name: emailName,
        user_agent: userAgent,
        ip_address: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
      })
    }

    // Build redirect URL with visitor ID
    const destinationUrl = new URL(source.destination_url)
    destinationUrl.searchParams.set('vid', visitorId)

    // Pass through query params (UTM, fbclid, etc.)
    const url = new URL(c.req.url)
    url.searchParams.forEach((value, key) => {
      if (key !== 'vid' && key !== 'email') {
        destinationUrl.searchParams.set(key, value)
      }
    })

    // For Stripe Payment Links, set client_reference_id
    if (destinationUrl.hostname === 'buy.stripe.com') {
      destinationUrl.searchParams.set('client_reference_id', `yt_${visitorId}`)
    }

    return c.redirect(destinationUrl.toString(), 302)
  } catch (error) {
    console.error('Error in source tracking:', error)
    return c.text('Internal server error', 500)
  }
})

// Offer tracking route (/u/:username/go/:offerSlug)
// Generic offer link that can be shared directly
sourceTracking.get('/:username/go/:offerSlug', async (c) => {
  const username = c.req.param('username')
  const offerSlug = c.req.param('offerSlug')
  const supabase = createServiceClient()

  try {
    // First, look up user by username
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (!user) {
      return c.text('User not found', 404)
    }

    // Find the offer scoped to this user
    const { data: offer } = await supabase
      .from('offers')
      .select('id, destination_url')
      .eq('slug', offerSlug)
      .eq('user_id', user.id)
      .single()

    if (!offer) {
      return c.text('Offer not found', 404)
    }

    // Get or create visitor ID
    let visitorId = c.req.query('vid')
    if (!visitorId) {
      visitorId = uuidv4()
    }

    // Determine source from fbclid presence
    const fbclid = c.req.query('fbclid')
    const source = fbclid ? 'meta' : 'direct'

    // Only log clicks from real users (not bots)
    const userAgent = c.req.header('user-agent') || null
    if (!isBot(userAgent)) {
      await supabase.from('clicks').insert({
        user_id: user.id,
        video_id: null,
        offer_id: offer.id,
        source_id: null,
        visitor_id: visitorId,
        source,
        fbclid: fbclid || null,
        user_agent: userAgent,
        ip_address: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
      })
    }

    // Build redirect URL with visitor ID
    const destinationUrl = new URL(offer.destination_url)
    destinationUrl.searchParams.set('vid', visitorId)

    // Pass through query params (UTM, fbclid, etc.)
    const url = new URL(c.req.url)
    url.searchParams.forEach((value, key) => {
      if (key !== 'vid') {
        destinationUrl.searchParams.set(key, value)
      }
    })

    // For Stripe Payment Links, set client_reference_id
    if (destinationUrl.hostname === 'buy.stripe.com') {
      destinationUrl.searchParams.set('client_reference_id', `yt_${visitorId}`)
    }

    return c.redirect(destinationUrl.toString(), 302)
  } catch (error) {
    console.error('Error in offer tracking:', error)
    return c.text('Internal server error', 500)
  }
})
