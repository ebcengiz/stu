'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Store, UserPlus, Users, FileText, CheckCircle2, Clock, ChevronUp, ChevronDown, ArrowUpDown, X, Trash2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

interface Purchase {
  id: string
  purchase_date: string
  suppliers: { company_name: string } | null
  document_no: string
  order_no: string
  total_amount: number
  status: string
}

export default function PurchasesPage() {
  const router = useRouter()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  type SortColumn = 'purchase_date' | 'company_name' | 'document_no' | 'status' | 'total_amount'
  type SortDirection = 'asc' | 'desc'

  const [sortColumn, setSortColumn] = useState<SortColumn>('purchase_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Modal States
  const [showSupplierSearchModal, setShowSupplierSearchModal] = useState(false)
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false)

  // Supplier Search
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('')

  // New Supplier Form
  const [newSupplier, setNewSupplier] = useState({ 
    company_name: '', 
    phone: '', 
    email: '',
    address: '',
    tax_office: '',
    tax_number: '',
    is_active: true 
  })
  const [savingSupplier, setSavingSupplier] = useState(false)

  useEffect(() => {
    fetchPurchases()
  }, [])

  const fetchPurchases = async () => {
    try {
      const response = await fetch('/api/purchases')
      const data = await response.json()
      setPurchases(data)
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers')
      const data = await response.json()
      setSuppliers(data)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const handleOpenSupplierSearch = () => {
    fetchSuppliers()
    setShowSupplierSearchModal(true)
  }

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSupplier(true)
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier)
      })

      if (!res.ok) throw new Error('Tedarikçi oluşturulamadı')

      const data = await res.json()
      toast.success('Tedarikçi oluşturuldu, tedarikçi detaylarına yönlendiriliyorsunuz...')
      setShowNewSupplierModal(false)
      // Redirect to supplier detail page with transaction tab open
      router.push(`/dashboard/tedarikciler/${data.id}?tab=transaction`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSavingSupplier(false)
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

  const executeDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/purchases/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Silme işlemi başarısız')
      }

      setPurchases(prev => prev.filter(p => p.id !== id))
      toast.success('Alış işlemi başarıyla silindi')
    } catch (error: any) {
      console.error('Error deleting purchase:', error)
      toast.error(error.message || 'Alış silinemedi')
    }
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <div className="font-medium text-gray-900">Bu alış işlemini silmek istediğinizden emin misiniz?</div>
          <div className="text-xs text-gray-500">Not: Stok ve bakiye hareketleri geri alınmaz.</div>
          <div className="flex justify-end gap-2 mt-2">
            <button 
              onClick={() => toast.dismiss(t.id)} 
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Vazgeç
            </button>
            <button 
              onClick={() => {
                toast.dismiss(t.id)
                executeDelete(id)
              }} 
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              Evet, Sil
            </button>
          </div>
        </div>
      ),
      { duration: 8000, position: 'top-center', style: { minWidth: '300px' } }
    )
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-20 group-hover:opacity-50 transition-opacity" />
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1 text-primary-600" /> : <ChevronDown className="h-4 w-4 ml-1 text-primary-600" />
  }

  const filteredPurchases = [...purchases]
    .filter(p => 
      p.document_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.suppliers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any = a[sortColumn]
      let bValue: any = b[sortColumn]

      if (sortColumn === 'company_name') {
        aValue = a.suppliers?.company_name || 'Hızlı Alış'
        bValue = b.suppliers?.company_name || 'Hızlı Alış'
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  const filteredSuppliers = suppliers.filter(s => 
    s.company_name?.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
    s.phone?.includes(supplierSearchTerm)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alışlar</h1>
        <p className="mt-2 text-gray-600">Satın alma işlemlerinizi ve tedarikçi siparişlerinizi yönetin</p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => router.push('/dashboard/alislar/yeni')}
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Hızlı Alış Gir (Fişsiz)</h3>
          <p className="text-sm text-gray-500">Tedarikçi kaydı olmadan hızlıca ürün girişi gerçekleştirin.</p>
        </button>

        <button
          onClick={() => setShowNewSupplierModal(true)}
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UserPlus className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Yeni Tedarikçiden Alış Gir</h3>
          <p className="text-sm text-gray-500">Sistemde olmayan bir tedarikçiyi kaydedin ve alış ekranına geçin.</p>
        </button>

        <button
          onClick={handleOpenSupplierSearch}
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Kayıtlı Tedarikçiden Alış Gir</h3>
          <p className="text-sm text-gray-500">Mevcut tedarikçilerinizden birini seçerek alım oluşturun.</p>
        </button>
      </div>

      {/* Purchases List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle>Son Alışlar</CardTitle>
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
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none group transition-colors"
                    onClick={() => handleSort('purchase_date')}
                  >
                    <div className="flex items-center">
                      Tarih
                      <SortIcon column="purchase_date" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none group transition-colors"
                    onClick={() => handleSort('company_name')}
                  >
                    <div className="flex items-center">
                      Firma Adı
                      <SortIcon column="company_name" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none group transition-colors"
                    onClick={() => handleSort('document_no')}
                  >
                    <div className="flex items-center">
                      Belge No
                      <SortIcon column="document_no" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none group transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Durum
                      <SortIcon column="status" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none group transition-colors"
                    onClick={() => handleSort('total_amount')}
                  >
                    <div className="flex items-center justify-end">
                      Tutar
                      <SortIcon column="total_amount" />
                    </div>
                  </th>
                  <th className="px-6 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Yükleniyor...</td></tr>
                ) : filteredPurchases.length > 0 ? (
                  filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => router.push(`/dashboard/alislar/${purchase.id}`)}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(purchase.purchase_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">
                          {purchase.suppliers?.company_name || <span className="text-gray-500 italic">Hızlı Alış</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{purchase.document_no || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(purchase.status)}`}>
                          {purchase.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                        {purchase.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, purchase.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                          title="Alışı Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                      Alış bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Supplier Search Modal */}
      {showSupplierSearchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Kayıtlı Tedarikçi Seçin</h2>
              <button onClick={() => setShowSupplierSearchModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full">
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
                  value={supplierSearchTerm}
                  onChange={(e) => setSupplierSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map(supplier => (
                  <div 
                    key={supplier.id}
                    onClick={() => router.push(`/dashboard/tedarikciler/${supplier.id}?tab=transaction`)}
                    className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-all"
                  >
                    <div>
                      <div className="font-bold text-gray-900">{supplier.company_name}</div>
                      <div className="text-sm text-gray-500 mt-1">{supplier.phone || 'Telefon yok'}</div>
                    </div>
                    <div className="text-primary-600 font-medium text-sm">Seç</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">Tedarikçi bulunamadı.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {showNewSupplierModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Hızlı Tedarikçi Ekle</h2>
              <button onClick={() => setShowNewSupplierModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firma Ünvanı / Ad Soyad *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newSupplier.company_name}
                  onChange={(e) => setNewSupplier({...newSupplier, company_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={newSupplier.tax_office}
                    onChange={(e) => setNewSupplier({...newSupplier, tax_office: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vergi Numarası</label>
                  <input
                    type="text"
                    value={newSupplier.tax_number}
                    onChange={(e) => setNewSupplier({...newSupplier, tax_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                <textarea
                  rows={2}
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowNewSupplierModal(false)}>İptal</Button>
                <Button type="submit" disabled={savingSupplier}>
                  {savingSupplier ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
