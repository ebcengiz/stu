'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Download,
  Pencil,
  X,
  FileIcon,
  FileText,
  Check,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { LOAN_DOC_ACCEPT, validateLoanDocumentFile } from '@/lib/loan-document-file'

type LoanBrief = { id: string; name: string }

type LoanDoc = {
  id: string
  file_name: string
  description: string | null
  document_date: string
  storage_path: string
  public_url: string
  created_at: string
}

function formatTrDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = String(iso).slice(0, 10)
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return '—'
  return `${day}.${m}.${y}`
}

export default function KrediDokumanlarPage() {
  const params = useParams()
  const id = String(params.id ?? '')

  const [loan, setLoan] = useState<LoanBrief | null>(null)
  const [docs, setDocs] = useState<LoanDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [modalFile, setModalFile] = useState<File | null>(null)
  const [modalDesc, setModalDesc] = useState('')
  const [modalFileInputKey, setModalFileInputKey] = useState(0)
  const [uploadSaving, setUploadSaving] = useState(false)

  const replaceFileRef = useRef<HTMLInputElement>(null)

  const [editDoc, setEditDoc] = useState<LoanDoc | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [replaceFile, setReplaceFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoadError(null)
    setLoading(true)
    try {
      const [rLoan, rDocs] = await Promise.all([
        fetch(`/api/loans/${id}`),
        fetch(`/api/loans/${id}/documents`),
      ])
      const jLoan = await rLoan.json().catch(() => ({}))
      const jDocs = await rDocs.json().catch(() => ({}))
      if (!rLoan.ok) throw new Error(jLoan.error || 'Kredi yüklenemedi')
      if (!rDocs.ok) throw new Error(jDocs.error || 'Belgeler yüklenemedi')
      setLoan(jLoan.loan ? { id: jLoan.loan.id, name: String(jLoan.loan.name ?? '') } : null)
      const list = Array.isArray(jDocs.documents) ? jDocs.documents : []
      setDocs(list)
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Yüklenemedi')
      setLoan(null)
      setDocs([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const openUploadModal = () => {
    setModalFile(null)
    setModalDesc('')
    setModalFileInputKey((k) => k + 1)
    setUploadModalOpen(true)
  }

  const resetUploadModal = () => {
    setUploadModalOpen(false)
    setModalFile(null)
    setModalDesc('')
  }

  const tryCloseUploadModal = () => {
    if (uploadSaving) return
    resetUploadModal()
  }

  const onModalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setModalFile(f)
  }

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalFile) {
      toast.error('Lütfen yüklenecek dosyayı seçin')
      return
    }
    const clientErr = validateLoanDocumentFile(modalFile)
    if (clientErr) {
      toast.error(clientErr)
      return
    }
    setUploadSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', modalFile)
      if (modalDesc.trim()) fd.append('description', modalDesc.trim())
      fd.append('document_date', new Date().toISOString().slice(0, 10))
      const res = await fetch(`/api/loans/${id}/documents`, { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi')
      toast.success('Belge yüklendi')
      resetUploadModal()
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Yüklenemedi')
    } finally {
      setUploadSaving(false)
    }
  }

  const openEdit = (d: LoanDoc) => {
    setEditDoc(d)
    setEditDesc(d.description ?? '')
    setEditDate(String(d.document_date).slice(0, 10))
    setReplaceFile(null)
  }

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editDoc) return
    if (replaceFile) {
      const err = validateLoanDocumentFile(replaceFile)
      if (err) {
        toast.error(err)
        return
      }
    }
    setEditSaving(true)
    try {
      if (replaceFile) {
        const fd = new FormData()
        fd.append('description', editDesc.trim())
        fd.append('document_date', editDate)
        fd.append('file', replaceFile)
        const res = await fetch(`/api/loans/${id}/documents/${editDoc.id}`, { method: 'PATCH', body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Güncellenemedi')
      } else {
        const res = await fetch(`/api/loans/${id}/documents/${editDoc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: editDesc.trim() || null,
            document_date: editDate,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Güncellenemedi')
      }
      toast.success('Belge güncellendi')
      setEditDoc(null)
      setReplaceFile(null)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setEditSaving(false)
    }
  }

  const confirmDelete = (d: LoanDoc) => {
    toast.custom(
      (t) => (
        <div className="pointer-events-auto max-w-sm rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
          <p className="text-sm font-semibold text-gray-900">Bu belgeyi silmek istiyor musunuz?</p>
          <p className="mt-1 truncate text-xs text-gray-500">{d.file_name}</p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              onClick={() => toast.dismiss(t.id)}
            >
              İptal
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              onClick={() => {
                toast.dismiss(t.id)
                void performDelete(d.id)
              }}
            >
              Sil
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: 'top-center' }
    )
  }

  const performDelete = async (docId: string) => {
    try {
      const res = await fetch(`/api/loans/${id}/documents/${docId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Silinemedi')
      toast.success('Belge silindi')
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  const loanTitle = (loan?.name?.trim() || 'Kredi') as string

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-6 overflow-x-hidden pb-8">
      <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-gray-900/5">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
          <Link
            href={`/dashboard/hesaplarim/krediler/${id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 text-gray-400" />
            Geri Dön
          </Link>
        </div>
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Kredi belgeleri</p>
          <h1 className="mt-1 break-words text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
            {loanTitle}
          </h1>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Yükleniyor…</p>
      ) : loadError ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm ring-1 ring-gray-900/5 sm:p-6">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 ring-1 ring-primary-100">
              <FileIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0 space-y-3 text-sm leading-relaxed text-gray-500">
              <p>
                Kullandığınız kredi ile ilgili belgeleri (sözleşme, taahhütname, sigorta…) taratıp veya
                resmini çekip buraya yükleyebilirsiniz. Dilediğiniz zaman da buradan tekrar indirebilirsiniz.
              </p>
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-gray-500">
                <span>Belge eklemek için</span>
                <button
                  type="button"
                  onClick={openUploadModal}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Yeni belge ekle
                </button>
                <span>düğmesine tıklayın.</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-end">
            <button
              type="button"
              onClick={openUploadModal}
              className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50/90 px-4 py-2.5 text-sm font-semibold text-primary-900 shadow-sm transition hover:border-primary-300 hover:bg-primary-100"
            >
              <Plus className="h-4 w-4" />
              Yeni belge ekle
            </button>
          </div>
          <div className="space-y-3">
            {docs.map((d) => (
              <div
                key={d.id}
                className="group rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm ring-1 ring-gray-900/5 transition hover:border-gray-200 hover:shadow-md sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400 transition group-hover:bg-primary-50 group-hover:text-primary-700">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="break-words font-medium leading-snug text-gray-900">{d.file_name}</p>
                      <p className="mt-1 text-sm text-gray-400">
                        {d.description?.trim() || 'Açıklama yok'}
                      </p>
                      <time className="mt-2 inline-flex text-xs font-medium tabular-nums text-gray-500">
                        {formatTrDate(d.document_date)}
                      </time>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 border-t border-gray-100 pt-3 lg:border-t-0 lg:pt-0">
                    <a
                      href={d.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50/80 px-3 py-2 text-xs font-medium text-primary-900 transition hover:bg-primary-100"
                    >
                      <Download className="h-3.5 w-3.5" />
                      İndir
                    </a>
                    <button
                      type="button"
                      onClick={() => openEdit(d)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-200 hover:bg-gray-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Güncelle
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(d)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-medium text-red-700 transition hover:border-red-200 hover:bg-red-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">{new Date().getFullYear()} © Mikro Muhasebe</p>

      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#F5F5F0]/50 p-3 backdrop-blur-[2px]"
          onClick={tryCloseUploadModal}
        >
          <div
            className="flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-2xl ring-1 ring-gray-900/10"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="loan-doc-upload-title"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-4">
              <h2 id="loan-doc-upload-title" className="text-base font-semibold text-white">
                Dosya Yükleme
              </h2>
              <button
                type="button"
                onClick={tryCloseUploadModal}
                disabled={uploadSaving}
                className="rounded-lg p-1.5 text-white/90 transition hover:bg-gray-50 disabled:opacity-50"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs leading-relaxed text-gray-500">
              Uzantısı doc, docx, xls, xlsx, pdf, jpg, gif, png, txt, webp olan dosyaları yükleyebilirsiniz. Dosya boyu
              5 MB’ı geçmemelidir.
            </div>
            <form onSubmit={submitUpload} className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white p-5">
              <div className="space-y-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                  <label className="shrink-0 pt-2 text-sm font-medium text-gray-600 sm:w-36">Yüklenecek Dosya</label>
                  <div className="min-w-0 flex-1">
                    <input
                      key={modalFileInputKey}
                      type="file"
                      onChange={onModalFileChange}
                      accept={LOAN_DOC_ACCEPT}
                      className="block w-full text-sm text-gray-800 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-gray-600 hover:file:bg-gray-200"
                    />
                    {modalFile ? (
                      <p className="mt-2 truncate text-xs text-gray-400">{modalFile.name}</p>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-600">Dosya Açıklaması</label>
                  <textarea
                    value={modalDesc}
                    onChange={(e) => setModalDesc(e.target.value)}
                    rows={4}
                    placeholder="kredi belgesi"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>
              <div className="mt-8 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  disabled={uploadSaving}
                  onClick={tryCloseUploadModal}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={uploadSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {uploadSaving ? 'Yükleniyor…' : 'Yükle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#F5F5F0]/50 p-3 backdrop-blur-[2px]"
          onClick={() => !editSaving && setEditDoc(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-2xl ring-1 ring-gray-900/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-100 bg-gray-50/90 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">Belgeyi güncelle</h3>
              <p className="mt-1 truncate text-xs text-gray-400">{editDoc.file_name}</p>
            </div>
            <form onSubmit={submitEdit} className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Açıklama</label>
                <input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Belge tarihi</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Dosyayı değiştir (isteğe bağlı)</label>
                <input
                  ref={replaceFileRef}
                  type="file"
                  accept={LOAN_DOC_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    setReplaceFile(f ?? null)
                  }}
                />
                <button
                  type="button"
                  onClick={() => replaceFileRef.current?.click()}
                  className="text-sm font-medium text-primary-700 hover:underline"
                >
                  {replaceFile ? replaceFile.name : 'Dosya seç…'}
                </button>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => {
                    setEditDoc(null)
                    setReplaceFile(null)
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {editSaving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
