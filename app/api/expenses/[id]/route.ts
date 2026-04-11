import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { adjustAccountBalance } from '@/lib/account-balance'
import {
  deleteEmployeeCariRowsForExpense,
  deleteLedgerRowsForExpense,
  fetchLedgerRowsForExpense,
} from '@/lib/expense-movement-ref'

function currencyStr(c: unknown) {
  return c == null ? 'TRY' : String(c)
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

    const paid = exp.payment_status === 'paid'

    if (paid && exp.payment_account_id) {
      const ledRows = await fetchLedgerRowsForExpense(
        supabase,
        tenantId,
        id,
        exp.payment_account_id as string
      )
      for (const L of ledRows) {
        if (L.entry_type === 'outflow') {
          const amt = Number(L.amount)
          await adjustAccountBalance(supabase, {
            tenantId,
            accountId: L.account_id,
            delta: amt,
            currency: currencyStr(L.currency),
          })
        }
      }
      await deleteLedgerRowsForExpense(supabase, tenantId, id, exp.payment_account_id as string)
    }

    if (paid && exp.payment_employee_id) {
      await deleteEmployeeCariRowsForExpense(
        supabase,
        tenantId,
        id,
        exp.payment_employee_id as string
      )
    }

    const { error: delErr } = await supabase.from('general_expenses').delete().eq('id', id).eq('tenant_id', tenantId)

    if (delErr) throw delErr
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
