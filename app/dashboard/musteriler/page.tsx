'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, Building, Mail, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { TagSelector } from '@/components/admin/TagSelector'
import { toast } from 'react-hot-toast'
import { CURRENCY_SYMBOLS } from '@/lib/currency'

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
    } catch (error) {
      console.error('Error fetching customers:', error)
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
    } catch (error: any) { toast.error('Logo yüklenemedi') }
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
    if(confirm('Silmek istediğinize emin misiniz?')) executeDelete(id)
  }

  const resetForm = () => setFormData({ company_name: '', company_logo: '', address: '', contact_person: '', phone: '', email: '', tax_number: '', tax_office: '', notes: '', category1: '', category2: '', currency: 'TRY', is_active: true })

  const openNewModal = () => { setEditingCustomer(null); resetForm(); setShowModal(true) }

  const categories = Array.from(new Set(customers.map(c => c.category1).filter(Boolean)))
  const labels = Array.from(new Set(customers.map(c => c.category2).filter(Boolean)))

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = customer.company_name?.toLowerCase().includes(searchLower) || customer.contact_person?.toLowerCase().includes(searchLower)
    const matchesCategory = categoryFilter === 'all' || customer.category1 === categoryFilter
    const matchesBalance = !showOnlyWithBalance || (customer.balance && Math.abs(customer.balance) > 0.01)
    return matchesSearch && matchesCategory && matchesBalance
  })

  if (loading && customers.length === 0) return <div className="p-8 flex justify-center text-primary-600">Yükleniyor...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold text-gray-900">Müşteriler</h1><p className="mt-2 text-gray-600">Müşteri ve firma bilgilerinizi yönetin</p></div>
        <Button onClick={openNewModal}><Plus className="mr-2 h-4 w-4" />Yeni Müşteri</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center w-full">
            <CardTitle>Müşteri Listesi</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Müşteri ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Firma Bilgisi</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İletişim</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bakiye</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} onClick={() => handleRowClick(customer.id)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-6 py-4"><div className="font-medium text-gray-900">{customer.company_name}</div><div className="text-xs text-gray-500">{customer.category1 || '-'}</div></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{customer.phone || '-'}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap"><div className={`text-sm font-bold ${customer.balance > 0 ? 'text-red-600' : customer.balance < 0 ? 'text-green-600' : 'text-gray-900'}`}>{customer.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[customer.currency || 'TRY']}</div></td>
                  <td className="px-6 py-4 text-right"><button onClick={(e) => handleDelete(e, customer.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-full"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </CardBody>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl p-6 w-full max-w-2xl">
          <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">Yeni Müşteri Ekle</h2><button onClick={() => setShowModal(false)}><X className="h-6 w-6 text-gray-400" /></button></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1"><label className="text-sm font-bold text-gray-600">Firma Ünvanı *</label><input type="text" required value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div className="space-y-1"><label className="text-sm font-bold text-gray-600">Para Birimi</label>
                <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                  {Object.keys(CURRENCY_SYMBOLS).map(code => <option key={code} value={code}>{code} ({CURRENCY_SYMBOLS[code]})</option>)}
                </select>
              </div>
              <div className="space-y-1"><label className="text-sm font-bold text-gray-600">Telefon</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t"><Button type="button" variant="outline" onClick={() => setShowModal(false)}>İptal</Button><Button type="submit" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Müşteriyi Kaydet'}</Button></div>
          </form>
        </div></div>
      )}
    </div>
  )
}
