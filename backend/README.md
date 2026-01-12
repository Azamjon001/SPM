# Azaton Go Backend

A high-performance REST API backend for the Azaton e-commerce platform, built with Go and PostgreSQL.

## Features

- 🚀 **High Performance**: Built with Gin framework for blazing fast API responses
- 🔐 **JWT Authentication**: Secure token-based authentication
- 📦 **PostgreSQL Database**: Robust and reliable data storage
- 🐳 **Docker Ready**: Easy deployment with Docker and Docker Compose
- 📊 **Full CRUD Operations**: Complete API for all entities

## Tech Stack

- **Go 1.22**: Modern Go with generics support
- **Gin Web Framework**: Fast HTTP router and web framework
- **pgx/v5**: High-performance PostgreSQL driver
- **JWT**: JSON Web Token authentication
- **Docker**: Containerization for easy deployment

## Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go          # Application entry point
├── internal/
│   ├── config/
│   │   └── config.go        # Configuration management
│   ├── database/
│   │   └── database.go      # Database connection and migrations
│   ├── handlers/
│   │   ├── ads.go           # Advertisement handlers
│   │   ├── companies.go     # Company handlers
│   │   ├── expenses.go      # Expense handlers + Cart
│   │   ├── orders.go        # Order and Sales handlers
│   │   ├── products.go      # Product handlers
│   │   ├── receipts.go      # Receipt and Likes handlers
│   │   └── users.go         # User handlers
│   ├── middleware/
│   │   └── auth.go          # JWT authentication middleware
│   └── models/
│       └── models.go        # Data models
├── migrations/
│   └── 001_init.sql         # Database schema
├── Dockerfile               # Docker build instructions
├── go.mod                   # Go module definition
└── README.md               # This file
```

## API Endpoints

### Companies
- `GET /api/companies` - List all companies
- `GET /api/companies/:id` - Get company by ID
- `POST /api/companies` - Create new company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company
- `POST /api/companies/login` - Login (returns JWT)
- `POST /api/companies/verify-access` - Verify access key

### Products
- `GET /api/products` - List products (with optional company_id filter)
- `GET /api/products/paginated` - Paginated products list
- `POST /api/products/add` - Add new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/bulk-import` - Bulk import products
- `POST /api/products/:id/upload-image` - Upload product image

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create/update user
- `GET /api/users/:phone` - Get user by phone
- `DELETE /api/users` - Delete all users

### Customer Orders
- `GET /api/customer-orders` - List orders
- `POST /api/customer-orders` - Create order
- `PUT /api/customer-orders/:id/confirm-payment` - Confirm payment
- `PUT /api/customer-orders/:id/cancel` - Cancel order

### Sales History
- `GET /api/sales-history` - Get sales history
- `POST /api/sales-history` - Record new sale

### Expenses
- `GET /api/expenses` - Get company expenses
- `POST /api/expenses` - Update expenses

### User Cart, Receipts, Likes
- `GET/POST /api/user-cart` - Cart operations
- `GET/POST /api/user-receipts` - Receipt operations
- `GET/POST /api/user-likes` - Likes operations

### Advertisements
- `GET /api/ads` - List advertisements
- `POST /api/ads` - Create advertisement
- `PUT /api/ads/:id/approve` - Approve ad
- `PUT /api/ads/:id/reject` - Reject ad

## Quick Start

### Prerequisites
- Go 1.22+
- PostgreSQL 15+
- Docker (optional)

### Local Development

1. **Setup environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

2. **Install dependencies:**
   ```bash
   go mod download
   ```

3. **Run the server:**
   ```bash
   go run cmd/server/main.go
   ```

### Docker Development

```bash
# From project root
docker-compose up --build
```

The API will be available at `http://localhost:8080`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret key for JWT tokens | - |
| `PORT` | Server port | 8080 |
| `GIN_MODE` | Gin mode (debug/release) | debug |
| `CORS_ORIGINS` | Allowed CORS origins | * |
| `UPLOAD_DIR` | Directory for file uploads | ./uploads |

## Database Schema

The database schema is defined in `migrations/001_init.sql` and includes:

- `companies` - Company information
- `users` - Customer/user data
- `products` - Product catalog
- `customer_orders` - Customer orders
- `sales_history` - Sales records
- `expenses` - Company expenses
- `company_custom_expenses` - Custom expense types
- `user_cart` - Shopping carts
- `user_receipts` - Purchase receipts
- `user_likes` - Liked products
- `advertisements` - Ads/promotions
- `company_ratings` - Company ratings

## License

MIT
