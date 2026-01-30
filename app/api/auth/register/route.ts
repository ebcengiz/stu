import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, tenantName } = body

    // Create Supabase client with service role (bypasses RLS)
    // CRITICAL FIX: trim() removes newline characters
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
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
