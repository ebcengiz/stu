-- Sample data for testing

-- Insert a test tenant
INSERT INTO tenants (id, name, slug, is_active)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Test Firma', 'test-firma', true);

-- Note: User/profile creation should be done through Supabase Auth
-- This is just a placeholder for reference

-- Insert sample categories
INSERT INTO categories (tenant_id, name, description)
VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Elektronik', 'Elektronik ürünler'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Gıda', 'Gıda ürünleri'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Tekstil', 'Tekstil ürünleri');

-- Insert sample warehouses
INSERT INTO warehouses (tenant_id, name, location, is_active)
VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Ana Depo', 'İstanbul Anadolu Yakası', true),
    ('550e8400-e29b-41d4-a716-446655440000', 'Merkez Depo', 'İstanbul Avrupa Yakası', true);
