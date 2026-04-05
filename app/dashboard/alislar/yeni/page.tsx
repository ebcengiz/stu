'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Save, Building, Store, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'

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

interface Supplier {
  id: string
  company_name: string
}

function PurchaseEntryForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supplierId = searchParams.get('supplierId')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  const [formData, setFormData] = useState({
    purchase_date: new Date().toISOString().split('T')[0],
    document_no: '',
    order_no: '',
    status: 'Bekliyor',
    description: '',
    paid_amount: '' as string | number,
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

        if (supplierId) {
          const suppRes = await fetch(`/api/suppliers/${supplierId}`)
          if (suppRes.ok) {
            setSupplier(await suppRes.json())
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
  }, [supplierId])

  const addItem = () => {
    setItems([...items, { product_id: '', warehouse_id: warehouses[0]?.id || '', quantity: 1, unit_price: 0, vat_rate: 20 }])
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
        // Alış fiyatı farklı olabilir ama varsayılan olarak ürün fiyatını getirebiliriz
        newItems[index].unit_price = product.price || 0
        newItems[index].vat_rate = product.tax_rate || 20
      }
    }
    setItems(newItems)
  }

  const calculateRowTotal = (item: any) => {
    const subtotal = Number(item.quantity) * Number(item.unit_price)
    const vatAmount = subtotal * (Number(item.vat_rate) / 100)
    return subtotal + vatAmount
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateRowTotal(item), 0)
  }

  const getAvailableStock = (productId: string, warehouseId: string) => {
    if (!productId || !warehouseId) return 0
    const product = products.find(p => p.id === productId)
    if (!product || !product.stock) return 0
    const stockRecords = product.stock.filter(s => s.warehouse_id === warehouseId)
    return stockRecords.reduce((sum, record) => sum + Number(record.quantity), 0)
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
      supplier_id: supplierId || null,
      total_amount: calculateTotal(),
      paid_amount: formData.paid_amount === '' ? 0 : Number(formData.paid_amount),
      items: items.map(item => ({
        ...item,
        total_price: calculateRowTotal(item)
      }))
    }

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Alış kaydedilemedi')
      }

      toast.success('Alış işlemi başarıyla kaydedildi!')
      router.push('/dashboard/alislar')
    } catch (error: any) {
      console.error('Error saving purchase:', error)
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
          <h1 className="text-3xl font-bold text-gray-900">
            {supplierId ? 'Tedarikçiden Alış' : 'Hızlı Alış (Fişsiz)'}
          </h1>
          <p className="mt-1 text-gray-600">
            {supplier ? <span className="flex items-center gap-2"><Building className="h-4 w-4"/> {supplier.company_name}</span> : <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4"/> Kayıtsız / Hızlı Ürün Girişi</span>}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Alış Detayları</CardTitle>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alış Tarihi *</label>
                <input
                  type="date"
                  required
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <input
                  type="text"
                  placeholder="Opsiyonel notlar..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Belge No (Fatura/Fiş)</label>
                <input
                  type="text"
                  placeholder="Örn: AL-2024-001"
                  value={formData.document_no}
                  onChange={(e) => setFormData({...formData, document_no: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sipariş No (Referans)</label>
                <input
                  type="text"
                  placeholder="Örn: ORD-5001"
                  value={formData.order_no}
                  onChange={(e) => setFormData({...formData, order_no: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Ödenen Tutar (₺)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Eğer anında ödeme yapıldıysa..."
                  value={formData.paid_amount}
                  onChange={(e) => setFormData({...formData, paid_amount: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-blue-300 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700"
                />
                <p className="text-xs text-gray-500 mt-1">Yapılan nakit/kredi kartı ödemesini buraya yazın.</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Alınan Ürünler</CardTitle>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-56">Giriş Deposu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Miktar</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Birim Fiyat</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">KDV (%)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-40">Toplam (KDV Dahil)</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => {
                    const availableStock = getAvailableStock(item.product_id, item.warehouse_id)
                    const unit = products.find(p => p.id === item.product_id)?.unit || 'adet'

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
                          <select
                            required
                            value={item.warehouse_id}
                            onChange={(e) => handleItemChange(index, 'warehouse_id', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-primary-500"
                          >
                            {warehouses.map(w => {
                              const stockAmount = getAvailableStock(item.product_id, w.id);
                              const stockText = item.product_id ? ` (${stockAmount} ${unit})` : '';
                              return (
                                <option key={w.id} value={w.id}>
                                  {w.name}{stockText}
                                </option>
                              )
                            })}
                          </select>
                          {item.product_id && item.warehouse_id && (
                            <div className="text-[10px] mt-1 font-medium text-gray-500">
                              Mevcut Stok: {availableStock.toLocaleString('tr-TR')} {unit}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 align-top">
                          <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-primary-500 text-center"
                          />
                        </td>
                        <td className="px-4 py-2 align-top">
                          <div className="relative">
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              value={item.unit_price === 0 ? '' : item.unit_price}
                              onChange={(e) => handleItemChange(index, 'unit_price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                              className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-primary-500"
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₺</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 align-top">
                           <select
                            required
                            value={item.vat_rate}
                            onChange={(e) => handleItemChange(index, 'vat_rate', parseInt(e.target.value))}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-primary-500"
                          >
                            <option value={0}>%0</option>
                            <option value={1}>%1</option>
                            <option value={10}>%10</option>
                            <option value={20}>%20</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900 align-top pt-4">
                          {calculateRowTotal(item).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
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
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Alış listesine ürün eklemek için "Satır Ekle" butonunu kullanın.</td>
                    </tr>
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-right text-gray-900 text-lg">Genel Toplam:</td>
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
            {saving ? 'Kaydediliyor...' : 'Alış İşlemini Tamamla'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function PurchaseEntryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Yükleniyor...</div>}>
      <PurchaseEntryForm />
    </Suspense>
  )
}
