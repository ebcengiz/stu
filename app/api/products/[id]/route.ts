import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createClient()
    const body = await request.json()

    // Get user info
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    // Stok bilgilerini ayır
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

    // 1. Ürün bilgilerini güncelle
    const { data: product, error: productError } = await supabase
      .from('products')
      .update(cleanData)
      .eq('id', params.id)
      .select()
      .single()

    if (productError) {
      console.error('Product update error:', productError)
      throw productError
    }

    // 2. Eğer stok güncellemesi varsa, SADECE stock_movements'a ekle
    // Trigger otomatik olarak stock tablosunu güncelleyecek
    if (initial_quantity && initial_quantity > 0 && warehouse_id) {
      // Stok hareketini kaydet - trigger stock tablosunu otomatik güncelleyecek
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          tenant_id: profile.tenant_id,
          product_id: params.id,
          warehouse_id: warehouse_id,
          movement_type: movement_type || 'in',
          quantity: initial_quantity,
          reference_no: null,
          notes: 'Ürün düzenleme sırasında stok güncellendi',
          created_by: user.id
        })

      if (movementError) {
        console.error('Stock movement create error:', movementError)
        throw movementError
      }
    }

    return NextResponse.json(product)
  } catch (error: any) {
    console.error('Product update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createClient()

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Product delete error:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Product delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
