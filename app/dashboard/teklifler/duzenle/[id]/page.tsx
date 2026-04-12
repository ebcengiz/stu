'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Building } from 'lucide-react'
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

function OfferEditForm() {
  const router = useRouter()
  const params = useParams()
  const offerId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [customer, setCustomer] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  const [formData, setFormData] = useState({
    offer_date: '',
    valid_until: '',
    document_no: '',
    status: '',
    currency: 'TRY',
    description: '',
    notes: '',
  })

  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    const initData = async () => {
      try {
        const [productsRes, warehousesRes, offerRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/warehouses'),
          fetch(`/api/offers/${offerId}`)
        ])
        
        const productsData = await productsRes.json()
        const warehousesData = await warehousesRes.json()
        const offerData = await offerRes.json()

        setProducts(Array.isArray(productsData) ? productsData : [])
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : [])
        
        setCustomer(offerData.customers)
        setFormData({
          offer_date: offerData.offer_date.split('T')[0],
          valid_until: offerData.valid_until ? offerData.valid_until.split('T')[0] : '',
          document_no: offerData.document_no || '',
          status: offerData.status,
          currency: offerData.currency || 'TRY',
          description: offerData.description || '',
          notes: offerData.notes || '',
        })

        setItems(offerData.offer_items.map((item: any) => ({
          product_id: item.product_id,
          warehouse_id: item.warehouse_id || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
        })))

      } catch (error) {
        console.error('Error initializing data:', error)
        toast.error('Veriler yüklenirken hata oluştu.')
      } finally {
        setLoading(false)
      }
    }
    
    initData()
  }, [offerId])

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

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index][field] = value

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
    setSaving(true)

    const payload = {
      ...formData,
      total_amount: calculateTotal(),
      items: items.map(item => ({
        ...item,
        total_price: calculateRowTotal(item)
      }))
    }

    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Teklif güncellenemedi')

      toast.success('Teklif başarıyla güncellendi!')
      router.push(`/dashboard/teklifler/${offerId}`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teklifi Düzenle</h1>
          <p className="mt-1 text-gray-600">
            {customer && <span className="flex items-center gap-2"><Building className="h-4 w-4"/> {customer.company_name}</span>}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Teklif Detayları</CardTitle></CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teklif Tarihi</label>
                <input type="date" required value={formData.offer_date} onChange={(e) => setFormData({...formData, offer_date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Geçerlilik Tarihi</label>
                <input type="date" value={formData.valid_until} onChange={(e) => setFormData({...formData, valid_until: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="Beklemede">Beklemede</option>
                  <option value="Onaylandı">Onaylandı</option>
                  <option value="Reddedildi">Reddedildi</option>
                  <option value="İptal">İptal</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Ürünler</CardTitle>
            <Button type="button" onClick={addItem} variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" /> Satır Ekle</Button>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-64">Depo ve Stok</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">Miktar</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-32">Birim Fiyat</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-40">Toplam</th>
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
                          <select required value={item.product_id} onChange={(e) => handleItemChange(index, 'product_id', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none">
                            <option value="">Ürün Seçin</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <div className="space-y-1">
                            <select value={item.warehouse_id} onChange={(e) => handleItemChange(index, 'warehouse_id', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none font-medium">
                              <option value="">Depo Seçin</option>
                              {warehouses.map(w => {
                                const stock = getStockForProduct(item.product_id, w.id)
                                return <option key={w.id} value={w.id}>{w.name} {item.product_id ? `(${stock} ${unit})` : ''}</option>
                              })}
                            </select>
                            {item.product_id && item.warehouse_id && (
                              <div className={`text-[10px] font-black px-1 py-0.5 rounded ${currentStock <= 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>Stok: {currentStock} {unit}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2"><input type="number" required step="0.01" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center" /></td>
                        <td className="px-4 py-2"><input type="number" required step="0.01" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center" /></td>
                        <td className="px-4 py-2 text-right font-bold">{calculateRowTotal(item).toLocaleString('tr-TR')} {getCurrencySymbol(formData.currency)}</td>
                        <td className="px-4 py-2 text-center"><button type="button" onClick={() => removeItem(index)} className="text-red-500 p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Vazgeç</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</Button>
        </div>
      </form>
    </div>
  )
}

export default function OfferEditPage() {
  return <Suspense fallback={<div>Yükleniyor...</div>}><OfferEditForm /></Suspense>
}
