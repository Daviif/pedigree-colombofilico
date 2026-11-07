#!/usr/bin/env bash
# Backup diário do banco (RO-02, RO-03 em docs/requisitos.md). Agendado no crontab da VPS.
#
# - backups/pedigree-AAAA-MM-DD-HHMM.sql.gz          cópia local, sem cifra (30 dias); hora em UTC
# - backups/externo/pedigree-....sql.gz.age          cópia cifrada para o PC puxar (30 dias),
#                                                    só se existir backup.pub (chave pública age)
#
# Falha alto: código de saída 1 e uma linha "ERRO ..." no log quando o dump falha, vem
# vazio/pequeno demais ou o gzip não confere.
#
# PEDIGREE_DUMP_CMD troca o comando do dump (usado nos testes).
set -euo pipefail
cd "$(dirname "$0")"

DUMP_CMD="${PEDIGREE_DUMP_CMD:-docker compose exec -T db pg_dump -U pedigree pedigree}"
TAMANHO_MINIMO=1024  # bytes do .gz; um banco vazio com o esquema já passa de 2 KB
RETENCAO_DIAS=30

erro() {
    echo "$(date '+%F %T') ERRO backup: $*" >&2
    rm -f "${arquivo:-}.tmp" "${cifrado:-}.tmp"
    exit 1
}

mkdir -p backups/externo
chmod 700 backups
# Horário do nome sempre em UTC (o PC compara em UTC para o aviso de atraso, RO-06).
nome="pedigree-$(date -u +%F-%H%M).sql.gz"
arquivo="backups/$nome"

# pipefail: se o pg_dump falhar, o pipeline inteiro falha
if ! $DUMP_CMD | gzip > "$arquivo.tmp"; then
    erro "o pg_dump falhou"
fi
gzip -t "$arquivo.tmp" || erro "o arquivo gerado não é um gzip válido"
tamanho=$(stat -c %s "$arquivo.tmp")
[ "$tamanho" -ge "$TAMANHO_MINIMO" ] || erro "o dump ficou com $tamanho bytes (mínimo $TAMANHO_MINIMO): banco vazio ou dump incompleto"
gunzip -c "$arquivo.tmp" | tail -n 5 | grep -q "PostgreSQL database dump complete" \
    || erro "o dump não termina com 'PostgreSQL database dump complete'"
mv "$arquivo.tmp" "$arquivo"

if [ -f backup.pub ]; then
    command -v age > /dev/null || erro "age não está instalado (sudo apt install age)"
    cifrado="backups/externo/$nome.age"
    age -R backup.pub -o "$cifrado.tmp" "$arquivo" || erro "a cifra com age falhou"
    mv "$cifrado.tmp" "$cifrado"
fi

find backups -maxdepth 1 -name 'pedigree-*.sql.gz' -mtime +$RETENCAO_DIAS -delete
find backups/externo -name 'pedigree-*.sql.gz.age' -mtime +$RETENCAO_DIAS -delete
echo "$(date '+%F %T') Backup salvo em $arquivo ($tamanho bytes)${cifrado:+; cifrado em $cifrado}"
