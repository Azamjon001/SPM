package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
	DBSSLMode   string
	ServerPort  string
	GinMode     string
	JWTSecret   string
	UploadDir   string
	MaxFileSize int64
}

func Load() (*Config, error) {
	// Load .env file if exists
	_ = godotenv.Load()

	cfg := &Config{
		DBHost:      getEnv("DB_HOST", "localhost"),
		DBPort:      getEnv("DB_PORT", "5432"),
		DBUser:      getEnv("DB_USER", "azaton"),
		DBPassword:  getEnv("DB_PASSWORD", "azaton_secret_password"),
		DBName:      getEnv("DB_NAME", "azaton_db"),
		DBSSLMode:   getEnv("DB_SSLMODE", "disable"),
		ServerPort:  getEnv("SERVER_PORT", "8080"),
		GinMode:     getEnv("GIN_MODE", "release"),
		JWTSecret:   getEnv("JWT_SECRET", "change-this-secret"),
		UploadDir:   getEnv("UPLOAD_DIR", "./uploads"),
		MaxFileSize: 10 * 1024 * 1024, // 10MB
	}

	// Create upload directory if not exists
	if err := os.MkdirAll(cfg.UploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	return cfg, nil
}

func (c *Config) DatabaseURL() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode,
	)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
