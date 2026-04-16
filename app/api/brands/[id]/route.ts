import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const body = await request.json()
    const name = String(body.name ?? '').trim()
    if (!name) throw new Error('Marka adı gerekli')

    const { data: row, error } = await supabase
      .from('brand_definitions')
      .update({ name })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(row)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data: brandRow, error: brandError } = await supabase
      .from('brand_definitions')
      .select('id, name')
      .eq('id', id)
      .single()

    if (brandError) throw brandError

    const brandName = String(brandRow.name ?? '').trim()

    if (brandName) {
      const { error: clearProductsError } = await supabase
        .from('products')
        .update({ brand: null })
        .eq('brand', brandName)

      if (clearProductsError) throw clearProductsError
    }

    const { error: deleteError } = await supabase
      .from('brand_definitions')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
