'use client'

import { useMemo } from 'react'
import { tryAmountToWords } from '@/lib/turkish-money-words'

export type TediyeMakbuzuData = {
  receiptNo: string
  /** İşlem / belge tarihi */
  transactionDateIso: string
  paymentLabel: string
  description: string
  amount: number
  currency: string
  payerName: string
  qrPayload: string
}

function formatTrDateLong(iso: string) {
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00')
  return d.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatMoneyAmount(n: number, cur: string) {
  const s = n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return cur === 'TRY' ? `${s} ₺` : `${s} ${cur}`
}

export default function TediyeMakbuzu({ data }: { data: TediyeMakbuzuData }) {
  const qrSrc = useMemo(() => {
    const enc = encodeURIComponent(data.qrPayload)
    return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=1&data=${enc}`
  }, [data.qrPayload])

  const amountWords =
    data.currency === 'TRY' ? tryAmountToWords(data.amount) : `Yalnız ${formatMoneyAmount(data.amount, data.currency)}`

  return (
    <div
      className="tediye-makbuzu-sheet box-border min-h-[280mm] w-[210mm] bg-white p-10 text-[13px] leading-relaxed text-black antialiased"
      style={{ fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif' }}
    >
      <div className="relative mb-8 flex justify-end">
        <div className="flex flex-col items-end gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="" width={100} height={100} className="h-[100px] w-[100px]" />
          <p className="text-[11px] font-medium tracking-wide text-neutral-700">No:{data.receiptNo}</p>
        </div>
      </div>

      <h1 className="mb-10 text-center text-xl font-bold tracking-wide text-neutral-900">TEDİYE MAKBUZU</h1>

      <dl className="space-y-4">
        <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1">
          <dt className="font-bold text-neutral-900">TARİH</dt>
          <dd className="text-neutral-800">{formatTrDateLong(data.transactionDateIso)}</dd>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1">
          <dt className="font-bold text-neutral-900">ÖDEME</dt>
          <dd className="text-neutral-800">{data.paymentLabel}</dd>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1">
          <dt className="font-bold text-neutral-900">AÇIKLAMA</dt>
          <dd className="break-words text-neutral-800">{data.description}</dd>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1">
          <dt className="font-bold text-neutral-900">TUTAR</dt>
          <dd>
            <div className="text-lg font-semibold tabular-nums text-neutral-900">
              {formatMoneyAmount(data.amount, data.currency)}
            </div>
            <div className="mt-2 max-w-full text-[12px] leading-snug text-neutral-600">{amountWords}</div>
          </dd>
        </div>
      </dl>

      <div className="mt-16 border-t border-neutral-400 pt-6">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="mb-8 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
              Ödemeyi yapan
            </p>
            <p className="min-h-[1.5rem] border-b border-neutral-300 text-sm font-medium text-neutral-900">
              {data.payerName || '—'}
            </p>
          </div>
          <div>
            <p className="mb-8 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
              Ödemeyi alan
            </p>
            <p className="min-h-[1.5rem] border-b border-neutral-300 text-sm font-medium text-neutral-900"></p>
          </div>
        </div>
      </div>
    </div>
  )
}
