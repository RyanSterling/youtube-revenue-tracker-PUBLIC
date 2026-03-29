import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { createServiceClient, getUserId } from '../lib/supabase.js'

const app = new Hono()

app.use('*', requireAuth)

// Username validation regex: lowercase alphanumeric and hyphens, 3-30 chars
const USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/

// Get current user profile (including username)
app.get('/me', async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, name, username, plan')
    .eq('id', userId)
    .single()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ user })
})

// Check if username is available
app.get('/username/check', async (c) => {
  const username = c.req.query('username')

  if (!username) {
    return c.json({ error: 'Username is required' }, 400)
  }

  const normalized = username.toLowerCase()

  // Validate format
  if (!USERNAME_REGEX.test(normalized)) {
    return c.json({
      available: false,
      error: 'Username must be 3-30 characters, lowercase letters, numbers, and hyphens only. Cannot start or end with a hyphen.',
    })
  }

  // Check reserved usernames
  const reserved = ['admin', 'api', 'app', 'www', 'mail', 'help', 'support', 'billing', 'settings']
  if (reserved.includes(normalized)) {
    return c.json({ available: false, error: 'This username is reserved' })
  }

  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', normalized)
    .single()

  return c.json({ available: !existing, username: normalized })
})

// Set or update username
app.patch('/username', async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const body = await c.req.json()
  const { username } = body

  if (!username) {
    return c.json({ error: 'Username is required' }, 400)
  }

  const normalized = username.toLowerCase()

  // Validate format
  if (!USERNAME_REGEX.test(normalized)) {
    return c.json({
      error: 'Username must be 3-30 characters, lowercase letters, numbers, and hyphens only. Cannot start or end with a hyphen.',
    }, 400)
  }

  // Check reserved
  const reserved = ['admin', 'api', 'app', 'www', 'mail', 'help', 'support', 'billing', 'settings']
  if (reserved.includes(normalized)) {
    return c.json({ error: 'This username is reserved' }, 400)
  }

  // Check if taken by another user
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', normalized)
    .neq('id', userId)
    .single()

  if (existing) {
    return c.json({ error: 'This username is already taken' }, 409)
  }

  // Update username
  const { data: user, error } = await supabase
    .from('users')
    .update({ username: normalized })
    .eq('id', userId)
    .select('id, username')
    .single()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ user })
})

export default app
