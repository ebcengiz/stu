'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Tag,
  Banknote,
  CalendarDays,
  ChevronDown,
  Search,
  X,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { accountTypeLabel, isOdemeHesabi } from '@/lib/account-sections'
import type { MasrafGroup } from '@/lib/masraf-kalemleri'
import TrNumberInput from '@/components/ui/TrNumberInput'
import { numberToTrInputString, parseTrNumberInput } from '@/lib/tr-number-input'

type CheckStatus =
  | 'portfolio'
  | 'to_supplier'
  | 'to_bank'
  | 'paid'
  | 'bounced'
  | 'cancelled'

type PortfolioCheckRow = {
  id: string
  debtor_name: string
  received_date: string
  due_date: string
  bank_name: string | null
  check_number: string | null
  description: string | null
  amount: number
  currency: string
  status: CheckStatus
  /** Tahsile / tahsilata gönderilen banka (bankaya ver işlemi) */
  bank_send_bank_name?: string | null
}

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'Tüm Çekler' },
  { key: 'portfolio', label: 'Portföydekiler' },
  { key: 'to_supplier', label: 'Tedarikçiye Verilenler' },
  { key: 'to_bank', label: 'Bankaya Verilenler' },
  { key: 'paid', label: 'Ödenmişler' },
  { key: 'bounced', label: 'Karşılıksız Çıkanlar' },
  { key: 'cancelled', label: 'İptaller' },
]

const STATUS_LABEL: Record<CheckStatus, string> = {
  portfolio: 'Portföyde',
  to_supplier: 'Tedarikçiye verildi',
  to_bank: 'Bankaya verildi',
  paid: 'Ödendi',
  bounced: 'Karşılıksız',
  cancelled: 'İptal',
}

function formatMoney(n: number, cur = 'TRY') {
  const s = Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  return cur === 'TRY' ? `${s} ₺` : `${s} ${cur}`
}

function parseLocalDate(iso: string) {
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? null : d
}

