# SG-02: versões fixas.
FROM node:22.23.4-alpine3.24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Caddy serve o build estático e faz o proxy de /api para o backend
# (configuração em Caddyfile).
FROM caddy:2.11.9-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
