'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  CreditCard,
  Banknote,
  Calculator,
  Trash2,
  X,
  History,
  ChevronDown,
  MoreVertical,
  Edit2,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Printer,
  Pencil,
  Plus,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'
import TediyeMakbuzu, { type TediyeMakbuzuData } from '@/components/expenses/TediyeMakbuzu'
import TrNumberInput from '@/components/ui/TrNumberInput'
import { numberToTrInputString, parseTrNumberInput } from '@/lib/tr-number-input'
import { formatPaymentAccountOptionLabel, groupPaymentAccounts } from '@/lib/payment-account-options'

interface Account {
  id: string
  name: string
  type: string // DB account_type: cash | bank | pos | other
  currency: string // 'TRY', 'USD', 'EUR'
  balance: number
  is_active: boolean
  bank_name?: string | null
  iban?: string | null
  credit_limit?: number | null
}

interface AccountTransaction {
  id: string
  account_id: string
  type: 'inflow' | 'outflow' | 'transfer_in' | 'transfer_out'
  amount: number
  currency: string
  description: string
  transaction_date: string
  balance_after: number
  source?: 'customer' | 'supplier' | 'manual'
}

function receiptNumberFromLineId(id: string): string {
  const hex = id.replace(/-/g, '')
  let h = 0
  for (let i = 0; i < hex.length; i++) h = (h * 31 + hex.charCodeAt(i)) >>> 0
  return String(100000000 + (h % 900000000))
}

function isTransferRow(t: AccountTransaction) {
  return t.type === 'transfer_in' || t.type === 'transfer_out'
}

function printDocumentTitle(t: AccountTransaction): string {
  if (t.source === 'customer') return 'TAHSİLAT'
  if (t.source === 'supplier') return 'TEDİYE MAKBUZU'
  if (isTransferRow(t)) return 'VİRMAN FİŞİ'
  return 'KASA FİŞİ'
}

function buildAccountLinePrintData(t: AccountTransaction, accountName: string): TediyeMakbuzuData {
  const amt = Number(t.amount)
  const cur = t.currency || 'TRY'
  const dateIso = String(t.transaction_date).slice(0, 10)
  return {
    receiptNo: receiptNumberFromLineId(t.id),
    transactionDateIso: dateIso,
    paymentLabel: accountName,
    description: t.description || '—',
    amount: amt,
    currency: cur,
    payerName: '—',
    qrPayload: `MikroMuhasebe|HesapHareket|${t.id}|${amt}|${dateIso}`,
    documentTitle: printDocumentTitle(t),
  }
}

