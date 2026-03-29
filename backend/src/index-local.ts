// Local development server using Node.js
// Run with: npm run dev:local

import { config } from 'dotenv'
config({ path: '../.env' })

import { serve } from '@hono/node-server'
import app from './index.js'

const port = parseInt(process.env.PORT || '3001')

serve({ fetch: app.fetch, port })
console.log(`Hono server running on http://localhost:${port}`)
