#!/usr/bin/env bash
# Teste de restauração (RO-07): decifra um backup e restaura num Postgres DESCARTÁVEL
# (contêiner temporário, sem porta exposta). Nunca toca na produção nem no banco de dev.
#
#   ./testar_restauracao.sh                         backup mais recente, chave do PC
#   ./testar_restauracao.sh ARQUIVO.age             um backup específico
#   ./testar_restauracao.sh ARQUIVO.age CHAVE.txt   ex.: a cópia da chave no pendrive (RO-10)
#
# Imprime o registro para colar em docs/operacao.md.
# MANTER=1 deixa o contêiner de pé no fim (para copiar registros apagados por engano;
# acesso: docker exec -it <nome> psql -U pedigree pedigree; apagar: docker rm -f <nome>).
set -euo pipefail
ARQUIVO_DIR="${PEDIGREE_BACKUP_DIR:-$HOME/backups-pedigree/externos}/arquivo"
ARQUIVO="${1:-$(ls -1 "$ARQUIVO_DIR"/pedigree-*.sql.gz.age 2> /dev/null | sort | tail -n 1)}"
CHAVE="${2:-$HOME/.config/pedigree-backup/chave-age.txt}"
NOME="pedigree-restauracao-$$"
IMAGEM="postgres:16.15-alpine3.24"  # mesma versão da produção (SG-02)

[ -n "$ARQUIVO" ] && [ -f "$ARQUIVO" ] || { echo "Backup não encontrado: '$ARQUIVO'"; exit 1; }
[ -f "$CHAVE" ] || { echo "Chave não encontrada: $CHAVE"; exit 1; }

limpar() {
    if [ "${MANTER:-}" = "1" ]; then
        echo "Contêiner mantido: $NOME (apague com: docker rm -f $NOME)" >&2
    else
        docker rm -f "$NOME" > /dev/null 2>&1 || true
    fi
}
trap limpar EXIT

inicio=$(date +%s)
docker run -d --name "$NOME" -e POSTGRES_USER=pedigree -e POSTGRES_PASSWORD=descartavel \
    -e POSTGRES_DB=pedigree -e POSTGRES_HOST_AUTH_METHOD=trust "$IMAGEM" > /dev/null
# A imagem sobe um servidor TEMPORÁRIO para o init (só socket local), desliga e sobe o
# definitivo. Esperar por TCP (127.0.0.1) garante que é o definitivo: com o socket, o
# teste pegava o temporário e a restauração caía com "the database system is shutting down".
pronto=""
for _ in $(seq 90); do
    if docker exec "$NOME" pg_isready -h 127.0.0.1 -U pedigree -d pedigree -q 2> /dev/null \
        && docker exec "$NOME" psql -h 127.0.0.1 -U pedigree -d pedigree -tAc "SELECT 1" > /dev/null 2>&1; then
        pronto=1
        break
    fi
    sleep 1
done
[ -n "$pronto" ] || { echo "O Postgres descartável não ficou pronto em 90 s"; exit 1; }

age -d -i "$CHAVE" "$ARQUIVO" | gunzip | docker exec -i "$NOME" psql -h 127.0.0.1 -q -v ON_ERROR_STOP=1 -U pedigree -d pedigree > /dev/null
fim=$(date +%s)

sql() { docker exec "$NOME" psql -h 127.0.0.1 -U pedigree -d pedigree -tAc "$1"; }
contagens=$(sql "SELECT 'usuarios=' || (SELECT count(*) FROM usuarios) || ' pombos=' || (SELECT count(*) FROM pombos) || ' resultados=' || (SELECT count(*) FROM resultados) || ' proprietarios=' || (SELECT count(*) FROM proprietarios) || ' compartilhamentos=' || (SELECT count(*) FROM compartilhamentos)")
versao=$(sql "SELECT version_num FROM alembic_version")
admins=$(sql "SELECT count(*) FROM usuarios WHERE admin AND ativo")
orfaos=$(sql "SELECT count(*) FROM pombos p WHERE (p.pai_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pombos x WHERE x.id = p.pai_id)) OR (p.mae_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pombos x WHERE x.id = p.mae_id))")

status="OK"
[ "$admins" -ge 1 ] || status="FALHOU (nenhum admin ativo)"
[ "$orfaos" -eq 0 ] || status="FALHOU ($orfaos vínculos de pai/mãe quebrados)"

cat <<TXT
| $(date +%F) | $(basename "$ARQUIVO") | $(basename "$CHAVE") | $((fim - inicio)) s | $contagens | migração $versao | admins ativos: $admins | $status |
TXT
[ "$status" = "OK" ]
