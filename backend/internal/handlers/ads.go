package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetAdvertisements returns all advertisements
func GetAdvertisements(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		status := c.Query("status")

		var query string
		var args []interface{}

		if status != "" {
			query = `
				SELECT id, company_id, company_name, title, description, 
					   image_url, link_url, status, start_date, end_date, created_at
				FROM advertisements 
				WHERE status = $1
				ORDER BY id DESC
			`
			args = append(args, status)
		} else {
			query = `
				SELECT id, company_id, company_name, title, description, 
					   image_url, link_url, status, start_date, end_date, created_at
				FROM advertisements 
				ORDER BY id DESC
			`
		}

		rows, err := db.Query(ctx, query, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var ads []map[string]interface{}
		for rows.Next() {
			var id int
			var companyID *int
			var companyName, title, description, status string
			var imageURL, linkURL *string
			var startDate, endDate *time.Time
			var createdAt time.Time

			if err := rows.Scan(&id, &companyID, &companyName, &title, &description,
				&imageURL, &linkURL, &status, &startDate, &endDate, &createdAt); err != nil {
				continue
			}

			ads = append(ads, map[string]interface{}{
				"id":           id,
				"company_id":   companyID,
				"company_name": companyName,
				"title":        title,
				"description":  description,
				"image_url":    imageURL,
				"link_url":     linkURL,
				"status":       status,
				"start_date":   startDate,
				"end_date":     endDate,
				"created_at":   createdAt,
			})
		}

		c.JSON(http.StatusOK, gin.H{"advertisements": ads})
	}
}

// GetApprovedAdvertisements returns only approved ads
func GetApprovedAdvertisements(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		rows, err := db.Query(ctx, `
			SELECT id, company_id, company_name, title, description, 
				   image_url, link_url, start_date, end_date
			FROM advertisements 
			WHERE status = 'approved'
			AND (end_date IS NULL OR end_date > NOW())
			ORDER BY id DESC
		`)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var ads []map[string]interface{}
		for rows.Next() {
			var id int
			var companyID *int
			var companyName, title, description string
			var imageURL, linkURL *string
			var startDate, endDate *time.Time

			if err := rows.Scan(&id, &companyID, &companyName, &title, &description,
				&imageURL, &linkURL, &startDate, &endDate); err != nil {
				continue
			}

			ads = append(ads, map[string]interface{}{
				"id":           id,
				"company_id":   companyID,
				"company_name": companyName,
				"title":        title,
				"description":  description,
				"image_url":    imageURL,
				"link_url":     linkURL,
				"start_date":   startDate,
				"end_date":     endDate,
			})
		}

		c.JSON(http.StatusOK, gin.H{"advertisements": ads})
	}
}

// CreateAdvertisement creates a new advertisement
func CreateAdvertisement(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		var input struct {
			CompanyID   *int       `json:"company_id"`
			CompanyName string     `json:"company_name" binding:"required"`
			Title       string     `json:"title" binding:"required"`
			Description string     `json:"description"`
			ImageURL    *string    `json:"image_url"`
			LinkURL     *string    `json:"link_url"`
			StartDate   *time.Time `json:"start_date"`
			EndDate     *time.Time `json:"end_date"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var adID int
		err := db.QueryRow(ctx, `
			INSERT INTO advertisements (company_id, company_name, title, description, 
										image_url, link_url, start_date, end_date, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
			RETURNING id
		`, input.CompanyID, input.CompanyName, input.Title, input.Description,
			input.ImageURL, input.LinkURL, input.StartDate, input.EndDate).Scan(&adID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"success": true, "id": adID})
	}
}

// UpdateAdvertisement updates an advertisement
func UpdateAdvertisement(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var input struct {
			Title       string     `json:"title"`
			Description string     `json:"description"`
			ImageURL    *string    `json:"image_url"`
			LinkURL     *string    `json:"link_url"`
			StartDate   *time.Time `json:"start_date"`
			EndDate     *time.Time `json:"end_date"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		_, err = db.Exec(ctx, `
			UPDATE advertisements 
			SET title = $1, description = $2, image_url = $3, link_url = $4, 
				start_date = $5, end_date = $6, updated_at = NOW()
			WHERE id = $7
		`, input.Title, input.Description, input.ImageURL, input.LinkURL,
			input.StartDate, input.EndDate, id)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// ApproveAdvertisement approves an advertisement
func ApproveAdvertisement(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		_, err = db.Exec(ctx, `
			UPDATE advertisements SET status = 'approved', updated_at = NOW() WHERE id = $1
		`, id)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// RejectAdvertisement rejects an advertisement
func RejectAdvertisement(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		_, err = db.Exec(ctx, `
			UPDATE advertisements SET status = 'rejected', updated_at = NOW() WHERE id = $1
		`, id)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// DeleteAdvertisement deletes an advertisement
func DeleteAdvertisement(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		_, err = db.Exec(ctx, `DELETE FROM advertisements WHERE id = $1`, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// GetCompanyAdvertisements returns ads for a specific company
func GetCompanyAdvertisements(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		companyID, err := strconv.Atoi(c.Param("company_id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company_id"})
			return
		}

		rows, err := db.Query(ctx, `
			SELECT id, company_id, company_name, title, description, 
				   image_url, link_url, status, start_date, end_date, created_at
			FROM advertisements 
			WHERE company_id = $1
			ORDER BY id DESC
		`, companyID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var ads []map[string]interface{}
		for rows.Next() {
			var id int
			var cID *int
			var companyName, title, description, status string
			var imageURL, linkURL *string
			var startDate, endDate *time.Time
			var createdAt time.Time

			if err := rows.Scan(&id, &cID, &companyName, &title, &description,
				&imageURL, &linkURL, &status, &startDate, &endDate, &createdAt); err != nil {
				continue
			}

			ads = append(ads, map[string]interface{}{
				"id":           id,
				"company_id":   cID,
				"company_name": companyName,
				"title":        title,
				"description":  description,
				"image_url":    imageURL,
				"link_url":     linkURL,
				"status":       status,
				"start_date":   startDate,
				"end_date":     endDate,
				"created_at":   createdAt,
			})
		}

		c.JSON(http.StatusOK, gin.H{"advertisements": ads})
	}
}
