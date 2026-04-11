import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { adjustAccountBalance } from '@/lib/account-balance'

function currencyStr(c: unknown) {
  return c == null ? 'TRY' : String(c)
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; txId: string }> }
) {
  try {
    const { id: employeeId, txId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id

    const { data: row, error: fetchErr } = await supabase
      .from('employee_cari_transactions')
      .select('*')
      .eq('id', txId)
      .eq('tenant_id', tenantId)
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!row) return NextResponse.json({ error: 'Hareket bulunamadı' }, { status: 404 })

    const entry = String(row.entry_type)
    const signed = Number(row.signed_amount)
    const accountId = row.account_id as string | null
    const cur = currencyStr(row.currency)

    if (accountId && (entry === 'payment' || entry === 'advance_given')) {
      try {
        await adjustAccountBalance(supabase, {
          tenantId,
          accountId,
          delta: Math.abs(signed),
          currency: cur,
        })
      } catch (e: any) {
        return NextResponse.json(
          { error: e.message || 'Hesap bakiyesi geri alınamadı' },
          { status: 400 }
        )
      }
    }

    if (accountId && entry === 'advance_refund') {
      try {
        await adjustAccountBalance(supabase, {
          tenantId,
          accountId,
          delta: -Math.abs(signed),
          currency: cur,
        })
      } catch (e: any) {
        return NextResponse.json(
          { error: e.message || 'Hesap bakiyesi geri alınamadı' },
          { status: 400 }
        )
      }
    }

    const { error: delErr } = await supabase
      .from('employee_cari_transactions')
      .delete()
      .eq('id', txId)
      .eq('tenant_id', tenantId)
      .eq('employee_id', employeeId)

    if (delErr) throw delErr
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
