import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { adjustAccountBalance, requiresAccountForPayment } from '@/lib/account-balance'
import { isMissingColumnSchemaError } from '@/lib/db-errors'
import { resolveOptionalProjectId } from '@/lib/project-validation'

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
      portfolio_check_id: bodyPortfolioCheckId,
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

    const portfolioCheckId =
      typeof bodyPortfolioCheckId === 'string' && bodyPortfolioCheckId.length > 0
        ? bodyPortfolioCheckId
        : null

    if (
      type === 'payment' &&
      portfolioCheckId &&
      payment_method === 'cheque'
    ) {
      const { data: pc, error: pcFetchErr } = await supabase
        .from('portfolio_checks')
        .select('*')
        .eq('id', portfolioCheckId)
        .eq('tenant_id', profile.tenant_id)
        .maybeSingle()

      if (pcFetchErr) throw pcFetchErr
      if (!pc) {
        return NextResponse.json({ error: 'Çek portföyünde kayıt bulunamadı' }, { status: 400 })
      }
      if (pc.status !== 'portfolio') {
        return NextResponse.json({ error: 'Bu çek portföyde değil veya başka bir işleme bağlı' }, { status: 400 })
      }
      if (String(pc.currency || 'TRY') !== String(currency)) {
        return NextResponse.json({ error: 'Çek para birimi ile ödeme tutarı uyuşmuyor' }, { status: 400 })
      }
      if (Math.abs(Number(pc.amount) - Number(amount)) > 0.009) {
        return NextResponse.json({ error: 'Tutar, seçilen çek tutarı ile aynı olmalıdır' }, { status: 400 })
      }
    } else if (
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

    let effectiveChequeDue = cheque_due_date
    let effectiveChequeBank = cheque_bank
    let effectiveChequeSerial = cheque_serial_number

    if (type === 'payment' && portfolioCheckId && payment_method === 'cheque') {
      const { data: pc } = await supabase
        .from('portfolio_checks')
        .select('*')
        .eq('id', portfolioCheckId)
        .eq('tenant_id', profile.tenant_id)
        .single()
      if (pc) {
        effectiveChequeDue = pc.due_date ? new Date(String(pc.due_date)).toISOString() : effectiveChequeDue
        effectiveChequeBank = pc.bank_name || effectiveChequeBank
        effectiveChequeSerial = pc.check_number || effectiveChequeSerial
      }
    }

    const paymentDescription =
      type === 'payment' && portfolioCheckId && payment_method === 'cheque'
        ? `${description || ''} (Portföy çeki — ciro)`.trim()
        : description

    // 1. Create the main transaction (currency sütunu yoksa migration 024; yine de insert'i currency'siz dene)
    const insertBase = {
      supplier_id,
      tenant_id: profile.tenant_id,
      type,
      amount,
      description: paymentDescription,
      transaction_date,
      payment_method: type === 'payment' ? payment_method : null,
      document_number,
      waybill_number,
      shipment_date,
      order_date,
      cheque_due_date: type === 'payment' && payment_method === 'cheque' ? effectiveChequeDue : null,
      cheque_bank: type === 'payment' && payment_method === 'cheque' ? effectiveChequeBank : null,
      cheque_serial_number: type === 'payment' && payment_method === 'cheque' ? effectiveChequeSerial : null,
      account_id: portfolioCheckId && payment_method === 'cheque' ? null : account_id || null,
      portfolio_check_id: type === 'payment' && portfolioCheckId ? portfolioCheckId : null,
      project_id: projectId,
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

    if (type === 'payment' && portfolioCheckId && payment_method === 'cheque' && transaction) {
      const { data: updatedRows, error: upErr } = await supabase
        .from('portfolio_checks')
        .update({
          status: 'to_supplier',
          supplier_id,
          endorsed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', portfolioCheckId)
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'portfolio')
        .select('id')

      if (upErr) {
        await supabase.from('supplier_transactions').delete().eq('id', transaction.id)
        return NextResponse.json({ error: upErr.message }, { status: 400 })
      }
      if (!updatedRows?.length) {
        await supabase.from('supplier_transactions').delete().eq('id', transaction.id)
        return NextResponse.json(
          { error: 'Çek başka bir işlemle güncellenmiş olabilir; lütfen yenileyin' },
          { status: 409 }
        )
      }
    }

    // Tedarikçiye kendi çeki verildiyse çek portföyüne "to_supplier" olarak ekle
    if (type === 'payment' && !portfolioCheckId && payment_method === 'cheque' && transaction) {
      const txDate = transaction_date
        ? new Date(transaction_date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
      const dueDate = effectiveChequeDue
        ? new Date(effectiveChequeDue).toISOString().slice(0, 10)
        : txDate

      const { error: ownCheckErr } = await supabase.from('portfolio_checks').insert({
        tenant_id: profile.tenant_id,
        supplier_id,
        debtor_name: 'Kendi çekimiz',
        received_date: txDate,
        due_date: dueDate,
        bank_name: effectiveChequeBank || null,
        check_number: effectiveChequeSerial || null,
        description: paymentDescription?.trim() || `Tedarikçiye verilen kendi çekimiz (${supplierName})`,
        amount,
        currency,
        status: 'to_supplier',
        endorsed_at: new Date().toISOString(),
      })

      if (ownCheckErr) {
        await supabase.from('supplier_transactions').delete().eq('id', transaction.id)
        return NextResponse.json(
          { error: ownCheckErr.message || 'Çek portföyü kaydı oluşturulamadı' },
          { status: 400 }
        )
      }
    }

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

    // 2. Alış: kalemli veya kalemsiz — proje / alışlar listesi için her zaman `purchases` satırı oluştur
    if (type === 'purchase') {
      if (items && items.length > 0) {
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
            currency,
            status: 'Faturalaşmış',
            description: description || '',
            project_id: projectId,
          })
          .select()
          .single()

        if (purchaseError) throw purchaseError

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
          if (purchaseItemsError) throw purchaseItemsError
        }

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
      } else {
        const { error: purchaseOnlyError } = await supabase.from('purchases').insert({
          tenant_id: profile.tenant_id,
          supplier_id: supplier_id,
          purchase_date: transaction_date,
          document_no: document_number || '',
          order_no: '',
          total_amount: amount,
          paid_amount: 0,
          currency,
          status: 'Faturalaşmış',
          description: description || '',
          project_id: projectId,
        })
        if (purchaseOnlyError) throw purchaseOnlyError
      }
    }

    return NextResponse.json(transaction)
  } catch (error: any) {
    console.error('Supplier Transaction API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
