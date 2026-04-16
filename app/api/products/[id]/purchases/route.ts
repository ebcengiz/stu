import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('purchase_items')
      .select(
        `
        id,
        quantity,
        unit_price,
        purchases:purchase_id (
          id,
          document_no,
          created_at,
          total_amount,
          suppliers (
            company_name
          )
        )
      `
      )
      .eq('product_id', id)
      .order('created_at', { foreignTable: 'purchases', ascending: false })
      .limit(50)

    if (error) throw error

    const mapped =
      data?.map((row: any) => ({
        id: row.purchases?.id,
        document_no: row.purchases?.document_no ?? null,
        created_at: row.purchases?.created_at,
        total_amount: Number(row.purchases?.total_amount ?? 0),
        quantity: Number(row.quantity ?? 0),
        unit_price: Number(row.unit_price ?? 0),
        counterparty_name: row.purchases?.suppliers?.company_name ?? 'Hızlı Alış',
      })) ?? []

    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error('Product purchases list error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

