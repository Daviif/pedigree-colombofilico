#!/usr/bin/env bash
# Verificação depois do deploy (SG-03, SG-04): cabeçalhos de segurança, cache e API respondendo.
# Uso: ./verificar.sh https://ppombo.duckdns.org      (sai com código 1 se algo falhar)
set -u
URL="${1:?uso: ./verificar.sh https://SEU-DOMINIO}"
URL="${URL%/}"
falhas=0

checar() { # descrição, texto que precisa aparecer (regex, sem diferenciar maiúsculas), cabeçalhos
	if grep -qiE "$2" <<<"$3"; then echo "ok    $1"; else echo "FALHA $1"; falhas=$((falhas + 1)); fi
}
ausente() { # descrição, regex que NÃO pode aparecer, cabeçalhos
	if grep -qiE "$2" <<<"$3"; then echo "FALHA $1"; falhas=$((falhas + 1)); else echo "ok    $1"; fi
}

pagina=$(curl -sS -m 15 -D - -o /dev/null "$URL/") || { echo "FALHA site não respondeu"; exit 1; }
checar "página responde 200" '^HTTP/[0-9.]+ 200' "$pagina"
checar "HSTS de 1 ano" '^strict-transport-security: max-age=31536000' "$pagina"
checar "CSP só do próprio site" "^content-security-policy: default-src 'self'; script-src 'self'" "$pagina"
checar "CSP proíbe exibir dentro de outra página" "frame-ancestors 'none'" "$pagina"
checar "nosniff" '^x-content-type-options: nosniff' "$pagina"
checar "X-Frame-Options DENY" '^x-frame-options: deny' "$pagina"
checar "Referrer-Policy" '^referrer-policy: strict-origin-when-cross-origin' "$pagina"
checar "Permissions-Policy" '^permissions-policy: camera=\(\)' "$pagina"
checar "COOP same-origin" '^cross-origin-opener-policy: same-origin' "$pagina"
checar "index.html sem cache" '^cache-control: no-cache' "$pagina"
ausente "sem cabeçalho Server" '^server:' "$pagina"

asset=$(curl -sS -m 15 "$URL/" | grep -oE '/assets/[^"]+\.js' | head -1)
if [ -n "$asset" ]; then
	arquivo=$(curl -sS -m 15 -D - -o /dev/null "$URL$asset")
	checar "assets com cache de 1 ano" '^cache-control: public, max-age=31536000, immutable' "$arquivo"
else
	echo "FALHA não achei /assets/*.js no index.html"; falhas=$((falhas + 1))
fi

api=$(curl -sS -m 15 -D - -o /dev/null "$URL/api/auth/me")
checar "API responde (401 sem login)" '^HTTP/[0-9.]+ 401' "$api"
checar "API com os cabeçalhos" "^content-security-policy: default-src 'self'" "$api"
ausente "API sem cabeçalho Server" '^server:' "$api"

saude=$(curl -sS -m 15 "$URL/api/saude")
checar "saúde com banco (RO-11, o que o monitor olha)" '"status": ?"ok"' "$saude"

echo
if [ "$falhas" -eq 0 ]; then echo "Tudo certo."; else echo "$falhas verificação(ões) falharam."; exit 1; fi
