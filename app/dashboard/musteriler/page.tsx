'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, X, Mail, Phone, MapPin, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { TagSelector } from '@/components/admin/TagSelector'
import { toast } from 'react-hot-toast'
import { CURRENCY_SYMBOLS } from '@/lib/currency'
import { ExcelBulkImportModal } from '@/components/bulk-import/ExcelBulkImportModal'

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
  currency: string
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
  const [excelImportOpen, setExcelImportOpen] = useState(false)

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
    currency: 'TRY',
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
    } catch (_error) {
      console.error('Error fetching customers:', _error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const uploadData = new FormData()
    uploadData.append('file', file)
    try {
      const response = await fetch('/api/upload', { method: 'POST', body: uploadData })
      const data = await response.json()
      setFormData(prev => ({ ...prev, company_logo: data.url }))
    } catch {
      toast.error('Logo yüklenemedi')
    }
    finally { setUploadingLogo(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers'
      const method = editingCustomer ? 'PUT' : 'POST'
      const cleanedData = Object.fromEntries(Object.entries(formData).map(([k, v]) => [k, v === '' ? null : v]))
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cleanedData) })
      if (!response.ok) throw new Error('Müşteri kaydedilemedi')
      setShowModal(false); resetForm(); fetchCustomers(); toast.success('Başarıyla kaydedildi')
    } catch (error: any) { toast.error(error.message) }
    finally { setSaving(false) }
  }

  const handleRowClick = (id: string) => router.push(`/dashboard/musteriler/${id}`)

  const executeDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Silinemedi')
      setCustomers(prev => prev.filter(c => c.id !== id))
      toast.success('Silindi')
    } catch (error: any) { toast.error(error.message) }
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <div className="font-medium text-gray-700">Bu müşteriyi silmek istediğinize emin misiniz?</div>
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => toast.dismiss(t.id)} 
              className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
            >
              Vazgeç
            </button>
            <button 
              onClick={() => {
                toast.dismiss(t.id)
                executeDelete(id)
              }} 
              className="px-3 py-1.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-md transition-colors"
            >
              Evet, Sil
            </button>
          </div>
        </div>
      ),
      { duration: 8000, position: 'top-center', style: { minWidth: '300px', background: '#283b2f', color: '#e2e8f0', border: '1px solid rgba(100,116,139,0.3)' } }
    )
  }

  const resetForm = () => setFormData({ company_name: '', company_logo: '', address: '', contact_person: '', phone: '', email: '', tax_number: '', tax_office: '', notes: '', category1: '', category2: '', currency: 'TRY', is_active: true })

  const openNewModal = () => { setEditingCustomer(null); resetForm(); setShowModal(true) }

  const handleEdit = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation()
    setEditingCustomer(customer)
    setFormData({
      company_name: customer.company_name,
      company_logo: customer.company_logo || '',
      address: customer.address || '',
      contact_person: customer.contact_person || '',
      phone: customer.phone || '',
      email: customer.email || '',
      tax_number: customer.tax_number || '',
      tax_office: customer.tax_office || '',
      notes: customer.notes || '',
      category1: customer.category1 || '',
      category2: customer.category2 || '',
      currency: customer.currency || 'TRY',
      is_active: customer.is_active
    })
    setShowModal(true)
  }

  const categories = Array.from(new Set(customers.map(c => c.category1).filter((v): v is string => Boolean(v))))
  const labels = Array.from(new Set(customers.map(c => c.category2).filter((v): v is string => Boolean(v))))
  const sampleCat1 = useMemo(() => [...categories].sort((a, b) => a.localeCompare(b, 'tr')), [categories])
  const sampleCat2 = useMemo(() => [...labels].sort((a, b) => a.localeCompare(b, 'tr')), [labels])

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = customer.company_name?.toLowerCase().includes(searchLower) || customer.contact_person?.toLowerCase().includes(searchLower)
    const matchesCategory = categoryFilter === 'all' || customer.category1 === categoryFilter
    const matchesLabel = labelFilter === 'all' || customer.category2 === labelFilter
    const matchesBalance = !showOnlyWithBalance || (customer.balance && Math.abs(customer.balance) > 0.01)
    return matchesSearch && matchesCategory && matchesLabel && matchesBalance
  })

  if (loading && customers.length === 0) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Müşteriler</h1>
          <p className="mt-2 text-gray-500">Müşteri ve firma bilgilerinizi yönetin</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setExcelImportOpen(true)}
            className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel&apos;den yükle
          </Button>
          <Button onClick={openNewModal}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Müşteri
          </Button>
        </div>
      </div>

      <ExcelBulkImportModal
        open={excelImportOpen}
        onClose={() => setExcelImportOpen(false)}
        kind="customers"
        sampleCategory1={sampleCat1}
        sampleCategory2={sampleCat2}
        onSuccess={fetchCustomers}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white  p-4 rounded-2xl border border-gray-200 shadow-lg shadow-black/10">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Müşteri Grubu</label>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary-500/30"
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
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary-500/30"
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
              className="w-4 h-4 rounded border-gray-200 text-primary-500 focus:ring-primary-500/30 bg-gray-100"
            />
            <span className="text-sm font-bold text-gray-500 group-hover:text-primary-600 transition-colors">Sadece Bakiyesi Olanlar</span>
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
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firma Bilgisi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İletişim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vergi Bilgileri</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bakiye</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
                            <div className="h-10 w-10 rounded-full bg-primary-100/50 flex items-center justify-center text-primary-700 font-bold mr-3 border border-primary-300">
                              {customer.company_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-700">{customer.company_name}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {customer.category1 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary-50 text-primary-600">
                                  {customer.category1}
                                </span>
                              )}
                              {customer.category2 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary-500/15 text-primary-400">
                                  {customer.category2}
                                </span>
                              )}
                            </div>
                            {customer.address && (
                              <div className="text-xs text-gray-400 flex items-center mt-1 truncate max-w-[200px]" title={customer.address}>
                                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{customer.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 font-medium">{customer.contact_person || '-'}</div>
                        {customer.email && (
                          <div className="text-xs text-gray-400 flex items-center mt-1">
                            <Mail className="h-3 w-3 mr-1" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="text-xs text-gray-400 flex items-center mt-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {customer.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {customer.tax_office ? <span className="text-gray-400 text-xs">VD: </span> : ''}
                          {customer.tax_office || '-'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {customer.tax_number ? <span className="text-gray-400 text-xs">VN: </span> : ''}
                          {customer.tax_number || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className={`text-sm font-bold ${customer.balance > 0 ? 'text-red-500' : customer.balance < 0 ? 'text-primary-600' : 'text-gray-600'}`}>
                          {(customer.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[customer.currency || 'TRY']}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          customer.is_active ? 'bg-primary-50 text-primary-600' : 'bg-red-50 text-red-500'
                        }`}>
                          {customer.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => handleEdit(e, customer)}
                            className="p-2 text-primary-600 hover:bg-primary-50/50 rounded-lg transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, customer.id)}
                            className="p-2 text-red-500 hover:bg-red-50/50 rounded-lg transition-colors"
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
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                      {searchTerm ? 'Arama kriterlerine uygun müşteri bulunamadı.' : 'Henüz bir müşteri kaydı bulunmuyor.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/30  flex items-center justify-center z-50 p-4">
          <div className="bg-white  rounded-2xl shadow-xl shadow-gray-200/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white  z-10">
              <h2 className="text-xl font-bold text-gray-800">
                {editingCustomer ? 'Müşteriyi Düzenle' : 'Yeni Müşteri Ekle'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sol Kolon */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Firma Ünvanı *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-primary-500/30 focus:border-transparent transition-all"
                      placeholder="Örn: ABC A.Ş."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Firma Logosu
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        onChange={handleLogoUpload}
                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
                      />
                      {uploadingLogo && <span className="text-xs text-gray-400">Yükleniyor...</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Vergi Dairesi
                      </label>
                      <input
                        type="text"
                        value={formData.tax_office || ''}
                        onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-primary-500/30 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Vergi No
                      </label>
                      <input
                        type="text"
                        value={formData.tax_number || ''}
                        onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-primary-500/30 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Para Birimi
                    </label>
                    <select 
                      value={formData.currency} 
                      onChange={e => setFormData({...formData, currency: e.target.value})} 
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-primary-500/30 focus:border-transparent transition-all"
                    >
                      {Object.keys(CURRENCY_SYMBOLS).map(code => (
                        <option key={code} value={code}>{code} ({CURRENCY_SYMBOLS[code]})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sağ Kolon */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      İletişim Kişisi
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person || ''}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-primary-500/30 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-primary-500/30 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        E-Posta
                      </label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-primary-500/30 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Adres
                    </label>
                    <textarea
                      rows={2}
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-primary-500/30 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Alt Kısım - Sınıflandırma, Notlar & Durum */}
              <div className="pt-2 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">Sınıflandırma</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TagSelector
                    label="Müşteri Grubu / Sınıfı"
                    type="category1"
                    entityType="customer"
                    value={formData.category1 || ''}
                    placeholder="Grup seçin veya yazın..."
                    onChange={(val) => setFormData({ ...formData, category1: val })}
                  />
                  <TagSelector
                    label="Özel Etiket"
                    type="category2"
                    entityType="customer"
                    value={formData.category2 || ''}
                    placeholder="Etiket seçin veya yazın..."
                    onChange={(val) => setFormData({ ...formData, category2: val })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Müşteri Notları
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-primary-500/30 focus:border-transparent transition-all"
                    placeholder="Müşteri hakkında özel notlar, çalışma şartları vb."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-primary-500 focus:ring-primary-500/30 border-gray-200 rounded bg-gray-100"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-600">
                    Bu müşteri aktif olarak çalışmaya devam ediyor
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Vazgeç
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
