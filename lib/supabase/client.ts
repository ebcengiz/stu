import { createBrowserClient } from '@supabase/ssr'

// Supabase config - public keys, güvenli
const SUPABASE_URL = 'https://wijpibmbxhioaohhgnqu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpanBpYm1ieGhpb2FvaGhnbnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDM1ODQsImV4cCI6MjA4NTE3OTU4NH0.Z9pmOxIIYVxwYyXYz9vSD_n6VProfY3EZvL1FRFgeHA'

export function createClient() {
  // CRITICAL FIX: trim() removes newline characters that cause "Invalid value" error
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL).trim()
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY).trim()

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