function daysUntilDue(dueIso: string) {
  const d = parseLocalDate(dueIso)
  if (!d) return null
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

function statusCellText(r: PortfolioCheckRow): string {
  if (r.status === 'to_bank') {
    const b = r.bank_send_bank_name?.trim()
    return b ? `${STATUS_LABEL.to_bank} (${b})` : STATUS_LABEL.to_bank
  }
  return STATUS_LABEL[r.status]
}

/** Ortak modern onay kartı (react-hot-toast) */
function showPortfolioConfirm(opts: {
  title: string
  subtitle?: string
  body: ReactNode
  confirmLabel: string
  headerTone: 'teal' | 'rose' | 'slate'
  confirmTone: 'emerald' | 'rose'
  onConfirm: () => void
}) {
  const headerGrad =
    opts.headerTone === 'rose'
      ? 'from-rose-600 to-red-600'
      : opts.headerTone === 'slate'
        ? 'from-slate-700 to-slate-900'
        : 'from-teal-600 to-emerald-600'
  const btnGrad =
    opts.confirmTone === 'rose'
      ? 'from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
      : 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'

  toast.custom(
    (t) => (
      <div className="pointer-events-auto w-[min(100vw-1.5rem,26rem)] max-h-[min(90vh,36rem)] overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-black/5">
        <div className={`bg-gradient-to-r ${headerGrad} px-4 py-3`}>
          <p className="text-sm font-semibold text-white">{opts.title}</p>
          {opts.subtitle ? <p className="mt-0.5 text-xs leading-snug text-white/90">{opts.subtitle}</p> : null}
        </div>
        <div className="px-4 py-3">
          <div className="text-sm leading-relaxed text-slate-700">{opts.body}</div>
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              onClick={() => toast.dismiss(t.id)}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className={`rounded-xl bg-gradient-to-r px-3 py-2 text-xs font-semibold text-white shadow-md transition ${btnGrad}`}
              onClick={() => {
                toast.dismiss(t.id)
                opts.onConfirm()
              }}
            >
              {opts.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    ),
    { duration: Infinity, position: 'top-center' }
  )
}

type CashAccount = { id: string; name: string; type: string; currency: string; balance: number; is_active?: boolean }

export default function CekPortfoyuPage() {
  const [tab, setTab] = useState('portfolio')
  const [rows, setRows] = useState<PortfolioCheckRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [accounts, setAccounts] = useState<CashAccount[]>([])
  /** İşlemler menüsü: tablo overflow kesmesin diye fixed konum */
  const [actionMenu, setActionMenu] = useState<{ row: PortfolioCheckRow; top: number; left: number } | null>(null)

  const [collectOpen, setCollectOpen] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)
  const [factoringOpen, setFactoringOpen] = useState(false)
  const [activeCheck, setActiveCheck] = useState<PortfolioCheckRow | null>(null)

  const [collectAccountId, setCollectAccountId] = useState('')
  const [collectDate, setCollectDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [collectNotes, setCollectNotes] = useState('')

  const [bankName, setBankName] = useState('')
  const [bankDate, setBankDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [bankNotes, setBankNotes] = useState('')

  const [facTl, setFacTl] = useState('')
  const [facExpense, setFacExpense] = useState('')
  const [facExpenseItemKey, setFacExpenseItemKey] = useState('')
  const [facNotes, setFacNotes] = useState('')
  const [masrafGroups, setMasrafGroups] = useState<MasrafGroup[]>([])
  const [facDate, setFacDate] = useState(() => new Date().toISOString().slice(0, 10))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/portfolio-checks?tab=${encodeURIComponent(tab)}`)
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Yüklenemedi')
      setRows(Array.isArray(j.checks) ? j.checks : [])
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Yüklenemedi')
      setRows([])
    } finally {
      setLoading(false)
      setPage(1)
    }
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setActionMenu(null)
  }, [tab])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/accounts')
        if (!res.ok) return
        const data = await res.json()
        setAccounts(Array.isArray(data) ? data.filter((a: CashAccount) => a.is_active !== false) : [])
      } catch {
        /* ignore */
      }
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/expense-items')
        if (!res.ok) return
        const j = await res.json().catch(() => ({}))
        if (Array.isArray(j.groups)) setMasrafGroups(j.groups)
      } catch {
        /* ignore */
      }
    })()
  }, [])

  useEffect(() => {
    if (!actionMenu) return
    const close = () => setActionMenu(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [actionMenu])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    let list = rows
    if (s) {
      list = list.filter((r) => {
        const ds = `${r.debtor_name} ${r.due_date} ${r.received_date} ${r.check_number ?? ''} ${r.bank_name ?? ''}`
        return ds.toLowerCase().includes(s)
      })
    }
    return list
  }, [rows, q])

  const stats = useMemo(() => {
    const n = filtered.length
    const total = filtered.reduce((a, r) => a + Number(r.amount), 0)
    let avgDue: Date | null = null
    if (filtered.length) {
      const sumMs = filtered.reduce((acc, r) => {
        const d = parseLocalDate(r.due_date)
        return acc + (d ? d.getTime() : 0)
      }, 0)
      avgDue = new Date(sumMs / filtered.length)
    }
    return { n, total, avgDue }
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageSlice = filtered.slice((page - 1) * pageSize, page * pageSize)

  const closeActionMenu = () => setActionMenu(null)

  const toggleActionMenu = (e: React.MouseEvent<HTMLButtonElement>, r: PortfolioCheckRow) => {
    const MENU_W = 280
    const rect = e.currentTarget.getBoundingClientRect()
    if (actionMenu?.row.id === r.id) {
      setActionMenu(null)
      return
    }
    setActionMenu({
      row: r,
      top: rect.bottom + 6,
      left: Math.max(8, rect.right - MENU_W),
    })
  }

  const openCollect = (c: PortfolioCheckRow) => {
    setActiveCheck(c)
    setCollectAccountId('')
    setCollectDate(new Date().toISOString().slice(0, 10))
    setCollectNotes(c.description || '')
    setCollectOpen(true)
    closeActionMenu()
  }

  const openBank = (c: PortfolioCheckRow) => {
    setActiveCheck(c)
    setBankName('')
    setBankDate(new Date().toISOString().slice(0, 10))
    setBankNotes(c.description || '')
    setBankOpen(true)
    closeActionMenu()
  }

  const openFactoring = (c: PortfolioCheckRow) => {
    setActiveCheck(c)
    setFacTl(numberToTrInputString(Number(c.amount)))
    setFacExpense('')
    setFacExpenseItemKey('')
    setFacNotes('')
    setFacDate(new Date().toISOString().slice(0, 10))
    setCollectAccountId('')
    setFactoringOpen(true)
    closeActionMenu()
  }

  const submitCollect = async () => {
    if (!activeCheck || !collectAccountId) {
      toast.error('Hesap seçin')
      return
    }
    try {
      const res = await fetch(`/api/portfolio-checks/${activeCheck.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'collect',
          collection_account_id: collectAccountId,
          collection_date: collectDate,
          collection_notes: collectNotes || null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Kaydedilemedi')
      toast.success('Tahsilat kaydedildi')
      setCollectOpen(false)
      void load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Hata')
    }
  }

  const submitBank = async () => {
    if (!activeCheck || !bankName.trim()) {
      toast.error('Banka adı girin')
      return
    }
    try {
      const res = await fetch(`/api/portfolio-checks/${activeCheck.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'to_bank',
          bank_send_bank_name: bankName.trim(),
          bank_send_date: bankDate,
          bank_send_notes: bankNotes || null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Kaydedilemedi')
      toast.success('Çek bankaya gönderildi olarak işaretlendi')
      setBankOpen(false)
      void load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Hata')
    }
  }

  const submitFactoring = async () => {
    if (!activeCheck || !collectAccountId) {
      toast.error('Tahsilat hesabını seçin')
      return
    }
    const tl = parseTrNumberInput(facTl)
    if (!Number.isFinite(tl) || tl <= 0) {
      toast.error('Geçerli TL karşılığı girin')
      return
    }
    const expParsed = facExpense ? parseTrNumberInput(facExpense) : NaN
    const expenseAmt = Number.isFinite(expParsed) && expParsed > 0 ? expParsed : 0
    if (expenseAmt > 0 && !facExpenseItemKey.trim()) {
      toast.error('Masraf kesintisi için masraf kalemi seçin')
      return
    }
    try {
      const res = await fetch(`/api/portfolio-checks/${activeCheck.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'factoring',
          collection_account_id: collectAccountId,
          collection_date: facDate,
          factoring_tl_amount: tl,
          factoring_expense: expenseAmt,
          factoring_expense_item_key: expenseAmt > 0 ? facExpenseItemKey.trim() : null,
          factoring_notes: facNotes || null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Kaydedilemedi')
      toast.success('Faktoring tahsilatı kaydedildi')
      setFactoringOpen(false)
      void load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Hata')
    }
  }

  const performCancelCheck = async (c: PortfolioCheckRow) => {
    const loadingId = toast.loading('İşleniyor…')
    try {
      const res = await fetch(`/api/portfolio-checks/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const j = await res.json().catch(() => ({}))
      toast.dismiss(loadingId)
      if (!res.ok) throw new Error(j.error || 'İptal edilemedi')
      toast.success('Çek iptal edildi')
      void load()
    } catch (e: unknown) {
      toast.dismiss(loadingId)
      toast.error(e instanceof Error ? e.message : 'Hata')
    }
  }

  const promptCancelCheck = (c: PortfolioCheckRow) => {
    closeActionMenu()
    showPortfolioConfirm({
      title: 'Çeki iptal et',
      subtitle: 'Bu işlem geri alınamaz.',
      body: (
        <div className="space-y-2">
          <p>
            <span className="font-semibold text-slate-900">{c.debtor_name}</span>
            <span className="text-slate-600"> — {formatMoney(Number(c.amount), c.currency)}</span>
          </p>
          <p className="text-xs text-slate-600">Bu çeki iptal etmek istediğinize emin misiniz?</p>
        </div>
      ),
      confirmLabel: 'Evet, iptal et',
      headerTone: 'rose',
      confirmTone: 'rose',
      onConfirm: () => void performCancelCheck(c),
    })
  }

  const performBounceCheck = async (c: PortfolioCheckRow) => {
    const loadingId = toast.loading('İşleniyor…')
    try {
      const res = await fetch(`/api/portfolio-checks/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bounce' }),
      })
      const j = await res.json().catch(() => ({}))
      toast.dismiss(loadingId)
      if (!res.ok) throw new Error(j.error || 'Güncellenemedi')
      toast.success('Karşılıksız olarak kaydedildi')
      void load()
    } catch (e: unknown) {
      toast.dismiss(loadingId)
      toast.error(e instanceof Error ? e.message : 'Hata')
    }
  }

  const promptBounceCheck = (c: PortfolioCheckRow) => {
    closeActionMenu()
    showPortfolioConfirm({
      title: 'Karşılıksız işaretle',
      subtitle: 'Çek karşılıksız olarak kaydedilecek.',
      body: (
        <div className="space-y-2">
          <p>
            <span className="font-semibold text-slate-900">{c.debtor_name}</span>
            <span className="text-slate-600"> — {formatMoney(Number(c.amount), c.currency)}</span>
          </p>
          <p className="text-xs text-slate-600">Devam edilsin mi?</p>
        </div>
      ),
      confirmLabel: 'Evet, işaretle',
      headerTone: 'slate',
      confirmTone: 'rose',
      onConfirm: () => void performBounceCheck(c),
    })
  }

  const performRecallFromBank = async (c: PortfolioCheckRow) => {
    const loadingId = toast.loading('İşleniyor…')
    try {
      const res = await fetch(`/api/portfolio-checks/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recall_from_bank' }),
      })
      const j = await res.json().catch(() => ({}))
      toast.dismiss(loadingId)
      if (!res.ok) throw new Error(j.error || 'Geri alınamadı')
      toast.success('Çek portföye geri alındı')
      void load()
    } catch (e: unknown) {
      toast.dismiss(loadingId)
      toast.error(e instanceof Error ? e.message : 'Hata')
    }
  }

  const recallCheckFromBank = (c: PortfolioCheckRow) => {
    closeActionMenu()
    showPortfolioConfirm({
      title: 'Çeki geri al',
      subtitle: 'Bankaya verildi kaydı kaldırılacak',
      body: (
        <p>
          Çek bankadan geri alınır ve yalnızca <strong className="text-slate-900">portföyde</strong> görünür. Devam
          edilsin mi?
        </p>
      ),
      confirmLabel: 'Evet, geri al',
      headerTone: 'teal',
      confirmTone: 'emerald',
      onConfirm: () => void performRecallFromBank(c),
    })
  }

  const openCancelCollectionToast = (c: PortfolioCheckRow) => {
    closeActionMenu()
    showPortfolioConfirm({
      title: 'Tahsilat iptalini onaylayın',
      subtitle: 'Bu çek için yapılan tahsilat geri alınacak.',
      body: (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-200/90 bg-gradient-to-b from-amber-50 to-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-950 shadow-sm">
            <span className="font-semibold text-amber-950">Dikkat: </span>
            Yatırılan tutar, tahsilatta seçilen kasa veya banka hesabından düşülecek; çek durumu yeniden{' '}
            <strong>portföyde</strong> (veya önceden bankadaysa <strong>bankada</strong>) görünecek.
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Çek</p>
            <p className="mt-0.5 font-semibold text-slate-900">{c.debtor_name}</p>
            <p className="mt-1 text-sm font-bold text-emerald-800">{formatMoney(Number(c.amount), c.currency)}</p>
          </div>
          <p className="text-center text-xs font-medium text-slate-700">Tahsilatı iptal etmek istediğinize emin misiniz?</p>
        </div>
      ),
      confirmLabel: 'Evet, tahsilatı iptal et',
      headerTone: 'teal',
      confirmTone: 'rose',
      onConfirm: () => void performCancelCollection(c),
    })
  }

  const performCancelCollection = async (c: PortfolioCheckRow) => {
    const loadingId = toast.loading('İşleniyor…')
    try {
      const res = await fetch(`/api/portfolio-checks/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_collection' }),
      })
      const j = await res.json().catch(() => ({}))
      toast.dismiss(loadingId)
      if (!res.ok) throw new Error(j.error || 'İptal edilemedi')
      toast.success('Tahsilat iptal edildi; tutar hesaptan geri alındı')
      void load()
    } catch (e: unknown) {
      toast.dismiss(loadingId)
      toast.error(e instanceof Error ? e.message : 'Hata')
    }
  }

  const tryAccounts = accounts.filter((a) => isOdemeHesabi(a.type))

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Çek Portföyü</h1>
      <p className="text-sm text-slate-600">
        Müşteriden alınan çekler cari «Çek Girişi» ile kayda geçer; buradan tahsilat, bankaya gönderme ve faktoring işlemlerini
        yapabilirsiniz. Tedarikçiye ödeme sırasında portföydeki çeki ciro edebilir veya kendi çekinizi yazabilirsiniz.
      </p>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-t-md px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              tab === t.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-500 text-white">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-rose-900/80">Çek sayısı</p>
            <p className="text-xl font-bold text-rose-950">{stats.n}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-500 text-white">
            <Banknote className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-sky-900/80">Toplam tutar</p>
            <p className="truncate text-lg font-bold text-sky-950">{formatMoney(stats.total)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-emerald-900/80">Ortalama vade</p>
            <p className="text-sm font-bold text-emerald-950">
              {stats.avgDue ? stats.avgDue.toLocaleDateString('tr-TR') : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <span>Bul:</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="isim, vade…"
              className="w-48 rounded border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-slate-900 sm:w-64"
            />
          </div>
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2.5">Borçlu</th>
                <th className="px-3 py-2.5">Alındığı tarih</th>
                <th className="px-3 py-2.5">Vadesi</th>
                <th className="px-3 py-2.5">Bankası</th>
                <th className="px-3 py-2.5">No</th>
                <th className="px-3 py-2.5">Açıklama</th>
                <th className="px-3 py-2.5 text-right">Tutar</th>
                <th className="px-3 py-2.5">Durum</th>
                <th className="px-3 py-2.5 w-[120px] text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    Yükleniyor…
                  </td>
                </tr>
              ) : pageSlice.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    Kayıt yok.
                  </td>
                </tr>
              ) : (
                pageSlice.map((r, idx) => {
                  const due = parseLocalDate(r.due_date)
                  const overdue = due && due < new Date(new Date().toISOString().slice(0, 10) + 'T12:00:00')
                  const days = daysUntilDue(r.due_date)
                  return (
                    <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="px-3 py-2 font-medium text-slate-900">{r.debtor_name}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {parseLocalDate(r.received_date)?.toLocaleDateString('tr-TR') ?? '—'}
                      </td>
                      <td className={`px-3 py-2 font-medium ${overdue ? 'text-red-600' : 'text-slate-800'}`}>
                        {parseLocalDate(r.due_date)?.toLocaleDateString('tr-TR') ?? '—'}
                        {days != null && (
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            ({days >= 0 ? '+' : ''}
                            {days} gün)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{r.bank_name || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{r.check_number || '—'}</td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-slate-600">{r.description || '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatMoney(Number(r.amount), r.currency)}</td>
                      <td className="max-w-[220px] px-3 py-2 text-xs font-semibold leading-snug text-slate-700">
                        {statusCellText(r)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.status === 'portfolio' || r.status === 'to_bank' || r.status === 'paid' ? (
                          <button
                            type="button"
                            onClick={(e) => toggleActionMenu(e, r)}
                            className={`inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition ${
                              actionMenu?.row.id === r.id
                                ? 'border-sky-400 bg-[#E1F5FE] text-slate-900'
                                : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            İşlemler
                            <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
            <span>
              {filtered.length} kayıttan {Math.min((page - 1) * pageSize + 1, filtered.length)} –{' '}
              {Math.min(page * pageSize, filtered.length)} arası
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-200 px-2 py-1 font-medium disabled:opacity-40"
              >
                Önceki
              </button>
              <span className="px-2 font-semibold">{page}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-slate-200 px-2 py-1 font-medium disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {actionMenu && (
        <>
          <div className="fixed inset-0 z-[90]" aria-hidden onClick={closeActionMenu} />
          <div
            role="menu"
            className="fixed z-[100] w-[280px] overflow-hidden rounded border border-sky-300/90 bg-[#E1F5FE] py-1 shadow-md"
            style={{ top: actionMenu.top, left: actionMenu.left }}
          >
            {actionMenu.row.status === 'paid' ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2.5 text-left text-sm font-normal text-slate-900 hover:bg-sky-200/80"
                onClick={() => openCancelCollectionToast(actionMenu.row)}
              >
                Çekin tahsilatını iptal et
              </button>
            ) : actionMenu.row.status === 'portfolio' ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2.5 text-left text-sm font-normal text-slate-900 hover:bg-sky-200/80"
                  onClick={() => openCollect(actionMenu.row)}
                >
                  Çeki tahsil et
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2.5 text-left text-sm font-normal text-slate-900 hover:bg-sky-200/80"
                  onClick={() => openBank(actionMenu.row)}
                >
                  Çeki bankaya gönder
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2.5 text-left text-sm font-normal text-slate-900 hover:bg-sky-200/80"
                  onClick={() => openFactoring(actionMenu.row)}
                >
                  Faktoring ile tahsil et
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2.5 text-left text-sm font-normal text-slate-900 hover:bg-sky-200/80"
                  onClick={() => promptCancelCheck(actionMenu.row)}
                >
                  Çeki iptal et
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2.5 text-left text-sm font-normal text-slate-900 hover:bg-sky-200/80"
                  onClick={() => promptBounceCheck(actionMenu.row)}
                >
                  «Karşılıksız» olarak işaretle
                </button>
              </>
            ) : actionMenu.row.status === 'to_bank' ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2.5 text-left text-sm font-normal text-slate-900 hover:bg-sky-200/80"
                  onClick={() => openCollect(actionMenu.row)}
                >
                  Çeki tahsil et
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2.5 text-left text-sm font-normal text-slate-900 hover:bg-sky-200/80"
                  onClick={() => recallCheckFromBank(actionMenu.row)}
                >
                  Çeki geri al
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2.5 text-left text-sm font-normal text-slate-900 hover:bg-sky-200/80"
                  onClick={() => promptCancelCheck(actionMenu.row)}
                >
                  Çeki iptal et
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2.5 text-left text-sm font-normal text-slate-900 hover:bg-sky-200/80"
                  onClick={() => promptBounceCheck(actionMenu.row)}
                >
                  «Karşılıksız» olarak işaretle
                </button>
              </>
            ) : null}
          </div>
        </>
      )}

      <p className="text-xs text-slate-400">{new Date().getFullYear()} © Mikro Muhasebe</p>

      {/* Tahsilat */}
      {collectOpen && activeCheck && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setCollectOpen(false)}>
          <div
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between bg-teal-600 px-4 py-3">
              <h2 className="text-base font-semibold text-white">Tahsilat</h2>
              <button type="button" className="text-white hover:bg-white/10 rounded p-1" onClick={() => setCollectOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{activeCheck.debtor_name}</span> — {formatMoney(Number(activeCheck.amount), activeCheck.currency)}
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-700">Tahsilat tarihi</label>
                <input
                  type="date"
                  value={collectDate}
                  onChange={(e) => setCollectDate(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Kasa / hesap *</label>
                <select
                  value={collectAccountId}
                  onChange={(e) => setCollectAccountId(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Tahsilat hesabını seçin</option>
                  {tryAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({accountTypeLabel(a.type)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Açıklama</label>
                <textarea
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCollectOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => void submitCollect()}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" />
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bankaya gönder */}
      {bankOpen && activeCheck && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setBankOpen(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-teal-600 px-4 py-3">
              <h2 className="text-base font-semibold text-white">Banka seçin</h2>
              <button type="button" className="text-white hover:bg-white/10 rounded p-1" onClick={() => setBankOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Tahsile verilen banka *</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Örn: Akbank"
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Tarih</label>
                <input
                  type="date"
                  value={bankDate}
                  onChange={(e) => setBankDate(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Açıklama</label>
                <textarea
                  value={bankNotes}
                  onChange={(e) => setBankNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setBankOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => void submitBank()}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  <Check className="h-4 w-4" />
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Faktoring */}
      {factoringOpen && activeCheck && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setFactoringOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-teal-500 px-4 py-3">
              <h2 className="text-base font-semibold text-white">Faktoring yoluyla tahsilat</h2>
              <button type="button" className="text-white hover:bg-white/10 rounded p-1" onClick={() => setFactoringOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[80vh] space-y-3 overflow-y-auto p-4">
              <p className="text-sm text-slate-600">
                Çek tutarı: <strong>{formatMoney(Number(activeCheck.amount), activeCheck.currency)}</strong>
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-700">Tahsilat tarihi</label>
                <input
                  type="date"
                  value={facDate}
                  onChange={(e) => setFacDate(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">TL karşılığı (hesaba geçecek net) *</label>
                <TrNumberInput value={facTl} onChange={setFacTl} className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Masraf kesintisi</label>
                <TrNumberInput value={facExpense} onChange={setFacExpense} className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Masraf kalemi (kesinti varsa)</label>
                <select
                  value={facExpenseItemKey}
                  onChange={(e) => setFacExpenseItemKey(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
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
                  className="mt-1 inline-block text-xs font-medium text-teal-700 hover:text-teal-900 hover:underline"
                >
                  Masraf kalemlerini düzenle
                </Link>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  Kesinti tutarı girildiğinde kalem seçmeniz gerekir; kayıt Genel Masraflar listesine düşer (tutar zaten net
                  tahsilata yansır).
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Paranın yatacağı kasa / banka *</label>
                <select
                  value={collectAccountId}
                  onChange={(e) => setCollectAccountId(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Seçin</option>
                  {tryAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({accountTypeLabel(a.type)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Açıklama</label>
                <textarea
                  value={facNotes}
                  onChange={(e) => setFacNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setFactoringOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => void submitFactoring()}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  <Check className="h-4 w-4" />
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
