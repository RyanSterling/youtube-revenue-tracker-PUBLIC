import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { createServiceClient, getUserId } from '../lib/supabase.js'

const app = new Hono()

app.use('*', requireAuth)

// Get all sources for user (with optional offer_id filter)
app.get('/', async (c) => {
  const clerkId = c.get('clerkId')
  const offerId = c.req.query('offer_id')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  let query = supabase
    .from('sources')
    .select('*')
    .eq('user_id', userId)

  if (offerId) {
    query = query.eq('offer_id', offerId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ sources: data })
})

// Create source
app.post('/', async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const body = await c.req.json()
  const { name, slug, destination_url } = body

  const { data, error } = await supabase
    .from('sources')
    .insert({
      user_id: userId,
      name,
      slug,
      destination_url,
    })
    .select()
    .single()

  if (error) {
    return c.json({ error: error.message }, 400)
  }

  return c.json({ source: data })
})

// Update source
app.patch('/:id', async (c) => {
  const clerkId = c.get('clerkId')
  const sourceId = c.req.param('id')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const body = await c.req.json()

  const { data, error } = await supabase
    .from('sources')
    .update(body)
    .eq('id', sourceId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    return c.json({ error: error.message }, 400)
  }

  return c.json({ source: data })
})

// Delete source
app.delete('/:id', async (c) => {
  const clerkId = c.get('clerkId')
  const sourceId = c.req.param('id')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const { error } = await supabase
    .from('sources')
    .delete()
    .eq('id', sourceId)
    .eq('user_id', userId)

  if (error) {
    return c.json({ error: error.message }, 400)
  }

  return c.json({ success: true })
})

export default app
