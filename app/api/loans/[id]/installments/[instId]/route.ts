import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** Taksitin tamamını öder: paid_amount = amount, kredi kalan borcu düşer */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; instId: string }> }
) {
  try {
    const { id: loanId, instId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { data: row, error: rErr } = await supabase
      .from('loan_installments')
      .select('id, loan_id, amount, paid_amount')
      .eq('id', instId)
      .eq('loan_id', loanId)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (rErr) throw rErr
    if (!row) return NextResponse.json({ error: 'Taksit bulunamadı' }, { status: 404 })

    const amount = Number(row.amount)
    const paid = Number(row.paid_amount)
    const due = Math.round((amount - paid) * 100) / 100
    if (due <= 0) {
      return NextResponse.json({ error: 'Bu taksit zaten ödendi' }, { status: 400 })
    }

    const { error: uErr } = await supabase
      .from('loan_installments')
      .update({ paid_amount: amount })
      .eq('id', instId)
      .eq('tenant_id', profile.tenant_id)

    if (uErr) throw uErr

    const { data: loan } = await supabase
      .from('loans')
      .select('remaining_debt')
      .eq('id', loanId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (loan) {
      const newRem = Math.max(0, Math.round((Number(loan.remaining_debt) - due) * 100) / 100)
      await supabase
        .from('loans')
        .update({ remaining_debt: newRem, updated_at: new Date().toISOString() })
        .eq('id', loanId)
        .eq('tenant_id', profile.tenant_id)
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
