# Ameaças e proteções (Fase 8)

> O que pode dar errado em segurança, o que protege contra cada coisa e como provar que a proteção funciona.
> Regras citadas: `README.md` (RG, RV, RA, SG, segurança do PDF) e `docs/requisitos.md` (RO). Operação e incidentes: `docs/operacao.md`.
> Revisar quando mudar a arquitetura, entrar um tipo novo de dado ou antes de cada cliente novo.

## 1. O que proteger

| Ativo | Por que importa |
|---|---|
| Plantel de cada criador (pombos, genealogia, resultados, proprietários) | É o produto: perder ou misturar dados de clientes acaba com a confiança |
| Dados de contato dos proprietários (nome, telefone, endereço, e-mail) | Dados pessoais de terceiros (LGPD) |
| Senhas e sessões | Com elas, alguém age como o criador |
| `SECRET_KEY` e senha do Postgres (`.env` da VPS) | Com a `SECRET_KEY` dá para forjar sessão de qualquer um, inclusive do admin |
| Backups e a chave privada do age | O backup tem tudo; a chave abre o backup |
| A VPS | Quem a controla controla tudo acima |

## 2. Quem pode atacar

- **Internet em geral:** robôs que varrem portas, testam senhas e exploram versões velhas. É o mais provável.
- **Usuário logado curioso ou mal-intencionado:** um criador tentando ver ou alterar o plantel de outro, ou abusar do PDF.
- **Quem pega um aparelho ou senha:** celular perdido, senha anotada ou repetida em outro site.
- **Falha nossa:** deploy errado, disco cheio, dependência com falha, backup que não restaura.

## 3. Ameaças, proteções e provas

