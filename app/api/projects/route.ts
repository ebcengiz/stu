import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('name', { ascending: true })

    if (error) throw error
    return NextResponse.json({ projects: data ?? [] })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const body = await request.json()
    const name = String(body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Proje adı zorunludur' }, { status: 400 })

    const description =
      body.description != null && String(body.description).trim() !== '' ? String(body.description).trim() : null

    const { data, error } = await supabase
      .from('projects')
      .insert({
        tenant_id: profile.tenant_id,
        name,
        description,
        is_active: body.is_active !== false,
      })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
