import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const { data: existing, error: exErr } = await supabase
      .from('expense_item_definitions')
      .select('id, tenant_id, group_name, item_key, label, sort_order')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (exErr) throw exErr
    if (!existing) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

    const body = await request.json()
    const group_name =
      body.group_name != null ? String(body.group_name).trim() : String(existing.group_name)
    const label = body.label != null ? String(body.label).trim() : String(existing.label)
    let sort_order =
      body.sort_order != null ? parseInt(String(body.sort_order), 10) : Number(existing.sort_order)
    if (!group_name) return NextResponse.json({ error: 'Grup adı zorunludur' }, { status: 400 })
    if (!label) return NextResponse.json({ error: 'Kalem adı zorunludur' }, { status: 400 })
    if (Number.isNaN(sort_order)) sort_order = 0

    const { data: updated, error } = await supabase
      .from('expense_item_definitions')
      .update({ group_name, label, sort_order })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const { data: row, error: rErr } = await supabase
      .from('expense_item_definitions')
      .select('id, item_key')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (rErr) throw rErr
    if (!row) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

    const { count, error: cErr } = await supabase
      .from('general_expenses')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)
      .eq('expense_item_key', row.item_key)

    if (cErr) throw cErr
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Bu kalem masraf kayıtlarında kullanılıyor; silinemez.' },
        { status: 400 }
      )
    }

    const { error: dErr } = await supabase
      .from('expense_item_definitions')
      .delete()
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (dErr) throw dErr
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