| # | Ameaça | Proteção | Prova | Risco que sobra |
|---|---|---|---|---|
| A1 | Testar muitas senhas (força bruta) | Limite por login (5 em 15 min) e por IP (20 em 15 min), com trava no banco (RA-01..07); bcrypt | Testes `test_limite_login.py`, inclusive 12 tentativas simultâneas | Senha fraca escolhida pelo admin. Mínimo de 8 caracteres |
| A2 | Ver ou alterar o plantel de outro (IDOR) | Toda consulta filtra pelo dono; compartilhado é só leitura (403 ao editar); invisível responde 404 | `test_multiusuario.py`, `test_genitor.py` (PE-01) | — |
| A3 | Texto do usuário vira HTML no PDF e lê arquivos do servidor ou faz o servidor buscar endereços (SSRF) | Jinja com `autoescape`; `url_fetcher` que recusa tudo; imagem sem Ghostscript | 7 testes do certificado (seção "Segurança do certificado PDF") | — |
| A4 | XSS: código injetado rodando no navegador de outro usuário | React escapa o texto; **CSP** só com `'self'`, sem script inline (SG-03) | Navegação completa sem violação + contraprova: script inline injetado **não roda** e imagem externa é bloqueada (2026-11-09) | Uma falha futura do React ou de dependência: a CSP limita o estrago |
| A5 | Clickjacking (o site dentro de outra página para enganar cliques) | `frame-ancestors 'none'` e `X-Frame-Options: DENY` (SG-03) | `deploy/verificar.sh` | — |
| A6 | Roubo de sessão por rede ou script | Cookie `httpOnly`, `Secure` em produção, `SameSite=Lax`; HTTPS obrigatório com **HSTS** | `deploy/verificar.sh`; testes de autenticação | Token copiado vale até expirar (30 dias); trocar a senha ou desativar derruba na hora (versão da sessão) |
| A7 | CSRF (outro site faz o navegador agir no sistema) | `SameSite=Lax` + API só JSON | Revisão de código (diagnóstico #19) | Rever se surgir formulário fora de JSON |
| A8 | Invasor que achar uma falha no backend dominar o contêiner e a VPS | Processo **sem root**, disco só leitura, sem capacidades, `no-new-privileges` (SG-01); backend só na rede interna do Docker | Contêiner testado: `uid=10001`, `CapEff=0`, só leitura, API e PDF funcionando (2026-11-09) | Falha no kernel ou no Docker (atualizações automáticas da VPS) |
| A9 | Dependência com falha conhecida | Versões fixas (SG-02); `pip-audit` e `npm audit` zerados (SG-05) | Auditorias de 2026-11-09: 0 alertas (eram 19 no Python e 3 no Node) | Falha nova publicada amanhã: repetir as auditorias antes de cada deploy e todo mês |
| A10 | Atualização automática de imagem quebrar o sistema ou o PDF | Versões fixas de Python/Debian, Node, Caddy e Postgres (SG-02); teste visual do PDF antes de trocar | `backend/scripts/comparar_certificados.py` (WeasyPrint 63 → 70: idêntico) | — |
| A11 | Porta esquecida aberta na VPS | Só 22, 80 e 443; iptables e security list da Oracle; desligar o `rpcbind` (porta 111) | `sudo ss -ltnp` e `sudo iptables -L -v` na VPS (seção 4) | — |
| A12 | Vazamento do `.env` (segredos) | Arquivo só do dono (`chmod 600`); fora do Git; não vai para o backup (RO-09) | `ls -l ~/pedigree/deploy/.env` na VPS | Quem tem SSH na VPS lê. Chave SSH só no PC do responsável |
| A13 | Perda de dados (erro, disco, VPS apagada pela Oracle) | Backup diário cifrado puxado pelo PC, rotação, alerta de atraso e teste de restauração (RO-01..10) | `docs/operacao.md` seção 3 | Teste com a chave do **pendrive** ainda pendente (RO-10). Conta Oracle grátis pode ser recuperada por ociosidade: **aceito por agora (D6)**, o backup no PC é a defesa |
| A14 | Site fora do ar sem ninguém saber | UptimeRobot gratuito (D7) a cada 5 min em `/api/saude`, que só dá 200 com backend **e** banco no ar (RO-11) | Testes de `/api/saude`; alerta recebido ao configurar | Avisa em até ~5 min; só por e-mail no plano grátis |
| A15 | Dados pessoais dos proprietários tratados sem regra | `docs/privacidade.md` (o que se guarda, quem vê, retenção, direitos; o criador responde pela autorização dos proprietários que cadastra); logs com rotação (SG-07) | Política escrita (2026-11-09), sem declarar conformidade legal | Exclusão e exportação feitas à mão; revisão por profissional antes de ampliar (`docs/lancamento.md` §2) |
| A16 | Disco cheio derrubar o banco ou o backup | Alerta do backup; `docker system prune` documentado | `df -h /` na rotina (`docs/operacao.md` seção 2) | Monitorar junto com A14 |

## 4. Checklist da VPS (o responsável executa; resultado anotado aqui)

| Item | Comando de conferência | Esperado | Resultado (data) |
|---|---|---|---|
| `.env` só do dono | `stat -c '%a %U' ~/pedigree/deploy/.env` | `600 ubuntu` | ✅ 2026-11-09: era `664`, agora `600 ubuntu` |
| `rpcbind` desligado | `systemctl is-active rpcbind rpcbind.socket` | `inactive` nos dois | ✅ 2026-11-09: desligado e mascarado; porta 111 sumiu do `ss` e segue fechada de fora (antes já era filtrada pelo firewall) |
| Portas | `sudo ss -ltnp \| grep -v 127.0.0` | só 22, 80, 443 | ✅ 2026-11-09: só 22, 80 e 443 (IPv4 e IPv6) |
| Pacotes em dia | `apt list --upgradable 2>/dev/null \| wc -l`; `ls /var/run/reboot-required` | 1 (só o cabeçalho); arquivo não existe | ✅ 2026-11-09: reiniciado (kernel pendente carregado; containers voltaram sozinhos), 27 pacotes atualizados, nada pendente |
| Atualizações automáticas | `systemctl is-enabled unattended-upgrades` | `enabled` | ✅ 2026-11-09 |
| Cabeçalhos depois do deploy | `./verificar.sh https://ppombo.duckdns.org` | `Tudo certo.` | |
| Backend sem root | `docker compose exec backend id` | `uid=10001(pedigree)` | |

## 5. Fora do escopo agora (anotado de propósito)

- Autenticação em dois fatores: desproporcional para o tamanho atual; rever com mais clientes ou com o admin acessando de fora.
- Revogar a sessão no logout (diagnóstico #20): aceito; trocar a senha já derruba as sessões.
- WAF ou proteção contra negação de serviço: a VPS grátis não aguenta ataque grande de qualquer jeito; o Caddy e o limite de login cobrem o abuso comum.
