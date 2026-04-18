import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureDefaultExpenseItems } from '@/lib/expense-item-seed'
import { applyPaidExpenseMovements } from '@/lib/general-expense-payment-effects'
import { resolveOptionalProjectId } from '@/lib/project-validation'

function currencyStr(c: unknown) {
  return c == null ? 'TRY' : String(c)
}

type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

type RecurrencePayload = {
  start_date: string | null
  end_date: string | null
  frequency: RecurrenceFrequency
  day: string | null
}

export type ExpenseWithRelations = Record<string, unknown> & {
  payment_account?: { id: string; name: string; type: string; currency?: string; balance?: number } | null
  payment_employee?: { id: string; name: string } | null
  recurrence?: RecurrencePayload | null
}

export function normalizeRecurrenceInput(
  input: unknown,
  recurring: boolean
): {
  recurrence_start_date: string | null
  recurrence_end_date: string | null
  recurrence_frequency: RecurrenceFrequency | null
  recurrence_day: string | null
} {
  if (!recurring || !input || typeof input !== 'object') {
    return {
      recurrence_start_date: null,
      recurrence_end_date: null,
      recurrence_frequency: null,
      recurrence_day: null,
    }
  }
  const obj = input as Record<string, unknown>
  const freqRaw = typeof obj.frequency === 'string' ? obj.frequency : 'monthly'
  const freq = (['daily', 'weekly', 'monthly', 'yearly'] as const).includes(
    freqRaw as RecurrenceFrequency
  )
    ? (freqRaw as RecurrenceFrequency)
    : 'monthly'
  const pickDate = (v: unknown) => {
    const s = typeof v === 'string' ? v.trim() : ''
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
  }
  const dayRaw = obj.day
  const day =
    freq === 'daily'
      ? null
      : dayRaw == null || dayRaw === ''
        ? null
        : String(dayRaw).trim() || null
  return {
    recurrence_start_date: pickDate(obj.start_date),
    recurrence_end_date: pickDate(obj.end_date),
    recurrence_frequency: freq,
    recurrence_day: day,
  }
}

export function attachRecurrence<T extends Record<string, unknown>>(row: T): T & { recurrence: RecurrencePayload | null } {
  const recurring = Boolean(row.recurring)
  const freq = row.recurrence_frequency as RecurrenceFrequency | null | undefined
  if (!recurring || !freq) {
    return { ...row, recurrence: null }
  }
  return {
    ...row,
    recurrence: {
      start_date: (row.recurrence_start_date as string | null) ?? null,
      end_date: (row.recurrence_end_date as string | null) ?? null,
      frequency: freq,
      day: (row.recurrence_day as string | null) ?? null,
    },
  }
}

async function enrichExpenses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  rows: Record<string, unknown>[]
): Promise<ExpenseWithRelations[]> {
  if (!rows.length) return []
  const accountIds = [...new Set(rows.map((r) => r.payment_account_id).filter(Boolean))] as string[]
  const employeeIds = [...new Set(rows.map((r) => r.payment_employee_id).filter(Boolean))] as string[]

  const accMap = new Map<string, { id: string; name: string; type: string; currency: string; balance: number }>()
  if (accountIds.length) {
    const { data: accs } = await supabase
      .from('accounts')
      .select('id, name, type, currency, balance')
      .eq('tenant_id', tenantId)
      .in('id', accountIds)
    for (const a of accs ?? []) {
      accMap.set(a.id, {
        id: a.id,
        name: a.name,
        type: a.type,
        currency: a.currency,
        balance: Number(a.balance),
      })
    }
  }

  const empMap = new Map<string, { id: string; name: string }>()
  if (employeeIds.length) {
    const { data: emps } = await supabase
      .from('employees')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .in('id', employeeIds)
    for (const e of emps ?? []) {
      empMap.set(e.id, { id: e.id, name: e.name })
    }
  }

  return rows.map((r) => {
    const aid = r.payment_account_id as string | null | undefined
    const eid = r.payment_employee_id as string | null | undefined
    return attachRecurrence({
      ...r,
      payment_account: aid ? accMap.get(aid) ?? null : null,
      payment_employee: eid ? empMap.get(eid) ?? null : null,
    })
  })
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('general_expenses')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    const enriched = await enrichExpenses(supabase, profile.tenant_id, data ?? [])
    return NextResponse.json(enriched)
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

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    await ensureDefaultExpenseItems(supabase, profile.tenant_id)

    const body = await request.json()

    const { projectId, invalid: badProject } = await resolveOptionalProjectId(
      supabase,
      profile.tenant_id,
      body.project_id
    )
    if (badProject) {
      return NextResponse.json({ error: 'Geçersiz proje' }, { status: 400 })
    }
    const expense_item_key = String(body.expense_item_key ?? '').trim()
    if (!expense_item_key) {
      return NextResponse.json({ error: 'Masraf kalemi zorunludur' }, { status: 400 })
    }

    const { data: defRow } = await supabase
      .from('expense_item_definitions')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
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
        .eq('tenant_id', profile.tenant_id)
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
        .eq('tenant_id', profile.tenant_id)
        .maybeSingle()
      if (eErr) throw eErr
      if (!emp) return NextResponse.json({ error: 'Geçersiz çalışan' }, { status: 400 })
      if (currencyStr(emp.currency) !== currencyStr(rowCurrency)) {
        return NextResponse.json({ error: 'Çalışan para birimi masraf ile aynı olmalıdır' }, { status: 400 })
      }
    }

    const recurringFlag = Boolean(body.recurring)
    const recurrenceCols = normalizeRecurrenceInput(body.recurrence, recurringFlag)

    const row = {
      tenant_id: profile.tenant_id,
      expense_item_key,
      transaction_date: body.transaction_date || new Date().toISOString().slice(0, 10),
      doc_no: body.doc_no?.trim() || null,
      description: body.description?.trim() || null,
      payment_status,
      payment_date: body.payment_date || null,
      amount_gross: num,
      vat_rate: body.vat_rate != null && String(body.vat_rate) !== '' ? String(body.vat_rate) : null,
      recurring: recurringFlag,
      currency: rowCurrency,
      payment_account_id,
      payment_employee_id,
      project_id: projectId,
      ...recurrenceCols,
    }

    const { data, error } = await supabase.from('general_expenses').insert(row).select().single()

    if (error) throw error

    const expenseId = data.id as string

    try {
      await applyPaidExpenseMovements(
        supabase,
        profile.tenant_id,
        data as Record<string, unknown>,
        expenseId,
        expense_item_key,
        num
      )
    } catch (inner: any) {
      await supabase.from('general_expenses').delete().eq('id', expenseId)
      return NextResponse.json(
        { error: inner?.message || 'Ödeme hareketi kaydedilemedi' },
        { status: 500 }
      )
    }

    const [enriched] = await enrichExpenses(supabase, profile.tenant_id, [data])
    return NextResponse.json(enriched ?? data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
