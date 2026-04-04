'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Save, Building, Store } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'

interface Product {
  id: string
  name: string
  price: number
  unit: string
  currency: string
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

function SaleEntryForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customerId')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  const [formData, setFormData] = useState({
    sale_date: new Date().toISOString().split('T')[0],
    document_no: '',
    order_no: '',
    status: 'Bekliyor',
    description: '',
    collected_amount: 0,
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
            setCustomer(await custRes.json())
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

  const addItem = () => {
    setItems([...items, { product_id: '', warehouse_id: warehouses[0]?.id || '', quantity: 1, unit_price: 0 }])
  }

  const removeItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index][field] = value

    if (field === 'product_id') {
      const product = products.find(p => p.id === value)
      if (product) {
        newItems[index].unit_price = product.price || 0
      }
    }
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (items.length === 0) {
      toast.error('Lütfen en az bir ürün ekleyin.')
      return
    }

    const invalidItems = items.filter(item => !item.product_id || !item.warehouse_id || item.quantity <= 0)
    if (invalidItems.length > 0) {
      toast.error('Lütfen ürün kalemlerini eksiksiz doldurun.')
      return
    }

    setSaving(true)

    const payload = {
      ...formData,
      customer_id: customerId || null,
      total_amount: calculateTotal(),
      items: items.map(item => ({
        ...item,
        total_price: Number(item.quantity) * Number(item.unit_price)
      }))
    }

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Satış kaydedilemedi')
      }

      toast.success('Satış işlemi başarıyla kaydedildi!')
      router.push('/dashboard/satislar')
    } catch (error: any) {
      console.error('Error saving sale:', error)
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {customerId ? 'Müşteriye Satış' : 'Perakende Satış'}
          </h1>
          <p className="mt-1 text-gray-600">
            {customer ? <span className="flex items-center gap-2"><Building className="h-4 w-4"/> {customer.company_name}</span> : <span className="flex items-center gap-2"><Store className="h-4 w-4"/> Kayıtsız (Perakende) Satış</span>}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Satış Detayları</CardTitle>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
                <input
                  type="date"
                  required
                  value={formData.sale_date}
                  onChange={(e) => setFormData({...formData, sale_date: e.target.value})}
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
                  <option value="Bekliyor">Bekliyor</option>
                  <option value="İrsaliyeleşmiş">İrsaliyeleşmiş</option>
                  <option value="Faturalaşmış">Faturalaşmış</option>
                  <option value="Faturalaşmış (E-Fatura)">Faturalaşmış (E-Fatura)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Satış Açıklaması</label>
                <input
                  type="text"
                  placeholder="Opsiyonel notlar..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Belge No (Fatura/İrsaliye)</label>
                <input
                  type="text"
                  placeholder="Örn: INV-2024-001"
                  value={formData.document_no}
                  onChange={(e) => setFormData({...formData, document_no: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sipariş No (Referans)</label>
                <input
                  type="text"
                  placeholder="Örn: ORD-1002"
                  value={formData.order_no}
                  onChange={(e) => setFormData({...formData, order_no: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tahsil Edilen Tutar (₺)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Eğer anında ödeme alındıysa..."
                  value={formData.collected_amount}
                  onChange={(e) => setFormData({...formData, collected_amount: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-green-300 bg-green-50 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-bold text-green-700"
                />
                <p className="text-xs text-gray-500 mt-1">Alınan nakit/kredi kartı ödemesini buraya yazın.</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Satılan Ürünler</CardTitle>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Çıkış Deposu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Miktar</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Birim Fiyat</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">Toplam</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
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
                        <select
                          required
                          value={item.warehouse_id}
                          onChange={(e) => handleItemChange(index, 'warehouse_id', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-primary-500"
                        >
                          {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-primary-500 text-center"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="relative">
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-primary-500"
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₺</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">
                        {(Number(item.quantity) * Number(item.unit_price)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Satış listesine ürün eklemek için "Satır Ekle" butonunu kullanın.</td>
                    </tr>
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-right text-gray-900 text-lg">Genel Toplam:</td>
                      <td className="px-4 py-4 text-right text-primary-700 text-xl">
                        {calculateTotal().toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
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
            {saving ? 'Kaydediliyor...' : 'Satışı Tamamla ve Kaydet'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function SalesEntryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Yükleniyor...</div>}>
      <SaleEntryForm />
    </Suspense>
  )
}