# 🏗️ Azaton Platform Arxitekturasi

## Umumiy Ko'rinish

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AZATON E-COMMERCE PLATFORM                         │
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Browser   │    │   Mobile    │    │   Desktop   │    │    API      │  │
│  │   Client    │    │    App      │    │    App      │    │   Client    │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                  │                  │                  │          │
│         └──────────────────┴──────────────────┴──────────────────┘          │
│                                     │                                        │
│                                     ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                          NGINX (Reverse Proxy)                        │   │
│  │                              Port: 80/443                             │   │
│  └──────────────────────────────┬───────────────────────────────────────┘   │
│                                 │                                            │
│         ┌───────────────────────┼───────────────────────┐                   │
│         │                       │                       │                    │
│         ▼                       ▼                       ▼                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │    FRONTEND     │    │     BACKEND     │    │    UPLOADS      │         │
│  │  React + Vite   │    │   Go + Gin      │    │   Static Files  │         │
│  │   Port: 5173    │    │   Port: 8080    │    │   /uploads      │         │
│  └─────────────────┘    └────────┬────────┘    └─────────────────┘         │
│                                  │                                           │
│                                  ▼                                           │
│                         ┌─────────────────┐                                 │
│                         │   PostgreSQL    │                                 │
│                         │   Port: 5432    │                                 │
│                         └─────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Komponentlar

### 1. Frontend (React + Vite)

```
frontend/
├── src/
│   ├── components/           # UI Komponentlar
│   │   ├── ui/               # Bazaviy UI (buttons, inputs, etc.)
│   │   ├── HomePage.tsx      # Asosiy sahifa
│   │   ├── CompanyPanel.tsx  # Kompaniya paneli
│   │   └── AdminPanel.tsx    # Admin panel
│   │
│   ├── utils/                # Yordamchi funksiyalar
│   │   ├── api.tsx           # Supabase API client
│   │   ├── goApi.ts          # Go Backend API client
│   │   ├── cache.tsx         # Kesh boshqaruvi
│   │   └── translations.tsx  # i18n
│   │
│   ├── hooks/                # Custom React Hooks
│   ├── styles/               # CSS
│   ├── App.tsx               # Root component
│   └── main.tsx              # Entry point
│
├── package.json
└── vite.config.ts
```

**Texnologiyalar:**
- React 18.3.1
- TypeScript
- Vite 6.3.5
- Tailwind CSS
- Radix UI
- React Router 7
- Recharts

### 2. Backend (Go + Gin)

```
backend/
├── cmd/
│   └── server/
│       └── main.go           # Entry point
│
├── internal/
│   ├── config/
│   │   └── config.go         # Environment config
│   │
│   ├── database/
│   │   └── database.go       # DB connection + migrations
│   │
│   ├── handlers/             # HTTP Handlers (Controllers)
│   │   ├── companies.go      # Company CRUD
│   │   ├── products.go       # Product CRUD
│   │   ├── orders.go         # Order management
│   │   ├── users.go          # User management
│   │   ├── expenses.go       # Expense tracking
│   │   ├── receipts.go       # Receipts + Likes
│   │   └── ads.go            # Advertisements
│   │
│   ├── middleware/
│   │   └── auth.go           # JWT Authentication
│   │
│   └── models/
│       └── models.go         # Data structures
│
└── go.mod
```

**Texnologiyalar:**
- Go 1.22
- Gin Web Framework
- pgx/v5 (PostgreSQL driver)
- JWT Authentication

### 3. Database (PostgreSQL)

```
database/
├── migrations/
│   └── 001_init.sql          # Initial schema
│
├── seeds/
│   └── 001_demo_data.sql     # Test data
│
└── scripts/
    ├── backup.sh             # Backup script
    └── restore.sh            # Restore script
```

**Jadvallar:**

| Jadval | Tavsif |
|--------|--------|
| `companies` | Kompaniyalar |
| `products` | Mahsulotlar |
| `users` | Foydalanuvchilar |
| `customer_orders` | Buyurtmalar |
| `sales_history` | Sotuvlar tarixi |
| `expenses` | Xarajatlar |
| `company_custom_expenses` | Maxsus xarajatlar |
| `user_cart` | Savat |
| `user_receipts` | Cheklar |
| `user_likes` | Yoqtirilganlar |
| `advertisements` | Reklamalar |
| `company_ratings` | Reytinglar |

## Ma'lumotlar Oqimi

### 1. Autentifikatsiya

```
┌─────────┐    POST /api/companies/login     ┌─────────┐
│ Client  │ ──────────────────────────────▶  │ Backend │
└─────────┘                                  └────┬────┘
     ▲                                            │
     │         JWT Token                          │
     └────────────────────────────────────────────┘
```

### 2. Mahsulotlar CRUD

```
┌─────────┐    GET /api/products?company_id=1    ┌─────────┐    SELECT FROM    ┌──────────┐
│ Client  │ ──────────────────────────────────▶  │ Backend │ ───────────────▶  │ Database │
└─────────┘                                      └────┬────┘                   └────┬─────┘
     ▲                                                │                              │
     │              Products JSON                     │       Query Result           │
     └────────────────────────────────────────────────┴──────────────────────────────┘
```

### 3. Buyurtma Jarayoni

```
1. Mijoz mahsulotlarni savatga qo'shadi
2. Checkout bosganda POST /api/customer-orders
3. Backend buyurtma yaratadi (status: pending)
4. Kompaniya buyurtmani ko'radi
5. To'lov tasdiqlanganda PUT /api/customer-orders/:id/confirm-payment
6. Mahsulot miqdori kamayadi
7. Sotuvlar tarixiga qo'shiladi
```

## Xavfsizlik

### JWT Authentication

```go
// Middleware
func AuthMiddleware(secret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        // Verify JWT token
        claims, err := ValidateJWT(token, secret)
        if err != nil {
            c.AbortWithStatus(401)
            return
        }
        c.Set("company_id", claims.CompanyID)
        c.Next()
    }
}
```

### CORS Configuration

```go
router.Use(cors.New(cors.Config{
    AllowOrigins:     []string{"*"},
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
    AllowHeaders:     []string{"Authorization", "Content-Type"},
    AllowCredentials: true,
}))
```

## Scalability

### Horizontal Scaling

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Backend #1    │ │   Backend #2    │ │   Backend #3    │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │   (Primary)     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │   (Replica)     │
                    └─────────────────┘
```

## Monitoring

Tavsiya etilgan monitoring vositalari:
- **Prometheus** - Metrics to'plash
- **Grafana** - Visualization
- **ELK Stack** - Logging
- **Sentry** - Error tracking
