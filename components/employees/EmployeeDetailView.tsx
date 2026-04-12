'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Pencil,
  ChevronDown,
  Plus,
  FileText,
  MessageSquare,
  FolderOpen,
  Zap,
  Banknote,
  Undo2,
  ArrowLeftRight,
  Phone,
  Mail,
  User,
  X,
  AlertTriangle,
  Check,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { isOdemeHesabi } from '@/lib/account-sections'
import type { MasrafGroup } from '@/lib/masraf-kalemleri'
import { MASRAF_GROUPS, findMasrafLabel, KDV_ORAN_OPTIONS } from '@/lib/masraf-kalemleri'

interface Employee {
  id: string
  name: string
  email: string | null
  phone: string | null
  photo_url: string | null
  currency: string
  notes: string | null
}

interface CariTx {
  id: string
  entry_type: string
  signed_amount: number
  currency: string
  description: string | null
  transaction_date: string
  expense_item?: string | null
  created_at?: string
  account_id?: string | null
}

const ENTRY_LABELS: Record<string, string> = {
  salary_accrual: 'Maaş/Prim Tahakkuku',
  payment: 'Maaş/Prim Ödemesi',
  advance_given: 'Avans',
  expense: 'Masraf',
  advance_refund: 'Avans İadesi',
  debt_credit: 'Borç-Alacak Fişi',
  manual: 'Diğer',
}

function formatMoney(n: number, currency: string) {
  const s = n.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  if (currency === 'USD') return `$${s}`
  if (currency === 'EUR') return `€${s}`
  return `${s} ₺`
}

