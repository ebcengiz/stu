import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('shelf_locations')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const name = String(body.name ?? '').trim()
    if (!name) throw new Error('Raf adı gerekli')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    const { data: row, error } = await supabase
      .from('shelf_locations')
      .insert({
        tenant_id: profile.tenant_id,
        name,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('shelf_locations')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .eq('name', name)
          .single()
        if (existing) return NextResponse.json(existing)
      }
      throw error
    }

    return NextResponse.json(row)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
