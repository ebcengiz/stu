import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // category1 or category2
    const entityType = searchParams.get('entityType') || 'customer'

    const supabase = await createClient()

    let query = supabase.from('customer_tags').select('*').eq('entity_type', entityType)
    if (type) {
      query = query.eq('type', type)
    }

    const { data: tags, error } = await query.order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json(tags)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const entityType = body.entityType || 'customer'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    const { data: tag, error } = await supabase
      .from('customer_tags')
      .insert({
        tenant_id: profile.tenant_id,
        name: body.name.trim(),
        type: body.type,
        entity_type: entityType
      })
      .select()
      .maybeSingle()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        // Already exists, just return existing one
        const { data: existing } = await supabase
          .from('customer_tags')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .eq('name', body.name.trim())
          .eq('type', body.type)
          .eq('entity_type', entityType)
          .single()
        return NextResponse.json(existing)
      }
      throw error
    }

    return NextResponse.json(tag)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
