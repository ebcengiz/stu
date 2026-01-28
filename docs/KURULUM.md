# Kurulum Kılavuzu

Bu döküman, Stok Takip Sistemi'nin local ve production ortamlarında kurulumu için adım adım rehberdir.

## Gereksinimler

- Node.js 18+
- npm veya yarn
- Supabase hesabı (ücretsiz)
- Git

## Local Development Kurulumu

### 1. Projeyi Klonlayın

```bash
git clone <repository-url>
cd stok-takip
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Supabase Projesi Oluşturun

1. [Supabase](https://supabase.com) hesabı oluşturun
2. Yeni bir proje oluşturun
3. Project Settings > API bölümünden aşağıdaki bilgileri alın:
   - Project URL
   - anon (public) key
   - service_role key (gizli tutun!)

### 4. Environment Dosyasını Yapılandırın

`.env.local.example` dosyasını `.env.local` olarak kopyalayın:

```bash
cp .env.local.example .env.local
```

`.env.local` dosyasını düzenleyin:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Veritabanı Şemasını Oluşturun

Supabase Dashboard > SQL Editor'de `supabase/migrations/001_initial_schema.sql` dosyasının içeriğini çalıştırın.

**Önemli:** Tüm SQL komutlarını sırayla çalıştırın.

### 6. Test Verisi Ekleyin (Opsiyonel)

```sql
-- supabase/seed.sql dosyasını SQL Editor'de çalıştırın
```

### 7. Geliştirme Sunucusunu Başlatın

```bash
npm run dev
```

Tarayıcınızda http://localhost:3000 adresini açın.

## Production Deployment (Vercel)

### 1. GitHub Repository Oluşturun

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Production Supabase Projesi

1. Yeni bir Supabase projesi oluşturun (production için)
2. Veritabanı şemasını tekrar çalıştırın
3. Production URL ve key'leri alın

### 3. Vercel Deployment

1. [Vercel](https://vercel.com) hesabı oluşturun
2. "New Project" > GitHub repository'nizi seçin
3. Environment Variables ekleyin:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

4. Deploy butonuna tıklayın

### 4. Supabase URL Whitelist

Vercel deployment tamamlandıktan sonra:

1. Supabase Dashboard > Authentication > URL Configuration
2. Site URL: `https://your-app.vercel.app`
3. Redirect URLs: `https://your-app.vercel.app/**`

## Doğrulama

### Test Kullanıcısı Oluşturma

1. `/register` sayfasına gidin
2. Firma adı, ad soyad, email ve şifre girin
3. Kayıt olun
4. Dashboard'a yönlendirilmelisiniz

### Multi-Tenant Test

1. İkinci bir kullanıcı için farklı firma adıyla kayıt olun
2. Her kullanıcının kendi verilerini görebildiğini doğrulayın
3. Kullanıcılar birbirlerinin verilerini görememelidir

## Sorun Giderme

### "Invalid API credentials" hatası
- `.env.local` dosyasındaki Supabase bilgilerini kontrol edin
- Supabase Dashboard'da key'lerin doğru olduğundan emin olun

### RLS Policy hataları
- SQL migration dosyasının tamamen çalıştırıldığından emin olun
- `auth.user_tenant_id()` fonksiyonunun oluşturulduğunu kontrol edin

### Login sonrası redirect çalışmıyor
- `middleware.ts` dosyasının doğru yapılandırıldığından emin olun
- Browser console'da hata olup olmadığını kontrol edin

## Önemli Notlar

- **Service Role Key'i asla client-side kodda kullanmayın!**
- Production'da güçlü şifreler kullanın
- Düzenli veritabanı yedekleri alın
- Supabase ücretsiz plan limitleri:
  - 500 MB veritabanı
  - 50,000 Monthly Active Users
  - 1 GB dosya depolama
  - 2 GB bant genişliği

## Sonraki Adımlar

Kurulum tamamlandıktan sonra [KULLANIM.md](./KULLANIM.md) dosyasına bakarak uygulamayı kullanmaya başlayabilirsiniz.
