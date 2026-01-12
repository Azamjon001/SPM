# 🛒 Azaton E-Commerce Platform

To'liq stack e-commerce platformasi - React frontend va Go backend bilan.

## 🏗️ Arxitektura

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    AZATON PLATFORM                       │
                    └─────────────────────────────────────────────────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         │                                    │                                    │
         ▼                                    ▼                                    ▼
┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
│    FRONTEND     │              │     BACKEND     │              │    DATABASE     │
│   React/Vite    │─────────────▶│    Go/Gin API   │─────────────▶│   PostgreSQL    │
│   TypeScript    │              │    REST API     │              │   Migrations    │
│   Tailwind      │              │    JWT Auth     │              │   Schemas       │
└─────────────────┘              └─────────────────┘              └─────────────────┘
    Port: 5173                       Port: 8080                       Port: 5432
```

## 📁 Loyiha Strukturasi

```
SPM/
├── 🎨 frontend/              # React Frontend
│   ├── src/
│   │   ├── components/       # 60+ UI komponentlari
│   │   ├── utils/            # API, cache, helpers
│   │   ├── hooks/            # Custom React hooks
│   │   └── styles/           # CSS fayllari
│   ├── package.json
│   └── vite.config.ts
│
├── ⚙️ backend/               # Go Backend
│   ├── cmd/server/           # Entry point
│   ├── internal/
│   │   ├── config/           # Konfiguratsiya
│   │   ├── database/         # DB ulanish
│   │   ├── handlers/         # API handlers
│   │   ├── middleware/       # Auth middleware
│   │   └── models/           # Data models
│   └── go.mod
│
├── 🗄️ database/              # Database
│   ├── migrations/           # SQL migratsiyalar
│   ├── seeds/                # Test ma'lumotlar
│   └── scripts/              # Backup skriptlari
│
├── 🐳 docker/                # Docker
│   ├── docker-compose.yml    # Services orchestration
│   ├── Dockerfile.frontend   # Frontend build
│   ├── Dockerfile.backend    # Backend build
│   └── nginx.conf            # Nginx config
│
└── 📚 docs/                  # Dokumentatsiya
```

## ✨ Xususiyatlar

| Xususiyat | Tavsif |
|-----------|--------|
| 🏪 Multi-Company | Har bir kompaniya o'z mahsulotlari bilan |
| 🛒 Shopping Cart | Persistent savat |
| 📦 Inventory | To'liq inventar boshqaruvi |
| 💰 Analytics | Moliyaviy tahlillar |
| 👥 Customers | Mijozlar boshqaruvi |
| 📱 Mobile-First | Responsive dizayn |
| 🔐 JWT Auth | Xavfsiz autentifikatsiya |
| 🌍 i18n | Rus/O'zbek tillari |

## 🚀 Tez Boshlash

### Docker bilan (Tavsiya etiladi)

```bash
# Loyihani klonlash
git clone https://github.com/Azamjon001/SPM.git
cd SPM

# Docker bilan ishga tushirish
cd docker
docker-compose up --build
```

**URLs:**
- 🌐 Frontend: http://localhost:5173
- 🔌 Backend API: http://localhost:8080
- 🗄️ PostgreSQL: localhost:5432

### Manual o'rnatish

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend
```bash
cd backend
cp .env.example .env
# .env ni tahrirlang
go run cmd/server/main.go
```

## 🔧 Texnologiyalar

### Frontend
| Texnologiya | Vazifasi |
|-------------|----------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite 6 | Build Tool |
| Tailwind CSS | Styling |
| Radix UI | Accessible Components |
| Recharts | Charts |
| React Router 7 | Routing |

### Backend
| Texnologiya | Vazifasi |
|-------------|----------|
| Go 1.22 | Backend |
| Gin | Web Framework |
| pgx/v5 | PostgreSQL Driver |
| JWT | Authentication |

### Database
| Texnologiya | Vazifasi |
|-------------|----------|
| PostgreSQL 15 | Database |
| SQL Migrations | Schema Management |

### DevOps
| Texnologiya | Vazifasi |
|-------------|----------|
| Docker | Containerization |
| Docker Compose | Orchestration |
| Nginx | Reverse Proxy |

## 📚 API Dokumentatsiya

Batafsil API dokumentatsiya: [backend/README.md](backend/README.md)

### Asosiy Endpointlar
```
POST   /api/companies/login         # Kirish
GET    /api/products?company_id=X   # Mahsulotlar
POST   /api/customer-orders         # Buyurtma
GET    /api/sales-history           # Sotuvlar
GET    /api/expenses                # Xarajatlar
```

## ⚙️ Environment Variables

`docker/.env` faylda:

```env
# Database
POSTGRES_DB=azaton
POSTGRES_USER=azaton
POSTGRES_PASSWORD=your_secure_password

# Backend
JWT_SECRET=your_jwt_secret
GIN_MODE=release

# Ports
FRONTEND_PORT=5173
BACKEND_PORT=8080
DB_PORT=5432
```

## 📖 Qo'llanmalar

- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)
- [Database README](database/README.md)
- [Docker README](docker/README.md)

## 🤝 Hissa Qo'shish

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/amazing`)
3. Commit qiling (`git commit -m 'Add amazing feature'`)
4. Push qiling (`git push origin feature/amazing`)
5. Pull Request oching

## 📄 Litsenziya

MIT License - batafsil [LICENSE](LICENSE) faylida.

```env
# Database
POSTGRES_PASSWORD=your_password

# JWT Secret
JWT_SECRET=your_secret_key

# Frontend API URL
VITE_API_URL=http://localhost:8080/api
```

## 📝 License

MIT

---

Original design: [Figma](https://www.figma.com/design/hMZ4spaXwvA0UeZpBEWqlo/Azaton)