import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PATCHABLE = [
  'name',
  'tax_office',
  'tax_number',
  'address',
  'phone',
  'email',
  'website',
  'mersis_no',
  'trade_registry_no',
] as const

function normalizeOptionalString(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length ? s : null
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' || !profile.tenant_id) {
      return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 403 })
    }

    const body = await request.json() as Record<string, unknown>
    const payload: Record<string, string | null> = {}

    for (const key of PATCHABLE) {
      if (!(key in body)) continue
      const raw = body[key]
      if (key === 'name') {
        const name = normalizeOptionalString(raw)
        if (!name) {
          return NextResponse.json({ error: 'Firma adı boş olamaz' }, { status: 400 })
        }
        payload.name = name
        continue
      }
      payload[key] = normalizeOptionalString(raw)
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })
    }

    if (payload.name != null) {
      payload.legal_title = payload.name
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .update(payload)
      .eq('id', profile.tenant_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(tenant)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Güncelleme başarısız'
    console.error('PATCH /api/tenant:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
