import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function assertAsset(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string, assetId: string) {
  const { data } = await supabase
    .from('fixed_assets')
    .select('id')
    .eq('id', assetId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return Boolean(data)
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: assetId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    if (!(await assertAsset(supabase, profile.tenant_id, assetId))) {
      return NextResponse.json({ error: 'Demirbaş bulunamadı' }, { status: 404 })
    }

    const { data: rows, error } = await supabase
      .from('fixed_asset_reminders')
      .select('*')
      .eq('fixed_asset_id', assetId)
      .eq('tenant_id', profile.tenant_id)
      .order('reminder_date', { ascending: true })

    if (error) throw error
    return NextResponse.json({ reminders: rows ?? [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: assetId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id
    if (!(await assertAsset(supabase, tenantId, assetId))) {
      return NextResponse.json({ error: 'Demirbaş bulunamadı' }, { status: 404 })
    }

    const body = await request.json()
    const reminder_date =
      body.reminder_date && String(body.reminder_date).trim() !== ''
        ? String(body.reminder_date).slice(0, 10)
        : null
    if (!reminder_date) {
      return NextResponse.json({ error: 'Tarih zorunludur' }, { status: 400 })
    }

    const description =
      body.description != null && String(body.description).trim() !== '' ? String(body.description).trim() : null

    let sms_send_hour: number | null = null
    if (body.sms_send_hour !== undefined && body.sms_send_hour !== null && String(body.sms_send_hour) !== '') {
      const h = parseInt(String(body.sms_send_hour), 10)
      if (Number.isNaN(h) || h < 0 || h > 23) {
        return NextResponse.json({ error: 'Geçerli saat (0–23) veya SMS yok' }, { status: 400 })
      }
      sms_send_hour = h
    }

    const { data, error } = await supabase
      .from('fixed_asset_reminders')
      .insert({
        tenant_id: tenantId,
        fixed_asset_id: assetId,
        reminder_date,
        description,
        sms_send_hour,
      })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
