'use client'

import { OfferCustomerDetails } from '@/components/offers/OfferCustomerDetails'
import type { OfferCustomerEmbed } from '@/lib/types/offer-customer'

interface OfferItem {
  id: string
  product_id: string
  products: { name: string; unit: string }
  quantity: number
  unit_price: number
  tax_rate: number
  total_price: number
}

interface OfferPrintViewProps {
  offer: {
    id: string
    offer_date: string
    valid_until: string | null
    document_no: string | null
    total_amount: number
    status: string
    description: string | null
    notes: string | null
    customers: OfferCustomerEmbed | null
    offer_items: OfferItem[]
  }
}

/** Yalnızca yazdırmada görünür — klasik teklif belgesi düzeni */
export function OfferPrintView({ offer }: OfferPrintViewProps) {
  const docRef = offer.document_no?.trim() || `TKL-${offer.id.substring(0, 8).toUpperCase()}`
  const offerDate = new Date(offer.offer_date).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const validUntil = offer.valid_until
    ? new Date(offer.valid_until).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <article className="mx-auto max-w-[210mm] bg-white text-gray-900 print:max-w-none">
      <header className="border-b-2 border-gray-900 pb-6 mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500">Ticari teklif belgesi</p>
        <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 print:text-2xl">SATIŞ TEKLİFİ</h1>
          <div className="text-right text-sm space-y-0.5">
            <p>
              <span className="text-gray-500">Belge no:</span>{' '}
              <span className="font-bold tabular-nums">{docRef}</span>
            </p>
            <p>
              <span className="text-gray-500">Tarih:</span>{' '}
              <span className="font-semibold">{offerDate}</span>
            </p>
            {validUntil && (
              <p>
                <span className="text-gray-500">Geçerlilik:</span>{' '}
                <span className="font-semibold">{validUntil}</span>
              </p>
            )}
            <p>
              <span className="text-gray-500">Durum:</span>{' '}
              <span className="font-semibold">{offer.status}</span>
            </p>
          </div>
        </div>
      </header>

      <section className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-2 print:mb-8">
        <div>
          <h2 className="mb-3 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Müşteri
          </h2>
          <OfferCustomerDetails customer={offer.customers} variant="print" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 print:border-gray-300 print:bg-white">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Özet</h2>
          <p className="text-2xl font-bold text-primary-800 print:text-gray-900">
            {offer.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </p>
          <p className="mt-1 text-xs text-gray-500">KDV dahil satır tutarları toplamıdır.</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Teklif kalemleri</h2>
        <table className="w-full border-collapse border border-gray-400 text-sm print:text-xs">
          <thead>
            <tr className="bg-gray-100 print:bg-gray-100">
              <th className="border border-gray-400 px-3 py-2 text-left font-bold text-gray-800">Ürün / hizmet</th>
              <th className="border border-gray-400 px-3 py-2 text-center font-bold text-gray-800 w-24">Miktar</th>
              <th className="border border-gray-400 px-3 py-2 text-center font-bold text-gray-800 w-28">Birim fiyat</th>
              <th className="border border-gray-400 px-3 py-2 text-center font-bold text-gray-800 w-16">KDV</th>
              <th className="border border-gray-400 px-3 py-2 text-right font-bold text-gray-800 w-32">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {offer.offer_items.map((item) => (
              <tr key={item.id} className="break-inside-avoid">
                <td className="border border-gray-400 px-3 py-2.5 align-top font-medium text-gray-900">
                  {item.products?.name ?? '—'}
                </td>
                <td className="border border-gray-400 px-3 py-2.5 text-center tabular-nums text-gray-800">
                  {item.quantity} {item.products?.unit ?? ''}
                </td>
                <td className="border border-gray-400 px-3 py-2.5 text-center tabular-nums text-gray-800">
                  {item.unit_price.toLocaleString('tr-TR')} ₺
                </td>
                <td className="border border-gray-400 px-3 py-2.5 text-center text-gray-700">%{item.tax_rate}</td>
                <td className="border border-gray-400 px-3 py-2.5 text-right font-semibold tabular-nums text-gray-900">
                  {item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold print:bg-gray-100">
              <td colSpan={4} className="border border-gray-400 px-3 py-3 text-right text-gray-900">
                Genel toplam
              </td>
              <td className="border border-gray-400 px-3 py-3 text-right text-lg text-primary-900 print:text-gray-900">
                {offer.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {(offer.description || offer.notes) && (
        <section className="mb-8 space-y-4 text-sm leading-relaxed print:mb-6">
          {offer.description && (
            <div>
              <h3 className="mb-1 text-xs font-bold uppercase text-gray-500">Açıklama</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{offer.description}</p>
            </div>
          )}
          {offer.notes && (
            <div>
              <h3 className="mb-1 text-xs font-bold uppercase text-gray-500">Notlar</h3>
              <p className="text-gray-700 whitespace-pre-wrap italic">{offer.notes}</p>
            </div>
          )}
        </section>
      )}

      <footer className="mt-12 border-t border-gray-200 pt-6 text-center text-[11px] text-gray-500 print:mt-8">
        <p>Bu belge sistem üzerinden oluşturulmuş teklif özetidir. Resmi koşullar için imzalı nüsha geçerlidir.</p>
      </footer>
    </article>
  )
}
