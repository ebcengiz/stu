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

    // Convert empty strings to null for nullable fields
    const cleanData: any = {}
    for (const [key, value] of Object.entries(body)) {
      if (value === '' || value === undefined) {
        if (['description'].includes(key)) {
          cleanData[key] = null
        }
      } else {
        cleanData[key] = value
      }
    }

    const { data: category, error } = await supabase
      .from('categories')
      .update(cleanData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Category update error:', error)
      throw error
    }

    return NextResponse.json(category)
  } catch (error: any) {
    console.error('Category update error:', error)
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
      .from('categories')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Category delete error:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Category delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
