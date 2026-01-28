#!/bin/bash

# Stok Takip Sistemi - Kurulum Scripti
# Bu script projeyi otomatik olarak kurmanıza yardımcı olur

echo "🚀 Stok Takip Sistemi Kurulumu Başlıyor..."
echo ""

# Renk kodları
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Node.js kontrolü
echo "📦 Node.js kontrol ediliyor..."
if ! command -v node &> /dev/null
then
    echo -e "${RED}❌ Node.js bulunamadı. Lütfen Node.js 18+ yükleyin.${NC}"
    echo "   https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✓ Node.js bulundu: $(node -v)${NC}"
echo ""

# npm kontrolü
echo "📦 npm kontrol ediliyor..."
if ! command -v npm &> /dev/null
then
    echo -e "${RED}❌ npm bulunamadı.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm bulundu: $(npm -v)${NC}"
echo ""

# Bağımlılıkları yükle
echo "📦 Bağımlılıklar yükleniyor..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Bağımlılıklar başarıyla yüklendi${NC}"
else
    echo -e "${RED}❌ Bağımlılık yüklemesi başarısız${NC}"
    exit 1
fi
echo ""

# .env.local dosyası kontrolü
echo "🔧 Environment dosyası kontrol ediliyor..."
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠ .env.local dosyası bulunamadı${NC}"
    echo "   .env.local.example dosyasından kopyalanıyor..."
    cp .env.local.example .env.local
    echo -e "${GREEN}✓ .env.local dosyası oluşturuldu${NC}"
    echo ""
    echo -e "${YELLOW}⚠ ÖNEMLİ: .env.local dosyasını düzenlemeniz gerekiyor!${NC}"
    echo "   Supabase bilgilerinizi ekleyin:"
    echo "   1. https://supabase.com adresine gidin"
    echo "   2. Proje oluşturun"
    echo "   3. Settings > API bölümünden key'leri alın"
    echo "   4. .env.local dosyasını güncelleyin"
    echo ""
else
    echo -e "${GREEN}✓ .env.local dosyası mevcut${NC}"
fi
echo ""

# Build testi
echo "🏗️ Build testi yapılıyor..."
echo "   (Bu birkaç dakika sürebilir...)"
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build başarılı!${NC}"
else
    echo -e "${YELLOW}⚠ Build başarısız - muhtemelen environment variables eksik${NC}"
    echo "   .env.local dosyasını kontrol edin"
fi
echo ""

# Özet
echo "======================================"
echo "✅ Kurulum Tamamlandı!"
echo "======================================"
echo ""
echo "📋 Sonraki Adımlar:"
echo ""
echo "1. Supabase projesi oluşturun:"
echo "   https://supabase.com"
echo ""
echo "2. .env.local dosyasını düzenleyin:"
echo "   nano .env.local"
echo ""
echo "3. Veritabanı şemasını oluşturun:"
echo "   Supabase Dashboard > SQL Editor"
echo "   supabase/migrations/001_initial_schema.sql dosyasını çalıştırın"
echo ""
echo "4. Development sunucusunu başlatın:"
echo "   npm run dev"
echo ""
echo "5. Tarayıcıda açın:"
echo "   http://localhost:3000"
echo ""
echo "📚 Daha fazla bilgi için:"
echo "   - Quick Start: docs/QUICKSTART.md"
echo "   - Kurulum: docs/KURULUM.md"
echo "   - Kullanım: docs/KULLANIM.md"
echo ""
echo "🎉 Başarılar!"
