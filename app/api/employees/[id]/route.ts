import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Çalışan bulunamadı' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const updates = {
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
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Çalışan bulunamadı' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
