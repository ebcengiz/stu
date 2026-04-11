import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { adjustAccountBalance } from '@/lib/account-balance'

async function getTenant(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile?.tenant_id) {
    return { error: NextResponse.json({ error: 'Profile not found' }, { status: 400 }) }
  }
  return { tenantId: profile.tenant_id as string }
}

/** GET: cari bakiye + hareket listesi */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params
    const supabase = await createClient()
    const t = await getTenant(supabase)
    if ('error' in t) return t.error

    const { data: emp, error: e1 } = await supabase
      .from('employees')
      .select('id, currency, name')
      .eq('id', employeeId)
      .eq('tenant_id', t.tenantId)
      .single()

    if (e1 || !emp) {
      return NextResponse.json({ error: 'Çalışan bulunamadı' }, { status: 404 })
    }

    const { data: txs, error: e2 } = await supabase
      .from('employee_cari_transactions')
      .select('*')
      .eq('tenant_id', t.tenantId)
      .eq('employee_id', employeeId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (e2) {
      console.error('employee_cari_transactions:', e2.message)
      return NextResponse.json({
        employee_id: employeeId,
        currency: emp.currency || 'TRY',
        balance: 0,
        transactions: [],
      })
    }

    const list = txs ?? []
    const balance = list.reduce((s, row) => s + Number(row.signed_amount), 0)

    return NextResponse.json({
      employee_id: employeeId,
      currency: emp.currency || 'TRY',
      balance,
      transactions: list,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/** POST: yeni cari satırı (tahakkuk, ödeme, masraf vb.) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params
    const supabase = await createClient()
    const t = await getTenant(supabase)
    if ('error' in t) return t.error

    const { data: emp } = await supabase
      .from('employees')
      .select('id, currency')
      .eq('id', employeeId)
      .eq('tenant_id', t.tenantId)
      .single()

    if (!emp) {
      return NextResponse.json({ error: 'Çalışan bulunamadı' }, { status: 404 })
    }

    const body = await request.json()
    const entry_type = String(body.entry_type ?? 'manual').trim() || 'manual'
    const signed_amount = Number(body.signed_amount)
    if (!Number.isFinite(signed_amount)) {
      return NextResponse.json({ error: 'Geçerli tutar girin' }, { status: 400 })
    }

    const currency = String(body.currency || emp.currency || 'TRY')
    const description = body.description?.trim() || null
    const transaction_date = body.transaction_date
      ? new Date(body.transaction_date).toISOString()
      : new Date().toISOString()
    const expense_item =
      body.expense_item != null && String(body.expense_item).trim() !== ''
        ? String(body.expense_item).trim()
        : null

    const account_id =
      body.account_id != null && String(body.account_id).trim() !== ''
        ? String(body.account_id).trim()
        : null

    async function validateCariCashBankAccount(missingAccountMessage: string) {
      if (!account_id) {
        return NextResponse.json({ error: missingAccountMessage }, { status: 400 })
      }
      const { data: acc, error: accErr } = await supabase
        .from('accounts')
        .select('id, tenant_id, currency')
        .eq('id', account_id)
        .eq('tenant_id', t.tenantId)
        .single()
      if (accErr || !acc) {
        return NextResponse.json({ error: 'Hesap bulunamadı' }, { status: 400 })
      }
      if (String(acc.currency) !== currency) {
        return NextResponse.json(
          { error: 'Hesap para birimi çalışan cari para birimi ile aynı olmalıdır' },
          { status: 400 }
        )
      }
      return null
    }

    if (entry_type === 'payment') {
      const err = await validateCariCashBankAccount(
        'Ödemeyi yaptığınız kasa veya banka hesabını seçin'
      )
      if (err) return err
    }

    if (entry_type === 'advance_refund') {
      const err = await validateCariCashBankAccount(
        'İadeyi aldığınız kasa veya banka hesabını seçin'
      )
      if (err) return err
      if (signed_amount <= 0) {
        return NextResponse.json(
          { error: 'İade tutarı sıfırdan büyük olmalıdır' },
          { status: 400 }
        )
      }
    }

    const insertRow: Record<string, unknown> = {
      tenant_id: t.tenantId,
      employee_id: employeeId,
      entry_type,
      signed_amount,
      currency,
      description,
      transaction_date,
    }
    if (expense_item !== null) {
      insertRow.expense_item = expense_item
    }
    if (account_id) {
      insertRow.account_id = account_id
    }

    const { data: row, error } = await supabase
      .from('employee_cari_transactions')
      .insert(insertRow)
      .select()
      .single()

    if (error) throw error

    if (entry_type === 'payment' && account_id && row) {
      try {
        await adjustAccountBalance(supabase, {
          tenantId: t.tenantId,
          accountId: account_id,
          delta: signed_amount,
          currency,
        })
      } catch (balErr: any) {
        await supabase.from('employee_cari_transactions').delete().eq('id', row.id)
        return NextResponse.json(
          { error: balErr.message || 'Hesap bakiyesi güncellenemedi' },
          { status: 400 }
        )
      }
    }

    if (entry_type === 'advance_refund' && account_id && row) {
      try {
        await adjustAccountBalance(supabase, {
          tenantId: t.tenantId,
          accountId: account_id,
          delta: signed_amount,
          currency,
        })
      } catch (balErr: any) {
        await supabase.from('employee_cari_transactions').delete().eq('id', row.id)
        return NextResponse.json(
          { error: balErr.message || 'Hesap bakiyesi güncellenemedi' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(row)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
