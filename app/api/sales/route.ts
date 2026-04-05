import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { data: sales, error } = await supabase
      .from('sales')
      .select(`
        *,
        customers (
          company_name
        )
      `)
      .order('sale_date', { ascending: false })

    if (error) throw error

    return NextResponse.json(sales)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Beklenen body formatı:
    // {
    //   customer_id: string | null,
    //   sale_date: string,
    //   document_no: string,
    //   order_no: string,
    //   total_amount: number,
    //   collected_amount: number,
    //   status: string,
    //   description: string,
    //   items: [ { product_id, warehouse_id, quantity, unit_price, total_price } ]
    // }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    // 1. Transaction başlatmak yerine Supabase RPC kullanabiliriz ama basitlik için sırayla ekleyeceğiz.
    // Eğer biri başarısız olursa, manuel rollback veya Supabase RPC (Stored Procedure) önerilir.
    // Şimdilik standart ardışık ekleme yapıyoruz.

    // A. Sales Tablosuna Ekle
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        tenant_id: profile.tenant_id,
        customer_id: body.customer_id || null,
        sale_date: body.sale_date,
        document_no: body.document_no,
        order_no: body.order_no,
        total_amount: Number(body.total_amount) || 0,
        collected_amount: Number(body.collected_amount) || 0,
        status: body.status,
        description: body.description
      })
      .select()
      .single()

    if (saleError) {
      console.error('Sale Insert Error:', saleError)
      throw new Error(`Satış kaydı oluşturulamadı: ${saleError.message}`)
    }

    // B. Sale Items Tablosuna Ekle
    if (body.items && body.items.length > 0) {
      const itemsToInsert = body.items.map((item: any) => {
        const quantity = Number(item.quantity) || 0
        const unitPrice = Number(item.unit_price) || 0
        const vatRate = Number(item.vat_rate) || 0
        const subtotal = quantity * unitPrice
        const vatAmount = subtotal * (vatRate / 100)

        return {
          sale_id: sale.id,
          product_id: item.product_id,
          warehouse_id: item.warehouse_id,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: item.total_price // KDV dahil
        }
      })

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Sale Items Insert Error:', itemsError)
        throw new Error(`Satış kalemleri kaydedilemedi: ${itemsError.message}`)
      }

      // C. Stoktan Düş (stock_movements tablosuna 'out' kaydı ekle)
      // Not: Veri tabanı trigger'ı otomatik olarak stok tablosunu günceller.
      // Eksi stoğa izin verildiği için burada bir kontrol yapmıyoruz.
      const stockMovements = body.items.map((item: any) => ({
        tenant_id: profile.tenant_id,
        product_id: item.product_id,
        warehouse_id: item.warehouse_id,
        movement_type: 'out',
        quantity: Number(item.quantity) || 0,
        reference_no: body.document_no || `Satış-${sale.id.substring(0,8)}`,
        notes: `Satış: ${sale.id} ${body.customer_id ? '' : '(Perakende)'}`,
        created_by: user.id
      }))

      const { error: stockError } = await supabase
        .from('stock_movements')
        .insert(stockMovements)

      if (stockError) {
        console.error('Stock Movement Error:', stockError)
        throw new Error(`Stok hareketi işlenemedi: ${stockError.message}`)
      }
    }

    // D. Eğer Kayıtlı Müşteri ise, Cari (Bakiye) İşlemi Yap
    if (body.customer_id) {
      // Satış Faturası (Borçlandırma)
      if (body.total_amount > 0) {
         const { error: transError } = await supabase
          .from('customer_transactions')
          .insert({
            tenant_id: profile.tenant_id,
            customer_id: body.customer_id,
            type: 'invoice', // Satış Faturası
            amount: body.total_amount,
            currency: 'TRY',
            date: body.sale_date,
            document_no: body.document_no,
            description: `Satış Faturası - Sipariş No: ${body.order_no || sale.id.substring(0,8)}`,
            is_debt: true
          })
          if (transError) throw transError
      }

      // Tahsilat (Alacaklandırma / Ödeme)
      if (body.collected_amount > 0) {
        const { error: payError } = await supabase
          .from('customer_transactions')
          .insert({
            tenant_id: profile.tenant_id,
            customer_id: body.customer_id,
            type: 'payment', // Tahsilat
            amount: body.collected_amount,
            currency: 'TRY',
            date: body.sale_date,
            document_no: body.document_no,
            description: `Satış Tahsilatı - Sipariş No: ${body.order_no || sale.id.substring(0,8)}`,
            is_debt: false
          })
          if (payError) throw payError
      }
    }

    return NextResponse.json(sale)
  } catch (error: any) {
    console.error('Sale Creation Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
