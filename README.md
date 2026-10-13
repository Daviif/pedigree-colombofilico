# Sistema de Pedigree Colombófilo

Sistema para cadastro de pombos-correio, vínculo de pai/mãe, geração automática da árvore genealógica (com sinalização de consanguinidade), histórico de resultados/campeonatos e emissão de certificado de pedigree em PDF.

Stack: React + Vite (frontend) · FastAPI (backend) · PostgreSQL (via Docker).

## Como rodar localmente

### 1. Banco de dados (PostgreSQL via Docker)

```bash
cd backend
docker compose up -d
```

Sobe o Postgres na porta **5436** (ajustada para não conflitar com outros bancos já rodando nesta máquina; se não houver conflito no seu ambiente, pode trocar a porta em `backend/docker-compose.yml` e em `backend/.env`).

### 2. Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8010
```

API disponível em `http://localhost:8010` (porta 8010 escolhida porque a 8000 já estava em uso neste ambiente; pode trocar livremente, só ajuste o proxy no `frontend/vite.config.ts`).

Rodar os testes automatizados: `python -m pytest` (cria automaticamente um banco `pedigree_test` separado).

### 3. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Acesse a URL impressa pelo Vite (por padrão `http://localhost:5173`, ou a próxima porta livre). As chamadas para `/api/*` são redirecionadas automaticamente para o backend.

## Deploy (VPS Oracle Cloud Free Tier)

Produção roda tudo em Docker numa VPS só: Postgres + backend (FastAPI/WeasyPrint) + Caddy (serve o front-end, faz proxy de `/api`, emite HTTPS automático via Let's Encrypt e exige usuário/senha em todo o site). Arquivos em [`deploy/`](deploy). Funciona tanto na instância ARM (Ampere A1) quanto na AMD micro.

### 1. Preparar a VPS (uma vez)

1. Crie a instância (Ubuntu 22.04/24.04) e anote o IP público.
2. Na Oracle Cloud, em **Networking → VCN → Security List**, adicione regras de entrada (ingress) TCP para as portas **80** e **443** (origem `0.0.0.0/0`).
3. As imagens Ubuntu da Oracle também bloqueiam essas portas no firewall interno. Na VPS:
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```
4. Instale Docker: `curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER` (saia e entre de novo na sessão SSH).
5. Domínio: aponte um registro DNS `A` para o IP da VPS. Sem domínio próprio, use `<ip-com-hífens>.sslip.io` (ex: `129-151-10-20.sslip.io`), que já resolve para o IP sem configurar nada.

### 2. Subir o sistema

```bash
git clone <url-do-repo> pedigree && cd pedigree/deploy
cp .env.example .env
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'SUA-SENHA'   # cole o hash no .env
nano .env                                                                     # DOMAIN, AUTH_*, POSTGRES_PASSWORD
docker compose up -d --build
```

As migrações (`alembic upgrade head`) rodam sozinhas a cada início do backend. Acesse `https://SEU-DOMINIO` (no celular também) e entre com o usuário/senha do `.env`.

### Atualizar depois de um `git push`

```bash
cd pedigree && git pull && cd deploy && docker compose up -d --build
```

### Migrar os dados do Postgres local para a VPS

```bash
# na máquina de desenvolvimento
docker compose -f backend/docker-compose.yml exec -T db pg_dump -U pedigree --data-only --exclude-table=alembic_version pedigree > dados.sql
scp dados.sql ubuntu@IP-DA-VPS:~/
# na VPS (com o sistema já no ar, tabelas vazias)
cd pedigree/deploy && docker compose exec -T db psql -U pedigree pedigree < ~/dados.sql
```

### Backup

```bash
cd pedigree/deploy && mkdir -p backups
docker compose exec -T db pg_dump -U pedigree pedigree | gzip > backups/pedigree-$(date +%F).sql.gz
```

Vale agendar no `crontab -e` da VPS e copiar os arquivos para fora dela de tempos em tempos.

## Estrutura

- `backend/app/models.py` — modelos (Proprietario, Pombo, Resultado); `Pombo` referencia `pai_id`/`mae_id` (self-relation).
- `backend/app/pedigree.py` — monta a árvore genealógica recursivamente e sinaliza anilhas repetidas entre ancestrais (indício de consanguinidade).
- `backend/app/routers/certificado.py` + `backend/app/pdf/templates/certificado.html` — geração do certificado de pedigree em PDF (WeasyPrint).
- `deploy/docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` + `frontend/Caddyfile` — stack de produção.
- `frontend/src/pages/pombos/` — listagem, formulário e detalhe (com árvore genealógica) de cada pombo.
