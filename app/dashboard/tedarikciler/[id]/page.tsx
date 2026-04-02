'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Building, CreditCard, FileText, ShoppingCart, Save, DollarSign, Plus, Search, Trash2, Package, X, Check, History, Users, User, Info, Calendar, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
// @ts-ignore
import { toast } from 'react-hot-toast'

interface Product {
  id: string
  name: string
  sku: string | null
  unit: string
  price: number | null
  tax_rate: number | null
  discount_rate: number | null
  stock?: Array<{
    id: string
    quantity: number
    warehouse_id: string
    warehouses: {
      id: string
      name: string
    }
  }>
}

interface Supplier {
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

interface TransactionItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  tax_rate: number
  discount_rate: number
  total_price: number
}

interface Transaction {
  id: string
  type: 'purchase' | 'payment'
  amount: number
  description: string
  transaction_date: string
  payment_method?: 'cash' | 'credit_card' | 'cheque'
  document_number?: string
  waybill_number?: string
  shipment_date?: string
  order_date?: string
  cheque_due_date?: string | null
  cheque_bank?: string | null
  cheque_serial_number?: string | null
  created_at: string
  supplier_transaction_items?: TransactionItem[]
}

interface SelectedItem {
  product_id: string
  product_name: string
  warehouse_id: string
  warehouse_name: string
  quantity: number
  unit_price: number
  tax_rate: number
  discount_rate: number
  tax_amount: number
  discount_amount: number
  total_price: number
}

interface Warehouse {
  id: string
  name: string
}

