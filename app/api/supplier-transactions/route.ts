import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const supplier_id = searchParams.get('supplier_id')

    if (!supplier_id) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 })
    }

    const { data: transactions, error } = await supabase
      .from('supplier_transactions')
      .select('*, supplier_transaction_items(*)')
      .eq('supplier_id', supplier_id)
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
      supplier_id, 
      type, 
      amount, 
      description, 
      transaction_date, 
      payment_method,
      document_number,
      waybill_number,
      shipment_date,
      order_date,
      cheque_due_date,
      cheque_bank,
      cheque_serial_number,
      items // Array of { product_id, product_name, quantity, unit_price, total_price, warehouse_id }
    } = body

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    // Get supplier name for stock movement notes
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('company_name')
      .eq('id', supplier_id)
      .single()

    const supplierName = supplier?.company_name || 'Bilinmeyen Tedarikçi'

    // 1. Create the main transaction
    const { data: transaction, error: txError } = await supabase
      .from('supplier_transactions')
      .insert({
        supplier_id,
        tenant_id: profile.tenant_id,
        type,
        amount,
        description,
        transaction_date,
        payment_method: type === 'payment' ? payment_method : null,
        document_number,
        waybill_number,
        shipment_date,
        order_date,
        cheque_due_date: type === 'payment' && payment_method === 'cheque' ? cheque_due_date : null,
        cheque_bank: type === 'payment' && payment_method === 'cheque' ? cheque_bank : null,
        cheque_serial_number: type === 'payment' && payment_method === 'cheque' ? cheque_serial_number : null
      })
      .select()
      .single()

    if (txError) throw txError

    // 2. If it's a purchase, create transaction items and update stock
    if (type === 'purchase' && items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        tenant_id: profile.tenant_id,
        transaction_id: transaction.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate || 20,
        discount_rate: item.discount_rate || 0,
        total_price: item.total_price,
        warehouse_id: item.warehouse_id
      }))

      const { error: itemsError } = await supabase
        .from('supplier_transaction_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      // 3. Create stock movements for each item to increase stock (purchase = in)
      for (const item of items) {
        if (item.product_id) {
          const { error: movementError } = await supabase.from('stock_movements').insert({
            tenant_id: profile.tenant_id,
            product_id: item.product_id,
            warehouse_id: item.warehouse_id,
            movement_type: 'in',
            quantity: item.quantity,
            reference_no: document_number || transaction.id,
            notes: `Tedarikçi Alımı - ${supplierName}`
          })
          if (movementError) console.error('Stock movement error:', movementError)
        }
      }
    }

    return NextResponse.json(transaction)
  } catch (error: any) {
    console.error('Supplier Transaction API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
