import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { adjustAccountBalance } from '@/lib/account-balance'
import { isMissingColumnSchemaError } from '@/lib/db-errors'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { data: purchases, error } = await supabase
      .from('purchases')
      .select(`
        *,
        suppliers (
          company_name
        )
      `)
      .order('purchase_date', { ascending: false })

    if (error) throw error

    return NextResponse.json(purchases)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    const currency = body.currency || 'TRY'
    const paid = Number(body.paid_amount) || 0
    if (body.supplier_id && paid > 0 && !body.payment_account_id) {
      return NextResponse.json(
        { error: 'Ödenen tutar girildiğinde paranın çekileceği hesabı seçmelisiniz' },
        { status: 400 }
      )
    }

    // A. Purchases Tablosuna Ekle
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        tenant_id: profile.tenant_id,
        supplier_id: body.supplier_id || null,
        purchase_date: body.purchase_date,
        document_no: body.document_no,
        order_no: body.order_no,
        total_amount: body.total_amount,
        paid_amount: body.paid_amount,
        currency,
        status: body.status,
        description: body.description
      })
      .select()
      .single()

    if (purchaseError) throw purchaseError

    // B. Purchase Items Tablosuna Ekle
    if (body.items && body.items.length > 0) {
      const itemsToInsert = body.items.map((item: any) => {
        const subtotal = Number(item.quantity) * Number(item.unit_price)
        const vatRate = Number(item.vat_rate) || 0
        const vatAmount = subtotal * (vatRate / 100)

        return {
          purchase_id: purchase.id,
          product_id: item.product_id,
          warehouse_id: item.warehouse_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          total_price: item.total_price // KDV dahil
        }
      })

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      // C. Stoka Ekle (stock_movements tablosuna 'in' kaydı ekle)
      const stockMovements = body.items.map((item: any) => ({
        tenant_id: profile.tenant_id,
        product_id: item.product_id,
        warehouse_id: item.warehouse_id,
        movement_type: 'in',
        quantity: item.quantity,
        reference_no: body.document_no || `Alış-${purchase.id.substring(0,8)}`,
        notes: `Alış: ${purchase.id}`,
        created_by: user.id
      }))

      const { error: stockError } = await supabase
        .from('stock_movements')
        .insert(stockMovements)

      if (stockError) throw stockError
    }

    // D. Eğer Kayıtlı Tedarikçi ise, Cari (Bakiye) İşlemi Yap
    if (body.supplier_id) {
      // Satın Alma Faturası (Bizim ona olan borcumuz artar -> is_debt: true on the supplier's side? 
      // In supplier logic: invoice increases our debt (their balance increases).
      // Wait, let's see how supplier transactions handle it. 'purchase' type.
      if (body.total_amount > 0) {
        const purchaseStRow = {
          tenant_id: profile.tenant_id,
          supplier_id: body.supplier_id,
          type: 'purchase' as const,
          amount: body.total_amount,
          transaction_date: body.purchase_date,
          document_number: body.document_no,
          description: `Satın Alma Faturası - Belge No: ${body.document_no || purchase.id.substring(0, 8)}`,
        }
        let { error: transError } = await supabase
          .from('supplier_transactions')
          .insert({ ...purchaseStRow, currency })
        if (transError && isMissingColumnSchemaError(transError, 'currency')) {
          const retry = await supabase.from('supplier_transactions').insert(purchaseStRow)
          transError = retry.error
        }
        if (transError) throw transError
      }

      // Ödeme (Bizim ona yaptığımız ödeme -> type: 'payment')
      if (paid > 0) {
        const paymentStRow = {
          tenant_id: profile.tenant_id,
          supplier_id: body.supplier_id,
          type: 'payment' as const,
          amount: paid,
          transaction_date: body.purchase_date,
          document_number: body.document_no,
          description: `Satın Alma Ödemesi - Belge No: ${body.document_no || purchase.id.substring(0, 8)}`,
          account_id: body.payment_account_id || null,
          payment_method: 'cash' as const,
        }
        let { data: payRow, error: payError } = await supabase
          .from('supplier_transactions')
          .insert({ ...paymentStRow, currency })
          .select('id')
          .single()
        if (payError && isMissingColumnSchemaError(payError, 'currency')) {
          const retry = await supabase
            .from('supplier_transactions')
            .insert(paymentStRow)
            .select('id')
            .single()
          payRow = retry.data
          payError = retry.error
        }
        if (payError) throw payError

        if (body.payment_account_id) {
          try {
            await adjustAccountBalance(supabase, {
              tenantId: profile.tenant_id,
              accountId: body.payment_account_id,
              delta: -paid,
              currency,
            })
          } catch (e: any) {
            if (payRow?.id) {
              await supabase.from('supplier_transactions').delete().eq('id', payRow.id)
            }
            throw e
          }
        }
      }
    }

    return NextResponse.json(purchase)
  } catch (error: any) {
    console.error('Purchase Creation Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
