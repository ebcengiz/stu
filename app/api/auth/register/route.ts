import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Hardcoded credentials for reliability
const SUPABASE_URL = 'https://wijpibmbxhioaohhgnqu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpanBpYm1ieGhpb2FvaGhnbnF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYwMzU4NCwiZXhwIjoyMDg1MTc5NTg0fQ.wZg971s4oSq2rXsrkVZZeo6qYXRHawUdQc5sJ5mc7oQ'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, tenantName } = body

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. Create tenant
    // Generate unique slug with random suffix
    const randomId = Math.random().toString(36).substring(2, 8)
    const tenantSlug = tenantName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') + '-' + randomId

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenantName,
        slug: tenantSlug,
      })
      .select()
      .single()

    if (tenantError) throw tenantError

    // 2. Sign up user
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    })

    if (signUpError) throw signUpError
    if (!authData.user) throw new Error('User creation failed')

    // 3. Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      tenant_id: tenant.id,
      full_name: fullName,
      role: 'admin',
    })

    if (profileError) throw profileError

    return NextResponse.json({
      success: true,
      message: 'Registration successful'
    })

  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
