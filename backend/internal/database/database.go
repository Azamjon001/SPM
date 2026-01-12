package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"azaton-backend/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewConnection(cfg *config.Config) (*pgxpool.Pool, error) {
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL())
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("✅ Connected to PostgreSQL database")
	return pool, nil
}

func RunMigrations(pool *pgxpool.Pool) error {
	ctx := context.Background()

	// Read migration files - try multiple possible paths
	migrationPaths := []string{
		"migrations",                // Docker container
		"../database/migrations",    // From backend folder
		"../../database/migrations", // From cmd/server folder
		"/app/migrations",           // Docker absolute path
	}

	var migrationsDir string
	var files []os.DirEntry
	var err error

	for _, path := range migrationPaths {
		files, err = os.ReadDir(path)
		if err == nil {
			migrationsDir = path
			log.Printf("📁 Found migrations directory: %s", path)
			break
		}
	}

	if migrationsDir == "" {
		log.Printf("⚠️ No migrations directory found in any of the expected paths, skipping migrations")
		return nil
	}

	for _, file := range files {
		if filepath.Ext(file.Name()) != ".sql" {
			continue
		}

		sqlPath := filepath.Join(migrationsDir, file.Name())
		sqlBytes, err := os.ReadFile(sqlPath)
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", file.Name(), err)
		}

		log.Printf("📜 Running migration: %s", file.Name())
		if _, err := pool.Exec(ctx, string(sqlBytes)); err != nil {
			return fmt.Errorf("failed to execute migration %s: %w", file.Name(), err)
		}
	}

	log.Println("✅ Migrations completed successfully")
	return nil
}
