'use client'

import { useEffect } from 'react'

/**
 * Projedeki açılan tüm modalların dışına tıklandığında otomatik olarak
 * kapanmasını sağlayan global yardımcı bileşen.
 *
 * Çalışma prensibi:
 *  - Modallar genellikle `<div class="fixed inset-0 ...">` ile başlayan bir
 *    backdrop + içerideki kart şeklinde render ediliyor.
 *  - Kullanıcı backdrop boş alanına tıkladığında `e.target` doğrudan o
 *    backdrop div'i olur (kart içine tıklanırsa target başka bir eleman olur).
 *  - Bu durumda modal içindeki kapatma butonunu (lucide `X` ikonlu buton)
 *    bulup programatik olarak `click()` ettiriyoruz. Böylece modalın kendi
 *    state temizliği (setShowXxxModal(false), reset, vs.) tetiklenmiş oluyor.
 *
 * Bu yaklaşım sayesinde her modalı tek tek değiştirmeye gerek kalmıyor;
 * mevcut mimari korunuyor.
 */
export default function GlobalModalCloser() {
  useEffect(() => {
    const tryCloseModal = (target: HTMLElement) => {
      if (target.tagName !== 'DIV') return false
      const cls = target.className
      if (typeof cls !== 'string') return false
      // Sadece tam ekran kaplayan backdrop'lar
      if (!/\bfixed\b/.test(cls)) return false
      if (!/\binset-0\b/.test(cls)) return false

      // İçeride kapatma butonu (X ikonlu) varsa onu tıkla.
      const xIcon = target.querySelector<SVGElement>('svg.lucide-x')
      const closeBtn = xIcon?.closest('button') as HTMLButtonElement | null
      if (closeBtn) {
        closeBtn.click()
        return true
      }
      return false
    }

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (tryCloseModal(target)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // mousedown daha hızlı yakalar; ayrıca click ile de tetikliyoruz ki
    // input içinde basılı tutup dışarıda bırakma gibi durumlarda da çalışsın.
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return null
}
