'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { ExpenseItemDefinitionRow } from '@/lib/masraf-kalemleri'
import TrNumberInput from '@/components/ui/TrNumberInput'
import { parseTrNumberInput } from '@/lib/tr-number-input'

/** Tek tip rozet: hafif alternans (renk gürültüsü yok) */
const chipClass = (i: number) =>
  i % 2 === 0
    ? 'border-slate-200/90 bg-white text-slate-800 hover:border-emerald-300/50 hover:bg-emerald-50/60'
    : 'border-slate-200/90 bg-slate-50 text-slate-800 hover:border-emerald-300/50 hover:bg-emerald-50/60'

function groupByCategory(items: ExpenseItemDefinitionRow[]) {
  const sorted = [...items].sort((a, b) => {
    const g = a.group_name.localeCompare(b.group_name, 'tr')
    if (g !== 0) return g
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.label.localeCompare(b.label, 'tr')
  })
  const map = new Map<string, ExpenseItemDefinitionRow[]>()
  for (const r of sorted) {
    if (!map.has(r.group_name)) map.set(r.group_name, [])
    map.get(r.group_name)!.push(r)
  }
  return map
}

type DialogState =
  | null
  | { kind: 'addMain' }
  | { kind: 'addSub'; groupName: string }
  | { kind: 'edit'; row: ExpenseItemDefinitionRow }

