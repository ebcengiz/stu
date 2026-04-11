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

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('name', { ascending: true })

    if (error) throw error
    const employees = data ?? []

    const { data: cariRows, error: cariErr } = await supabase
      .from('employee_cari_transactions')
      .select('employee_id, signed_amount')
      .eq('tenant_id', profile.tenant_id)

    const balanceMap = new Map<string, number>()
    if (cariErr) {
      console.error('employee_cari_transactions list:', cariErr.message)
    } else if (cariRows) {
      for (const r of cariRows) {
        const id = r.employee_id as string
        balanceMap.set(id, (balanceMap.get(id) ?? 0) + Number(r.signed_amount))
      }
    }

    const enriched = employees.map((e: { id: string }) => ({
      ...e,
      cari_balance: balanceMap.get(e.id) ?? 0,
    }))

    return NextResponse.json(enriched)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const body = await request.json()
    const name = String(body.name ?? '').trim()
    if (!name) {
      return NextResponse.json({ error: 'İsim zorunludur' }, { status: 400 })
    }

    const row = {
      tenant_id: profile.tenant_id,
      name,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      photo_url: body.photo_url?.trim() || null,
      currency: body.currency || 'TRY',
      hire_date: body.hire_date || null,
      leave_date: body.leave_date || null,
      birth_date: body.birth_date || null,
      national_id: body.national_id?.trim() || null,
      monthly_net_salary:
        body.monthly_net_salary != null && body.monthly_net_salary !== ''
          ? Number(body.monthly_net_salary)
          : null,
      bank_account_no: body.bank_account_no?.trim() || null,
      department: body.department?.trim() || null,
      address: body.address?.trim() || null,
      bank_details: body.bank_details?.trim() || null,
      notes: body.notes?.trim() || null,
    }

    const { data, error } = await supabase.from('employees').insert(row).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
