-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE movement_type AS ENUM ('in', 'out', 'transfer', 'adjustment');

-- =============================================
-- TENANTS TABLE
-- =============================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- PROFILES TABLE (extends auth.users)
-- =============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- CATEGORIES TABLE
-- =============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- WAREHOUSES TABLE
-- =============================================
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sku TEXT,
    barcode TEXT,
    description TEXT,
    unit TEXT DEFAULT 'adet',
    min_stock_level INTEGER DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- STOCK TABLE
-- =============================================
CREATE TABLE stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
    quantity DECIMAL(15, 2) DEFAULT 0 NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(product_id, warehouse_id)
);

-- =============================================
-- STOCK MOVEMENTS TABLE
-- =============================================
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
    movement_type movement_type NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL,
    reference_no TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_warehouses_tenant ON warehouses(tenant_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_stock_tenant ON stock(tenant_id);
CREATE INDEX idx_stock_product ON stock(product_id);
CREATE INDEX idx_stock_movements_tenant ON stock_movements(tenant_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION auth.user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Tenants policies
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (id = auth.user_tenant_id());

-- Profiles policies
CREATE POLICY "Users can view profiles in their tenant"
  ON profiles FOR SELECT
  USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Categories policies
CREATE POLICY "Users can view categories in their tenant"
  ON categories FOR SELECT
  USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Users can insert categories in their tenant"
  ON categories FOR INSERT
  WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "Users can update categories in their tenant"
  ON categories FOR UPDATE
  USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Users can delete categories in their tenant"
  ON categories FOR DELETE
  USING (tenant_id = auth.user_tenant_id());

-- Warehouses policies
CREATE POLICY "Users can view warehouses in their tenant"
  ON warehouses FOR SELECT
  USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Users can insert warehouses in their tenant"
  ON warehouses FOR INSERT
  WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "Users can update warehouses in their tenant"
  ON warehouses FOR UPDATE
  USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Users can delete warehouses in their tenant"
  ON warehouses FOR DELETE
  USING (tenant_id = auth.user_tenant_id());

-- Products policies
CREATE POLICY "Users can view products in their tenant"
  ON products FOR SELECT
  USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Users can insert products in their tenant"
  ON products FOR INSERT
  WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "Users can update products in their tenant"
  ON products FOR UPDATE
  USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Users can delete products in their tenant"
  ON products FOR DELETE
  USING (tenant_id = auth.user_tenant_id());

-- Stock policies
CREATE POLICY "Users can view stock in their tenant"
  ON stock FOR SELECT
  USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Users can insert stock in their tenant"
  ON stock FOR INSERT
  WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "Users can update stock in their tenant"
  ON stock FOR UPDATE
  USING (tenant_id = auth.user_tenant_id());

-- Stock movements policies
CREATE POLICY "Users can view stock movements in their tenant"
  ON stock_movements FOR SELECT
  USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Users can insert stock movements in their tenant"
  ON stock_movements FOR INSERT
  WITH CHECK (tenant_id = auth.user_tenant_id());

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle stock updates after movements
CREATE OR REPLACE FUNCTION handle_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert stock record
    INSERT INTO stock (tenant_id, product_id, warehouse_id, quantity)
    VALUES (NEW.tenant_id, NEW.product_id, NEW.warehouse_id,
            CASE NEW.movement_type
                WHEN 'in' THEN NEW.quantity
                WHEN 'out' THEN -NEW.quantity
                WHEN 'adjustment' THEN NEW.quantity
                ELSE 0
            END)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
        quantity = stock.quantity + CASE NEW.movement_type
            WHEN 'in' THEN NEW.quantity
            WHEN 'out' THEN -NEW.quantity
            WHEN 'adjustment' THEN NEW.quantity
            ELSE 0
        END,
        last_updated = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for stock movements
CREATE TRIGGER on_stock_movement_insert
    AFTER INSERT ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION handle_stock_movement();