export default function SupplierDetailPage() {
  const router = useRouter()
  const params = useParams()
  const supplierId = params.id as string

  const [activeTab, setActiveTab] = useState<'info' | 'ledger' | 'transaction'>('ledger')
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false)
  const [newProductData, setNewProductData] = useState({ name: '', sku: '', unit: 'adet' })
  const [showItemDetailModal, setShowItemDetailModal] = useState(false)
  const [showTxDetailModal, setShowTxDetailModal] = useState(false)
  const [showChequeModal, setShowChequeModal] = useState(false)
  
  const [currentItem, setCurrentItem] = useState<Product | null>(null)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const [itemFormData, setItemFormData] = useState({
    quantity: 1,
    unit_price: 0,
    tax_rate: 20,
    discount_rate: 0,
    warehouse_id: ''
  })

  // Cheque Data State
  const [chequeData, setChequeData] = useState({
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    bank: '',
    serial_number: ''
  })

  // Edit Form State
  const [formData, setFormData] = useState({
    company_name: '', company_logo: '', address: '', contact_person: '',
    phone: '', email: '', tax_number: '', tax_office: '', notes: '', is_active: true
  })

  // Transaction Form State
  const [txForm, setTxForm] = useState({
    type: 'purchase' as 'purchase' | 'payment',
    payment_method: 'cash' as 'cash' | 'credit_card' | 'cheque',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    document_number: '',
    waybill_number: '',
    shipment_date: new Date().toISOString().split('T')[0],
    order_date: new Date().toISOString().split('T')[0]
  })

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [isProductListVisible, setIsProductListVisible] = useState(false)

  useEffect(() => {
    if (supplierId) {
      fetchSupplierData()
      fetchTransactions()
      fetchProducts()
      fetchWarehouses()
    }
  }, [supplierId])

  const fetchSupplierData = async () => {
    try {
      const response = await fetch('/api/suppliers')
      const data = await response.json()
      const current = Array.isArray(data) ? data.find((s: Supplier) => s.id === supplierId) : null
      if (current) {
        setSupplier(current)
        setFormData({
          company_name: current.company_name, company_logo: current.company_logo || '',
          address: current.address || '', contact_person: current.contact_person || '',
          phone: current.phone || '', email: current.email || '',
          tax_number: current.tax_number || '', tax_office: current.tax_office || '',
          notes: current.notes || '', is_active: current.is_active
        })
      }
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/supplier-transactions?supplier_id=${supplierId}`)
      const data = await response.json()
      setTransactions(Array.isArray(data) ? data : [])
    } catch (error) { console.error(error) }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) { console.error(error) }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses')
      const data = await response.json()
      setWarehouses(Array.isArray(data) ? data : [])
      if (Array.isArray(data) && data.length > 0) {
        setItemFormData(prev => ({ ...prev, warehouse_id: data[0].id }))
      }
    } catch (error) { console.error(error) }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingLogo(true)
    const uploadData = new FormData(); uploadData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: uploadData })
      const data = await res.json(); setFormData(prev => ({ ...prev, company_logo: data.url }))
      toast.success('Logo başarıyla yüklendi')
    } catch (err) { toast.error('Yükleme başarısız') }
    finally { setUploadingLogo(false) }
  }

  const openItemDetailModal = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    
    setCurrentItem(product)
    setItemFormData({
      quantity: 1,
      unit_price: product.price || 0,
      tax_rate: product.tax_rate || 20,
      discount_rate: product.discount_rate || 0,
      warehouse_id: warehouses[0]?.id || ''
    })
    setShowItemDetailModal(true)
  }

  const handleAddItemFromModal = () => {
    if (!currentItem) return

    const quantity = Number(itemFormData.quantity)
    const unitPrice = Number(itemFormData.unit_price)
    const taxRate = Number(itemFormData.tax_rate)
    const discountRate = Number(itemFormData.discount_rate)

    const baseAmount = unitPrice * quantity
    const discountAmount = (baseAmount * discountRate) / 100
    const subtotal = baseAmount - discountAmount
    const taxAmount = (subtotal * taxRate) / 100
    const totalPrice = subtotal + taxAmount

    const warehouse = warehouses.find(w => w.id === itemFormData.warehouse_id)

    const newItem: SelectedItem = {
      product_id: currentItem.id,
      product_name: currentItem.name,
      warehouse_id: itemFormData.warehouse_id,
      warehouse_name: warehouse?.name || 'Bilinmeyen Depo',
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      discount_rate: discountRate,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_price: totalPrice
    }

    const newItems = [...selectedItems, newItem]
    setSelectedItems(newItems)
    const total = newItems.reduce((sum, i) => sum + i.total_price, 0)
    setTxForm(prev => ({ ...prev, amount: total.toFixed(2) }))
    setShowItemDetailModal(false)
    setCurrentItem(null)
  }

  const updateItem = (index: number, field: keyof SelectedItem, value: any) => {
    const newItems = [...selectedItems]
    const item = { ...newItems[index], [field]: value }
    const q = Number(item.quantity); const p = Number(item.unit_price); const tr = Number(item.tax_rate); const dr = Number(item.discount_rate)
    const base = p * q; const disc = (base * dr) / 100; const subt = base - disc; const tax = (subt * tr) / 100
    item.discount_amount = disc; item.tax_amount = tax; item.total_price = subt + tax
    newItems[index] = item; setSelectedItems(newItems)
    const total = newItems.reduce((sum, i) => sum + i.total_price, 0)
    setTxForm(prev => ({ ...prev, amount: total.toFixed(2) }))
  }

  const removeItem = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index)
    setSelectedItems(newItems)
    const total = newItems.reduce((sum, i) => sum + i.total_price, 0)
    setTxForm(prev => ({ ...prev, amount: total.toFixed(2) }))
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
      openItemDetailModal(newProd.id)
      setShowProductModal(false)
      setNewProductData({ name: '', sku: '', unit: 'adet' })
      toast.success('Ürün başarıyla oluşturuldu')
    } catch (err: any) { toast.error(err.message) }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = {
        supplier_id: supplierId, type: txForm.type, amount: parseFloat(txForm.amount),
        description: txForm.description, transaction_date: new Date(txForm.transaction_date).toISOString(),
        payment_method: txForm.type === 'payment' ? txForm.payment_method : null,
        document_number: txForm.type === 'purchase' ? txForm.document_number : null,
        waybill_number: txForm.type === 'purchase' ? txForm.waybill_number : null,
        shipment_date: txForm.type === 'purchase' ? new Date(txForm.shipment_date).toISOString() : null,
        order_date: txForm.type === 'purchase' ? new Date(txForm.order_date).toISOString() : null,
        cheque_due_date: txForm.type === 'payment' && txForm.payment_method === 'cheque' ? new Date(chequeData.due_date).toISOString() : null,
        cheque_bank: txForm.type === 'payment' && txForm.payment_method === 'cheque' ? chequeData.bank : null,
        cheque_serial_number: txForm.type === 'payment' && txForm.payment_method === 'cheque' ? chequeData.serial_number : null,
        items: txForm.type === 'purchase' ? selectedItems : []
      }
      const res = await fetch('/api/supplier-transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('İşlem kaydedilemedi')
      toast.success('İşlem başarıyla eklendi!')
      setTxForm({ 
        ...txForm, 
        amount: '', 
        description: '', 
        document_number: '', 
        waybill_number: '',
        transaction_date: new Date().toISOString().split('T')[0],
        shipment_date: new Date().toISOString().split('T')[0],
        order_date: new Date().toISOString().split('T')[0]
      }); 
      setChequeData({
        amount: '', due_date: new Date().toISOString().split('T')[0], bank: '', serial_number: ''
      });
      setSelectedItems([]); fetchTransactions(); setActiveTab('ledger')
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const cleanedData = Object.fromEntries(Object.entries(formData).map(([k, v]) => [k, v === '' ? null : v]))
      const res = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cleanedData),
      })
      if (!res.ok) throw new Error('Güncellenemedi')
      toast.success('Tedarikçi bilgileri güncellendi!'); setIsEditing(false); fetchSupplierData()
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!supplier) return null

  let totalBalance = 0
  const ledgerData = [...transactions].reverse().map(tx => {
    if (tx.type === 'purchase') totalBalance += Number(tx.amount)
    if (tx.type === 'payment') totalBalance -= Number(tx.amount)
    return { ...tx, balance: totalBalance }
  }).reverse()

  const currentModalBase = Number(itemFormData.unit_price) * Number(itemFormData.quantity)
  const currentModalDiscount = (currentModalBase * Number(itemFormData.discount_rate)) / 100
  const currentModalSubtotal = currentModalBase - currentModalDiscount
  const currentModalTax = (currentModalSubtotal * Number(itemFormData.tax_rate)) / 100
  const currentModalTotal = currentModalSubtotal + currentModalTax

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/dashboard/tedarikciler')} className="p-2 bg-white border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex items-center gap-4">
          {supplier.company_logo ? <img src={supplier.company_logo} className="h-16 w-16 rounded-full object-cover border-2 shadow-sm" /> : <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xl font-bold border-2 shadow-sm">{supplier.company_name[0].toUpperCase()}</div>}
          <div><h1 className="text-2xl font-bold text-gray-900">{supplier.company_name}</h1><p className="text-gray-500">{supplier.contact_person}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-2">
          <Card><CardBody className="p-2 space-y-1">
            <button onClick={() => {setActiveTab('ledger'); setIsEditing(false)}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'ledger' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}><FileText className="h-5 w-5" />Hesap Ekstresi</button>
            <button onClick={() => {setActiveTab('info'); setIsEditing(false)}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'info' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}><Building className="h-5 w-5" />Genel Bilgiler</button>
            <button onClick={() => {setActiveTab('transaction'); setIsEditing(false)}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'transaction' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}><DollarSign className="h-5 w-5" />Yeni İşlem</button>
          </CardBody></Card>
          <Card className="bg-gradient-to-br from-primary-600 to-primary-700 text-white"><CardBody className="p-4"><h3 className="text-xs font-semibold text-primary-100 uppercase mb-2">Güncel Bakiye</h3><div className="text-2xl font-bold">{totalBalance.toLocaleString('tr-TR')} ₺</div></CardBody></Card>
        </div>

        <div className="md:col-span-3">
          {activeTab === 'ledger' && (
            <Card>
              <CardHeader className="border-b"><CardTitle>Hesap Ekstresi</CardTitle></CardHeader>
              <CardBody className="p-0">
                <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Belge No</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bakiye</th></tr></thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {ledgerData.map(tx => (
                      <tr key={tx.id} onClick={() => { setSelectedTx(tx); setShowTxDetailModal(true); }} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap group-hover:text-primary-600 font-medium">{new Date(tx.transaction_date).toLocaleDateString('tr-TR')}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{tx.document_number || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tx.type === 'purchase' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>{tx.type === 'purchase' ? 'Alış' : 'Ödeme'}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{tx.description || '-'}</td>
                        <td className={`px-6 py-4 text-sm font-semibold text-right whitespace-nowrap ${tx.type === 'purchase' ? 'text-gray-900' : 'text-green-600'}`}>{tx.type === 'purchase' ? '+' : '-'}{Number(tx.amount).toLocaleString('tr-TR')} ₺</td>
                        <td className="px-6 py-4 text-sm font-bold text-right text-gray-900 whitespace-nowrap">{tx.balance.toLocaleString('tr-TR')} ₺</td>
                      </tr>
                    ))}
                    {ledgerData.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">Henüz bir işlem kaydı bulunmuyor.</td></tr>}
                  </tbody>
                </table></div>
              </CardBody>
            </Card>
          )}

          {activeTab === 'info' && (
            <Card>
              <CardHeader className="border-b flex flex-row items-center justify-between py-4"><CardTitle>Tedarikçi Bilgileri</CardTitle>{!isEditing && <Button onClick={() => setIsEditing(true)} size="sm" variant="outline" className="h-9 px-4"><Save className="mr-2 h-4 w-4" />Bilgileri Düzenle</Button>}</CardHeader>
              <CardBody className="pt-6">
                {!isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6"><div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Firma Ünvanı</h4><p className="text-gray-900 font-medium">{supplier.company_name}</p></div><div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vergi Bilgileri</h4><p className="text-gray-900">{supplier.tax_office || '-'} / {supplier.tax_number || '-'}</p></div><div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Adres</h4><p className="text-gray-600 leading-relaxed">{supplier.address || 'Adres bilgisi girilmemiş'}</p></div></div>
                    <div className="space-y-6"><div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">İletişim Kişisi</h4><p className="text-gray-900 font-medium">{supplier.contact_person || '-'}</p></div><div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Telefon / E-Posta</h4><p className="text-gray-900">{supplier.phone || '-'} / {supplier.email || '-'}</p></div><div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notlar</h4><p className="text-gray-600 italic leading-relaxed">{supplier.notes || 'Herhangi bir not bulunmuyor'}</p></div></div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateSupplier} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-500 uppercase px-1">Firma Ünvanı</label><input type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all" /></div>
                        <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-500 uppercase px-1">Firma Logosu</label><div className="flex items-center gap-4"><input type="file" onChange={handleLogoUpload} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-all cursor-pointer" />{uploadingLogo && <span className="text-xs text-primary-600 animate-pulse font-medium">Yükleniyor...</span>}</div></div>
                        <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-xs font-semibold text-gray-500 uppercase px-1">Vergi Dairesi</label><input type="text" value={formData.tax_office} onChange={e => setFormData({...formData, tax_office: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" /></div><div className="space-y-1.5"><label className="text-xs font-semibold text-gray-500 uppercase px-1">Vergi No</label><input type="text" value={formData.tax_number} onChange={e => setFormData({...formData, tax_number: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" /></div></div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-500 uppercase px-1">İletişim Kişisi</label><input type="text" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                        <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-xs font-semibold text-gray-500 uppercase px-1">Telefon</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div><div className="space-y-1.5"><label className="text-xs font-semibold text-gray-500 uppercase px-1">E-Posta</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div></div>
                        <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-500 uppercase px-1">Adres</label><textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg h-24 resize-none" /></div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t"><Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Vazgeç</Button><Button type="submit" disabled={saving}>{saving ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}</Button></div>
                  </form>
                )}
              </CardBody>
            </Card>
          )}

          {activeTab === 'transaction' && (
            <Card>
              <CardHeader className="border-b"><CardTitle>Yeni İşlem Kaydı</CardTitle></CardHeader>
              <CardBody className="pt-6">
                <form onSubmit={handleAddTransaction} className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <button type="button" onClick={() => setTxForm({...txForm, type: 'purchase'})} className={`p-6 border-2 rounded-2xl flex flex-col items-center transition-all ${txForm.type === 'purchase' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-50' : 'border-gray-100 text-gray-400 hover:border-gray-300'}`}><ShoppingCart className="h-8 w-8 mb-3" /><span className="font-bold text-lg">Alış</span></button>
                    <button type="button" onClick={() => setTxForm({...txForm, type: 'payment'})} className={`p-6 border-2 rounded-2xl flex flex-col items-center transition-all ${txForm.type === 'payment' ? 'border-green-500 bg-green-50 text-green-700 ring-4 ring-green-50' : 'border-gray-100 text-gray-400 hover:border-gray-300'}`}><CreditCard className="h-8 w-8 mb-3" /><span className="font-bold text-lg">Ödeme</span></button>
                  </div>

                  {txForm.type === 'purchase' ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center"><h4 className="font-bold text-gray-900 flex items-center gap-2"><Package className="h-5 w-5 text-gray-400" />Alınacak Ürünler</h4><Button type="button" onClick={() => setShowProductModal(true)} size="sm" variant="outline" className="h-8 text-xs"><Plus className="h-3 w-3 mr-1" />Hızlı Ürün Ekle</Button></div>
                      <div className="relative">
                        <div className="relative z-50">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Ürün ara veya seçin..."
                            value={productSearch}
                            onChange={(e) => {
                              setProductSearch(e.target.value)
                              setIsProductListVisible(true)
                            }}
                            onFocus={() => setIsProductListVisible(true)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-primary-50 transition-all"
                          />
                        </div>
                        
                        {isProductListVisible && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setIsProductListVisible(false)}
                            />
                            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                              {filteredProducts.length > 0 ? (
                                filteredProducts.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      openItemDetailModal(p.id)
                                      setProductSearch('')
                                      setIsProductListVisible(false)
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors flex items-center justify-between border-b border-gray-50 last:border-0"
                                  >
                                    <div>
                                      <div className="font-bold text-gray-900">{p.name}</div>
                                      <div className="text-xs text-gray-500">{p.sku || 'SKU YOK'}</div>
                                    </div>
                                    <div className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">
                                      {p.stock?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0} {p.unit}
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-8 text-center text-gray-500 italic">
                                  Ürün bulunamadı.
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {selectedItems.length > 0 && (
                        <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50/80">
                            <tr>
                              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Ürün Bilgisi</th>
                              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Depo</th>
                              <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Miktar</th>
                              <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">B.Fiyat</th>
                              <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Toplam</th>
                              <th className="px-5 py-3 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {selectedItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-4 text-sm font-medium text-gray-900">{item.product_name}</td>
                                <td className="px-5 py-4 text-xs font-bold text-primary-600">{item.warehouse_name}</td>
                                <td className="px-5 py-4"><input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-16 mx-auto block px-2 py-1.5 border rounded-lg text-center text-sm font-semibold" /></td>
                                <td className="px-5 py-4"><input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} className="w-24 mx-auto block px-2 py-1.5 border rounded-lg text-center text-sm font-semibold" /></td>
                                <td className="px-5 py-4 text-sm font-bold text-right text-gray-900">{item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                <td className="px-5 py-4 text-right"><button type="button" onClick={() => removeItem(idx)} className="p-2 text-gray-400 hover:text-red-500 transition-all"><Trash2 className="h-4 w-4" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <h4 className="font-bold text-gray-900 flex items-center gap-2"><CreditCard className="h-5 w-5 text-gray-400" />Ödeme Yöntemi</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { id: 'cash', label: 'Nakit', icon: DollarSign, color: 'green' },
                          { id: 'credit_card', label: 'Kredi Kartı', icon: CreditCard, color: 'blue' },
                          { id: 'cheque', label: 'Çek / Senet', icon: FileText, color: 'amber' }
                        ].map(m => (
                          <button key={m.id} type="button" onClick={() => { setTxForm({...txForm, payment_method: m.id as any}); if (m.id === 'cheque') setShowChequeModal(true); }} className={`p-4 border-2 rounded-2xl flex flex-col items-center transition-all ${txForm.payment_method === m.id ? `border-${m.color}-500 bg-${m.color}-50 text-${m.color}-700 shadow-md` : 'border-gray-50 bg-gray-50/50 text-gray-500 hover:border-gray-200'}`}>
                            <m.icon className={`h-6 w-6 mb-2 ${txForm.payment_method === m.id ? `text-${m.color}-600` : 'text-gray-400'}`} />
                            <span className="font-bold text-sm">{m.label}</span>
                          </button>
                        ))}
                      </div>

                      {txForm.payment_method === 'cheque' && (
                        <div className="mt-6 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-bold text-amber-900">Çek Bilgileri</h5>
                              <p className="text-sm text-amber-700/80 mt-1 font-medium">
                                {chequeData.amount ? `${Number(chequeData.amount).toLocaleString('tr-TR')} ₺ tutarında çek girildi. (Banka: ${chequeData.bank})` : 'Henüz çek detayı girilmedi.'}
                              </p>
                            </div>
                            <Button type="button" onClick={() => setShowChequeModal(true)} variant={chequeData.amount ? "outline" : "primary"} className={chequeData.amount ? "border-amber-300 text-amber-800 hover:bg-amber-100" : "bg-amber-600 hover:bg-amber-700 text-white"}>
                              {chequeData.amount ? 'Bilgileri Düzenle' : 'Çek Detayı Gir'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {txForm.type === 'purchase' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase px-1">Belge Numarası</label>
                        <input 
                          type="text" 
                          placeholder="Fatura No vb." 
                          value={txForm.document_number} 
                          onChange={e => setTxForm({...txForm, document_number: e.target.value})} 
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase px-1">İrsaliye Numarası</label>
                        <input 
                          type="text" 
                          placeholder="İrsaliye No" 
                          value={txForm.waybill_number} 
                          onChange={e => setTxForm({...txForm, waybill_number: e.target.value})} 
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase px-1">Sipariş Tarihi</label>
                        <input 
                          type="date" 
                          value={txForm.order_date} 
                          onChange={e => setTxForm({...txForm, order_date: e.target.value})} 
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase px-1">Sevk Tarihi</label>
                        <input 
                          type="date" 
                          value={txForm.shipment_date} 
                          onChange={e => setTxForm({...txForm, shipment_date: e.target.value})} 
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none" 
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">İşlem Tarihi</label>
                      <input type="date" value={txForm.transaction_date} onChange={e => setTxForm({...txForm, transaction_date: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Genel Toplam (₺)</label>
                      <input 
                        type="number" 
                        step="any" 
                        value={txForm.amount} 
                        onFocus={() => setTxForm({...txForm, amount: '' as any})}
                        onChange={e => setTxForm({...txForm, amount: e.target.value})} 
                        className="w-full px-4 py-3 border-2 border-primary-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-black text-xl text-primary-900 bg-primary-50/30 transition-all" 
                        disabled={txForm.type === 'purchase'} 
                      />
                    </div>
                  </div>
                  <textarea placeholder="İşlem açıklaması veya notlar..." value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none h-24 resize-none shadow-sm" />
                  <div className="flex justify-end pt-4"><Button type="submit" size="lg" disabled={saving || (txForm.type === 'purchase' && selectedItems.length === 0)} className="h-14 px-12 text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-95">{saving ? 'Kaydediliyor...' : 'İşlemi Tamamla'}</Button></div>
                </form>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Item Detail Modal */}
      {showItemDetailModal && currentItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden border-0">
            <CardHeader className="bg-gradient-to-r from-primary-600 to-primary-700 text-white flex flex-row items-center justify-between py-5 px-6 border-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md"><Package className="h-6 w-6 text-white" /></div>
                <div>
                  <CardTitle className="text-xl text-white font-bold">{currentItem.name}</CardTitle>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-primary-100/80 font-medium tracking-wide">{currentItem.sku || 'SKU YOK'}</p>
                    <span className="w-1 h-1 bg-white/30 rounded-full" />
                    <p className="text-xs text-white font-bold flex items-center gap-1"><History className="h-3 w-3" /> Mevcut Stok: {currentItem.stock?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0} {currentItem.unit}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowItemDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90"><X className="h-6 w-6 text-white" /></button>
            </CardHeader>
            <CardBody className="p-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Alış Fiyatı (₺)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input 
                        type="number" 
                        step="any" 
                        value={itemFormData.unit_price} 
                        onFocus={() => setItemFormData({...itemFormData, unit_price: '' as any})}
                        onChange={e => setItemFormData({...itemFormData, unit_price: Number(e.target.value)})} 
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 focus:outline-none font-bold text-gray-900 transition-all" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Miktar ({currentItem.unit})</label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input 
                        type="number" 
                        step="any" 
                        value={itemFormData.quantity} 
                        onFocus={() => setItemFormData({...itemFormData, quantity: '' as any})}
                        onChange={e => setItemFormData({...itemFormData, quantity: Number(e.target.value)})} 
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 focus:outline-none font-bold text-gray-900 transition-all" 
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">KDV Oranı (%)</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 font-bold text-gray-400">%</span>
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        value={itemFormData.tax_rate} 
                        onFocus={() => setItemFormData({...itemFormData, tax_rate: '' as any})}
                        onChange={e => setItemFormData({...itemFormData, tax_rate: Number(e.target.value)})} 
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 focus:outline-none font-bold text-gray-900 transition-all" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">İskonto (%)</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 font-bold text-gray-400">%</span>
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        value={itemFormData.discount_rate} 
                        onFocus={() => setItemFormData({...itemFormData, discount_rate: '' as any})}
                        onChange={e => setItemFormData({...itemFormData, discount_rate: Number(e.target.value)})} 
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 focus:outline-none font-bold text-gray-900 transition-all" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <div className="flex justify-between items-end px-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Giriş Yapılacak Depo *</label>
                  {itemFormData.warehouse_id && (
                    <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      Depo Mevcudu: {currentItem.stock?.find(s => s.warehouse_id === itemFormData.warehouse_id)?.quantity || 0} {currentItem.unit}
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors pointer-events-none" />
                  <select 
                    value={itemFormData.warehouse_id} 
                    onChange={e => setItemFormData({...itemFormData, warehouse_id: e.target.value})}
                    className="w-full pl-10 pr-10 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all bg-white appearance-none cursor-pointer"
                  >
                    {warehouses.map(w => {
                      const warehouseStock = currentItem.stock?.find(s => s.warehouse_id === w.id)?.quantity || 0
                      return (
                        <option key={w.id} value={w.id}>
                          {w.name} (Mevcut: {warehouseStock} {currentItem.unit})
                        </option>
                      )
                    })}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="mt-10 bg-gray-50/80 border border-gray-100 rounded-3xl p-6 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full -mr-12 -mt-12" />
                <div className="flex justify-between text-sm text-gray-500 font-medium"><span>Ara Toplam (KDV'siz):</span><span className="text-gray-900">{currentModalBase.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span></div>
                {currentModalDiscount > 0 && <div className="flex justify-between text-sm text-red-600 font-bold"><span>İskonto (%{itemFormData.discount_rate}):</span><span>-{currentModalDiscount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span></div>}
                <div className="flex justify-between text-sm text-gray-500 font-medium"><span>Hesaplanan KDV (%{itemFormData.tax_rate}):</span><span className="text-gray-900">+{currentModalTax.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span></div>
                <div className="pt-4 mt-2 border-t border-dashed border-gray-200 flex justify-between items-center">
                  <span className="font-black text-gray-900 uppercase tracking-wider text-xs">GENEL TOPLAM:</span>
                  <span className="text-3xl font-black text-primary-600 tracking-tight">{currentModalTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <Button type="button" variant="outline" onClick={() => setShowItemDetailModal(false)} className="flex-1 h-14 rounded-2xl font-bold border-2 text-gray-500">Vazgeç</Button>
                <Button type="button" onClick={handleAddItemFromModal} className="flex-[1.5] h-14 rounded-2xl font-bold text-lg bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all active:scale-95"><Check className="h-5 w-5 mr-2" />Listeye Ekle</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {showTxDetailModal && selectedTx && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[130] p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-3xl shadow-2xl animate-in zoom-in duration-300 rounded-3xl overflow-hidden border-0">
            <CardHeader className={`${selectedTx.type === 'purchase' ? 'bg-gradient-to-r from-primary-600 to-primary-700' : 'bg-gradient-to-r from-emerald-600 to-emerald-700'} text-white flex flex-row items-center justify-between py-6 px-8 border-0`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  {selectedTx.type === 'purchase' ? <ShoppingCart className="h-6 w-6 text-white" /> : <CreditCard className="h-6 w-6 text-white" />}
                </div>
                <div>
                  <CardTitle className="text-2xl text-white font-black">{selectedTx.type === 'purchase' ? 'Alış İşlemi' : 'Ödeme İşlemi'}</CardTitle>
                  <p className="text-xs text-white/80 font-bold tracking-widest uppercase mt-1">İşlem ID: #{selectedTx.id.slice(0,8)}</p>
                </div>
              </div>
              <button onClick={() => setShowTxDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X className="h-7 w-7 text-white" /></button>
            </CardHeader>
            <CardBody className="p-0 bg-white">
              <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50/50 border-b">
                <div className="p-6 text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">İşlem Tarihi</p><p className="text-sm font-bold text-gray-900 flex items-center justify-center gap-2"><Calendar className="h-4 w-4 text-primary-500" /> {new Date(selectedTx.transaction_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                <div className="p-6 text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">İşlem Tipi</p><p className="text-sm font-bold text-gray-900 flex items-center justify-center gap-2">{selectedTx.type === 'purchase' ? <Tag className="h-4 w-4 text-primary-500" /> : <Check className="h-4 w-4 text-emerald-500" />} {selectedTx.type === 'purchase' ? 'Borçlandırma' : 'Alacaklandırma'}</p></div>
                <div className="p-6 text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ödeme Yöntemi</p><p className="text-sm font-bold text-gray-900 flex items-center justify-center gap-2"><CreditCard className="h-4 w-4 text-primary-500" /> {selectedTx.payment_method === 'cash' ? 'Nakit' : selectedTx.payment_method === 'credit_card' ? 'Kredi Kartı' : selectedTx.payment_method === 'cheque' ? 'Çek / Senet' : 'Tanımsız'}</p></div>
              </div>

              <div className="p-8">
                {selectedTx.type === 'payment' && selectedTx.payment_method === 'cheque' && (selectedTx.cheque_bank || selectedTx.cheque_serial_number) && (
                  <div className="mb-8 space-y-4">
                    <h4 className="text-xs font-black text-amber-600 uppercase tracking-[0.2em] flex items-center gap-2"><FileText className="h-4 w-4" /> Çek Bilgileri</h4>
                    <div className="grid grid-cols-3 gap-4 bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm">
                      {selectedTx.cheque_bank && (
                        <div>
                          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Banka Adı</p>
                          <p className="text-sm font-bold text-amber-900">{selectedTx.cheque_bank}</p>
                        </div>
                      )}
                      {selectedTx.cheque_serial_number && (
                        <div>
                          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Seri Numarası</p>
                          <p className="text-sm font-bold text-amber-900 uppercase">{selectedTx.cheque_serial_number}</p>
                        </div>
                      )}
                      {selectedTx.cheque_due_date && (
                        <div>
                          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Vade Tarihi</p>
                          <p className="text-sm font-bold text-amber-900">{new Date(selectedTx.cheque_due_date).toLocaleDateString('tr-TR')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedTx.type === 'purchase' && (selectedTx.document_number || selectedTx.waybill_number || selectedTx.order_date || selectedTx.shipment_date) && (
                  <div className="mb-8 space-y-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2"><FileText className="h-4 w-4" /> Belge Bilgileri</h4>
                    <div className="grid grid-cols-2 gap-4 bg-primary-50/50 p-6 rounded-2xl border border-primary-100">
                      {selectedTx.document_number && (
                        <div>
                          <p className="text-[10px] font-black text-primary-400/80 uppercase tracking-widest mb-1">Belge No</p>
                          <p className="text-sm font-bold text-primary-900">{selectedTx.document_number}</p>
                        </div>
                      )}
                      {selectedTx.waybill_number && (
                        <div>
                          <p className="text-[10px] font-black text-primary-400/80 uppercase tracking-widest mb-1">İrsaliye No</p>
                          <p className="text-sm font-bold text-primary-900">{selectedTx.waybill_number}</p>
                        </div>
                      )}
                      {selectedTx.order_date && (
                        <div>
                          <p className="text-[10px] font-black text-primary-400/80 uppercase tracking-widest mb-1">Sipariş Tarihi</p>
                          <p className="text-sm font-bold text-primary-900">{new Date(selectedTx.order_date).toLocaleDateString('tr-TR')}</p>
                        </div>
                      )}
                      {selectedTx.shipment_date && (
                        <div>
                          <p className="text-[10px] font-black text-primary-400/80 uppercase tracking-widest mb-1">Sevk Tarihi</p>
                          <p className="text-sm font-bold text-primary-900">{new Date(selectedTx.shipment_date).toLocaleDateString('tr-TR')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedTx.type === 'purchase' && selectedTx.supplier_transaction_items && selectedTx.supplier_transaction_items.length > 0 ? (
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2"><Info className="h-4 w-4" /> Alınan Ürünler Detayı</h4>
                    <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Ürün Adı</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Miktar</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Birim Fiyat</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Toplam</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {selectedTx.supplier_transaction_items.map((item) => (
                            <tr key={item.id} className="hover:bg-primary-50/30 transition-colors">
                              <td className="px-6 py-4 text-sm font-bold text-gray-900">{item.product_name}</td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-600 text-center">{item.quantity}</td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-600 text-center">{item.unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                              <td className="px-6 py-4 text-sm font-black text-gray-900 text-right">{item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-8 border border-dashed border-gray-200 text-center">
                    <Info className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-bold">Bu işlem bir ödeme kaydıdır ve ürün detayı içermez.</p>
                    {selectedTx.description && <p className="text-xs text-gray-400 mt-2 font-medium">Açıklama: {selectedTx.description}</p>}
                  </div>
                )}

                {selectedTx.description && selectedTx.type === 'purchase' && (
                  <div className="mt-8 p-6 bg-primary-50 rounded-2xl border border-primary-100/50">
                    <h5 className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-2 flex items-center gap-2"><FileText className="h-3 w-3" /> İşlem Notu</h5>
                    <p className="text-sm text-primary-900 font-medium leading-relaxed">{selectedTx.description}</p>
                  </div>
                )}

                <div className="mt-10 flex items-center justify-between p-8 bg-gradient-to-br from-primary-800 to-primary-950 rounded-[2.5rem] text-white shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-white/10 rounded-3xl"><DollarSign className="h-8 w-8 text-primary-300" /></div>
                    <div><p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">İşlem Toplamı</p><p className="text-3xl font-black tracking-tight">{Number(selectedTx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p></div>
                  </div>
                  <Button onClick={() => setShowTxDetailModal(false)} className="h-14 px-10 rounded-2xl font-black bg-white text-primary-900 hover:bg-primary-50 transition-all shadow-lg active:scale-95 border-0">KAPAT</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Quick New Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in duration-300 rounded-3xl overflow-hidden border-0">
            <CardHeader className="bg-gray-50 border-b py-5 px-6"><CardTitle className="text-xl font-bold text-gray-900">Hızlı Ürün Tanımla</CardTitle></CardHeader>
            <CardBody className="p-8">
              <form onSubmit={handleCreateProduct} className="space-y-6">
                <div className="space-y-2"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Ürün Adı *</label><input type="text" required placeholder="Örn: iPhone 15 Pro Max" value={newProductData.name} onChange={e => setNewProductData({...newProductData, name: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none font-medium" /></div>
                <div className="space-y-2"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider px-1">SKU / Barkod</label><input type="text" placeholder="Örn: IP15-PRO-BLK" value={newProductData.sku} onChange={e => setNewProductData({...newProductData, sku: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none font-medium" /></div>
                <div className="space-y-2"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Birim</label><select value={newProductData.unit} onChange={e => setNewProductData({...newProductData, unit: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none appearance-none bg-white font-medium"><option value="adet">Adet</option><option value="kg">Kilogram (KG)</option><option value="litre">Litre (L)</option><option value="metre">Metre (m)</option><option value="paket">Paket</option></select></div>
                <div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setShowProductModal(false)} className="flex-1 h-12 font-bold">Vazgeç</Button><Button type="submit" className="flex-1 h-12 font-bold">Ürünü Kaydet</Button></div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Cheque Modal */}
      {showChequeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[140] p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden border-0">
            <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-700 text-white flex flex-row items-center justify-between py-5 px-6 border-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><FileText className="h-6 w-6 text-white" /></div>
                <div>
                  <CardTitle className="text-xl text-white font-bold">Çek Detayları</CardTitle>
                  <p className="text-xs text-amber-100 font-medium mt-0.5">Çek / Senet bilgilerinizi giriniz</p>
                </div>
              </div>
              <button onClick={() => setShowChequeModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90"><X className="h-6 w-6 text-white" /></button>
            </CardHeader>
            <CardBody className="p-8 space-y-6 bg-white">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Çek Tutarı (₺)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
                    <input type="number" step="any" value={chequeData.amount} onChange={e => setChequeData({...chequeData, amount: e.target.value})} className="w-full pl-12 pr-4 py-4 border-2 border-amber-100 bg-amber-50/30 rounded-2xl focus:border-amber-500 focus:ring-4 focus:ring-amber-50 focus:outline-none font-black text-xl text-amber-900 transition-all placeholder:text-amber-300" placeholder="0.00" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Vade Tarihi</label>
                  <input type="date" value={chequeData.due_date} onChange={e => setChequeData({...chequeData, due_date: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-amber-500 focus:ring-4 focus:ring-amber-50 outline-none font-bold text-gray-900 transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Banka Adı</label>
                  <input type="text" value={chequeData.bank} onChange={e => setChequeData({...chequeData, bank: e.target.value})} placeholder="Örn: Garanti Bankası" className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-amber-500 focus:ring-4 focus:ring-amber-50 outline-none font-bold text-gray-900 transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Çek Seri No</label>
                  <input type="text" value={chequeData.serial_number} onChange={e => setChequeData({...chequeData, serial_number: e.target.value})} placeholder="Örn: A1234567" className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-amber-500 focus:ring-4 focus:ring-amber-50 outline-none font-bold text-gray-900 transition-all uppercase" />
                </div>
              </div>

              <div className="flex gap-4 pt-4 mt-6 border-t border-dashed border-gray-200">
                <Button type="button" variant="outline" onClick={() => setShowChequeModal(false)} className="flex-1 h-14 rounded-2xl font-bold border-2 text-gray-500">Vazgeç</Button>
                <Button type="button" onClick={() => { setTxForm(prev => ({...prev, amount: chequeData.amount})); setShowChequeModal(false); }} className="flex-[1.5] h-14 rounded-2xl font-bold text-lg bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all active:scale-95 text-white">
                  <Check className="h-5 w-5 mr-2" /> Kaydet
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
