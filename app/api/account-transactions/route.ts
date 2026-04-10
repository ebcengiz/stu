import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { adjustAccountBalance } from '@/lib/account-balance'

type UnifiedRow = {
  id: string
  account_id: string
  type: 'inflow' | 'outflow' | 'transfer_in' | 'transfer_out'
  amount: number
  currency: string
  description: string
  transaction_date: string
  balance_after: number
  source?: string
}

function currencyStr(c: unknown): string {
  return c == null ? 'TRY' : String(c)
}

/** GET: Cari ödemeler (customer/supplier_transactions.account_id) + manuel ledger satırları */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('account_id')

    if (!accountId) {
      return NextResponse.json({ error: 'account_id gerekli' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const { data: acc, error: accErr } = await supabase
      .from('accounts')
      .select('id, balance, currency, tenant_id')
      .eq('id', accountId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (accErr || !acc) {
      return NextResponse.json({ error: 'Hesap bulunamadı' }, { status: 404 })
    }

    const balanceNow = Number(acc.balance)

    const { data: ct } = await supabase
      .from('customer_transactions')
      .select(
        'id, account_id, amount, description, transaction_date, type, payment_method, currency, customers(company_name)'
      )
      .eq('account_id', accountId)
      .eq('tenant_id', profile.tenant_id)

    const { data: st } = await supabase
      .from('supplier_transactions')
      .select(
        'id, account_id, amount, description, transaction_date, type, payment_method, currency, suppliers(company_name)'
      )
      .eq('account_id', accountId)
      .eq('tenant_id', profile.tenant_id)

    let ledger: any[] = []
    const { data: ledgerData, error: ledgerErr } = await supabase
      .from('account_ledger_entries')
      .select('*')
      .eq('account_id', accountId)
      .eq('tenant_id', profile.tenant_id)

    if (!ledgerErr && ledgerData) ledger = ledgerData

    type Mv = {
      id: string
      signedAmount: number
      currency: string
      description: string
      transaction_date: string
      uiType: UnifiedRow['type']
    }

    const movements: Mv[] = []

    for (const tx of ct || []) {
      if (tx.type !== 'payment') continue
      const custRaw = tx.customers as { company_name?: string } | { company_name?: string }[] | null
      const cust = Array.isArray(custRaw) ? custRaw[0] : custRaw
      movements.push({
        id: `ct-${tx.id}`,
        signedAmount: Number(tx.amount),
        currency: currencyStr(tx.currency),
        description:
          tx.description?.trim() ||
          `Müşteri tahsilatı${cust?.company_name ? ` (${cust.company_name})` : ''}`,
        transaction_date: tx.transaction_date,
        uiType: 'inflow',
      })
    }

    for (const tx of st || []) {
      if (tx.type !== 'payment') continue
      const supRaw = tx.suppliers as { company_name?: string } | { company_name?: string }[] | null
      const sup = Array.isArray(supRaw) ? supRaw[0] : supRaw
      movements.push({
        id: `st-${tx.id}`,
        signedAmount: -Number(tx.amount),
        currency: currencyStr(tx.currency),
        description:
          tx.description?.trim() ||
          `Tedarikçi ödemesi${sup?.company_name ? ` (${sup.company_name})` : ''}`,
        transaction_date: tx.transaction_date,
        uiType: 'outflow',
      })
    }

    for (const row of ledger) {
      const amt = Number(row.amount)
      const isIn = row.entry_type === 'inflow' || row.entry_type === 'transfer_in'
      movements.push({
        id: `al-${row.id}`,
        signedAmount: isIn ? amt : -amt,
        currency: currencyStr(row.currency),
        description: row.description || (row.entry_type?.includes('transfer') ? 'Virman' : 'Manuel işlem'),
        transaction_date: row.transaction_date,
        uiType: row.entry_type as UnifiedRow['type'],
      })
    }

    movements.sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    )

    const netSum = movements.reduce((s, m) => s + m.signedAmount, 0)
    let running = balanceNow - netSum

    const withBalance: UnifiedRow[] = []
    for (const m of movements) {
      running += m.signedAmount
      const absAmt = Math.abs(m.signedAmount)
      withBalance.push({
        id: m.id,
        account_id: accountId,
        type: m.uiType,
        amount: absAmt,
        currency: m.currency,
        description: m.description,
        transaction_date: m.transaction_date,
        balance_after: running,
        source: m.id.startsWith('ct-') ? 'customer' : m.id.startsWith('st-') ? 'supplier' : 'manual',
      })
    }

    withBalance.sort(
      (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    )

    return NextResponse.json(withBalance)
  } catch (error: any) {
    console.error('account-transactions GET', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/** POST: Manuel giriş/çıkış veya virman */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const {
      account_id,
      type,
      amount: rawAmount,
      description,
      transaction_date,
      target_account_id,
      currency: bodyCurrency,
    } = body

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const { data: fromAccount } = await supabase
      .from('accounts')
      .select('id, currency, tenant_id')
      .eq('id', account_id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!fromAccount) return NextResponse.json({ error: 'Hesap bulunamadı' }, { status: 404 })

    const currency = bodyCurrency || fromAccount.currency || 'TRY'
    if (currencyStr(fromAccount.currency) !== currencyStr(currency)) {
      return NextResponse.json({ error: 'Para birimi hesap ile uyumlu olmalı' }, { status: 400 })
    }

    const amount = Number(rawAmount)
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Geçerli tutar girin' }, { status: 400 })
    }

    const txDate = transaction_date ? new Date(transaction_date).toISOString() : new Date().toISOString()

    if (type === 'transfer_out' || (type === 'outflow' && target_account_id)) {
      const tid = target_account_id as string
      if (!tid) return NextResponse.json({ error: 'Hedef hesap seçin' }, { status: 400 })
      if (tid === account_id) return NextResponse.json({ error: 'Kaynak ve hedef aynı olamaz' }, { status: 400 })

      const { data: toAccount } = await supabase
        .from('accounts')
        .select('id, currency, tenant_id')
        .eq('id', tid)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!toAccount) return NextResponse.json({ error: 'Hedef hesap bulunamadı' }, { status: 404 })
      if (currencyStr(toAccount.currency) !== currencyStr(currency)) {
        return NextResponse.json({ error: 'Virman için hesap para birimleri aynı olmalı' }, { status: 400 })
      }

      await adjustAccountBalance(supabase, {
        tenantId: profile.tenant_id,
        accountId: account_id,
        delta: -amount,
        currency,
      })
      await adjustAccountBalance(supabase, {
        tenantId: profile.tenant_id,
        accountId: tid,
        delta: amount,
        currency,
      })

      const { error: e1 } = await supabase.from('account_ledger_entries').insert({
        tenant_id: profile.tenant_id,
        account_id,
        entry_type: 'transfer_out',
        amount,
        currency,
        description: description || 'Virman çıkışı',
        transaction_date: txDate,
        counterparty_account_id: tid,
      })
      if (e1) throw e1

      const { error: e2 } = await supabase.from('account_ledger_entries').insert({
        tenant_id: profile.tenant_id,
        account_id: tid,
        entry_type: 'transfer_in',
        amount,
        currency,
        description: description || 'Virman girişi',
        transaction_date: txDate,
        counterparty_account_id: account_id,
      })
      if (e2) throw e2

      return NextResponse.json({ ok: true })
    }

    if (type === 'inflow') {
      await adjustAccountBalance(supabase, {
        tenantId: profile.tenant_id,
        accountId: account_id,
        delta: amount,
        currency,
      })
      const { error } = await supabase.from('account_ledger_entries').insert({
        tenant_id: profile.tenant_id,
        account_id,
        entry_type: 'inflow',
        amount,
        currency,
        description: description || 'Para girişi',
        transaction_date: txDate,
      })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (type === 'outflow') {
      await adjustAccountBalance(supabase, {
        tenantId: profile.tenant_id,
        accountId: account_id,
        delta: -amount,
        currency,
      })
      const { error } = await supabase.from('account_ledger_entries').insert({
        tenant_id: profile.tenant_id,
        account_id,
        entry_type: 'outflow',
        amount,
        currency,
        description: description || 'Para çıkışı',
        transaction_date: txDate,
      })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Geçersiz işlem tipi' }, { status: 400 })
  } catch (error: any) {
    console.error('account-transactions POST', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
