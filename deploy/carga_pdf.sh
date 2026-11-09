#!/usr/bin/env bash
# Teste de carga do certificado (Fase 9): o PDF é o pico de CPU e memória da VPS (954 MiB de RAM).
# Gera o PDF de 6 gerações N vezes em sequência e depois 3 ao mesmo tempo, medindo o tempo de
# cada um, a memória do backend e a memória livre da máquina (a cada segundo).
#
# Rodar NA VPS, num horário calmo:   cd ~/pedigree/deploy && ./carga_pdf.sh https://ppombo.duckdns.org 15 10
#   (15 = id de um pombo com árvore funda; 10 = repetições em sequência)
# Pede o login e a senha (não ficam gravados). Só lê: não altera nenhum dado.
set -euo pipefail
cd "$(dirname "$0")"
URL="${1:?uso: ./carga_pdf.sh URL ID_DO_POMBO [REPETICOES]}"; URL="${URL%/}"
POMBO="${2:?informe o id de um pombo com muitos ancestrais}"
N="${3:-10}"
[[ "$POMBO" =~ ^[0-9]+$ ]] || { echo "O 2º argumento é o NÚMERO do pombo (ex.: 154), não '$POMBO'."; exit 1; }
[[ "$N" =~ ^[0-9]+$ ]] || { echo "O 3º argumento é o número de repetições (ex.: 10)."; exit 1; }

read -rp "Login: " LOGIN
read -rsp "Senha: " SENHA; echo
TMP="$(mktemp -d)"; COOKIE="$TMP/cookie"; AMOSTRAS="$TMP/amostras"
trap 'kill "${AMOSTRADOR:-0}" 2>/dev/null || true; curl -s -o /dev/null -b "$COOKIE" -X POST "$URL/api/auth/logout" || true; rm -rf "$TMP"' EXIT

CORPO="$(LOGIN="$LOGIN" SENHA="$SENHA" python3 -c 'import json,os; print(json.dumps({"login": os.environ["LOGIN"], "senha": os.environ["SENHA"]}))')"
unset SENHA
codigo=$(curl -sS -o /dev/null -w '%{http_code}' -c "$COOKIE" -H 'Content-Type: application/json' -d "$CORPO" "$URL/api/auth/login")
[ "$codigo" = "200" ] || { echo "Login falhou (HTTP $codigo)."; exit 1; }

BACKEND="$(docker compose ps -q backend)"
( while true; do
    echo "$(docker stats --no-stream --format '{{.MemUsage}}' "$BACKEND" | cut -d/ -f1) $(free -m | awk '/^Mem:/{print $7}')"
    sleep 1
  done ) > "$AMOSTRAS" &
AMOSTRADOR=$!

pdf() { curl -sS -o /dev/null -b "$COOKIE" -w '%{http_code} %{time_total}\n' "$URL/api/pombos/$POMBO/certificado?geracoes=6"; }

# Um PDF antes de medir: se não for 200 (pombo de outro plantel, id errado…), para aqui.
primeiro="$(pdf)"
[ "${primeiro%% *}" = "200" ] || { echo "O certificado do pombo $POMBO respondeu HTTP ${primeiro%% *}: confira o id e se ele é visível para este login."; exit 1; }

echo "== $N em sequência"
seq_res="$(for _ in $(seq 1 "$N"); do pdf; done)"
echo "$seq_res" | awk '{c[$1]++; t+=$2; if($2>m)m=$2; if(min==""||$2<min)min=$2} END{for(k in c)printf "  HTTP %s: %d\n",k,c[k]; printf "  tempo: mín %.1fs · média %.1fs · máx %.1fs\n",min,t/NR,m}'

echo "== 3 ao mesmo tempo"
par_res="$( (pdf & pdf & pdf & wait) )"
echo "$par_res" | awk '{c[$1]++; if($2>m)m=$2} END{for(k in c)printf "  HTTP %s: %d\n",k,c[k]; printf "  o mais lento: %.1fs\n",m}'

sleep 2; kill "$AMOSTRADOR" 2>/dev/null || true
echo "== memória durante o teste"
awk '{
  v=$1; u=v; gsub(/[0-9.]/,"",u); gsub(/[^0-9.]/,"",v);
  mib = (u ~ /GiB/) ? v*1024 : (u ~ /KiB/ ? v/1024 : v);
  if (mib>pico) pico=mib; if (min==""||$2<min) min=$2
} END { printf "  backend: pico de %.0f MiB\n  máquina: mínimo de %s MiB disponíveis\n", pico, min }' "$AMOSTRAS"
echo "  agora: $(docker compose ps --format '{{.Service}} {{.Status}}' | tr '\n' ' ')"
