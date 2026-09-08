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

## Estrutura

- `backend/app/models.py` — modelos (Proprietario, Pombo, Resultado); `Pombo` referencia `pai_id`/`mae_id` (self-relation).
- `backend/app/pedigree.py` — monta a árvore genealógica recursivamente e sinaliza anilhas repetidas entre ancestrais (indício de consanguinidade).
- `backend/app/routers/certificado.py` + `backend/app/pdf/templates/certificado.html` — geração do certificado de pedigree em PDF (WeasyPrint).
- `frontend/src/pages/pombos/` — listagem, formulário e detalhe (com árvore genealógica) de cada pombo.
