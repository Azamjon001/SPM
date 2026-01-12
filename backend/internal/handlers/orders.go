package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetCustomerOrders returns all orders for a company
func GetCustomerOrders(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		companyIDStr := c.Query("company_id")

		if companyIDStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "company_id required"})
			return
		}

		companyID, err := strconv.Atoi(companyIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company_id"})
			return
		}

		rows, err := db.Query(ctx, `
			SELECT id, company_id, user_id, user_name, user_phone, order_code, items,
				   total_amount, markup_profit, status, payment_confirmed,
				   created_date, confirmed_date, order_date
			FROM customer_orders 
			WHERE company_id = $1
			ORDER BY id DESC
			LIMIT 500
		`, companyID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var orders []map[string]interface{}
		for rows.Next() {
			var id int
			var cID, userID *int
			var userName, userPhone, orderCode, status string
			var itemsJSON []byte
			var totalAmount, markupProfit float64
			var paymentConfirmed bool
			var createdDate, orderDate time.Time
			var confirmedDate *time.Time

			if err := rows.Scan(&id, &cID, &userID, &userName, &userPhone, &orderCode,
				&itemsJSON, &totalAmount, &markupProfit, &status, &paymentConfirmed,
				&createdDate, &confirmedDate, &orderDate); err != nil {
				continue
			}

			var items []interface{}
			json.Unmarshal(itemsJSON, &items)

			orders = append(orders, map[string]interface{}{
				"id":                id,
				"company_id":        cID,
				"user_id":           userID,
				"user_name":         userName,
				"user_phone":        userPhone,
				"order_code":        orderCode,
				"items":             items,
				"total_amount":      totalAmount,
				"markup_profit":     markupProfit,
				"status":            status,
				"payment_confirmed": paymentConfirmed,
				"created_date":      createdDate,
				"confirmed_date":    confirmedDate,
				"order_date":        orderDate,
			})
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "orders": orders})
	}
}

// CreateCustomerOrder creates a new customer order
func CreateCustomerOrder(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			UserID      *int                     `json:"user_id"`
			UserName    string                   `json:"user_name"`
			UserPhone   string                   `json:"user_phone"`
			Items       []map[string]interface{} `json:"items" binding:"required"`
			TotalAmount float64                  `json:"total_amount"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Generate order code
		orderCode := fmt.Sprintf("ORD-%s-%s", 
			time.Now().Format("20060102"),
			uuid.New().String()[:8])

		// Calculate markup profit
		var markupProfit float64
		var companyID *int

		for _, item := range input.Items {
			if markup, ok := item["markup_amount"].(float64); ok {
				quantity := 1
				if q, ok := item["quantity"].(float64); ok {
					quantity = int(q)
				}
				markupProfit += markup * float64(quantity)
			}
			if cid, ok := item["company_id"].(float64); ok && companyID == nil {
				cidInt := int(cid)
				companyID = &cidInt
			}
		}

		itemsJSON, _ := json.Marshal(input.Items)

		var orderID int
		err := db.QueryRow(ctx, `
			INSERT INTO customer_orders (company_id, user_id, user_name, user_phone, order_code,
										 items, total_amount, markup_profit, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
			RETURNING id
		`, companyID, input.UserID, input.UserName, input.UserPhone, orderCode,
			itemsJSON, input.TotalAmount, markupProfit).Scan(&orderID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"success":    true,
			"order_id":   orderID,
			"order_code": orderCode,
		})
	}
}

// ConfirmOrderPayment confirms payment for an order
func ConfirmOrderPayment(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		orderID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
			return
		}

		// Get order items to deduct from inventory
		var itemsJSON []byte
		var companyID *int
		err = db.QueryRow(ctx, `
			SELECT items, company_id FROM customer_orders WHERE id = $1
		`, orderID).Scan(&itemsJSON, &companyID)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
			return
		}

		var items []map[string]interface{}
		json.Unmarshal(itemsJSON, &items)

		// Deduct quantities from products
		for _, item := range items {
			productID := int(item["product_id"].(float64))
			quantity := int(item["quantity"].(float64))

			db.Exec(ctx, `
				UPDATE products SET quantity = quantity - $1, updated_at = NOW()
				WHERE id = $2 AND quantity >= $1
			`, quantity, productID)
		}

		// Update order status
		now := time.Now().UTC()
		_, err = db.Exec(ctx, `
			UPDATE customer_orders 
			SET status = 'completed', payment_confirmed = true, 
				confirmed_date = $1, updated_at = NOW()
			WHERE id = $2
		`, now, orderID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// CancelOrder cancels an order
func CancelOrder(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		orderID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
			return
		}

		_, err = db.Exec(ctx, `
			UPDATE customer_orders SET status = 'cancelled', updated_at = NOW()
			WHERE id = $1
		`, orderID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// SearchOrderByCode searches for an order by code
func SearchOrderByCode(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		code := c.Param("code")

		var order struct {
			ID          int     `json:"id"`
			OrderCode   string  `json:"order_code"`
			UserName    string  `json:"user_name"`
			UserPhone   string  `json:"user_phone"`
			TotalAmount float64 `json:"total_amount"`
			Status      string  `json:"status"`
		}

		err := db.QueryRow(ctx, `
			SELECT id, order_code, user_name, user_phone, total_amount, status
			FROM customer_orders WHERE order_code = $1
		`, code).Scan(&order.ID, &order.OrderCode, &order.UserName, 
			&order.UserPhone, &order.TotalAmount, &order.Status)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"order": order})
	}
}

// GetSalesHistory returns sales history for a company
func GetSalesHistory(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		companyIDStr := c.Query("company_id")

		if companyIDStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "company_id required"})
			return
		}

		companyID, _ := strconv.Atoi(companyIDStr)

		rows, err := db.Query(ctx, `
			SELECT id, company_id, items, total_amount, markup_profit, sale_date
			FROM sales_history 
			WHERE company_id = $1
			ORDER BY id DESC
			LIMIT 500
		`, companyID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var sales []map[string]interface{}
		for rows.Next() {
			var id, cID int
			var itemsJSON []byte
			var totalAmount, markupProfit float64
			var saleDate time.Time

			if err := rows.Scan(&id, &cID, &itemsJSON, &totalAmount, &markupProfit, &saleDate); err != nil {
				continue
			}

			var items []interface{}
			json.Unmarshal(itemsJSON, &items)

			sales = append(sales, map[string]interface{}{
				"id":            id,
				"company_id":    cID,
				"items":         items,
				"total_amount":  totalAmount,
				"markup_profit": markupProfit,
				"sale_date":     saleDate,
			})
		}

		c.JSON(http.StatusOK, gin.H{"sales": sales})
	}
}

// CreateSale creates a new sale record
func CreateSale(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			CompanyID   int                      `json:"company_id" binding:"required"`
			Items       []map[string]interface{} `json:"items" binding:"required"`
			TotalAmount float64                  `json:"total_amount"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Calculate markup profit
		var markupProfit float64
		for _, item := range input.Items {
			if markup, ok := item["markup_amount"].(float64); ok {
				quantity := 1
				if q, ok := item["quantity"].(float64); ok {
					quantity = int(q)
				}
				markupProfit += markup * float64(quantity)
			}
		}

		itemsJSON, _ := json.Marshal(input.Items)

		var saleID int
		err := db.QueryRow(ctx, `
			INSERT INTO sales_history (company_id, items, total_amount, markup_profit)
			VALUES ($1, $2, $3, $4)
			RETURNING id
		`, input.CompanyID, itemsJSON, input.TotalAmount, markupProfit).Scan(&saleID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"success": true, "sale_id": saleID})
	}
}
