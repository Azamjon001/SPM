package models

import (
	"time"
)

// Company represents a business entity
type Company struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Phone       string    `json:"phone"`
	Password    string    `json:"password,omitempty"`
	AccessKey   string    `json:"access_key,omitempty"`
	IsPrivate   bool      `json:"is_private"`
	CompanyID   *string   `json:"company_id,omitempty"` // Private company ID for customers
	FirstName   *string   `json:"first_name,omitempty"`
	LastName    *string   `json:"last_name,omitempty"`
	Rating      float64   `json:"rating"`
	RatingCount int       `json:"rating_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// User represents a customer
type User struct {
	ID          int       `json:"id"`
	FirstName   string    `json:"first_name"`
	LastName    string    `json:"last_name"`
	PhoneNumber string    `json:"phone_number"`
	CompanyID   *string   `json:"company_id,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Product represents an item in inventory
type Product struct {
	ID                    int             `json:"id"`
	CompanyID             int             `json:"company_id"`
	Name                  string          `json:"name"`
	Quantity              int             `json:"quantity"`
	Price                 float64         `json:"price"`
	MarkupPercent         float64         `json:"markup_percent"`
	MarkupAmount          float64         `json:"markup_amount"`
	SellingPrice          float64         `json:"selling_price"`
	Barcode               *string         `json:"barcode,omitempty"`
	Barid                 *int64          `json:"barid,omitempty"`
	Category              string          `json:"category"`
	HasColorOptions       bool            `json:"has_color_options"`
	AvailableForCustomers bool            `json:"available_for_customers"`
	Images                []ProductImage  `json:"images"`
	CreatedAt             time.Time       `json:"created_at"`
	UpdatedAt             time.Time       `json:"updated_at"`
}

// ProductImage represents an image associated with a product
type ProductImage struct {
	URL        string    `json:"url"`
	Filepath   string    `json:"filepath"`
	UploadedAt time.Time `json:"uploaded_at"`
}

// CustomerOrder represents a customer's order
type CustomerOrder struct {
	ID               int         `json:"id"`
	CompanyID        *int        `json:"company_id,omitempty"`
	UserID           *int        `json:"user_id,omitempty"`
	UserName         string      `json:"user_name"`
	UserPhone        string      `json:"user_phone"`
	OrderCode        string      `json:"order_code"`
	Items            []OrderItem `json:"items"`
	TotalAmount      float64     `json:"total_amount"`
	MarkupProfit     float64     `json:"markup_profit"`
	Status           string      `json:"status"`
	PaymentConfirmed bool        `json:"payment_confirmed"`
	CreatedDate      time.Time   `json:"created_date"`
	ConfirmedDate    *time.Time  `json:"confirmed_date,omitempty"`
	OrderDate        time.Time   `json:"order_date"`
	CreatedAt        time.Time   `json:"created_at"`
	UpdatedAt        time.Time   `json:"updated_at"`
}

// OrderItem represents an item in an order
type OrderItem struct {
	ProductID    int     `json:"product_id"`
	Name         string  `json:"name"`
	Quantity     int     `json:"quantity"`
	Price        float64 `json:"price"`
	MarkupAmount float64 `json:"markup_amount,omitempty"`
	SellingPrice float64 `json:"selling_price,omitempty"`
	Color        string  `json:"color,omitempty"`
}

// SalesHistory represents a completed sale
type SalesHistory struct {
	ID           int         `json:"id"`
	CompanyID    int         `json:"company_id"`
	Items        []OrderItem `json:"items"`
	TotalAmount  float64     `json:"total_amount"`
	MarkupProfit float64     `json:"markup_profit"`
	SaleDate     time.Time   `json:"sale_date"`
	CreatedAt    time.Time   `json:"created_at"`
}

// Expenses represents company expenses
type Expenses struct {
	ID                  int       `json:"id"`
	CompanyID           int       `json:"company_id"`
	EmployeeExpenses    float64   `json:"employee_expenses"`
	ElectricityExpenses float64   `json:"electricity_expenses"`
	PurchaseCosts       float64   `json:"purchase_costs"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// CustomExpense represents a custom expense entry
type CustomExpense struct {
	ID          int       `json:"id"`
	CompanyID   int       `json:"company_id"`
	Name        string    `json:"name"`
	Amount      float64   `json:"amount"`
	ExpenseDate string    `json:"expense_date"`
	Description *string   `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// UserCart represents a user's shopping cart
type UserCart struct {
	ID          int                    `json:"id"`
	PhoneNumber string                 `json:"phone_number"`
	CartData    map[string]interface{} `json:"cart_data"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// UserReceipt represents a user's receipt
type UserReceipt struct {
	ID          int         `json:"id"`
	PhoneNumber string      `json:"phone_number"`
	OrderCode   string      `json:"order_code"`
	Total       float64     `json:"total"`
	ItemsCount  int         `json:"items_count"`
	Items       []OrderItem `json:"items"`
	CreatedAt   time.Time   `json:"created_at"`
}

// UserLikes represents a user's liked products
type UserLikes struct {
	ID              int       `json:"id"`
	PhoneNumber     string    `json:"phone_number"`
	LikedProductIds []int     `json:"liked_product_ids"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Advertisement represents a company advertisement
type Advertisement struct {
	ID              string     `json:"id"`
	CompanyID       int        `json:"company_id"`
	CompanyName     string     `json:"company_name"`
	SMMPostID       string     `json:"smm_post_id"`
	ImageURL        string     `json:"image_url"`
	Caption         string     `json:"caption"`
	LinkURL         *string    `json:"link_url,omitempty"`
	Status          string     `json:"status"`
	RejectionReason *string    `json:"rejection_reason,omitempty"`
	ReviewedBy      *string    `json:"reviewed_by,omitempty"`
	SubmittedAt     time.Time  `json:"submitted_at"`
	ReviewedAt      *time.Time `json:"reviewed_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

// CompanyRating represents a rating given to a company
type CompanyRating struct {
	ID         int       `json:"id"`
	CompanyID  int       `json:"company_id"`
	CustomerID string    `json:"customer_id"`
	Rating     int       `json:"rating"`
	CreatedAt  time.Time `json:"created_at"`
}
