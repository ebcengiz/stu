import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        *,
        customer_transactions (
          type,
          amount
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calculate balance for each customer
    const customersWithBalance = customers.map((customer: any) => {
      const balance = (customer.customer_transactions || []).reduce((acc: number, tx: any) => {
        // Borç artırır: satış / fatura / uygun bakiye düzeltmesi; tahsilat düşer
        if (tx.type === 'sale' || tx.type === 'invoice') return acc + Number(tx.amount)
        if (tx.type === 'payment') return acc - Number(tx.amount)
        if (tx.type === 'balance_fix' && String(tx.description || '').includes('BORÇ')) {
          return acc + Number(tx.amount)
        }
        if (tx.type === 'balance_fix') return acc - Number(tx.amount)
        return acc
      }, 0)

      const { customer_transactions: _customer_transactions, ...customerData } = customer
      return {
        ...customerData,
        balance
      }
    })

    return NextResponse.json(customersWithBalance)
  } catch (error: any) {
    console.error('Customer fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    // Remove undefined values and empty strings from insert data
    const cleanData = Object.fromEntries(
      Object.entries(body).filter(([_, v]) => v !== undefined && v !== '')
    )

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        ...cleanData,
        tenant_id: profile.tenant_id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(customer)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
