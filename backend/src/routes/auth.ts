import { Hono } from 'hono'
import { Webhook } from 'svix'
import { createServiceClient } from '../lib/supabase.js'

const app = new Hono()

// Clerk webhook - syncs users to Supabase
app.post('/webhook', async (c) => {
  const body = await c.req.text()
  const svixId = c.req.header('svix-id')
  const svixTimestamp = c.req.header('svix-timestamp')
  const svixSignature = c.req.header('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ error: 'Missing svix headers' }, 400)
  }

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)

  let evt: {
    type: string
    data: {
      id: string
      email_addresses?: Array<{ email_address: string }>
      first_name?: string
      last_name?: string
    }
  }

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof evt
  } catch {
    return c.json({ error: 'Invalid signature' }, 400)
  }

  const supabase = createServiceClient()

  if (evt.type === 'user.created') {
    const { error } = await supabase.from('users').insert({
      clerk_id: evt.data.id,
      email: evt.data.email_addresses?.[0]?.email_address || '',
      name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim() || null,
      plan: 'free',
    })

    if (error) {
      console.error('Failed to create user:', error)
      return c.json({ error: 'Failed to create user' }, 500)
    }
  }

  if (evt.type === 'user.updated') {
    const { error } = await supabase
      .from('users')
      .update({
        email: evt.data.email_addresses?.[0]?.email_address,
        name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim() || null,
      })
      .eq('clerk_id', evt.data.id)

    if (error) {
      console.error('Failed to update user:', error)
    }
  }

  if (evt.type === 'user.deleted') {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('clerk_id', evt.data.id)

    if (error) {
      console.error('Failed to delete user:', error)
    }
  }

  return c.json({ received: true })
})

export default app
