'use client'

import { useState, useEffect, useRef, useCallback, startTransition } from 'react'
import {
  Plus,
  Trash2,
  Save,
  StickyNote,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import Barcode from 'react-barcode'
import {
  LABEL_TEMPLATES_STORAGE_KEY,
  type LabelFieldPosition,
  type LabelTemplate,
  getLabelPrintDimensions,
  normalizeLabelTemplate,
} from '@/lib/labelTemplate'

const DEFAULT_TEMPLATE: Omit<LabelTemplate, 'id'> = {
  name: 'Ürün Etiketi',
  type: 'product',
  orientation: 'horizontal',
  width: 70,
  height: 46,
  marginLeft: 5,
  marginRight: 5,
  labelsPerRow: 1,
  gapX: 2,
  gapY: 7,
  fields: {
    productName: true,
    productCode: false,
    salePrice: false,
    barcode: false,
    tags: false,
    description: false,
    shelfLocation: false,
    printQuantity: true,
    caseInnerQty: false,
  },
  positions: {
    productName: { x: 10, y: 8 },
    productCode: { x: 10, y: 25 },
    salePrice: { x: 10, y: 42 },
    barcode: { x: 10, y: 58 },
    tags: { x: 10, y: 75 },
    description: { x: 50, y: 8 },
    shelfLocation: { x: 50, y: 25 },
    printQuantity: { x: 68, y: 78 },
    caseInnerQty: { x: 10, y: 78 },
  },
}

const FIELD_LABELS: Record<string, string> = {
  productName: 'Ürün Adı',
  productCode: 'Ürün Kodu',
  salePrice: 'Satış Fiyatı',
  barcode: 'Ürün Barkodu',
  tags: 'Ürün Etiketleri',
  description: 'Sabit Açıklama',
  shelfLocation: 'Raf Yeri',
  printQuantity: 'Yazdırma adedi',
  caseInnerQty: 'Koli içi adet',
}

const FIELD_PREVIEW_VALUES: Record<string, string> = {
  productName: 'Bluetooth Kulaklık',
  productCode: 'SKU-001',
  salePrice: '₺249,90',
  barcode: '2001234567890',
  tags: 'Elektronik',
  description: 'ADET',
  shelfLocation: 'A-12',
  printQuantity: '×12',
  caseInnerQty: '24 adet',
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

function loadTemplates(): LabelTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LABEL_TEMPLATES_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(normalizeLabelTemplate) : []
  } catch {
    return []
  }
}

