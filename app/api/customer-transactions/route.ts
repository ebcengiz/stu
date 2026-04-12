import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { adjustAccountBalance, requiresAccountForPayment } from '@/lib/account-balance'
import { resolveOptionalProjectId } from '@/lib/project-validation'

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
      .select('*, customer_transaction_items(*)')
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
      document_number,
      waybill_number,
      shipment_date,
      order_date,
      cheque_due_date,
      cheque_bank,
      cheque_serial_number,
      items, // Array of { product_id, product_name, quantity, unit_price, total_price }
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

    const { projectId, invalid: badProject } = await resolveOptionalProjectId(
      supabase,
      profile.tenant_id,
      body.project_id
    )
    if (badProject) {
      return NextResponse.json({ error: 'Geçersiz proje' }, { status: 400 })
    }

    if (
      type === 'payment' &&
      requiresAccountForPayment(payment_method) &&
      !account_id
    ) {
      return NextResponse.json(
        { error: 'Tahsilatın yatırılacağı kasa veya banka hesabını seçin' },
        { status: 400 }
      )
    }

    // Get customer name for stock movement notes
    const { data: customer } = await supabase
      .from('customers')
      .select('company_name')
      .eq('id', customer_id)
      .single()

    const customerName = customer?.company_name || 'Bilinmeyen Müşteri'

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
        payment_method: type === 'payment' ? payment_method : null,
        document_number,
        waybill_number,
        shipment_date,
        order_date,
        cheque_due_date: type === 'payment' && payment_method === 'cheque' ? cheque_due_date : null,
        cheque_bank: type === 'payment' && payment_method === 'cheque' ? cheque_bank : null,
        cheque_serial_number: type === 'payment' && payment_method === 'cheque' ? cheque_serial_number : null,
        account_id: account_id || null,
        currency,
        project_id: projectId,
      })
      .select()
      .single()

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
          delta: Number(amount),
          currency,
        })
      } catch (balanceErr: any) {
        await supabase.from('customer_transactions').delete().eq('id', transaction.id)
        return NextResponse.json(
          { error: balanceErr.message || 'Hesap bakiyesi güncellenemedi' },
          { status: 400 }
        )
      }
    }

    // 2. Satış: kalemli veya kalemsiz — proje / satışlar listesi için her zaman `sales` satırı oluştur
    if (type === 'sale') {
      if (items && items.length > 0) {
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

        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .insert({
            tenant_id: profile.tenant_id,
            customer_id: customer_id,
            sale_date: transaction_date,
            document_no: document_number || '',
            order_no: '',
            total_amount: amount,
            collected_amount: 0,
            currency,
            status: 'Faturalaşmış',
            description: description || '',
            project_id: projectId,
          })
          .select()
          .single()

        if (saleError) throw saleError

        if (saleData) {
          const saleItemsToInsert = items.map((item: any) => {
            const subtotal = Number(item.quantity) * Number(item.unit_price)
            const vatRate = Number(item.tax_rate) || 0
            const vatAmount = subtotal * (vatRate / 100)
            return {
              sale_id: saleData.id,
              product_id: item.product_id,
              warehouse_id: item.warehouse_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              vat_rate: vatRate,
              vat_amount: vatAmount,
              total_price: item.total_price
            }
          })
          const { error: saleItemsError } = await supabase.from('sale_items').insert(saleItemsToInsert)
          if (saleItemsError) throw saleItemsError
        }

        for (const item of items) {
          if (item.product_id) {
            const { error: movementError } = await supabase.from('stock_movements').insert({
              tenant_id: profile.tenant_id,
              product_id: item.product_id,
              warehouse_id: item.warehouse_id,
              movement_type: 'out',
              quantity: item.quantity,
              reference_no: document_number || transaction.id,
              notes: `Müşteri Satışı - ${customerName}`,
              created_by: user.id
            })
            if (movementError) console.error('Stock movement error:', movementError)
          }
        }
      } else {
        const { error: saleOnlyError } = await supabase.from('sales').insert({
          tenant_id: profile.tenant_id,
          customer_id: customer_id,
          sale_date: transaction_date,
          document_no: document_number || '',
          order_no: '',
          total_amount: amount,
          collected_amount: 0,
          currency,
          status: 'Faturalaşmış',
          description: description || '',
          project_id: projectId,
        })
        if (saleOnlyError) throw saleOnlyError
      }
    }

    return NextResponse.json(transaction)
  } catch (error: any) {
    console.error('Transaction API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
