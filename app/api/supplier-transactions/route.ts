import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { adjustAccountBalance, requiresAccountForPayment } from '@/lib/account-balance'
import { isMissingColumnSchemaError } from '@/lib/db-errors'

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
      items, // Array of { product_id, product_name, quantity, unit_price, total_price, warehouse_id }
      account_id,
      currency: bodyCurrency,
    } = body

    const currency = bodyCurrency || 'TRY'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    if (
      type === 'payment' &&
      requiresAccountForPayment(payment_method) &&
      !account_id
    ) {
      return NextResponse.json(
        { error: 'Ödemenin çekileceği kasa veya banka hesabını seçin' },
        { status: 400 }
      )
    }

    // Get supplier name for stock movement notes
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('company_name')
      .eq('id', supplier_id)
      .single()

    const supplierName = supplier?.company_name || 'Bilinmeyen Tedarikçi'

    // 1. Create the main transaction (currency sütunu yoksa migration 024; yine de insert'i currency'siz dene)
    const insertBase = {
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
      cheque_serial_number: type === 'payment' && payment_method === 'cheque' ? cheque_serial_number : null,
      account_id: account_id || null,
    }

    let { data: transaction, error: txError } = await supabase
      .from('supplier_transactions')
      .insert({ ...insertBase, currency })
      .select()
      .single()

    if (txError && isMissingColumnSchemaError(txError, 'currency')) {
      const retry = await supabase
        .from('supplier_transactions')
        .insert(insertBase)
        .select()
        .single()
      transaction = retry.data
      txError = retry.error
    }

    if (txError) throw txError

    if (
      type === 'payment' &&
      account_id &&
      requiresAccountForPayment(payment_method)
    ) {
      try {
        await adjustAccountBalance(supabase, {
          tenantId: profile.tenant_id,
          accountId: account_id,
          delta: -Number(amount),
          currency,
        })
      } catch (balanceErr: any) {
        await supabase.from('supplier_transactions').delete().eq('id', transaction.id)
        return NextResponse.json(
          { error: balanceErr.message || 'Hesap bakiyesi güncellenemedi' },
          { status: 400 }
        )
      }
    }

    // 2. If it's a purchase, create transaction items, update stock, and create a purchases record
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

      // Create a record in 'purchases' table so it shows up in Purchases page
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          tenant_id: profile.tenant_id,
          supplier_id: supplier_id,
          purchase_date: transaction_date,
          document_no: document_number || '',
          order_no: '', 
          total_amount: amount,
          paid_amount: 0,
          status: 'Faturalaşmış',
          description: description || ''
        })
        .select()
        .single()
        
      if (purchaseError) console.error('Purchase insertion error:', purchaseError)

      // If purchase created successfully, create purchase_items
      if (purchaseData) {
        const purchaseItemsToInsert = items.map((item: any) => {
          const subtotal = Number(item.quantity) * Number(item.unit_price)
          const vatRate = Number(item.tax_rate) || 20
          const vatAmount = subtotal * (vatRate / 100)
          return {
            purchase_id: purchaseData.id,
            product_id: item.product_id,
            warehouse_id: item.warehouse_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            vat_rate: vatRate,
            vat_amount: vatAmount,
            total_price: item.total_price
          }
        })
        const { error: purchaseItemsError } = await supabase.from('purchase_items').insert(purchaseItemsToInsert)
        if (purchaseItemsError) console.error('Purchase items insertion error:', purchaseItemsError)
      }

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
            notes: `Tedarikçi Alımı - ${supplierName}`,
            created_by: user.id
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
