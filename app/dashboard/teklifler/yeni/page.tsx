'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Building } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'
import TrNumberInput from '@/components/ui/TrNumberInput'
import { looseToTrInputString, parseTrNumberInput } from '@/lib/tr-number-input'

interface Product {
  id: string
  name: string
  price: number
  unit: string
  currency: string
  tax_rate: number
  stock?: {
    quantity: number
    warehouse_id: string
  }[]
}

interface Warehouse {
  id: string
  name: string
}

interface Customer {
  id: string
  company_name: string
  balance: number
}

function OfferEntryForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customerId')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  const [formData, setFormData] = useState({
    offer_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 hafta sonrası
    document_no: '',
    status: 'Beklemede',
    currency: 'TRY',
    description: '',
    notes: '',
  })

  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    const initData = async () => {
      try {
        const [productsRes, warehousesRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/warehouses')
        ])
        
        const productsData = await productsRes.json()
        const warehousesData = await warehousesRes.json()

        setProducts(Array.isArray(productsData) ? productsData : [])
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : [])

        if (customerId) {
          const custRes = await fetch(`/api/customers/${customerId}`)
          if (custRes.ok) {
            const customerData = await custRes.json()
            setCustomer(customerData)
            // Müşterinin varsayılan para birimini set et
            if (customerData.currency) {
              setFormData(prev => ({ ...prev, currency: customerData.currency }))
            }
          }
        }
      } catch (error) {
        console.error('Error initializing data:', error)
        toast.error('Veriler yüklenirken hata oluştu.')
      } finally {
        setLoading(false)
      }
    }
    
    initData()
  }, [customerId])

  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case 'USD': return '$'
      case 'EUR': return '€'
      case 'GBP': return '£'
      default: return '₺'
    }
  }

  const getStockForProduct = (productId: string, warehouseId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product || !warehouseId) return 0
    const stockItem = product.stock?.find((s) => s.warehouse_id === warehouseId)
    return stockItem?.quantity || 0
  }

  const addItem = () => {
    setItems([...items, { product_id: '', warehouse_id: warehouses[0]?.id || '', quantity: 1, unit_price: 0, tax_rate: 20 }])
  }

  const removeItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items]
    if (field === 'quantity' || field === 'unit_price') {
      const n = parseTrNumberInput(String(value))
      newItems[index][field] = Number.isFinite(n) ? n : 0
    } else {
      newItems[index][field] = value
    }

    if (field === 'product_id') {
      const product = products.find(p => p.id === value)
      if (product) {
        newItems[index].unit_price = product.price || 0
        newItems[index].tax_rate = product.tax_rate || 20
      }
    }
    setItems(newItems)
  }

  const calculateRowTotal = (item: any) => {
    const subtotal = Number(item.quantity) * Number(item.unit_price)
    const vatAmount = subtotal * (Number(item.tax_rate) / 100)
    return subtotal + vatAmount
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateRowTotal(item), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (items.length === 0) {
      toast.error('Lütfen en az bir ürün ekleyin.')
      return
    }

    if (!customerId) {
      toast.error('Lütfen bir müşteri seçin.')
      return
    }

    setSaving(true)

    const payload = {
      ...formData,
      customer_id: customerId,
      total_amount: calculateTotal(),
      items: items.map(item => ({
        ...item,
        total_price: calculateRowTotal(item)
      }))
    }

    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Teklif kaydedilemedi')
      }

      toast.success('Teklif başarıyla oluşturuldu!')
      router.push('/dashboard/teklifler')
    } catch (error: any) {
      console.error('Error saving offer:', error)
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teklif Hazırla</h1>
          <p className="mt-1 text-gray-600">
            {customer ? <span className="flex items-center gap-2"><Building className="h-4 w-4"/> {customer.company_name}</span> : <span className="text-red-500">Müşteri Seçilmedi</span>}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Teklif Detayları</CardTitle>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teklif Tarihi *</label>
                <input
                  type="date"
                  required
                  value={formData.offer_date}
                  onChange={(e) => setFormData({...formData, offer_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Geçerlilik Tarihi</label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="Beklemede">Beklemede</option>
                  <option value="Onaylandı">Onaylandı</option>
                  <option value="Reddedildi">Reddedildi</option>
                  <option value="İptal">İptal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teklif No</label>
                <input
                  type="text"
                  placeholder="Örn: OFF-2024-001"
                  value={formData.document_no}
                  onChange={(e) => setFormData({...formData, document_no: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Teklif Açıklaması</label>
                <input
                  type="text"
                  placeholder="Opsiyonel notlar..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Teklif Edilen Ürünler</CardTitle>
            <Button type="button" onClick={addItem} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" /> Satır Ekle
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-56">Depo ve Stok</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Miktar</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Birim Fiyat</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">KDV (%)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-40">Toplam (KDV Dahil)</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => {
                    const product = products.find(p => p.id === item.product_id)
                    const unit = product?.unit || 'adet'
                    const currentStock = getStockForProduct(item.product_id, item.warehouse_id)

                    return (
                      <tr key={index}>
                        <td className="px-4 py-2">
                          <select
                            required
                            value={item.product_id}
                            onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-primary-500"
                          >
                            <option value="">Ürün Seçin</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <div className="space-y-1">
                            <select
                              value={item.warehouse_id}
                              onChange={(e) => handleItemChange(index, 'warehouse_id', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-primary-500 font-medium"
                            >
                              <option value="">Depo Seçin</option>
                              {warehouses.map(w => {
                                const stock = getStockForProduct(item.product_id, w.id)
                                return (
                                  <option key={w.id} value={w.id}>
                                    {w.name} {item.product_id ? `(${stock} ${unit})` : ''}
                                  </option>
                                )
                              })}
                            </select>
                            {item.product_id && item.warehouse_id && (
                              <div className={`text-[10px] font-black px-1 py-0.5 rounded ${currentStock <= 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                                Mevcut Stok: {currentStock} {unit}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <TrNumberInput
                            required
                            value={looseToTrInputString(item.quantity)}
                            onChange={(v) => handleItemChange(index, 'quantity', v)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-primary-500 text-center"
                          />
                        </td>
                        <td className="px-4 py-2 align-top">
                          <div className="relative">
                            <TrNumberInput
                              required
                              value={looseToTrInputString(item.unit_price)}
                              onChange={(v) => handleItemChange(index, 'unit_price', v)}
                              className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-primary-500"
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                              {getCurrencySymbol(formData.currency)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 align-top">
                           <select
                            required
                            value={item.tax_rate}
                            onChange={(e) => handleItemChange(index, 'tax_rate', parseInt(e.target.value))}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-primary-500"
                          >
                            <option value={0}>%0</option>
                            <option value={1}>%1</option>
                            <option value={10}>%10</option>
                            <option value={20}>%20</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900 align-top pt-4">
                          {calculateRowTotal(item).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(formData.currency)}
                        </td>
                        <td className="px-4 py-2 text-center align-top pt-3">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Teklif listesine ürün eklemek için &quot;Satır Ekle&quot; butonunu kullanın.</td>
                    </tr>
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-right text-gray-900 text-lg">Teklif Toplamı:</td>
                      <td className="px-4 py-4 text-right text-primary-700 text-xl">
                        {calculateTotal().toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(formData.currency)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end pt-4 pb-12">
          <Button type="submit" className="px-8 py-3 text-lg" disabled={saving || items.length === 0}>
            {saving ? 'Kaydediliyor...' : 'Teklifi Oluştur ve Kaydet'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function OfferEntryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Yükleniyor...</div>}>
      <OfferEntryForm />
    </Suspense>
  )
}
