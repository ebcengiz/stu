import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function assertProject(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string, projectId: string) {
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return data
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const proj = await assertProject(supabase, profile.tenant_id, projectId)
    if (!proj) return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 })

    const { data: rows, error } = await supabase
      .from('project_notes')
      .select('*')
      .eq('project_id', projectId)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ notes: rows ?? [] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Hata'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id
    const proj = await assertProject(supabase, tenantId, projectId)
    if (!proj) return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const text = body.body != null ? String(body.body).trim() : ''
    if (!text) return NextResponse.json({ error: 'Not metni boş olamaz' }, { status: 400 })

    const { data: row, error } = await supabase
      .from('project_notes')
      .insert({
        tenant_id: tenantId,
        project_id: projectId,
        body: text,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(row)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Hata'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