export default function AccountDetailPage() {
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string

  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<AccountTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modals state
  const [showInflowModal, setShowInflowModal] = useState(false)
  const [showOutflowModal, setShowOutflowModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showEditAccountModal, setShowEditAccountModal] = useState(false)

  const [actionMenu, setActionMenu] = useState<{ row: AccountTransaction; top: number; left: number } | null>(null)
  const [printPayload, setPrintPayload] = useState<TediyeMakbuzuData | null>(null)
  const [editLineModal, setEditLineModal] = useState<AccountTransaction | null>(null)
  const [editLineForm, setEditLineForm] = useState({ description: '', transaction_date: '', amountStr: '' })
  const [editLineSaving, setEditLineSaving] = useState(false)
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  // Dropdowns
  const [showOtherMenu, setShowOtherMenu] = useState(false)
  
  // Forms
  const [txForm, setTxForm] = useState({
    type: 'inflow',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    target_account_id: ''
  })

  const [formData, setFormData] = useState({
    name: '', type: 'bank', currency: 'TRY', bank_name: '', iban: '', credit_limit: 0, is_active: true
  })

  // Dummy target accounts for transfer
  const [targetAccounts, setTargetAccounts] = useState<Account[]>([])

  useEffect(() => {
    if (accountId) {
      fetchAccountData()
      fetchTransactions()
      fetchAllAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca hesap değişince yükle
  }, [accountId])

  useEffect(() => {
    if (!printPayload) return
    const timer = window.setTimeout(() => window.print(), 450)
    const onAfter = () => setPrintPayload(null)
    window.addEventListener('afterprint', onAfter)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', onAfter)
    }
  }, [printPayload])

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

  const fetchAccountData = async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`)
      if (response.ok) {
        const current = await response.json()
        setAccount(current)
        setFormData({
          name: current.name, type: current.type, currency: current.currency,
          bank_name: current.bank_name || '', iban: current.iban || '',
          credit_limit: current.credit_limit || 0, is_active: current.is_active
        })
      } else {
        // Mock data if API fails
        const mockAccount = mockAccounts.find(a => a.id === accountId) || mockAccounts[0]
        setAccount(mockAccount)
        setFormData({
          name: mockAccount.name, type: mockAccount.type, currency: mockAccount.currency,
          bank_name: mockAccount.bank_name || '', iban: mockAccount.iban || '',
          credit_limit: mockAccount.credit_limit || 0, is_active: mockAccount.is_active
        })
      }
    } catch (_error) {
      console.error(_error)
    } finally { 
      setLoading(false) 
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/account-transactions?account_id=${accountId}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(Array.isArray(data) ? data : [])
      } else {
        setTransactions([])
        const err = await response.json().catch(() => ({}))
        console.error('Hesap hareketleri yüklenemedi', err?.error || response.status)
      }
    } catch (_error) {
      console.error(_error)
      setTransactions([])
    }
  }

  const fetchAllAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setTargetAccounts(Array.isArray(data) ? data.filter((a: Account) => a.id !== accountId) : [])
      } else {
        setTargetAccounts(mockAccounts.filter(a => a.id !== accountId))
      }
    } catch {
      setTargetAccounts(mockAccounts.filter(a => a.id !== accountId))
    }
  }

  const handleTransactionSubmit = async (e: React.FormEvent, isTransfer = false) => {
    e.preventDefault(); setSaving(true)
    try {
      const amt = parseTrNumberInput(txForm.amount)
      if (!Number.isFinite(amt) || amt <= 0) {
        toast.error('Geçerli tutar girin')
        setSaving(false)
        return
      }
      const payload = {
        account_id: accountId,
        type: txForm.type,
        amount: amt,
        currency: account?.currency || 'TRY',
        description: txForm.description,
        transaction_date: new Date(txForm.transaction_date).toISOString(),
        target_account_id: isTransfer ? txForm.target_account_id : null
      }
      
      const res = await fetch('/api/account-transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'İşlem kaydedilemedi')
      }
      
      toast.success('İşlem başarıyla eklendi!')
      resetTxForm()
      fetchTransactions()
      fetchAccountData()
    } catch (err: any) { 
      toast.error(err?.message || 'İşlem kaydedilemedi')
    } finally { 
      setSaving(false) 
    }
  }

  const resetTxForm = () => {
    setTxForm({ type: 'inflow', amount: '', description: '', transaction_date: new Date().toISOString().split('T')[0], target_account_id: '' })
    setShowInflowModal(false)
    setShowOutflowModal(false)
    setShowTransferModal(false)
  }

  const openLineEdit = (row: AccountTransaction) => {
    setActionMenu(null)
    setEditLineModal(row)
    const amt = Number(row.amount)
    setEditLineForm({
      description: row.description || '',
      transaction_date: String(row.transaction_date).slice(0, 10),
      amountStr: numberToTrInputString(amt, 2),
    })
  }

  const submitLineEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editLineModal || !account) return
    setEditLineSaving(true)
    try {
      const numAmt = parseTrNumberInput(editLineForm.amountStr)
      if (!Number.isFinite(numAmt) || numAmt <= 0) {
        toast.error('Geçerli tutar girin')
        return
      }
      const body: Record<string, unknown> = {
        line_id: editLineModal.id,
        description: editLineForm.description,
        transaction_date: editLineForm.transaction_date,
      }
      if (!isTransferRow(editLineModal)) {
        body.amount = numAmt
      }
      const res = await fetch('/api/account-transactions/by-line', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Güncellenemedi')
      toast.success('Hareket güncellendi')
      setEditLineModal(null)
      void fetchTransactions()
      void fetchAccountData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setEditLineSaving(false)
    }
  }

  const confirmDeleteLine = (row: AccountTransaction) => {
    setActionMenu(null)
    toast.custom(
      (t) => (
        <div
          className="pointer-events-auto max-w-sm rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5"
          role="dialog"
        >
          <p className="text-sm font-semibold text-gray-900">Bu hareketi silmek istiyor musunuz?</p>
          <p className="mt-1.5 text-xs text-gray-500">Hesap bakiyesi buna göre düzeltilir.</p>
          <div className="mt-4 flex justify-end gap-2">
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
                void performDeleteLine(row)
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

  const performDeleteLine = async (row: AccountTransaction) => {
    try {
      const res = await fetch(`/api/account-transactions/by-line?line_id=${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Silinemedi')
      toast.success('Hareket silindi')
      void fetchTransactions()
      void fetchAccountData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Silinemedi')
    }
  }

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Güncellenemedi')
      toast.success('Hesap bilgileri güncellendi!'); 
      setShowEditAccountModal(false); fetchAccountData()
    } catch {
      // Local mock fallback
      if (account) {
        setAccount({ ...account, ...formData, balance: account.balance })
      }
      toast.success('Hesap güncellendi! (Yerel Önizleme)')
      setShowEditAccountModal(false)
    } finally { 
      setSaving(false) 
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Bu hesabı silmek istediğinize emin misiniz?')) return
    try {
      const response = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Silinemedi')
      toast.success('Hesap silindi')
      router.push('/dashboard/hesaplarim')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Silinemedi'
      toast.error(msg)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full min-w-0 max-w-full justify-center overflow-x-hidden py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    )
  }
  if (!account) return null

  const getCurrencySymbol = (code: string = 'TRY') => {
    if (code === 'USD') return '$'
    if (code === 'EUR') return '€'
    return '₺'
  }

  const getAccountIcon = (type: string) => {
    if (type === 'cash' || type === 'kasa') return <Banknote className="h-8 w-8 text-emerald-600" />
    if (type === 'pos') return <Calculator className="h-8 w-8 text-amber-600" />
    if (type === 'other' || type === 'kredi_karti') return <CreditCard className="h-8 w-8 text-purple-600" />
    return <Building className="h-8 w-8 text-primary-600" />
  }

  const getAccountBg = (type: string) => {
    if (type === 'cash' || type === 'kasa') return 'bg-emerald-100 border-emerald-200'
    if (type === 'pos') return 'bg-amber-100 border-amber-200'
    if (type === 'other' || type === 'kredi_karti') return 'bg-purple-100 border-purple-200'
    return 'bg-primary-100 border-primary-200'
  }

  const toplamGiris = transactions.filter(t => t.type === 'inflow' || t.type === 'transfer_in').reduce((sum, t) => sum + Number(t.amount), 0)
  const toplamCikis = transactions.filter(t => t.type === 'outflow' || t.type === 'transfer_out').reduce((sum, t) => sum + Number(t.amount), 0)
  const groupedTargetAccounts = groupPaymentAccounts(targetAccounts, { onlyOdeme: false })

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-4">
      {/* Back & Header */}
      <div className="flex items-center justify-between mb-1">
        <button onClick={() => router.push('/dashboard/hesaplarim')} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"><ArrowLeft className="h-5 w-5" /></button>
        <div className="text-sm font-bold text-gray-400">Hesap Detayı</div>
      </div>

      {/* 1. Hesap Bilgileri Kutucuğu */}
      <Card className="bg-white shadow-sm border-gray-200 rounded-2xl overflow-hidden">
        <CardBody className="p-4">
          <div className="flex flex-col md:flex-row gap-5 items-start md:items-center">
            <div className={`p-4 rounded-2xl border shadow-sm flex-shrink-0 ${getAccountBg(account.type)}`}>
              {getAccountIcon(account.type)}
            </div>

            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">{account.name}</h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-widest">
                    {account.type === 'cash' || account.type === 'kasa'
                      ? 'Kasa'
                      : account.type === 'pos'
                        ? 'POS'
                        : account.type === 'other' || account.type === 'kredi_karti'
                          ? 'Kredi kartı / diğer'
                          : 'Banka Hesabı'}
                  </span>
                </div>
                {(account.type === 'bank' || account.type === 'banka') && account.bank_name && (
                  <p className="text-sm font-medium text-gray-500">{account.bank_name} {account.iban ? `- ${account.iban}` : ''}</p>
                )}
                {(account.type === 'other' || account.type === 'kredi_karti') && account.credit_limit && (
                  <p className="text-sm font-medium text-gray-500">Kart Limiti: {account.credit_limit.toLocaleString('tr-TR')} {getCurrencySymbol(account.currency)}</p>
                )}
              </div>

              <div className="space-y-1 lg:col-span-2 flex flex-col items-start lg:items-end justify-center">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Para Birimi</p>
                 <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-gray-900">{account.currency}</span>
                    <span className="text-sm font-bold text-gray-500">({getCurrencySymbol(account.currency)})</span>
                 </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 2. Three Metric Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg border-0 transform transition-all hover:scale-[1.02]">
          <CardBody className="p-5">
            <div className="flex justify-between items-start">
              <h3 className="text-primary-100 font-bold text-xs uppercase tracking-wider">Güncel Bakiye</h3>
              <div className="p-1.5 bg-gray-100 rounded-xl backdrop-blur-sm"><Scale className="h-4 w-4 text-white" /></div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black tracking-tight">{account.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
              <div className="text-primary-200 font-bold text-sm mt-1">{getCurrencySymbol(account.currency)}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200 transform transition-all hover:scale-[1.02]">
          <CardBody className="p-5">
            <div className="flex justify-between items-start">
              <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider">Toplam Giriş (Tahsilat)</h3>
              <div className="p-1.5 bg-emerald-50 rounded-xl"><ArrowDownRight className="h-4 w-4 text-emerald-500" /></div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-600 tracking-tight">{toplamGiris.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
              <div className="text-gray-400 font-bold text-sm mt-1">{getCurrencySymbol(account.currency)}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200 transform transition-all hover:scale-[1.02]">
          <CardBody className="p-5">
            <div className="flex justify-between items-start">
              <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider">Toplam Çıkış (Ödeme)</h3>
              <div className="p-1.5 bg-red-50 rounded-xl"><ArrowUpRight className="h-4 w-4 text-red-500" /></div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-red-600 tracking-tight">{toplamCikis.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
              <div className="text-gray-400 font-bold text-sm mt-1">{getCurrencySymbol(account.currency)}</div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 3. 4 Action Boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* Para Girişi */}
        <button onClick={() => { setTxForm({...txForm, type: 'inflow'}); setShowInflowModal(true); }} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition-all group shadow-sm">
          <div className="p-3 bg-emerald-100/50 rounded-full group-hover:bg-emerald-200/50 transition-colors mb-2"><ArrowDownRight className="h-6 w-6 text-emerald-600" /></div>
          <span className="font-bold text-sm text-gray-900 group-hover:text-emerald-700">Para Girişi</span>
        </button>

        {/* Para Çıkışı */}
        <button onClick={() => { setTxForm({...txForm, type: 'outflow'}); setShowOutflowModal(true); }} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-red-300 hover:bg-red-50 transition-all group shadow-sm">
          <div className="p-3 bg-red-100/50 rounded-full group-hover:bg-red-200/50 transition-colors mb-2"><ArrowUpRight className="h-6 w-6 text-red-600" /></div>
          <span className="font-bold text-sm text-gray-900 group-hover:text-red-700">Para Çıkışı</span>
        </button>

        {/* Virman / Transfer */}
        <button onClick={() => { setTxForm({...txForm, type: 'outflow', target_account_id: targetAccounts[0]?.id || ''}); setShowTransferModal(true); }} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-primary-300 hover:bg-primary-50 transition-all group shadow-sm">
          <div className="p-3 bg-primary-100/50 rounded-full group-hover:bg-primary-100/50 transition-colors mb-2"><ArrowRightLeft className="h-6 w-6 text-primary-600" /></div>
          <span className="font-bold text-sm text-gray-900 group-hover:text-primary-700">Transfer / Virman</span>
        </button>

        {/* Diğer İşlemler (Accordion/Dropdown) */}
        <div className="relative h-full">
          <button onClick={() => setShowOtherMenu(!showOtherMenu)} className={`w-full h-full flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 transition-all group shadow-sm ${showOtherMenu ? 'border-gray-300 bg-gray-50' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}>
            <div className={`p-3 rounded-full transition-colors mb-2 ${showOtherMenu ? 'bg-gray-200' : 'bg-gray-100 group-hover:bg-gray-200'}`}><MoreVertical className="h-6 w-6 text-gray-600" /></div>
            <div className="flex items-center gap-1 font-bold text-sm text-gray-900 group-hover:text-gray-700">Diğer İşlemler <ChevronDown className="h-3.5 w-3.5" /></div>
          </button>

          {showOtherMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowOtherMenu(false)} />
              <div className="absolute top-full right-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <button onClick={() => { setShowOtherMenu(false); setShowEditAccountModal(true); }} className="w-full text-left px-4 py-3 font-bold text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50"><Edit2 className="h-4 w-4" /> Hesabı Düzenle</button>
                <button onClick={() => { setShowOtherMenu(false); handleDeleteAccount(); }} className="w-full text-left px-4 py-3 font-bold text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"><Trash2 className="h-4 w-4" /> Hesabı Sil</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. List: Hesap Hareketleri */}
      <Card className="shadow-sm border-gray-200 mt-4">
        <CardHeader className="bg-gray-50/50 border-b py-4">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2"><History className="h-5 w-5 text-primary-500" /> Hesap Hareketleri</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-emerald-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Tarih</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">İşlem Tipi</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Açıklama</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Tutar</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Bakiye</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider w-[120px]">İşlem</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {transactions.length > 0 ? transactions.map(t => {
                  const isInflow = t.type === 'inflow' || t.type === 'transfer_in'
                  return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{new Date(t.transaction_date).toLocaleDateString('tr-TR')}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isInflow ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {t.type === 'inflow' ? 'Para Girişi' : t.type === 'outflow' ? 'Para Çıkışı' : t.type === 'transfer_in' ? 'Transfer Girişi' : 'Transfer Çıkışı'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 truncate max-w-[200px]">{t.description}</td>
                    <td className={`px-4 py-4 text-sm font-bold text-right whitespace-nowrap ${isInflow ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isInflow ? '+' : '-'}{Number(t.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(account.currency)}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-gray-900 text-right whitespace-nowrap bg-gray-50/50">
                      {Number(t.balance_after).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(account.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        data-account-line-action
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const MENU_W = 200
                          setActionMenu((m) =>
                            m?.row.id === t.id
                              ? null
                              : {
                                  row: t,
                                  top: rect.bottom + 6,
                                  left: Math.max(8, rect.right - MENU_W),
                                }
                          )
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-200/90 bg-amber-50/95 px-2.5 py-1.5 text-xs font-semibold text-amber-950 shadow-sm hover:bg-amber-100"
                      >
                        İşlem
                        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                      </button>
                    </td>
                  </tr>
                )}) : <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500 italic">Henüz hesap hareketi bulunmuyor.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <input
        ref={attachmentInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf"
        onChange={() => {
          toast('Belge ekleme bu ekran için yakında kullanılabilir olacaktır.', { duration: 3500 })
          if (attachmentInputRef.current) attachmentInputRef.current.value = ''
        }}
      />

      {actionMenu &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[90]" aria-hidden onClick={() => setActionMenu(null)} />
            <div
              role="menu"
              className="fixed z-[100] w-[min(calc(100vw-16px),220px)] overflow-hidden rounded-lg border border-amber-200 bg-amber-50 py-0.5 shadow-xl ring-1 ring-amber-900/10"
              style={{ top: actionMenu.top, left: actionMenu.left }}
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 border-b border-amber-200/70 px-3 py-2.5 text-left text-sm font-medium text-gray-900 hover:bg-amber-100/90"
                onClick={() => {
                  if (!account) return
                  setPrintPayload(buildAccountLinePrintData(actionMenu.row, account.name))
                  setActionMenu(null)
                }}
              >
                <Printer className="h-4 w-4 shrink-0 text-neutral-800" strokeWidth={2} />
                Yazdır
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 border-b border-amber-200/70 px-3 py-2.5 text-left text-sm font-medium text-gray-900 hover:bg-amber-100/90"
                onClick={() => openLineEdit(actionMenu.row)}
              >
                <Pencil className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2} />
                Düzenle
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 border-b border-amber-200/70 px-3 py-2.5 text-left text-sm font-medium text-red-700 hover:bg-red-50/90"
                onClick={() => {
                  const row = actionMenu.row
                  setActionMenu(null)
                  if (isTransferRow(row)) {
                    toast.error('Virman satırı buradan silinemez.')
                    return
                  }
                  confirmDeleteLine(row)
                }}
              >
                <X className="h-4 w-4 shrink-0 text-red-600" strokeWidth={2.5} />
                Sil
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-gray-900 hover:bg-amber-100/90"
                onClick={() => {
                  setActionMenu(null)
                  requestAnimationFrame(() => attachmentInputRef.current?.click())
                }}
              >
                <Plus className="h-4 w-4 shrink-0 text-neutral-800" strokeWidth={2} />
                Belge Ekle
              </button>
            </div>
          </>,
          document.body
        )}

      {/* --- MODALS --- */}

      {editLineModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]" onClick={() => !editLineSaving && setEditLineModal(null)}>
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="edit-line-title"
          >
            <div className="flex items-center justify-between bg-teal-600 px-5 py-4">
              <h2 id="edit-line-title" className="text-base font-bold text-white">
                Kasa/Hesap Hareketi Güncelleme
              </h2>
              <button
                type="button"
                disabled={editLineSaving}
                className="rounded-lg p-1.5 text-white/90 hover:bg-gray-100 disabled:opacity-40"
                onClick={() => setEditLineModal(null)}
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitLineEdit} className="space-y-4 px-5 py-5">
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-950">
                Önceden kaydettiğiniz bir hareketin <strong>tarih</strong>, <strong>açıklama</strong> ve{' '}
                <strong>tutar</strong> bilgilerini değiştirebilirsiniz. Bunların dışında bir bilgi değiştirmek için
                (kasa hesabı, masraf hesabı vs.) işlemi iptal edip tekrar girin.
                {isTransferRow(editLineModal) ? (
                  <span className="mt-2 block font-semibold">Virman satırlarında tutar değiştirilemez.</span>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Açıklama</label>
                <textarea
                  value={editLineForm.description}
                  onChange={(e) => setEditLineForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">İşlem Tarihi</label>
                <input
                  type="date"
                  value={editLineForm.transaction_date}
                  onChange={(e) => setEditLineForm((f) => ({ ...f, transaction_date: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Tutar</label>
                <TrNumberInput
                  value={editLineForm.amountStr}
                  onChange={(v) => setEditLineForm((f) => ({ ...f, amountStr: v }))}
                  disabled={isTransferRow(editLineModal)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold tabular-nums outline-none focus:border-teal-500 disabled:bg-gray-100 disabled:text-gray-500"
                  required={!isTransferRow(editLineModal)}
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={editLineSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-red-700 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  {editLineSaving ? 'Kaydediliyor…' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {printPayload && (
        <>
          <style
            dangerouslySetInnerHTML={{
              __html: `
              @media screen {
                #account-line-print-root { display: none !important; }
              }
              @media print {
                body * { visibility: hidden !important; }
                #account-line-print-root, #account-line-print-root * { visibility: visible !important; }
                #account-line-print-root {
                  display: block !important;
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                }
              }
            `,
            }}
          />
          <div id="account-line-print-root" aria-hidden>
            <TediyeMakbuzu data={printPayload} />
          </div>
        </>
      )}

      {/* Para Girişi Modalı */}
      {showInflowModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <Card className="w-full max-w-lg shadow-2xl rounded-3xl border-0">
            <CardHeader className="bg-emerald-600 text-white rounded-t-3xl py-5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2"><ArrowDownRight className="h-5 w-5" /> Para Girişi (Tahsilat)</CardTitle>
              <button onClick={() => setShowInflowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-all"><X className="h-5 w-5 text-white" /></button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={e => handleTransactionSubmit(e)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase px-1">Tarih</label>
                    <input type="date" required value={txForm.transaction_date} onChange={e => setTxForm({...txForm, transaction_date: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl focus:border-emerald-500 outline-none font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase px-1">Tutar ({getCurrencySymbol(account.currency)}) *</label>
                    <TrNumberInput required value={txForm.amount} onChange={(v) => setTxForm({ ...txForm, amount: v })} className="w-full px-3 py-2.5 border-2 border-emerald-200 rounded-xl bg-emerald-50/50 text-lg font-black text-emerald-900 focus:border-emerald-500 outline-none" placeholder="0,00" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Açıklama</label>
                  <textarea required placeholder="İşlem açıklaması girin..." value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl outline-none h-20 resize-none font-medium" />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t"><Button type="button" variant="outline" onClick={() => setShowInflowModal(false)} className="rounded-xl">İptal</Button><Button type="submit" disabled={saving || !txForm.amount} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button></div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Para Çıkışı Modalı */}
      {showOutflowModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <Card className="w-full max-w-lg shadow-2xl rounded-3xl border-0">
            <CardHeader className="bg-red-600 text-white rounded-t-3xl py-5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2"><ArrowUpRight className="h-5 w-5" /> Para Çıkışı (Ödeme)</CardTitle>
              <button onClick={() => setShowOutflowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-all"><X className="h-5 w-5 text-white" /></button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={e => handleTransactionSubmit(e)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase px-1">Tarih</label>
                    <input type="date" required value={txForm.transaction_date} onChange={e => setTxForm({...txForm, transaction_date: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl focus:border-red-500 outline-none font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase px-1">Tutar ({getCurrencySymbol(account.currency)}) *</label>
                    <TrNumberInput required value={txForm.amount} onChange={(v) => setTxForm({ ...txForm, amount: v })} className="w-full px-3 py-2.5 border-2 border-red-200 rounded-xl bg-red-50/50 text-lg font-black text-red-900 focus:border-red-500 outline-none" placeholder="0,00" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Açıklama</label>
                  <textarea required placeholder="İşlem açıklaması girin..." value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl outline-none h-20 resize-none font-medium" />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t"><Button type="button" variant="outline" onClick={() => setShowOutflowModal(false)} className="rounded-xl">İptal</Button><Button type="submit" disabled={saving || !txForm.amount} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button></div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Transfer Modalı */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <Card className="w-full max-w-lg shadow-2xl rounded-3xl border-0">
            <CardHeader className="bg-primary-600 text-white rounded-t-3xl py-5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Para Transferi (Virman)</CardTitle>
              <button onClick={() => setShowTransferModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-all"><X className="h-5 w-5 text-white" /></button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={e => handleTransactionSubmit(e, true)} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Hedef Hesap *</label>
                  <select required value={txForm.target_account_id} onChange={e => setTxForm({...txForm, target_account_id: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl focus:border-primary-500 outline-none font-bold bg-white">
                    {groupedTargetAccounts.map((group) => (
                      <optgroup key={group.title} label={group.title}>
                        {group.items.map((a) => (
                          <option key={a.id} value={a.id}>
                            {formatPaymentAccountOptionLabel(a)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {targetAccounts.length === 0 && <option value="">Transfer edilecek başka hesap yok</option>}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase px-1">Tarih</label>
                    <input type="date" required value={txForm.transaction_date} onChange={e => setTxForm({...txForm, transaction_date: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl focus:border-primary-500 outline-none font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase px-1">Tutar ({getCurrencySymbol(account.currency)}) *</label>
                    <TrNumberInput required value={txForm.amount} onChange={(v) => setTxForm({ ...txForm, amount: v })} className="w-full px-3 py-2.5 border-2 border-primary-200 rounded-xl bg-primary-50/50 text-lg font-black text-primary-800 focus:border-primary-500 outline-none" placeholder="0,00" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Açıklama</label>
                  <textarea required placeholder="İşlem açıklaması girin..." value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl outline-none h-20 resize-none font-medium" />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t"><Button type="button" variant="outline" onClick={() => setShowTransferModal(false)} className="rounded-xl">İptal</Button><Button type="submit" disabled={saving || !txForm.amount || !txForm.target_account_id} className="rounded-xl bg-primary-600 hover:bg-primary-700 text-white">{saving ? 'İşleniyor...' : 'Transferi Gerçekleştir'}</Button></div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Hesabı Düzenle Modalı */}
      {showEditAccountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl rounded-2xl border-0">
            <CardHeader className="bg-white border-b py-4 px-6 flex flex-row items-center justify-between rounded-t-2xl">
              <CardTitle className="text-lg font-bold text-gray-900">Hesabı Düzenle</CardTitle>
              <button onClick={() => setShowEditAccountModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="h-5 w-5 text-gray-500" /></button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleUpdateAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Hesap Adı *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                {(formData.type === 'bank' || formData.type === 'banka' || formData.type === 'pos') && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Banka Adı</label>
                      <input type="text" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm" />
                    </div>
                    {(formData.type === 'bank' || formData.type === 'banka') && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">IBAN</label>
                        <input type="text" value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm" />
                      </div>
                    )}
                  </>
                )}
                {(formData.type === 'other' || formData.type === 'kredi_karti') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Kart Limiti</label>
                    <TrNumberInput
                      value={numberToTrInputString(Number(formData.credit_limit) || 0)}
                      onChange={(v) => {
                        const n = parseTrNumberInput(v)
                        setFormData({ ...formData, credit_limit: Number.isFinite(n) ? n : 0 })
                      }}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm"
                    />
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowEditAccountModal(false)} className="px-4 rounded-xl">İptal</Button>
                  <Button type="submit" disabled={saving} className="bg-primary-600 hover:bg-primary-700 text-white px-6 rounded-xl">{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

    </div>
  )
}

const mockAccounts: Account[] = [
  { id: '1', name: 'Merkez Kasa', type: 'cash', currency: 'TRY', balance: 45250.00, is_active: true },
  { id: '2', name: 'Vadesiz TL Hesabı', type: 'bank', currency: 'TRY', bank_name: 'Ziraat Bankası', iban: 'TR12 3456 7890', balance: 125000.00, is_active: true },
  { id: '3', name: 'Dolar (USD) Hesabı', type: 'bank', currency: 'USD', bank_name: 'Garanti BBVA', balance: 15400.00, is_active: true }
]
