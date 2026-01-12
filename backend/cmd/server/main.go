package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"azaton-backend/internal/config"
	"azaton-backend/internal/database"
	"azaton-backend/internal/handlers"
	"azaton-backend/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// Initialize database connection
	db, err := database.NewConnection(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		log.Printf("Warning: Migration error: %v", err)
	}

	// Initialize router
	router := gin.Default()

	// CORS configuration
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Static files for uploads
	router.Static("/uploads", cfg.UploadDir)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "timestamp": time.Now().UTC()})
	})

	// API routes
	api := router.Group("/api")
	{
		// Public routes
		api.POST("/companies/login", handlers.LoginCompany(db))
		api.POST("/companies/verify-access", handlers.VerifyCompanyAccess(db))
		api.GET("/companies", handlers.GetCompanies(db))
		api.GET("/companies/:id", handlers.GetCompany(db))
		api.GET("/companies/by-company-id/:companyId", handlers.GetCompanyByCompanyId(db))
		api.POST("/companies", handlers.CreateCompany(db))
		api.POST("/companies/secure-create", handlers.CreateCompany(db))
		api.PUT("/companies/:id", handlers.UpdateCompany(db))
		api.PATCH("/companies/:id/toggle-privacy", handlers.ToggleCompanyPrivacy(db))
		api.DELETE("/companies/:id", handlers.DeleteCompany(db))
		api.GET("/companies/:id/profile", handlers.GetCompanyProfile(db))
		api.POST("/companies/:id/rate", handlers.RateCompany(db))
		api.GET("/companies/:id/financial-stats", handlers.GetFinancialStats(db))

		// Products
		api.GET("/products", handlers.GetProducts(db))
		api.GET("/products/paginated", handlers.GetProductsPaginated(db))
		api.POST("/products/add", handlers.CreateProduct(db))
		api.PUT("/products/:id", handlers.UpdateProduct(db))
		api.DELETE("/products/:id", handlers.DeleteProduct(db))
		api.DELETE("/products", handlers.DeleteAllProducts(db))
		api.POST("/products/bulk-import", handlers.BulkImportProducts(db))
		api.PUT("/products/:id/toggle-customer-availability", handlers.ToggleProductAvailability(db))
		api.POST("/products/bulk-toggle-availability", handlers.BulkToggleAvailability(db))
		api.POST("/products/bulk-update-barcodes", handlers.BulkUpdateBarcodes(db))
		api.POST("/products/:id/upload-image", handlers.UploadProductImage(db, cfg))
		api.GET("/products/:id/images", handlers.GetProductImages(db))
		api.DELETE("/products/:id/images/:index", handlers.DeleteProductImage(db))

		// Users
		api.GET("/users", handlers.GetUsers(db))
		api.POST("/users", handlers.CreateUser(db))
		api.GET("/users/:phone", handlers.GetUserByPhone(db))
		api.DELETE("/users", handlers.DeleteAllUsers(db))

		// Customer Orders
		api.GET("/customer-orders", handlers.GetCustomerOrders(db))
		api.POST("/customer-orders", handlers.CreateCustomerOrder(db))
		api.PUT("/customer-orders/:id/confirm-payment", handlers.ConfirmOrderPayment(db))
		api.PUT("/customer-orders/:id/cancel", handlers.CancelOrder(db))
		api.GET("/customer-orders/search/:code", handlers.SearchOrderByCode(db))

		// Sales History
		api.GET("/sales-history", handlers.GetSalesHistory(db))
		api.POST("/sales-history", handlers.CreateSale(db))

		// Expenses
		api.GET("/expenses", handlers.GetExpenses(db))
		api.POST("/expenses", handlers.UpdateExpenses(db))
		api.POST("/expenses/custom", handlers.AddCustomExpenseType(db))
		api.PUT("/expenses/custom/:id", handlers.UpdateCustomExpenseType(db))
		api.DELETE("/expenses/custom/:id", handlers.DeleteCustomExpenseType(db))

		// User Cart
		api.GET("/user-cart", handlers.GetUserCart(db))
		api.POST("/user-cart", handlers.SaveUserCart(db))
		api.DELETE("/user-cart/:phone", handlers.ClearUserCart(db))

		// User Receipts
		api.GET("/user-receipts", handlers.GetUserReceipts(db))
		api.POST("/user-receipts", handlers.SaveUserReceipt(db))
		api.DELETE("/user-receipts/:id", handlers.DeleteUserReceipt(db))

		// User Likes
		api.GET("/user-likes", handlers.GetUserLikes(db))
		api.POST("/user-likes", handlers.SaveUserLikes(db))
		api.POST("/user-likes/add", handlers.AddProductToLikes(db))
		api.DELETE("/user-likes/:product_id", handlers.RemoveProductFromLikes(db))

		// Advertisements
		api.GET("/ads", handlers.GetAdvertisements(db))
		api.GET("/ads/approved", handlers.GetApprovedAdvertisements(db))
		api.GET("/ads/company/:company_id", handlers.GetCompanyAdvertisements(db))
		api.POST("/ads", handlers.CreateAdvertisement(db))
		api.PUT("/ads/:id", handlers.UpdateAdvertisement(db))
		api.PUT("/ads/:id/approve", handlers.ApproveAdvertisement(db))
		api.PUT("/ads/:id/reject", handlers.RejectAdvertisement(db))
		api.DELETE("/ads/:id", handlers.DeleteAdvertisement(db))
	}

	// Protected routes (require authentication)
	protected := api.Group("/")
	protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		// Add protected routes here if needed
	}

	// Create server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.ServerPort),
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("🚀 Server starting on port %s", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited properly")
}
