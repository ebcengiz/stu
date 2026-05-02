import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_ITEMS = 400

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await request.json()
    const items = body?.items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items dizisi gerekli' }, { status: 400 })
    }
    if (items.length > MAX_ITEMS) {
      return NextResponse.json({ error: `En fazla ${MAX_ITEMS} satır` }, { status: 400 })
    }

    const results: { index: number; ok: boolean; id?: string; error?: string }[] = []

    for (let i = 0; i < items.length; i++) {
      const row = items[i]
      if (!row || typeof row !== 'object') {
        results.push({ index: i + 1, ok: false, error: 'Geçersiz satır' })
        continue
      }
      const cleanData = Object.fromEntries(
        Object.entries(row as Record<string, unknown>).filter(([_, v]) => v !== undefined && v !== '')
      )
      if (!cleanData.company_name || String(cleanData.company_name).trim() === '') {
        results.push({ index: i + 1, ok: false, error: 'Firma adı gerekli' })
        continue
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          ...cleanData,
          tenant_id: profile.tenant_id,
        })
        .select('id')
        .single()

      if (error) {
        results.push({ index: i + 1, ok: false, error: error.message })
      } else {
        results.push({ index: i + 1, ok: true, id: customer.id })
      }
    }

    const okCount = results.filter((x) => x.ok).length
    const failCount = results.length - okCount

    return NextResponse.json({ results, okCount, failCount, total: results.length })
  } catch (error: any) {
    console.error('bulk-import customers:', error)
    return NextResponse.json({ error: error.message || 'Import hatası' }, { status: 500 })
  }
}
