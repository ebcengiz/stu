import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 404 })
    }

    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select(`
        *,
        supplier_transactions (
          type,
          amount
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('company_name', { ascending: true })

    if (error) throw error

    // Calculate balance for each supplier (Total Purchases - Total Payments)
    const suppliersWithBalance = (suppliers || []).map((supplier: any) => {
      const balance = (supplier.supplier_transactions || []).reduce((acc: number, tx: any) => {
        if (tx.type === 'purchase') return acc + Number(tx.amount)
        if (tx.type === 'payment') return acc - Number(tx.amount)
        return acc
      }, 0)

      const { supplier_transactions: _supplier_transactions, ...supplierData } = supplier
      return {
        ...supplierData,
        balance
      }
    })

    return NextResponse.json(suppliersWithBalance)
  } catch (error: any) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 404 })
    }

    const body = await request.json()
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert([
        {
          ...body,
          tenant_id: profile.tenant_id,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(supplier)
  } catch (error: any) {
    console.error('Error creating supplier:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
