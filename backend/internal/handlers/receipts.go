package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetUserReceipts returns user's receipts
func GetUserReceipts(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		phone := c.Query("phone_number")

		if phone == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "phone_number required"})
			return
		}

		rows, err := db.Query(ctx, `
			SELECT id, phone_number, company_id, company_name, items, 
				   total_amount, receipt_date
			FROM user_receipts 
			WHERE phone_number = $1
			ORDER BY id DESC
			LIMIT 100
		`, phone)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var receipts []map[string]interface{}
		for rows.Next() {
			var id int
			var phoneNumber string
			var companyID *int
			var companyName *string
			var itemsJSON []byte
			var totalAmount float64
			var receiptDate time.Time

			if err := rows.Scan(&id, &phoneNumber, &companyID, &companyName, 
				&itemsJSON, &totalAmount, &receiptDate); err != nil {
				continue
			}

			var items []interface{}
			json.Unmarshal(itemsJSON, &items)

			receipts = append(receipts, map[string]interface{}{
				"id":           id,
				"phone_number": phoneNumber,
				"company_id":   companyID,
				"company_name": companyName,
				"items":        items,
				"total_amount": totalAmount,
				"receipt_date": receiptDate,
			})
		}

		c.JSON(http.StatusOK, gin.H{"receipts": receipts})
	}
}

// SaveUserReceipt saves a new receipt
func SaveUserReceipt(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			PhoneNumber string        `json:"phone_number" binding:"required"`
			CompanyID   *int          `json:"company_id"`
			CompanyName *string       `json:"company_name"`
			Items       []interface{} `json:"items" binding:"required"`
			TotalAmount float64       `json:"total_amount"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		itemsJSON, _ := json.Marshal(input.Items)

		var receiptID int
		err := db.QueryRow(ctx, `
			INSERT INTO user_receipts (phone_number, company_id, company_name, items, total_amount)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id
		`, input.PhoneNumber, input.CompanyID, input.CompanyName, 
			itemsJSON, input.TotalAmount).Scan(&receiptID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"success": true, "receipt_id": receiptID})
	}
}

// DeleteUserReceipt deletes a receipt
func DeleteUserReceipt(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		_, err = db.Exec(ctx, `DELETE FROM user_receipts WHERE id = $1`, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// GetUserLikes returns user's liked products
func GetUserLikes(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		phone := c.Query("phone_number")

		if phone == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "phone_number required"})
			return
		}

		var likesJSON []byte
		err := db.QueryRow(ctx, `
			SELECT liked_products FROM user_likes WHERE phone_number = $1
		`, phone).Scan(&likesJSON)

		if err != nil {
			// Return empty likes if not found
			c.JSON(http.StatusOK, gin.H{"likes": []interface{}{}})
			return
		}

		var likes []interface{}
		json.Unmarshal(likesJSON, &likes)

		c.JSON(http.StatusOK, gin.H{"likes": likes})
	}
}

// SaveUserLikes saves user's liked products
func SaveUserLikes(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			PhoneNumber   string        `json:"phone_number" binding:"required"`
			LikedProducts []interface{} `json:"liked_products"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		likesJSON, _ := json.Marshal(input.LikedProducts)

		_, err := db.Exec(ctx, `
			INSERT INTO user_likes (phone_number, liked_products)
			VALUES ($1, $2)
			ON CONFLICT (phone_number) DO UPDATE SET
				liked_products = EXCLUDED.liked_products,
				updated_at = NOW()
		`, input.PhoneNumber, likesJSON)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// AddProductToLikes adds a product to user's likes
func AddProductToLikes(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			PhoneNumber string      `json:"phone_number" binding:"required"`
			Product     interface{} `json:"product" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Get current likes
		var likesJSON []byte
		err := db.QueryRow(ctx, `
			SELECT liked_products FROM user_likes WHERE phone_number = $1
		`, input.PhoneNumber).Scan(&likesJSON)

		var likes []interface{}
		if err == nil {
			json.Unmarshal(likesJSON, &likes)
		}

		// Add new product
		likes = append(likes, input.Product)
		newLikesJSON, _ := json.Marshal(likes)

		_, err = db.Exec(ctx, `
			INSERT INTO user_likes (phone_number, liked_products)
			VALUES ($1, $2)
			ON CONFLICT (phone_number) DO UPDATE SET
				liked_products = EXCLUDED.liked_products,
				updated_at = NOW()
		`, input.PhoneNumber, newLikesJSON)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// RemoveProductFromLikes removes a product from user's likes
func RemoveProductFromLikes(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		phone := c.Query("phone_number")
		productID := c.Param("product_id")

		if phone == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "phone_number required"})
			return
		}

		// Get current likes
		var likesJSON []byte
		err := db.QueryRow(ctx, `
			SELECT liked_products FROM user_likes WHERE phone_number = $1
		`, phone).Scan(&likesJSON)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "No likes found"})
			return
		}

		var likes []map[string]interface{}
		json.Unmarshal(likesJSON, &likes)

		// Filter out the product
		var newLikes []map[string]interface{}
		for _, like := range likes {
			if id, ok := like["id"].(float64); ok {
				if strconv.Itoa(int(id)) != productID {
					newLikes = append(newLikes, like)
				}
			}
		}

		newLikesJSON, _ := json.Marshal(newLikes)

		_, err = db.Exec(ctx, `
			UPDATE user_likes SET liked_products = $1, updated_at = NOW()
			WHERE phone_number = $2
		`, newLikesJSON, phone)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}
