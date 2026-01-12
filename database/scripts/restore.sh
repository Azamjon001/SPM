#!/bin/bash
# ============================================
# AZATON DATABASE RESTORE SCRIPT
# ============================================

# Foydalanish: ./restore.sh backup_file.sql.gz

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Backup fayl ko'rsatilmagan!"
    echo "   Foydalanish: ./restore.sh backup_file.sql.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Fayl topilmadi: $BACKUP_FILE"
    exit 1
fi

# Konfiguratsiya
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-azaton}"
DB_USER="${DB_USER:-azaton}"

echo "⚠️  OGOHLANTIRISH!"
echo "   Bu barcha mavjud ma'lumotlarni o'chiradi va backup'dan tiklaydi."
echo "   Database: $DB_NAME"
echo "   Backup: $BACKUP_FILE"
read -p "   Davom etishni xohlaysizmi? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Bekor qilindi."
    exit 0
fi

echo "🔄 Restore boshlanmoqda..."

# Restore qilish
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Restore muvaffaqiyatli yakunlandi!"
else
    echo "❌ Restore xatosi!"
    exit 1
fi
