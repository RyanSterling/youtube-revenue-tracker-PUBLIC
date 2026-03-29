// Cloudflare Workers environment bindings
export type Bindings = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  CLERK_SECRET_KEY: string
  CLERK_WEBHOOK_SECRET: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_CONNECT_CLIENT_ID: string
  YOUTUBE_API_KEY: string
  FRONTEND_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REDIRECT_URI: string
}
