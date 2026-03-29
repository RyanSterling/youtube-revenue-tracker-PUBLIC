import { Hono } from 'hono'
import Stripe from 'stripe'
import { requireAuth } from '../middleware/auth.js'
import { createServiceClient, getUserId } from '../lib/supabase.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const app = new Hono()

// Initiate Stripe Connect OAuth - returns URL for frontend to redirect
app.post('/connect', requireAuth, async (c) => {
  const clerkId = c.get('clerkId')
  const state = Buffer.from(JSON.stringify({ clerkId })).toString('base64')

  const url = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.STRIPE_CONNECT_CLIENT_ID}&scope=read_write&state=${state}`

  return c.json({ url })
})

// Handle OAuth callback
app.get('/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')

  if (!code || !state) {
    return c.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?error=missing_params`)
  }

  try {
    const { clerkId } = JSON.parse(Buffer.from(state, 'base64').toString())

    // Exchange code for tokens
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    })

    const supabase = createServiceClient()

    await supabase
      .from('users')
      .update({
        stripe_account_id: response.stripe_user_id,
        stripe_access_token: response.access_token,
        stripe_refresh_token: response.refresh_token,
        stripe_connected_at: new Date().toISOString(),
      })
      .eq('clerk_id', clerkId)

    return c.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?stripe=connected`)
  } catch (error) {
    console.error('Stripe Connect error:', error)
    return c.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?error=stripe_failed`)
  }
})

// Disconnect Stripe
app.post('/disconnect', requireAuth, async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()

  await supabase
    .from('users')
    .update({
      stripe_account_id: null,
      stripe_access_token: null,
      stripe_refresh_token: null,
      stripe_connected_at: null,
    })
    .eq('clerk_id', clerkId)

  return c.json({ success: true })
})

// Get user's existing Stripe products
app.get('/products', requireAuth, async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const { data: user } = await supabase
    .from('users')
    .select('stripe_account_id')
    .eq('id', userId)
    .single()

  if (!user?.stripe_account_id) {
    return c.json({ error: 'Stripe not connected' }, 400)
  }

  // Fetch products from connected account
  const products = await stripe.products.list(
    { active: true, limit: 100 },
    { stripeAccount: user.stripe_account_id }
  )

  // Fetch prices in parallel
  const productsWithPrices = await Promise.all(
    products.data.map(async (product) => {
      const prices = await stripe.prices.list(
        { product: product.id, active: true },
        { stripeAccount: user.stripe_account_id }
      )
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        prices: prices.data.map(p => ({
          id: p.id,
          amount: p.unit_amount,
          currency: p.currency,
        })),
      }
    })
  )

  return c.json({ products: productsWithPrices })
})

// Stripe Connect webhook - handles user's customer payments
app.post('/webhook', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body, signature, process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return c.json({ error: 'Invalid signature' }, 400)
  }

  const supabase = createServiceClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const accountId = event.account // Connected account ID

    // Find user by their connected Stripe account
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('stripe_account_id', accountId)
      .single()

    if (!user) {
      console.log('No user for Stripe account:', accountId)
      return c.json({ received: true })
    }

    // Extract tracking data
    const visitorId = session.client_reference_id || session.metadata?.visitor_id
    const email = session.customer_email || session.customer_details?.email
    const revenue = (session.amount_total || 0) / 100

    // Extract product IDs from line items for product-based attribution
    let productIds: string[] = []
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
        { limit: 100 },
        { stripeAccount: accountId! }
      )
      productIds = lineItems.data
        .map(item => typeof item.price?.product === 'string' ? item.price.product : null)
        .filter((id): id is string => id !== null)
    } catch (err) {
      console.error('Failed to fetch line items:', err)
    }

    // Try product-based attribution first (most reliable)
    let offer: { id: string } | null = null
    let attributionMethod: 'product' | 'visitor_id' | 'email' = 'visitor_id'

    if (productIds.length > 0) {
      const { data: productOffer } = await supabase
        .from('offers')
        .select('id')
        .eq('user_id', user.id)
        .in('stripe_product_id', productIds)
        .limit(1)
        .single()

      if (productOffer) {
        offer = productOffer
        attributionMethod = 'product'
      }
    }

    // Fall back to click-based attribution
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    let allClicks: Array<{ id: string; offer_id: string; source: string; clicked_at: string }> = []

    if (visitorId) {
      const { data } = await supabase
        .from('clicks')
        .select('id, offer_id, source, clicked_at')
        .eq('visitor_id', visitorId)
        .eq('user_id', user.id)
        .gte('clicked_at', thirtyDaysAgo.toISOString())
        .order('clicked_at', { ascending: true })
      if (data) allClicks = data
    }

    // Email fallback for clicks
    if (allClicks.length === 0 && email) {
      const { data } = await supabase
        .from('clicks')
        .select('id, offer_id, source, clicked_at')
        .eq('email', email)
        .eq('user_id', user.id)
        .gte('clicked_at', thirtyDaysAgo.toISOString())
        .order('clicked_at', { ascending: true })
      if (data) allClicks = data
      if (allClicks.length > 0) attributionMethod = 'email'
    }

    const firstClick = allClicks[0] || null
    const attributedClick = findAttributedClick(allClicks)

    // If no product match, use click-based offer
    if (!offer && attributedClick?.offer_id) {
      const { data: clickOffer } = await supabase
        .from('offers')
        .select('id')
        .eq('id', attributedClick.offer_id)
        .single()
      offer = clickOffer
    }

    // Create conversion with enhanced attribution data
    await supabase.from('conversions').insert({
      user_id: user.id,
      click_id: attributedClick?.id || null,
      first_click_id: firstClick?.id || null,
      offer_id: offer?.id || null,
      visitor_id: visitorId || null,
      email: email || null,
      revenue,
      stripe_payment_id: session.payment_intent as string,
      stripe_product_id: productIds[0] || null,
      attribution_method: attributionMethod,
    })
  }

  return c.json({ received: true })
})

// Attribution logic
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

export default app
