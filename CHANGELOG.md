# Changelog

Tüm önemli değişiklikler bu dosyada dokümante edilecektir.

## [1.0.0] - 2024-01-28

### Eklenen Özellikler

#### Kimlik Doğrulama
- Email/şifre ile kullanıcı kaydı
- Güvenli login sistemi
- Logout işlevi
- Session yönetimi
- Middleware ile route koruması

#### Multi-Tenant Sistem
- Firma (tenant) oluşturma
- Row Level Security (RLS) ile veri izolasyonu
- Otomatik tenant_id ataması
- Kullanıcı-firma ilişkilendirmesi

#### Ürün Yönetimi
- Ürün ekleme formu
- Ürün listeleme sayfası
- SKU ve barkod desteği
- Birim seçimi (adet, kg, litre, metre, paket)
- Minimum stok seviyesi tanımlama
- Kategori ilişkilendirmesi

#### Kategori Yönetimi
- Kategori listeleme
- Kart görünümü ile kategori gösterimi

#### Depo Yönetimi
- Depo listeleme
- Lokasyon bilgisi
- Aktif/pasif durum

#### Stok Hareketleri
- Hareket geçmişi görüntüleme
- Hareket tipleri (giriş, çıkış, transfer, düzeltme)
- Referans numarası takibi
- Kullanıcı bazlı hareket kaydı

#### Raporlama
- Stok durum raporu
- Hareket raporu
- Düşük stok raporu
- Rapor şablonları

#### Dashboard
- İstatistik kartları
- Toplam ürün, depo, hareket sayıları
- Son aktiviteler bölümü
- Düşük stok uyarıları

#### Admin Paneli
- Firma bilgileri görüntüleme
- Kullanıcı istatistikleri
- Sistem bilgileri
- Admin-only erişim kontrolü

#### UI/UX
- Yeşil-beyaz tema
- Responsive tasarım
- Mobil uyumlu navigasyon
- Modern UI bileşenleri
- Loading states
- Error handling

#### Veritabanı
- PostgreSQL (Supabase)
- 7 ana tablo
- RLS policies tüm tablolarda
- Automatic timestamps
- Foreign key ilişkileri
- Indexler

#### Güvenlik
- Row Level Security
- Güvenli password hashing
- CSRF koruması
- XSS koruması
- Input validation (Zod)
- Server-side authentication

### Teknik Detaylar

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Icons**: Lucide React
- **TypeScript**: Full type safety

### Dosya Yapısı

```
├── app/                    # Next.js app directory
│   ├── (auth)/            # Auth routes
│   ├── (dashboard)/       # Dashboard routes
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # UI components
│   └── dashboard/        # Dashboard components
├── lib/                  # Utilities
│   ├── supabase/         # Supabase clients
│   └── validations/      # Zod schemas
├── hooks/                # Custom hooks
├── docs/                 # Documentation
└── supabase/            # Database migrations
```

### Bilinen Sorunlar

Yok

### Gelecek Sürümler İçin Planlar

- [ ] Stok giriş/çıkış formu
- [ ] Kategori CRUD işlemleri
- [ ] Depo CRUD işlemleri
- [ ] Ürün düzenleme/silme
- [ ] Barkod okuyucu entegrasyonu
- [ ] Excel/PDF export
- [ ] Grafik ve görselleştirmeler
- [ ] Kullanıcı davet sistemi
- [ ] E-posta bildirimleri
- [ ] Stok sayım modülü
- [ ] Seri/lot takibi
- [ ] Çoklu dil desteği
- [ ] Dark mode
- [ ] Mobile app

## Versiyon Notasyonu

Bu proje [Semantic Versioning](https://semver.org/) kullanır:

- **MAJOR**: Uyumsuz API değişiklikleri
- **MINOR**: Geriye uyumlu yeni özellikler
- **PATCH**: Geriye uyumlu bug fix'ler
