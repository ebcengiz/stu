'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Plus,
  Building,
  Banknote,
  CreditCard,
  Calculator,
  TrendingUp,
  ChevronDown,
  PlusCircle,
  HelpCircle,
  X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { HESAP_BOLUMLERI, formatAccountBalance } from '@/lib/account-sections'

interface Account {
  id: string
  name: string
  type: string
  currency: string
  balance: number
  is_active: boolean
  bank_name?: string | null
  iban?: string | null
  credit_limit?: number | null
}

/** DB `account_type` enum: cash | bank | pos | other */
const ADD_MENU_TYPES: { type: string; label: string; icon: React.ReactNode }[] = [
  { type: 'cash', label: 'Kasa Ekle', icon: <Banknote className="h-4 w-4 text-emerald-600" /> },
  { type: 'bank', label: 'Banka Hesabı Ekle', icon: <Building className="h-4 w-4 text-blue-600" /> },
  { type: 'pos', label: 'POS Hesabı Ekle', icon: <Calculator className="h-4 w-4 text-amber-600" /> },
  { type: 'other', label: 'Kredi kartı / diğer hesap', icon: <CreditCard className="h-4 w-4 text-purple-600" /> },
]

export default function HesaplarimPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    currency: 'TRY',
    bank_name: '',
    iban: '',
    balance: 0,
    credit_limit: 0,
  })

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(Array.isArray(data) ? data : [])
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || 'Hesaplar yüklenemedi')
        setAccounts([])
      }
    } catch (error) {
      console.error(error)
      toast.error('Hesaplar yüklenirken hata oluştu')
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const filteredAccounts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter(
      a =>
        a.name.toLowerCase().includes(q) ||
        (a.bank_name && a.bank_name.toLowerCase().includes(q)) ||
        (a.iban && a.iban.toLowerCase().includes(q))
    )
  }, [accounts, searchTerm])

  const handleOpenModal = (type: string) => {
    setFormData({
      name: '',
      type,
      currency: 'TRY',
      bank_name: '',
      iban: '',
      balance: 0,
      credit_limit: 0,
    })
    setShowAddMenu(false)
    setShowModal(true)
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Yeni hesap oluşturuldu.')
        setShowModal(false)
        fetchAccounts()
      } else {
        const err = await response.json()
        throw new Error(err.error || 'Hesap oluşturulamadı')
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const toplamBakiyeTRY = useMemo(
    () =>
      accounts
        .filter(
          a =>
            a.currency === 'TRY' &&
            a.type !== 'other' &&
            a.type !== 'kredi_karti'
        )
        .reduce((sum, a) => sum + Number(a.balance), 0),
    [accounts]
  )

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8 px-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hesaplarım</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kasa, banka, POS ve diğer hesaplarınızı yönetin. Yeni işletmelerde varsayılan hesaplar otomatik
            oluşturulur; dilediğinizde silebilir veya yenilerini ekleyebilirsiniz.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="search"
            placeholder="Hesap ara..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm w-full sm:w-48 outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <div className="relative">
            <Button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="shadow-sm font-bold bg-emerald-600 hover:bg-emerald-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Yeni Hesap Ekle
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>

            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                  {ADD_MENU_TYPES.map(item => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleOpenModal(item.type)}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg border-0">
        <CardBody className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/15 rounded-xl">
              <TrendingUp className="h-8 w-8 text-blue-100" />
            </div>
            <div>
              <p className="text-blue-100 font-medium text-xs uppercase tracking-wider mb-1">
                Toplam Bakiye (TRY)
              </p>
              <h2 className="text-3xl md:text-4xl font-bold">
                {toplamBakiyeTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </h2>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {HESAP_BOLUMLERI.map(section => {
          const list = filteredAccounts.filter(a => section.types.includes(a.type))
          const totalTry = list
            .filter(a => a.currency === 'TRY')
            .reduce((s, a) => s + Number(a.balance), 0)

          return (
            <Card key={section.key} className="border-0 shadow-md overflow-hidden flex flex-col">
              <CardHeader className="bg-blue-600 text-white py-3 px-4 flex flex-row items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-sm uppercase tracking-wide truncate">{section.title}</span>
                  {(section.key === 'pos' || section.key === 'other') && (
                    <button
                      type="button"
                      className="p-0.5 rounded hover:bg-white/20 text-blue-200"
                      title="Bu bölümdeki hesaplar tahsilat ve ödeme ekranlarında seçilebilir."
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {section.headerTotalTryOnly && list.length > 0 && (
                  <span className="text-xs font-bold text-blue-100 whitespace-nowrap">
                    {totalTry.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </span>
                )}
              </CardHeader>
              <CardBody className="p-3 bg-slate-50/80 flex-1">
                {list.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8 px-2">
                    Bu grupta hesap yok. &quot;Yeni Hesap Ekle&quot; ile ekleyebilirsiniz.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {list.map(hesap => (
                      <button
                        key={hesap.id}
                        type="button"
                        onClick={() => router.push(`/dashboard/hesaplarim/${hesap.id}`)}
                        className="text-left rounded-xl border border-gray-200 bg-white p-3 hover:border-blue-400 hover:shadow-sm transition-all"
                      >
                        <div className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                          {hesap.name}
                        </div>
                        {hesap.bank_name && (
                          <div className="text-[11px] text-gray-500 mt-1 truncate">{hesap.bank_name}</div>
                        )}
                        <div
                          className={`mt-2 text-sm font-bold ${
                            (hesap.type === 'other' || hesap.type === 'kredi_karti') &&
                            Number(hesap.balance) < 0
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {formatAccountBalance(hesap.currency, Number(hesap.balance))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl rounded-2xl border-0 max-h-[90vh] overflow-y-auto">
            <CardHeader className="bg-white border-b py-4 px-6 flex flex-row items-center justify-between rounded-t-2xl sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {ADD_MENU_TYPES.find(x => x.type === formData.type)?.label ?? 'Hesap Ekle'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Hesap Adı *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Para Birimi</label>
                    <select
                      value={formData.currency}
                      onChange={e => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm bg-white"
                    >
                      <option value="TRY">TRY (₺)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Açılış Bakiyesi</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.balance}
                      onChange={e => setFormData({ ...formData, balance: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm"
                    />
                  </div>
                </div>

                {(formData.type === 'bank' || formData.type === 'pos') && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Banka Adı</label>
                      <input
                        type="text"
                        value={formData.bank_name}
                        onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm"
                      />
                    </div>
                    {formData.type === 'bank' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">IBAN</label>
                        <input
                          type="text"
                          placeholder="TR..."
                          value={formData.iban}
                          onChange={e => setFormData({ ...formData, iban: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm"
                        />
                      </div>
                    )}
                  </>
                )}

                {formData.type === 'other' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Kart Limiti</label>
                    <input
                      type="number"
                      value={formData.credit_limit}
                      onChange={e => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="px-4">
                    İptal
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
