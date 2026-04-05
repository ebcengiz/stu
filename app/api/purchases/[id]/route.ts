import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = resolvedParams.id
    const supabase = await createClient()

    const { data: purchase, error } = await supabase
      .from('purchases')
      .select(`
        *,
        suppliers (
          id,
          company_name,
          phone,
          email,
          address
        ),
        purchase_items (
          *,
          products (
            name,
            sku,
            unit
          ),
          warehouses (
            name
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json(purchase)
  } catch (error: any) {
    console.error('Fetch Purchase Detail Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = resolvedParams.id

    const supabase = await createClient()

    // Sadece Alışlar (purchases) tablosundan kaydı siler.
    // 'purchase_items' tablosu ON DELETE CASCADE ile veritabanı tarafından otomatik silinir.
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete Purchase Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
