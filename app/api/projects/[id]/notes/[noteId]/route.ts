import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: projectId, noteId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id
    const body = await request.json().catch(() => ({}))
    const text = body.body != null ? String(body.body).trim() : ''
    if (!text) return NextResponse.json({ error: 'Not metni boş olamaz' }, { status: 400 })

    const { data: row, error } = await supabase
      .from('project_notes')
      .update({ body: text, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .eq('project_id', projectId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    if (!row) return NextResponse.json({ error: 'Not bulunamadı' }, { status: 404 })
    return NextResponse.json(row)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Hata'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: projectId, noteId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { error } = await supabase
      .from('project_notes')
      .delete()
      .eq('id', noteId)
      .eq('project_id', projectId)
      .eq('tenant_id', profile.tenant_id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Hata'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
