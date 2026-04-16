import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  ALL_STOCK_MOVEMENT_SOURCE_KEYS,
  classifyStockMovementSource,
  type StockMovementSourceKey,
} from '@/lib/stock-movement-source'

const MAX_ROWS = 2500

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')?.trim() || null
    const to = searchParams.get('to')?.trim() || null
    const kindsRaw = searchParams.get('kinds')?.trim() || ''

    const kindsFilter: StockMovementSourceKey[] | null = (() => {
      if (!kindsRaw) return null
      const parts = kindsRaw.split(',').map((s) => s.trim().toLowerCase())
      const allowed = new Set(ALL_STOCK_MOVEMENT_SOURCE_KEYS)
      const picked = parts.filter((p): p is StockMovementSourceKey => allowed.has(p as StockMovementSourceKey))
      return picked.length > 0 ? picked : null
    })()

    const supabase = await createClient()

    let q = supabase
      .from('stock_movements')
      .select(
        `
        id,
        movement_type,
        quantity,
        created_at,
        transaction_date,
        reference_no,
        notes,
        profiles (
          full_name
        ),
        warehouses:warehouse_id (
          id,
          name
        )
      `
      )
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS)

    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      q = q.gte('created_at', `${from}T00:00:00.000Z`)
    }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      q = q.lte('created_at', `${to}T23:59:59.999Z`)
    }

    const { data, error } = await q

    if (error) throw error

    const mapped =
      data?.map((row: any) => {
        const source_kind = classifyStockMovementSource(row.movement_type, row.notes)
        const td = row.transaction_date as string | null | undefined
        const movement_date =
          td && String(td).length >= 10 ? `${String(td).slice(0, 10)}T12:00:00.000Z` : row.created_at
        return {
          id: row.id,
          movement_type: row.movement_type,
          quantity: Number(row.quantity || 0),
          movement_date,
          reference_no: row.reference_no,
          notes: row.notes ?? null,
          created_by_name: row.profiles?.full_name ?? null,
          warehouses: row.warehouses,
          source_kind,
        }
      }) ?? []

    const filtered =
      kindsFilter && kindsFilter.length > 0
        ? mapped.filter((m) => kindsFilter.includes(m.source_kind))
        : mapped

    return NextResponse.json(filtered)
  } catch (error: any) {
    console.error('Product stock movements error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
