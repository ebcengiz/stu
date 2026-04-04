'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Store, UserPlus, Users, FileText, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

interface Sale {
  id: string
  sale_date: string
  customers: { company_name: string } | null
  document_no: string
  order_no: string
  total_amount: number
  status: string
}

export default function SalesPage() {
  const router = useRouter()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal States
  const [showCustomerSearchModal, setShowCustomerSearchModal] = useState(false)
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)

  // Customer Search
  const [customers, setCustomers] = useState<any[]>([])
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')

  // New Customer Form
  const [newCustomer, setNewCustomer] = useState({ company_name: '', phone: '', is_active: true })
  const [savingCustomer, setSavingCustomer] = useState(false)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      const response = await fetch('/api/sales')
      const data = await response.json()
      setSales(data)
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      const data = await response.json()
      setCustomers(data)
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
      toast.success('Müşteri oluşturuldu, satış ekranına yönlendiriliyorsunuz...')
      setShowNewCustomerModal(false)
      router.push(`/dashboard/satislar/yeni?customerId=${data.id}`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSavingCustomer(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Bekliyor': return 'bg-yellow-100 text-yellow-800'
      case 'İrsaliyeleşmiş': return 'bg-blue-100 text-blue-800'
      case 'Faturalaşmış': return 'bg-green-100 text-green-800'
      case 'Faturalaşmış (E-Fatura)': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredSales = sales.filter(s => 
    s.document_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredCustomers = customers.filter(c => 
    c.company_name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    c.phone?.includes(customerSearchTerm)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Satışlar</h1>
        <p className="mt-2 text-gray-600">Satış işlemlerinizi ve siparişlerinizi yönetin</p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => router.push('/dashboard/satislar/yeni')}
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Store className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Perakende Satış Gir</h3>
          <p className="text-sm text-gray-500">Müşteri kaydı olmadan hızlıca perakende satış işlemi gerçekleştirin.</p>
        </button>

        <button
          onClick={() => setShowNewCustomerModal(true)}
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UserPlus className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Yeni Müşteriye Satış Gir</h3>
          <p className="text-sm text-gray-500">Sistemde olmayan bir müşteriyi hızlıca kaydedin ve satış ekranına geçin.</p>
        </button>

        <button
          onClick={handleOpenCustomerSearch}
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Kayıtlı Müşteriye Satış Gir</h3>
          <p className="text-sm text-gray-500">Mevcut müşterilerinizden birini seçerek ona özel satış oluşturun.</p>
        </button>
      </div>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle>Son Satışlar</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Firma, Belge, Sipariş ara..."
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş / Belge No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Yükleniyor...</td></tr>
                ) : filteredSales.length > 0 ? (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/satislar/${sale.id}`)}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(sale.sale_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">
                          {sale.customers?.company_name || <span className="text-gray-500 italic">Perakende Müşteri</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{sale.order_no || '-'}</div>
                        <div className="text-xs text-gray-500">{sale.document_no || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(sale.status)}`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                        {sale.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                      Satış bulunamadı.
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
                    onClick={() => router.push(`/dashboard/satislar/yeni?customerId=${customer.id}`)}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
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
