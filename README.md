# Stok Takip Sistemi

Modern, multi-tenant (çoklu firma) stok yönetim uygulaması. Next.js 14, Supabase ve Tailwind CSS ile geliştirilmiştir.

## 🎯 Özellikler

### Kimlik Doğrulama
- ✅ Email/Şifre ile giriş ve kayıt
- ✅ Güvenli oturum yönetimi
- ✅ Middleware ile route koruması

### Multi-Tenant Mimari
- ✅ Her firma için ayrı veri izolasyonu
- ✅ Row Level Security (RLS) ile güvenlik
- ✅ Otomatik tenant yönetimi

### Stok Yönetimi
- ✅ Ürün ekleme, düzenleme, listeleme
- ✅ Kategori yönetimi
- ✅ Depo/lokasyon takibi
- ✅ Stok hareketleri (giriş/çıkış/transfer)
- ✅ Minimum stok seviyesi uyarıları

### Raporlama
- ✅ Stok durum raporları
- ✅ Hareket raporları
- ✅ Dashboard ile görselleştirme

### Admin Paneli
- ✅ Firma bilgileri yönetimi
- ✅ Kullanıcı istatistikleri
- ✅ Sistem ayarları

## 🏗️ Teknoloji Stack

- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: Custom components
- **Validation**: Zod
- **State Management**: React Hooks
- **Icons**: Lucide React

## 📦 Kurulum

Detaylı kurulum talimatları için [KURULUM.md](./docs/KURULUM.md) dosyasına bakınız.

### Hızlı Başlangıç

```bash
# Bağımlılıkları yükleyin
npm install

# Environment dosyasını oluşturun
cp .env.local.example .env.local

# Geliştirme sunucusunu başlatın
npm run dev
```

## 📚 Dokümantasyon

- [Kurulum Kılavuzu](./docs/KURULUM.md)
- [Kullanım Kılavuzu](./docs/KULLANIM.md)
- [API Dokümantasyonu](./docs/API.md)

## 🚀 Deployment

Vercel üzerinde deploy için:

1. GitHub repository'nizi Vercel'e bağlayın
2. Environment variables ekleyin
3. Deploy edin

## 🔒 Güvenlik

- Row Level Security (RLS) her tabloda aktif
- Güvenli password hashing
- CSRF koruması
- XSS koruması
- Input validation

## 📝 Lisans

ISC

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Issue açabilir veya Pull Request gönderebilirsiniz.

## 📧 İletişim

Sorularınız için issue açınız.
