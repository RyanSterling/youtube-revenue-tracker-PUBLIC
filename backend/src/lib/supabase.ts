import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getEnv } from './env.js'

export function createServiceClient(): SupabaseClient {
  const env = getEnv()
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
}

// Helper to get or create user from clerk_id (fallback for local dev without webhooks)
export async function getUserId(supabase: SupabaseClient, clerkId: string, email?: string): Promise<string> {
  // Try to find existing user
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()

  if (data) {
    return data.id
  }

  // Create user if not found (fallback for local dev)
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      clerk_id: clerkId,
      email: email || `${clerkId}@placeholder.local`,
      plan: 'free',
    })
    .select('id')
    .single()

  if (insertError || !newUser) {
    throw new Error('Failed to create user')
  }

  return newUser.id
}

// Helper to get user with their plan info
export async function getUser(supabase: SupabaseClient, clerkId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single()

  if (error || !data) {
    throw new Error('User not found in database')
  }

  return data
}
