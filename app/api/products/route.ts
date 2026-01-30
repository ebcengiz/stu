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

    // Stok bilgilerini ayır (movement_type da ayır - products tablosunda yok)
    const { initial_quantity, warehouse_id, movement_type, ...productData } = body

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
      // First check if stock record already exists
      const { data: existingStock } = await supabase
        .from('stock')
        .select('id, quantity')
        .eq('product_id', product.id)
        .eq('warehouse_id', warehouse_id)
        .single()

      if (existingStock) {
        // Update existing stock
        const { error: stockError } = await supabase
          .from('stock')
          .update({
            quantity: initial_quantity,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingStock.id)

        if (stockError) {
          console.error('Stock update error:', stockError)
          throw stockError
        }
      } else {
        // Insert new stock record
        const { error: stockError } = await supabase
          .from('stock')
          .insert({
            tenant_id: profile.tenant_id,
            product_id: product.id,
            warehouse_id: warehouse_id,
            quantity: initial_quantity,
            last_updated: new Date().toISOString()
          })

        if (stockError) {
          console.error('Stock create error:', stockError)
          throw stockError
        }
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
