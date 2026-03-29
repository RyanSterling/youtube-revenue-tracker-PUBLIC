// Global env storage for Cloudflare Workers compatibility
// This gets set per-request by middleware in index.ts

import type { Bindings } from '../types/env.js'

let currentEnv: Bindings | null = null

export function setEnv(env: Bindings) {
  currentEnv = env
}

export function getEnv(): Bindings {
  if (currentEnv) return currentEnv

  // Fallback to process.env for local development
  return {
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET!,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
    STRIPE_CONNECT_CLIENT_ID: process.env.STRIPE_CONNECT_CLIENT_ID!,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY!,
    FRONTEND_URL: process.env.FRONTEND_URL!,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI!,
  }
}
