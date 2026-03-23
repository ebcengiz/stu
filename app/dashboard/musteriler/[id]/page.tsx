'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Building, CreditCard, FileText, ShoppingCart, Save, DollarSign, Plus, Search, Trash2, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'

interface Product {
  id: string
  name: string
  sku: string | null
  unit: string
}

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
  is_active: boolean
}

interface Transaction {
  id: string
  type: 'sale' | 'payment'
  amount: number
  description: string
  transaction_date: string
  payment_method?: 'cash' | 'credit_card' | 'cheque'
  created_at: string
}

interface SelectedItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string

  const [activeTab, setActiveTab] = useState<'info' | 'ledger' | 'transaction'>('ledger')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // New Product Modal in Sale
  const [showProductModal, setShowProductModal] = useState(false)
  const [newProductData, setNewProductData] = useState({ name: '', sku: '', unit: 'adet' })

  // Edit Form State
  const [formData, setFormData] = useState({
    company_name: '', company_logo: '', address: '', contact_person: '',
    phone: '', email: '', tax_number: '', tax_office: '', notes: '', is_active: true
  })

  // Transaction Form State
  const [txForm, setTxForm] = useState({
    type: 'sale' as 'sale' | 'payment',
    payment_method: 'cash' as 'cash' | 'credit_card' | 'cheque',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0]
  })

  // Sale Items
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])

  useEffect(() => {
    if (customerId) {
      fetchCustomerData()
      fetchTransactions()
      fetchProducts()
    }
  }, [customerId])

  const fetchCustomerData = async () => {
    try {
      const response = await fetch('/api/customers')
      const data = await response.json()
      const current = data.find((c: Customer) => c.id === customerId)
      if (current) {
        setCustomer(current)
        setFormData({
          company_name: current.company_name, company_logo: current.company_logo || '',
          address: current.address || '', contact_person: current.contact_person || '',
          phone: current.phone || '', email: current.email || '',
          tax_number: current.tax_number || '', tax_office: current.tax_office || '',
          notes: current.notes || '', is_active: current.is_active
        })
      } else {
        router.push('/dashboard/musteriler')
      }
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/customer-transactions?customer_id=${customerId}`)
      const data = await response.json()
      setTransactions(data)
    } catch (error) { console.error(error) }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(data)
    } catch (error) { console.error(error) }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingLogo(true)
    const uploadData = new FormData(); uploadData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: uploadData })
      const data = await res.json(); setFormData(prev => ({ ...prev, company_logo: data.url }))
    } catch (err) { alert('Yükleme başarısız') }
    finally { setUploadingLogo(false) }
  }

  const addItemToSale = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    const newItem: SelectedItem = {
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }
    setSelectedItems([...selectedItems, newItem])
  }

  const updateItem = (index: number, field: keyof SelectedItem, value: any) => {
    const newItems = [...selectedItems]
    const item = { ...newItems[index], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      item.total_price = Number(item.quantity) * Number(item.unit_price)
    }
    newItems[index] = item
    setSelectedItems(newItems)
    
    // Update total amount in txForm
    const total = newItems.reduce((sum, i) => sum + i.total_price, 0)
    setTxForm(prev => ({ ...prev, amount: total.toString() }))
  }

  const removeItem = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index)
    setSelectedItems(newItems)
    const total = newItems.reduce((sum, i) => sum + i.total_price, 0)
    setTxForm(prev => ({ ...prev, amount: total.toString() }))
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProductData, min_stock_level: 0 }),
      })
      if (!res.ok) throw new Error('Ürün eklenemedi')
      const newProd = await res.json()
      setProducts([...products, newProd])
      addItemToSale(newProd.id)
      setShowProductModal(false)
      setNewProductData({ name: '', sku: '', unit: 'adet' })
    } catch (err: any) { alert(err.message) }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        customer_id: customerId,
        type: txForm.type,
        amount: parseFloat(txForm.amount),
        description: txForm.description,
        transaction_date: new Date(txForm.transaction_date).toISOString(),
        payment_method: txForm.type === 'payment' ? txForm.payment_method : null,
        items: txForm.type === 'sale' ? selectedItems : []
      }
      const res = await fetch('/api/customer-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('İşlem kaydedilemedi')
      alert('İşlem başarıyla eklendi!')
      setTxForm({ ...txForm, amount: '', description: '' })
      setSelectedItems([])
      fetchTransactions()
      setActiveTab('ledger')
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const cleanedData = Object.fromEntries(Object.entries(formData).map(([k, v]) => [k, v === '' ? null : v]))
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cleanedData),
      })
      if (!res.ok) throw new Error('Güncellenemedi')
      alert('Güncellendi!'); setIsEditing(false); fetchCustomerData()
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!customer) return null

  let totalBalance = 0
  const ledgerData = [...transactions].reverse().map(tx => {
    if (tx.type === 'sale') totalBalance += Number(tx.amount)
    if (tx.type === 'payment') totalBalance -= Number(tx.amount)
    return { ...tx, balance: totalBalance }
  }).reverse()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/dashboard/musteriler')} className="p-2 bg-white border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex items-center gap-4">
          {customer.company_logo ? <img src={customer.company_logo} className="h-16 w-16 rounded-full object-cover border-2 shadow-sm" /> : <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xl font-bold border-2 shadow-sm">{customer.company_name[0].toUpperCase()}</div>}
          <div><h1 className="text-2xl font-bold text-gray-900">{customer.company_name}</h1><p className="text-gray-500">{customer.contact_person}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-2">
          <Card><CardBody className="p-2 space-y-1">
            <button onClick={() => {setActiveTab('ledger'); setIsEditing(false)}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'ledger' ? 'bg-primary-50 text-primary-700' : 'text-gray-600'}`}><FileText className="h-5 w-5" />Hesap Ekstresi</button>
            <button onClick={() => {setActiveTab('info'); setIsEditing(false)}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'info' ? 'bg-primary-50 text-primary-700' : 'text-gray-600'}`}><Building className="h-5 w-5" />Genel Bilgiler</button>
            <button onClick={() => {setActiveTab('transaction'); setIsEditing(false)}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'transaction' ? 'bg-primary-50 text-primary-700' : 'text-gray-600'}`}><DollarSign className="h-5 w-5" />Yeni İşlem</button>
          </CardBody></Card>
          <Card><CardBody className="p-4"><h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Güncel Bakiye</h3><div className="text-2xl font-bold text-gray-900">{totalBalance.toLocaleString('tr-TR')} ₺</div></CardBody></Card>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          {activeTab === 'ledger' && (
            <Card>
              <CardHeader className="border-b"><CardTitle>Hesap Ekstresi</CardTitle></CardHeader>
              <CardBody className="p-0">
                <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bakiye</th></tr></thead>
                  <tbody className="divide-y divide-gray-200">
                    {ledgerData.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">{new Date(tx.transaction_date).toLocaleDateString('tr-TR')}</td>
                        <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.type === 'sale' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{tx.type === 'sale' ? 'Satış' : 'Tahsilat'} {tx.payment_method && `(${tx.payment_method === 'cash' ? 'Nakit' : tx.payment_method === 'credit_card' ? 'K.Kartı' : 'Çek'})`}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-500">{tx.description}</td>
                        <td className={`px-6 py-4 text-sm font-medium text-right ${tx.type === 'sale' ? '' : 'text-green-600'}`}>{tx.type === 'sale' ? '+' : '-'}{Number(tx.amount).toLocaleString('tr-TR')} ₺</td>
                        <td className="px-6 py-4 text-sm font-medium text-right">{tx.balance.toLocaleString('tr-TR')} ₺</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </CardBody>
            </Card>
          )}

          {activeTab === 'info' && (
            <Card>
              <CardHeader className="border-b flex flex-row items-center justify-between"><CardTitle>Müşteri Bilgileri</CardTitle>{!isEditing && <Button onClick={() => setIsEditing(true)} size="sm" variant="outline"><Save className="mr-2 h-4 w-4" />Düzenle</Button>}</CardHeader>
              <CardBody className="pt-6">
                {!isEditing ? (
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4"><div><h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Firma Ünvanı</h4><p>{customer.company_name}</p></div><div><h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Vergi Bilgileri</h4><p>{customer.tax_office} / {customer.tax_number}</p></div><div><h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Adres</h4><p>{customer.address}</p></div></div>
                    <div className="space-y-4"><div><h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">İletişim</h4><p>{customer.contact_person}</p></div><div><h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Telefon / E-Posta</h4><p>{customer.phone} / {customer.email}</p></div><div><h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Notlar</h4><p>{customer.notes}</p></div></div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateCustomer} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <input type="text" placeholder="Firma Ünvanı" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                        <div className="flex items-center gap-2"><input type="file" onChange={handleLogoUpload} className="text-sm" />{uploadingLogo && <span className="text-xs">Yükleniyor...</span>}</div>
                        <input type="text" placeholder="Vergi Dairesi" value={formData.tax_office} onChange={e => setFormData({...formData, tax_office: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                        <input type="text" placeholder="Vergi No" value={formData.tax_number} onChange={e => setFormData({...formData, tax_number: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div className="space-y-4">
                        <input type="text" placeholder="İletişim Kişisi" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                        <input type="tel" placeholder="Telefon" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                        <input type="email" placeholder="E-Posta" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                        <textarea placeholder="Adres" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border rounded-md" rows={2} />
                      </div>
                    </div>
                    <textarea placeholder="Notlar" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border rounded-md" rows={3} />
                    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Vazgeç</Button><Button type="submit">Kaydet</Button></div>
                  </form>
                )}
              </CardBody>
            </Card>
          )}

          {activeTab === 'transaction' && (
            <Card>
              <CardHeader className="border-b"><CardTitle>Yeni İşlem</CardTitle></CardHeader>
              <CardBody className="pt-6">
                <form onSubmit={handleAddTransaction} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setTxForm({...txForm, type: 'sale'})} className={`p-4 border-2 rounded-xl flex flex-col items-center ${txForm.type === 'sale' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}><ShoppingCart className="h-6 w-6 mb-2" /><span className="font-semibold text-sm">Satış</span></button>
                    <button type="button" onClick={() => setTxForm({...txForm, type: 'payment'})} className={`p-4 border-2 rounded-xl flex flex-col items-center ${txForm.type === 'payment' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}><CreditCard className="h-6 w-6 mb-2" /><span className="font-semibold text-sm">Tahsilat</span></button>
                  </div>

                  {txForm.type === 'sale' ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center"><h4 className="font-semibold">Ürünler</h4><Button type="button" onClick={() => setShowProductModal(true)} size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Yeni Ürün Ekle</Button></div>
                      <div className="flex gap-2">
                        <select className="flex-1 px-3 py-2 border rounded-md" onChange={(e) => { if(e.target.value) { addItemToSale(e.target.value); e.target.value = '' } }}>
                          <option value="">Ürün Seçiniz...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku || 'SKU Yok'})</option>)}
                        </select>
                      </div>
                      {selectedItems.length > 0 && (
                        <table className="min-w-full divide-y border rounded-lg overflow-hidden">
                          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs">Ürün</th><th className="px-4 py-2 text-center text-xs">Miktar</th><th className="px-4 py-2 text-center text-xs">B.Fiyat</th><th className="px-4 py-2 text-right text-xs">Toplam</th><th className="px-4 py-2"></th></tr></thead>
                          <tbody>
                            {selectedItems.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-2 text-sm">{item.product_name}</td>
                                <td className="px-4 py-2"><input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-20 px-2 py-1 border rounded text-center" /></td>
                                <td className="px-4 py-2"><input type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} className="w-24 px-2 py-1 border rounded text-center" /></td>
                                <td className="px-4 py-2 text-sm font-medium text-right">{item.total_price.toLocaleString('tr-TR')} ₺</td>
                                <td className="px-4 py-2 text-right"><button onClick={() => removeItem(idx)} className="text-red-500"><Trash2 className="h-4 w-4" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="font-semibold">Ödeme Yöntemi</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {['cash', 'credit_card', 'cheque'].map(m => (
                          <button key={m} type="button" onClick={() => setTxForm({...txForm, payment_method: m as any})} className={`py-2 border rounded-lg text-sm font-medium ${txForm.payment_method === m ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                            {m === 'cash' ? 'Nakit' : m === 'credit_card' ? 'Kredi Kartı' : 'Çek'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium mb-1">İşlem Tarihi</label><input type="date" value={txForm.transaction_date} onChange={e => setTxForm({...txForm, transaction_date: e.target.value})} className="w-full px-3 py-2 border rounded-md" /></div>
                    <div><label className="block text-xs font-medium mb-1">Toplam Tutar (₺)</label><input type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} className="w-full px-3 py-2 border rounded-md font-bold" disabled={txForm.type === 'sale'} /></div>
                  </div>
                  <textarea placeholder="İşlem açıklaması..." value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} className="w-full px-3 py-2 border rounded-md" rows={2} />
                  <div className="flex justify-end"><Button type="submit" disabled={saving || (txForm.type === 'sale' && selectedItems.length === 0)}>{saving ? 'Kaydediliyor...' : 'İşlemi Tamamla'}</Button></div>
                </form>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* New Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <CardHeader className="border-b"><CardTitle>Hızlı Ürün Ekle</CardTitle></CardHeader>
            <CardBody className="pt-6">
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <input type="text" required placeholder="Ürün Adı" value={newProductData.name} onChange={e => setNewProductData({...newProductData, name: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                <input type="text" placeholder="SKU / Barkod" value={newProductData.sku} onChange={e => setNewProductData({...newProductData, sku: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                <select value={newProductData.unit} onChange={e => setNewProductData({...newProductData, unit: e.target.value})} className="w-full px-3 py-2 border rounded-md"><option value="adet">Adet</option><option value="kg">KG</option><option value="litre">Litre</option><option value="metre">Metre</option></select>
                <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setShowProductModal(false)}>İptal</Button><Button type="submit">Ürünü Ekle</Button></div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
