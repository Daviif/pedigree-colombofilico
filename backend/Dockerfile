# SG-02: versão fixa (Python e Debian). Trocar só de propósito, com o teste visual do PDF.
FROM python:3.12.16-slim-trixie

# Bibliotecas nativas do WeasyPrint (Pango) + fonte usada no certificado.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpango-1.0-0 libpangoft2-1.0-0 fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# SG-01: o processo roda com um usuário sem privilégio. O código é do root e só pode ser lido.
# O cache de fontes do WeasyPrint vai para /tmp (o contêiner pode rodar com o disco só leitura).
RUN useradd --system --uid 10001 --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin pedigree
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 TZ=America/Sao_Paulo XDG_CACHE_HOME=/tmp/cache

WORKDIR /app
# Só as dependências de produção (pytest e httpx ficam em requirements-dev.txt).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app

USER pedigree
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --proxy-headers --forwarded-allow-ips='*'"]
