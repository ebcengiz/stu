'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus, Search, Building, Banknote, CreditCard, Calculator, TrendingUp, DollarSign, Euro, X, ChevronDown, PlusCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Account {
  id: string
  name: string
  type: string // 'kasa', 'banka', 'pos', 'kredi_karti'
  currency: string // 'TRY', 'USD', 'EUR'
  balance: number
  is_active: boolean
  bank_name?: string | null
  iban?: string | null
  credit_limit?: number | null
}

export default function HesaplarimPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  
  // Modals state
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    type: 'banka',
    currency: 'TRY',
    bank_name: '',
    iban: '',
    balance: 0,
    credit_limit: 0
  })

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      } else {
        setAccounts(defaultAccounts)
      }
    } catch (error) {
      console.error(error)
      setAccounts(defaultAccounts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleOpenModal = (type: string) => {
    setFormData({ name: '', type, currency: 'TRY', bank_name: '', iban: '', balance: 0, credit_limit: 0 })
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
        body: JSON.stringify(formData)
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
      const newAcc: Account = {
        id: Math.random().toString(),
        name: formData.name,
        type: formData.type,
        currency: formData.currency,
        balance: Number(formData.balance),
        is_active: true,
        bank_name: formData.bank_name,
        iban: formData.iban,
        credit_limit: Number(formData.credit_limit)
      }
      setAccounts([...accounts, newAcc])
      setShowModal(false)
      toast.success('Hesap yerel listeye eklendi (API henüz aktif değil)')
    } finally {
      setSaving(false)
    }
  }

  const defaultAccounts: Account[] = [
    { id: '1', name: 'Merkez Kasa', type: 'kasa', currency: 'TRY', balance: 45250.00, is_active: true },
    { id: '2', name: 'Vadesiz TL Hesabı', type: 'banka', currency: 'TRY', bank_name: 'Ziraat Bankası', iban: 'TR12 3456 7890', balance: 125000.00, is_active: true },
    { id: '3', name: 'Dolar (USD) Hesabı', type: 'banka', currency: 'USD', bank_name: 'Garanti BBVA', balance: 15400.00, is_active: true },
    { id: '4', name: 'Euro (EUR) Hesabı', type: 'banka', currency: 'EUR', bank_name: 'İş Bankası', balance: 8250.00, is_active: true },
    { id: '5', name: 'Sanal POS (E-Ticaret)', type: 'pos', currency: 'TRY', balance: 32450.00, is_active: true },
    { id: '6', name: 'Fiziki POS (Mağaza)', type: 'pos', currency: 'TRY', bank_name: 'Ziraat Bankası', balance: 14200.00, is_active: true },
    { id: '7', name: 'Şirket Kartı (Bonus)', type: 'kredi_karti', currency: 'TRY', bank_name: 'Garanti', balance: -24500.00, credit_limit: 150000, is_active: true }
  ]

  const kasalar = accounts.filter(a => a.type === 'kasa')
  const bankalar = accounts.filter(a => a.type === 'banka')
  const poslar = accounts.filter(a => a.type === 'pos')
  const kartlar = accounts.filter(a => a.type === 'kredi_karti')

  const toplamBakiyeTRY = accounts.filter(a => a.currency === 'TRY' && a.type !== 'kredi_karti').reduce((sum, a) => sum + a.balance, 0)

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div></div>
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hesaplarım</h1>
          <p className="mt-1 text-sm text-gray-500">İşletmenizin finansal durumunu takip edin.</p>
        </div>
        
        <div className="relative">
          <Button onClick={() => setShowAddMenu(!showAddMenu)} className="shadow-sm font-bold bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            Yeni Hesap Ekle
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
          
          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <button onClick={() => handleOpenModal('kasa')} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50">
                  <Banknote className="h-4 w-4 text-emerald-600" /> Kasa Ekle
                </button>
                <button onClick={() => handleOpenModal('banka')} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50">
                  <Building className="h-4 w-4 text-blue-600" /> Banka Hesabı Ekle
                </button>
                <button onClick={() => handleOpenModal('pos')} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50">
                  <Calculator className="h-4 w-4 text-amber-600" /> POS Hesabı Ekle
                </button>
                <button onClick={() => handleOpenModal('kredi_karti')} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-purple-600" /> Kredi Kartı Ekle
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hero Card */}
      <Card className="bg-blue-600 text-white shadow-md border-0">
        <CardBody className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <TrendingUp className="h-8 w-8 text-blue-100" />
            </div>
            <div>
              <p className="text-blue-200 font-medium text-xs uppercase tracking-wider mb-1">Toplam Bakiye (TRY)</p>
              <h2 className="text-4xl font-bold">{toplamBakiyeTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</h2>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Kasa */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-100 py-4">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" /> Kasa Hesapları
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-gray-100">
              {kasalar.map(hesap => (
                <div key={hesap.id} onClick={() => router.push(`/dashboard/hesaplarim/${hesap.id}`)} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="font-semibold text-gray-800 text-sm">{hesap.name}</div>
                  <div className="font-bold text-gray-900 text-sm">
                    {hesap.balance.toLocaleString('tr-TR', {minimumFractionDigits: 2})} {hesap.currency === 'TRY' ? '₺' : hesap.currency === 'USD' ? '$' : '€'}
                  </div>
                </div>
              ))}
              {kasalar.length === 0 && <div className="p-4 text-center text-sm text-gray-500">Kasa hesabı bulunamadı.</div>}
            </div>
          </CardBody>
        </Card>

        {/* Banka */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-100 py-4">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" /> Banka Hesapları
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-gray-100">
              {bankalar.map(hesap => (
                <div key={hesap.id} onClick={() => router.push(`/dashboard/hesaplarim/${hesap.id}`)} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{hesap.name}</div>
                    {hesap.iban && <div className="text-xs text-gray-500 mt-0.5">{hesap.iban}</div>}
                  </div>
                  <div className="font-bold text-gray-900 text-sm text-right">
                    {hesap.balance.toLocaleString('tr-TR', {minimumFractionDigits: 2})} {hesap.currency === 'TRY' ? '₺' : hesap.currency === 'USD' ? '$' : '€'}
                  </div>
                </div>
              ))}
              {bankalar.length === 0 && <div className="p-4 text-center text-sm text-gray-500">Banka hesabı bulunamadı.</div>}
            </div>
          </CardBody>
        </Card>

        {/* POS */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-100 py-4">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-amber-600" /> POS Hesapları
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-gray-100">
              {poslar.map(hesap => (
                <div key={hesap.id} onClick={() => router.push(`/dashboard/hesaplarim/${hesap.id}`)} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{hesap.name}</div>
                    {hesap.bank_name && <div className="text-xs text-gray-500 mt-0.5">{hesap.bank_name}</div>}
                  </div>
                  <div className="font-bold text-gray-900 text-sm">
                    {hesap.balance.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺
                  </div>
                </div>
              ))}
              {poslar.length === 0 && <div className="p-4 text-center text-sm text-gray-500">POS hesabı bulunamadı.</div>}
            </div>
          </CardBody>
        </Card>

        {/* Kredi Kartı */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-100 py-4">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" /> Kredi Kartları
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-gray-100">
              {kartlar.map(hesap => (
                <div key={hesap.id} onClick={() => router.push(`/dashboard/hesaplarim/${hesap.id}`)} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{hesap.name}</div>
                    {hesap.credit_limit && <div className="text-xs text-gray-500 mt-0.5">Limit: {hesap.credit_limit.toLocaleString('tr-TR')} ₺</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Borç</div>
                    <div className="font-bold text-red-600 text-sm">
                      {hesap.balance.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺
                    </div>
                  </div>
                </div>
              ))}
              {kartlar.length === 0 && <div className="p-4 text-center text-sm text-gray-500">Kredi kartı bulunamadı.</div>}
            </div>
          </CardBody>
        </Card>

      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl rounded-2xl border-0">
            <CardHeader className="bg-white border-b py-4 px-6 flex flex-row items-center justify-between rounded-t-2xl">
              <CardTitle className="text-lg font-bold text-gray-900">
                {formData.type === 'kasa' ? 'Kasa Ekle' : 
                 formData.type === 'banka' ? 'Banka Hesabı Ekle' : 
                 formData.type === 'pos' ? 'POS Hesabı Ekle' : 'Kredi Kartı Ekle'}
              </CardTitle>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="h-5 w-5 text-gray-500" /></button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleCreateAccount} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Hesap Adı *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Para Birimi</label>
                    <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm bg-white">
                      <option value="TRY">TRY (₺)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Açılış Bakiyesi</label>
                    <input type="number" step="any" value={formData.balance} onChange={e => setFormData({...formData, balance: Number(e.target.value)})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm" />
                  </div>
                </div>

                {(formData.type === 'banka' || formData.type === 'pos') && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Banka Adı</label>
                      <input type="text" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm" />
                    </div>
                    {formData.type === 'banka' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">IBAN</label>
                        <input type="text" placeholder="TR..." value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm" />
                      </div>
                    )}
                  </>
                )}

                {formData.type === 'kredi_karti' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Kart Limiti</label>
                    <input type="number" value={formData.credit_limit} onChange={e => setFormData({...formData, credit_limit: Number(e.target.value)})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none text-sm" />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="px-4">İptal</Button>
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
