# Kullanım Kılavuzu

Bu döküman, Stok Takip Sistemi'nin tüm özelliklerini ve kullanımını açıklar.

## 🚀 Başlangıç

### İlk Giriş

1. Tarayıcınızda uygulamayı açın
2. "Kayıt Ol" butonuna tıklayın
3. Aşağıdaki bilgileri girin:
   - **Firma Adı**: Şirketinizin adı
   - **Ad Soyad**: Kendi adınız
   - **Email**: Email adresiniz
   - **Şifre**: Güçlü bir şifre (min 6 karakter)
4. "Kayıt Ol" butonuna tıklayın
5. Otomatik olarak dashboard'a yönlendirileceksiniz

### Giriş Yapma

1. Login sayfasında email ve şifrenizi girin
2. "Giriş Yap" butonuna tıklayın
3. Dashboard'a yönlendirileceksiniz

### Çıkış Yapma

Sağ üst köşedeki çıkış simgesine tıklayın.

## 📦 Ürün Yönetimi

### Yeni Ürün Ekleme

1. Dashboard'da **"Ürünler"** sekmesine gidin
2. **"Yeni Ürün"** butonuna tıklayın
3. Ürün bilgilerini girin:
   - **Ürün Adı** (zorunlu): Ürünün adı
   - **SKU**: Stok kodu (opsiyonel)
   - **Barkod**: Barkod numarası (opsiyonel)
   - **Birim**: Adet, kg, litre, metre, paket
   - **Minimum Stok Seviyesi**: Uyarı için minimum miktar
   - **Açıklama**: Ürün açıklaması
4. **"Kaydet"** butonuna tıklayın

### Ürün Listeleme

1. **"Ürünler"** sekmesinde tüm ürünlerinizi görebilirsiniz
2. Arama kutusunu kullanarak ürün arayabilirsiniz
3. Ürünler tabloda şu bilgilerle listelenir:
   - Ürün adı
   - SKU
   - Barkod
   - Kategori
   - Birim
   - Minimum stok seviyesi
   - Durum (Aktif/Pasif)

## 📁 Kategori Yönetimi

### Kategorileri Görüntüleme

1. **"Kategoriler"** sekmesine gidin
2. Tüm kategorilerinizi kart görünümünde görebilirsiniz
3. Her kategorinin adı ve açıklaması görüntülenir

**Not**: Kategori ekleme özelliği admin tarafından yapılandırılmalıdır.

## 🏭 Depo Yönetimi

### Depoları Görüntüleme

1. **"Depolar"** sekmesine gidin
2. Tüm depolarınızı kart görünümünde görebilirsiniz
3. Her depo için:
   - Depo adı
   - Lokasyon
   - Durum (Aktif/Pasif)

## 📊 Stok Hareketleri

### Stok Hareketlerini Görüntüleme

1. **"Stok Hareketleri"** sekmesine gidin
2. Tüm stok giriş/çıkış işlemlerini görebilirsiniz
3. Her hareket için görüntülenen bilgiler:
   - Tarih ve saat
   - Hareket tipi:
     - 🟢 **Giriş**: Depoya stok girişi
     - 🔴 **Çıkış**: Depodan stok çıkışı
     - 🔵 **Transfer**: Depolar arası transfer
     - 🟠 **Düzeltme**: Stok sayım düzeltmesi
   - Ürün adı
   - Depo
   - Miktar
   - Referans numarası
   - İşlemi yapan kullanıcı

### Stok Girişi/Çıkışı Yapma

**Not**: Bu özellik geliştirilme aşamasındadır. Şu an için stok hareketleri sadece görüntülenebilir.

## 📈 Raporlar

### Rapor Türleri

1. **Stok Durum Raporu**
   - Tüm ürünlerin güncel stok durumu
   - Depo bazında stok miktarları

2. **Hareket Raporu**
   - Belirli tarih aralığındaki tüm stok hareketleri
   - Giriş/çıkış istatistikleri

3. **Düşük Stok Raporu**
   - Minimum stok seviyesinin altındaki ürünler
   - Acil sipariş gerektiren ürünler

