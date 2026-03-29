import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const customer_id = searchParams.get('customer_id')

    if (!customer_id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    const { data: transactions, error } = await supabase
      .from('customer_transactions')
      .select('*')
      .eq('customer_id', customer_id)
      .order('transaction_date', { ascending: false })

    if (error) throw error

    return NextResponse.json(transactions)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { 
      customer_id, 
      type, 
      amount, 
      description, 
      transaction_date, 
      payment_method,
      items // Array of { product_id, product_name, quantity, unit_price, total_price }
    } = body

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    // 1. Create the main transaction
    const { data: transaction, error: txError } = await supabase
      .from('customer_transactions')
      .insert({
        customer_id,
        tenant_id: profile.tenant_id,
        type,
        amount,
        description,
        transaction_date,
        payment_method: type === 'payment' ? payment_method : null
      })
      .select()
      .single()

    if (txError) throw txError

    // 2. If it's a sale, create transaction items and update stock
    if (type === 'sale' && items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        transaction_id: transaction.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate || 0,
        discount_rate: item.discount_rate || 0,
        tax_amount: item.tax_amount || 0,
        discount_amount: item.discount_amount || 0,
        total_price: item.total_price
      }))

      const { error: itemsError } = await supabase
        .from('customer_transaction_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      // 3. Optional: Create stock movements for each item if product_id exists
      // This part depends on how stock_movements table is structured
      for (const item of items) {
        if (item.product_id) {
          await supabase.from('stock_movements').insert({
            tenant_id: profile.tenant_id,
            product_id: item.product_id,
            movement_type: 'out',
            quantity: item.quantity,
            description: `Müşteri Satışı - ${transaction.id}`
          })
        }
      }
    }

    return NextResponse.json(transaction)
  } catch (error: any) {
    console.error('Transaction API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
