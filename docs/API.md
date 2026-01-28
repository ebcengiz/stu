# API Dokümantasyonu

Bu döküman, Stok Takip Sistemi'nin API endpoint'lerini ve kullanımını açıklar.

## Kimlik Doğrulama

Tüm API istekleri Supabase Auth ile doğrulanır. Her istek otomatik olarak kullanıcının session cookie'sini içermelidir.

### Headers

```
Content-Type: application/json
```

Supabase client otomatik olarak authentication header'larını ekler.

## Base URL

### Development
```
http://localhost:3000/api
```

### Production
```
https://your-app.vercel.app/api
```

## Endpoints

### Products

#### GET /api/products

Tüm ürünleri listeler (tenant bazlı).

**Request:**
```http
GET /api/products
```

**Response:**
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "name": "Ürün Adı",
    "sku": "SKU123",
    "barcode": "1234567890",
    "description": "Açıklama",
    "unit": "adet",
    "min_stock_level": 10,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "categories": {
      "id": "uuid",
      "name": "Kategori Adı"
    },
    "stock": [
      {
        "quantity": 100,
        "warehouses": {
          "name": "Ana Depo"
        }
      }
    ]
  }
]
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

#### POST /api/products

Yeni ürün oluşturur.

**Request:**
```http
POST /api/products
Content-Type: application/json

{
  "name": "Yeni Ürün",
  "sku": "SKU123",
  "barcode": "1234567890",
  "description": "Ürün açıklaması",
  "category_id": "uuid",
  "unit": "adet",
  "min_stock_level": 10
}
```

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "name": "Yeni Ürün",
  "sku": "SKU123",
  "barcode": "1234567890",
  "description": "Ürün açıklaması",
  "category_id": "uuid",
  "unit": "adet",
  "min_stock_level": 10,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Validation:**
- `name`: String, min 2 karakter (zorunlu)
- `sku`: String (opsiyonel)
- `barcode`: String (opsiyonel)
- `description`: String (opsiyonel)
- `category_id`: UUID (opsiyonel)
- `unit`: Enum ['adet', 'kg', 'litre', 'metre', 'paket'] (zorunlu)
- `min_stock_level`: Number >= 0 (zorunlu)

### Stock Movements

#### GET /api/stock-movements

Stok hareketlerini listeler.

**Request:**
```http
GET /api/stock-movements
```

**Query Parameters:**
- `limit`: Number (default: 50)
- `offset`: Number (default: 0)
- `product_id`: UUID (filtre)
- `warehouse_id`: UUID (filtre)
- `movement_type`: Enum ['in', 'out', 'transfer', 'adjustment']

**Response:**
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "product_id": "uuid",
    "warehouse_id": "uuid",
    "movement_type": "in",
    "quantity": 50,
    "reference_no": "REF123",
    "notes": "Notlar",
    "created_by": "uuid",
    "created_at": "2024-01-01T00:00:00Z",
    "products": {
      "name": "Ürün Adı"
    },
    "warehouses": {
      "name": "Depo Adı"
    },
    "profiles": {
      "full_name": "Kullanıcı Adı"
    }
  }
]
```

#### POST /api/stock-movements

Yeni stok hareketi oluşturur.

**Request:**
```http
POST /api/stock-movements
Content-Type: application/json

{
  "product_id": "uuid",
  "warehouse_id": "uuid",
  "movement_type": "in",
  "quantity": 50,
  "reference_no": "REF123",
  "notes": "Notlar"
}
```

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "product_id": "uuid",
  "warehouse_id": "uuid",
  "movement_type": "in",
  "quantity": 50,
  "reference_no": "REF123",
  "notes": "Notlar",
  "created_by": "uuid",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Validation:**
- `product_id`: UUID (zorunlu)
- `warehouse_id`: UUID (zorunlu)
- `movement_type`: Enum ['in', 'out', 'transfer', 'adjustment'] (zorunlu)
- `quantity`: Number > 0 (zorunlu)
- `reference_no`: String (opsiyonel)
- `notes`: String (opsiyonel)

### Categories

#### GET /api/categories

Kategorileri listeler.

**Request:**
```http
GET /api/categories
```

**Response:**
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "name": "Kategori Adı",
    "description": "Açıklama",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /api/categories

Yeni kategori oluşturur.

**Request:**
```http
POST /api/categories
Content-Type: application/json

{
  "name": "Yeni Kategori",
  "description": "Açıklama"
}
```

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "name": "Yeni Kategori",
  "description": "Açıklama",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Warehouses

#### GET /api/warehouses

Depoları listeler.

**Request:**
```http
GET /api/warehouses
```

**Response:**
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "name": "Depo Adı",
    "location": "Lokasyon",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /api/warehouses

Yeni depo oluşturur.

**Request:**
```http
POST /api/warehouses
Content-Type: application/json

{
  "name": "Yeni Depo",
  "location": "İstanbul",
  "is_active": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "name": "Yeni Depo",
  "location": "İstanbul",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Tenants

#### GET /api/tenants

Mevcut tenant bilgisini getirir.

**Request:**
```http
GET /api/tenants
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Firma Adı",
  "slug": "firma-adi",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## Hata Kodları

| Kod | Açıklama |
|-----|----------|
| 200 | Başarılı |
| 201 | Oluşturuldu |
| 400 | Geçersiz istek |
| 401 | Yetkilendirme hatası |
| 403 | Erişim reddedildi |
| 404 | Bulunamadı |
| 500 | Sunucu hatası |

## Hata Response Formatı

```json
{
  "error": "Hata mesajı",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Rate Limiting

Supabase ücretsiz plan limitleri:
- API istekleri: Sınırsız
- Veritabanı bağlantıları: 500 eşzamanlı

## Örnek Kullanım (JavaScript)

### Ürün Listesi Alma

```javascript
const response = await fetch('/api/products')
const products = await response.json()
console.log(products)
```

### Yeni Ürün Ekleme

```javascript
const newProduct = {
  name: 'Yeni Ürün',
  sku: 'SKU123',
  unit: 'adet',
  min_stock_level: 10
}

const response = await fetch('/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newProduct)
})

const product = await response.json()
console.log(product)
```

### Stok Hareketi Ekleme

```javascript
const movement = {
  product_id: 'uuid-here',
  warehouse_id: 'uuid-here',
  movement_type: 'in',
  quantity: 50,
  reference_no: 'REF123'
}

const response = await fetch('/api/stock-movements', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(movement)
})

const result = await response.json()
console.log(result)
```

## WebSocket / Realtime (Gelecek)

Supabase Realtime özelliği kullanılarak anlık güncellemeler:

```javascript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Ürün değişikliklerini dinle
const channel = supabase
  .channel('products-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'products' },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()
```

## Notlar

- Tüm tarihler ISO 8601 formatındadır
- UUID'ler v4 standardındadır
- Tenant izolasyonu otomatik olarak RLS ile sağlanır
- Service role key sadece server-side kullanılmalıdır

## Gelecek Özellikler

- [ ] Bulk operations (toplu işlemler)
- [ ] Filtering ve sorting parametreleri
- [ ] Pagination
- [ ] Export endpoints (CSV, PDF)
- [ ] Webhook desteği
- [ ] GraphQL endpoint (opsiyonel)
