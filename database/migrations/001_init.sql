-- ============================================
-- AZATON DATABASE SCHEMA
-- PostgreSQL 15+
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COMPANIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    access_key VARCHAR(100) NOT NULL UNIQUE,
    is_private BOOLEAN DEFAULT FALSE,
    company_id VARCHAR(50) UNIQUE, -- Private company ID for customers
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    rating DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_companies_phone ON companies(phone);
CREATE INDEX IF NOT EXISTS idx_companies_company_id ON companies(company_id);

-- ============================================
-- USERS TABLE (Customers)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50) NOT NULL UNIQUE,
    company_id VARCHAR(50), -- Reference to private company
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    quantity INTEGER DEFAULT 0,
    price DECIMAL(15,2) DEFAULT 0,
    markup_percent DECIMAL(5,2) DEFAULT 0,
    markup_amount DECIMAL(15,2) DEFAULT 0,
    selling_price DECIMAL(15,2) DEFAULT 0,
    barcode VARCHAR(100),
    barid BIGINT,
    category VARCHAR(255) DEFAULT 'Без категории',
    has_color_options BOOLEAN DEFAULT FALSE,
    available_for_customers BOOLEAN DEFAULT TRUE,
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_barid ON products(barid);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('russian', name));

-- ============================================
-- CUSTOMER ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customer_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    user_phone VARCHAR(50),
    order_code VARCHAR(100) NOT NULL UNIQUE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount DECIMAL(15,2) DEFAULT 0,
    markup_profit DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, completed, cancelled
    payment_confirmed BOOLEAN DEFAULT FALSE,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_date TIMESTAMP WITH TIME ZONE,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_company ON customer_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_phone ON customer_orders(user_phone);
CREATE INDEX IF NOT EXISTS idx_orders_code ON customer_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON customer_orders(status);

-- ============================================
-- SALES HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sales_history (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount DECIMAL(15,2) DEFAULT 0,
    markup_profit DECIMAL(15,2) DEFAULT 0,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_company ON sales_history(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_history(sale_date);

-- ============================================
-- EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
    employee_expenses DECIMAL(15,2) DEFAULT 0,
    electricity_expenses DECIMAL(15,2) DEFAULT 0,
    purchase_costs DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(company_id);

-- ============================================
-- CUSTOM EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS company_custom_expenses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_expenses_company ON company_custom_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_expenses_date ON company_custom_expenses(expense_date);

-- ============================================
-- USER CART TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_cart (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL UNIQUE,
    cart_data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_phone ON user_cart(phone_number);

-- ============================================
-- USER RECEIPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_receipts (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL,
    order_code VARCHAR(100) NOT NULL,
    total DECIMAL(15,2) DEFAULT 0,
    items_count INTEGER DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_phone ON user_receipts(phone_number);

-- ============================================
-- USER LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_likes (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL UNIQUE,
    liked_product_ids JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_likes_phone ON user_likes(phone_number);

-- ============================================
-- ADVERTISEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS advertisements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    smm_post_id VARCHAR(100),
    image_url TEXT,
    caption TEXT,
    link_url TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    reviewed_by VARCHAR(255),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_company ON advertisements(company_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON advertisements(status);

-- ============================================
-- COMPANY RATINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS company_ratings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id VARCHAR(100) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_company ON company_ratings(company_id);

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INSERT DEFAULT COMPANY
-- ============================================
INSERT INTO companies (name, phone, password, access_key)
VALUES ('Главная Компания', '909383572', '24067', 'default-access-key-change-me-123')
ON CONFLICT (phone) DO NOTHING;
