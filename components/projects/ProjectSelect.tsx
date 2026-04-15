'use client'

import { useEffect, useState } from 'react'

export type ProjectOption = { id: string; name: string; is_active: boolean }

type Props = {
  value: string
  onChange: (id: string) => void
  label?: string
  disabled?: boolean
  /** Pasif projeleri de listeler (düzenleme vb.) */
  includeInactive?: boolean
  className?: string
}

export default function ProjectSelect({
  value,
  onChange,
  label = 'Proje',
  disabled,
  includeInactive,
  className = '',
}: Props) {
  const [opts, setOpts] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/projects')
        const j = await res.json().catch(() => ({}))
        if (!res.ok || cancelled) return
        setOpts(Array.isArray(j.projects) ? j.projects : [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const list = includeInactive ? opts : opts.filter((o) => o.is_active)

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label} (isteğe bağlı)</label>
      <select
        disabled={disabled || loading}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60"
      >
        <option value="">— Proje seçilmedi —</option>
        {list.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {!p.is_active ? ' (pasif)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