export default function EmployeeDetailView({ employeeId }: { employeeId: string }) {
  const router = useRouter()
  const [emp, setEmp] = useState<Employee | null>(null)
  const [balance, setBalance] = useState(0)
  const [txs, setTxs] = useState<CariTx[]>([])
  const [currency, setCurrency] = useState('TRY')
  const [loading, setLoading] = useState(true)
  const [deletingCariId, setDeletingCariId] = useState<string | null>(null)
  const [paymentMenuOpen, setPaymentMenuOpen] = useState(false)
  const [cariOpen, setCariOpen] = useState(true)
  const [modal, setModal] = useState<
    null | { kind: 'accrual' | 'payment' | 'advance_given' | 'expense' | 'advance' | 'slip' }
  >(null)
  const [amountStr, setAmountStr] = useState('')
  const [descStr, setDescStr] = useState('')
  const [accrualDate, setAccrualDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [expenseItem, setExpenseItem] = useState('')
  const [saving, setSaving] = useState(false)

  const [paymentAccounts, setPaymentAccounts] = useState<
    { id: string; name: string; type: string; currency: string; balance: number }[]
  >([])
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [paymentAmountStr, setPaymentAmountStr] = useState('')
  const [paymentDesc, setPaymentDesc] = useState('')

  const [advanceAccounts, setAdvanceAccounts] = useState<
    { id: string; name: string; type: string; currency: string; balance: number }[]
  >([])
  const [advanceDate, setAdvanceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [advanceAccountId, setAdvanceAccountId] = useState('')
  const [advanceAmountStr, setAdvanceAmountStr] = useState('')
  const [advanceDesc, setAdvanceDesc] = useState('')

  /** Bakiye = Σ signed. Negatif: şirket çalışana borçlu (alacak). Pozitif: çalışan şirkete borçlu (borç). Masraf/tahakkuk: negatif signed → Alacak sütunu. Maaş ödemesi: pozitif → Borç. Avans: pozitif → Borç (çalışan borçlanır). */
  const [slipKind, setSlipKind] = useState<'alacak' | 'borc'>('alacak')
  const [slipDate, setSlipDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [slipAmountStr, setSlipAmountStr] = useState('')
  const [slipDesc, setSlipDesc] = useState('')

  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [expenseDocNo, setExpenseDocNo] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [expenseGrossStr, setExpenseGrossStr] = useState('')
  const [expenseVatRate, setExpenseVatRate] = useState('0')
  const [expenseNote, setExpenseNote] = useState('')

  const [masrafGroups, setMasrafGroups] = useState<MasrafGroup[]>(MASRAF_GROUPS)

  const closeModal = () => {
    setModal(null)
    setAmountStr('')
    setDescStr('')
    setAccrualDate(new Date().toISOString().slice(0, 10))
    setExpenseItem('')
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setPaymentAccountId('')
    setPaymentAmountStr('')
    setPaymentDesc('')
    setPaymentAccounts([])
    setAdvanceDate(new Date().toISOString().slice(0, 10))
    setAdvanceAccountId('')
    setAdvanceAmountStr('')
    setAdvanceDesc('')
    setAdvanceAccounts([])
    setSlipKind('alacak')
    setSlipDate(new Date().toISOString().slice(0, 10))
    setSlipAmountStr('')
    setSlipDesc('')
    setExpenseDate(new Date().toISOString().slice(0, 10))
    setExpenseDocNo('')
    setExpenseCategory('')
    setExpenseGrossStr('')
    setExpenseVatRate('0')
    setExpenseNote('')
  }

  const performDeleteCariTx = async (txId: string) => {
    setDeletingCariId(txId)
    try {
      const res = await fetch(`/api/employees/${employeeId}/cari/${txId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Silinemedi')
      toast.success('Hareket silindi')
      await load()
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Silinemedi')
    } finally {
      setDeletingCariId(null)
    }
  }

  const handleDeleteCariTx = (txId: string) => {
    toast.custom(
      (t) => (
        <div
          className="pointer-events-auto max-w-sm rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5"
          role="dialog"
          aria-labelledby={`cari-del-title-${t.id}`}
        >
          <p id={`cari-del-title-${t.id}`} className="text-sm font-semibold text-slate-900">
            Bu hareketi silmek istiyor musunuz?
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Kasa veya banka hesabı bağlıysa bakiye otomatik güncellenir.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => toast.dismiss(t.id)}
            >
              İptal
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
              onClick={() => {
                toast.dismiss(t.id)
                void performDeleteCariTx(txId)
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

  const load = async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/employees/${employeeId}`),
        fetch(`/api/employees/${employeeId}/cari`),
      ])
      if (!r1.ok) throw new Error('Çalışan yok')
      const e = await r1.json()
      setEmp(e)
      setCurrency(e.currency || 'TRY')

      if (r2.ok) {
        const c = await r2.json()
        setBalance(Number(c.balance))
        setTxs(Array.isArray(c.transactions) ? c.transactions : [])
      } else {
        setBalance(0)
        setTxs([])
      }
    } catch {
      toast.error('Veriler yüklenemedi')
      router.push('/dashboard/hesaplarim/calisanlar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [employeeId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/expense-items')
        const data = await res.json().catch(() => ({}))
        if (cancelled || !res.ok) return
        if (Array.isArray(data.groups) && data.groups.length > 0) {
          setMasrafGroups(data.groups)
        }
      } catch {
        /* STATIC_MASRAF_GROUPS */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (modal?.kind !== 'payment' && modal?.kind !== 'advance_given') return
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setPaymentAccountId('')
    setPaymentAmountStr('')
    setPaymentDesc('')
    ;(async () => {
      const res = await fetch('/api/accounts')
      if (!res.ok) {
        setPaymentAccounts([])
        return
      }
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      const cur = currency
      setPaymentAccounts(
        list.filter(
          (a: { is_active?: boolean; type: string; currency?: string }) =>
            a.is_active !== false &&
            isOdemeHesabi(a.type) &&
            String(a.currency || 'TRY') === String(cur)
        )
      )
    })()
  }, [modal?.kind, currency])

  useEffect(() => {
    if (modal?.kind !== 'advance') return
    setAdvanceDate(new Date().toISOString().slice(0, 10))
    setAdvanceAccountId('')
    setAdvanceAmountStr('')
    setAdvanceDesc('')
    ;(async () => {
      const res = await fetch('/api/accounts')
      if (!res.ok) {
        setAdvanceAccounts([])
        return
      }
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      const cur = currency
      setAdvanceAccounts(
        list.filter(
          (a: { is_active?: boolean; type: string; currency?: string }) =>
            a.is_active !== false &&
            isOdemeHesabi(a.type) &&
            String(a.currency || 'TRY') === String(cur)
        )
      )
    })()
  }, [modal?.kind, currency])

  useEffect(() => {
    if (modal?.kind !== 'slip') return
    setSlipKind('alacak')
    setSlipDate(new Date().toISOString().slice(0, 10))
    setSlipAmountStr('')
    setSlipDesc('')
  }, [modal?.kind])

  useEffect(() => {
    if (modal?.kind !== 'expense') return
    setExpenseDate(new Date().toISOString().slice(0, 10))
    setExpenseDocNo('')
    setExpenseCategory('')
    setExpenseGrossStr('')
    setExpenseVatRate('0')
    setExpenseNote('')
  }, [modal?.kind])

  const submitCari = async (
    entry_type: string,
    signed_amount: number,
    description: string,
    opts?: {
      transaction_date?: string
      expense_item?: string | null
      account_id?: string | null
    }
  ) => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        entry_type,
        signed_amount,
        description,
        currency,
      }
      if (opts?.transaction_date) body.transaction_date = opts.transaction_date
      if (opts?.expense_item) body.expense_item = opts.expense_item
      if (opts?.account_id) body.account_id = opts.account_id

      const res = await fetch(`/api/employees/${employeeId}/cari`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const err = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(err.error || 'Kaydedilemedi')
      toast.success('Kayıt eklendi')
      closeModal()
      load()
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Hata')
    } finally {
      setSaving(false)
    }
  }

  const handleAccrualSubmit = () => {
    const amt = parseFloat(amountStr.replace(',', '.'))
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Hakedilen net maaş için geçerli tutar girin')
      return
    }
    if (!expenseItem) {
      toast.error('Masraf kalemi seçin')
      return
    }
    const label = findMasrafLabel(expenseItem, masrafGroups)
    const userDesc = descStr.trim()
    const composed = userDesc
      ? `${userDesc} (Masraf kalemi: ${label})`
      : `Maaş/prim hakedişi (Masraf kalemi: ${label})`
    const txDate = accrualDate
      ? new Date(accrualDate + 'T12:00:00').toISOString()
      : undefined
    return submitCari('salary_accrual', -amt, composed, {
      transaction_date: txDate,
      expense_item: label,
    })
  }

  const handlePaymentSubmit = () => {
    const amt = parseFloat(paymentAmountStr.replace(',', '.'))
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Ödediğiniz net tutarı girin')
      return
    }
    if (!paymentAccountId) {
      toast.error('Ödemeyi yaptığınız hesabı seçin')
      return
    }
    const txDate = paymentDate
      ? new Date(paymentDate + 'T12:00:00').toISOString()
      : undefined
    const desc = paymentDesc.trim() || 'Maaş/Prim ödemesi'
    return submitCari('payment', amt, desc, {
      transaction_date: txDate,
      account_id: paymentAccountId,
    })
  }

  const handleAdvanceGivenSubmit = () => {
    const amt = parseFloat(paymentAmountStr.replace(',', '.'))
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Geçerli avans tutarı girin')
      return
    }
    if (!paymentAccountId) {
      toast.error('Avansı verdiğiniz hesabı seçin')
      return
    }
    const txDate = paymentDate
      ? new Date(paymentDate + 'T12:00:00').toISOString()
      : undefined
    const desc = paymentDesc.trim() || 'Avans ödemesi'
    return submitCari('advance_given', amt, desc, {
      transaction_date: txDate,
      account_id: paymentAccountId,
    })
  }

  const handleAdvanceSubmit = () => {
    const amt = parseFloat(advanceAmountStr.replace(',', '.'))
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('İade tutarını girin')
      return
    }
    if (!advanceAccountId) {
      toast.error('İadeyi aldığınız hesabı seçin')
      return
    }
    const txDate = advanceDate
      ? new Date(advanceDate + 'T12:00:00').toISOString()
      : undefined
    const desc = advanceDesc.trim() || 'Avans iadesi'
    return submitCari('advance_refund', -amt, desc, {
      transaction_date: txDate,
      account_id: advanceAccountId,
    })
  }

  const handleSlipSubmit = () => {
    const amt = parseFloat(slipAmountStr.replace(',', '.'))
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Geçerli tutar girin')
      return
    }
    const signed = slipKind === 'alacak' ? -amt : amt
    const txDate = slipDate
      ? new Date(slipDate + 'T12:00:00').toISOString()
      : undefined
    const kindLabel = slipKind === 'alacak' ? 'Alacak fişi' : 'Borç fişi'
    const user = slipDesc.trim()
    const desc = user ? `${user} (${kindLabel})` : kindLabel
    return submitCari('debt_credit', signed, desc, { transaction_date: txDate })
  }

  /** Masraf → Alacak sütunu (negatif signed), bakiye azalır. Tutar KDV dahil. */
  const handleExpenseSubmit = () => {
    const amt = parseFloat(expenseGrossStr.replace(',', '.'))
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Tutar (KDV dahil) girin')
      return
    }
    if (!expenseCategory) {
      toast.error('Masraf kalemi seçin')
      return
    }
    const label = findMasrafLabel(expenseCategory, masrafGroups)
    const txDate = expenseDate
      ? new Date(expenseDate + 'T12:00:00').toISOString()
      : undefined
    const bits: string[] = []
    const note = expenseNote.trim()
    if (note) bits.push(note)
    const doc = expenseDocNo.trim()
    if (doc) bits.push(`Belge no: ${doc}`)
    if (expenseVatRate && expenseVatRate !== '0') bits.push(`KDV %${expenseVatRate}`)
    const head = bits.length ? bits.join(' · ') : 'Masraf girişi'
    const composed = `${head} (Masraf kalemi: ${label})`
    return submitCari('expense', -amt, composed, {
      transaction_date: txDate,
      expense_item: label,
    })
  }

  const selectedPaymentBalance = paymentAccounts.find((a) => a.id === paymentAccountId)?.balance
  const selectedAdvanceBalance = advanceAccounts.find((a) => a.id === advanceAccountId)?.balance

  const cariTableRows = useMemo(() => {
    const sorted = [...txs].sort((a, b) => {
      const ta = new Date(a.transaction_date).getTime()
      const tb = new Date(b.transaction_date).getTime()
      if (ta !== tb) return ta - tb
      const ca = a.created_at ? new Date(a.created_at).getTime() : 0
      const cb = b.created_at ? new Date(b.created_at).getTime() : 0
      return ca - cb
    })
    let run = 0
    const asc = sorted.map((t) => {
      const s = Number(t.signed_amount)
      run += s
      return {
        t,
        borc: s > 0 ? s : 0,
        alacak: s < 0 ? Math.abs(s) : 0,
        balance: run,
      }
    })
    return asc.reverse()
  }, [txs])

  if (loading || !emp) {
    return (
      <div className="mx-auto flex w-full min-w-0 max-w-full justify-center overflow-x-hidden py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺'

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-4">
      {/* Üst: ahşap görünümlü başlık kartı */}
      <div
        className="relative rounded-2xl border border-amber-900/10 shadow-md overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #e9dfd4 0%, #dccfbc 35%, #efe6dc 70%, #d4c4b0 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,0,0,0.03)_2px,rgba(0,0,0,0.03)_4px)]" />
        <div className="relative p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-start">
          <div className="shrink-0">
            {emp.photo_url ? (
              <div className="relative h-24 w-24 rounded-full overflow-hidden ring-4 ring-white/80 shadow-lg bg-white">
                <Image
                  src={emp.photo_url}
                  alt=""
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              </div>
            ) : (
              <div className="h-24 w-24 rounded-full bg-white/90 ring-4 ring-white/80 shadow-lg flex items-center justify-center">
                <User className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{emp.name}</h1>
            {emp.phone && (
              <p className="flex items-center gap-2 text-gray-800 font-medium">
                <Phone className="h-4 w-4 text-emerald-800 shrink-0" />
                {emp.phone}
              </p>
            )}
            {emp.email && (
              <p className="flex items-center gap-2 text-gray-800 font-medium break-all">
                <Mail className="h-4 w-4 text-emerald-800 shrink-0" />
                {emp.email}
              </p>
            )}
            <p className="text-xs text-gray-600 bg-white/50 inline-block px-2 py-1 rounded-lg border border-amber-900/10 max-w-md">
              Bu çalışan ile ilgili not kaydetmek için tıklayın.
            </p>
          </div>
        </div>
      </div>

      {/* Araç çubuğu */}
      <div className="flex flex-wrap gap-2 items-center">
        <Link href={`/dashboard/hesaplarim/calisanlar/${employeeId}/duzenle`}>
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 gap-2"
          >
            <Pencil className="h-4 w-4" />
            Güncelle
          </Button>
        </Link>

        <div className="relative">
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 rounded-lg"
            onClick={() => setPaymentMenuOpen(!paymentMenuOpen)}
          >
            <Banknote className="h-4 w-4" />
            Ödeme İşlemleri
            <ChevronDown className={`h-4 w-4 transition-transform ${paymentMenuOpen ? 'rotate-180' : ''}`} />
          </Button>
          {paymentMenuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Kapat"
                onClick={() => setPaymentMenuOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden">
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-red-50 flex items-center gap-2 border-b border-gray-50"
                  onClick={() => {
                    setPaymentMenuOpen(false)
                    setAccrualDate(new Date().toISOString().slice(0, 10))
                    setExpenseItem('')
                    setAmountStr('')
                    setDescStr('')
                    setModal({ kind: 'accrual' })
                  }}
                >
                  <Zap className="h-4 w-4 text-red-500" />
                  Maaş/Prim Tahakkuku Yap
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-emerald-50 flex items-center gap-2 border-b border-gray-50"
                  onClick={() => {
                    setPaymentMenuOpen(false)
                    setModal({ kind: 'payment' })
                  }}
                >
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  Maaş/Prim Ödemesi
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-amber-50 flex items-center gap-2 border-b border-gray-50"
                  onClick={() => {
                    setPaymentMenuOpen(false)
                    setModal({ kind: 'advance_given' })
                  }}
                >
                  <Banknote className="h-4 w-4 text-amber-600" />
                  Avans Ver
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-emerald-50 flex items-center gap-2 border-b border-gray-50"
                  onClick={() => {
                    setPaymentMenuOpen(false)
                    setModal({ kind: 'advance' })
                  }}
                >
                  <Undo2 className="h-4 w-4 text-emerald-600" />
                  Avans İadesi Al
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-blue-50 flex items-center gap-2"
                  onClick={() => {
                    setPaymentMenuOpen(false)
                    setModal({ kind: 'slip' })
                  }}
                >
                  <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                  Borç-Alacak Fişleri
                </button>
              </div>
            </>
          )}
        </div>

        <Button
          type="button"
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 rounded-lg"
          onClick={() => setModal({ kind: 'expense' })}
        >
          <Plus className="h-4 w-4" />
          Masraf Kaydet
        </Button>

        <Button
          type="button"
          variant="outline"
          className="rounded-lg bg-slate-800 text-white border-slate-900 hover:bg-slate-900 gap-2"
          onClick={() => router.push(`/dashboard/hesaplarim/calisanlar/${employeeId}/ekstre`)}
        >
          <FileText className="h-4 w-4" />
          Hesap Ekstresi
        </Button>

        <Button
          type="button"
          variant="outline"
          className="rounded-lg border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100 gap-2"
          onClick={() => toast('SMS gönderimi yakında', { icon: '💬' })}
        >
          <MessageSquare className="h-4 w-4" />
          SMS Gönder
        </Button>

        <Button
          type="button"
          variant="outline"
          className="rounded-lg border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100 gap-2"
          onClick={() => toast('Dökümanlar yakında', { icon: '📁' })}
        >
          <FolderOpen className="h-4 w-4" />
          Dökümanlar
        </Button>
      </div>

      {/* Önceki cari */}
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
        <button
          type="button"
          onClick={() => setCariOpen(!cariOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 text-white font-black text-sm uppercase tracking-wider"
        >
          <span>Önceki Cari İşlemleri</span>
          <ChevronDown className={`h-5 w-5 transition-transform ${cariOpen ? 'rotate-180' : ''}`} />
        </button>
        {cariOpen && (
          <div className="p-4 bg-amber-50/80 border-t border-amber-100/80">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-800">
                  Güncel bakiye:{' '}
                  <span className={balance >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                    {formatMoney(balance, currency)}
                  </span>
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Negatif: şirket çalışana borçlu (çalışanın alacağı). Pozitif: çalışan şirkete borçlu.
                  Masraf ve tahakkuk <strong>Alacak</strong>, maaş ödemesi ve avans <strong>Borç</strong>{' '}
                  sütununa düşer.
                </p>
              </div>
            </div>
            {txs.length === 0 ? (
              <p className="text-sm text-amber-900/80 leading-relaxed">
                Bu çalışanın henüz cari hareketi yok. Ödeme İşlemleri veya Masraf Kaydet ile işlem ekleyebilirsiniz.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-amber-200/60 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">Tarih</th>
                      <th className="px-3 py-2 text-left font-bold">Kalem</th>
                      <th className="px-3 py-2 text-left font-bold">Açıklama</th>
                      <th className="px-3 py-2 text-right font-bold whitespace-nowrap">Borç ({sym})</th>
                      <th className="px-3 py-2 text-right font-bold whitespace-nowrap">Alacak ({sym})</th>
                      <th className="px-3 py-2 text-right font-bold whitespace-nowrap">Bakiye ({sym})</th>
                      <th className="px-2 py-2 text-center font-bold w-12">Sil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cariTableRows.map(({ t, borc, alacak, balance }) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                          {new Date(t.transaction_date).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-3 py-2 text-gray-800 max-w-[140px]">
                          <span className="font-medium">
                            {t.expense_item?.trim() || ENTRY_LABELS[t.entry_type] || t.entry_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600 max-w-md">
                          <div className="truncate" title={t.description || undefined}>
                            <span className="truncate block">{t.description || '—'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                          {borc > 0 ? formatMoney(borc, currency) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                          {alacak > 0 ? formatMoney(alacak, currency) : '—'}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-semibold tabular-nums ${
                            balance <= 0 ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {formatMoney(balance, currency)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteCariTx(t.id)}
                            disabled={deletingCariId === t.id}
                            className="inline-flex rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Sil"
                            aria-label="Hareketi sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Link
          href="/dashboard/hesaplarim/calisanlar"
          className="text-sm font-semibold text-sky-700 hover:underline"
        >
          ← Çalışanlar listesine dön
        </Link>
      </div>

      {/* Maaş / Prim tahakkuku — ayrıntılı modal */}
      {modal?.kind === 'accrual' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-5 py-4 bg-emerald-600 text-white">
              <h3 className="text-lg font-black tracking-tight">Maaş / Prim Tahakkuku</h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-gray-800 leading-relaxed space-y-3">
                <p>
                  <strong>Hakedilen Net Maaş</strong> alanına net tutarı girin. Kaydettiğinizde
                  çalışanınız için alacak kaydı oluşur; seçtiğiniz <strong>masraf kalemi</strong>{' '}
                  ile gider tarafı ilişkilendirilir. Açıklama alanına örneğin{' '}
                  <em>«Şubat ayı maaşı»</em> gibi notlar yazabilirsiniz.
                </p>
                <div className="flex gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-red-900">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                  <p className="text-sm font-semibold leading-snug">
                    Bu işlem kasa ya da banka hesabınızı etkilemez; sadece çalışanınızı
                    alacaklandırır. Ödeme yapmak için{' '}
                    <strong>«Maaş/Prim Ödemesi»</strong> seçeneğini kullanın.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Hakediş Tarihi</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 font-medium"
                  value={accrualDate}
                  onChange={(e) => setAccrualDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  Hakedilen Net Maaş
                </label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="min-w-0 flex-1 border-0 px-3 py-2.5 font-semibold text-gray-900"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0,00"
                  />
                  <span className="shrink-0 flex items-center px-4 bg-gray-100 text-gray-700 font-bold text-sm border-l border-gray-200">
                    {currency === 'USD' ? 'USD' : currency === 'EUR' ? 'EUR' : 'TL'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Masraf Kalemi</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 font-medium bg-white"
                  value={expenseItem}
                  onChange={(e) => setExpenseItem(e.target.value)}
                >
                  <option value="">Seçiniz…</option>
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
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Açıklama</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5"
                  value={descStr}
                  onChange={(e) => setDescStr(e.target.value)}
                  placeholder="Örn: Maaş/prim hakedişi"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleAccrualSubmit}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-black text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 shadow-md"
                >
                  <Check className="h-5 w-5" />
                  {saving ? 'Oluşturuluyor...' : 'Maaş Tahakkuku Oluştur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maaş/Prim ödemesi veya Avans verme */}
      {(modal?.kind === 'payment' || modal?.kind === 'advance_given') && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div
              className={`flex items-center justify-between px-5 py-4 text-white ${modal?.kind === 'advance_given' ? 'bg-amber-600' : 'bg-emerald-600'}`}
            >
              <h3 className="text-lg font-black tracking-tight">
                {modal?.kind === 'advance_given' ? 'Avans Ver' : 'Maaş/Prim Ödemesi'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div
                className={`rounded-xl border px-4 py-3 text-sm text-gray-800 leading-relaxed space-y-3 ${
                  modal?.kind === 'advance_given'
                    ? 'border-amber-200/80 bg-amber-50/90'
                    : 'border-emerald-200/80 bg-emerald-50/90'
                }`}
              >
                {modal?.kind === 'advance_given' ? (
                  <p>
                    Verdiğiniz avans, çalışan carisinde <strong>Borç</strong> sütununa yazılır: çalışan
                    şirkete borçlanır. Seçtiğiniz hesaptan tutar çıkar.
                  </p>
                ) : (
                  <>
                    <p>
                      Ödemeyi kaydettiğinizde seçtiğiniz kasa/banka hesabından tutar çıkar; caride{' '}
                      <strong>Borç</strong> olarak kaydedilir ve şirketin çalışana olan borcu azalır
                      (bakiye yukarı çıkar).
                    </p>
                    <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-amber-950">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                      <p className="text-sm font-semibold leading-snug">
                        Maaş ya da prim ödemesi yapmadan önce{' '}
                        <strong>«Maaş/Prim Tahakkuku Yap»</strong> ile tahakkuk oluşturmayı
                        unutmayın.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Ödeme Tarihi</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 font-medium"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Hangi Hesaptan</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 font-medium bg-white"
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                >
                  <option value="">Ödemeyi yaptığınız hesabı seçin</option>
                  {paymentAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency}) — {Number(a.balance).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺'}
                    </option>
                  ))}
                </select>
                {paymentAccounts.length === 0 && (
                  <p className="text-xs text-amber-700 mt-1.5">
                    Bu para birimi için uygun hesap yok. Hesaplarım sayfasından kasa veya banka ekleyin.
                  </p>
                )}
                {paymentAccountId && (
                  <p className="text-sm font-semibold text-gray-700 mt-2">
                    Güncel bakiyesi :{' '}
                    {selectedPaymentBalance != null
                      ? `${Number(selectedPaymentBalance).toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                        })} ${currency === 'USD' ? 'USD' : currency === 'EUR' ? 'EUR' : 'TL'}`
                      : '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  {modal?.kind === 'advance_given' ? 'Avans Tutarı' : 'Ödediğiniz Net Tutar'}
                </label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="min-w-0 flex-1 border-0 px-3 py-2.5 font-semibold text-gray-900"
                    value={paymentAmountStr}
                    onChange={(e) => setPaymentAmountStr(e.target.value)}
                    placeholder="0,00"
                  />
                  <span className="shrink-0 flex items-center px-4 bg-gray-100 text-gray-700 font-bold text-sm border-l border-gray-200">
                    {currency === 'USD' ? 'USD' : currency === 'EUR' ? 'EUR' : 'TL'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Açıklama</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 resize-y min-h-[80px]"
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  placeholder="İsteğe bağlı açıklama"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={
                    modal?.kind === 'advance_given' ? handleAdvanceGivenSubmit : handlePaymentSubmit
                  }
                  className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 font-black text-white disabled:opacity-50 shadow-md ${
                    modal?.kind === 'advance_given'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-500 hover:bg-rose-600'
                  }`}
                >
                  <Check className="h-5 w-5" />
                  {saving
                    ? 'Kaydediliyor...'
                    : modal?.kind === 'advance_given'
                      ? 'Avansı Kaydet'
                      : 'Ödemeyi Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Avans iadesi */}
      {modal?.kind === 'advance' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-5 py-4 bg-teal-500 text-white">
              <h3 className="text-lg font-black tracking-tight">Avans İadesi</h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <p className="rounded-lg border border-teal-200 bg-teal-50/90 px-4 py-3 text-sm text-gray-800">
                Çalışanın iade ettiği tutar caride <strong>Alacak</strong> tarafında işlenir; çalışanın
                şirkete borcu azalır. Para seçtiğiniz hesaba girer.
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">İşlem Tarihi</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 font-medium"
                  value={advanceDate}
                  onChange={(e) => setAdvanceDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Hangi Hesaba</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 font-medium bg-white"
                  value={advanceAccountId}
                  onChange={(e) => setAdvanceAccountId(e.target.value)}
                >
                  <option value="">İadeyi aldığınız hesabı seçin</option>
                  {advanceAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency}) —{' '}
                      {Number(a.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                      {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺'}
                    </option>
                  ))}
                </select>
                {advanceAccounts.length === 0 && (
                  <p className="text-xs text-amber-700 mt-1.5">
                    Bu para birimi için uygun hesap yok. Hesaplarım sayfasından kasa veya banka ekleyin.
                  </p>
                )}
                {advanceAccountId && (
                  <p className="text-sm font-semibold text-gray-700 mt-2">
                    Güncel bakiyesi :{' '}
                    {selectedAdvanceBalance != null
                      ? `${Number(selectedAdvanceBalance).toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                        })} ${currency === 'USD' ? 'USD' : currency === 'EUR' ? 'EUR' : 'TL'}`
                      : '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-gray-800 mb-1.5">İade Tutarı</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="min-w-0 flex-1 border-0 px-3 py-2.5 font-semibold text-gray-900"
                    value={advanceAmountStr}
                    onChange={(e) => setAdvanceAmountStr(e.target.value)}
                    placeholder="0,00"
                  />
                  <span className="shrink-0 flex items-center px-4 bg-gray-100 text-gray-700 font-bold text-sm border-l border-gray-200">
                    {currency === 'USD' ? 'USD' : currency === 'EUR' ? 'EUR' : '₺'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Açıklama</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 resize-y min-h-[80px]"
                  value={advanceDesc}
                  onChange={(e) => setAdvanceDesc(e.target.value)}
                  placeholder="İsteğe bağlı açıklama"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleAdvanceSubmit}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-black text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 shadow-md"
                >
                  <Check className="h-5 w-5" />
                  {saving ? 'Kaydediliyor...' : 'Avans İadesi Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Masraf girişi (çalışan alacaklanır) */}
      {modal?.kind === 'expense' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-5 py-4 bg-emerald-600 text-white">
              <h3 className="text-lg font-black tracking-tight">Masraf Girişi</h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 leading-relaxed">
                <p>
                  Çalışanın ödediği masraf, caride <strong>Alacak</strong> sütununa yazılır: şirketin
                  çalışana borcu (çalışanın alacağı) artar; bakiye aşağı iner.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Masraf Tarihi</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 font-medium"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Fiş/Belge No</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5"
                  value={expenseDocNo}
                  onChange={(e) => setExpenseDocNo(e.target.value)}
                  placeholder="İsteğe bağlı"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Masraf Kalemi</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 font-medium bg-white"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                >
                  <option value="">Seçiniz…</option>
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
              </div>

              <div>
                <label className="block text-xs font-black text-gray-800 mb-1.5">
                  Tutar (KDV Dahil)
                </label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="min-w-0 flex-1 border-0 px-3 py-2.5 font-semibold text-gray-900"
                    value={expenseGrossStr}
                    onChange={(e) => setExpenseGrossStr(e.target.value)}
                    placeholder="0,00"
                  />
                  <span className="shrink-0 flex items-center px-4 bg-gray-100 text-gray-700 font-bold text-sm border-l border-gray-200">
                    {currency === 'USD' ? 'USD' : currency === 'EUR' ? 'EUR' : '₺'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">KDV Oranı (%)</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 font-medium bg-white"
                  value={expenseVatRate}
                  onChange={(e) => setExpenseVatRate(e.target.value)}
                >
                  {KDV_ORAN_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">isteğe bağlı</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Açıklama</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 resize-y min-h-[80px]"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  placeholder="İsteğe bağlı açıklama"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleExpenseSubmit}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-black text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 shadow-md"
                >
                  <Check className="h-5 w-5" />
                  {saving ? 'Kaydediliyor...' : 'Masraf Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Borç-Alacak fişleri */}
      {modal?.kind === 'slip' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-5 py-4 bg-emerald-600 text-white">
              <h3 className="text-lg font-black tracking-tight">Borç-Alacak Fişleri</h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950 leading-relaxed">
                <p>
                  Herhangi bir avans, masraf, maaş ya da prim işlemi olmadan çalışanın bakiyesini
                  değiştirmek için borç ya da alacak fişi kaydı oluşturabilirsiniz. Çalışanın güncel
                  bakiyesi burada gireceğiniz tutar kadar değişecektir.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">İşlem Tipi</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 font-medium bg-white"
                  value={slipKind}
                  onChange={(e) => setSlipKind(e.target.value as 'alacak' | 'borc')}
                >
                  <option value="alacak">Alacak Fişi</option>
                  <option value="borc">Borç Fişi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">İşlem Tarihi</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 font-medium"
                  value={slipDate}
                  onChange={(e) => setSlipDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Tutar</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="min-w-0 flex-1 border-0 px-3 py-2.5 font-semibold text-gray-900"
                    value={slipAmountStr}
                    onChange={(e) => setSlipAmountStr(e.target.value)}
                    placeholder="0,00"
                  />
                  <span className="shrink-0 flex items-center px-4 bg-gray-100 text-gray-700 font-bold text-sm border-l border-gray-200">
                    {currency === 'USD' ? 'USD' : currency === 'EUR' ? 'EUR' : '₺'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Açıklama</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 resize-y min-h-[80px]"
                  value={slipDesc}
                  onChange={(e) => setSlipDesc(e.target.value)}
                  placeholder="İsteğe bağlı açıklama"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 shadow-sm"
                >
                  <X className="h-5 w-5" />
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSlipSubmit}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-black text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 shadow-md"
                >
                  <Check className="h-5 w-5" />
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
