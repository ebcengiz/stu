import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
// @ts-ignore
import { v4 as uuidv4 } from 'uuid'
// @ts-ignore


export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Yetki kontrolü
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // 2. Form verisini al
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Dosya türü ve boyutu kontrolü (Örn: Maks 5MB)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Sadece resim dosyaları yüklenebilir.' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Dosya boyutu 5MB\'dan küçük olmalıdır.' }, { status: 400 })
    }

    // 3. Dosyayı Supabase Storage'a yükle
    const fileExtension = file.name.split('.').pop()
    const fileName = `${profile.tenant_id}/${uuidv4()}.${fileExtension}`

    // Dosya buffer'a çevrilmeli
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('logos') // 'logos' adında bir bucket olmalı
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error details:', uploadError)
      return NextResponse.json({ 
        error: `Depolama hatası: ${uploadError.message}`,
        details: uploadError
      }, { status: 500 })
    }

    // 4. Public URL'i al
    const { data: publicUrlData } = supabase
      .storage
      .from('logos')
      .getPublicUrl(fileName)

    if (!publicUrlData.publicUrl) {
      throw new Error('Public URL oluşturulamadı')
    }

    return NextResponse.json({ url: publicUrlData.publicUrl })
    
  } catch (error: any) {
    console.error('Upload API General Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Dosya yüklenirken bir hata oluştu',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
