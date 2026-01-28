# Quick Start Guide

Stok Takip Sistemi'ni 5 dakikada çalıştırın!

## Adım 1: Bağımlılıkları Yükleyin

```bash
npm install
```

## Adım 2: Supabase Projesi Oluşturun

1. https://supabase.com adresine gidin
2. Ücretsiz hesap oluşturun
3. "New Project" tıklayın
4. Proje bilgilerini girin ve oluşturun

## Adım 3: Environment Dosyası

```bash
cp .env.local.example .env.local
```

`.env.local` dosyasını düzenleyin:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Key'leri nereden bulabilirsiniz?**
Supabase Dashboard > Settings > API

## Adım 4: Veritabanı Şeması

1. Supabase Dashboard > SQL Editor
2. `supabase/migrations/001_initial_schema.sql` dosyasını açın
3. Tüm içeriği kopyalayıp SQL Editor'e yapıştırın
4. "Run" tıklayın

## Adım 5: Uygulamayı Başlatın

```bash
npm run dev
```

Tarayıcınızda http://localhost:3000 açın.

## Adım 6: İlk Kullanıcı

1. "Kayıt Ol" tıklayın
2. Firma bilgilerinizi girin
3. Dashboard'a hoş geldiniz!

## Sonraki Adımlar

- [Tam Kurulum Kılavuzu](./KURULUM.md)
- [Kullanım Kılavuzu](./KULLANIM.md)
- [API Dokümantasyonu](./API.md)

## Sorun mu yaşıyorsunuz?

1. Supabase URL ve key'leri kontrol edin
2. SQL migration'ın tamamen çalıştığından emin olun
3. Browser console'da hata kontrol edin

## Önemli Notlar

✅ İlk kayıt olan kullanıcı otomatik admin olur
✅ Her firma kendi verilerini görür
✅ Responsive tasarım - mobilde de çalışır
✅ Tamamen ücretsiz (Supabase Free Tier)

Başarılar! 🚀
