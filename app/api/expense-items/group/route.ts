import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function requireTenant() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) {
    return { error: NextResponse.json({ error: 'Profile not found' }, { status: 400 }) }
  }
  return { supabase, tenantId: profile.tenant_id as string }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireTenant()
    if ('error' in ctx) return ctx.error
    const { supabase, tenantId } = ctx

    const body = await request.json()
    const oldName = String(body.oldName ?? '').trim()
    const newName = String(body.newName ?? '').trim()
    if (!oldName) return NextResponse.json({ error: 'Eski grup adı zorunludur' }, { status: 400 })
    if (!newName) return NextResponse.json({ error: 'Yeni grup adı zorunludur' }, { status: 400 })
    if (oldName === newName) return NextResponse.json({ ok: true })

    const { data: existing, error: exErr } = await supabase
      .from('expense_item_definitions')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('group_name', oldName)
    if (exErr) throw exErr
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Ana kalem bulunamadı' }, { status: 404 })
    }

    const { error: uErr } = await supabase
      .from('expense_item_definitions')
      .update({ group_name: newName })
      .eq('tenant_id', tenantId)
      .eq('group_name', oldName)
    if (uErr) throw uErr

    return NextResponse.json({ ok: true, updated: existing.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireTenant()
    if ('error' in ctx) return ctx.error
    const { supabase, tenantId } = ctx

    const url = new URL(request.url)
    const groupName = (url.searchParams.get('name') ?? '').trim()
    if (!groupName) return NextResponse.json({ error: 'Grup adı zorunludur' }, { status: 400 })

    const { data: rows, error: rErr } = await supabase
      .from('expense_item_definitions')
      .select('id, item_key')
      .eq('tenant_id', tenantId)
      .eq('group_name', groupName)
    if (rErr) throw rErr
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Ana kalem bulunamadı' }, { status: 404 })
    }

    const keys = rows.map((r) => r.item_key).filter(Boolean) as string[]
    if (keys.length > 0) {
      const { count, error: cErr } = await supabase
        .from('general_expenses')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('expense_item_key', keys)
      if (cErr) throw cErr
      if ((count ?? 0) > 0) {
        return NextResponse.json(
          {
            error:
              'Bu ana kalemin alt hesaplarından en az biri masraf kayıtlarında kullanılıyor; silinemez.',
          },
          { status: 400 }
        )
      }
    }

    const { error: dErr } = await supabase
      .from('expense_item_definitions')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('group_name', groupName)
    if (dErr) throw dErr

    return NextResponse.json({ ok: true, deleted: rows.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
