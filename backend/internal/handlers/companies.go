package handlers

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetCompanies returns all companies
func GetCompanies(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		rows, err := db.Query(ctx, `
			SELECT id, name, phone, password, access_key, is_private, company_id, 
				   first_name, last_name, rating, rating_count, created_at
			FROM companies
			ORDER BY id
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var companies []map[string]interface{}
		for rows.Next() {
			var id int
			var name, phone, password, accessKey string
			var isPrivate bool
			var companyID, firstName, lastName *string
			var rating float64
			var ratingCount int
			var createdAt interface{}

			if err := rows.Scan(&id, &name, &phone, &password, &accessKey, &isPrivate,
				&companyID, &firstName, &lastName, &rating, &ratingCount, &createdAt); err != nil {
				continue
			}

			companies = append(companies, map[string]interface{}{
				"id":           id,
				"name":         name,
				"phone":        phone,
				"password":     password,
				"access_key":   accessKey,
				"is_private":   isPrivate,
				"company_id":   companyID,
				"first_name":   firstName,
				"last_name":    lastName,
				"rating":       rating,
				"rating_count": ratingCount,
				"created_at":   createdAt,
			})
		}

		c.JSON(http.StatusOK, gin.H{"companies": companies})
	}
}

// GetCompany returns a single company by ID
func GetCompany(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company ID"})
			return
		}

		var company struct {
			ID          int      `json:"id"`
			Name        string   `json:"name"`
			Phone       string   `json:"phone"`
			Password    string   `json:"password"`
			AccessKey   string   `json:"access_key"`
			IsPrivate   bool     `json:"is_private"`
			CompanyID   *string  `json:"company_id"`
			Rating      float64  `json:"rating"`
			RatingCount int      `json:"rating_count"`
		}

		err = db.QueryRow(ctx, `
			SELECT id, name, phone, password, access_key, is_private, company_id, rating, rating_count
			FROM companies WHERE id = $1
		`, id).Scan(&company.ID, &company.Name, &company.Phone, &company.Password,
			&company.AccessKey, &company.IsPrivate, &company.CompanyID, &company.Rating, &company.RatingCount)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Company not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"company": company})
	}
}

// GetCompanyByCompanyId returns a company by its private company_id
func GetCompanyByCompanyId(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		companyID := c.Param("companyId")

		var company struct {
			ID        int     `json:"id"`
			Name      string  `json:"name"`
			IsPrivate bool    `json:"is_private"`
			CompanyID *string `json:"company_id"`
		}

		err := db.QueryRow(ctx, `
			SELECT id, name, is_private, company_id
			FROM companies WHERE company_id = $1
		`, companyID).Scan(&company.ID, &company.Name, &company.IsPrivate, &company.CompanyID)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Company not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"company": company})
	}
}

// CreateCompany creates a new company
func CreateCompany(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			Name      string  `json:"name" binding:"required"`
			Phone     string  `json:"phone" binding:"required"`
			Password  string  `json:"password" binding:"required"`
			AccessKey string  `json:"access_key" binding:"required"`
			IsPrivate bool    `json:"is_private"`
			CompanyID *string `json:"company_id"`
			FirstName *string `json:"first_name"`
			LastName  *string `json:"last_name"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var id int
		err := db.QueryRow(ctx, `
			INSERT INTO companies (name, phone, password, access_key, is_private, company_id, first_name, last_name)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id
		`, input.Name, input.Phone, input.Password, input.AccessKey, input.IsPrivate,
			input.CompanyID, input.FirstName, input.LastName).Scan(&id)

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Company already exists or invalid data"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"company": map[string]interface{}{
				"id":         id,
				"name":       input.Name,
				"phone":      input.Phone,
				"access_key": input.AccessKey,
				"is_private": input.IsPrivate,
			},
		})
	}
}

// UpdateCompany updates an existing company
func UpdateCompany(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company ID"})
			return
		}

		var input map[string]interface{}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Build dynamic update query
		query := "UPDATE companies SET updated_at = NOW()"
		args := []interface{}{}
		argNum := 1

		if name, ok := input["name"].(string); ok {
			query += ", name = $" + strconv.Itoa(argNum)
			args = append(args, name)
			argNum++
		}
		if phone, ok := input["phone"].(string); ok {
			query += ", phone = $" + strconv.Itoa(argNum)
			args = append(args, phone)
			argNum++
		}
		if password, ok := input["password"].(string); ok {
			query += ", password = $" + strconv.Itoa(argNum)
			args = append(args, password)
			argNum++
		}
		if accessKey, ok := input["access_key"].(string); ok {
			query += ", access_key = $" + strconv.Itoa(argNum)
			args = append(args, accessKey)
			argNum++
		}

		query += " WHERE id = $" + strconv.Itoa(argNum)
		args = append(args, id)

		_, err = db.Exec(ctx, query, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "company": input})
	}
}

