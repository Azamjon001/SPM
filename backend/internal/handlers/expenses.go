package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetExpenses returns expenses for a company
func GetExpenses(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		companyIDStr := c.Query("company_id")

		if companyIDStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "company_id required"})
			return
		}

		companyID, _ := strconv.Atoi(companyIDStr)

		var expenses struct {
			ID                 int              `json:"id"`
			CompanyID          int              `json:"company_id"`
			MonthlyRent        float64          `json:"monthly_rent"`
			UtilityCosts       float64          `json:"utility_costs"`
			WorkerSalaries     float64          `json:"worker_salaries"`
			OtherExpenses      float64          `json:"other_expenses"`
			CustomExpenseTypes []map[string]any `json:"custom_expense_types"`
		}

		err := db.QueryRow(ctx, `
			SELECT id, company_id, monthly_rent, utility_costs, worker_salaries, other_expenses
			FROM expenses WHERE company_id = $1
		`, companyID).Scan(&expenses.ID, &expenses.CompanyID, 
			&expenses.MonthlyRent, &expenses.UtilityCosts, 
			&expenses.WorkerSalaries, &expenses.OtherExpenses)

		if err != nil {
			// Return empty expenses if not found
			expenses.CompanyID = companyID
		}

		// Get custom expense types
		rows, _ := db.Query(ctx, `
			SELECT id, name, amount FROM company_custom_expenses WHERE company_id = $1
		`, companyID)
		defer rows.Close()

		for rows.Next() {
			var id int
			var name string
			var amount float64
			if rows.Scan(&id, &name, &amount) == nil {
				expenses.CustomExpenseTypes = append(expenses.CustomExpenseTypes, map[string]any{
					"id":     id,
					"name":   name,
					"amount": amount,
				})
			}
		}

		c.JSON(http.StatusOK, gin.H{"expenses": expenses})
	}
}

// UpdateExpenses updates expenses for a company (upsert)
func UpdateExpenses(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			CompanyID      int     `json:"company_id" binding:"required"`
			MonthlyRent    float64 `json:"monthly_rent"`
			UtilityCosts   float64 `json:"utility_costs"`
			WorkerSalaries float64 `json:"worker_salaries"`
			OtherExpenses  float64 `json:"other_expenses"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		_, err := db.Exec(ctx, `
			INSERT INTO expenses (company_id, monthly_rent, utility_costs, worker_salaries, other_expenses)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (company_id) DO UPDATE SET
				monthly_rent = EXCLUDED.monthly_rent,
				utility_costs = EXCLUDED.utility_costs,
				worker_salaries = EXCLUDED.worker_salaries,
				other_expenses = EXCLUDED.other_expenses,
				updated_at = NOW()
		`, input.CompanyID, input.MonthlyRent, input.UtilityCosts, 
			input.WorkerSalaries, input.OtherExpenses)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// AddCustomExpenseType adds a custom expense type
func AddCustomExpenseType(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			CompanyID int     `json:"company_id" binding:"required"`
			Name      string  `json:"name" binding:"required"`
			Amount    float64 `json:"amount"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var id int
		err := db.QueryRow(ctx, `
			INSERT INTO company_custom_expenses (company_id, name, amount)
			VALUES ($1, $2, $3)
			RETURNING id
		`, input.CompanyID, input.Name, input.Amount).Scan(&id)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"success": true, "id": id})
	}
}

// UpdateCustomExpenseType updates a custom expense type
func UpdateCustomExpenseType(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var input struct {
			Name   string  `json:"name"`
			Amount float64 `json:"amount"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		_, err = db.Exec(ctx, `
			UPDATE company_custom_expenses SET name = $1, amount = $2 WHERE id = $3
		`, input.Name, input.Amount, id)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// DeleteCustomExpenseType deletes a custom expense type
func DeleteCustomExpenseType(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		_, err = db.Exec(ctx, `DELETE FROM company_custom_expenses WHERE id = $1`, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// GetUserCart returns user's cart
func GetUserCart(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		phone := c.Query("phone_number")

		if phone == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "phone_number required"})
			return
		}

		var cartJSON []byte
		err := db.QueryRow(ctx, `
			SELECT cart_items FROM user_cart WHERE phone_number = $1
		`, phone).Scan(&cartJSON)

		if err != nil {
			// Return empty cart if not found
			c.JSON(http.StatusOK, gin.H{"cart": []interface{}{}})
			return
		}

		var cart []interface{}
		json.Unmarshal(cartJSON, &cart)

		c.JSON(http.StatusOK, gin.H{"cart": cart})
	}
}

// SaveUserCart saves user's cart
func SaveUserCart(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			PhoneNumber string        `json:"phone_number" binding:"required"`
			CartItems   []interface{} `json:"cart_items"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		cartJSON, _ := json.Marshal(input.CartItems)

		_, err := db.Exec(ctx, `
			INSERT INTO user_cart (phone_number, cart_items)
			VALUES ($1, $2)
			ON CONFLICT (phone_number) DO UPDATE SET
				cart_items = EXCLUDED.cart_items,
				updated_at = NOW()
		`, input.PhoneNumber, cartJSON)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// ClearUserCart clears user's cart
func ClearUserCart(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		phone := c.Param("phone")

		_, err := db.Exec(ctx, `
			UPDATE user_cart SET cart_items = '[]', updated_at = NOW()
			WHERE phone_number = $1
		`, phone)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}
