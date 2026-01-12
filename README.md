# Azaton E-Commerce Platform

A full-stack e-commerce platform with React frontend and Go backend.

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React/Vite    │────▶│    Go/Gin API   │────▶│   PostgreSQL    │
│   Frontend      │     │    Backend      │     │   Database      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       :5173                  :8080                  :5432
```

## ✨ Features

- 🏪 **Multi-Company Support**: Each company has its own products, orders, and settings
- 🛒 **Shopping Cart**: Persistent cart with offline support
- 📦 **Inventory Management**: Full product CRUD with bulk operations
- 💰 **Sales Analytics**: Revenue tracking, expense management
- 👥 **Customer Management**: User registration and order history
- 📱 **Mobile-First Design**: Responsive UI with Tailwind CSS
- 🔐 **Authentication**: JWT-based auth with access key system

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone and start all services
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- PostgreSQL: localhost:5432

### Manual Setup

#### Frontend
```bash
npm install
npm run dev
```

#### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials
go run cmd/server/main.go
```

## 📁 Project Structure

```
azaton/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── utils/              # API client, utilities
│   └── App.tsx             # Main app with routes
├── backend/                # Go backend
│   ├── cmd/server/         # Entry point
│   ├── internal/           # Business logic
│   │   ├── handlers/       # HTTP handlers
│   │   ├── models/         # Data models
│   │   └── middleware/     # Auth middleware
│   └── migrations/         # SQL migrations
├── docker-compose.yml      # Docker orchestration
└── Dockerfile.frontend     # Frontend build
```

## 🔧 Tech Stack

### Frontend
- **React 18** + TypeScript
- **Vite 6** for fast development
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **React Router** for navigation

### Backend
- **Go 1.22** with Gin framework
- **PostgreSQL 15** database
- **pgx/v5** for database access
- **JWT** authentication

## 📚 API Documentation

See [backend/README.md](backend/README.md) for full API documentation.

### Key Endpoints
- `POST /api/companies/login` - Company login
- `GET /api/products?company_id=X` - Get products
- `POST /api/customer-orders` - Create order
- `GET /api/sales-history?company_id=X` - Sales data

## 🔒 Environment Variables

Create `.env` in project root:

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