// ToggleCompanyPrivacy toggles the privacy mode of a company
func ToggleCompanyPrivacy(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company ID"})
			return
		}

		var input struct {
			IsPrivate bool    `json:"is_private"`
			CompanyID *string `json:"company_id"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		_, err = db.Exec(ctx, `
			UPDATE companies SET is_private = $1, company_id = $2, updated_at = NOW()
			WHERE id = $3
		`, input.IsPrivate, input.CompanyID, id)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// DeleteCompany deletes a company
func DeleteCompany(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company ID"})
			return
		}

		_, err = db.Exec(ctx, "DELETE FROM companies WHERE id = $1", id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// LoginCompany authenticates a company
func LoginCompany(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			Phone    string `json:"phone" binding:"required"`
			Password string `json:"password" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var company struct {
			ID        int    `json:"id"`
			Name      string `json:"name"`
			Phone     string `json:"phone"`
			AccessKey string `json:"access_key"`
		}

		err := db.QueryRow(ctx, `
			SELECT id, name, phone, access_key
			FROM companies WHERE phone = $1 AND password = $2
		`, input.Phone, input.Password).Scan(&company.ID, &company.Name, &company.Phone, &company.AccessKey)

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Invalid credentials"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "company": company})
	}
}

// VerifyCompanyAccess verifies company access key
func VerifyCompanyAccess(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			CompanyID int    `json:"company_id" binding:"required"`
			AccessKey string `json:"access_key" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var company struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		}

		err := db.QueryRow(ctx, `
			SELECT id, name FROM companies WHERE id = $1 AND access_key = $2
		`, input.CompanyID, input.AccessKey).Scan(&company.ID, &company.Name)

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Invalid access key"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "company": company})
	}
}

// GetCompanyProfile returns company profile with rating
func GetCompanyProfile(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company ID"})
			return
		}

		var company struct {
			ID          int     `json:"id"`
			Name        string  `json:"name"`
			Rating      float64 `json:"rating"`
			RatingCount int     `json:"rating_count"`
		}

		err = db.QueryRow(ctx, `
			SELECT id, name, rating, rating_count FROM companies WHERE id = $1
		`, id).Scan(&company.ID, &company.Name, &company.Rating, &company.RatingCount)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Company not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"company": company})
	}
}

// RateCompany allows a customer to rate a company
func RateCompany(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		companyID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company ID"})
			return
		}

		var input struct {
			CustomerID string `json:"customer_id" binding:"required"`
			Rating     int    `json:"rating" binding:"required,min=1,max=5"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Upsert rating
		_, err = db.Exec(ctx, `
			INSERT INTO company_ratings (company_id, customer_id, rating)
			VALUES ($1, $2, $3)
			ON CONFLICT (company_id, customer_id) DO UPDATE SET rating = $3
		`, companyID, input.CustomerID, input.Rating)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Update company average rating
		_, err = db.Exec(ctx, `
			UPDATE companies SET
				rating = (SELECT AVG(rating)::numeric(3,2) FROM company_ratings WHERE company_id = $1),
				rating_count = (SELECT COUNT(*) FROM company_ratings WHERE company_id = $1)
			WHERE id = $1
		`, companyID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// GetFinancialStats returns financial statistics for a company
func GetFinancialStats(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		companyID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company ID"})
			return
		}

		var stats struct {
			TotalMarkupProfit float64 `json:"totalMarkupProfit"`
			TotalRevenue      float64 `json:"totalRevenue"`
			SalesCount        int     `json:"salesCount"`
		}

		err = db.QueryRow(ctx, `
			SELECT 
				COALESCE(SUM(markup_profit), 0) as total_markup_profit,
				COALESCE(SUM(total_amount), 0) as total_revenue,
				COUNT(*) as sales_count
			FROM customer_orders
			WHERE company_id = $1 AND status = 'completed' AND payment_confirmed = true
		`, companyID).Scan(&stats.TotalMarkupProfit, &stats.TotalRevenue, &stats.SalesCount)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success":           true,
			"totalMarkupProfit": stats.TotalMarkupProfit,
			"totalRevenue":      stats.TotalRevenue,
			"salesCount":        stats.SalesCount,
		})
	}
}
