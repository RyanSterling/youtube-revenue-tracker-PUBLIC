import { config } from 'dotenv'
config({ path: '../.env' })
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('/api/*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
app.get('/tracker.js', async (c) => {
  try {
    const trackerPath = join(__dirname, 'public', 'tracker.js')
    const content = await readFile(trackerPath, 'utf-8')
    return c.text(content, 200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    })
  } catch {
    return c.text('// Tracker not found', 404, {
      'Content-Type': 'application/javascript',
    })
  }
})

const port = parseInt(process.env.PORT || '3001')

serve({ fetch: app.fetch, port })
console.log(`Hono server running on http://localhost:${port}`)
