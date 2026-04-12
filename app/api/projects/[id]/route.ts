import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function sameCalendarDay(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const da = new Date(a)
  const db = new Date(b)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

function amountsClose(a: unknown, b: unknown, eps = 0.01): boolean {
  return Math.abs(Number(a ?? 0) - Number(b ?? 0)) < eps
}

/** Eski kayıtlar: cari satış/alış satırı varken `sales`/`purchases` oluşmamış olabilir; çift göstermemek için eşleşenleri ekleme. */
function mergeSalesFromCari(
  salesRows: Record<string, unknown>[],
  custTx: Record<string, unknown>[]
): Record<string, unknown>[] {
  const base = [...salesRows]
  const hasSaleForTx = (ct: Record<string, unknown>) =>
    base.some(
      (s) =>
        s.customer_id === ct.customer_id &&
        amountsClose(s.total_amount, ct.amount) &&
        sameCalendarDay(String(s.sale_date), String(ct.transaction_date))
    )
  for (const ct of custTx) {
    const t = String(ct.type ?? '')
    if (t !== 'sale' && t !== 'invoice') continue
    if (hasSaleForTx(ct)) continue
    base.push({
      id: `cari-${String(ct.id)}`,
      sale_date: ct.transaction_date,
      total_amount: ct.amount,
      currency: ct.currency ?? 'TRY',
      document_no: ct.document_number ?? '',
      description: ct.description ?? '',
      customer_id: ct.customer_id,
    })
  }
  base.sort((a, b) => {
    const db = new Date(String(b.sale_date)).getTime()
    const da = new Date(String(a.sale_date)).getTime()
    return db - da
  })
  return base
}

function mergePurchasesFromCari(
  purchaseRows: Record<string, unknown>[],
  suppTx: Record<string, unknown>[]
): Record<string, unknown>[] {
  const base = [...purchaseRows]
  const hasPurchaseForTx = (st: Record<string, unknown>) =>
    base.some(
      (p) =>
        p.supplier_id === st.supplier_id &&
        amountsClose(p.total_amount, st.amount) &&
        sameCalendarDay(String(p.purchase_date), String(st.transaction_date))
    )
  for (const st of suppTx) {
    if (String(st.type ?? '') !== 'purchase') continue
    if (hasPurchaseForTx(st)) continue
    base.push({
      id: `cari-${String(st.id)}`,
      purchase_date: st.transaction_date,
      total_amount: st.amount,
      currency: st.currency ?? 'TRY',
      document_no: st.document_number ?? '',
      description: st.description ?? '',
      supplier_id: st.supplier_id,
    })
  }
  base.sort((a, b) => {
    const db = new Date(String(b.purchase_date)).getTime()
    const da = new Date(String(a.purchase_date)).getTime()
    return db - da
  })
  return base
}

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

    const tenantId = profile.tenant_id

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) throw error
    if (!project) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

    const [
      { data: purchases },
      { data: sales },
      { data: expenses },
      { data: custTx },
      { data: suppTx },
    ] = await Promise.all([
      supabase
        .from('purchases')
        .select('id, purchase_date, total_amount, currency, document_no, description, supplier_id')
        .eq('tenant_id', tenantId)
        .eq('project_id', id)
        .order('purchase_date', { ascending: false })
        .limit(200),
      supabase
        .from('sales')
        .select('id, sale_date, total_amount, currency, document_no, description, customer_id')
        .eq('tenant_id', tenantId)
        .eq('project_id', id)
        .order('sale_date', { ascending: false })
        .limit(200),
      supabase
        .from('general_expenses')
        .select('id, transaction_date, amount_gross, currency, description, doc_no, expense_item_key, payment_status')
        .eq('tenant_id', tenantId)
        .eq('project_id', id)
        .order('transaction_date', { ascending: false })
        .limit(200),
      supabase
        .from('customer_transactions')
        .select('id, transaction_date, type, amount, currency, description, customer_id, document_number')
        .eq('tenant_id', tenantId)
        .eq('project_id', id)
        .order('transaction_date', { ascending: false })
        .limit(200),
      supabase
        .from('supplier_transactions')
        .select('id, transaction_date, type, amount, currency, description, supplier_id, document_number')
        .eq('tenant_id', tenantId)
        .eq('project_id', id)
        .order('transaction_date', { ascending: false })
        .limit(200),
    ])

    const pListRaw = purchases ?? []
    const sListRaw = sales ?? []
    const eList = expenses ?? []
    const ctList = custTx ?? []
    const stList = suppTx ?? []

    const pList = mergePurchasesFromCari(pListRaw as Record<string, unknown>[], stList as Record<string, unknown>[])
    const sList = mergeSalesFromCari(sListRaw as Record<string, unknown>[], ctList as Record<string, unknown>[])

    const sumNum = (rows: { total_amount?: unknown; amount_gross?: unknown; amount?: unknown }[], key: 'total_amount' | 'amount_gross' | 'amount') =>
      rows.reduce((acc, r) => acc + Number((r as Record<string, unknown>)[key] ?? 0), 0)

    const totals = {
      purchases: sumNum(pList as { total_amount?: unknown }[], 'total_amount'),
      sales: sumNum(sList as { total_amount?: unknown }[], 'total_amount'),
      expenses: sumNum(eList as { amount_gross?: unknown }[], 'amount_gross'),
      customer_payments: (ctList as { type?: string; amount?: unknown }[])
        .filter((t) => t.type === 'payment')
        .reduce((a, t) => a + Number(t.amount ?? 0), 0),
      supplier_payments: (stList as { type?: string; amount?: unknown }[])
        .filter((t) => t.type === 'payment')
        .reduce((a, t) => a + Number(t.amount ?? 0), 0),
    }

    const cariCombined = [
      ...(ctList as Record<string, unknown>[]).map((r) => ({
        source: 'customer' as const,
        id: r.id,
        transaction_date: r.transaction_date,
        type: r.type,
        amount: r.amount,
        currency: r.currency,
        description: r.description,
        party: 'Müşteri',
      })),
      ...(stList as Record<string, unknown>[]).map((r) => ({
        source: 'supplier' as const,
        id: r.id,
        transaction_date: r.transaction_date,
        type: r.type,
        amount: r.amount,
        currency: r.currency,
        description: r.description,
        party: 'Tedarikçi',
      })),
    ].sort((a, b) => {
      const da = new Date(String(a.transaction_date)).getTime()
      const db = new Date(String(b.transaction_date)).getTime()
      return db - da
    })

    return NextResponse.json({
      project,
      totals,
      purchases: pList,
      sales: sList,
      expenses: eList,
      customer_transactions: ctList,
      supplier_transactions: stList,
      cari_combined: cariCombined,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
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
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.name != null) {
      const name = String(body.name).trim()
      if (!name) return NextResponse.json({ error: 'Proje adı boş olamaz' }, { status: 400 })
      updates.name = name
    }
    if (body.description !== undefined) {
      updates.description =
        body.description != null && String(body.description).trim() !== '' ? String(body.description).trim() : null
    }
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active)

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
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

    const { error } = await supabase.from('projects').delete().eq('id', id).eq('tenant_id', profile.tenant_id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
