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

  if (loading) return <div className="p-6 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!sale) return null

  const remainingAmount = sale.total_amount - sale.collected_amount

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/dashboard/satislar')}
            className="p-2.5 bg-gray-50 hover:bg-primary-50 text-gray-400 hover:text-primary-600 rounded-xl transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800">Satış Detayı</h1>
              <span className="px-2.5 py-0.5 bg-primary-100 text-primary-700 text-xs font-bold rounded-full uppercase">
                {sale.status}
              </span>
            </div>
            <p className="text-xs font-medium text-gray-400 mt-0.5 uppercase tracking-wider">
              Belge No: {sale.document_no || sale.id.substring(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.print()} className="h-9 rounded-lg text-sm">
            <Printer className="h-4 w-4 mr-1.5" /> Yazdır
          </Button>
          <Button variant="outline" onClick={handleDelete} className="h-9 rounded-lg text-sm text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200">
            <Trash2 className="h-4 w-4 mr-1.5" /> Sil
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side */}
        <div className="lg:col-span-8">
          <Card className="rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3 px-5">
              <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Building className="h-4 w-4 text-primary-500" /> MÜŞTERİ VE BELGE BİLGİLERİ
              </CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div className="p-4 bg-primary-50/50 rounded-xl border border-primary-100/50">
                    <label className="text-[10px] font-bold text-primary-400 uppercase tracking-wider block mb-1">Müşteri Ünvanı</label>
                    <p className="font-bold text-gray-900 text-lg">
                      {sale.customers?.company_name || 'Perakende Müşteri'}
                    </p>
                    {sale.customers && (
                      <div className="mt-2 flex flex-col gap-0.5">
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                           <span className="w-1 h-1 rounded-full bg-primary-300" /> {sale.customers.phone}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                           <span className="w-1 h-1 rounded-full bg-primary-300" /> {sale.customers.email}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">İşlem Notu</label>
                    <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                      &ldquo;{sale.description || 'Herhangi bir not eklenmemiş.'}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="p-2 bg-primary-50 text-primary-500 rounded-lg">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Satış Tarihi</label>
                      <p className="text-sm font-semibold text-gray-800">
                        {new Date(sale.sale_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Referanslar</label>
                      <p className="text-sm font-semibold text-gray-800">
                        {sale.document_no || '-'} <span className="text-gray-500 mx-1">|</span> {sale.order_no || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="p-2 bg-primary-50 text-primary-500 rounded-lg">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ürün Kalem Sayısı</label>
                      <p className="text-sm font-semibold text-gray-800">{sale.sale_items.length} Kalem Ürün</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Side */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">GENEL TOPLAM</label>
            <p className="text-3xl font-black text-gray-900 tracking-tight">
              {sale.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-lg text-gray-400">₺</span>
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Tahsil Edilen</label>
            <p className="text-xl font-bold text-primary-600">{sale.collected_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
          </div>

          <div className={`p-4 rounded-2xl border shadow-sm ${remainingAmount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200/80'}`}>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Kalan Bakiye</label>
            <p className={`text-xl font-bold ${remainingAmount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {remainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Hızlı Aksiyonlar</p>
             <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" className="w-full h-9 rounded-lg text-sm">E-Fatura Oluştur</Button>
                <Button variant="outline" className="w-full h-9 rounded-lg text-sm">İrsaliye Yazdır</Button>
             </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3 px-5">
          <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Package className="h-4 w-4 text-primary-500" /> SATILAN ÜRÜNLER LİSTESİ
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ürün Bilgisi</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Depo</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Miktar</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Birim Fiyat</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Satır Toplamı</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {sale.sale_items.map((item) => (
                  <tr key={item.id} className="hover:bg-primary-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800">{item.products?.name}</span>
                        <span className="text-[10px] text-gray-400 uppercase mt-0.5">{item.products?.sku || 'SKU YOK'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-md uppercase">
                        {item.warehouses?.name}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-sm font-semibold text-gray-800">{item.quantity}</span>
                      <span className="text-[10px] text-gray-400 ml-1 uppercase">{item.products?.unit}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm text-gray-600">{item.unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-bold text-primary-700">{item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
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
