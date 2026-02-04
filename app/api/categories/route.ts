import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        *,
        products (
          id,
          stock (
            quantity
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calculate stats for each category
    const categoriesWithStats = categories.map((category: any) => {
      const productCount = category.products?.length || 0
      
      const totalStock = category.products?.reduce((sum: number, product: any) => {
        const productStock = product.stock?.reduce((pSum: number, s: any) => pSum + Number(s.quantity), 0) || 0
        return sum + productStock
      }, 0) || 0

      // Remove the heavy products data from the response
      const { products, ...categoryData } = category
      
      return {
        ...categoryData,
        product_count: productCount,
        total_stock: totalStock
      }
    })

    return NextResponse.json(categoriesWithStats)
  } catch (error: any) {
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

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        ...cleanData,
        tenant_id: profile.tenant_id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(category)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
