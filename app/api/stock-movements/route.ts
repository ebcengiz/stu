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
        warehouses (name),
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

    const { product_id, warehouse_id, movement_type, quantity, reference_no, notes } = body

    // Create the stock movement
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
        created_by: user.id
      })
      .select()
      .single()

    if (movementError) throw movementError

    // Update stock table based on movement type
    const { data: existingStock } = await supabase
      .from('stock')
      .select('*')
      .eq('product_id', product_id)
      .eq('warehouse_id', warehouse_id)
      .maybeSingle() // single() yerine maybeSingle() - hata vermez

    let newQuantity = 0

    if (existingStock) {
      // Update existing stock
      if (movement_type === 'in') {
        newQuantity = Number(existingStock.quantity) + Number(quantity)
      } else if (movement_type === 'out') {
        newQuantity = Math.max(0, Number(existingStock.quantity) - Number(quantity))
      } else if (movement_type === 'adjustment') {
        newQuantity = Number(quantity)
      }
    } else {
      // Create new stock entry
      if (movement_type === 'in' || movement_type === 'adjustment') {
        newQuantity = Number(quantity)
      }
    }

    // UPSERT kullan - duplicate önler
    const { error: stockError } = await supabase
      .from('stock')
      .upsert({
        tenant_id: profile.tenant_id,
        product_id,
        warehouse_id,
        quantity: newQuantity,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'product_id,warehouse_id'
      })

    if (stockError) throw stockError

    return NextResponse.json(movement)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
