package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"azaton-backend/internal/config"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetProducts returns all products or filtered by company
func GetProducts(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		companyIDStr := c.Query("company_id")

		var query string
		var args []interface{}

		if companyIDStr != "" {
			companyID, err := strconv.Atoi(companyIDStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company_id"})
				return
			}
			query = `
				SELECT id, company_id, name, quantity, price, markup_percent, markup_amount, 
					   selling_price, barcode, barid, category, has_color_options, 
					   available_for_customers, images, created_at
				FROM products WHERE company_id = $1 ORDER BY id DESC
			`
			args = append(args, companyID)
		} else {
			query = `
				SELECT id, company_id, name, quantity, price, markup_percent, markup_amount, 
					   selling_price, barcode, barid, category, has_color_options, 
					   available_for_customers, images, created_at
				FROM products ORDER BY id DESC
			`
		}

		rows, err := db.Query(ctx, query, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		products := []map[string]interface{}{}
		for rows.Next() {
			var id, companyID, quantity int
			var price, markupPercent, markupAmount, sellingPrice float64
			var name, category string
			var barcode *string
			var barid *int64
			var hasColorOptions, availableForCustomers bool
			var imagesJSON []byte
			var createdAt time.Time

			if err := rows.Scan(&id, &companyID, &name, &quantity, &price, &markupPercent,
				&markupAmount, &sellingPrice, &barcode, &barid, &category, &hasColorOptions,
				&availableForCustomers, &imagesJSON, &createdAt); err != nil {
				continue
			}

			var images []interface{}
			json.Unmarshal(imagesJSON, &images)

			products = append(products, map[string]interface{}{
				"id":                      id,
				"company_id":              companyID,
				"name":                    name,
				"quantity":                quantity,
				"price":                   price,
				"markup_percent":          markupPercent,
				"markup_amount":           markupAmount,
				"selling_price":           sellingPrice,
				"barcode":                 barcode,
				"barid":                   barid,
				"category":                category,
				"has_color_options":       hasColorOptions,
				"available_for_customers": availableForCustomers,
				"images":                  images,
				"created_at":              createdAt,
			})
		}

		c.JSON(http.StatusOK, gin.H{"products": products})
	}
}

