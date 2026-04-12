import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureDefaultExpenseItems } from '@/lib/expense-item-seed'
import {
  applyPaidExpenseMovements,
  expenseCurrencyStr,
  undoPaidExpenseMovements,
} from '@/lib/general-expense-payment-effects'

function currencyStr(c: unknown) {
  return expenseCurrencyStr(c)
}

async function enrichOne(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  row: Record<string, unknown>
) {
  const accountIds = row.payment_account_id ? [String(row.payment_account_id)] : []
  const employeeIds = row.payment_employee_id ? [String(row.payment_employee_id)] : []

  let payment_account = null as {
    id: string
    name: string
    type: string
    currency: string
    balance: number
  } | null
  let payment_employee = null as { id: string; name: string } | null

  if (accountIds.length) {
    const { data: a } = await supabase
      .from('accounts')
      .select('id, name, type, currency, balance')
      .eq('tenant_id', tenantId)
      .eq('id', accountIds[0])
      .maybeSingle()
    if (a)
      payment_account = {
        id: a.id,
        name: a.name,
        type: a.type,
        currency: a.currency,
        balance: Number(a.balance),
      }
  }
  if (employeeIds.length) {
    const { data: e } = await supabase
      .from('employees')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('id', employeeIds[0])
      .maybeSingle()
    if (e) payment_employee = { id: e.id, name: e.name }
  }

  return { ...row, payment_account, payment_employee }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { data: row, error } = await supabase
      .from('general_expenses')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (error) throw error
    if (!row) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

    const enriched = await enrichOne(supabase, profile.tenant_id, row as Record<string, unknown>)
    return NextResponse.json(enriched)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id
    await ensureDefaultExpenseItems(supabase, tenantId)

    const { data: old, error: oldErr } = await supabase
      .from('general_expenses')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (oldErr) throw oldErr
    if (!old) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

    const body = await request.json()
    const expense_item_key = String(body.expense_item_key ?? '').trim()
    if (!expense_item_key) {
      return NextResponse.json({ error: 'Masraf kalemi zorunludur' }, { status: 400 })
    }

    const { data: defRow } = await supabase
      .from('expense_item_definitions')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('item_key', expense_item_key)
      .maybeSingle()
    if (!defRow) {
      return NextResponse.json({ error: 'Geçersiz masraf kalemi' }, { status: 400 })
    }

    const amount = body.amount_gross
    const num =
      typeof amount === 'number' ? amount : parseFloat(String(amount ?? '').replace(',', '.'))
    if (Number.isNaN(num) || num <= 0) {
      return NextResponse.json({ error: 'Geçerli tutar girin' }, { status: 400 })
    }

    const payment_status = String(body.payment_status ?? 'later')
    if (!['later', 'paid', 'partial'].includes(payment_status)) {
      return NextResponse.json({ error: 'Geçersiz ödeme durumu' }, { status: 400 })
    }

    let payment_account_id: string | null = body.payment_account_id ? String(body.payment_account_id) : null
    let payment_employee_id: string | null = body.payment_employee_id ? String(body.payment_employee_id) : null

    if (payment_account_id && payment_employee_id) {
      return NextResponse.json({ error: 'Yalnızca bir ödeme kaynağı seçin' }, { status: 400 })
    }

    if (payment_status === 'paid') {
      if (!payment_account_id && !payment_employee_id) {
        return NextResponse.json({ error: 'Ödemeyi yaptığınız hesabı veya çalışanı seçin' }, { status: 400 })
      }
    } else {
      payment_account_id = null
      payment_employee_id = null
    }

    const rowCurrency = body.currency || 'TRY'

    if (payment_account_id) {
      const { data: acc, error: aErr } = await supabase
        .from('accounts')
        .select('id, currency')
        .eq('id', payment_account_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (aErr) throw aErr
      if (!acc) return NextResponse.json({ error: 'Geçersiz hesap' }, { status: 400 })
      if (currencyStr(acc.currency) !== currencyStr(rowCurrency)) {
        return NextResponse.json({ error: 'Hesap para birimi masraf ile aynı olmalıdır' }, { status: 400 })
      }
    }

    if (payment_employee_id) {
      const { data: emp, error: eErr } = await supabase
        .from('employees')
        .select('id, currency')
        .eq('id', payment_employee_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (eErr) throw eErr
      if (!emp) return NextResponse.json({ error: 'Geçersiz çalışan' }, { status: 400 })
      if (currencyStr(emp.currency) !== currencyStr(rowCurrency)) {
        return NextResponse.json({ error: 'Çalışan para birimi masraf ile aynı olmalıdır' }, { status: 400 })
      }
    }

    const oldSnap = { ...old } as Record<string, unknown>
    const oldNum = Number(old.amount_gross)

    await undoPaidExpenseMovements(supabase, tenantId, id, old as { payment_status: string; payment_account_id?: string | null; payment_employee_id?: string | null })

    const attachment_url =
      body.attachment_url !== undefined
        ? body.attachment_url === null || body.attachment_url === ''
          ? null
          : String(body.attachment_url)
        : (old.attachment_url as string | null | undefined) ?? null

    const updateRow = {
      expense_item_key,
      transaction_date: body.transaction_date || new Date().toISOString().slice(0, 10),
      doc_no: body.doc_no?.trim() || null,
      description: body.description?.trim() || null,
      payment_status,
      payment_date: body.payment_date || null,
      amount_gross: num,
      vat_rate: body.vat_rate != null && String(body.vat_rate) !== '' ? String(body.vat_rate) : null,
      recurring: Boolean(body.recurring),
      currency: rowCurrency,
      payment_account_id,
      payment_employee_id,
      attachment_url,
    }

    const { data: updated, error: upErr } = await supabase
      .from('general_expenses')
      .update(updateRow)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (upErr) {
      try {
        await applyPaidExpenseMovements(
          supabase,
          tenantId,
          oldSnap,
          id,
          String(oldSnap.expense_item_key),
          oldNum
        )
      } catch {
        /* sunucu tutarsızlığı — log */
      }
      throw upErr
    }

    try {
      await applyPaidExpenseMovements(
        supabase,
        tenantId,
        updated as Record<string, unknown>,
        id,
        expense_item_key,
        num
      )
    } catch (inner: any) {
      await supabase
        .from('general_expenses')
        .update({
          expense_item_key: oldSnap.expense_item_key,
          transaction_date: oldSnap.transaction_date,
          doc_no: oldSnap.doc_no,
          description: oldSnap.description,
          payment_status: oldSnap.payment_status,
          payment_date: oldSnap.payment_date,
          amount_gross: oldSnap.amount_gross,
          vat_rate: oldSnap.vat_rate,
          recurring: oldSnap.recurring,
          currency: oldSnap.currency,
          payment_account_id: oldSnap.payment_account_id,
          payment_employee_id: oldSnap.payment_employee_id,
          attachment_url: oldSnap.attachment_url ?? null,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
      try {
        await applyPaidExpenseMovements(
          supabase,
          tenantId,
          oldSnap,
          id,
          String(oldSnap.expense_item_key),
          oldNum
        )
      } catch {
        /* kritik: manuel müdahale gerekebilir */
      }
      return NextResponse.json(
        { error: inner?.message || 'Ödeme hareketi kaydedilemedi' },
        { status: 500 }
      )
    }

    const enriched = await enrichOne(supabase, tenantId, updated as Record<string, unknown>)
    return NextResponse.json(enriched)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id

    const { data: exp, error: fetchErr } = await supabase
      .from('general_expenses')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!exp) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

    await undoPaidExpenseMovements(supabase, tenantId, id, exp as { payment_status: string; payment_account_id?: string | null; payment_employee_id?: string | null })

    const { error: delErr } = await supabase.from('general_expenses').delete().eq('id', id).eq('tenant_id', tenantId)

    if (delErr) throw delErr
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
