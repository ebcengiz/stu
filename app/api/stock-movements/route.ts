import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: movements, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        products (name, unit),
        warehouses (name, deleted_at),
        profiles (full_name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(movements)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Get user info
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    const { product_id, warehouse_id, movement_type, quantity, reference_no, notes, transaction_date } = body

    const txDate =
      transaction_date != null && String(transaction_date).trim() !== ''
        ? String(transaction_date).slice(0, 10)
        : null

    // Stok güncellemesi: DB tetikleyicisi (handle_stock_movement) insert sonrası yapılır; burada tekrar yazmayın.

    const { data: movement, error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        tenant_id: profile.tenant_id,
        product_id,
        warehouse_id,
        movement_type,
        quantity,
        reference_no: reference_no || null,
        notes: notes || null,
        transaction_date: txDate,
        created_by: user.id,
      })
      .select()
      .single()

    if (movementError) throw movementError

    return NextResponse.json(movement)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
