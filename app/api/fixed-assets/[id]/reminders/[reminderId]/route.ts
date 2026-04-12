import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; reminderId: string }> }
) {
  try {
    const { id: assetId, reminderId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id

    const { data: existing, error: exErr } = await supabase
      .from('fixed_asset_reminders')
      .select('id')
      .eq('id', reminderId)
      .eq('fixed_asset_id', assetId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (exErr) throw exErr
    if (!existing) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.reminder_date != null && String(body.reminder_date).trim() !== '') {
      updates.reminder_date = String(body.reminder_date).slice(0, 10)
    }
    if (body.description !== undefined) {
      updates.description =
        body.description != null && String(body.description).trim() !== '' ? String(body.description).trim() : null
    }
    if (body.sms_send_hour !== undefined) {
      if (body.sms_send_hour === null || String(body.sms_send_hour) === '') {
        updates.sms_send_hour = null
      } else {
        const h = parseInt(String(body.sms_send_hour), 10)
        if (Number.isNaN(h) || h < 0 || h > 23) {
          return NextResponse.json({ error: 'Geçerli saat (0–23)' }, { status: 400 })
        }
        updates.sms_send_hour = h
      }
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('fixed_asset_reminders')
      .update(updates)
      .eq('id', reminderId)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; reminderId: string }> }
) {
  try {
    const { id: assetId, reminderId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { error } = await supabase
      .from('fixed_asset_reminders')
      .delete()
      .eq('id', reminderId)
      .eq('fixed_asset_id', assetId)
      .eq('tenant_id', profile.tenant_id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