function saveTemplates(templates: LabelTemplate[]) {
  localStorage.setItem(LABEL_TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
}

// ------- Page -------
export default function LabelTemplatesPage() {
  const [templates, setTemplates] = useState<LabelTemplate[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editData, setEditData] = useState<LabelTemplate | null>(null)
  const [sectionsOpen, setSectionsOpen] = useState({
    page: true,
    label: true,
    fields: true,
  })
  const [hasChanges, setHasChanges] = useState(false)

  // localStorage yalnızca istemcide; SSR ile aynı ilk state ([]) korunur
  useEffect(() => {
    const loaded = loadTemplates()
    startTransition(() => {
      setTemplates(loaded)
      if (loaded.length > 0) {
        setSelectedId(loaded[0].id)
        setEditData({ ...loaded[0] })
      }
    })
  }, [])

  const selectTemplate = (id: string) => {
    if (hasChanges && !confirm('Kaydedilmemiş değişiklikler var. Devam etmek istiyor musunuz?')) return
    const t = templates.find((t) => t.id === id)
    if (t) {
      setSelectedId(id)
      setEditData({ ...t, fields: { ...t.fields }, positions: { ...t.positions } })
      setHasChanges(false)
    }
  }

  const createNew = () => {
    const newTemplate: LabelTemplate = {
      ...DEFAULT_TEMPLATE,
      id: generateId(),
      name: `Ürün Etiketi ${templates.length + 1}`,
      fields: { ...DEFAULT_TEMPLATE.fields },
      positions: { ...DEFAULT_TEMPLATE.positions },
    }
    const updated = [...templates, newTemplate]
    setTemplates(updated)
    saveTemplates(updated)
    setSelectedId(newTemplate.id)
    setEditData({ ...newTemplate, fields: { ...newTemplate.fields }, positions: { ...newTemplate.positions } })
    setHasChanges(false)
    toast.success('Yeni şablon oluşturuldu')
  }

  const duplicateTemplate = (id: string) => {
    const source = templates.find((t) => t.id === id)
    if (!source) return
    const dup: LabelTemplate = {
      ...source,
      id: generateId(),
      name: source.name + ' (Kopya)',
      fields: { ...source.fields },
      positions: { ...source.positions },
    }
    const updated = [...templates, dup]
    setTemplates(updated)
    saveTemplates(updated)
    setSelectedId(dup.id)
    setEditData({ ...dup, fields: { ...dup.fields }, positions: { ...dup.positions } })
    setHasChanges(false)
    toast.success('Şablon kopyalandı')
  }

  const deleteTemplate = (id: string) => {
    if (!confirm('Bu şablonu silmek istediğinizden emin misiniz?')) return
    const updated = templates.filter((t) => t.id !== id)
    setTemplates(updated)
    saveTemplates(updated)
    if (selectedId === id) {
      if (updated.length > 0) {
        setSelectedId(updated[0].id)
        setEditData({ ...updated[0] })
      } else {
        setSelectedId(null)
        setEditData(null)
      }
    }
    setHasChanges(false)
    toast.success('Şablon silindi')
  }

  const handleSave = () => {
    if (!editData || !selectedId) return
    const updated = templates.map((t) => (t.id === selectedId ? { ...editData } : t))
    setTemplates(updated)
    saveTemplates(updated)
    setHasChanges(false)
    toast.success('Şablon kaydedildi')
  }

  const updateField = <K extends keyof LabelTemplate>(key: K, value: LabelTemplate[K]) => {
    if (!editData) return
    setEditData({ ...editData, [key]: value })
    setHasChanges(true)
  }

  const toggleFieldVisibility = (field: string) => {
    if (!editData) return
    setEditData({
      ...editData,
      fields: { ...editData.fields, [field]: !editData.fields[field as keyof typeof editData.fields] },
    })
    setHasChanges(true)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Etiket Şablonları</h1>
          <p className="mt-1 text-gray-500 text-sm">Ürün etiketlerinizi özelleştirin ve yazdırın</p>
        </div>
        <Button onClick={createNew} className="h-11 px-5 rounded-xl font-bold">
          <Plus className="mr-2 h-4 w-4" />
          Yeni Şablon Ekle
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <StickyNote className="h-14 w-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700">Henüz şablon yok</h3>
          <p className="text-sm text-gray-500 mt-1 mb-5">İlk etiket şablonunuzu oluşturmak için yukarıdaki butona tıklayın</p>
          <Button onClick={createNew} className="h-10 px-6 rounded-xl font-bold">
            <Plus className="mr-2 h-4 w-4" />
            Şablon Oluştur
          </Button>
        </div>
      ) : (
        <>
          {/* Template list strip */}
          <div className="flex gap-2 flex-wrap">
            {templates.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => selectTemplate(t.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectTemplate(t.id) }}
                className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer select-none ${
                  selectedId === t.id
                    ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-600/20'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-700'
                }`}
              >
                <StickyNote className="h-4 w-4" />
                {t.name}
                <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      duplicateTemplate(t.id)
                    }}
                    className="p-1 rounded hover:bg-white/20"
                    title="Kopyala"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteTemplate(t.id)
                    }}
                    className="p-1 rounded hover:bg-red-500/20 text-red-300"
                    title="Sil"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editData && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
              {/* LEFT – Preview */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Template name header */}
                <div className="px-5 py-4 border-b border-gray-100 bg-primary-600">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Etiket Tanımı</span>
                  </div>
                  <div className="mt-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="flex items-center gap-2 text-sm text-white/80 font-semibold">
                      Şablon Adı
                    </div>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/15 border border-white/20 text-white placeholder-white/50 text-sm font-bold focus:ring-2 focus:ring-white/30 outline-none backdrop-blur-sm"
                      placeholder="Şablon adı"
                    />
                    <span className="text-sm text-white/70 font-medium">
                      Şablon Türü: <span className="text-white font-bold">Ürün Etiketi</span>
                    </span>
                  </div>
                </div>

                {/* Preview area */}
                <div className="p-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Canlı Önizleme</p>
                  <p className="text-[11px] text-gray-500 mb-2">Elementleri etiket üzerinde sürükleyerek konumlandırabilirsiniz. Ürün sayfasındaki yazdırma, bu önizleme ile aynı ölçü ve yönü kullanır.</p>
                  <p className="text-[10px] text-amber-700/90 font-semibold mb-4">Kaydetmediğiniz değişiklikler yazdırmaya yansımaz — sağ panelden &quot;Değişiklikleri Kaydet&quot; kullanın.</p>
                  <LabelPreview template={editData} onPositionChange={(field, pos) => {
                    setEditData((prev) => {
                      if (!prev) return prev
                      return { ...prev, positions: { ...prev.positions, [field]: pos } }
                    })
                    setHasChanges(true)
                  }} />
                </div>
              </div>

              {/* RIGHT – Settings */}
              <div className="space-y-3">
                {/* Save button */}
                {hasChanges && (
                  <button
                    onClick={handleSave}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all active:scale-[0.98] animate-in slide-in-from-top-2 duration-200"
                  >
                    <Save className="h-4 w-4" />
                    Değişiklikleri Kaydet
                  </button>
                )}

                {/* Sayfa Özellikleri */}
                <SettingsSection
                  title="Sayfa Özellikleri"
                  open={sectionsOpen.page}
                  onToggle={() => setSectionsOpen((s) => ({ ...s, page: !s.page }))}
                >
                  <SettingRow label="Sayfanın Sol Boşluğu" value={editData.marginLeft} unit="mm" onChange={(v) => updateField('marginLeft', v)} />
                  <SettingRow label="Sayfanın Sağ Boşluğu" value={editData.marginRight} unit="mm" onChange={(v) => updateField('marginRight', v)} />
                  <SettingRow label="Bir Satırdaki Etiket Sayısı" value={editData.labelsPerRow} unit="adet" onChange={(v) => updateField('labelsPerRow', v)} />
                </SettingsSection>

                {/* Etiket Özellikleri */}
                <SettingsSection
                  title="Etiket Özellikleri"
                  open={sectionsOpen.label}
                  onToggle={() => setSectionsOpen((s) => ({ ...s, label: !s.label }))}
                >
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600 font-medium">Etiket Yönü</span>
                    <select
                      value={editData.orientation}
                      onChange={(e) => updateField('orientation', e.target.value as 'horizontal' | 'vertical')}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    >
                      <option value="horizontal">Yatay</option>
                      <option value="vertical">Dikey</option>
                    </select>
                  </div>
                  <SettingRow label="Etiket Genişliği" value={editData.width} unit="mm" onChange={(v) => updateField('width', v)} />
                  <SettingRow label="Etiket Yüksekliği" value={editData.height} unit="mm" onChange={(v) => updateField('height', v)} />
                  <SettingRow label="Yanyana İki Etiket Arasındaki Boşluk" value={editData.gapX} unit="mm" onChange={(v) => updateField('gapX', v)} />
                  <SettingRow label="Altalta İki Etiket Arasındaki Boşluk" value={editData.gapY} unit="mm" onChange={(v) => updateField('gapY', v)} />
                </SettingsSection>

                {/* Etiket Kısımları */}
                <SettingsSection
                  title="Etiket Kısımları"
                  open={sectionsOpen.fields}
                  onToggle={() => setSectionsOpen((s) => ({ ...s, fields: !s.fields }))}
                >
                  {Object.entries(FIELD_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-600 font-medium">{label}</span>
                      <button
                        type="button"
                        onClick={() => toggleFieldVisibility(key)}
                        className={`px-4 py-1 rounded-md text-xs font-black tracking-wide transition-all ${
                          editData.fields[key as keyof typeof editData.fields]
                            ? 'bg-primary-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {editData.fields[key as keyof typeof editData.fields] ? 'Var' : 'Yok'}
                      </button>
                    </div>
                  ))}
                </SettingsSection>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ------- Settings Section Component -------
function SettingsSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50/50 transition-colors"
      >
        <span className="text-sm font-bold text-gray-800">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-primary-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100 pt-2">{children}</div>}
    </div>
  )
}

