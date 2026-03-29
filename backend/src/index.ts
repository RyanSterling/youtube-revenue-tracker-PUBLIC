import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { setEnv } from './lib/env.js'
import { TRACKER_JS } from './lib/tracker-content.js'
import type { Bindings } from './types/env.js'

// Routes
import auth from './routes/auth.js'
import youtube from './routes/youtube.js'
import offers from './routes/offers.js'
import videos from './routes/videos.js'
import dashboard from './routes/dashboard.js'
import stripe from './routes/stripe.js'
import billing from './routes/billing.js'
import { videoTracking, sourceTracking } from './routes/tracking.js'
import sources from './routes/sources.js'
import freebies from './routes/freebies.js'
import conversions from './routes/conversions.js'
import freebieConversion from './routes/freebie-conversion.js'
import users from './routes/users.js'

const app = new Hono<{ Bindings: Bindings }>()

// Set env for each request (makes env available to all route handlers)
app.use('*', async (c, next) => {
  setEnv(c.env)
  await next()
})

// Middleware
app.use('*', logger())
app.use('/api/*', cors({
  origin: (origin, c) => {
    const frontendUrl = c.env?.FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:5173'
    return origin === frontendUrl ? origin : frontendUrl
  },
  credentials: true,
}))

// API routes
app.route('/api/auth', auth)
app.route('/api/youtube', youtube)
app.route('/api/offers', offers)
app.route('/api/videos', videos)
app.route('/api/dashboard', dashboard)
app.route('/api/stripe', stripe)
app.route('/api/billing', billing)
app.route('/api/sources', sources)
app.route('/api/freebies', freebies)
app.route('/api/conversions', conversions)
app.route('/api/users', users)

// Public tracking (no auth)
app.route('/v', videoTracking)   // /v/:youtubeId/:offerSlug
app.route('/u', sourceTracking)  // /u/:username/l/:sourceSlug

// Public freebie conversion endpoint (CORS enabled)
app.route('/api/freebie-conversion', freebieConversion)

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

// Serve tracker.js for custom landing page integration
app.get('/tracker.js', (c) => {
  return c.text(TRACKER_JS, 200, {
    'Content-Type': 'application/javascript',
    'Cache-Control': 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*',
  })
})

// Export for Cloudflare Workers
export default app
