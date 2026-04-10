import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        customers (company_name),
        offer_items (
          *,
          products (name, unit)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()

  try {
    const { items, ...offerData } = body

    // 1. Update offer
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .update({
        ...offerData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (offerError) throw offerError

    // 2. Update offer items if provided
    if (items) {
      // First delete existing items
      const { error: deleteError } = await supabase
        .from('offer_items')
        .delete()
        .eq('offer_id', id)

      if (deleteError) throw deleteError

      // Then insert new items
      if (items.length > 0) {
        const offerItems = items.map((item: any) => ({
          offer_id: id,
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

        if (itemsError) throw itemsError
      }
    }

    return NextResponse.json(offer)
  } catch (error: any) {
    console.error('Offer PUT error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ message: 'Offer deleted successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