### Rapor İndirme

1. **"Raporlar"** sekmesine gidin
2. İstediğiniz raporu seçin
3. **"İndir"** butonuna tıklayın

**Not**: Rapor indirme özelliği geliştirilme aşamasındadır.

## 🎯 Dashboard

### Dashboard Özellikleri

Ana dashboard'da şu bilgileri görebilirsiniz:

1. **İstatistikler**:
   - Toplam ürün sayısı
   - Depo sayısı
   - Toplam hareket sayısı
   - Düşük stok uyarıları

2. **Son Aktiviteler**:
   - En son yapılan stok işlemleri

3. **Düşük Stok Uyarıları**:
   - Minimum seviyenin altındaki ürünler

## ⚙️ Ayarlar Paneli (Admin)

**Not**: Bu bölüm sadece Admin rolündeki kullanıcılar tarafından erişilebilir.

### Ayarlar Paneli Özellikleri

1. **Kullanıcı İstatistikleri**:
   - Toplam kullanıcı sayısı

2. **Firma Bilgileri**:
   - Firma adı
   - Firma slug'ı

3. **Sistem Bilgileri**:
   - Versiyon
   - Durum

## 👥 Kullanıcı Rolleri

### Roller ve Yetkiler

1. **Admin**:
   - Tüm özelliklere erişim
   - Kullanıcı yönetimi
   - Sistem ayarları
   - Firma bilgileri düzenleme

2. **Manager**:
   - Ürün ve stok yönetimi
   - Rapor görüntüleme
   - Kategori ve depo yönetimi

3. **User**:
   - Ürün görüntüleme
   - Stok hareketi görüntüleme
   - Temel raporlar

**Not**: İlk kayıt olan kullanıcı otomatik olarak Admin rolü alır.

## 🔐 Güvenlik

### Şifre Güvenliği

- Minimum 6 karakter
- Büyük/küçük harf ve rakam kullanmanız önerilir
- Düzenli olarak şifrenizi değiştirin

### Multi-Tenant Güvenlik

- Her firma kendi verilerine erişebilir
- Firmalar arası veri izolasyonu garantilidir
- Row Level Security (RLS) ile veritabanı seviyesinde korumalıdır

## 💡 İpuçları

1. **Barkod Kullanımı**: Ürünlerinize barkod atayarak hızlı arama yapabilirsiniz
2. **Minimum Stok**: Her ürün için uygun minimum stok seviyesi belirleyin
3. **Kategoriler**: Ürünlerinizi kategorize ederek düzenli tutun
4. **Düzenli Raporlar**: Haftalık stok durum raporları alın
5. **Stok Sayımı**: Ayda bir stok sayımı yaparak verileri güncel tutun

## ❓ Sık Sorulan Sorular

### Birden fazla depo ekleyebilir miyim?

Evet, sınırsız sayıda depo ekleyebilirsiniz.

### Stok hareketi nasıl yapılır?

Bu özellik şu an geliştirilme aşamasındadır. Yakında eklenecektir.

### Kategori nasıl eklenir?

Kategori ekleme özelliği admin panelinden yapılandırılacaktır.

### Eski stok hareketleri silinir mi?

Hayır, tüm stok hareketleri kalıcı olarak saklanır.

### Yeni kullanıcı nasıl eklenir?

Şu an her kullanıcı kendi hesabını oluşturmalıdır. Gelecekte admin tarafından kullanıcı davet özelliği eklenecektir.

## 🆘 Destek

Sorun yaşıyorsanız veya öneriniz varsa:

1. Issue açın
2. Detaylı açıklama yapın
3. Ekran görüntüsü ekleyin (varsa)

## 📱 Mobil Kullanım

Uygulama responsive tasarıma sahiptir ve mobil cihazlarda da kullanılabilir. Mobil tarayıcınızdan erişebilirsiniz.

## 🔄 Güncellemeler

Yeni özellikler ve güncellemeler düzenli olarak eklenecektir. Changelog'u takip edin.
