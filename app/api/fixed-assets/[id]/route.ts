import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { data: asset, error } = await supabase
      .from('fixed_assets')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (error) throw error
    if (!asset) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

    return NextResponse.json({ asset })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { data: existing } = await supabase
      .from('fixed_assets')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.name != null) {
      const name = String(body.name).trim()
      if (!name) return NextResponse.json({ error: 'Demirbaş adı zorunludur' }, { status: 400 })
      updates.name = name
    }
    if (body.description !== undefined) {
      updates.description =
        body.description != null && String(body.description).trim() !== '' ? String(body.description).trim() : null
    }
    if (body.serial_no !== undefined) {
      updates.serial_no =
        body.serial_no != null && String(body.serial_no).trim() !== '' ? String(body.serial_no).trim() : null
    }
    if (body.purchase_date !== undefined) {
      updates.purchase_date =
        body.purchase_date && String(body.purchase_date).trim() !== ''
          ? String(body.purchase_date).slice(0, 10)
          : null
    }
    if (body.price !== undefined) {
      if (body.price === null || String(body.price).trim() === '') {
        updates.price = null
      } else {
        const p = parseFloat(String(body.price).replace(',', '.'))
        if (Number.isNaN(p) || p < 0) {
          return NextResponse.json({ error: 'Geçerli fiyat girin' }, { status: 400 })
        }
        updates.price = p
      }
    }
    if (body.currency != null) updates.currency = String(body.currency)
    if (body.notes !== undefined) {
      updates.notes =
        body.notes != null && String(body.notes).trim() !== '' ? String(body.notes).trim() : null
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('fixed_assets')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { error } = await supabase.from('fixed_assets').delete().eq('id', id).eq('tenant_id', profile.tenant_id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
