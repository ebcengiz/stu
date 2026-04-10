'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Save, Building, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'
import { CURRENCY_SYMBOLS } from '@/lib/currency'
import { isOdemeHesabi } from '@/lib/account-sections'

interface Product {
  id: string
  name: string
  price: number
  unit: string
  currency: string
  tax_rate: number
}

interface Warehouse {
  id: string
  name: string
}

interface Supplier {
  id: string
  company_name: string
  currency?: string
}

interface CashAccount {
  id: string
  name: string
  type: string
  currency: string
  balance: number
  is_active?: boolean
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
    status: 'Faturalaşmış',
    description: '',
    paid_amount: 0,
    payment_account_id: '',
    currency: 'TRY'
  })

  const [items, setItems] = useState<any[]>([])
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([])

  useEffect(() => {
    const initData = async () => {
      try {
        const [productsRes, warehousesRes, accountsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/warehouses'),
          fetch('/api/accounts'),
        ])
        
        setProducts(await productsRes.json())
        setWarehouses(await warehousesRes.json())
        if (accountsRes.ok) {
          const acc = await accountsRes.json()
          setCashAccounts(Array.isArray(acc) ? acc.filter((a: CashAccount) => a.is_active !== false) : [])
        }

        if (supplierId) {
          const suppRes = await fetch(`/api/suppliers/${supplierId}`)
          if (suppRes.ok) {
            const supplierData = await suppRes.json()
            setSupplier(supplierData)
            if (supplierData.currency) {
              setFormData(prev => ({ ...prev, currency: supplierData.currency }))
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

  const getCurrencySymbol = () => CURRENCY_SYMBOLS[formData.currency] || '₺'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      toast.error('Lütfen en az bir ürün ekleyin.')
      return
    }

    setSaving(true)

    if (
      supplierId &&
      formData.paid_amount > 0 &&
      !formData.payment_account_id
    ) {
      toast.error('Ödeme için paranın çekileceği kasa veya banka hesabını seçin')
      setSaving(false)
      return
    }

    const payload = {
      ...formData,
      supplier_id: supplierId || null,
      total_amount: calculateTotal(),
      payment_account_id: formData.payment_account_id || undefined,
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

      if (!res.ok) throw new Error('Alış kaydedilemedi')

      toast.success('Alış işlemi başarıyla kaydedildi!')
      router.push('/dashboard/alislar')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{supplierId ? 'Tedarikçiden Alış' : 'Hızlı Alış'}</h1>
          <p className="mt-1 text-gray-600">
            {supplier ? <span className="flex items-center gap-2"><Building className="h-4 w-4"/> {supplier.company_name}</span> : <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4"/> Kayıtsız Hızlı Alış</span>}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Alış Detayları</CardTitle></CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
                <input type="date" required value={formData.purchase_date} onChange={(e) => setFormData({...formData, purchase_date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Para Birimi</label>
                <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none">
                  {Object.keys(CURRENCY_SYMBOLS).map(code => <option key={code} value={code}>{code} ({CURRENCY_SYMBOLS[code]})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ödenen Tutar ({getCurrencySymbol()})</label>
                <input type="number" step="0.01" value={formData.paid_amount} onChange={(e) => {
                  const v = parseFloat(e.target.value) || 0
                  setFormData(prev => ({
                    ...prev,
                    paid_amount: v,
                    payment_account_id: v > 0 ? prev.payment_account_id : ''
                  }))
                }} className="w-full px-3 py-2 border border-blue-300 bg-blue-50 rounded-lg font-bold text-blue-700" />
              </div>
              {supplierId && formData.paid_amount > 0 && (
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ödemenin çekileceği hesap *</label>
                  <select
                    required
                    value={formData.payment_account_id}
                    onChange={e => setFormData({ ...formData, payment_account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-blue-300 bg-white rounded-lg font-semibold"
                  >
                    <option value="">Kasa veya banka seçin</option>
                    {cashAccounts
                      .filter(a => isOdemeHesabi(a.type) && a.currency === formData.currency)
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type}) — {Number(a.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Belge No</label>
                <input type="text" value={formData.document_no} onChange={(e) => setFormData({...formData, document_no: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Alınan Ürünler</CardTitle>
            <Button type="button" onClick={addItem} variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" /> Satır Ekle</Button>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-56">Depo</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">Miktar</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-32">Birim Fiyat</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-40">Toplam ({getCurrencySymbol()})</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">
                        <select required value={item.product_id} onChange={(e) => handleItemChange(index, 'product_id', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                          <option value="">Seçin</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select required value={item.warehouse_id} onChange={(e) => handleItemChange(index, 'warehouse_id', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2"><input type="number" step="0.01" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center" /></td>
                      <td className="px-4 py-2"><input type="number" step="0.01" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center" /></td>
                      <td className="px-4 py-2 text-right font-bold">{calculateRowTotal(item).toLocaleString('tr-TR')} {getCurrencySymbol()}</td>
                      <td className="px-4 py-2 text-center"><button type="button" onClick={() => removeItem(index)} className="text-red-500"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
                {items.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-right text-lg">Genel Toplam:</td>
                      <td className="px-4 py-4 text-right text-primary-700 text-xl">{calculateTotal().toLocaleString('tr-TR')} {getCurrencySymbol()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end pt-4 pb-12">
          <Button type="submit" className="px-8 py-3 text-lg" disabled={saving || items.length === 0}>{saving ? 'Kaydediliyor...' : 'Alışı Kaydet'}</Button>
        </div>
      </form>
    </div>
  )
}

export default function PurchaseEntryPage() {
  return <Suspense fallback={<div>Yükleniyor...</div>}><PurchaseEntryForm /></Suspense>
}
