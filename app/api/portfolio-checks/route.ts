import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const STATUS_TAB: Record<string, string | null> = {
  all: null,
  portfolio: 'portfolio',
  to_supplier: 'to_supplier',
  to_bank: 'to_bank',
  paid: 'paid',
  bounced: 'bounced',
  cancelled: 'cancelled',
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'all'
    const statusFilter = STATUS_TAB[tab] ?? null

    let q = supabase
      .from('portfolio_checks')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('due_date', { ascending: true })

    if (statusFilter) {
      q = q.eq('status', statusFilter)
    }

    const { data, error } = await q
    if (error) throw error

    return NextResponse.json({ checks: data ?? [] })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
