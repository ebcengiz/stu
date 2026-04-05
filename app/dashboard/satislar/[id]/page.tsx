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
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => router.push('/dashboard/satislar')}
            className="p-3 bg-gray-50 hover:bg-primary-50 text-gray-400 hover:text-primary-600 rounded-2xl transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Satış Detayı</h1>
              <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-black rounded-full uppercase tracking-widest">
                {sale.status}
              </span>
            </div>
            <p className="text-sm font-bold text-gray-400 mt-0.5 uppercase tracking-[0.2em]">
              Belge No: {sale.document_no || sale.id.substring(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={() => window.print()} className="flex-1 md:flex-none h-12 rounded-xl font-bold border-gray-200 hover:border-primary-200 hover:bg-primary-50">
            <Printer className="h-5 w-5 mr-2" /> Yazdır
          </Button>
          <Button variant="outline" onClick={handleDelete} className="flex-1 md:flex-none h-12 rounded-xl font-bold text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200">
            <Trash2 className="h-5 w-5 mr-2" /> Sil
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Info Cards */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="rounded-[2.5rem] border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-6 px-8">
              <CardTitle className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <Building className="h-5 w-5 text-primary-500" /> MÜŞTERİ VE BELGE BİLGİLERİ
              </CardTitle>
            </CardHeader>
            <CardBody className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="p-6 bg-primary-50/50 rounded-3xl border border-primary-100/50">
                    <label className="text-[10px] font-black text-primary-400 uppercase tracking-widest block mb-2">Müşteri Ünvanı</label>
                    <p className="font-black text-primary-900 text-xl tracking-tight leading-tight">
                      {sale.customers?.company_name || 'Perakende Müşteri'}
                    </p>
                    {sale.customers && (
                      <div className="mt-4 flex flex-col gap-1">
                        <p className="text-sm font-bold text-primary-700/70 flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-primary-300" /> {sale.customers.phone}
                        </p>
                        <p className="text-sm font-bold text-primary-700/70 flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-primary-300" /> {sale.customers.email}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">İşlem Notu / Açıklama</label>
                    <p className="text-sm font-bold text-gray-600 leading-relaxed italic bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      "{sale.description || 'Herhangi bir not eklenmemiş.'}"
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-center gap-4 p-5 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group">
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Satış Tarihi</label>
                      <p className="text-gray-900 font-black">
                        {new Date(sale.sale_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-5 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group">
                    <div className="p-3 bg-amber-50 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Referanslar</label>
                      <p className="text-gray-900 font-black">
                        {sale.document_no || '-'} <span className="text-gray-300 mx-2">|</span> {sale.order_no || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-5 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group">
                    <div className="p-3 bg-primary-50 text-primary-500 rounded-xl group-hover:scale-110 transition-transform">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Ürün Kalem Sayısı</label>
                      <p className="text-gray-900 font-black">{sale.sale_items.length} Kalem Ürün</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Side: Financial Summary */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-[2.5rem] border-0 bg-gradient-to-br from-primary-800 to-primary-950 text-white shadow-2xl shadow-primary-900/20 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
              <CreditCard className="h-32 w-32" />
            </div>
            <CardBody className="p-8 relative z-10">
              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-primary-300 uppercase tracking-[0.2em] block mb-2">GENEL TOPLAM</label>
                  <p className="text-5xl font-black tracking-tighter">
                    {sale.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-2xl text-primary-400">₺</span>
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-4 pt-4">
                  <div className="p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10">
                    <label className="text-[10px] font-black text-primary-200 uppercase tracking-widest block mb-1">Tahsil Edilen</label>
                    <p className="text-2xl font-black text-white">{sale.collected_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                  </div>
                  
                  <div className={`p-5 rounded-3xl border backdrop-blur-md ${remainingAmount > 0 ? 'bg-red-500/20 border-red-500/30' : 'bg-white/10 border-white/10'}`}>
                    <label className="text-[10px] font-black text-primary-200 uppercase tracking-widest block mb-1">Kalan Bakiye</label>
                    <p className={`text-2xl font-black ${remainingAmount > 0 ? 'text-red-300' : 'text-primary-300'}`}>
                      {remainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Hızlı Aksiyonlar</p>
             <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" className="w-full h-12 rounded-2xl font-bold border-gray-100 hover:bg-gray-50">E-Fatura Oluştur</Button>
                <Button variant="outline" className="w-full h-12 rounded-2xl font-bold border-gray-100 hover:bg-gray-50">İrsaliye Yazdır</Button>
             </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <Card className="rounded-[2.5rem] border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-6 px-8">
          <CardTitle className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
            <Package className="h-5 w-5 text-primary-500" /> SATILAN ÜRÜNLER LİSTESİ
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Ürün Bilgisi</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Depo</th>
                  <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Miktar</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Birim Fiyat</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Satır Toplamı</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {sale.sale_items.map((item) => (
                  <tr key={item.id} className="hover:bg-primary-50/30 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900">{item.products?.name}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-wider">{item.products?.sku || 'SKU YOK'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black rounded-lg uppercase tracking-wider">
                        {item.warehouses?.name}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-sm font-black text-gray-900">{item.quantity}</span>
                      <span className="text-[10px] font-bold text-gray-400 ml-1 uppercase">{item.products?.unit}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-sm font-bold text-gray-600">{item.unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-base font-black text-primary-700">{item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
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
