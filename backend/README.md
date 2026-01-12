# ⚙️ Azaton Go Backend

E-commerce platformasi uchun yuqori samarali REST API backend - Go va PostgreSQL bilan yaratilgan.

## ✨ Xususiyatlar

- 🚀 **Yuqori Samaradorlik**: Gin framework bilan tezkor API javoblari
- 🔐 **JWT Autentifikatsiya**: Xavfsiz token asosidagi autentifikatsiya
- 📦 **PostgreSQL Database**: Ishonchli ma'lumotlar bazasi
- 🐳 **Docker Ready**: Docker bilan oson deployment
- 📊 **To'liq CRUD**: Barcha entity'lar uchun to'liq API

## 🔧 Texnologiyalar

| Texnologiya | Versiya | Vazifasi |
|-------------|---------|----------|
| Go | 1.22+ | Asosiy til |
| Gin | - | Web framework |
| pgx/v5 | - | PostgreSQL driver |
| JWT | - | Autentifikatsiya |

## 📁 Struktura

```
backend/
├── cmd/
│   └── server/
│       └── main.go          # Entry point
├── internal/
│   ├── config/
│   │   └── config.go        # Konfiguratsiya
│   ├── database/
│   │   └── database.go      # DB ulanish
│   ├── handlers/
│   │   ├── ads.go           # Reklamalar
│   │   ├── companies.go     # Kompaniyalar
│   │   ├── expenses.go      # Xarajatlar + Savat
│   │   ├── orders.go        # Buyurtmalar
│   │   ├── products.go      # Mahsulotlar
│   │   ├── receipts.go      # Cheklar + Likes
│   │   └── users.go         # Foydalanuvchilar
│   ├── middleware/
│   │   └── auth.go          # Auth middleware
│   └── models/
│       └── models.go        # Data modellari
├── go.mod                   # Go module
└── README.md                # Ushbu fayl
```

## 🌐 API Endpoints

### Kompaniyalar
| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/api/companies` | Barcha kompaniyalar |
| GET | `/api/companies/:id` | ID bo'yicha kompaniya |
| POST | `/api/companies` | Yangi kompaniya |
| PUT | `/api/companies/:id` | Yangilash |
| DELETE | `/api/companies/:id` | O'chirish |
| POST | `/api/companies/login` | Kirish (JWT) |
| POST | `/api/companies/verify-access` | Access key tekshirish |

### Mahsulotlar
| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/api/products` | Ro'yxat (company_id filter) |
| GET | `/api/products/paginated` | Pagination bilan |
| POST | `/api/products/add` | Yangi mahsulot |
| PUT | `/api/products/:id` | Yangilash |
| DELETE | `/api/products/:id` | O'chirish |
| POST | `/api/products/bulk-import` | Bulk import |
| POST | `/api/products/:id/upload-image` | Rasm yuklash |

### Foydalanuvchilar
| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/api/users` | Barcha users |
| POST | `/api/users` | Yaratish/Yangilash |
| GET | `/api/users/:phone` | Telefon bo'yicha |

### Buyurtmalar
| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/api/customer-orders` | Ro'yxat |
| POST | `/api/customer-orders` | Yangi buyurtma |
| PUT | `/api/customer-orders/:id/confirm-payment` | To'lovni tasdiqlash |
| PUT | `/api/customer-orders/:id/cancel` | Bekor qilish |

### Sotuvlar
| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/api/sales-history` | Sotuvlar tarixi |
| POST | `/api/sales-history` | Yangi sotuv |

### Xarajatlar
| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/api/expenses` | Xarajatlar |
| POST | `/api/expenses` | Yangilash |

### Savat, Cheklar, Likes
| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET/POST | `/api/user-cart` | Savat |
| GET/POST | `/api/user-receipts` | Cheklar |
| GET/POST | `/api/user-likes` | Yoqtirilganlar |

### Reklamalar
| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/api/ads` | Ro'yxat |
| POST | `/api/ads` | Yaratish |
| PUT | `/api/ads/:id/approve` | Tasdiqlash |
| PUT | `/api/ads/:id/reject` | Rad etish |

## 🚀 Ishga Tushirish

### Local Development

```bash
# Environment sozlash
cp .env.example .env
# .env faylni tahrirlang

# Dependencies
go mod download

# Serverni ishga tushirish
go run cmd/server/main.go
```

### Docker bilan

```bash
# Loyiha root papkasidan
cd ../docker
docker-compose up --build
```

API: `http://localhost:8080`

## ⚙️ Environment Variables

| O'zgaruvchi | Tavsif | Default |
|-------------|--------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | JWT secret key | - |
| `PORT` | Server port | 8080 |
| `GIN_MODE` | debug/release | debug |
| `CORS_ORIGINS` | CORS origins | * |
| `UPLOAD_DIR` | Uploads papkasi | ./uploads |

## 📊 Database

Database sxemasi `../database/migrations/` papkasida.

Asosiy jadvallar:
- `companies` - Kompaniyalar
- `products` - Mahsulotlar
- `users` - Foydalanuvchilar
- `customer_orders` - Buyurtmalar
- `sales_history` - Sotuvlar
- `expenses` - Xarajatlar

## 🔒 Xavfsizlik

- JWT token bilan autentifikatsiya
- CORS sozlamalari
- Input validation
- SQL injection himoyasi (parameterized queries)
