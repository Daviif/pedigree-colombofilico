# Operação — backup, restauração e incidentes

> Manual curto para quem mantém o sistema sozinho. Regras em `docs/requisitos.md` (RO-xx).
> Produção: VPS Oracle AMD micro (Ubuntu 24.04), `~/pedigree/deploy`, domínio `ppombo.duckdns.org`.

**Entrar na VPS:** `ssh -o IdentitiesOnly=yes -i ~/.ssh/oracle-pedigree.key ubuntu@164.152.47.212`. Sem o `IdentitiesOnly`, o SSH oferece antes as chaves carregadas no agente; se a chave do backup estiver lá, a VPS aceita essa e a sessão cai no `rrsync` ("Not invoked via sshd"), que só lê os backups. Isso é a restrição funcionando, não defeito.

## 1. Como o backup funciona

```
VPS (03h, cron)                                    PC do responsável (04h, 16h e ao ligar)
deploy/backup-externo.sh*                          ~/.local/share/pedigree-backup/puxar_backups.py
 ├─ backups/pedigree-…sql.gz      (sem cifra, 30 d)
 └─ backups/externo/…sql.gz.age   (cifrado, 30 d) ──rsync, chave só-leitura──▶ ~/backups-pedigree/externos/
                                                      ├─ espelho/  (= VPS)
                                                      └─ arquivo/  (14 diários + 8 semanais + 12 mensais)
```
\* Enquanto a `dev` não volta para a `main`, a VPS roda o script novo com o nome `backup-externo.sh` (arquivo fora do Git). **No merge final:** `crontab -l | sed 's#backup-externo.sh #backup.sh #' | crontab -` e `rm ~/pedigree/deploy/backup-externo.sh`.

| O quê | Onde |
|---|---|
| Chave **privada** do age (abre os backups) | `~/.config/pedigree-backup/chave-age.txt` no PC + **papel**, guardado no **armário** (2026-11-09; conferir a cópia com `testar_restauracao.sh "" ARQUIVO_DIGITADO`) + pendrive (ainda não feito). **Nunca** no Google Drive, onde estão os backups (D9) |
| Chave pública do age | VPS: `~/pedigree/deploy/backup.pub` |
| Chave SSH do PC (só lê `backups/externo`) | PC: `~/.ssh/pedigree-backup`; VPS: `~/.ssh/authorized_keys` com `rrsync -ro` |
| Log do backup da VPS | VPS: `~/pedigree/deploy/backups/backup.log` (linhas `ERRO` em falha) |
| Log da cópia no PC | `journalctl --user -u pedigree-backup` |
| Segredos (`.env`) | Só na VPS. **Não são necessários para recuperar** (RO-09): numa VPS nova geram-se outros |

**Horários:** os nomes dos arquivos estão em **UTC** (Brasília = UTC − 3). O backup das 03h UTC corresponde a 00h em Brasília.

**Objetivos (RO-08):**
- RPO ≤ 24 h com o PC ligando todo dia. Com o PC desligado por N dias, a cópia externa atrasa N dias, e a VPS continua com o diário local.
- RTO ≤ 4 h. Será medido no ensaio completo da seção 4.

## 2. Verificações de rotina

| Quando | O quê |
|---|---|
| Sozinho | O PC mostra a notificação "Backup do pedigree atrasado" se passar de 48 h sem cópia nova |
| Todo mês | `./backup-pc/testar_restauracao.sh` (backup mais recente) e anotar o resultado na seção 3 |
| A cada 6 meses | O mesmo teste **com a chave do pendrive**: `./backup-pc/testar_restauracao.sh "" /run/media/$USER/<PENDRIVE>/pedigree-chave-age.txt` |
| A cada atualização da VPS | `df -h /` (backup e Docker crescem) e `tail -3 ~/pedigree/deploy/backups/backup.log` |
| Todo mês e antes de cada deploy | No PC: `pip-audit -r backend/requirements-dev.txt` e `cd frontend && npm audit` (SG-05). Alerta novo → atualizar e testar antes de subir |
| Depois de cada deploy | `./verificar.sh https://ppombo.duckdns.org` → `Tudo certo.` (SG-03/04) e o checklist de `docs/ameacas.md` seção 4 |

## 2.1 Deploy (atualizar a produção)

```bash
cd ~/pedigree && git pull
cd deploy && docker compose pull db          # só quando a versão do Postgres mudar no compose (SG-02)
docker compose up -d --build                 # ~5 min na VPS
docker compose ps                            # os três "Up"; backend sem reinício em loop
docker compose logs --tail=30 backend        # "Application startup complete" e nenhum erro de permissão
./verificar.sh https://ppombo.duckdns.org
```
- O backend roda **sem root e com o disco só leitura** (SG-01). Se aparecer `Permission denied` ou `Read-only file system` no log, algo novo está tentando gravar fora de `/tmp`: corrigir no código, não tirar a proteção.
- Trocar WeasyPrint, Python ou Debian só depois do teste visual do PDF (`backend/scripts/comparar_certificados.py`).

## 3. Registro dos testes de restauração (RO-07)

O primeiro teste com um backup **de produção** é critério para o lançamento.

