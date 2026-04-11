import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** Yeni taksit satırı ekler (borç ve toplam tutar artar) */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: loanId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { data: loan, error: lErr } = await supabase
      .from('loans')
      .select('id, remaining_debt, remaining_installments, total_loan_amount')
      .eq('id', loanId)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (lErr) throw lErr
    if (!loan) return NextResponse.json({ error: 'Kredi bulunamadı' }, { status: 404 })

    const body = await request.json()
    const due_date =
      body.due_date && String(body.due_date).trim() !== '' ? String(body.due_date).slice(0, 10) : null
    if (!due_date) return NextResponse.json({ error: 'Tarih zorunludur' }, { status: 400 })

    const amt = parseFloat(String(body.amount ?? '').replace(',', '.'))
    if (Number.isNaN(amt) || amt <= 0) return NextResponse.json({ error: 'Geçerli tutar girin' }, { status: 400 })

    const { data: maxRow } = await supabase
      .from('loan_installments')
      .select('sort_order')
      .eq('loan_id', loanId)
      .eq('tenant_id', profile.tenant_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = (maxRow?.sort_order ?? 0) + 1

    const { error: insErr } = await supabase.from('loan_installments').insert({
      loan_id: loanId,
      tenant_id: profile.tenant_id,
      sort_order: nextOrder,
      due_date,
      amount: amt,
      paid_amount: 0,
    })
    if (insErr) throw insErr

    const newDebt = Math.round((Number(loan.remaining_debt) + amt) * 100) / 100
    const newTotal = Math.round((Number(loan.total_loan_amount ?? loan.remaining_debt) + amt) * 100) / 100
    const newInst = Number(loan.remaining_installments) + 1

    const { error: upErr } = await supabase
      .from('loans')
      .update({
        remaining_debt: newDebt,
        total_loan_amount: newTotal,
        remaining_installments: newInst,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId)
      .eq('tenant_id', profile.tenant_id)

    if (upErr) throw upErr

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
