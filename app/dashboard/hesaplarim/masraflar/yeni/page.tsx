'use client'

import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Undo2, Plus, CircleHelp, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import type { MasrafGroup } from '@/lib/masraf-kalemleri'
import { KDV_ORAN_OPTIONS, MASRAF_GROUPS } from '@/lib/masraf-kalemleri'
import {
  formatPaymentAccountOptionLabel,
  groupPaymentAccounts,
  isDisbursementAccountType,
} from '@/lib/payment-account-options'
import ProjectSelect from '@/components/projects/ProjectSelect'
import TrNumberInput from '@/components/ui/TrNumberInput'
import { looseToTrInputString, parseTrNumberInput } from '@/lib/tr-number-input'

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
  const [recurrenceStart, setRecurrenceStart] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [recurrenceEnd, setRecurrenceEnd] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 3)
    return d.toISOString().slice(0, 10)
  })
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<
    'daily' | 'weekly' | 'monthly' | 'yearly'
  >('monthly')
  const [recurrenceDay, setRecurrenceDay] = useState<string>(() =>
    String(new Date().getDate())
  )
  const [recurrenceModalOpen, setRecurrenceModalOpen] = useState(false)
  const [currency, setCurrency] = useState('TRY')
  const [projectId, setProjectId] = useState('')

  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [sourcesLoading, setSourcesLoading] = useState(true)
  const [masrafGroups, setMasrafGroups] = useState<MasrafGroup[]>(MASRAF_GROUPS)

  const showPaidAccount = paymentStatus === 'paid'

  const groupedAccounts = useMemo(() => {
    return groupPaymentAccounts(accounts.filter((a) => isDisbursementAccountType(a.type)))
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
        setAmountGross(looseToTrInputString(row.amount_gross))
        setVatRate(row.vat_rate != null && row.vat_rate !== '' ? String(row.vat_rate) : '0')
        setRecurring(Boolean(row.recurring))
        if (row.recurrence && typeof row.recurrence === 'object') {
          const r = row.recurrence as {
            start_date?: string | null
            end_date?: string | null
            frequency?: string | null
            day?: string | number | null
          }
          if (r.start_date) setRecurrenceStart(String(r.start_date).slice(0, 10))
          if (r.end_date) setRecurrenceEnd(String(r.end_date).slice(0, 10))
          if (r.frequency && ['daily', 'weekly', 'monthly', 'yearly'].includes(r.frequency)) {
            setRecurrenceFrequency(r.frequency as typeof recurrenceFrequency)
          }
          if (r.day != null) setRecurrenceDay(String(r.day))
        }
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
    const amt = parseTrNumberInput(amountGross)
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
      recurrence: recurring
        ? {
            start_date: recurrenceStart || null,
            end_date: recurrenceEnd || null,
            frequency: recurrenceFrequency,
            day:
              recurrenceFrequency === 'daily' ? null : recurrenceDay || null,
          }
        : null,
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
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            {editId ? 'Masraf düzenle' : 'Yeni masraf'}
          </h1>
          <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={saving || (showPaidAccount && sourcesLoading)}
            className="gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Check className="h-4 w-4" />
            {editId ? 'Güncelle' : 'Kaydet'}
          </Button>
          <Link
            href="/dashboard/hesaplarim/masraflar"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            <Undo2 className="h-4 w-4" />
            Geri Dön
          </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          {/* HESAP KALEMİ */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
            <div className="bg-primary-700 px-3 py-2 text-xs font-black uppercase tracking-wide text-white">
              Hesap kalemi
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Masraf kalemi</label>
                <select
                  required
                  value={expenseItem}
                  onChange={(e) => setExpenseItem(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
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
                  className="mt-1 inline-block text-xs font-medium text-primary-600 hover:text-primary-800 hover:underline"
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
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Fiş/Belge no</label>
                <input
                  type="text"
                  value={docNo}
                  onChange={(e) => setDocNo(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
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
                  className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
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
                  className="inline-flex items-center gap-2 rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-800 transition hover:bg-primary-100"
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
                      className="font-medium text-primary-700 underline hover:text-primary-900"
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

          {/* SAĞ SÜTUN */}
          <div className="space-y-4">
          {/* TUTAR */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
            <div className="bg-primary-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white">
              Tutar
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Ödeme durumu</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
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
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
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
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60"
                  >
                    <option value="">{sourcesLoading ? 'Yükleniyor…' : 'Hesap seçin'}</option>
                    {groupedAccounts.map((g) => (
                      <optgroup key={g.title} label={g.title}>
                        {g.items.map((a) => (
                          <option key={a.id} value={`acc:${a.id}`}>
                            {formatPaymentAccountOptionLabel(a)}
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
                <div className="flex overflow-hidden rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-primary-500/30">
                  <TrNumberInput
                    value={amountGross}
                    onChange={setAmountGross}
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
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
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

          {/* TEKRARLAYAN MASRAF */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
            <div className="bg-gray-700 px-3 py-2 text-xs font-black uppercase tracking-wide text-white">
              Tekrarlayan masraf
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setRecurring(checked)
                      if (checked) setRecurrenceModalOpen(true)
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
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
              {recurring && (
                <button
                  type="button"
                  onClick={() => setRecurrenceModalOpen(true)}
                  className="mt-3 block w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm leading-relaxed text-gray-700 transition hover:border-primary-300 hover:bg-primary-50/40"
                  title="Tekrar ayarlarını değiştir"
                >
                  {renderRecurrenceDetail({
                    start: recurrenceStart,
                    end: recurrenceEnd,
                    frequency: recurrenceFrequency,
                    day: recurrenceDay,
                  })}{' '}
                  <span className="text-xs font-medium text-primary-700 underline underline-offset-2">
                    Ayarlamak için tıklayın
                  </span>
                </button>
              )}
            </div>
          </div>
          </div>
        </div>
      </form>

      {recurrenceModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => setRecurrenceModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3.5">
              <h3 className="text-base font-semibold tracking-tight text-gray-900">
                Masraf Tekrarı
              </h3>
              <button
                type="button"
                onClick={() => setRecurrenceModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  İlk Tekrar Tarihi
                </label>
                <input
                  type="date"
                  value={recurrenceStart}
                  onChange={(e) => setRecurrenceStart(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Son Tekrar Tarihi
                </label>
                <input
                  type="date"
                  value={recurrenceEnd}
                  onChange={(e) => setRecurrenceEnd(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Tekrarlama Sıklığı
                </label>
                <select
                  value={recurrenceFrequency}
                  onChange={(e) =>
                    setRecurrenceFrequency(e.target.value as typeof recurrenceFrequency)
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="daily">Her gün</option>
                  <option value="weekly">Her hafta</option>
                  <option value="monthly">Her ay</option>
                  <option value="yearly">Her yıl</option>
                </select>
              </div>

              {recurrenceFrequency !== 'daily' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Hangi Gün?
                  </label>
                  <select
                    value={recurrenceDay}
                    onChange={(e) => setRecurrenceDay(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  >
                    {recurrenceFrequency === 'weekly'
                      ? WEEK_DAYS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))
                      : Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={String(d)}>
                            {d}. günü
                          </option>
                        ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setRecurrenceModalOpen(false)
                    setRecurring(false)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrenceModalOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
                >
                  <Check className="h-4 w-4" />
                  Tamam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">{new Date().getFullYear()} © Mikro Muhasebe</p>
    </div>
  )
}

const WEEK_DAYS = [
  { value: '1', label: 'Pazartesi' },
  { value: '2', label: 'Salı' },
  { value: '3', label: 'Çarşamba' },
  { value: '4', label: 'Perşembe' },
  { value: '5', label: 'Cuma' },
  { value: '6', label: 'Cumartesi' },
  { value: '7', label: 'Pazar' },
]

function formatRecurrenceSummary(opts: {
  start: string
  end: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  day: string
}) {
  const freqLabel =
    opts.frequency === 'daily'
      ? 'Her gün'
      : opts.frequency === 'weekly'
        ? `Her hafta${
            opts.day
              ? ' · ' + (WEEK_DAYS.find((d) => d.value === opts.day)?.label ?? '')
              : ''
          }`
        : opts.frequency === 'monthly'
          ? `Her ay${opts.day ? ' · ' + opts.day + '. günü' : ''}`
          : `Her yıl${opts.day ? ' · ' + opts.day + '. günü' : ''}`
  const fmt = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('tr-TR') : '—'
  return `${freqLabel} · ${fmt(opts.start)} – ${fmt(opts.end)}`
}

function renderRecurrenceDetail(opts: {
  start: string
  end: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  day: string
}) {
  const endFmt = opts.end
    ? new Date(opts.end + 'T00:00:00').toLocaleDateString('tr-TR')
    : '—'
  const endEl = (
    <span className="font-semibold text-red-600">{endFmt}</span>
  )
  const tekrarla = <span className="font-medium text-gray-700">tekrarla.</span>

  let freqEl: React.ReactNode
  if (opts.frequency === 'daily') {
    freqEl = <span className="font-semibold text-primary-700">her gün</span>
  } else if (opts.frequency === 'weekly') {
    const dayName = WEEK_DAYS.find((d) => d.value === opts.day)?.label ?? ''
    freqEl = (
      <span className="font-semibold text-primary-700">
        her hafta{dayName ? ` ${dayName}` : ''}
      </span>
    )
  } else if (opts.frequency === 'monthly') {
    freqEl = (
      <span className="font-semibold text-primary-700">
        her ayın{opts.day ? ` ${opts.day}.` : ''} gününde
      </span>
    )
  } else {
    freqEl = (
      <span className="font-semibold text-primary-700">
        her yılın{opts.day ? ` ${opts.day}.` : ''} gününde
      </span>
    )
  }

  return (
    <>
      Yukarıdaki kaydı {endEl} tarihine kadar {freqEl} {tekrarla}
    </>
  )
}

export default function YeniMasrafPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-sm text-gray-400">Yükleniyor…</div>}>
      <YeniMasrafForm />
    </Suspense>
  )
}
