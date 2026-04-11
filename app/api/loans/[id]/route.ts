import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SCHEDULES = [
  'monthly',
  'every_2_months',
  'every_3_months',
  'every_4_months',
  'every_6_months',
  'yearly',
] as const

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { data: loan, error: lErr } = await supabase
      .from('loans')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (lErr) throw lErr
    if (!loan) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

    const { data: inst, error: iErr } = await supabase
      .from('loan_installments')
      .select('*')
      .eq('loan_id', id)
      .eq('tenant_id', profile.tenant_id)
      .order('sort_order', { ascending: true })

    if (iErr) throw iErr

    let payment_account = null as { id: string; name: string } | null
    if (loan.payment_account_id) {
      const { data: acc } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('id', loan.payment_account_id)
        .eq('tenant_id', profile.tenant_id)
        .maybeSingle()
      payment_account = acc
    }

    return NextResponse.json({
      loan: { ...loan, payment_account },
      installments: inst ?? [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { data: existing } = await supabase
      .from('loans')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.name != null) {
      const name = String(body.name).trim()
      if (!name) return NextResponse.json({ error: 'Kredi adı zorunludur' }, { status: 400 })
      updates.name = name
    }
    if (body.remaining_debt != null) {
      const remaining_debt = parseFloat(String(body.remaining_debt).replace(',', '.'))
      if (Number.isNaN(remaining_debt) || remaining_debt < 0) {
        return NextResponse.json({ error: 'Geçerli kalan borç tutarı girin' }, { status: 400 })
      }
      updates.remaining_debt = remaining_debt
    }
    if (body.remaining_installments != null) {
      const remaining_installments = parseInt(String(body.remaining_installments), 10)
      if (Number.isNaN(remaining_installments) || remaining_installments < 0 || remaining_installments > 144) {
        return NextResponse.json({ error: 'Kalan taksit 0–144 arasında olmalıdır' }, { status: 400 })
      }
      updates.remaining_installments = remaining_installments
    }
    if (body.next_installment_date !== undefined) {
      updates.next_installment_date =
        body.next_installment_date && String(body.next_installment_date).trim() !== ''
          ? String(body.next_installment_date).slice(0, 10)
          : null
    }
    if (body.payment_schedule != null) {
      const payment_schedule = String(body.payment_schedule)
      if (!SCHEDULES.includes(payment_schedule as (typeof SCHEDULES)[number])) {
        return NextResponse.json({ error: 'Geçersiz ödeme takvimi' }, { status: 400 })
      }
      updates.payment_schedule = payment_schedule
    }
    if (body.payment_account_id !== undefined) {
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
      updates.payment_account_id = payment_account_id
    }
    if (body.notes !== undefined) {
      updates.notes = body.notes != null && String(body.notes).trim() !== '' ? String(body.notes).trim() : null
    }
    if (body.currency != null) updates.currency = String(body.currency)
    if (body.total_loan_amount != null) {
      const total_loan_amount = parseFloat(String(body.total_loan_amount).replace(',', '.'))
      if (Number.isNaN(total_loan_amount) || total_loan_amount < 0) {
        return NextResponse.json({ error: 'Geçerli toplam kredi tutarı girin' }, { status: 400 })
      }
      updates.total_loan_amount = total_loan_amount
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('loans')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(data)
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
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { error } = await supabase.from('loans').delete().eq('id', id).eq('tenant_id', profile.tenant_id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
