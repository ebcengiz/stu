'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer, Trash2, Building, Calendar, FileText, Package, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'

interface SaleItem {
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

interface Sale {
  id: string
  sale_date: string
  document_no: string
  order_no: string
  total_amount: number
  collected_amount: number
  status: string
  description: string
  customers: {
    id: string
    company_name: string
    phone: string
    email: string
    address: string
  } | null
  sale_items: SaleItem[]
}

export default function SaleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const res = await fetch(`/api/sales/${params.id}`)
        if (!res.ok) throw new Error('Satış detayları yüklenemedi')
        const data = await res.json()
        setSale(data)
      } catch (error: any) {
        toast.error(error.message)
        router.push('/dashboard/satislar')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchSale()
  }, [params.id, router])

  const handleDelete = async () => {
    if (!confirm('Bu satışı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return

    try {
      const res = await fetch(`/api/sales/${params.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Silme işlemi başarısız')
      
      toast.success('Satış başarıyla silindi')
      router.push('/dashboard/satislar')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!sale) return null

  const remainingAmount = sale.total_amount - sale.collected_amount

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard/satislar')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Satış Detayı</h1>
            <p className="text-sm text-gray-500">#{sale.document_no || sale.id.substring(0, 8)}</p>
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
              <Building className="h-5 w-5 text-gray-400" /> Müşteri ve Belge Bilgileri
            </CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Müşteri</label>
                <p className="font-bold text-gray-900 text-lg">
                  {sale.customers?.company_name || 'Perakende Müşteri'}
                </p>
                {sale.customers && (
                  <div className="text-sm text-gray-500 mt-1">
                    <p>{sale.customers.phone}</p>
                    <p>{sale.customers.email}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Açıklama</label>
                <p className="text-gray-700">{sale.description || '-'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Satış Tarihi</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(sale.sale_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Belge / Sipariş No</label>
                  <p className="text-gray-900 font-medium">
                    {sale.document_no || '-'} / {sale.order_no || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`h-2.5 w-2.5 rounded-full mt-2 ${
                  sale.status === 'Faturalaşmış' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Durum</label>
                  <p className="text-gray-900 font-medium">{sale.status}</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="h-full bg-gray-900 text-white">
          <CardHeader>
            <CardTitle className="text-gray-400 flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Ödeme Özeti
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-6 pt-2">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Toplam Tutar</label>
              <p className="text-3xl font-black">{sale.total_amount.toLocaleString('tr-TR')} ₺</p>
            </div>
            <div className="h-px bg-gray-800" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Tahsil Edilen</label>
                <p className="text-lg font-bold text-green-400">{sale.collected_amount.toLocaleString('tr-TR')} ₺</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Kalan</label>
                <p className="text-lg font-bold text-red-400">{remainingAmount.toLocaleString('tr-TR')} ₺</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-400" /> Satılan Ürünler
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Depo</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Miktar</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Birim Fiyat</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Toplam</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sale.sale_items.map((item) => (
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
