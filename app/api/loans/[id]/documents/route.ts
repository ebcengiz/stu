import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { contentTypeForLoanDocument, validateLoanDocumentFile } from '@/lib/loan-document-file'

function publicUrlForPath(supabase: Awaited<ReturnType<typeof createClient>>, path: string) {
  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return data?.publicUrl ?? ''
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: loanId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { data: loan } = await supabase
      .from('loans')
      .select('id')
      .eq('id', loanId)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (!loan) return NextResponse.json({ error: 'Kredi bulunamadı' }, { status: 404 })

    const { data: rows, error } = await supabase
      .from('loan_documents')
      .select('*')
      .eq('loan_id', loanId)
      .eq('tenant_id', profile.tenant_id)
      .order('document_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    const list = (rows ?? []).map((r) => ({
      ...r,
      public_url: publicUrlForPath(supabase, r.storage_path as string),
    }))

    return NextResponse.json({ documents: list })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Sunucu hatası'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: loanId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id

    const { data: loan } = await supabase
      .from('loans')
      .select('id')
      .eq('id', loanId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!loan) return NextResponse.json({ error: 'Kredi bulunamadı' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Dosya seçilmedi' }, { status: 400 })
    }

    const invalid = validateLoanDocumentFile(file)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

    const description =
      formData.get('description') != null ? String(formData.get('description')).trim() || null : null
    const document_date_raw = formData.get('document_date')
    const document_date =
      document_date_raw && String(document_date_raw).trim() !== ''
        ? String(document_date_raw).slice(0, 10)
        : new Date().toISOString().slice(0, 10)

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const safeExt = /^[a-z0-9]{1,8}$/.test(ext) ? ext : 'bin'
    const path = `${tenantId}/loan-documents/${loanId}/${uuidv4()}.${safeExt}`

    const buffer = new Uint8Array(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage.from('logos').upload(path, buffer, {
      contentType: contentTypeForLoanDocument(file),
      cacheControl: '3600',
      upsert: false,
    })

    if (uploadError) {
      console.error('loan document upload:', uploadError)
      return NextResponse.json({ error: `Depolama: ${uploadError.message}` }, { status: 500 })
    }

    const file_name = file.name?.trim() || `belge.${safeExt}`

    const { data: row, error: insErr } = await supabase
      .from('loan_documents')
      .insert({
        tenant_id: tenantId,
        loan_id: loanId,
        storage_path: path,
        file_name,
        description,
        document_date,
      })
      .select()
      .single()

    if (insErr) {
      await supabase.storage.from('logos').remove([path])
      throw insErr
    }

    return NextResponse.json({
      ...row,
      public_url: publicUrlForPath(supabase, path),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Yükleme başarısız'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
