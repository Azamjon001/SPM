# 🐳 Docker Configuration

Azaton platformasi uchun Docker konfiguratsiya fayllari.

## 📁 Struktura

```
docker/
├── docker-compose.yml      # Asosiy orchestration
├── Dockerfile.frontend     # Frontend build
├── Dockerfile.backend      # Backend build
├── nginx.conf              # Nginx konfiguratsiyasi
├── .env.example            # Environment namunasi
└── README.md               # Ushbu fayl
```

## 🚀 Ishga Tushirish

### Barcha serviceslarni ishga tushirish

```bash
cd docker
docker-compose up --build
```

### Faqat ma'lum serviceni ishga tushirish

```bash
# Faqat database
docker-compose up postgres

# Faqat backend
docker-compose up backend

# Faqat frontend
docker-compose up frontend
```

### Background rejimda

```bash
docker-compose up -d --build
```

## 🛑 To'xtatish

```bash
# Barcha containerlarni to'xtatish
docker-compose down

# Ma'lumotlar bilan birga o'chirish
docker-compose down -v
```

## ⚙️ Environment Variables

`.env` fayl yarating (`.env.example` dan nusxa olish):

```bash
cp .env.example .env
```

### Asosiy o'zgaruvchilar

| O'zgaruvchi | Tavsif | Default |
|-------------|--------|---------|
| `POSTGRES_DB` | Database nomi | azaton |
| `POSTGRES_USER` | Database user | azaton |
| `POSTGRES_PASSWORD` | Database password | azaton_secret_2024 |
| `JWT_SECRET` | JWT secret key | - |
| `GIN_MODE` | debug/release | release |
| `FRONTEND_PORT` | Frontend port | 5173 |
| `BACKEND_PORT` | Backend port | 8080 |
| `DB_PORT` | Database port | 5432 |

## 📦 Serviceslar

### PostgreSQL
- Image: `postgres:15-alpine`
- Port: 5432
- Volume: `azaton_postgres_data`
- Healthcheck mavjud

### Backend
- Image: Custom (Go 1.22)
- Port: 8080
- Depends on: postgres (healthy)
- Volume: `azaton_uploads_data`

### Frontend
- Image: Custom (Node 20 + Nginx)
- Port: 80 (container ichida) → 5173 (tashqarida)
- Depends on: backend

## 🔄 Qayta Build

```bash
# Barcha serviceslarni qayta build
docker-compose up --build --force-recreate

# Faqat bitta serviceni qayta build
docker-compose up --build backend
```

## 📊 Loglarni Ko'rish

```bash
# Barcha loglar
docker-compose logs -f

# Ma'lum service loglari
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## 🧹 Tozalash

```bash
# Foydalanilmayotgan images
docker image prune

# Barcha volumes (⚠️ ma'lumotlar o'chadi!)
docker-compose down -v

# Barcha unused resources
docker system prune -a
```

## 🔧 Debugging

### Container ichiga kirish

```bash
# Backend
docker exec -it azaton-backend sh

# Frontend
docker exec -it azaton-frontend sh

# PostgreSQL
docker exec -it azaton-postgres psql -U azaton -d azaton
```

### Container holatini tekshirish

```bash
docker-compose ps
docker stats
```

## 📁 Volumes

| Volume | Tavsif |
|--------|--------|
| `azaton_postgres_data` | PostgreSQL ma'lumotlari |
| `azaton_uploads_data` | Yuklangan fayllar |

## 🌐 Networks

| Network | Tavsif |
|---------|--------|
| `azaton_network` | Barcha services uchun bridge network |

## 🔒 Production

Production uchun qo'shimcha sozlamalar:

1. `.env` faylda kuchli parollar ishlatish
2. `GIN_MODE=release` sozlash
3. SSL/TLS sozlash (nginx.conf)
4. Regular backup'lar sozlash
