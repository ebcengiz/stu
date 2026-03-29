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
    if (!user) {
      return NextResponse.json({ error: 'Oturum açılmamış' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 404 })
    }

    // Prepare clean data
    const insertData = {
      name: body.name?.trim(),
      description: body.description?.trim() || null,
      tenant_id: profile.tenant_id
    }

    if (!insertData.name) {
      return NextResponse.json({ error: 'Kategori adı gereklidir' }, { status: 400 })
    }

    // Try to insert
    const { data: category, error: dbError } = await supabase
      .from('categories')
      .insert(insertData)
      .select()
      .maybeSingle()

    if (dbError) {
      console.error('Supabase category insert error:', dbError)
      // Provide more specific error message if possible
      let errorMessage = `Veritabanı hatası: ${dbError.message}`
      if (dbError.code === '23505') errorMessage = 'Bu isimde bir kategori zaten mevcut.'
      if (dbError.code === '42501') errorMessage = 'Bu işlemi yapmaya yetkiniz yok (RLS Politikası).'
      
      return NextResponse.json({ error: errorMessage, details: dbError }, { status: 500 })
    }

    if (!category) {
      return NextResponse.json({ error: 'Kategori oluşturuldu ancak veri geri alınamadı.' }, { status: 500 })
    }

    return NextResponse.json(category)
  } catch (error: any) {
    console.error('Category POST API General Error:', error)
    return NextResponse.json(
      { error: error.message || 'Kategori eklenirken beklenmedik bir hata oluştu' }, 
      { status: 500 }
    )
  }
}
