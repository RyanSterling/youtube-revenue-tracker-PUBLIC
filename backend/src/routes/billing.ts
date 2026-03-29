import { Hono } from 'hono'
import Stripe from 'stripe'
import { requireAuth } from '../middleware/auth.js'
import { createServiceClient, getUserId } from '../lib/supabase.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const app = new Hono()

// Plan configuration
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    stripePriceId: null,
  },
  pro: {
    name: 'Pro',
    price: 29,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
  business: {
    name: 'Business',
    price: 79,
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID,
  },
}

// Create checkout session for subscription
app.post('/checkout', requireAuth, async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const { plan } = await c.req.json()
  const planConfig = PLANS[plan as keyof typeof PLANS]

  if (!planConfig?.stripePriceId) {
    return c.json({ error: 'Invalid plan' }, 400)
  }

  // Get or create Stripe customer
  const { data: user } = await supabase
    .from('users')
    .select('email, stripe_customer_id')
    .eq('id', userId)
    .single()

  let customerId = user?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user?.email,
      metadata: { clerk_id: clerkId, user_id: userId },
    })
    customerId = customer.id

    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId)
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing`,
    metadata: { user_id: userId, plan },
  })

  return c.json({ url: session.url })
})

// Redirect to Stripe billing portal
app.post('/portal', requireAuth, async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (!user?.stripe_customer_id) {
    return c.json({ error: 'No billing account' }, 400)
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${process.env.FRONTEND_URL}/dashboard/settings`,
  })

  return c.json({ url: session.url })
})

// Webhook for SaaS subscriptions
app.post('/webhook', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body, signature, process.env.STRIPE_BILLING_WEBHOOK_SECRET!
    )
  } catch {
    return c.json({ error: 'Invalid signature' }, 400)
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (user) {
        const priceId = sub.items.data[0]?.price.id
        const plan = Object.entries(PLANS).find(
          ([, p]) => p.stripePriceId === priceId
        )?.[0] || 'free'

        await supabase
          .from('users')
          .update({
            plan,
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
          })
          .eq('id', user.id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', sub.customer as string)
        .single()

      if (user) {
        await supabase
          .from('users')
          .update({
            plan: 'free',
            stripe_subscription_id: null,
            subscription_status: 'canceled'
          })
          .eq('id', user.id)
      }
      break
    }
  }

  return c.json({ received: true })
})

export default app
