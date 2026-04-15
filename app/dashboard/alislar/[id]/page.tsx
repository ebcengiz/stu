'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer, Trash2, Building, Calendar, FileText, Package, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'

interface PurchaseItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  products: {
    name: string
    sku: string
    unit: string
  }
  warehouses: {
    name: string
  }
}

interface Purchase {
  id: string
  purchase_date: string
  document_no: string
  order_no: string
  total_amount: number
  status: string
  description: string
  suppliers: {
    id: string
    company_name: string
    phone: string
    email: string
    address: string
  } | null
  purchase_items: PurchaseItem[]
}

export default function PurchaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPurchase = async () => {
      try {
        const res = await fetch(`/api/purchases/${params.id}`)
        if (!res.ok) throw new Error('Alış detayları yüklenemedi')
        const data = await res.json()
        setPurchase(data)
      } catch (error: any) {
        toast.error(error.message)
        router.push('/dashboard/alislar')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchPurchase()
  }, [params.id, router])

  const handleDelete = async () => {
    if (!confirm('Bu alış işlemini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return

    try {
      const res = await fetch(`/api/purchases/${params.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Silme işlemi başarısız')
      
      toast.success('Alış işlemi başarıyla silindi')
      router.push('/dashboard/alislar')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!purchase) return null

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard/alislar')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alış Detayı</h1>
            <p className="text-sm text-gray-500">#{purchase.document_no || purchase.id.substring(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => window.print()} className="flex-1 sm:flex-none">
            <Printer className="h-4 w-4 mr-2" /> Yazdır
          </Button>
          <Button variant="outline" onClick={handleDelete} className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 className="h-4 w-4 mr-2" /> Sil
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-gray-400" /> Tedarikçi ve Belge Bilgileri
            </CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tedarikçi</label>
                <p className="font-bold text-gray-900 text-lg">
                  {purchase.suppliers?.company_name || 'Hızlı Alış'}
                </p>
                {purchase.suppliers && (
                  <div className="text-sm text-gray-500 mt-1">
                    <p>{purchase.suppliers.phone}</p>
                    <p>{purchase.suppliers.email}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Açıklama</label>
                <p className="text-gray-700">{purchase.description || '-'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Alış Tarihi</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(purchase.purchase_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Belge / Sipariş No</label>
                  <p className="text-gray-900 font-medium">
                    {purchase.document_no || '-'} / {purchase.order_no || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`h-2.5 w-2.5 rounded-full mt-2 ${
                  purchase.status === 'Faturalaşmış' ? 'bg-primary-500' : 'bg-yellow-500'
                }`} />
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Durum</label>
                  <p className="text-gray-900 font-medium">{purchase.status}</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="h-full bg-primary-800 text-white">
          <CardHeader>
            <CardTitle className="text-primary-200 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> İşlem Özeti
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-6 pt-2">
            <div>
              <label className="text-xs font-bold text-primary-300 uppercase">Genel Toplam</label>
              <p className="text-3xl font-black">{purchase.total_amount.toLocaleString('tr-TR')} ₺</p>
            </div>
            <div className="h-px bg-primary-800" />
            <div className="p-4 bg-primary-800/50 rounded-xl border border-primary-600">
              <p className="text-xs text-primary-200 leading-relaxed italic">
                Bu alış işlemi sonucunda ilgili ürünlerin stokları artırılmış ve tedarikçi bakiyesi güncellenmiştir.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-400" /> Alınan Ürünler
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Giriş Deposu</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Miktar</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Birim Fiyat</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Toplam</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {purchase.purchase_items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">{item.products?.name}</p>
                      <p className="text-xs text-gray-500">{item.products?.sku}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.warehouses?.name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900">{item.quantity}</span>
                      <span className="text-xs text-gray-500 ml-1">{item.products?.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900 font-medium">
                      {item.unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                      {item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
