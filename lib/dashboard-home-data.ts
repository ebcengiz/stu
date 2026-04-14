import type { SupabaseClient } from '@supabase/supabase-js'
import { getExchangeRates } from '@/lib/currency'
import { getTcmbRates, toTryFromTcmb, type TcmbRates } from '@/lib/tcmb-rates'
import { customerNetBalance, supplierNetBalance } from '@/lib/cari-balance'

function istanbulYmd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function istanbulBoundsForYmd(ymd: string): { startIso: string; endIso: string } {
  const start = new Date(`${ymd}T00:00:00+03:00`)
  const end = new Date(`${ymd}T23:59:59.999+03:00`)
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

function addDaysYmd(ymd: string, days: number): string {
  const t = new Date(`${ymd}T12:00:00+03:00`)
  t.setDate(t.getDate() + days)
  return istanbulYmd(t)
}

function monthStartEndYmd(ymd: string): { start: string; end: string } {
  const [y, m] = ymd.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return {
    start: `${y}-${String(m).padStart(2, '0')}-01`,
    end: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

function lastNMonthKeys(n: number, anchorYmd: string): string[] {
  const [y, m] = anchorYmd.split('-').map(Number)
  const keys: string[] = []
  for (let k = n - 1; k >= 0; k--) {
    let month = m - k
    let year = y
    while (month < 1) {
      month += 12
      year -= 1
    }
    while (month > 12) {
      month -= 12
      year += 1
    }
    keys.push(`${year}-${String(month).padStart(2, '0')}`)
  }
  return keys
}

const MONTH_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTH_TR[m - 1] ?? ym} ${y}`
}

/** Stok satırı toplam adet (depo bazlı tek kayıt varsayımı — mevcut dashboard ile uyumlu). */
function stockQty(stockRecords?: Array<{ warehouse_id?: string; quantity: number }>): number {
  if (!stockRecords?.length) return 0
  const byWh = new Map<string, number>()
  stockRecords.forEach((record) => {
    const wid = record.warehouse_id || 'default'
    if (!byWh.has(wid)) byWh.set(wid, Number(record.quantity || 0))
  })
  return [...byWh.values()].reduce((a, b) => a + b, 0)
}

export type DashboardHomePayload = {
  meta: {
    dateLabel: string
    weekday: string
    isoDate: string
  }
  tcmb: { ok: true; rates: TcmbRates } | { ok: false; error: string }
  todaySalesTry: number
  todayCollectionsTry: number
  monthRevenueTry: number
  monthExpensesTry: number
  stockValueTry: number
  assets: Array<{ id: string; label: string; valueTry: number; href: string }>
  openReceivablesTry: number | null
  openPayablesTry: number | null
  upcomingChecks: Array<{
    id: string
    debtor_name: string
    amount: number
    currency: string
    due_date: string
    daysLeft: number
  }>
  upcomingExpenses: Array<{
    id: string
    description: string | null
    amount_gross: number
    currency: string
    payment_date: string
  }>
  upcomingLoanInstallments: Array<{
    id: string
    loan_id: string
    loan_name: string
    due_date: string
    due_try: number
    currency: string
  }>
  recentActivity: Array<{
    id: string
    kind: string
    title: string
    subtitle: string
    date: string
    href: string
  }>
  chart6m: { labels: string[]; revenue: number[]; expense: number[] }
  weekSales: { label: string; total_try: number }[]
}

export async function loadDashboardHomeData(supabase: SupabaseClient): Promise<DashboardHomePayload> {
  const now = new Date()
  const isoDate = istanbulYmd(now)
  const weekday = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    weekday: 'long',
  }).format(now)
  const dateLabel = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now)

  const { startIso, endIso } = istanbulBoundsForYmd(isoDate)
  const { start: monthStart, end: monthEnd } = monthStartEndYmd(isoDate)

  const sixMonthKeys = lastNMonthKeys(6, isoDate)
  const sixMonthStart = `${sixMonthKeys[0]}-01`
  const weekStartYmd = addDaysYmd(isoDate, -6)
  const { startIso: weekStartIso } = istanbulBoundsForYmd(weekStartYmd)

  const tcmbResult = await getTcmbRates()
  const fxFallback = await getExchangeRates('TRY')

  const toTry = (amount: number, currency: string | null | undefined): number => {
    const c = String(currency || 'TRY').toUpperCase()
    if (!Number.isFinite(amount)) return 0
    if (c === 'TRY' || c === 'TL') return amount
    if (tcmbResult.ok) return toTryFromTcmb(amount, c, tcmbResult.rates)
    const r = fxFallback[c]
    if (c === 'USD' || c === 'EUR') {
      if (typeof r === 'number' && r > 0) return amount / r
    }
    return amount
  }

  const [
    salesTodayRes,
    salesMonthRes,
    sales6mRes,
    payTodayRes,
    accountsRes,
    portfolioRes,
    expensesMonthRes,
    expenses6mRes,
    expensesUpcomingRes,
    cTxRes,
    sTxRes,
    loansInstRes,
    checksDueRes,
    salesRecentRes,
    purchasesRecentRes,
    cTxRecentRes,
    movementsRes,
    productsRes,
    weekSalesRes,
  ] = await Promise.all([
    supabase.from('sales').select('total_amount, currency').gte('sale_date', startIso).lte('sale_date', endIso),
    supabase.from('sales').select('total_amount, currency, sale_date').gte('sale_date', `${monthStart}T00:00:00+03:00`).lte('sale_date', `${monthEnd}T23:59:59.999+03:00`),
    supabase.from('sales').select('total_amount, currency, sale_date').gte('sale_date', `${sixMonthStart}T00:00:00+03:00`).lte('sale_date', endIso),
    supabase.from('customer_transactions').select('amount, currency').eq('type', 'payment').gte('transaction_date', startIso).lte('transaction_date', endIso),
    supabase.from('accounts').select('id, name, type, currency, balance, is_active').eq('is_active', true),
    supabase
      .from('portfolio_checks')
      .select('id, amount, currency, status')
      .in('status', ['portfolio', 'to_supplier', 'to_bank']),
    supabase
      .from('general_expenses')
      .select('amount_gross, currency, transaction_date')
      .gte('transaction_date', monthStart)
      .lte('transaction_date', monthEnd),
    supabase
      .from('general_expenses')
      .select('amount_gross, currency, transaction_date')
      .gte('transaction_date', sixMonthStart)
      .lte('transaction_date', isoDate),
    supabase
      .from('general_expenses')
      .select('id, description, amount_gross, currency, payment_date, payment_status')
      .in('payment_status', ['later', 'partial'])
      .not('payment_date', 'is', null)
      .gte('payment_date', isoDate)
      .lte('payment_date', addDaysYmd(isoDate, 45))
      .order('payment_date', { ascending: true })
      .limit(12),
    supabase.from('customer_transactions').select('customer_id, type, amount, description'),
    supabase.from('supplier_transactions').select('supplier_id, type, amount'),
    supabase
      .from('loan_installments')
      .select('id, loan_id, due_date, amount, paid_amount, loans(name, currency)')
      .gte('due_date', isoDate)
      .lte('due_date', addDaysYmd(isoDate, 90))
      .order('due_date', { ascending: true })
      .limit(24),
    supabase
      .from('portfolio_checks')
      .select('id, debtor_name, amount, currency, due_date, status')
      .in('status', ['portfolio', 'to_supplier', 'to_bank'])
      .gte('due_date', isoDate)
      .lte('due_date', addDaysYmd(isoDate, 30))
      .order('due_date', { ascending: true })
      .limit(12),
    supabase
      .from('sales')
      .select('id, sale_date, total_amount, currency, document_no, customers(company_name)')
      .order('sale_date', { ascending: false })
      .limit(10),
    supabase
      .from('supplier_transactions')
      .select('id, transaction_date, amount, currency, type, description, suppliers(company_name)')
      .order('transaction_date', { ascending: false })
      .limit(10),
    supabase
      .from('customer_transactions')
      .select('id, customer_id, transaction_date, type, amount, currency, description, customers(company_name)')
      .order('transaction_date', { ascending: false })
      .limit(10),
    supabase.from('stock_movements').select('id, created_at, movement_type, quantity, unit, products(name), warehouses(name)').order('created_at', { ascending: false }).limit(8),
    supabase.from('products').select('price, currency, stock(quantity, warehouse_id, warehouses(name))').eq('is_active', true),
    supabase.from('sales').select('sale_date, total_amount, currency').gte('sale_date', weekStartIso).lte('sale_date', endIso),
  ])

  const salesToday = salesTodayRes.data || []
  const todaySalesTry = salesToday.reduce((s, r: any) => s + toTry(Number(r.total_amount), r.currency), 0)

  const paymentsToday = payTodayRes.data || []
  const todayCollectionsTry = paymentsToday.reduce((s, r: any) => s + toTry(Number(r.amount), r.currency), 0)

  const salesMonth = salesMonthRes.data || []
  const monthRevenueTry = salesMonth.reduce((s, r: any) => s + toTry(Number(r.total_amount), r.currency), 0)

  const expMonth = expensesMonthRes.data || []
  const monthExpensesTry = expMonth.reduce((s, r: any) => s + toTry(Number(r.amount_gross), r.currency), 0)

  const products = productsRes.data || []
  const stockValueTry = products.reduce((sum, p: any) => {
    const qty = stockQty(p.stock)
    const price = Number(p.price || 0)
    const cur = p.currency || 'TRY'
    const rate = fxFallback[cur] ?? 1
    let lineTry = 0
    if (cur === 'TRY' || cur === 'TL') lineTry = price * qty
    else if (typeof rate === 'number' && rate > 0) lineTry = (price / rate) * qty
    else lineTry = price * qty
    return sum + lineTry
  }, 0)

  const accounts = (accountsRes.data || []) as Array<{
    id: string
    name: string
    type: string
    currency: string
    balance: number
  }>
  let kasaTry = 0
  let posTry = 0
  let bankaTry = 0
  for (const a of accounts) {
    const b = toTry(Number(a.balance), a.currency)
    const t = String(a.type).toLowerCase()
    if (t === 'cash' || t === 'kasa') kasaTry += b
    else if (t === 'pos') posTry += b
    else if (t === 'bank' || t === 'banka') bankaTry += b
  }

  const portfolioRows = portfolioRes.data || []
  let cekTry = 0
  for (const c of portfolioRows as any[]) {
    cekTry += toTry(Number(c.amount), c.currency)
  }

  const cMap = new Map<string, any[]>()
  for (const row of (cTxRes.data || []) as any[]) {
    const id = row.customer_id as string
    if (!id) continue
    if (!cMap.has(id)) cMap.set(id, [])
    cMap.get(id)!.push(row)
  }
  let receivables = 0
  for (const [, txs] of cMap) {
    const bal = customerNetBalance(txs)
    if (bal > 0) receivables += bal
  }

  const sMap = new Map<string, any[]>()
  for (const row of (sTxRes.data || []) as any[]) {
    const id = row.supplier_id as string
    if (!id) continue
    if (!sMap.has(id)) sMap.set(id, [])
    sMap.get(id)!.push(row)
  }
  let payables = 0
  for (const [, txs] of sMap) {
    const bal = supplierNetBalance(txs)
    if (bal > 0) payables += bal
  }

  const assets: DashboardHomePayload['assets'] = []
  if (kasaTry > 0) assets.push({ id: 'kasa', label: 'Kasa', valueTry: kasaTry, href: '/dashboard/hesaplarim' })
  if (posTry > 0) assets.push({ id: 'pos', label: 'POS', valueTry: posTry, href: '/dashboard/hesaplarim' })
  if (bankaTry > 0) assets.push({ id: 'banka', label: 'Banka', valueTry: bankaTry, href: '/dashboard/hesaplarim' })
  if (cekTry > 0) assets.push({ id: 'cek', label: 'Çek (işlemde)', valueTry: cekTry, href: '/dashboard/hesaplarim/cek-portfoyu' })
  if (stockValueTry > 0) assets.push({ id: 'stok', label: 'Stok değeri', valueTry: stockValueTry, href: '/dashboard/urunler' })
  if (receivables > 0) assets.push({ id: 'alacak', label: 'Müşteri alacakları', valueTry: receivables, href: '/dashboard/musteriler' })
  if (payables > 0) assets.push({ id: 'borc', label: 'Tedarikçi borçları', valueTry: payables, href: '/dashboard/tedarikciler' })

  const upcomingChecks = (checksDueRes.data || []).map((c: any) => {
    const due = String(c.due_date).slice(0, 10)
    const dl = Math.ceil((new Date(due + 'T12:00:00').getTime() - new Date(isoDate + 'T12:00:00').getTime()) / 86400000)
    return {
      id: c.id,
      debtor_name: c.debtor_name,
      amount: Number(c.amount),
      currency: c.currency || 'TRY',
      due_date: due,
      daysLeft: dl,
    }
  })

  const upcomingExpenses = (expensesUpcomingRes.data || []).map((e: any) => ({
    id: e.id,
    description: e.description,
    amount_gross: Number(e.amount_gross),
    currency: e.currency || 'TRY',
    payment_date: String(e.payment_date).slice(0, 10),
  }))

  const upcomingLoanInstallments: DashboardHomePayload['upcomingLoanInstallments'] = []
  for (const row of loansInstRes.data || []) {
    const rawLoan = (row as any).loans
    const loan = Array.isArray(rawLoan) ? rawLoan[0] : rawLoan
    const name = loan?.name ? String(loan.name) : 'Kredi'
    const cur = loan?.currency || 'TRY'
    const due = Number(row.amount) - Number(row.paid_amount || 0)
    if (due <= 0) continue
    upcomingLoanInstallments.push({
      id: row.id,
      loan_id: row.loan_id,
      loan_name: name,
      due_date: String(row.due_date).slice(0, 10),
      due_try: toTry(due, cur),
      currency: String(cur),
    })
    if (upcomingLoanInstallments.length >= 8) break
  }

  const sales6m = sales6mRes.data || []
  const exp6m = expenses6mRes.data || []
  const revenueByMonth = new Map<string, number>()
  const expenseByMonth = new Map<string, number>()
  for (const r of sales6m as any[]) {
    const ymd = istanbulYmd(new Date(r.sale_date))
    const key = ymd.slice(0, 7)
    revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + toTry(Number(r.total_amount), r.currency))
  }
  for (const r of exp6m as any[]) {
    const raw = String(r.transaction_date).slice(0, 10)
    const key = raw.slice(0, 7)
    expenseByMonth.set(key, (expenseByMonth.get(key) || 0) + toTry(Number(r.amount_gross), r.currency))
  }
  const chart6m = {
    labels: sixMonthKeys.map(monthLabel),
    revenue: sixMonthKeys.map((k) => revenueByMonth.get(k) || 0),
    expense: sixMonthKeys.map((k) => expenseByMonth.get(k) || 0),
  }

  const dayTotals = new Map<string, number>()
  for (const r of weekSalesRes.data || []) {
    const ymd = istanbulYmd(new Date((r as any).sale_date))
    const add = toTry(Number((r as any).total_amount), (r as any).currency)
    dayTotals.set(ymd, (dayTotals.get(ymd) || 0) + add)
  }
  const weekSales: DashboardHomePayload['weekSales'] = []
  for (let i = 6; i >= 0; i--) {
    const ymd = addDaysYmd(isoDate, -i)
    const labelD = new Date(`${ymd}T12:00:00+03:00`)
    weekSales.push({
      label: new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', weekday: 'short', day: 'numeric' }).format(labelD),
      total_try: dayTotals.get(ymd) || 0,
    })
  }

  type Act = { t: number; item: DashboardHomePayload['recentActivity'][0] }
  const bucket: Act[] = []
  for (const s of salesRecentRes.data || []) {
    const r = s as any
    bucket.push({
      t: new Date(r.sale_date).getTime(),
      item: {
        id: `sale-${r.id}`,
        kind: 'sale',
        title: `Satış — ${r.customers?.company_name || 'Perakende'}`,
        subtitle: r.document_no ? `Belge: ${r.document_no}` : 'Satış fişi',
        date: String(r.sale_date),
        href: `/dashboard/satislar/${r.id}`,
      },
    })
  }
  for (const r of cTxRecentRes.data || []) {
    const x = r as any
    const typ = String(x.type)
    const kindLabel =
      typ === 'payment'
        ? 'Tahsilat'
        : typ === 'sale' || typ === 'invoice'
          ? 'Satış / Fatura'
          : typ === 'balance_fix'
            ? 'Bakiye düzeltme'
            : 'Cari işlem'
    bucket.push({
      t: new Date(x.transaction_date).getTime(),
      item: {
        id: `ctx-${x.id}`,
        kind: 'customer',
        title: `${kindLabel} — ${x.customers?.company_name || 'Müşteri'}`,
        subtitle: x.description || '',
        date: String(x.transaction_date),
        href: x.customer_id ? `/dashboard/musteriler/${x.customer_id}` : '/dashboard/musteriler',
      },
    })
  }
  for (const r of purchasesRecentRes.data || []) {
    const x = r as any
    const label = x.type === 'payment' ? 'Tedarikçi ödemesi' : x.type === 'purchase' ? 'Alış' : 'İşlem'
    bucket.push({
      t: new Date(x.transaction_date).getTime(),
      item: {
        id: `stx-${x.id}`,
        kind: 'supplier',
        title: `${label} — ${x.suppliers?.company_name || 'Tedarikçi'}`,
        subtitle: x.description || '',
        date: String(x.transaction_date),
        href: '/dashboard/tedarikciler',
      },
    })
  }
  for (const m of movementsRes.data || []) {
    const x = m as any
    bucket.push({
      t: new Date(x.created_at).getTime(),
      item: {
        id: `mov-${x.id}`,
        kind: 'stock',
        title: `Stok — ${x.products?.name || 'Ürün'}`,
        subtitle: `${x.movement_type} • ${x.warehouses?.name || ''}`,
        date: String(x.created_at),
        href: '/dashboard/stok-hareketleri',
      },
    })
  }
  bucket.sort((a, b) => b.t - a.t)
  const recentActivity = bucket.slice(0, 14).map((x) => x.item)

  return {
    meta: { dateLabel, weekday, isoDate },
    tcmb: tcmbResult.ok ? { ok: true, rates: tcmbResult.rates } : { ok: false, error: tcmbResult.error },
    todaySalesTry,
    todayCollectionsTry,
    monthRevenueTry,
    monthExpensesTry,
    stockValueTry,
    assets,
    openReceivablesTry: receivables > 0 ? receivables : null,
    openPayablesTry: payables > 0 ? payables : null,
    upcomingChecks,
    upcomingExpenses,
    upcomingLoanInstallments,
    recentActivity,
    chart6m,
    weekSales,
  }
}
