'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Printer, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'

interface OfferItem {
  id: string
  product_id: string
  products: { name: string; unit: string }
  quantity: number
  unit_price: number
  tax_rate: number
  total_price: number
}

interface Offer {
  id: string
  offer_date: string
  valid_until: string | null
  document_no: string | null
  total_amount: number
  status: string
  description: string | null
  notes: string | null
  customers: { company_name: string; phone: string; email: string; address: string } | null
  offer_items: OfferItem[]
}

export default function OfferDetailPage() {
  const router = useRouter()
  const params = useParams()
  const offerId = params.id as string

  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)

  const fetchOffer = useCallback(async () => {
    try {
      const response = await fetch(`/api/offers/${offerId}`)
      if (!response.ok) throw new Error('Teklif bulunamadı')
      const data = await response.json()
      setOffer(data)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Hata'
      toast.error(msg)
      router.push('/dashboard/teklifler')
    } finally {
      setLoading(false)
    }
  }, [offerId, router])

  useEffect(() => {
    void fetchOffer()
  }, [fetchOffer])

  const handleApprove = async () => {
    if (!offer) return
    
    setApproving(true)
    try {
      const res = await fetch(`/api/offers/${offerId}/approve`, {
        method: 'POST'
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Teklif onaylanamadı')
      }

      const data = await res.json()
      toast.success('Teklif onaylandı ve satışa dönüştürüldü!')
      router.push(`/dashboard/satislar/${data.sale_id}`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setApproving(false)
    }
  }

  const handleUpdateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!res.ok) throw new Error('Durum güncellenemedi')
      
      toast.success('Teklif durumu güncellendi')
      fetchOffer()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Onaylandı': return 'bg-green-100 text-green-800'
      case 'Reddedildi': return 'bg-red-100 text-red-800'
      case 'İptal': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!offer) return null

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/teklifler')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teklif Detayı</h1>
            <p className="text-sm text-gray-500">#{offer.id.substring(0, 8)} — {offer.document_no || 'No Belirtilmemiş'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {offer.status === 'Beklemede' && (
            <>
              <Button onClick={() => router.push(`/dashboard/teklifler/duzenle/${offer.id}`)} variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                Teklifi Düzenle
              </Button>
              <Button onClick={handleApprove} disabled={approving} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" /> {approving ? 'Onaylanıyor...' : 'Teklifi Onayla (Satışa Dönüştür)'}
              </Button>
              <Button onClick={() => handleUpdateStatus('Reddedildi')} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                <XCircle className="h-4 w-4 mr-2" /> Reddet
              </Button>
            </>
          )}
          <Button onClick={() => window.print()} variant="outline">
            <Printer className="h-4 w-4 mr-2" /> Yazdır
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>Teklif İçeriği</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Miktar</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Birim Fiyat</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">KDV</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {offer.offer_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.products?.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 text-center">{item.quantity} {item.products?.unit}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 text-center">{item.unit_price.toLocaleString('tr-TR')} ₺</td>
                      <td className="px-6 py-4 text-sm text-gray-500 text-center">%{item.tax_rate}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right text-gray-900">Genel Toplam:</td>
                    <td className="px-6 py-4 text-right text-primary-700 text-lg">
                      {offer.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {(offer.description || offer.notes) && (
              <div className="p-6 border-t space-y-4">
                {offer.description && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Açıklama</h4>
                    <p className="text-sm text-gray-700">{offer.description}</p>
                  </div>
                )}
                {offer.notes && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Notlar</h4>
                    <p className="text-sm text-gray-700 italic">{offer.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Müşteri Bilgileri</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {offer.customers ? (
                <>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Firma</h4>
                    <p className="text-sm font-bold text-gray-900">{offer.customers.company_name}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">İletişim</h4>
                    <p className="text-sm text-gray-700">{offer.customers.phone || '-'}</p>
                    <p className="text-sm text-gray-700">{offer.customers.email || '-'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Adres</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{offer.customers.address || '-'}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">Müşteri bilgisi bulunamadı.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Teklif Durumu</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Durum:</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadge(offer.status)}`}>
                  {offer.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2"><Calendar className="h-4 w-4" /> Tarih:</span>
                <span className="font-medium">{new Date(offer.offer_date).toLocaleDateString('tr-TR')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2"><Clock className="h-4 w-4" /> Geçerlilik:</span>
                <span className="font-medium">{offer.valid_until ? new Date(offer.valid_until).toLocaleDateString('tr-TR') : 'Süresiz'}</span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
