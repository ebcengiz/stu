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

    const { data: sale, error } = await supabase
      .from('sales')
      .select(`
        *,
        customers (
          id,
          company_name,
          phone,
          email,
          address
        ),
        sale_items (
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

    return NextResponse.json(sale)
  } catch (error: any) {
    console.error('Fetch Sale Detail Error:', error)
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

    // Sadece Satışlar (sales) tablosundan kaydı siler.
    // 'sale_items' tablosu ON DELETE CASCADE ile veritabanı tarafından otomatik silinir.
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete Sale Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
