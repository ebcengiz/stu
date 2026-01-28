# Proje Yapısı

```
stok-takip/
│
├── 📱 app/                              # Next.js App Directory
│   ├── 🔐 (auth)/                       # Kimlik Doğrulama Grubu
│   │   ├── login/
│   │   │   └── page.tsx                 # ✅ Login sayfası
│   │   └── register/
│   │       └── page.tsx                 # ✅ Kayıt sayfası
│   │
│   ├── 📊 (dashboard)/                  # Dashboard Grubu
│   │   ├── layout.tsx                   # ✅ Dashboard layout
│   │   ├── page.tsx                     # ✅ Ana dashboard
│   │   ├── urunler/                     # Ürün Yönetimi
│   │   │   ├── page.tsx                 # ✅ Ürün listesi
│   │   │   └── yeni/
│   │   │       └── page.tsx             # ✅ Yeni ürün formu
│   │   ├── stok-hareketleri/
│   │   │   └── page.tsx                 # ✅ Stok hareketleri
│   │   ├── kategoriler/
│   │   │   └── page.tsx                 # ✅ Kategoriler
│   │   ├── depolar/
│   │   │   └── page.tsx                 # ✅ Depolar
│   │   ├── raporlar/
│   │   │   └── page.tsx                 # ✅ Raporlar
│   │   └── yonetim/
│   │       └── page.tsx                 # ✅ Admin paneli
│   │
│   ├── 🔌 api/                          # API Routes
│   │   └── products/
│   │       └── route.ts                 # ✅ Ürün API
│   │
│   ├── layout.tsx                       # ✅ Root layout
│   ├── page.tsx                         # ✅ Ana sayfa (redirect)
│   └── globals.css                      # ✅ Global CSS
│
├── 🎨 components/                       # React Bileşenleri
│   ├── ui/                              # UI Bileşenleri
│   │   ├── Button.tsx                   # ✅ Button component
│   │   └── Card.tsx                     # ✅ Card components
│   └── dashboard/
│       └── DashboardNav.tsx             # ✅ Dashboard navigasyon
│
├── 📚 lib/                              # Kütüphaneler
│   ├── supabase/                        # Supabase Clients
│   │   ├── client.ts                    # ✅ Browser client
│   │   ├── server.ts                    # ✅ Server client
│   │   └── middleware.ts                # ✅ Auth middleware
│   ├── validations/                     # Validation Schemas
│   │   ├── auth.ts                      # ✅ Auth schemas
│   │   └── product.ts                   # ✅ Product schemas
│   └── utils.ts                         # ✅ Yardımcı fonksiyonlar
│
├── 🪝 hooks/                            # Custom Hooks
│   └── useAuth.ts                       # ✅ Auth hook
│
├── 📖 docs/                             # Dokümantasyon
│   ├── QUICKSTART.md                    # ✅ Hızlı başlangıç
│   ├── KURULUM.md                       # ✅ Detaylı kurulum
│   ├── KULLANIM.md                      # ✅ Kullanım kılavuzu
│   ├── API.md                           # ✅ API dokümantasyonu
│   └── DEPLOYMENT.md                    # ✅ Deployment kılavuzu
│
├── 🗄️ supabase/                         # Supabase Dosyaları
│   ├── migrations/
│   │   └── 001_initial_schema.sql       # ✅ Veritabanı şeması
│   └── seed.sql                         # ✅ Test verileri
│
├── ⚙️ Yapılandırma Dosyaları
│   ├── next.config.js                   # ✅ Next.js config
│   ├── tailwind.config.js               # ✅ Tailwind config
│   ├── tsconfig.json                    # ✅ TypeScript config
│   ├── postcss.config.js                # ✅ PostCSS config
│   ├── middleware.ts                    # ✅ Next.js middleware
│   ├── vercel.json                      # ✅ Vercel config
│   └── .eslintrc.json                   # ✅ ESLint config
│
├── 📄 Dokümantasyon
│   ├── README.md                        # ✅ Ana README
│   ├── CHANGELOG.md                     # ✅ Değişiklik günlüğü
│   ├── PROJECT_SUMMARY.md               # ✅ Proje özeti
│   └── STRUCTURE.md                     # ✅ Bu dosya
│
├── 🔧 Diğer
│   ├── .env.local.example               # ✅ Environment template
│   ├── .env.production.example          # ✅ Production env template
│   ├── .gitignore                       # ✅ Git ignore
│   ├── package.json                     # ✅ Dependencies
│   └── setup.sh                         # ✅ Kurulum scripti
│
└── 📦 node_modules/                     # Bağımlılıklar (git'de yok)
```

## 📊 İstatistikler

- **Toplam Sayfa**: 9 sayfa
- **API Routes**: 1 endpoint (daha fazlası eklenebilir)
- **Bileşenler**: 3 UI + 1 Dashboard = 4 component
- **Hooks**: 1 custom hook
- **Veritabanı**: 7 tablo
- **Dokümantasyon**: 7 markdown dosyası

## 🎯 Ana Özellikler

### Kimlik Doğrulama
- ✅ Login sayfası
- ✅ Register sayfası
- ✅ Middleware koruması
- ✅ Session yönetimi

### Dashboard
- ✅ Ana dashboard
- ✅ İstatistik kartları
- ✅ Navigasyon menüsü
- ✅ Responsive tasarım

### Ürün Yönetimi
- ✅ Ürün listesi
- ✅ Yeni ürün ekleme
- ✅ Arama özelliği
- ✅ Tablo görünümü

### Diğer Modüller
- ✅ Kategoriler
- ✅ Depolar
- ✅ Stok Hareketleri
- ✅ Raporlar
- ✅ Admin Paneli

### Veritabanı
- ✅ Multi-tenant şema
- ✅ RLS policies
- ✅ Automatic triggers
- ✅ Indexler

### Güvenlik
- ✅ Row Level Security
- ✅ Input validation
- ✅ CSRF koruması
- ✅ XSS koruması

## 🚀 Kullanım

1. Kurulum:
   ```bash
   ./setup.sh
   ```

2. Development:
   ```bash
   npm run dev
   ```

3. Build:
   ```bash
   npm run build
   ```

4. Production:
   ```bash
   npm start
   ```

## 📝 Notlar

- Tüm dosyalar TypeScript ile yazılmıştır
- Tailwind CSS ile stillendirilmiştir
- Supabase PostgreSQL kullanır
- Vercel'e deploy edilmeye hazırdır
- Tamamen responsive tasarıma sahiptir
