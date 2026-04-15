'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

interface Offer {
  id: string
  offer_date: string
  customers: { company_name: string } | null
  document_no: string
  total_amount: number
  status: string
  currency: string
}

export default function OffersPage() {
  const router = useRouter()
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case 'USD': return '$'
      case 'EUR': return '€'
      case 'GBP': return '£'
      default: return '₺'
    }
  }

  // Modal States
  const [showCustomerSearchModal, setShowCustomerSearchModal] = useState(false)
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)

  // Customer Search
  const [customers, setCustomers] = useState<any[]>([])
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')

  // New Customer Form
  const [newCustomer, setNewCustomer] = useState({ 
    company_name: '', 
    phone: '', 
    email: '',
    address: '',
    tax_office: '',
    tax_number: '',
    currency: 'TRY',
    is_active: true 
  })
  const [savingCustomer, setSavingCustomer] = useState(false)

  useEffect(() => {
    fetchOffers()
  }, [])

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/offers')
      const data = await response.json()
      setOffers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching offers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      const data = await response.json()
      setCustomers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const handleOpenCustomerSearch = () => {
    fetchCustomers()
    setShowCustomerSearchModal(true)
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingCustomer(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      })

      if (!res.ok) throw new Error('Müşteri oluşturulamadı')

      const data = await res.json()
      toast.success('Müşteri oluşturuldu, teklif ekranına yönlendiriliyorsunuz...')
      setShowNewCustomerModal(false)
      router.push(`/dashboard/teklifler/yeni?customerId=${data.id}`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSavingCustomer(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Onaylandı': return 'bg-primary-100 text-primary-800'
      case 'Reddedildi': return 'bg-red-100 text-red-800'
      case 'İptal': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800' // Beklemede
    }
  }

  const filteredOffers = offers.filter(o => 
    o.document_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredCustomers = customers.filter(c => 
    c.company_name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    c.phone?.includes(customerSearchTerm)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Teklifler</h1>
        <p className="mt-2 text-gray-600">Müşterilerinize sunduğunuz teklifleri yönetin ve siparişe dönüştürün</p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={handleOpenCustomerSearch}
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Kayıtlı Müşteriye Teklif Hazırla</h3>
          <p className="text-sm text-gray-500">Mevcut müşterilerinizden birini seçerek ona özel teklif oluşturun.</p>
        </button>

        <button
          onClick={() => setShowNewCustomerModal(true)}
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Yeni Müşteriye Teklif Hazırla</h3>
          <p className="text-sm text-gray-500">Sistemde olmayan bir müşteriyi hızlıca kaydedin ve teklif ekranına geçin.</p>
        </button>
      </div>

      {/* Offers List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle>Son Teklifler</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Firma veya Teklif No ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm outline-none"
              />
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Firma Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teklif No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
                  <th className="px-6 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Yükleniyor...</td></tr>
                ) : filteredOffers.length > 0 ? (
                  filteredOffers.map((offer) => (
                    <tr 
                      key={offer.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/dashboard/teklifler/${offer.id}`)}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(offer.offer_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">
                          {offer.customers?.company_name || <span className="text-gray-500 italic">Belirtilmemiş</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {offer.document_no || `-`}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(offer.status)}`}>
                          {offer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                        {offer.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(offer.currency)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {/* Actions could go here */}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                      Henüz teklif bulunmuyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Customer Search Modal */}
      {showCustomerSearchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Kayıtlı Müşteri Seçin</h2>
              <button onClick={() => setShowCustomerSearchModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 border-b">
               <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Firma Adı veya Telefon ara..."
                  autoFocus
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(customer => (
                  <div 
                    key={customer.id}
                    onClick={() => router.push(`/dashboard/teklifler/yeni?customerId=${customer.id}`)}
                    className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-all"
                  >
                    <div>
                      <div className="font-bold text-gray-900">{customer.company_name}</div>
                      <div className="text-sm text-gray-500 mt-1">{customer.phone || 'Telefon yok'}</div>
                    </div>
                    <div className="text-primary-600 font-medium text-sm">Seç</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">Müşteri bulunamadı.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Hızlı Müşteri Ekle</h2>
              <button onClick={() => setShowNewCustomerModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firma Ünvanı / Ad Soyad *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCustomer.company_name}
                  onChange={(e) => setNewCustomer({...newCustomer, company_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={newCustomer.tax_office}
                    onChange={(e) => setNewCustomer({...newCustomer, tax_office: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vergi Numarası</label>
                  <input
                    type="text"
                    value={newCustomer.tax_number}
                    onChange={(e) => setNewCustomer({...newCustomer, tax_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                <textarea
                  rows={2}
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Para Birimi</label>
                <select
                  value={newCustomer.currency}
                  onChange={(e) => setNewCustomer({...newCustomer, currency: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="TRY">Türk Lirası (TRY)</option>
                  <option value="USD">Amerikan Doları (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="GBP">İngiliz Sterlini (GBP)</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowNewCustomerModal(false)}>İptal</Button>
                <Button type="submit" disabled={savingCustomer}>
                  {savingCustomer ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
