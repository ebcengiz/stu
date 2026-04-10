import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: any }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams.id
    const newName = body.name.trim()

    if (!id) throw new Error('ID bulunamadı')

    // 1. Önce eski etiketin bilgilerini alalım (eski adını, türünü ve kime ait olduğunu öğrenmek için)
    const { data: oldTag, error: fetchError } = await supabase
      .from('customer_tags')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // 2. Etiketi güncelleyelim
    const { data: updatedTag, error: updateError } = await supabase
      .from('customer_tags')
      .update({ name: newName })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // 3. Etiketi kullanan tüm müşteri/tedarikçileri otomatik güncelleyelim
    if (oldTag && oldTag.name !== newName) {
      const tableName = oldTag.entity_type === 'supplier' ? 'suppliers' : 'customers'
      const columnName = oldTag.type // 'category1' veya 'category2'

      await (supabase as unknown as {
        from: (t: string) => {
          update: (r: Record<string, unknown>) => { eq: (a: string, b: string) => PromiseLike<unknown> }
        }
      })
        .from(tableName)
        .update({ [columnName]: newName })
        .eq(columnName, oldTag.name)
    }

    return NextResponse.json(updatedTag)
  } catch (error: any) {
    console.error('PATCH Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: any }
) {
  try {
    const supabase = await createClient()
    
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams.id

    if (!id) throw new Error('ID bulunamadı')

    // 1. Silinmeden önce etiketin bilgilerini alalım
    const { data: oldTag, error: fetchError } = await supabase
      .from('customer_tags')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

    // 2. Etiketi silelim
    const { error: deleteError } = await supabase
      .from('customer_tags')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    // 3. Eğer etiket bulunduysa, o etiketi kullanan müşteri/tedarikçilerden bu etiketi temizleyelim (null yapalım)
    if (oldTag) {
      const tableName = oldTag.entity_type === 'supplier' ? 'suppliers' : 'customers'
      const columnName = oldTag.type

      await (supabase as unknown as {
        from: (t: string) => {
          update: (r: Record<string, unknown>) => { eq: (a: string, b: string) => PromiseLike<unknown> }
        }
      })
        .from(tableName)
        .update({ [columnName]: null })
        .eq(columnName, oldTag.name)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
