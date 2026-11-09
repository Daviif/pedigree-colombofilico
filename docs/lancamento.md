# Lançamento — piloto com os primeiros clientes (Fase 9)

> Checklist do piloto (prompt mestre, seção 27), suporte, atualização e reversão, e o roteiro de aceitação com o cliente.
> Situação: ✅ comprovado (com a evidência) · ⏳ falta fazer · 🔁 só se confirma no deploy da versão nova (Fase 10).
> Nada aqui é declaração de conformidade legal ou certificação.

## 1. Obrigatório antes do primeiro cliente

| # | Requisito | Evidência | Situação |
|---|---|---|---|
| 1 | Cadastro e consulta confiáveis | Regras RG, RV, CA, LI no README; 131 testes no backend e 118 no frontend; cenários S1–S4 da validação 7.8 (`docs/ux/auditoria.md` §6) | ✅ |
| 2 | Pedigree compreensível | Regras DT/AR; árvore legível no celular (S7); completar pela árvore em 4 ações (S5) | ✅ · ⏳ confirmar com o cliente (seção 5) |
| 3 | PDF consistente | Layout igual pixel a pixel entre WeasyPrint 63 e 70, dentro dos contêineres (Fase 8); segurança do PDF (7 testes). Limitação aceita: com 6 gerações e muitos títulos, o rodapé vai para a 2ª página (D8) | ✅ |
| 4 | Isolamento de dados | `test_multiusuario.py`, `test_genitor.py` (PE-01); invisível = 404, só leitura = 403 | ✅ |
| 5 | Compartilhamento e cópia testados | Regras RC e CP; `test_copia.py`; `grupo6.test.tsx` | ✅ |
| 6 | Backup externo | Diário, cifrado (age), puxado pelo PC com 3 tentativas (RO-01..11); alerta com 48 h sem cópia | ✅ |
| 7 | Restauração comprovada | `docs/operacao.md` §3: restaurado com a chave do PC em 2026-11-07 e 2026-11-09 (já na versão 16.15 do Postgres) | ✅ chave do PC · ⏳ **com a chave do pendrive (RO-10)** |
| 8 | HTTPS e autenticação verificados | HTTPS automático (Caddy); limite de login (RA-01..08, testes); cookie httpOnly/Secure; HSTS e CSP | 🔁 `./verificar.sh` depois do deploy · ✅ RA-06 no Caddy local e **na VPS** (2026-11-09: com `X-Forwarded-For: 1.2.3.4`, o log mostrou o IP público real do PC) |
| 9 | Mensagens de erro claras | Regras RF, CA-02, UI-01 (sem `alert`/`confirm`); estados de erro conferidos na 7.8 | ✅ |
| 10 | Documentação mínima | `docs/guia-do-usuario.md` (cliente), `docs/operacao.md` (manutenção), `docs/ameacas.md` (segurança) | ✅ · ⏳ só o número do WhatsApp, na cópia entregue |
| 11 | Processo de suporte | Seção 3 deste documento | ✅ WhatsApp, seg–sex em horário comercial |
| 12 | Privacidade | `docs/privacidade.md` (o que o sistema guarda, quem vê, retenção, direitos), logs com rotação (SG-07) | ✅ responsável, região (São Paulo) e prazo (15 dias) · ⏳ número do WhatsApp na cópia entregue · 🔁 SG-07 |
| 13 | Atualização e reversão | Seção 4 deste documento | ✅ escrito · 🔁 primeiro uso na Fase 10 |
| 14 | O PDF aguenta a VPS | `deploy/carga_pdf.sh` (seção 6) | ✅ 2026-11-09 (pombo 154, 6 gerações): 13/13 HTTP 200; 2,5 s cada em sequência; 3 simultâneos, o mais lento 13,2 s; backend no máximo 236 MiB; mínimo de 401 MiB livres; nenhum reinício |
| 15 | Saber quando cai | UptimeRobot em `/api/saude` (D7, RO-11) | ⏳ configurar (agora na página inicial; depois do deploy, em `/api/saude`) |

## 2. Pode esperar até ampliar a base de usuários

