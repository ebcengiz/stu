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
      .from('stock_movements')
      .select(
        `
        id,
        movement_type,
        quantity,
        created_at,
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
      .limit(100)

    if (error) throw error

    const mapped =
      data?.map((row: any) => ({
        id: row.id,
        movement_type: row.movement_type,
        quantity: Number(row.quantity || 0),
        movement_date: row.created_at,
        reference_no: row.reference_no,
        notes: row.notes ?? null,
        created_by_name: row.profiles?.full_name ?? null,
        warehouses: row.warehouses,
      })) ?? []

    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error('Product stock movements error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

