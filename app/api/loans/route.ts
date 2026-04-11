import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildInstallmentPlan } from '@/lib/loan-schedule'

const SCHEDULES = [
  'monthly',
  'every_2_months',
  'every_3_months',
  'every_4_months',
  'every_6_months',
  'yearly',
] as const

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
      .from('loans')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const rows = data ?? []
    const accountIds = [...new Set(rows.map((r) => r.payment_account_id).filter(Boolean))] as string[]
    const accMap = new Map<string, { id: string; name: string }>()
    if (accountIds.length) {
      const { data: accs } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('tenant_id', profile.tenant_id)
        .in('id', accountIds)
      for (const a of accs ?? []) accMap.set(a.id, { id: a.id, name: a.name })
    }

    const enriched = rows.map((r) => ({
      ...r,
      payment_account: r.payment_account_id ? accMap.get(r.payment_account_id) ?? null : null,
    }))

    const loanIds = enriched.map((r) => r.id as string)
    let thisMonthByLoan = new Map<string, number>()
    if (loanIds.length) {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
      const { data: instRows } = await supabase
        .from('loan_installments')
        .select('loan_id, amount, paid_amount, due_date')
        .eq('tenant_id', profile.tenant_id)
        .in('loan_id', loanIds)
        .gte('due_date', start)
        .lte('due_date', end)

      for (const row of instRows ?? []) {
        const lid = row.loan_id as string
        const due = Number(row.amount) - Number(row.paid_amount)
        if (due > 0) {
          thisMonthByLoan.set(lid, (thisMonthByLoan.get(lid) ?? 0) + due)
        }
      }
    }

    const withMonth = enriched.map((r) => ({
      ...r,
      this_month_due: thisMonthByLoan.get(r.id as string) ?? 0,
    }))

    const total_remaining = withMonth.reduce((s, r) => s + Number(r.remaining_debt ?? 0), 0)
    const this_month_total = withMonth.reduce((s, r) => s + Number(r.this_month_due ?? 0), 0)

    return NextResponse.json({
      loans: withMonth,
      summary: {
        total_remaining,
        this_month_due: this_month_total,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
    if (!name) return NextResponse.json({ error: 'Kredi adı zorunludur' }, { status: 400 })

    const remaining_debt = parseFloat(String(body.remaining_debt ?? '').replace(',', '.'))
    if (Number.isNaN(remaining_debt) || remaining_debt < 0) {
      return NextResponse.json({ error: 'Geçerli kalan borç tutarı girin' }, { status: 400 })
    }

    const remaining_installments = parseInt(String(body.remaining_installments ?? '0'), 10)
    if (Number.isNaN(remaining_installments) || remaining_installments < 0 || remaining_installments > 144) {
      return NextResponse.json({ error: 'Kalan taksit 0–144 arasında olmalıdır' }, { status: 400 })
    }

    const payment_schedule = String(body.payment_schedule ?? 'monthly')
    if (!SCHEDULES.includes(payment_schedule as (typeof SCHEDULES)[number])) {
      return NextResponse.json({ error: 'Geçersiz ödeme takvimi' }, { status: 400 })
    }

    let payment_account_id: string | null = body.payment_account_id ? String(body.payment_account_id) : null
    if (payment_account_id) {
      const { data: acc } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', payment_account_id)
        .eq('tenant_id', profile.tenant_id)
        .maybeSingle()
      if (!acc) return NextResponse.json({ error: 'Geçersiz hesap' }, { status: 400 })
    } else {
      payment_account_id = null
    }

    const next_installment_date =
      body.next_installment_date && String(body.next_installment_date).trim() !== ''
        ? String(body.next_installment_date).slice(0, 10)
        : null

    const notes = body.notes != null && String(body.notes).trim() !== '' ? String(body.notes).trim() : null
    const currency = body.currency ? String(body.currency) : 'TRY'

    let total_loan_amount = remaining_debt
    if (body.total_loan_amount != null && String(body.total_loan_amount).trim() !== '') {
      const t = parseFloat(String(body.total_loan_amount).replace(',', '.'))
      if (!Number.isNaN(t) && t >= 0) total_loan_amount = t
    }

    const row = {
      tenant_id: profile.tenant_id,
      name,
      total_loan_amount,
      remaining_debt,
      remaining_installments,
      next_installment_date,
      payment_schedule,
      payment_account_id,
      notes,
      currency,
    }

    const { data, error } = await supabase.from('loans').insert(row).select('*').single()
    if (error) throw error

    const loanId = data.id as string
    if (next_installment_date && remaining_installments > 0) {
      const plan = buildInstallmentPlan({
        remaining_debt,
        remaining_installments,
        next_installment_date,
        payment_schedule,
      })
      if (plan.length) {
        const insRows = plan.map((p) => ({
          loan_id: loanId,
          tenant_id: profile.tenant_id,
          sort_order: p.sort_order,
          due_date: p.due_date,
          amount: p.amount,
          paid_amount: p.paid_amount,
        }))
        const { error: insErr } = await supabase.from('loan_installments').insert(insRows)
        if (insErr) throw insErr
      }
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
