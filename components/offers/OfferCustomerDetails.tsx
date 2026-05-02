'use client'

import Link from 'next/link'
import type { OfferCustomerEmbed } from '@/lib/types/offer-customer'

/** Teklif formu için yalnızca iletişim / kurumsal bilgiler (CRM alanları yok) */
function detailRows(c: OfferCustomerEmbed): { label: string; value: string }[] {
  const out: { label: string; value: string | null | undefined }[] = [
    { label: 'Yetkili kişi', value: c.contact_person },
    { label: 'Telefon', value: c.phone },
    { label: 'E-posta', value: c.email },
    { label: 'Vergi numarası', value: c.tax_number },
    { label: 'Vergi dairesi', value: c.tax_office },
    { label: 'Adres', value: c.address },
  ]

  return out
    .filter((x) => x.value != null && String(x.value).trim() !== '')
    .map((x) => ({ label: x.label, value: String(x.value).trim() }))
}

type Variant = 'screen' | 'print'

export function OfferCustomerDetails({
  customer,
  variant = 'screen',
}: {
  customer: OfferCustomerEmbed | null
  variant?: Variant
}) {
  if (!customer) {
    return (
      <p className={variant === 'print' ? 'text-sm italic text-gray-500' : 'text-sm text-gray-500 italic'}>
        Müşteri kaydı yok
      </p>
    )
  }

  const rows = detailRows(customer)

  if (variant === 'print') {
    return (
      <div className="space-y-3 text-sm leading-relaxed">
        <p className="text-lg font-bold text-gray-900">{customer.company_name}</p>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="break-inside-avoid">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</dt>
              <dd className="text-gray-800 whitespace-pre-line">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="pt-2 text-[10px] text-gray-400">Müşteri kayıt no: {customer.id}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Firma</h4>
          <p className="text-sm font-bold text-gray-900">{customer.company_name}</p>
        </div>
        <Link
          href={`/dashboard/musteriler/${customer.id}`}
          className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline shrink-0"
        >
          Müşteri detayı →
        </Link>
      </div>
      <dl className="space-y-3">
        {rows.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-bold text-gray-400 uppercase mb-0.5">{label}</dt>
            <dd className="text-sm text-gray-800 whitespace-pre-line">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
