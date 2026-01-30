import { createClient } from '@/lib/supabase/server'
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
        unit,
        min_stock_level,
        is_active,
        category_id,
        tenant_id,
        created_at,
        updated_at,
        categories:category_id (
          id,
          name
        ),
        stock!product_id (
          id,
          quantity,
          warehouse_id,
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

    // Stok bilgilerini ayır
    const { initial_quantity, warehouse_id, ...productData } = body

    // Convert empty strings to null for nullable fields
    const cleanData: any = {}
    for (const [key, value] of Object.entries(productData)) {
      if (value === '' || value === undefined) {
        if (['sku', 'barcode', 'description', 'image_url'].includes(key)) {
          cleanData[key] = null
        }
      } else {
        cleanData[key] = value
      }
    }

    // 1. Önce ürünü oluştur
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        ...cleanData,
        tenant_id: profile.tenant_id,
      })
      .select()
      .single()

    if (productError) {
      console.error('Product create error:', productError)
      throw productError
    }

    // 2. Eğer başlangıç stok bilgisi varsa, stock ve stock_movements tablosuna ekle
    if (initial_quantity && initial_quantity > 0 && warehouse_id) {
      // UPSERT kullan - duplicate önler
      const { error: stockError } = await supabase
        .from('stock')
        .upsert({
          tenant_id: profile.tenant_id,
          product_id: product.id,
          warehouse_id: warehouse_id,
          quantity: initial_quantity,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'product_id,warehouse_id'
        })

      if (stockError) {
        console.error('Stock create error:', stockError)
        // Ürün oluşturuldu ama stok eklenemedi - uyarı ver ama devam et
        throw stockError
      }

      // İlk stok hareketini kaydet
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          tenant_id: profile.tenant_id,
          product_id: product.id,
          warehouse_id: warehouse_id,
          movement_type: 'in',
          quantity: initial_quantity,
          reference_no: null,
          notes: 'Başlangıç stoku',
          created_by: user.id
        })

      if (movementError) {
        console.error('Stock movement create error:', movementError)
        throw movementError
      }
    }

    return NextResponse.json(product)
  } catch (error: any) {
    console.error('Product create error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
