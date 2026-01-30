import { createBrowserClient } from '@supabase/ssr'

// Supabase config - hardcoded for reliability (public keys safe to expose)
const SUPABASE_URL = 'https://wijpibmbxhioaohhgnqu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpanBpYm1ieGhpb2FvaGhnbnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDM1ODQsImV4cCI6MjA4NTE3OTU4NH0.Z9pmOxIIYVxwYyXYz9vSD_n6VProfY3EZvL1FRFgeHA'

export function createClient() {
  // Use hardcoded values directly - env vars causing issues with newlines
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
