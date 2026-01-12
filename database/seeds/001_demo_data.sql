-- ============================================
-- AZATON DATABASE - SEED DATA
-- Development/Testing uchun test ma'lumotlar
-- ============================================

-- ⚠️ OGOHLANTIRISH: Bu faylni production serverda ishlatmang!

-- ============================================
-- Test Kompaniya
-- ============================================
INSERT INTO companies (name, phone, password, access_key, is_private, company_id, first_name, last_name)
VALUES 
    ('Demo Kompaniya', '998901234567', 'demo123', 'DEMO-ACCESS-KEY-123456789012', false, 'DEMO001', 'Demo', 'User'),
    ('Test Do''kon', '998909876543', 'test123', 'TEST-ACCESS-KEY-123456789012', true, 'TEST001', 'Test', 'Owner')
ON CONFLICT (phone) DO NOTHING;

-- ============================================
-- Test Mahsulotlar
-- ============================================
INSERT INTO products (company_id, name, quantity, price, markup_percent, markup_amount, selling_price, category, available_for_customers)
SELECT 
    c.id,
    p.name,
    p.quantity,
    p.price,
    p.markup_percent,
    p.price * p.markup_percent / 100,
    p.price + (p.price * p.markup_percent / 100),
    p.category,
    true
FROM companies c
CROSS JOIN (
    VALUES 
        ('iPhone 15 Pro', 5, 12000000, 10, 'Telefonlar'),
        ('Samsung Galaxy S24', 8, 10000000, 12, 'Telefonlar'),
        ('MacBook Air M3', 3, 18000000, 8, 'Noutbuklar'),
        ('AirPods Pro 2', 15, 3000000, 15, 'Aksessuarlar'),
        ('Apple Watch Ultra', 4, 8000000, 10, 'Soatlar'),
        ('iPad Pro 12.9', 6, 15000000, 10, 'Planshetlar'),
        ('Sony WH-1000XM5', 10, 4500000, 12, 'Audio'),
        ('Xiaomi Mi Band 8', 20, 500000, 20, 'Aksessuarlar')
) AS p(name, quantity, price, markup_percent, category)
WHERE c.phone = '998901234567'
ON CONFLICT DO NOTHING;

-- ============================================
-- Test Foydalanuvchi
-- ============================================
INSERT INTO users (first_name, last_name, phone_number, company_id)
VALUES 
    ('Aziz', 'Toshmatov', '998901111111', 'DEMO001'),
    ('Malika', 'Karimova', '998902222222', 'DEMO001')
ON CONFLICT (phone_number) DO NOTHING;

-- ============================================
-- Tasdiqlash
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Seed data muvaffaqiyatli yuklandi!';
    RAISE NOTICE '   - Kompaniyalar: %', (SELECT COUNT(*) FROM companies);
    RAISE NOTICE '   - Mahsulotlar: %', (SELECT COUNT(*) FROM products);
    RAISE NOTICE '   - Foydalanuvchilar: %', (SELECT COUNT(*) FROM users);
END $$;
