import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customer_id')

  try {
    let query = supabase
      .from('offers')
      .select(`
        *,
        customers (company_name),
        offer_items (
          *,
          products (name, unit)
        )
      `)
      .order('created_at', { ascending: false })

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profil bulunamadı.' }, { status: 404 })

    const { items, ...offerData } = body

    // Temizleme: Boş string gelen alanları null yap (özellikle tarihler için kritik)
    const sanitizedOfferData: any = {}
    for (const [key, value] of Object.entries(offerData)) {
      sanitizedOfferData[key] = value === '' ? null : value
    }

    // 1. Create offer
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .insert({
        ...sanitizedOfferData,
        tenant_id: profile.tenant_id
      })
      .select()
      .single()

    if (offerError) {
      console.error('Offer DB Error:', offerError)
      return NextResponse.json({ error: `Teklif oluşturulamadı: ${offerError.message}` }, { status: 500 })
    }

    // 2. Create offer items
    if (items && items.length > 0) {
      const offerItems = items.map((item: any) => ({
        offer_id: offer.id,
        product_id: item.product_id,
        warehouse_id: item.warehouse_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate || 20,
        total_price: item.total_price
      }))

      const { error: itemsError } = await supabase
        .from('offer_items')
        .insert(offerItems)

      if (itemsError) {
        console.error('Offer Items DB Error:', itemsError)
        // Teklifi geri silebiliriz veya hata dönebiliriz
        await supabase.from('offers').delete().eq('id', offer.id)
        return NextResponse.json({ error: `Teklif kalemleri oluşturulamadı: ${itemsError.message}` }, { status: 500 })
      }
    }

    return NextResponse.json(offer)
  } catch (error: any) {
    console.error('Offer POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
