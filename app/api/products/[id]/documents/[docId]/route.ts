import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { contentTypeForLoanDocument, validateLoanDocumentFile } from '@/lib/loan-document-file'

function publicUrlForPath(supabase: Awaited<ReturnType<typeof createClient>>, path: string) {
  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return data?.publicUrl ?? ''
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: productId, docId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id

    const { data: existing, error: exErr } = await supabase
      .from('product_documents')
      .select('*')
      .eq('id', docId)
      .eq('product_id', productId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (exErr) throw exErr
    if (!existing) return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 })

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const description =
        formData.has('description') ? String(formData.get('description') ?? '').trim() || null : existing.description
      const document_date =
        formData.has('document_date') && String(formData.get('document_date') ?? '').trim() !== ''
          ? String(formData.get('document_date')).slice(0, 10)
          : existing.document_date

      const file = formData.get('file') as File | null
      let storage_path = existing.storage_path as string
      let file_name = existing.file_name as string

      if (file && file instanceof Blob && file.size > 0) {
        const invalid = validateLoanDocumentFile(file as File)
        if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
        const safeExt = /^[a-z0-9]{1,8}$/.test(ext) ? ext : 'bin'
        const newPath = `${tenantId}/product-documents/${productId}/${uuidv4()}.${safeExt}`
        const buffer = new Uint8Array(await file.arrayBuffer())
        const { error: upErr } = await supabase.storage.from('logos').upload(newPath, buffer, {
          contentType: contentTypeForLoanDocument(file as File),
          cacheControl: '3600',
          upsert: false,
        })
        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
        await supabase.storage.from('logos').remove([storage_path])
        storage_path = newPath
        file_name = file.name?.trim() || file_name
      }

      const { data: row, error: uErr } = await supabase
        .from('product_documents')
        .update({
          description,
          document_date,
          storage_path,
          file_name,
        })
        .eq('id', docId)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (uErr) throw uErr
      return NextResponse.json({ ...row, public_url: publicUrlForPath(supabase, storage_path) })
    }

    const body = await request.json().catch(() => ({}))
    const updates: Record<string, unknown> = {}
    if (body.description !== undefined) {
      updates.description =
        body.description != null && String(body.description).trim() !== '' ? String(body.description).trim() : null
    }
    if (body.document_date !== undefined) {
      updates.document_date =
        body.document_date && String(body.document_date).trim() !== ''
          ? String(body.document_date).slice(0, 10)
          : existing.document_date
    }

    const { data: row, error: uErr } = await supabase
      .from('product_documents')
      .update(updates)
      .eq('id', docId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (uErr) throw uErr
    return NextResponse.json({
      ...row,
      public_url: publicUrlForPath(supabase, row.storage_path as string),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Güncellenemedi'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: productId, docId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { data: existing, error: exErr } = await supabase
      .from('product_documents')
      .select('storage_path')
      .eq('id', docId)
      .eq('product_id', productId)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (exErr) throw exErr
    if (!existing) return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 })

    const path = existing.storage_path as string
    await supabase.storage.from('logos').remove([path])

    const { error: delErr } = await supabase
      .from('product_documents')
      .delete()
      .eq('id', docId)
      .eq('tenant_id', profile.tenant_id)
    if (delErr) throw delErr

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Silinemedi'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