// GetProductsPaginated returns paginated products
func GetProductsPaginated(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
		offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
		companyIDStr := c.Query("company_id")
		search := c.Query("search")
		availableOnly := c.Query("available_only") == "true"

		var queryBuilder strings.Builder
		queryBuilder.WriteString(`
			SELECT id, company_id, name, quantity, price, markup_percent, markup_amount, 
				   selling_price, barcode, barid, category, has_color_options, 
				   available_for_customers, images, created_at
			FROM products WHERE 1=1
		`)

		args := []interface{}{}
		argNum := 1

		if companyIDStr != "" {
			companyID, _ := strconv.Atoi(companyIDStr)
			queryBuilder.WriteString(fmt.Sprintf(" AND company_id = $%d", argNum))
			args = append(args, companyID)
			argNum++
		}

		if availableOnly {
			queryBuilder.WriteString(" AND available_for_customers = true")
		}

		if search != "" {
			queryBuilder.WriteString(fmt.Sprintf(" AND (name ILIKE $%d OR barcode ILIKE $%d)", argNum, argNum))
			args = append(args, "%"+search+"%")
			argNum++
		}

		// Get total count
		countQuery := strings.Replace(queryBuilder.String(), 
			"SELECT id, company_id, name, quantity, price, markup_percent, markup_amount, selling_price, barcode, barid, category, has_color_options, available_for_customers, images, created_at",
			"SELECT COUNT(*)", 1)
		
		var total int
		db.QueryRow(ctx, countQuery, args...).Scan(&total)

		// Add pagination
		queryBuilder.WriteString(fmt.Sprintf(" ORDER BY id DESC LIMIT $%d OFFSET $%d", argNum, argNum+1))
		args = append(args, limit, offset)

		rows, err := db.Query(ctx, queryBuilder.String(), args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		products := []map[string]interface{}{}
		for rows.Next() {
			var id, companyID, quantity int
			var price, markupPercent, markupAmount, sellingPrice float64
			var name, category string
			var barcode *string
			var barid *int64
			var hasColorOptions, availableForCustomers bool
			var imagesJSON []byte
			var createdAt time.Time

			if err := rows.Scan(&id, &companyID, &name, &quantity, &price, &markupPercent,
				&markupAmount, &sellingPrice, &barcode, &barid, &category, &hasColorOptions,
				&availableForCustomers, &imagesJSON, &createdAt); err != nil {
				continue
			}

			var images []interface{}
			json.Unmarshal(imagesJSON, &images)

			products = append(products, map[string]interface{}{
				"id":                      id,
				"company_id":              companyID,
				"name":                    name,
				"quantity":                quantity,
				"price":                   price,
				"markup_percent":          markupPercent,
				"markup_amount":           markupAmount,
				"selling_price":           sellingPrice,
				"barcode":                 barcode,
				"barid":                   barid,
				"category":                category,
				"has_color_options":       hasColorOptions,
				"available_for_customers": availableForCustomers,
				"images":                  images,
				"created_at":              createdAt,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"products": products,
			"total":    total,
			"hasMore":  offset+limit < total,
		})
	}
}

// CreateProduct creates a new product
func CreateProduct(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			CompanyID       int      `json:"company_id" binding:"required"`
			Name            string   `json:"name" binding:"required"`
			Quantity        int      `json:"quantity"`
			Price           float64  `json:"price"`
			MarkupPercent   float64  `json:"markup_percent"`
			Barcode         *string  `json:"barcode"`
			Barid           *int64   `json:"barid"`
			Category        string   `json:"category"`
			HasColorOptions bool     `json:"has_color_options"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Calculate markup
		markupAmount := input.Price * (input.MarkupPercent / 100)
		sellingPrice := input.Price + markupAmount

		if input.Category == "" {
			input.Category = "Без категории"
		}

		var id int
		err := db.QueryRow(ctx, `
			INSERT INTO products (company_id, name, quantity, price, markup_percent, markup_amount, 
								  selling_price, barcode, barid, category, has_color_options)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			RETURNING id
		`, input.CompanyID, input.Name, input.Quantity, input.Price, input.MarkupPercent,
			markupAmount, sellingPrice, input.Barcode, input.Barid, input.Category, input.HasColorOptions).Scan(&id)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"product": map[string]interface{}{
				"id":            id,
				"name":          input.Name,
				"selling_price": sellingPrice,
			},
		})
	}
}

// UpdateProduct updates an existing product
func UpdateProduct(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
			return
		}

		var input map[string]interface{}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Remove company_id from updates (should not be changed)
		delete(input, "company_id")

		// Build dynamic update query
		setClauses := []string{"updated_at = NOW()"}
		args := []interface{}{}
		argNum := 1

		for key, value := range input {
			if value == nil {
				continue
			}
			setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argNum))
			args = append(args, value)
			argNum++
		}

		// Recalculate markup if price or markup_percent changed
		if price, ok := input["price"].(float64); ok {
			markupPercent := float64(0)
			if mp, ok := input["markup_percent"].(float64); ok {
				markupPercent = mp
			} else {
				// Get current markup_percent
				var currentMarkup float64
				db.QueryRow(ctx, "SELECT markup_percent FROM products WHERE id = $1", id).Scan(&currentMarkup)
				markupPercent = currentMarkup
			}
			markupAmount := price * (markupPercent / 100)
			sellingPrice := price + markupAmount
			
			setClauses = append(setClauses, fmt.Sprintf("markup_amount = $%d", argNum))
			args = append(args, markupAmount)
			argNum++
			
			setClauses = append(setClauses, fmt.Sprintf("selling_price = $%d", argNum))
			args = append(args, sellingPrice)
			argNum++
		}

		query := fmt.Sprintf("UPDATE products SET %s WHERE id = $%d", strings.Join(setClauses, ", "), argNum)
		args = append(args, id)

		_, err = db.Exec(ctx, query, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// DeleteProduct deletes a product
func DeleteProduct(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
			return
		}

		_, err = db.Exec(ctx, "DELETE FROM products WHERE id = $1", id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// DeleteAllProducts deletes all products
func DeleteAllProducts(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		_, err := db.Exec(ctx, "DELETE FROM products")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// BulkImportProducts imports multiple products at once
func BulkImportProducts(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			CompanyID int                      `json:"company_id" binding:"required"`
			Products  []map[string]interface{} `json:"products" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		imported := 0
		for _, p := range input.Products {
			name, _ := p["name"].(string)
			quantity := int(getFloat(p, "quantity"))
			price := getFloat(p, "price")
			markupPercent := getFloat(p, "markup_percent")
			category, _ := p["category"].(string)
			if category == "" {
				category = "Без категории"
			}

			markupAmount := price * (markupPercent / 100)
			sellingPrice := price + markupAmount

			_, err := db.Exec(ctx, `
				INSERT INTO products (company_id, name, quantity, price, markup_percent, 
									  markup_amount, selling_price, category)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			`, input.CompanyID, name, quantity, price, markupPercent, markupAmount, sellingPrice, category)

			if err == nil {
				imported++
			}
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "imported": imported})
	}
}