// ------- Setting Row Component -------
function SettingRow({
  label,
  value,
  unit,
  onChange,
}: {
  label: string
  value: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600 font-medium">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 text-center focus:ring-2 focus:ring-primary-500/20 outline-none"
        />
        <span className="text-xs text-gray-400 font-semibold w-8">{unit}</span>
      </div>
    </div>
  )
}

// ------- Label Preview Component with Drag & Drop -------
function LabelPreview({
  template,
  onPositionChange,
}: {
  template: LabelTemplate
  onPositionChange: (field: string, pos: LabelFieldPosition) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  const activeFields = Object.entries(template.fields)
    .filter(([, active]) => active)
    .map(([key]) => key)

  // Scale: fit the label into the preview area (ürün yazdırma ile aynı widthMm/heightMm)
  const maxW = 500
  const maxH = 350
  const { widthMm: w, heightMm: h } = getLabelPrintDimensions(template)
  const scale = Math.min(maxW / w, maxH / h, 6) // px per mm
  const pxW = w * scale
  const pxH = h * scale

  const handleMouseDown = useCallback(
    (field: string, e: React.MouseEvent) => {
      e.preventDefault()
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const pos = template.positions[field] || { x: 10, y: 10 }
      const elemX = (pos.x / 100) * rect.width
      const elemY = (pos.y / 100) * rect.height
      dragOffset.current = { x: e.clientX - rect.left - elemX, y: e.clientY - rect.top - elemY }
      setDragging(field)
    },
    [template.positions]
  )

  useEffect(() => {
    if (!dragging) return

    const onMove = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left - dragOffset.current.x) / rect.width) * 100))
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top - dragOffset.current.y) / rect.height) * 100))
      onPositionChange(dragging, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 })
    }

    const onUp = () => setDragging(null)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, onPositionChange])

  const getFieldStyle = (field: string): string => {
    switch (field) {
      case 'productName':
        return 'text-xs font-bold text-gray-900'
      case 'productCode':
        return 'text-[10px] font-mono text-gray-500'
      case 'salePrice':
        return 'text-sm font-black text-primary-700'
      case 'barcode':
        return 'text-[10px] font-mono text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200'
      case 'tags':
        return 'text-[9px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full'
      case 'description':
        return 'text-[10px] font-semibold text-gray-500 uppercase'
      case 'shelfLocation':
        return 'text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded'
      case 'printQuantity':
        return 'text-[11px] font-black text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded-md border border-gray-200'
      case 'caseInnerQty':
        return 'text-[10px] font-bold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200'
      default:
        return 'text-[10px] text-gray-600'
    }
  }

  return (
    <div className="flex items-center justify-center py-4">
      <div
        ref={containerRef}
        className="relative bg-white border-2 border-dashed border-gray-300 rounded-xl shadow-inner"
        style={{ width: pxW, height: pxH, userSelect: 'none' }}
      >
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, #000 0, #000 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, #000 0, #000 1px, transparent 1px, transparent 20px)',
        }} />

        {activeFields.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-gray-400 font-medium">Kısımlardan elementleri etkinleştirin</p>
          </div>
        )}

        {activeFields.map((field) => {
          const pos = template.positions[field] || { x: 10, y: 10 }
          const isDraggingThis = dragging === field
          return (
            <div
              key={field}
              onMouseDown={(e) => handleMouseDown(field, e)}
              className={`absolute cursor-grab flex items-center gap-1 select-none transition-shadow ${
                isDraggingThis ? 'z-50 ring-2 ring-primary-500 shadow-lg cursor-grabbing' : 'hover:ring-1 hover:ring-primary-300 hover:shadow-sm z-10'
              }`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(0, 0)',
              }}
              title={`${FIELD_LABELS[field]} — sürükleyerek taşıyın`}
            >
              <GripVertical className="h-3 w-3 text-gray-400 shrink-0" />
              {field === 'barcode' ? (
                <Barcode
                  value={FIELD_PREVIEW_VALUES[field]}
                  width={1}
                  height={30}
                  fontSize={8}
                  margin={0}
                  displayValue={true}
                />
              ) : (
                <span className={`whitespace-nowrap ${getFieldStyle(field)}`}>
                  {FIELD_PREVIEW_VALUES[field]}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
