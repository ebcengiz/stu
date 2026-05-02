import { createClient } from '@/lib/supabase/server'
import { insertProductFromBody } from '@/lib/server/insertProductFromBody'
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
      const r = await insertProductFromBody(
        supabase,
        { tenantId: profile.tenant_id, userId: user.id },
        row as Record<string, unknown>,
        { initialStockNote: 'Excel toplu içe aktarma — başlangıç stoku' }
      )
      if (r.ok) {
        results.push({ index: i + 1, ok: true, id: r.id })
      } else {
        results.push({ index: i + 1, ok: false, error: r.message })
      }
    }

    const okCount = results.filter((x) => x.ok).length
    const failCount = results.length - okCount

    return NextResponse.json({ results, okCount, failCount, total: results.length })
  } catch (error: any) {
    console.error('bulk-import products:', error)
    return NextResponse.json({ error: error.message || 'Import hatası' }, { status: 500 })
  }
}
