'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, Building, Mail, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { TagSelector } from '@/components/admin/TagSelector'

interface Customer {
  id: string
  company_name: string
  company_logo: string | null
  address: string | null
  contact_person: string | null
  phone: string | null
  email: string | null
  tax_number: string | null
  tax_office: string | null
  notes: string | null
  category1: string | null
  category2: string | null
  balance: number
  is_active: boolean
  created_at: string
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [labelFilter, setLabelFilter] = useState('all')
  const [showOnlyWithBalance, setShowOnlyWithBalance] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [formData, setFormData] = useState({
    company_name: '',
    company_logo: '',
    address: '',
    contact_person: '',
    phone: '',
    email: '',
    tax_number: '',
    tax_office: '',
    notes: '',
    category1: '',
    category2: '',
    is_active: true
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      const data = await response.json()
      setCustomers(data)
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Lütfen sadece resim dosyası seçin.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Dosya boyutu 5MB'dan küçük olmalıdır.")
      return
    }

    setUploadingLogo(true)
    const uploadData = new FormData()
    uploadData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Yükleme başarısız')
      }

      const data = await response.json()
      setFormData(prev => ({ ...prev, company_logo: data.url }))
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(error.message || 'Logo yüklenirken bir hata oluştu.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)

    try {
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.id}`
        : '/api/customers'

      const method = editingCustomer ? 'PUT' : 'POST'

      // Clean empty strings to null
      const cleanedData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      )

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Müşteri kaydedilemedi')
      }

      setShowModal(false)
      setEditingCustomer(null)
      resetForm()
      fetchCustomers()
      
      alert(editingCustomer ? 'Müşteri başarıyla güncellendi!' : 'Müşteri başarıyla eklendi!')
    } catch (error: any) {
      console.error('Error saving customer:', error)
      alert(error.message || 'Müşteri kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (customer: Customer) => {
    // Instead of opening modal, navigate to customer detail page
    router.push(`/dashboard/musteriler/${customer.id}`)
  }

  const handleRowClick = (id: string) => {
    router.push(`/dashboard/musteriler/${id}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Silme işlemi başarısız')

      fetchCustomers()
    } catch (error) {
      console.error('Error deleting customer:', error)
      alert('Müşteri silinemedi')
    }
  }

  const resetForm = () => {
    setFormData({
      company_name: '',
      company_logo: '',
      address: '',
      contact_person: '',
      phone: '',
      email: '',
      tax_number: '',
      tax_office: '',
      notes: '',
      is_active: true
    })
  }

  const openNewModal = () => {
    setEditingCustomer(null)
    resetForm()
    setShowModal(true)
  }

  const categories = Array.from(new Set(customers.map(c => c.category1).filter(Boolean)))
  const labels = Array.from(new Set(customers.map(c => c.category2).filter(Boolean)))

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = (
      customer.company_name?.toLowerCase().includes(searchLower) ||
      customer.contact_person?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower)
    )

    const matchesCategory = categoryFilter === 'all' || customer.category1 === categoryFilter
    const matchesLabel = labelFilter === 'all' || customer.category2 === labelFilter
    const matchesBalance = !showOnlyWithBalance || (customer.balance && Math.abs(customer.balance) > 0.01)

    return matchesSearch && matchesCategory && matchesLabel && matchesBalance
  })

  if (loading && customers.length === 0) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Müşteriler</h1>
          <p className="mt-2 text-gray-600">Müşteri ve firma bilgilerinizi yönetin</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Müşteri
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Müşteri Grubu</label>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tüm Gruplar</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Özel Etiket</label>
          <select 
            value={labelFilter} 
            onChange={(e) => setLabelFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tüm Etiketler</option>
            {labels.map(lbl => (
              <option key={lbl} value={lbl}>{lbl}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <input 
              type="checkbox" 
              checked={showOnlyWithBalance}
              onChange={(e) => setShowOnlyWithBalance(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-bold text-gray-600 group-hover:text-primary-600 transition-colors">Sadece Bakiyesi Olanlar</span>
          </label>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Arama</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="İsim, yetkili, tel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle>Müşteri Listesi</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Müşteri ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firma Bilgisi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İletişim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vergi Bilgileri</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bakiye</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <tr 
                      key={customer.id} 
                      onClick={() => handleRowClick(customer.id)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {customer.company_logo ? (
                            <img src={customer.company_logo} alt={customer.company_name} className="h-10 w-10 rounded-full object-cover mr-3 bg-gray-100 border border-gray-200" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold mr-3 border border-primary-200">
                              {customer.company_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{customer.company_name}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {customer.category1 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                                  {customer.category1}
                                </span>
                              )}
                              {customer.category2 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
                                  {customer.category2}
                                </span>
                              )}
                            </div>
                            {customer.address && (
                              <div className="text-xs text-gray-500 flex items-center mt-1 truncate max-w-[200px]" title={customer.address}>
                                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{customer.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">{customer.contact_person || '-'}</div>
                        {customer.email && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <Mail className="h-3 w-3 mr-1" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {customer.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {customer.tax_office ? <span className="text-gray-500 text-xs">VD: </span> : ''}
                          {customer.tax_office || '-'}
                        </div>
                        <div className="text-sm text-gray-900 mt-1">
                          {customer.tax_number ? <span className="text-gray-500 text-xs">VN: </span> : ''}
                          {customer.tax_number || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className={`text-sm font-bold ${customer.balance > 0 ? 'text-red-600' : customer.balance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                          {customer.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          customer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {customer.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded-md transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-md transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm ? 'Arama sonucu bulunamadı.' : 'Henüz müşteri eklenmemiş.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Building className="mr-2 h-5 w-5 text-primary-600" />
                {editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sol Kolon - Temel Bilgiler */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Firma Bilgileri</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Firma Ünvanı *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Firma tam ünvanı"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Firma Logosu
                    </label>
                    <div className="flex items-center gap-4">
                      {formData.company_logo ? (
                        <div className="relative group">
                          <img 
                            src={formData.company_logo} 
                            alt="Logo" 
                            className="h-16 w-16 rounded-full object-cover border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, company_logo: '' })}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                          <Building className="h-6 w-6" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-primary-50 file:text-primary-700
                            hover:file:bg-primary-100
                            disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {uploadingLogo && <p className="text-xs text-primary-600 mt-1 animate-pulse">Logo yükleniyor...</p>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vergi Dairesi
                      </label>
                      <input
                        type="text"
                        value={formData.tax_office}
                        onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Örn: Beyoğlu VD"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vergi Numarası
                      </label>
                      <input
                        type="text"
                        value={formData.tax_number}
                        onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="10 Haneli VKN / 11 Haneli TCKN"
                      />
                    </div>
                  </div>
                </div>

                {/* Sağ Kolon - İletişim Bilgileri */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">İletişim Bilgileri</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      İletişim Kurulacak Kişi
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Ad Soyad"
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="05XX XXX XX XX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-Posta
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="ornek@firma.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adres
                    </label>
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      placeholder="Açık adres bilgisi"
                    />
                  </div>
                </div>
              </div>

              {/* Alt Kısım - Sınıflandırma, Notlar & Durum */}
              <div className="pt-2 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Sınıflandırma</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TagSelector
                    label="Müşteri Grubu / Sınıfı"
                    type="category1"
                    value={formData.category1 || ''}
                    placeholder="Grup seçin veya yazın..."
                    onChange={(val) => setFormData({ ...formData, category1: val })}
                  />
                  <TagSelector
                    label="Özel Etiket"
                    type="category2"
                    value={formData.category2 || ''}
                    placeholder="Etiket seçin veya yazın..."
                    onChange={(val) => setFormData({ ...formData, category2: val })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Müşteri Notları
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Müşteri hakkında özel notlar, çalışma şartları vb."
                  />
                </div>
              </div>

              <div className="flex items-center py-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm font-medium text-gray-700 select-none">
                  Müşteri Aktif (Sistemde işlem yapılabilir)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Kaydediliyor...' : (editingCustomer ? 'Güncelle' : 'Kaydet')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
