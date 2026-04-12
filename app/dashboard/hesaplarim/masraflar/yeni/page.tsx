'use client'

import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Undo2, Plus, CircleHelp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import type { MasrafGroup } from '@/lib/masraf-kalemleri'
import { KDV_ORAN_OPTIONS, MASRAF_GROUPS } from '@/lib/masraf-kalemleri'
import { formatAccountBalance } from '@/lib/account-sections'
import ProjectSelect from '@/components/projects/ProjectSelect'

const PAYMENT_STATUS_OPTIONS = [
  { value: 'later', label: 'Daha sonra ödenecek' },
  { value: 'paid', label: 'Ödendi' },
  { value: 'partial', label: 'Kısmen ödendi' },
] as const

type AccountRow = {
  id: string
  name: string
  type: string
  currency: string
  balance: number
  is_active?: boolean
}

type EmployeeRow = { id: string; name: string }

const ACCOUNT_GROUPS: { title: string; match: (t: string) => boolean }[] = [
  { title: 'Kasa', match: (t) => t === 'cash' || t === 'kasa' },
  { title: 'Banka', match: (t) => t === 'bank' || t === 'banka' },
  { title: 'POS', match: (t) => t === 'pos' },
  { title: 'Kredi kartı', match: (t) => t === 'other' || t === 'kredi_karti' },
]

function YeniMasrafForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const archiveInputRef = useRef<HTMLInputElement>(null)
  const archiveFileRef = useRef<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string | null>(null)

  const [expenseItem, setExpenseItem] = useState('')
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [docNo, setDocNo] = useState('')
  const [description, setDescription] = useState('')
  const [archiveName, setArchiveName] = useState('')

  const [paymentStatus, setPaymentStatus] = useState<string>('later')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  /** boş | acc:uuid | emp:uuid */
  const [paymentSource, setPaymentSource] = useState('')
  const [amountGross, setAmountGross] = useState('')
  const [vatRate, setVatRate] = useState('0')

  const [recurring, setRecurring] = useState(false)
  const [currency, setCurrency] = useState('TRY')
  const [projectId, setProjectId] = useState('')

  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [sourcesLoading, setSourcesLoading] = useState(true)
  const [masrafGroups, setMasrafGroups] = useState<MasrafGroup[]>(MASRAF_GROUPS)

  const showPaidAccount = paymentStatus === 'paid'

  const groupedAccounts = useMemo(() => {
    const active = accounts.filter((a) => a.is_active !== false)
    const used = new Set<string>()
    const groups = ACCOUNT_GROUPS.map((g) => {
      const items = active.filter((a) => {
        const ok = g.match(String(a.type).toLowerCase())
        if (ok) used.add(a.id)
        return ok
      })
      return { title: g.title, items }
    }).filter((g) => g.items.length > 0)
    const rest = active.filter((a) => !used.has(a.id))
    if (rest.length) groups.push({ title: 'Diğer hesaplar', items: rest })
    return groups
  }, [accounts])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [ra, re, rm] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/employees'),
          fetch('/api/expense-items'),
        ])
        const ja = await ra.json().catch(() => [])
        const je = await re.json().catch(() => [])
        const jm = await rm.json().catch(() => ({}))
        if (cancelled) return
        setAccounts(Array.isArray(ja) ? ja : [])
        setEmployees(Array.isArray(je) ? je : [])
        if (rm.ok && Array.isArray(jm.groups) && jm.groups.length > 0) {
          setMasrafGroups(jm.groups)
        }
      } catch {
        if (!cancelled) {
          setAccounts([])
          setEmployees([])
        }
      } finally {
        if (!cancelled) setSourcesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!showPaidAccount && paymentSource) setPaymentSource('')
  }, [showPaidAccount, paymentSource])

  const editId = searchParams.get('edit')
  const copyFrom = searchParams.get('copyFrom')

  useEffect(() => {
    const sourceId = editId || copyFrom
    if (!sourceId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/expenses/${sourceId}`)
        const row = await res.json()
        if (!res.ok || cancelled) return
        setExpenseItem(String(row.expense_item_key ?? ''))
        setTxDate(String(row.transaction_date ?? '').slice(0, 10) || txDate)
        setDocNo(row.doc_no ?? '')
        setDescription(row.description ?? '')
        setPaymentStatus(String(row.payment_status ?? 'later'))
        setPaymentDate(String(row.payment_date ?? '').slice(0, 10) || paymentDate)
        setAmountGross(
          row.amount_gross != null ? String(row.amount_gross).replace('.', ',') : ''
        )
        setVatRate(row.vat_rate != null && row.vat_rate !== '' ? String(row.vat_rate) : '0')
        setRecurring(Boolean(row.recurring))
        setCurrency(String(row.currency || 'TRY'))
        if (row.payment_account_id) setPaymentSource(`acc:${row.payment_account_id}`)
        else if (row.payment_employee_id) setPaymentSource(`emp:${row.payment_employee_id}`)
        else setPaymentSource('')
        setExistingAttachmentUrl(row.attachment_url ? String(row.attachment_url) : null)
        setProjectId(row.project_id ? String(row.project_id) : '')
        setArchiveName('')
        archiveFileRef.current = null
        if (editId) {
          toast.success('Masraf kaydı yüklendi')
        } else {
          toast.success('Kayıt kopyalandı; düzenleyip kaydedebilirsiniz')
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only for copy/edit
  }, [editId, copyFrom])

  const handleArchive = (f: File | null) => {
    archiveFileRef.current = f
    setArchiveName(f?.name ?? '')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseItem.trim()) {
      toast.error('Masraf kalemi seçin')
      return
    }
    const amt = parseFloat(String(amountGross).replace(',', '.'))
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error('Geçerli bir tutar girin')
      return
    }
    if (showPaidAccount) {
      if (!paymentSource || (!paymentSource.startsWith('acc:') && !paymentSource.startsWith('emp:'))) {
        toast.error('Ödemeyi yaptığınız hesabı seçin')
        return
      }
    }

    let payment_account_id: string | null = null
    let payment_employee_id: string | null = null
    if (showPaidAccount && paymentSource.startsWith('acc:')) payment_account_id = paymentSource.slice(4)
    if (showPaidAccount && paymentSource.startsWith('emp:')) payment_employee_id = paymentSource.slice(4)

    const payload = {
      expense_item_key: expenseItem,
      transaction_date: txDate,
      doc_no: docNo || null,
      description: description || null,
      payment_status: paymentStatus,
      payment_date: paymentDate || null,
      amount_gross: amt,
      vat_rate: vatRate,
      recurring,
      currency,
      payment_account_id,
      payment_employee_id,
      project_id: projectId || null,
    }

    setSaving(true)
    try {
      const isEdit = Boolean(editId)
      const res = await fetch(isEdit ? `/api/expenses/${editId}` : '/api/expenses', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')

      const expenseId = isEdit ? editId! : (data.id as string)
      const file = archiveFileRef.current
      if (file && expenseId) {
        const fd = new FormData()
        fd.append('file', file)
        const up = await fetch(`/api/expenses/${expenseId}/attachment`, { method: 'POST', body: fd })
        const upJson = await up.json().catch(() => ({}))
        if (!up.ok) throw new Error(upJson.error || 'Belge yüklenemedi')
        setExistingAttachmentUrl(typeof upJson.url === 'string' ? upJson.url : null)
      }

      toast.success(isEdit ? 'Masraf güncellendi' : 'Masraf kaydı oluşturuldu')
      router.push('/dashboard/hesaplarim/masraflar')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-4">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {editId ? 'Masraf düzenle' : 'Yeni masraf'}
          </h1>
          <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={saving || (showPaidAccount && sourcesLoading)}
            className="gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            <Check className="h-4 w-4" />
            {editId ? 'Güncelle' : 'Kaydet'}
          </Button>
          <Link
            href="/dashboard/hesaplarim/masraflar"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Undo2 className="h-4 w-4" />
            Geri Dön
          </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          {/* HESAP KALEMİ */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
            <div className="bg-blue-700 px-3 py-2 text-xs font-black uppercase tracking-wide text-white">
              Hesap kalemi
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Masraf kalemi</label>
                <select
                  required
                  value={expenseItem}
                  onChange={(e) => setExpenseItem(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Masraf kalemi seçin</option>
                  {masrafGroups.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <Link
                  href="/dashboard/hesaplarim/masraflar/kalemleri"
                  className="mt-1 inline-block text-xs font-medium text-emerald-600 hover:text-emerald-800 hover:underline"
                >
                  listeyi düzenlemek için tıklayın
                </Link>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">İşlem tarihi</label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Fiş/Belge no</label>
                <input
                  type="text"
                  value={docNo}
                  onChange={(e) => setDocNo(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="İsteğe bağlı"
                />
                <p className="mt-0.5 text-xs text-gray-500">(isteğe bağlı)</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Açıklama</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder=""
                />
              </div>

              <ProjectSelect
                includeInactive
                value={projectId}
                onChange={setProjectId}
                className="[&_label]:text-xs [&_label]:font-semibold [&_label]:text-gray-600"
              />

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Arşiv</p>
                <input
                  ref={archiveInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,application/pdf,image/*"
                  onChange={(e) => handleArchive(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => archiveInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <Plus className="h-4 w-4" />
                  Arşiv belgesi yükle
                </button>
                {existingAttachmentUrl && !archiveName ? (
                  <p className="mt-1.5 text-xs">
                    <a
                      href={existingAttachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-emerald-700 underline hover:text-emerald-900"
                    >
                      Mevcut belgeyi aç
                    </a>
                  </p>
                ) : null}
                {archiveName ? (
                  <p className="mt-1.5 text-xs text-gray-600">Seçilen: {archiveName}</p>
                ) : !existingAttachmentUrl ? (
                  <p className="mt-1.5 text-xs text-gray-500">
                    Masraf ile ilgili belge varsa ekleyebilirsiniz
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* TUTAR */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
            <div className="bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white">
              Tutar
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Ödeme durumu</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  {PAYMENT_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Ödeme tarihi</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {showPaidAccount ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-800">
                    Kasa / hesap
                  </label>
                  <p className="mb-1 text-xs text-gray-500">Ödemeyi yaptığınız hesabı seçin</p>
                  <select
                    required={showPaidAccount}
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value)}
                    disabled={sourcesLoading}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                  >
                    <option value="">{sourcesLoading ? 'Yükleniyor…' : 'Hesap seçin'}</option>
                    {groupedAccounts.map((g) => (
                      <optgroup key={g.title} label={g.title}>
                        {g.items.map((a) => (
                          <option key={a.id} value={`acc:${a.id}`}>
                            {a.name} ({formatAccountBalance(a.currency, Number(a.balance))})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {employees.length > 0 ? (
                      <optgroup label="Çalışanlar">
                        {employees.map((em) => (
                          <option key={em.id} value={`emp:${em.id}`}>
                            {em.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs font-black text-gray-800">Tutar (KDV dahil)</label>
                <div className="flex overflow-hidden rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-emerald-500/30">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountGross}
                    onChange={(e) => setAmountGross(e.target.value)}
                    className="min-w-0 flex-1 border-0 px-3 py-2 text-sm font-semibold text-gray-900 outline-none"
                    placeholder="0,00"
                  />
                  <span className="flex shrink-0 items-center border-l border-gray-200 bg-gray-50 px-3 text-sm font-bold text-gray-700">
                    ₺
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">KDV oranı (%)</label>
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  {KDV_ORAN_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                <p className="mt-0.5 text-xs text-gray-500">isteğe bağlı</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Tekrarlayan masraf kaydı oluştur
          </label>
          <span
            className="inline-flex text-gray-400"
            title="Belirli aralıklarla otomatik oluşacak masraf için kullanılır."
          >
            <CircleHelp className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </form>

      <p className="text-xs text-slate-400">{new Date().getFullYear()} © Mikro Muhasebe</p>
    </div>
  )
}

export default function YeniMasrafPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-sm text-slate-500">Yükleniyor…</div>}>
      <YeniMasrafForm />
    </Suspense>
  )
}
