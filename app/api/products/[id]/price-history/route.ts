import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await context.params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('customer_transaction_items')
      .select(`
        unit_price,
        quantity,
        customer_transactions!inner (
          transaction_date,
          customer_id,
          customers (
            company_name
          )
        )
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Veriyi daha kolay işlenebilir bir formata sokalım
    const history = data.map((item: any) => ({
      price: item.unit_price,
      date: item.customer_transactions.transaction_date,
      customer_id: item.customer_transactions.customer_id,
      customer_name: item.customer_transactions.customers?.company_name || 'Bilinmeyen Müşteri'
    }))

    return NextResponse.json(history)
  } catch (error: any) {
    console.error('Price history error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
