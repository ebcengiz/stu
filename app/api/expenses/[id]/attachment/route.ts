import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
// @ts-ignore
import { v4 as uuidv4 } from 'uuid'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
])

const MAX_BYTES = 10 * 1024 * 1024

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id

    const { data: exp, error: expErr } = await supabase
      .from('general_expenses')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (expErr) throw expErr
    if (!exp) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Dosya seçilmedi' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Yalnızca PDF veya resim (JPEG, PNG, GIF, WebP) yüklenebilir.' },
        { status: 400 }
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Dosya en fazla 10 MB olabilir.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const safeExt = /^[a-z0-9]{1,8}$/.test(ext) ? ext : 'bin'
    const path = `${tenantId}/expense-attachments/${id}/${uuidv4()}.${safeExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage.from('logos').upload(path, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

    if (uploadError) {
      console.error('expense attachment upload:', uploadError)
      return NextResponse.json({ error: `Depolama: ${uploadError.message}` }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(path)
    const publicUrl = publicUrlData?.publicUrl
    if (!publicUrl) {
      return NextResponse.json({ error: 'URL oluşturulamadı' }, { status: 500 })
    }

    const { data: row, error: upErr } = await supabase
      .from('general_expenses')
      .update({ attachment_url: publicUrl })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (upErr) throw upErr

    return NextResponse.json({ url: publicUrl, row })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Yükleme başarısız' }, { status: 500 })
  }
}
