'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/Button'

export interface TenantCompanyRow {
  id: string
  name: string
  slug: string
  updated_at?: string | null
  tax_office?: string | null
  tax_number?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  mersis_no?: string | null
  trade_registry_no?: string | null
}

/** React controlled inputs: value must always be string, never undefined (uncontrolled → controlled uyarısı). */
function s(v: string | null | undefined): string {
  return v == null ? '' : String(v)
}

function formFromTenant(row: TenantCompanyRow) {
  return {
    name: s(row.name),
    tax_office: s(row.tax_office),
    tax_number: s(row.tax_number),
    address: s(row.address),
    phone: s(row.phone),
    email: s(row.email),
    website: s(row.website),
    mersis_no: s(row.mersis_no),
    trade_registry_no: s(row.trade_registry_no),
  }
}

export default function TenantCompanySettingsForm({ initial }: { initial: TenantCompanyRow }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => formFromTenant(initial))

  function applyServerRow(data: Record<string, unknown>) {
    setForm({
      name: s(data.name as string | null | undefined),
      tax_office: s(data.tax_office as string | null | undefined),
      tax_number: s(data.tax_number as string | null | undefined),
      address: s(data.address as string | null | undefined),
      phone: s(data.phone as string | null | undefined),
      email: s(data.email as string | null | undefined),
      website: s(data.website as string | null | undefined),
      mersis_no: s(data.mersis_no as string | null | undefined),
      trade_registry_no: s(data.trade_registry_no as string | null | undefined),
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          tax_office: form.tax_office,
          tax_number: form.tax_number,
          address: form.address,
          phone: form.phone,
          email: form.email,
          website: form.website,
          mersis_no: form.mersis_no,
          trade_registry_no: form.trade_registry_no,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Kaydedilemedi')
      }
      applyServerRow(data as Record<string, unknown>)
      toast.success('Firma bilgileri kaydedildi')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:ring-2 focus:ring-primary-500/25 focus:border-primary-300 outline-none transition-all'

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Zorunlu / temel</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Firma adı / ticari ünvan</label>
            <input
              type="text"
              required
              value={form.name ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Vergi dairesi</label>
            <input
              type="text"
              value={form.tax_office ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, tax_office: e.target.value }))}
              className={inputClass}
              placeholder="Şahıs şirketinde boş bırakılabilir"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Vergi numarası veya T.C. kimlik no</label>
            <input
              type="text"
              value={form.tax_number ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, tax_number: e.target.value }))}
              className={inputClass}
              placeholder="VKN (10–11 hane) veya TCKN"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Limited / A.Ş. için vergi numarası; şahıs şirketinde T.C. kimlik numarasını girebilirsiniz.
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Adres</label>
            <textarea
              rows={3}
              value={form.address ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className={`${inputClass} resize-none`}
              placeholder="Açık adres"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">İsteğe bağlı iletişim ve kayıt</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Telefon</label>
            <input
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">E-posta</label>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Web sitesi</label>
            <input
              type="url"
              value={form.website ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              className={inputClass}
              placeholder="https://"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">MERSİS no</label>
            <input
              type="text"
              value={form.mersis_no ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, mersis_no: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Ticari sicil no</label>
            <input
              type="text"
              value={form.trade_registry_no ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, trade_registry_no: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" className="h-10 px-6 rounded-xl" disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </div>
    </form>
  )
}
