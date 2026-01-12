package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetUsers returns all users
func GetUsers(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		rows, err := db.Query(ctx, `
			SELECT id, first_name, last_name, phone_number, company_id, created_at
			FROM users ORDER BY id DESC
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var users []map[string]interface{}
		for rows.Next() {
			var id int
			var firstName, lastName, phoneNumber string
			var companyID *string
			var createdAt interface{}

			if err := rows.Scan(&id, &firstName, &lastName, &phoneNumber, &companyID, &createdAt); err != nil {
				continue
			}

			users = append(users, map[string]interface{}{
				"id":           id,
				"first_name":   firstName,
				"last_name":    lastName,
				"phone_number": phoneNumber,
				"company_id":   companyID,
				"created_at":   createdAt,
			})
		}

		c.JSON(http.StatusOK, gin.H{"users": users})
	}
}

// CreateUser creates or updates a user
func CreateUser(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			FirstName   string  `json:"first_name" binding:"required"`
			LastName    string  `json:"last_name" binding:"required"`
			PhoneNumber string  `json:"phone_number" binding:"required"`
			CompanyID   *string `json:"company_id"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Upsert user
		var id int
		var firstName, lastName string
		var companyID *string

		err := db.QueryRow(ctx, `
			INSERT INTO users (first_name, last_name, phone_number, company_id)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (phone_number) DO UPDATE SET
				first_name = EXCLUDED.first_name,
				last_name = EXCLUDED.last_name,
				company_id = COALESCE(EXCLUDED.company_id, users.company_id),
				updated_at = NOW()
			RETURNING id, first_name, last_name, company_id
		`, input.FirstName, input.LastName, input.PhoneNumber, input.CompanyID).Scan(&id, &firstName, &lastName, &companyID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"user": map[string]interface{}{
				"id":           id,
				"first_name":   firstName,
				"last_name":    lastName,
				"phone_number": input.PhoneNumber,
				"company_id":   companyID,
			},
		})
	}
}

// GetUserByPhone returns a user by phone number
func GetUserByPhone(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		phone := c.Param("phone")

		var user struct {
			ID          int     `json:"id"`
			FirstName   string  `json:"first_name"`
			LastName    string  `json:"last_name"`
			PhoneNumber string  `json:"phone_number"`
			CompanyID   *string `json:"company_id"`
		}

		err := db.QueryRow(ctx, `
			SELECT id, first_name, last_name, phone_number, company_id
			FROM users WHERE phone_number = $1
		`, phone).Scan(&user.ID, &user.FirstName, &user.LastName, &user.PhoneNumber, &user.CompanyID)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"user": user})
	}
}

// DeleteAllUsers deletes all users
func DeleteAllUsers(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		_, err := db.Exec(ctx, "DELETE FROM users")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}
