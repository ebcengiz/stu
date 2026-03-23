import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Hardcoded credentials for reliability as seen in auth/register
const SUPABASE_URL = 'https://wijpibmbxhioaohhgnqu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpanBpYm1ieGhpb2FvaGhnbnF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYwMzU4NCwiZXhwIjoyMDg1MTc5NTg0fQ.wZg971s4oSq2rXsrkVZZeo6qYXRHawUdQc5sJ5mc7oQ'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) throw new Error('Unauthorized')

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', currentUser.id)
      .single()

    if (currentProfile?.role !== 'admin') {
      throw new Error('Forbidden: Only admins can add users')
    }

    const body = await request.json()
    const { email, password, fullName, role } = body

    // Create Supabase client with service role (bypasses RLS & allows user creation)
    const adminAuthClient = createSupabaseClient(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. Create Auth User
    const { data: authData, error: signUpError } = await adminAuthClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    })

    if (signUpError) throw signUpError
    if (!authData.user) throw new Error('User creation failed')

    // 2. Create Profile
    const { error: profileError } = await adminAuthClient.from('profiles').insert({
      id: authData.user.id,
      tenant_id: currentProfile.tenant_id,
      full_name: fullName,
      role: role || 'user',
    })

    if (profileError) {
      // Rollback user creation if profile fails
      await adminAuthClient.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
    })

  } catch (error: any) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}
