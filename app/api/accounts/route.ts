import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const { error: rpcErr } = await supabase.rpc('ensure_default_accounts', {
      p_tenant_id: profile.tenant_id,
    })
    if (rpcErr) console.error('ensure_default_accounts:', rpcErr)

    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .order('type', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json(accounts ?? [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { name, type, currency, bank_name, iban, balance, credit_limit } = body

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { data: row, error } = await supabase
      .from('accounts')
      .insert({
        tenant_id: profile.tenant_id,
        name: name?.trim(),
        type: type || 'bank',
        currency: currency || 'TRY',
        bank_name: bank_name || null,
        iban: iban || null,
        balance: Number(balance) || 0,
        credit_limit: credit_limit != null ? Number(credit_limit) : null,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(row)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
