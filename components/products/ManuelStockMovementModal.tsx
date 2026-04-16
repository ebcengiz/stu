'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import TrNumberInput from '@/components/ui/TrNumberInput'
import { Button } from '@/components/ui/Button'
import { CURRENCY_SYMBOLS } from '@/lib/currency'
import { parseTrNumberInput } from '@/lib/tr-number-input'

type WarehouseRow = { id: string; name: string }

export type ManuelStockMovementModalProps = {
  open: boolean
  onClose: () => void
  productId: string
  productName: string
  productUnit: string
  currency: string
  onSaved?: () => void
}

export function ManuelStockMovementModal({
  open,
  onClose,
  productId,
  productName,
  productUnit,
  currency,
  onSaved,
}: ManuelStockMovementModalProps) {
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([])
  const [transactionDate, setTransactionDate] = useState('')
  const [movementType, setMovementType] = useState<'in' | 'out'>('in')
  const [quantityStr, setQuantityStr] = useState('')
  const [unitCostStr, setUnitCostStr] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const symbol = CURRENCY_SYMBOLS[currency || 'TRY'] || currency || '\u20BA'

  const resetForm = useCallback(() => {
    setTransactionDate(new Date().toISOString().slice(0, 10))
    setMovementType('in')
    setQuantityStr('')
    setUnitCostStr('')
    setWarehouseId('')
    setDescription('')
  }, [])

  useEffect(() => {
    if (!open) return
    resetForm()
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/warehouses')
        const data = await res.json().catch(() => [])
        if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Depolar yüklenemedi')
        const list = Array.isArray(data) ? data : []
        if (cancelled) return
        setWarehouses(list.map((w: { id: string; name: string }) => ({ id: w.id, name: w.name })))
        if (list.length > 0) {
          setWarehouseId((prev) => prev || list[0].id)
        }
      } catch (e: unknown) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Depolar yüklenemedi')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, resetForm])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, saving])

  const tryClose = () => {
    if (saving) return
    onClose()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseTrNumberInput(quantityStr)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Geçerli bir miktar girin')
      return
    }
    if (!warehouseId) {
      toast.error('Depo seçin')
      return
    }
    const unitCost = parseTrNumberInput(unitCostStr)
    const hasUnitCost = unitCostStr.trim() !== '' && Number.isFinite(unitCost) && unitCost >= 0

    const noteParts: string[] = ['Manuel stok hareketi']
    if (hasUnitCost) {
      noteParts.push(`Birim maliyet (KDV hariç): ${unitCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${symbol}`)
    }
    if (description.trim()) noteParts.push(description.trim())
    const notes = noteParts.join('\n')

    setSaving(true)
    try {
      const res = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          warehouse_id: warehouseId,
          movement_type: movementType,
          quantity: qty,
          reference_no: null,
          notes,
          transaction_date: transactionDate || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast.success('Stok hareketi kaydedildi')
      onSaved?.()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px]"
      onClick={tryClose}
    >
      <div
        className="flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-2xl ring-1 ring-gray-900/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manuel-stok-title"
      >
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-4">
          <h2 id="manuel-stok-title" className="text-base font-semibold text-white">
            Manuel stok giriş / çıkış
          </h2>
          <button
            type="button"
            onClick={tryClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-white/90 transition hover:bg-white/10 disabled:opacity-50"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="border-b border-amber-100 bg-amber-50/90 px-5 py-3">
            <div className="flex gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-xs leading-relaxed text-amber-950">
                <p className="font-bold text-amber-900">Dikkat!</p>
                <p className="mt-1 text-amber-900/90">
                  Alış, satış, iade ya da üretim dışında bu ürünün stok giriş çıkış işlemi varsa buradan
                  yapabilirsiniz. Buradan yapacağınız işlem müşteri veya tedarikçi cari bakiyelerinizi
                  etkilemez; yalnızca depo stoklarınızı günceller.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-white px-5 py-5">
            <p className="text-[11px] text-gray-500">
              <span className="font-semibold text-gray-700">Ürün:</span> {productName}
            </p>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,140px)_1fr] sm:items-center">
              <label className="text-sm font-medium text-gray-600 sm:pt-2 sm:text-right">İşlem tarihi</label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />

              <label className="text-sm font-medium text-gray-600 sm:pt-2 sm:text-right">İşlem tipi</label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as 'in' | 'out')}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="in">Stoklara giriş yap</option>
                <option value="out">Stoklardan çıkış yap</option>
              </select>

              <label className="text-sm font-medium text-gray-600 sm:pt-2 sm:text-right">
                Miktar ({productUnit})
              </label>
              <TrNumberInput
                value={quantityStr}
                onChange={setQuantityStr}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="0"
              />

              <label className="text-sm font-medium text-gray-600 sm:pt-2 sm:text-right">Birim maliyet</label>
              <div className="min-w-0">
                <div className="flex overflow-hidden rounded-xl border border-gray-200 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20">
                  <span className="flex shrink-0 items-center border-r border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-600">
                    {symbol}
                  </span>
                  <TrNumberInput
                    value={unitCostStr}
                    onChange={setUnitCostStr}
                    className="min-w-0 flex-1 border-0 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-0"
                    placeholder={movementType === 'in' ? '0' : 'İsteğe bağlı'}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-500">
                  {movementType === 'in'
                    ? 'KDV hariç birim maliyet girin.'
                    : 'Çıkışta maliyet takibi isteğe bağlıdır; boş bırakılabilir.'}
                </p>
              </div>

              <label className="text-sm font-medium text-gray-600 sm:pt-2 sm:text-right">İlgili depo</label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                {warehouses.length === 0 ? (
                  <option value="">Depo yok</option>
                ) : (
                  warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))
                )}
              </select>

              <label className="self-start pt-2 text-sm font-medium text-gray-600 sm:text-right">Açıklama</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="İsteğe bağlı açıklama"
                className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 bg-gray-50/80 px-5 py-4">
            <Button type="button" variant="outline" disabled={saving} onClick={tryClose} className="gap-1.5">
              <X className="h-4 w-4" />
              Vazgeç
            </Button>
            <Button type="submit" disabled={saving} className="gap-1.5 bg-primary-600 hover:bg-primary-700">
              <Check className="h-4 w-4" />
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