- Conta Oracle Pay As You Go (D6, adiada) e VPS ARM A1 (grátis, mais CPU): o teste de carga mostrou 2,5 s por PDF de 6 gerações, mas 13 s quando 3 saem juntos (CPU da micro). Trocar quando houver mais criadores gerando PDFs ao mesmo tempo.
- Monitor com aviso no Telegram ou celular (o grátis avisa só por e-mail).
- Termos de uso / contrato de assinatura escrito, e revisão da política de privacidade por um profissional.
- Botão de excluir conta e exportar os dados (hoje feito à mão pelo responsável).
- Recuperar a senha sozinho (hoje o administrador redefine).
- Autenticação em dois fatores para o administrador.
- Revogar a sessão no logout (diagnóstico #20, aceito).
- Sugerir a próxima anilha no cadastro em série (meta da 7.8 não atingida: +3 ações em vez de +1).

## 3. Suporte

| Item | Como funciona |
|---|---|
| Canal | **WhatsApp** do responsável, Davi Emilio de Paula Fonseca (o mesmo do guia e da política de privacidade; o número vai só na cópia entregue ao cliente) |
| Horário | Segunda a sexta, horário comercial. Sábados, domingos e feriados: a combinar |
| Prazo de resposta | Sob demanda, dentro do horário; sistema fora do ar: assim que o monitor avisar; pedidos de privacidade: até 15 dias (`docs/privacidade.md`) |
| O que pedir ao cliente | O que tentou fazer, a anilha, a mensagem que apareceu e um print |
| Senha esquecida | Tela **Usuários → Redefinir senha** (também desbloqueia). Passe a senha nova por um canal privado |
| Login bloqueado | Tela **Usuários → Desbloquear** (RA-08) |
| Dado apagado por engano | Restaurar o backup num banco descartável com `MANTER=1 ./backup-pc/testar_restauracao.sh` e copiar só o que foi perdido (`docs/operacao.md`) |
| Sistema fora do ar | `docs/operacao.md` §5 (incidentes) |
| Pedido de dados ou exclusão (privacidade) | Responder no prazo da política; anotar a data do pedido e da resposta |

## 4. Atualização e reversão

**Antes de atualizar** (na VPS):
```bash
cd ~/pedigree/deploy
./backup-externo.sh                   # backup do momento (depois do merge final: ./backup.sh)
git -C ~/pedigree rev-parse --short HEAD > ~/pedigree/versao-anterior.txt
```
**Atualizar:** `docs/operacao.md` §2.1 (pull, build, `docker compose ps`, logs, `./verificar.sh`).

**Reverter** (algo quebrou e não dá para corrigir na hora):
```bash
cd ~/pedigree && git checkout "$(cat versao-anterior.txt)"
cd deploy && docker compose up -d --build
./verificar.sh https://ppombo.duckdns.org   # a versão antiga ainda não tem os cabeçalhos: só confira que o site e a API respondem
```
- **Banco:** a versão nova (dev) só **acrescenta** a tabela `tentativas_login` (migração `c4d8e1f2a7b9`). A versão antiga ignora essa tabela, então **não é preciso desfazer nada no banco** para voltar.
- Se um dado tiver sido estragado (não só o código), restaurar o backup feito antes de atualizar (`docs/operacao.md` §4).
- Depois de voltar: `git checkout main` (ou `dev`) de novo só quando a correção estiver pronta.

## 5. Aceitação com o cliente (roteiro)

Com o cliente usando o próprio celular, de preferência com pombos reais dele. Anotar: conseguiu sozinho? quanto tempo? hesitou onde?

| # | Tarefa | Conseguiu? | Observação |
|---|---|---|---|
| 1 | Entrar com o usuário e a senha recebidos | | |
| 2 | Cadastrar um pombo com sexo e cor | | |
| 3 | Cadastrar 3 irmãos de ninhada em seguida (Salvar e cadastrar outro) | | |
| 4 | Achar um pombo pela anilha | | |
| 5 | Completar o pai de um pombo pela árvore (+ Pai) | | |
| 6 | Lançar um resultado | | |
| 7 | Cadastrar o proprietário dele com os títulos do pombal | | |
| 8 | Gerar o certificado com 4 gerações e conferir o cabeçalho | | |
| 9 | Compartilhar o plantel com outro criador (se houver) | | |
| 10 | Dizer, com as próprias palavras, o que significa "⚠ repetido" na árvore | | |

**Aceito quando:** as tarefas 1–8 saem sem ajuda (ou com uma dica só), o certificado sai como ele espera, e os problemas encontrados ficam anotados com prioridade.

## 6. Verificações na VPS que faltam (o responsável roda)

**Teste de carga do PDF** (horário calmo, ~2 min; só lê):
```bash
cd ~/pedigree && git pull                      # traz o carga_pdf.sh (depois do merge; antes, copie com scp)
cd deploy
# pombo com a árvore mais funda do plantel (anota o id):
docker compose exec -T db psql -U pedigree -d pedigree -c "WITH RECURSIVE s(r,a,g) AS (SELECT id,id,0 FROM pombos UNION ALL SELECT s.r,x.p,s.g+1 FROM s JOIN pombos p ON p.id=s.a CROSS JOIN LATERAL unnest(ARRAY[p.pai_id,p.mae_id]) x(p) WHERE x.p IS NOT NULL AND s.g<6) SELECT r AS id, max(g) AS geracoes, count(*)-1 AS ancestrais FROM s GROUP BY r ORDER BY 2 DESC,3 DESC LIMIT 3;"
./carga_pdf.sh https://ppombo.duckdns.org 154 10   # troque 154 pelo número da 1ª linha da consulta acima
```
Aprovado se: todos HTTP 200, nenhum contêiner reiniciou e sobra memória (mínimo disponível > 100 MiB). Se não, anotar e decidir (menos workers, limite de memória ou VPS maior).

**RA-06 (o Caddy não deixa o cliente inventar o próprio IP):**
```bash
# no PC:
curl -s -o /dev/null -H 'X-Forwarded-For: 1.2.3.4' https://ppombo.duckdns.org/api/health
# na VPS, logo depois:
docker compose logs --tail=3 backend
```
Aprovado se a última linha mostra o **seu IP público**, e não `1.2.3.4`.

## 7. Registro

| Data | O quê | Resultado |
|---|---|---|
| 2026-11-09 | Teste de carga do PDF (1ª tentativa) | ❌ inválido: rodado com `ID` literal, tudo 422 (nenhum PDF gerado). O script passou a recusar id não numérico e a parar no 1º erro. Refazer com o id 154 |
| 2026-11-09 | Teste de carga do PDF | ✅ aprovado: 10 em sequência 2,3–2,9 s; 3 ao mesmo tempo, o mais lento 13,2 s (fila nos 2 workers + CPU com burst da micro); pico do backend 236 MiB; mínimo de 401 MiB livres; contêineres sem reinício |
| 2026-11-09 | RA-06 na VPS | ✅ o log mostrou o IP público real do PC, não o `1.2.3.4` enviado |
| | Restauração com a chave do pendrive (RO-10) | |
| | Monitor configurado | |
| | Aceitação com o cliente | |