| Data | Arquivo | Chave | Tempo | Contagens | Migração | Admins | Resultado |
|---|---|---|---|---|---|---|---|
| 2026-11-07 | pedigree-2026-11-07-1949.sql.gz.age (**produção**, puxado pelo timer) | chave-age.txt (do PC) | 6 s | usuarios=3 pombos=290 resultados=5 proprietarios=45 compartilhamentos=0 | b7e2f4a91c3d (a da `main`, esperado) | 1 | **OK. Primeiro teste com backup de produção (fecha o P0-2).** Pendente: o mesmo teste com a chave do pendrive (RO-10) |
| 2026-11-07 | pedigree-2026-11-07-1638.sql.gz.age | chave de teste | 8 s | usuarios=1 pombos=27 resultados=10 proprietarios=4 compartilhamentos=0 | c4d8e1f2a7b9 | 1 | OK. **Ensaio com o banco de dev**, não vale como teste de produção. Com chave errada, o script falha (saída 1) e apaga o contêiner |

## 4. Recuperar tudo numa VPS nova (perda total)

1. Criar a instância e preparar como no README ("Preparar a VPS").
2. `git clone` do repositório e `deploy/.env` com **segredos novos** (`openssl rand -hex 32` para a `SECRET_KEY`, senha nova do Postgres e `DOMAIN`).
3. Apontar o DuckDNS para o IP novo.
4. `docker compose up -d --build`.
5. Esperar o backend aplicar as migrações e depois parar o backend: `docker compose stop backend`.
6. Recriar o banco vazio:
   ```bash
   docker compose exec -T db psql -U pedigree -d postgres -c "DROP DATABASE pedigree" -c "CREATE DATABASE pedigree OWNER pedigree"
   ```
7. Restaurar a partir do PC:
   ```bash
   age -d -i ~/.config/pedigree-backup/chave-age.txt ARQUIVO.age | gunzip | ssh -i <chave> ubuntu@<IP-NOVO> "cd pedigree/deploy && docker compose exec -T db psql -v ON_ERROR_STOP=1 -U pedigree pedigree"
   ```
8. `docker compose start backend`. Entrar no sistema, abrir um pombo e gerar um PDF.
9. Refazer o backup: crontab, `backup.pub` e a linha `rrsync` no `authorized_keys`, e conferir com `ssh pedigree-backup` a partir do PC (trocar o `HostName` em `~/.ssh/config`).
10. Registrar na seção 3: o tempo total é o RTO real.

## 5. Incidentes

Formato: **detectar → conter → recuperar → verificar**. Anote cada incidente no fim deste arquivo.

| Incidente | Detectar | Conter / recuperar | Verificar |
|---|---|---|---|
| Site fora do ar | O site não abre; `docker compose ps` | `docker compose up -d`; ver `docker compose logs --tail 100 backend web` | Login e abrir um pombo |
| Banco indisponível | Erro 500 em tudo; `db` não aparece como `healthy` | `docker compose restart db`; com o disco cheio, ver a próxima linha | `docker compose ps` e login |
| Disco cheio | `df -h /` acima de 90%; backup com `ERRO` | `docker system prune -f` (imagens e cache de build sem uso); conferir o tamanho de `backups/` | `df -h /`; `./backup-externo.sh` sem erro |
| HTTPS não renova | Aviso de certificado no navegador | `docker compose logs web \| grep -i acme`; conferir o DuckDNS (IP) e as portas 80/443 na Oracle | Cadeado válido |
| Atualização não sobe | Contêiner reiniciando; erro de migração no log | `git log` → `git checkout <commit anterior>` → `docker compose up -d --build`. Se a migração já rodou: `docker compose exec backend alembic downgrade -1` **antes** de voltar o código | Login, pombo, PDF |
| Backup inválido | `ERRO` no `backup.log`, notificação no PC ou teste de restauração falhando | Ler o motivo no log; rodar `./backup-externo.sh` à mão; testar a restauração | Seção 3 |
| Dados corrompidos ou apagados por engano | Usuário avisa | **Não restaurar por cima.** Restaurar o backup anterior num contêiner descartável (`MANTER=1 ./backup-pc/testar_restauracao.sh ARQUIVO.age`) e copiar só os registros afetados | Conferir com o usuário |
| Conta de usuário comprometida | Acesso estranho; usuário avisa | Tela Usuários → **Desativar** (derruba as sessões na hora) → **Redefinir senha** | Último acesso |
| Vazamento de segredo (`.env`) | Arquivo exposto, VPS invadida | Trocar a `SECRET_KEY` e a senha do banco (comandos no hotfix de 2026-11-07, no histórico do projeto) → `docker compose up -d` | Sessões antigas recebem 401 |
| VPS comprometida | Processos ou usuários estranhos, uso de CPU | Considere tudo da VPS como vazado. **Não confie nela:** recupere numa VPS nova (seção 4) com segredos e chaves SSH novos; revogue a chave `pedigree-backup` (ela só lê backups cifrados) | Seção 4 |
| Perda do PC | — | Os backups da VPS continuam. Instalar de novo com `backup-pc/instalar.sh`, **usando a chave do pendrive** (copiar para `~/.config/pedigree-backup/chave-age.txt` antes de rodar) | Teste de restauração |

## 6. Histórico de incidentes

| Data | O que aconteceu | Causa | O que foi feito |
|---|---|---|---|
| 2026-11-07 | Falha no PDF permitia ler arquivos do servidor (achada na auditoria, sem exploração) | Template sem autoescape | Hotfix `29365e9`, segredos trocados; a busca nos dados não achou nenhuma tentativa |
