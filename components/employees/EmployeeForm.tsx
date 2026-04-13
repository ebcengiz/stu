'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Mail,
  Phone,
  Check,
  Undo2,
  List,
  Calendar,
  IdCard,
  Banknote,
  Building2,
  ImageIcon,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import TrNumberInput from '@/components/ui/TrNumberInput'
import { parseTrNumberInput } from '@/lib/tr-number-input'

export interface EmployeeFormState {
  name: string
  email: string
  phone: string
  photo_url: string
  currency: string
  hire_date: string
  leave_date: string
  birth_date: string
  national_id: string
  monthly_net_salary: string
  bank_account_no: string
  department: string
  address: string
  bank_details: string
  notes: string
}

const emptyForm = (): EmployeeFormState => ({
  name: '',
  email: '',
  phone: '',
  photo_url: '',
  currency: 'TRY',
  hire_date: '',
  leave_date: '',
  birth_date: '',
  national_id: '',
  monthly_net_salary: '',
  bank_account_no: '',
  department: '',
  address: '',
  bank_details: '',
  notes: '',
})

function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = String(iso).slice(0, 10)
  return d.length === 10 ? d : ''
}

export default function EmployeeForm({ employeeId }: { employeeId?: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<'info' | 'other'>('info')
  const [loading, setLoading] = useState(!!employeeId)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EmployeeFormState>(emptyForm)
  const [uploading, setUploading] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveModalDate, setLeaveModalDate] = useState('')
  const [leaveSaving, setLeaveSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!employeeId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/employees/${employeeId}`)
        if (!res.ok) throw new Error('Yüklenemedi')
        const e = await res.json()
        setForm({
          name: e.name ?? '',
          email: e.email ?? '',
          phone: e.phone ?? '',
          photo_url: e.photo_url ?? '',
          currency: e.currency || 'TRY',
          hire_date: dateInputValue(e.hire_date),
          leave_date: dateInputValue(e.leave_date),
          birth_date: dateInputValue(e.birth_date),
          national_id: e.national_id ?? '',
          monthly_net_salary:
            e.monthly_net_salary != null ? String(e.monthly_net_salary) : '',
          bank_account_no: e.bank_account_no ?? '',
          department: e.department ?? '',
          address: e.address ?? '',
          bank_details: e.bank_details ?? '',
          notes: e.notes ?? '',
        })
      } catch {
        toast.error('Çalışan bilgileri alınamadı')
        router.push('/dashboard/hesaplarim/calisanlar')
      } finally {
        setLoading(false)
      }
    })()
  }, [employeeId, router])

  const setField = <K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handlePhoto = async (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Yükleme başarısız')
      setField('photo_url', data.url)
      toast.success('Resim yüklendi')
    } catch (err: any) {
      toast.error(err.message || 'Resim yüklenemedi')
    } finally {
      setUploading(false)
    }
  }

  const payload = (leaveDateOverride?: string | null) => ({
    name: form.name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    photo_url: form.photo_url.trim() || null,
    currency: form.currency,
    hire_date: form.hire_date || null,
    leave_date: leaveDateOverride !== undefined ? leaveDateOverride : form.leave_date || null,
    birth_date: form.birth_date || null,
    national_id: form.national_id.trim() || null,
    monthly_net_salary:
      form.monthly_net_salary === '' ? null : parseTrNumberInput(form.monthly_net_salary),
    bank_account_no: form.bank_account_no.trim() || null,
    department: form.department.trim() || null,
    address: form.address.trim() || null,
    bank_details: form.bank_details.trim() || null,
    notes: form.notes.trim() || null,
  })

  const openLeaveModal = () => {
    const fallback = new Date().toISOString().slice(0, 10)
    setLeaveModalDate(form.leave_date || fallback)
    setShowLeaveModal(true)
  }

  const handleDeleteEmployee = async () => {
    if (!employeeId) return
    if (!confirm(`"${form.name.trim() || 'Bu çalışan'}" silinsin mi?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Silinemedi')
      toast.success('Silindi')
      router.push('/dashboard/hesaplarim/calisanlar')
      router.refresh()
    } catch {
      toast.error('Silinemedi')
    } finally {
      setDeleting(false)
    }
  }

  const handleLeaveModalConfirm = async () => {
    if (!employeeId || !leaveModalDate) {
      toast.error('Ayrılma tarihi seçin')
      return
    }
    setLeaveSaving(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(leaveModalDate)),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      setField('leave_date', leaveModalDate)
      toast.success('İşten çıkarma kaydedildi')
      setShowLeaveModal(false)
      router.push(`/dashboard/hesaplarim/calisanlar/${employeeId}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Hata')
    } finally {
      setLeaveSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('İsim zorunludur')
      setTab('info')
      return
    }
    setSaving(true)
    try {
      const url = employeeId ? `/api/employees/${employeeId}` : '/api/employees'
      const res = await fetch(url, {
        method: employeeId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast.success(employeeId ? 'Güncellendi' : 'Kaydedildi')
      router.push(
        employeeId
          ? `/dashboard/hesaplarim/calisanlar/${employeeId}`
          : '/dashboard/hesaplarim/calisanlar'
      )
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Hata')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={saving || deleting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-5 h-11 gap-2"
        >
          <Check className="h-4 w-4" />
          Kaydet
        </Button>
        {employeeId && (
          <>
            <Button
              type="button"
              onClick={handleDeleteEmployee}
              disabled={saving || deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-5 h-11 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Sil
            </Button>
            <Button
              type="button"
              onClick={openLeaveModal}
              disabled={saving || deleting}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-5 h-11 gap-2"
            >
              <X className="h-4 w-4" />
              İşten Çıkar
            </Button>
          </>
        )}
        <Link
          href={
            employeeId
              ? `/dashboard/hesaplarim/calisanlar/${employeeId}`
              : '/dashboard/hesaplarim/calisanlar'
          }
          className="inline-flex items-center justify-center px-5 h-11 gap-2 rounded-lg border border-sky-300 bg-white text-sky-700 hover:bg-sky-50 font-medium transition-colors"
        >
          <Undo2 className="h-4 w-4" />
          Geri Dön
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex bg-emerald-600">
          <button
            type="button"
            onClick={() => setTab('info')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold uppercase tracking-wide transition-colors ${
              tab === 'info'
                ? 'bg-white text-emerald-700 rounded-tl-lg'
                : 'text-white/95 hover:bg-emerald-700/80'
            }`}
          >
            <User className="h-4 w-4" />
            Çalışan Bilgileri
          </button>
          <button
            type="button"
            onClick={() => setTab('other')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold uppercase tracking-wide transition-colors ${
              tab === 'other'
                ? 'bg-white text-emerald-700 rounded-tr-lg'
                : 'text-white/95 hover:bg-emerald-700/80'
            }`}
          >
            <List className="h-4 w-4" />
            Diğer Bilgiler
          </button>
        </div>

        <div className="p-6 md:p-8">
          {tab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">İsim</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder="Ad Soyad"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">E-Posta</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="İsteğe bağlı"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Cep Telefonu</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="İsteğe bağlı"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <div className="w-40 h-40 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {form.photo_url ? (
                    <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-gray-300" />
                  )}
                </div>
                <label className="mt-3">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
                  />
                  <span className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer hover:bg-emerald-100">
                    {uploading ? 'Yükleniyor...' : 'Resim seçin'}
                  </span>
                </label>
              </div>
            </div>
          )}

          {tab === 'other' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Cari Para Birimi</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setField('currency', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="TRY">TL</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    (maaş, avans ve masraf ödemeleri için kullanılan para birimi)
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">İşe Giriş Tarihi</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={form.hire_date}
                      onChange={(e) => setField('hire_date', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">İşten Ayrılış Tarihi</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={form.leave_date}
                      onChange={(e) => setField('leave_date', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Doğum Tarihi</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={(e) => setField('birth_date', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">T.C. Kimlik No</label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={form.national_id}
                      onChange={(e) => setField('national_id', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="İsteğe bağlı"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Aylık Net Maaş</label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <TrNumberInput
                      value={form.monthly_net_salary}
                      onChange={(v) => setField('monthly_net_salary', v)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="İsteğe bağlı"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Banka Hesap No</label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={form.bank_account_no}
                      onChange={(e) => setField('bank_account_no', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="İsteğe bağlı (hesap, IBAN)"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Departmanı</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={form.department}
                      onChange={(e) => setField('department', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="İsteğe bağlı"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Adres</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setField('address', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-y min-h-[100px]"
                    placeholder="İsteğe bağlı"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Banka Bilgileri</label>
                  <textarea
                    value={form.bank_details}
                    onChange={(e) => setField('bank_details', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-y min-h-[100px]"
                    placeholder="çalışanın banka hesap bilgilerini girebilirsiniz"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Not</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
                    placeholder="İsteğe bağlı"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showLeaveModal && employeeId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !leaveSaving && setShowLeaveModal(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-emerald-100 px-4 py-3">
              <h2 id="leave-modal-title" className="text-lg font-bold text-emerald-900">
                İşten Ayrılma
              </h2>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="rounded-lg p-1.5 text-white bg-emerald-600 hover:bg-emerald-700"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-red-800 leading-relaxed">
                <p>
                  Çalışanı işten çıkardığınız zaman bu çalışan için yapmış olduğu eski hareketler
                  (avanslar, maaşlar vs) silinmeyecektir.
                </p>
                <p className="mt-2">
                  Bu işlemi yaptıktan sonra &apos;İşten Ayrılış Tarihi&apos; alanını sildiğinizde tekrar işe
                  dönmüş olarak gözükecektir. İşten ayrılan çalışanlar, listede gri renkte gösterilir.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Ayrılma Tarihi</label>
                <input
                  type="date"
                  value={leaveModalDate}
                  onChange={(e) => setLeaveModalDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  disabled={leaveSaving}
                  className="rounded-lg bg-orange-500 px-5 hover:bg-orange-600 text-white"
                >
                  Vazgeç
                </Button>
                <Button
                  type="button"
                  onClick={handleLeaveModalConfirm}
                  disabled={leaveSaving || !leaveModalDate}
                  className="rounded-lg bg-red-600 px-5 hover:bg-red-700 text-white"
                >
                  {leaveSaving ? 'Kaydediliyor...' : 'Devam'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
