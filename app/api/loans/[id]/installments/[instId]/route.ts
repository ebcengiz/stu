import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { adjustAccountBalance } from '@/lib/account-balance'

/** Taksit ödemesi: paid_amount artar, kredi kalan borcu düşer, seçilen hesaptan çıkış kaydedilir */
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

    const tenantId = profile.tenant_id

    const body = await request.json().catch(() => ({}))
    const payment_account_id = body.payment_account_id ? String(body.payment_account_id).trim() : ''
    if (!payment_account_id) {
      return NextResponse.json({ error: 'Ödeme yapılacak hesabı seçin' }, { status: 400 })
    }

    const { data: accRow } = await supabase
      .from('accounts')
      .select('id, currency, is_active')
      .eq('id', payment_account_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!accRow) return NextResponse.json({ error: 'Geçersiz hesap' }, { status: 400 })
    if (accRow.is_active === false) {
      return NextResponse.json({ error: 'Pasif hesaba işlem yapılamaz' }, { status: 400 })
    }

    const { data: row, error: rErr } = await supabase
      .from('loan_installments')
      .select('id, loan_id, amount, paid_amount')
      .eq('id', instId)
      .eq('loan_id', loanId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (rErr) throw rErr
    if (!row) return NextResponse.json({ error: 'Taksit bulunamadı' }, { status: 404 })

    const instAmount = Number(row.amount)
    const paid = Number(row.paid_amount)
    const due = Math.round((instAmount - paid) * 100) / 100
    if (due <= 0) {
      return NextResponse.json({ error: 'Bu taksit zaten ödendi' }, { status: 400 })
    }

    const { data: loan, error: lErr } = await supabase
      .from('loans')
      .select('id, remaining_debt, currency, name')
      .eq('id', loanId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (lErr) throw lErr
    if (!loan) return NextResponse.json({ error: 'Kredi bulunamadı' }, { status: 404 })

    const currency = String(loan.currency || 'TRY')
    if (String(accRow.currency || 'TRY') !== currency) {
      return NextResponse.json(
        { error: `Hesap para birimi kredi ile aynı olmalıdır (${currency})` },
        { status: 400 }
      )
    }

    let payAmount = due
    if (body.amount != null && String(body.amount).trim() !== '') {
      const raw = String(body.amount).replace(/\./g, '').replace(',', '.')
      payAmount = parseFloat(raw)
      if (Number.isNaN(payAmount) || payAmount <= 0) {
        return NextResponse.json({ error: 'Geçerli tutar girin' }, { status: 400 })
      }
    }

    payAmount = Math.round(payAmount * 100) / 100
    if (payAmount > due + 0.0001) {
      return NextResponse.json({ error: 'Tutar kalan taksit tutarını aşamaz' }, { status: 400 })
    }

    const newPaid = Math.round((paid + payAmount) * 100) / 100
    if (newPaid > instAmount + 0.0001) {
      return NextResponse.json({ error: 'Geçersiz ödeme tutarı' }, { status: 400 })
    }

    const prevDebt = Number(loan.remaining_debt)
    const newDebt = Math.max(0, Math.round((prevDebt - payAmount) * 100) / 100)

    const txDate =
      body.transaction_date && String(body.transaction_date).trim() !== ''
        ? new Date(String(body.transaction_date).slice(0, 10) + 'T12:00:00').toISOString()
        : new Date().toISOString()

    const { error: uInstErr } = await supabase
      .from('loan_installments')
      .update({ paid_amount: newPaid })
      .eq('id', instId)
      .eq('tenant_id', tenantId)

    if (uInstErr) throw uInstErr

    const { error: uLoanErr } = await supabase
      .from('loans')
      .update({ remaining_debt: newDebt, updated_at: new Date().toISOString() })
      .eq('id', loanId)
      .eq('tenant_id', tenantId)

    if (uLoanErr) {
      await supabase
        .from('loan_installments')
        .update({ paid_amount: paid })
        .eq('id', instId)
        .eq('tenant_id', tenantId)
      throw uLoanErr
    }

    let accountDebited = false
    try {
      await adjustAccountBalance(supabase, {
        tenantId,
        accountId: payment_account_id,
        delta: -payAmount,
        currency,
      })
      accountDebited = true
      const { error: ledErr } = await supabase.from('account_ledger_entries').insert({
        tenant_id: tenantId,
        account_id: payment_account_id,
        entry_type: 'outflow',
        amount: payAmount,
        currency,
        description: `Kredi taksit ödemesi: ${String(loan.name || 'Kredi')}`,
        transaction_date: txDate,
      })
      if (ledErr) throw new Error(ledErr.message)
    } catch (balanceErr: unknown) {
      if (accountDebited) {
        try {
          await adjustAccountBalance(supabase, {
            tenantId,
            accountId: payment_account_id,
            delta: payAmount,
            currency,
          })
        } catch {
          /* yedek: bakiye elle kontrol edilmeli */
        }
      }
      await supabase
        .from('loan_installments')
        .update({ paid_amount: paid })
        .eq('id', instId)
        .eq('tenant_id', tenantId)
      await supabase
        .from('loans')
        .update({ remaining_debt: prevDebt, updated_at: new Date().toISOString() })
        .eq('id', loanId)
        .eq('tenant_id', tenantId)
      const msg = balanceErr instanceof Error ? balanceErr.message : 'Hesap güncellenemedi'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Sunucu hatası'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
