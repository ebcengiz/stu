import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: warehouses, error } = await supabase
      .from('warehouses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(warehouses)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    // Remove undefined values and empty strings from insert data
    const cleanData = Object.fromEntries(
      Object.entries(body).filter(([_, v]) => v !== undefined && v !== '')
    )

    const { data: warehouse, error } = await supabase
      .from('warehouses')
      .insert({
        ...cleanData,
        tenant_id: profile.tenant_id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(warehouse)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
