import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // 1. Get offer and items
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        offer_items (*)
      `)
      .eq('id', id)
      .single()

    if (offerError) throw offerError
    if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })

    if (offer.status === 'Onaylandı') {
      return NextResponse.json({ error: 'Bu teklif zaten onaylanmış.' }, { status: 400 })
    }

    // 2. Create Sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        tenant_id: offer.tenant_id,
        customer_id: offer.customer_id,
        sale_date: new Date().toISOString(),
        document_no: offer.document_no || `TKF-${offer.id.substring(0,8)}`,
        order_no: `TKF-${offer.id.substring(0,8)}`,
        total_amount: offer.total_amount,
        status: 'Faturalaşmış',
        description: `Tekliften dönüştürüldü: ${offer.id}\n${offer.description || ''}`
      })
      .select()
      .single()

    if (saleError) throw saleError

    // 3. Create Sale Items & Stock Movements
    if (offer.offer_items && offer.offer_items.length > 0) {
      // Check if all items have a warehouse_id
      const itemsWithoutWarehouse = offer.offer_items.filter((item: any) => !item.warehouse_id)
      if (itemsWithoutWarehouse.length > 0) {
        return NextResponse.json({ 
          error: 'Teklifteki tüm ürünler için bir depo seçilmiş olmalıdır. Lütfen teklifi düzenleyip depoları seçin.' 
        }, { status: 400 })
      }

      const saleItems = offer.offer_items.map((item: any) => {
        const subtotal = Number(item.quantity) * Number(item.unit_price)
        const vatAmount = subtotal * (Number(item.tax_rate) / 100)
        
        return {
          sale_id: sale.id,
          product_id: item.product_id,
          warehouse_id: item.warehouse_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.tax_rate || 20,
          vat_amount: vatAmount,
          total_price: item.total_price
        }
      })

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      // Stock movements
      const stockMovements = offer.offer_items.map((item: any) => ({
        tenant_id: offer.tenant_id,
        product_id: item.product_id,
        warehouse_id: item.warehouse_id,
        movement_type: 'out',
        quantity: item.quantity,
        reference_no: sale.document_no,
        notes: `Tekliften dönüştürülen satış: ${sale.id}`,
        created_by: user.id
      }))

      const { error: stockError } = await supabase
        .from('stock_movements')
        .insert(stockMovements)

      if (stockError) throw stockError
    }

    // 4. Create Customer Transaction (Cari Borç)
    if (offer.customer_id && offer.total_amount > 0) {
      const { error: transError } = await supabase
        .from('customer_transactions')
        .insert({
          tenant_id: offer.tenant_id,
          customer_id: offer.customer_id,
          type: 'invoice',
          amount: offer.total_amount,
          currency: String(offer.currency || 'TRY'),
          transaction_date: new Date().toISOString(),
          document_number: sale.document_no,
          description: `Tekliften dönüştürülen satış - Sipariş No: ${sale.order_no}`,
        })
      
      if (transError) {
        console.error('Cari Kayıt Hatası:', transError)
        // Satışı silip hata dönebiliriz (Opsiyonel: Rollback mantığı)
        return NextResponse.json({ error: `Cari borç kaydı oluşturulamadı: ${transError.message}` }, { status: 500 })
      }
    }

    // 5. Update Offer Status
    const { error: updateError } = await supabase
      .from('offers')
      .update({ status: 'Onaylandı', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, sale_id: sale.id })
  } catch (error: any) {
    console.error('Offer Approve error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
