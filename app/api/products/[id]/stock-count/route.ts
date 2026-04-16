import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type RowIn = { warehouse_id: string; counted_quantity: number }

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id

    const { data: product, error: pErr } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (pErr) throw pErr
    if (!product) return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const rows = Array.isArray(body.rows) ? (body.rows as RowIn[]) : []
    const purchasePriceRaw = body.purchase_price

    if (rows.length === 0) {
      return NextResponse.json({ error: 'En az bir depo satırı gerekli' }, { status: 400 })
    }

    const today = new Date().toISOString().slice(0, 10)

    for (const row of rows) {
      const wid = String(row.warehouse_id ?? '').trim()
      if (!wid) continue
      const counted = Number(row.counted_quantity)
      if (!Number.isFinite(counted)) {
        return NextResponse.json({ error: 'Geçersiz sayılan miktar' }, { status: 400 })
      }

      const { data: wh } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('id', wid)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle()

      if (!wh) {
        return NextResponse.json({ error: 'Geçersiz depo' }, { status: 400 })
      }

      const { data: stockRow } = await supabase
        .from('stock')
        .select('quantity')
        .eq('product_id', productId)
        .eq('warehouse_id', wid)
        .maybeSingle()

      const current = Number(stockRow?.quantity ?? 0)
      const delta = counted - current
      if (Math.abs(delta) < 1e-9) continue

      const { error: insErr } = await supabase.from('stock_movements').insert({
        tenant_id: tenantId,
        product_id: productId,
        warehouse_id: wid,
        movement_type: 'adjustment',
        quantity: delta,
        reference_no: null,
        notes: `Stok sayımı — ${wh.name}`,
        transaction_date: today,
        created_by: user.id,
      })

      if (insErr) throw insErr
    }

    if (purchasePriceRaw !== undefined && purchasePriceRaw !== null && purchasePriceRaw !== '') {
      const n = typeof purchasePriceRaw === 'number' ? purchasePriceRaw : parseFloat(String(purchasePriceRaw).replace(',', '.'))
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: 'Geçersiz birim maliyet' }, { status: 400 })
      }
      const { error: uErr } = await supabase.from('products').update({ purchase_price: n }).eq('id', productId).eq('tenant_id', tenantId)
      if (uErr) throw uErr
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Kaydedilemedi'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
