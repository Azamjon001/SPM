#!/bin/bash
# ============================================
# AZATON DATABASE BACKUP SCRIPT
# ============================================

# Konfiguratsiya
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-azaton}"
DB_USER="${DB_USER:-azaton}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"

# Backup papkasini yaratish
mkdir -p "$BACKUP_DIR"

# Backup olish
echo "🔄 Backup boshlanmoqda..."
echo "   Database: $DB_NAME"
echo "   Host: $DB_HOST:$DB_PORT"

PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-privileges \
    | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup muvaffaqiyatli yaratildi!"
    echo "   Fayl: $BACKUP_FILE"
    echo "   Hajm: $(du -h "$BACKUP_FILE" | cut -f1)"
    
    # Eski backup'larni o'chirish (7 kundan eski)
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
    echo "🧹 7 kundan eski backup'lar o'chirildi"
else
    echo "❌ Backup xatosi!"
    exit 1
fi
