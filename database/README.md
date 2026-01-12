# 🗄️ Azaton Database

PostgreSQL 15+ ma'lumotlar bazasi sxemasi va migratsiyalar.

## 📁 Struktura

```
database/
├── migrations/           # SQL migratsiya fayllari
│   └── 001_init.sql      # Asosiy schema
├── seeds/                # Test ma'lumotlar (development)
├── scripts/              # Yordamchi skriptlar
└── README.md             # Ushbu fayl
```

## 📊 Ma'lumotlar Bazasi Sxemasi

### Asosiy Jadvallar

| Jadval | Tavsif |
|--------|--------|
| `companies` | Kompaniyalar |
| `products` | Mahsulotlar |
| `users` | Foydalanuvchilar (mijozlar) |
| `customer_orders` | Buyurtmalar |
| `sales_history` | Sotuvlar tarixi |
| `expenses` | Xarajatlar |
| `company_custom_expenses` | Maxsus xarajatlar |
| `user_cart` | Savat |
| `user_receipts` | Cheklar |
| `user_likes` | Yoqtirilganlar |
| `advertisements` | Reklamalar |
| `company_ratings` | Kompaniya reytinglari |

### ER Diagramma

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  companies  │────<│  products   │     │    users    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   expenses  │     │customer_    │────>│  user_cart  │
└─────────────┘     │   orders    │     └─────────────┘
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │sales_history│
                    └─────────────┘
```

## 🚀 Migratsiyalarni Ishga Tushirish

### Docker orqali (avtomatik)
```bash
# docker-compose PostgreSQL ishga tushganda avtomatik bajariladi
cd docker && docker-compose up postgres
```

### Manual
```bash
# PostgreSQL ga ulanish
psql -h localhost -U azaton -d azaton

# Migratsiya faylini bajarish
\i migrations/001_init.sql
```

## 🔧 Muhit O'zgaruvchilari

```env
POSTGRES_DB=azaton
POSTGRES_USER=azaton
POSTGRES_PASSWORD=azaton_secret_2024
DB_HOST=localhost
DB_PORT=5432
DB_SSLMODE=disable
```

## 📝 Migratsiya Qo'shish

Yangi migratsiya qo'shish uchun:

1. `migrations/` papkasida yangi fayl yarating:
   ```
   002_add_new_feature.sql
   ```

2. Migratsiya formatiga rioya qiling:
   ```sql
   -- ============================================
   -- MIGRATION: 002 - Add New Feature
   -- Date: 2026-01-12
   -- Description: Bu migratsiya nima qiladi
   -- ============================================
   
   -- UP Migration
   CREATE TABLE IF NOT EXISTS new_table (
       id SERIAL PRIMARY KEY,
       ...
   );
   
   -- Indexes
   CREATE INDEX IF NOT EXISTS idx_... ON new_table(...);
   ```

## 🔐 Xavfsizlik

- Production muhitda `POSTGRES_PASSWORD` ni kuchli parol bilan almashtiring
- `DB_SSLMODE=require` ishlatishni tavsiya qilamiz
- Regular backup'lar oling

## 📊 Indekslar

Barcha jadvallar uchun quyidagi indekslar mavjud:
- Primary key indekslari (avtomatik)
- Foreign key indekslari
- Tez-tez qidiriladigan ustunlar uchun indekslar
- Full-text search uchun GIN indekslar (products.name)
