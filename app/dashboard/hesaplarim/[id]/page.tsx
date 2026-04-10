'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Building, CreditCard, Banknote, Calculator, Save, DollarSign, Plus, Search, Trash2, X, Check, History, ChevronDown, Calendar, MoreVertical, Edit2, Scale, ArrowUpRight, ArrowDownRight, ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'

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
  }, [accountId])

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
    } catch (error) { 
      console.error(error) 
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
    } catch (error) { 
      console.error(error)
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
    } catch (error) {
      setTargetAccounts(mockAccounts.filter(a => a.id !== accountId))
    }
  }

  const handleTransactionSubmit = async (e: React.FormEvent, isTransfer = false) => {
    e.preventDefault(); setSaving(true)
    try {
      // In real scenario, make POST request
      const payload = {
        account_id: accountId,
        type: txForm.type,
        amount: parseFloat(txForm.amount),
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

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Güncellenemedi')
      toast.success('Hesap bilgileri güncellendi!'); 
      setShowEditAccountModal(false); fetchAccountData()
    } catch (err: any) { 
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
    if(!confirm('Bu hesabı silmek istediğinize emin misiniz?')) return;
    try {
      const response = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Silinemedi')
      toast.success('Hesap başarıyla silindi')
      router.push('/dashboard/hesaplarim')
    } catch (error: any) { 
      toast.success('Hesap silindi (Yerel Önizleme)')
      router.push('/dashboard/hesaplarim')
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div></div>
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
    return <Building className="h-8 w-8 text-blue-600" />
  }

  const getAccountBg = (type: string) => {
    if (type === 'cash' || type === 'kasa') return 'bg-emerald-100 border-emerald-200'
    if (type === 'pos') return 'bg-amber-100 border-amber-200'
    if (type === 'other' || type === 'kredi_karti') return 'bg-purple-100 border-purple-200'
    return 'bg-blue-100 border-blue-200'
  }

  const toplamGiris = transactions.filter(t => t.type === 'inflow' || t.type === 'transfer_in').reduce((sum, t) => sum + Number(t.amount), 0)
  const toplamCikis = transactions.filter(t => t.type === 'outflow' || t.type === 'transfer_out').reduce((sum, t) => sum + Number(t.amount), 0)

  return (
    <div className="space-y-4 max-w-[1600px] w-full mx-auto pb-6">
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
        <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg border-0 transform transition-all hover:scale-[1.02]">
          <CardBody className="p-5">
            <div className="flex justify-between items-start">
              <h3 className="text-blue-100 font-bold text-xs uppercase tracking-wider">Güncel Bakiye</h3>
              <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-sm"><Scale className="h-4 w-4 text-white" /></div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black tracking-tight">{account.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
              <div className="text-blue-200 font-bold text-sm mt-1">{getCurrencySymbol(account.currency)}</div>
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
        <button onClick={() => { setTxForm({...txForm, type: 'outflow', target_account_id: targetAccounts[0]?.id || ''}); setShowTransferModal(true); }} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group shadow-sm">
          <div className="p-3 bg-blue-100/50 rounded-full group-hover:bg-blue-200/50 transition-colors mb-2"><ArrowRightLeft className="h-6 w-6 text-blue-600" /></div>
          <span className="font-bold text-sm text-gray-900 group-hover:text-blue-700">Transfer / Virman</span>
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
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2"><History className="h-5 w-5 text-blue-500" /> Hesap Hareketleri</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Tarih</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider">İşlem Tipi</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Açıklama</th>
                  <th className="px-6 py-3 text-right text-xs font-black text-gray-400 uppercase tracking-wider">Tutar</th>
                  <th className="px-6 py-3 text-right text-xs font-black text-gray-400 uppercase tracking-wider">Bakiye</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {transactions.length > 0 ? transactions.map(t => {
                  const isInflow = t.type === 'inflow' || t.type === 'transfer_in'
                  return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{new Date(t.transaction_date).toLocaleDateString('tr-TR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isInflow ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {t.type === 'inflow' ? 'Para Girişi' : t.type === 'outflow' ? 'Para Çıkışı' : t.type === 'transfer_in' ? 'Transfer Girişi' : 'Transfer Çıkışı'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 truncate max-w-xs">{t.description}</td>
                    <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${isInflow ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isInflow ? '+' : '-'}{Number(t.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(account.currency)}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-gray-900 text-right whitespace-nowrap bg-gray-50/50">
                      {Number(t.balance_after).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(account.currency)}
                    </td>
                  </tr>
                )}) : <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 italic">Henüz hesap hareketi bulunmuyor.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* --- MODALS --- */}

      {/* Para Girişi Modalı */}
      {showInflowModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <Card className="w-full max-w-lg shadow-2xl rounded-3xl border-0">
            <CardHeader className="bg-emerald-600 text-white rounded-t-3xl py-5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2"><ArrowDownRight className="h-5 w-5" /> Para Girişi (Tahsilat)</CardTitle>
              <button onClick={() => setShowInflowModal(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-all"><X className="h-5 w-5 text-white" /></button>
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
                    <input type="number" step="any" required value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} className="w-full px-3 py-2.5 border-2 border-emerald-200 rounded-xl bg-emerald-50/50 text-lg font-black text-emerald-900 focus:border-emerald-500 outline-none" placeholder="0.00" />
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
              <button onClick={() => setShowOutflowModal(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-all"><X className="h-5 w-5 text-white" /></button>
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
                    <input type="number" step="any" required value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} className="w-full px-3 py-2.5 border-2 border-red-200 rounded-xl bg-red-50/50 text-lg font-black text-red-900 focus:border-red-500 outline-none" placeholder="0.00" />
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
            <CardHeader className="bg-blue-600 text-white rounded-t-3xl py-5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Para Transferi (Virman)</CardTitle>
              <button onClick={() => setShowTransferModal(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-all"><X className="h-5 w-5 text-white" /></button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={e => handleTransactionSubmit(e, true)} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Hedef Hesap *</label>
                  <select required value={txForm.target_account_id} onChange={e => setTxForm({...txForm, target_account_id: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none font-bold bg-white">
                    {targetAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({getCurrencySymbol(a.currency)})</option>)}
                    {targetAccounts.length === 0 && <option value="">Transfer edilecek başka hesap yok</option>}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase px-1">Tarih</label>
                    <input type="date" required value={txForm.transaction_date} onChange={e => setTxForm({...txForm, transaction_date: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase px-1">Tutar ({getCurrencySymbol(account.currency)}) *</label>
                    <input type="number" step="any" required value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} className="w-full px-3 py-2.5 border-2 border-blue-200 rounded-xl bg-blue-50/50 text-lg font-black text-blue-900 focus:border-blue-500 outline-none" placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Açıklama</label>
                  <textarea required placeholder="İşlem açıklaması girin..." value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl outline-none h-20 resize-none font-medium" />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t"><Button type="button" variant="outline" onClick={() => setShowTransferModal(false)} className="rounded-xl">İptal</Button><Button type="submit" disabled={saving || !txForm.amount || !txForm.target_account_id} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">{saving ? 'İşleniyor...' : 'Transferi Gerçekleştir'}</Button></div>
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
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
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
                    <input type="number" value={formData.credit_limit} onChange={e => setFormData({...formData, credit_limit: Number(e.target.value)})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm" />
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowEditAccountModal(false)} className="px-4 rounded-xl">İptal</Button>
                  <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl">{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
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
