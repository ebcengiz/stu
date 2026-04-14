'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<RegisterInput>({
    email: '',
    password: '',
    fullName: '',
    tenantName: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const validated = registerSchema.parse(formData)

      // Call registration API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kayıt başarısız')
      }

      // Now login with the created credentials
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      })

      if (signInError) throw signInError

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Kayıt başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-green-50 to-emerald-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-200/60">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-700">Mikro Muhasebe</h1>
            <p className="text-gray-500 mt-2">Yeni hesap oluşturun</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="tenantName" className="block text-sm font-medium text-gray-700 mb-2">
                Firma Adı
              </label>
              <input
                id="tenantName"
                type="text"
                required
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                placeholder="ABC Şirketi"
              />
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                placeholder="Ahmet Yılmaz"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                placeholder="ornek@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md font-semibold"
            >
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Zaten hesabınız var mı?{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                Giriş Yap
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