export default function MasrafKalemleriPage() {
  const [items, setItems] = useState<ExpenseItemDefinitionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [dialog, setDialog] = useState<DialogState>(null)

  const [mainGroup, setMainGroup] = useState('')
  const [mainFirstLabel, setMainFirstLabel] = useState('')
  const [subLabel, setSubLabel] = useState('')
  const [editGroup, setEditGroup] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [editSort, setEditSort] = useState('0')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await fetch('/api/expense-items')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Liste yüklenemedi')
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (e: any) {
      setLoadError(e.message || 'Liste yüklenemedi')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const grouped = useMemo(() => groupByCategory(items), [items])
  const groupNames = useMemo(() => [...grouped.keys()], [grouped])
  const datalistId = 'masraf-grup-onerileri'

  const closeDialog = () => {
    setDialog(null)
    setMainGroup('')
    setMainFirstLabel('')
    setSubLabel('')
    setEditGroup('')
    setEditLabel('')
    setEditSort('0')
  }

  const performDelete = async (row: ExpenseItemDefinitionRow) => {
    try {
      const res = await fetch(`/api/expense-items/${row.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Silinemedi')
      toast.success('Alt hesap silindi')
      closeDialog()
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Silinemedi')
    }
  }

  const confirmDelete = (row: ExpenseItemDefinitionRow) => {
    toast.custom(
      (t) => (
        <div
          className="pointer-events-auto max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-lg"
          role="dialog"
          aria-labelledby={`kalem-del-${t.id}`}
        >
          <p id={`kalem-del-${t.id}`} className="text-sm font-medium text-slate-900">
            Bu alt hesabı silmek istiyor musunuz?
          </p>
          <p className="mt-1 text-xs text-slate-500">
            <span className="font-medium text-slate-700">{row.label}</span> — kayıtlarda kullanılıyorsa silinemez.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => toast.dismiss(t.id)}
            >
              İptal
            </button>
            <button
              type="button"
              className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              onClick={() => {
                toast.dismiss(t.id)
                void performDelete(row)
              }}
            >
              Sil
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: 'top-center' }
    )
  }

  const submitAddMain = async (e: React.FormEvent) => {
    e.preventDefault()
    const group_name = mainGroup.trim()
    const label = mainFirstLabel.trim()
    if (!group_name || !label) {
      toast.error('Ana kategori ve ilk alt hesap adı zorunludur')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/expense-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name, label }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Eklenemedi')
      toast.success('Ana kategori eklendi')
      closeDialog()
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Eklenemedi')
    } finally {
      setSaving(false)
    }
  }

  const submitAddSub = async (e: React.FormEvent) => {
    e.preventDefault()
    if (dialog?.kind !== 'addSub') return
    const group_name = dialog.groupName
    const label = subLabel.trim()
    if (!label) {
      toast.error('Alt hesap adı girin')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/expense-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name, label }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Eklenemedi')
      toast.success('Alt hesap eklendi')
      closeDialog()
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Eklenemedi')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (row: ExpenseItemDefinitionRow) => {
    setEditGroup(row.group_name)
    setEditLabel(row.label)
    setEditSort(String(row.sort_order ?? 0))
    setDialog({ kind: 'edit', row })
  }

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (dialog?.kind !== 'edit') return
    const group_name = editGroup.trim()
    const label = editLabel.trim()
    if (!group_name || !label) {
      toast.error('Grup ve ad zorunludur')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/expense-items/${dialog.row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name,
          label,
          sort_order: Math.trunc(parseTrNumberInput(editSort)) || 0,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast.success('Güncellendi')
      closeDialog()
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href="/dashboard/hesaplarim/masraflar"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Masraflar
          </Link>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Masraf kalemleri</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setMainGroup('')
              setMainFirstLabel('')
              setDialog({ kind: 'addMain' })
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Yeni ana kalem
          </button>
          <Link
            href="/dashboard/hesaplarim/masraflar/yeni"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
          >
            <Plus className="h-4 w-4" />
            Yeni masraf
          </Link>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Ana kategoriler kartlarda; etikete tıklayınca düzenlenir. Silmede onay istenir.
      </p>

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50/90 px-2.5 py-2 text-xs text-red-800">{loadError}</div>
      )}

      {loading ? (
        <p className="text-xs text-slate-500">Yükleniyor…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...grouped.entries()].map(([groupName, rows]) => (
            <div
              key={groupName}
              className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md"
            >
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-slate-50/90 px-3 py-2">
                <h2 className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-slate-800">
                  {groupName}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSubLabel('')
                    setDialog({ kind: 'addSub', groupName })
                  }}
                  className="shrink-0 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  + Alt hesap
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 p-3">
                {rows.map((row, i) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => openEdit(row)}
                    title="Düzenle"
                    className={`rounded-md border px-2 py-1 text-xs font-medium transition ${chipClass(i)}`}
                  >
                    {row.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && !loadError && (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs text-slate-600">
          Henüz kalem yok. <span className="font-medium text-slate-800">Yeni ana kalem</span> ile başlayın.
        </p>
      )}

      <datalist id={datalistId}>
        {groupNames.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      {dialog?.kind === 'addMain' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-3"
          role="presentation"
          onClick={closeDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900">Yeni ana kategori</h3>
            <p className="mt-0.5 text-xs text-slate-500">Grup adı ve ilk alt hesap.</p>
            <form onSubmit={submitAddMain} className="mt-3 space-y-2">
              <div>
                <label className="mb-0.5 block text-[11px] font-medium text-slate-600">Ana kategori</label>
                <input
                  autoFocus
                  value={mainGroup}
                  onChange={(e) => setMainGroup(e.target.value)}
                  placeholder="Örn. Araç Giderleri"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] font-medium text-slate-600">İlk alt hesap</label>
                <input
                  value={mainFirstLabel}
                  onChange={(e) => setMainFirstLabel(e.target.value)}
                  placeholder="Örn. Yakıt"
                  className={inputClass}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dialog?.kind === 'addSub' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-3"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900">Alt hesap ekle</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{dialog.groupName}</span>
            </p>
            <form onSubmit={submitAddSub} className="mt-3 space-y-2">
              <div>
                <label className="mb-0.5 block text-[11px] font-medium text-slate-600">Ad</label>
                <input
                  autoFocus
                  value={subLabel}
                  onChange={(e) => setSubLabel(e.target.value)}
                  placeholder="Örn. İnternet"
                  className={inputClass}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dialog?.kind === 'edit' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-3"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900">Alt hesap</h3>
            <p className="mt-0.5 font-mono text-[10px] text-slate-400">{dialog.row.item_key}</p>
            <form onSubmit={submitEdit} className="mt-3 space-y-2">
              <div>
                <label className="mb-0.5 block text-[11px] font-medium text-slate-600">Grup</label>
                <input
                  value={editGroup}
                  onChange={(e) => setEditGroup(e.target.value)}
                  list={datalistId}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] font-medium text-slate-600">Görünen ad</label>
                <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] font-medium text-slate-600">Sıra</label>
                <TrNumberInput
                  value={editSort}
                  onChange={setEditSort}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => confirmDelete(dialog.row)}
                  className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  Sil
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