func getFloat(m map[string]interface{}, key string) float64 {
	if v, ok := m[key].(float64); ok {
		return v
	}
	if v, ok := m[key].(int); ok {
		return float64(v)
	}
	return 0
}

// ToggleProductAvailability toggles product availability for customers
func ToggleProductAvailability(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
			return
		}

		_, err = db.Exec(ctx, `
			UPDATE products SET available_for_customers = NOT available_for_customers, updated_at = NOW()
			WHERE id = $1
		`, id)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// BulkToggleAvailability toggles availability for multiple products
func BulkToggleAvailability(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			ProductIDs   []int `json:"product_ids" binding:"required"`
			SetAvailable bool  `json:"set_available"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Convert slice to PostgreSQL array format
		ids := make([]interface{}, len(input.ProductIDs))
		placeholders := make([]string, len(input.ProductIDs))
		for i, id := range input.ProductIDs {
			ids[i] = id
			placeholders[i] = fmt.Sprintf("$%d", i+2)
		}

		query := fmt.Sprintf(`
			UPDATE products SET available_for_customers = $1, updated_at = NOW()
			WHERE id IN (%s)
		`, strings.Join(placeholders, ","))

		args := append([]interface{}{input.SetAvailable}, ids...)
		_, err := db.Exec(ctx, query, args...)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "updated": len(input.ProductIDs)})
	}
}

// BulkUpdateBarcodes updates barcodes for multiple products
func BulkUpdateBarcodes(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			Updates []struct {
				ID      int    `json:"id"`
				Barcode string `json:"barcode"`
			} `json:"updates" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		updated := 0
		for _, u := range input.Updates {
			_, err := db.Exec(ctx, `
				UPDATE products SET barcode = $1, updated_at = NOW() WHERE id = $2
			`, u.Barcode, u.ID)
			if err == nil {
				updated++
			}
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "updated": updated})
	}
}

// UploadProductImage handles image upload for a product
func UploadProductImage(db *pgxpool.Pool, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		productID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
			return
		}

		file, header, err := c.Request.FormFile("image")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No image file provided"})
			return
		}
		defer file.Close()

		// Generate unique filename
		ext := filepath.Ext(header.Filename)
		filename := fmt.Sprintf("%d_%s%s", productID, uuid.New().String(), ext)
		filepath := filepath.Join(cfg.UploadDir, filename)

		// Create file
		out, err := os.Create(filepath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
			return
		}
		defer out.Close()

		_, err = io.Copy(out, file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
			return
		}

		// Update product images array
		imageURL := fmt.Sprintf("/uploads/%s", filename)
		imageData := map[string]interface{}{
			"url":         imageURL,
			"filepath":    filepath,
			"uploaded_at": time.Now().UTC(),
		}
		imageJSON, _ := json.Marshal(imageData)

		_, err = db.Exec(ctx, `
			UPDATE products 
			SET images = images || $1::jsonb, updated_at = NOW()
			WHERE id = $2
		`, string(imageJSON), productID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "url": imageURL})
	}
}

// GetProductImages returns all images for a product
func GetProductImages(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		productID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
			return
		}

		var imagesJSON []byte
		err = db.QueryRow(ctx, "SELECT images FROM products WHERE id = $1", productID).Scan(&imagesJSON)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}

		var images []interface{}
		json.Unmarshal(imagesJSON, &images)

		c.JSON(http.StatusOK, gin.H{"images": images})
	}
}

// DeleteProductImage deletes an image from a product
func DeleteProductImage(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		productID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
			return
		}

		index, err := strconv.Atoi(c.Param("index"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image index"})
			return
		}

		// Get current images
		var imagesJSON []byte
		err = db.QueryRow(ctx, "SELECT images FROM products WHERE id = $1", productID).Scan(&imagesJSON)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}

		var images []interface{}
		json.Unmarshal(imagesJSON, &images)

		if index < 0 || index >= len(images) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Image index out of range"})
			return
		}

		// Remove image at index
		images = append(images[:index], images[index+1:]...)
		newImagesJSON, _ := json.Marshal(images)

		_, err = db.Exec(ctx, `
			UPDATE products SET images = $1::jsonb, updated_at = NOW() WHERE id = $2
		`, string(newImagesJSON), productID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}
