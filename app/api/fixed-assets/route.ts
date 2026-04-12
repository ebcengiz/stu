import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { data, error } = await supabase
      .from('fixed_assets')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('name', { ascending: true })

    if (error) throw error
    return NextResponse.json({ assets: data ?? [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const body = await request.json()
    const name = String(body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Demirbaş adı zorunludur' }, { status: 400 })

    const description =
      body.description != null && String(body.description).trim() !== '' ? String(body.description).trim() : null
    const serial_no =
      body.serial_no != null && String(body.serial_no).trim() !== '' ? String(body.serial_no).trim() : null
    const purchase_date =
      body.purchase_date && String(body.purchase_date).trim() !== ''
        ? String(body.purchase_date).slice(0, 10)
        : null

    let price: number | null = null
    if (body.price != null && String(body.price).trim() !== '') {
      const p = parseFloat(String(body.price).replace(',', '.'))
      if (Number.isNaN(p) || p < 0) {
        return NextResponse.json({ error: 'Geçerli fiyat girin' }, { status: 400 })
      }
      price = p
    }

    const currency = body.currency ? String(body.currency) : 'TRY'

    const notes =
      body.notes != null && String(body.notes).trim() !== '' ? String(body.notes).trim() : null

    const row = {
      tenant_id: profile.tenant_id,
      name,
      description,
      serial_no,
      purchase_date,
      price,
      currency,
      notes,
    }

    const { data, error } = await supabase.from('fixed_assets').insert(row).select('*').single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
