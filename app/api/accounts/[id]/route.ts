import { createClient } from '@/lib/supabase/server'
import { clearReferencesToAccount } from '@/lib/clear-account-references'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await context.params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: account, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return NextResponse.json(account)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await context.params
    const body = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const updates: Record<string, unknown> = {}
    const fields = ['name', 'type', 'currency', 'bank_name', 'iban', 'balance', 'credit_limit', 'is_active'] as const
    for (const f of fields) {
      if (f in body && body[f] !== undefined) {
        if (f === 'balance' || f === 'credit_limit') updates[f] = body[f] == null ? null : Number(body[f])
        else updates[f] = body[f]
      }
    }
    updates.updated_at = new Date().toISOString()

    const { data: row, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(row)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await context.params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id

    await clearReferencesToAccount(supabase, tenantId, id)

    const { error, count } = await supabase
      .from('accounts')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) throw error
    if (!count) return NextResponse.json({ error: 'Hesap bulunamadı' }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
