import { createBrowserClient } from '@supabase/ssr'

// Supabase config - public keys, güvenli
const SUPABASE_URL = 'https://wijpibmbxhioaohhgnqu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpanBpYm1ieGhpb2FvaGhnbnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDM1ODQsImV4cCI6MjA4NTE3OTU4NH0.Z9pmOxIIYVxwYyXYz9vSD_n6VProfY3EZvL1FRFgeHA'

export function createClient() {
  // Try env vars first, fallback to constants
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

  // Debug log (production'da da görmek için)
  if (typeof window !== 'undefined') {
    console.log('[Supabase Client] URL:', supabaseUrl?.substring(0, 30) + '...')
    console.log('[Supabase Client] Key exists:', !!supabaseAnonKey)
    console.log('[Supabase Client] Key length:', supabaseAnonKey?.length)
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
