import { createClient } from '@/lib/supabase/server'
import { insertProductFromBody } from '@/lib/server/insertProductFromBody'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        barcode,
        description,
        price,
        purchase_price,
        tax_rate,
        discount_rate,
        currency,
        unit,
        min_stock_level,
        image_url,
        is_active,
        category_id,
        tenant_id,
        created_at,
        updated_at,
        product_kind,
        brand,
        gtip,
        sale_units,
        shelf_location_id,
        case_inner_qty,
        categories:category_id (
          id,
          name
        ),
        shelf_locations (
          id,
          name
        ),
        stock!product_id (
          id,
          quantity,
          warehouse_id,
          last_updated,
          warehouses:warehouse_id (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(products)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Get user's tenant_id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    const result = await insertProductFromBody(
      supabase,
      { tenantId: profile.tenant_id, userId: user.id },
      body,
      { initialStockNote: 'Başlangıç stoku' }
    )
    if (!result.ok) {
      console.error('Product create error:', result.message)
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    const { data: product, error: fetchErr } = await supabase.from('products').select().eq('id', result.id).single()
    if (fetchErr || !product) {
      return NextResponse.json({ error: fetchErr?.message || 'Ürün okunamadı' }, { status: 500 })
    }

    return NextResponse.json(product)
  } catch (error: any) {
    console.error('Product create error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
