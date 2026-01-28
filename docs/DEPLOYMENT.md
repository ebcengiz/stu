# Deployment Kılavuzu

Bu döküman, Stok Takip Sistemi'nin Vercel'e deployment sürecini adım adım açıklar.

## Ön Hazırlık

### 1. GitHub Repository Oluşturma

```bash
# Git deposunu başlat
git init

# Dosyaları ekle
git add .

# İlk commit
git commit -m "Initial commit: Stok Takip Sistemi"

# GitHub'da yeni repository oluştur
# Ardından local repo'yu bağla
git remote add origin https://github.com/kullanici-adi/stok-takip.git

# Push et
git push -u origin main
```

### 2. Production Supabase Projesi

1. [Supabase Dashboard](https://app.supabase.com) açın
2. "New Project" tıklayın
3. Proje bilgilerini girin:
   - **Name**: stok-takip-production
   - **Database Password**: Güçlü bir şifre
   - **Region**: En yakın bölge (örn: Frankfurt)
4. "Create new project" tıklayın
5. Proje oluşturulmasını bekleyin (1-2 dakika)

### 3. Veritabanı Şemasını Oluşturma

1. Supabase Dashboard > SQL Editor
2. `supabase/migrations/001_initial_schema.sql` dosyasını açın
3. Tüm içeriği kopyalayıp SQL Editor'e yapıştırın
4. "Run" tıklayın
5. Başarılı olduğunu doğrulayın

### 4. Supabase Credentials Alma

1. Supabase Dashboard > Settings > API
2. Aşağıdaki bilgileri not edin:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJ...` (public)
   - **service_role key**: `eyJ...` (gizli!)

## Vercel Deployment

### 1. Vercel Hesabı

1. [Vercel](https://vercel.com) hesabı oluşturun
2. GitHub ile bağlantı kurun

### 2. Import Project

1. Vercel Dashboard > "Add New..." > "Project"
2. GitHub repository'nizi seçin
3. "Import" tıklayın

### 3. Configure Project

**Framework Preset**: Next.js (otomatik seçilecek)

**Build Settings**:
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 4. Environment Variables

Aşağıdaki environment variable'ları ekleyin:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Önemli**:
- `NEXT_PUBLIC_APP_URL` değerini deployment sonrası güncelleyin
- `SUPABASE_SERVICE_ROLE_KEY` kesinlikle gizli tutulmalı

### 5. Deploy

1. "Deploy" butonuna tıklayın
2. Deployment sürecini izleyin (2-3 dakika)
3. Başarılı olduğunda URL'i not edin

### 6. Post-Deployment Configuration

#### A. Vercel URL'i Güncelleme

1. Vercel Dashboard > Project > Settings > Environment Variables
2. `NEXT_PUBLIC_APP_URL` değerini gerçek URL ile güncelleyin
3. "Redeploy" yapın

#### B. Supabase URL Configuration

1. Supabase Dashboard > Authentication > URL Configuration
2. **Site URL**: `https://your-app.vercel.app`
3. **Redirect URLs** ekleyin:
   ```
   https://your-app.vercel.app/**
   https://your-app.vercel.app/auth/callback
   ```
4. "Save" tıklayın

#### C. CORS Settings (Gerekirse)

Supabase Dashboard > Settings > API > CORS Origins:
```
https://your-app.vercel.app
```

## Domain Bağlama (Opsiyonel)

### 1. Custom Domain Ekleme

1. Vercel Dashboard > Project > Settings > Domains
2. Domain adınızı girin (örn: `stok.example.com`)
3. "Add" tıklayın

### 2. DNS Yapılandırması

Domain sağlayıcınızda (GoDaddy, Namecheap, vb):

**A Record** veya **CNAME**:
```
Type: CNAME
Name: stok
Value: cname.vercel-dns.com
```

### 3. SSL Sertifikası

Vercel otomatik olarak Let's Encrypt SSL sertifikası oluşturur (5-10 dakika).

### 4. Environment Variables Güncelleme

```
NEXT_PUBLIC_APP_URL=https://stok.example.com
```

Supabase URL Configuration'ı da güncelleyin.

## Deployment Doğrulama

### 1. Temel Kontroller

- [ ] Site açılıyor mu?
- [ ] Login sayfası çalışıyor mu?
- [ ] Yeni kullanıcı kayıt olabiliyor mu?
- [ ] Dashboard yükleniyor mu?

### 2. İşlevsellik Testleri

- [ ] Yeni ürün eklenebiliyor mu?
- [ ] Ürünler listelenebiliyor mu?
- [ ] Kategoriler ve depolar görüntülenebiliyor mu?
- [ ] Logout çalışıyor mu?

### 3. Multi-Tenant Test

- [ ] İki farklı firma hesabı oluşturun
- [ ] Her firma kendi verilerini görüyor mu?
- [ ] Firmalar birbirlerinin verilerini göremiyor mu?

### 4. Performance

Vercel Analytics ile kontrol edin:
- [ ] Sayfa yüklenme süreleri
- [ ] Core Web Vitals
- [ ] Error rates

## Continuous Deployment

### Otomatik Deployment

Vercel otomatik olarak her git push'ta deployment yapar:

```bash
git add .
git commit -m "Yeni özellik eklendi"
git push origin main
```

### Branch Deployments

Development branch için:

1. Vercel Dashboard > Project > Settings > Git
2. "Production Branch": `main`
3. Her branch için preview deployment oluşturulur

## Monitoring ve Logs

### 1. Vercel Logs

Vercel Dashboard > Project > Deployments > Click deployment > Logs

### 2. Supabase Logs

Supabase Dashboard > Logs
- Database logs
- Auth logs
- API logs

### 3. Error Tracking (Opsiyonel)

Sentry entegrasyonu:

```bash
npm install @sentry/nextjs
```

## Rollback

Hatalı deployment durumunda:

1. Vercel Dashboard > Project > Deployments
2. Önceki başarılı deployment'ı bulun
3. "..." > "Promote to Production"

## Backup

### Veritabanı Yedekleme

Supabase otomatik günlük yedek alır (7 gün saklanır).

Manuel yedek:
1. Supabase Dashboard > Database > Backups
2. "Create backup"

### Kod Yedekleme

GitHub repository zaten kod backup'ıdır.

## Scaling

### Vercel Limits (Free Tier)

- 100 GB Bandwidth/month
- Unlimited deployments
- Automatic HTTPS

### Supabase Limits (Free Tier)

- 500 MB Database
- 1 GB File Storage
- 2 GB Bandwidth
- 50,000 Monthly Active Users

### Upgrade Gerektiğinde

**Vercel Pro**: $20/month
**Supabase Pro**: $25/month

## Güvenlik Checklist

- [ ] Environment variables doğru yapılandırılmış
- [ ] Service role key gizli
- [ ] HTTPS aktif
- [ ] Supabase RLS policies çalışıyor
- [ ] CORS doğru yapılandırılmış
- [ ] Rate limiting aktif (Supabase)

## Troubleshooting

### Build Hatası

```bash
# Local'de test edin
npm run build
```

### Environment Variables Hatası

Vercel Dashboard'da environment variables'ları kontrol edin.

### Database Connection Hatası

Supabase URL ve key'leri doğrulayın.

### Authentication Hatası

Supabase URL Configuration'ı kontrol edin.

## Sonraki Adımlar

1. Custom domain bağlayın
2. Analytics ekleyin (Vercel Analytics, Google Analytics)
3. Error tracking ekleyin (Sentry)
4. Performance monitoring
5. Automated testing (Playwright, Cypress)

## Kaynaklar

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
