#!/usr/bin/env bash
# Backup do banco em deploy/backups/, mantendo os últimos 30 dias.
# Agendado no crontab da VPS (ver README).
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p backups
arquivo="backups/pedigree-$(date +%F-%H%M).sql.gz"
docker compose exec -T db pg_dump -U pedigree pedigree | gzip > "$arquivo.tmp"
mv "$arquivo.tmp" "$arquivo"
find backups -name 'pedigree-*.sql.gz' -mtime +30 -delete
echo "Backup salvo em $arquivo"
