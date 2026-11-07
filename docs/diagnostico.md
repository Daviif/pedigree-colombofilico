# Diagnóstico e planejamento — Fase 1

> Data: 2026-11-07 · Branch: `dev` (criada a partir de `main` em `8b6f178`) · Autor: auditoria assistida por IA, a validar pelo responsável.
> **Atualização 2026-11-07 (tarde):** P0-1 corrigido e em produção (hotfix `29365e9`, segredos trocados); `pip-audit` feito; adendo de refatoração integral de UX/UI incorporado (seções F e G); ritmo confirmado de **10 h/semana**.
>
> **Esta fase não alterou código, banco nem VPS.** Sondas foram executadas só no banco de teste local (`pedigree_test`).

Legenda de evidência: **Confirmado** (código + execução) · **Provável** (código, sem reproduzir) · **Hipótese** · **Não verificado**.

---

## A. Resumo executivo

O sistema é pequeno (~4,5 mil linhas), bem organizado e funcional: plantel por usuário, compartilhamento só leitura, cópia com ancestrais, árvore e PDF, 46 testes de backend passando contra Postgres real. A arquitetura (React + FastAPI + Postgres + Caddy numa VPS) é adequada ao tamanho do produto e **não deve ser trocada**.

As lacunas que impedem vender com segurança são poucas, mas sérias:

1. ~~**Falha crítica no PDF (P0, confirmada):**~~ **Resolvida em 2026-11-07** (hotfix na `main`, segredos trocados na VPS). o texto digitado pelo usuário entra no certificado como HTML. Com isso, qualquer usuário logado consegue embutir arquivos do servidor no PDF, por exemplo as variáveis de ambiente com a `SECRET_KEY` e a senha do banco. Com a chave, dá para forjar a sessão do admin. Está em produção hoje.
2. **Backup só dentro da VPS (P0 para venda):** se a instância for perdida, os dados vão junto. A restauração nunca foi testada.
3. **Integridade genealógica (P1, confirmadas):** ciclos são aceitos, excluir um pombo apaga em silêncio o vínculo dos filhos, e a cópia entre plantéis pode ligar o pai errado quando a anilha coincide.
4. **Login sem limite de tentativas (P1, confirmado).**

Estratégia recomendada: **corrigir o P0 do PDF antes de qualquer outra coisa** (é a única exceção que justifica sair da regra "nada na main"; ver K). Depois: backup externo com restauração comprovada, integridade e segurança P1, e só então UX e pedigree interativo. O primeiro cliente pode usar o sistema assim que os P0 e P1 estiverem resolvidos. UX e pedigree interativo podem vir em ciclos seguintes.

---

## B. Inventário técnico

| Camada | O que existe | Observações |
|---|---|---|
| Frontend | React 19 + TS 6 + Vite 8 + Tailwind 4 + TanStack Query + axios. 11 páginas/componentes principais, maior arquivo 322 linhas (`Usuarios.tsx`) | Sem testes. Lint (oxlint) com 4 avisos antigos |
| Backend | FastAPI 0.121, SQLAlchemy 2, Alembic (7 migrações), PyJWT, bcrypt, WeasyPrint 63.1 | Routers finos, regras dentro dos routers (adequado ao tamanho) |
| Banco | Postgres 16: `usuarios`, `pombos` (pai_id/mae_id auto-referência), `proprietarios`, `resultados`, `compartilhamentos` | Anilha única por plantel (`uq_pombos_usuario_anilha`) |
| Autenticação | JWT HS256 em cookie `httpOnly`, `SameSite=Lax`, `Secure` em produção, 30 dias, versão de sessão (troca de senha derruba sessões) | Sem limite de tentativas |
| Testes | 46 testes de integração (pytest + Postgres real): auth, multiusuário, pombos, usuários | Nenhum teste de PDF com conteúdo malicioso, de ciclo ou de exclusão |
| Implantação | `deploy/docker-compose.yml`: db (sem porta exposta) + backend (uvicorn 2 workers, root) + Caddy (HTTPS automático) | Imagens `postgres:16-alpine` e `caddy:2-alpine` sem versão fixa |
| Backup | `deploy/backup.sh` via cron às 3h, retenção 30 dias, **na própria VPS** | Sem cópia externa, alerta ou teste de restauração |

**Limitações desta auditoria:**
- Não inspecionei a VPS: firewall, SSH, disco, versão do SO, tipo da instância. Pela regra do projeto, quem roda comandos lá é o responsável.
- Não testei a interface no navegador.
- Não rodei `pip-audit`.
- Não tenho acesso ao PombalPro.

---

## C. Matriz de diagnóstico

| # | Área | Situação atual | Evidência | Class. | Grav. | Prior. | Recomendação |
|---|---|---|---|---|---|---|---|
| 1 | Segurança / PDF | ✅ **Resolvido** (`29365e9`): autoescape + `url_fetcher` que recusa tudo, 7 testes, contraprova no código antigo. Antes: texto do usuário virava HTML; WeasyPrint embutia arquivos locais e buscava URLs | `routers/certificado.py:22` cria o `Environment` sem `autoescape`. Sonda: `{{ x }}` com `<b>` sai sem escape e o PDF contém `/EmbeddedFile` de `/etc/hostname` | **Confirmado** | Crítica | **P0** | `autoescape=True` + `url_fetcher` que recusa tudo que não seja o diretório de templates + teste. Depois, trocar `SECRET_KEY` e senha do banco na VPS por precaução |
| 2 | Backup | Só no disco da VPS, sem alerta de falha, restauração nunca testada | `deploy/backup.sh`, README | **Confirmado** | Crítica (para venda) | **P0** | Cópia externa diária criptografada + alerta + restauração testada em ambiente isolado |
| 3 | Genealogia | Ciclo indireto aceito (A pai de B, depois B pai de A) | Sonda: `PUT` responde 200; a árvore mostra a raiz como seu próprio ancestral | **Confirmado** | Alta | P1 | Antes de gravar pai/mãe, subir a ascendência do candidato (CTE recursiva) e recusar se encontrar o próprio pombo |
| 4 | Genealogia | Excluir um pombo com filhos responde 204 e o pai/mãe dos filhos fica vazio sem aviso | Sonda `REMOVER_PAI` = 204. O SQLAlchemy anula `pai_id` porque a relação `filhos_como_pai` não tem cascade | Confirmado (status); Provável (anulação) | Alta | P1 | Bloquear (409) ou exigir confirmação explícita listando os descendentes afetados |
| 5 | Cópia | A cópia reaproveita um ancestral do destino só pela anilha. Um pombo diferente com a mesma anilha vira o pai | Sonda: o pai da cópia ficou com cor Vermelho, o original era Azul | **Confirmado** | Alta | P1 | Reaproveitar só quando sexo e cor também batem; senão, avisar e deixar o usuário decidir |
| 6 | Autenticação | Login sem limite de tentativas | Sonda: 30 erros seguidos, sempre 401, nunca 429. Cada tentativa custa um bcrypt (CPU) | **Confirmado** | Alta | P1 | Limite por login e por IP (tabela no Postgres, sem serviço novo) |
| 7 | Ambiente de dev | Postgres de dev com senha `pedigree` escutando em `0.0.0.0:5436`; firewalld libera 1025–65535 na Wi-Fi | `backend/docker-compose.yml`, `ss -ltn`, `firewall-cmd` | **Confirmado** | Alta (se houver dados reais) | P1 | Publicar em `127.0.0.1:5436` |
| 8 | Infraestrutura | Instância Oracle Always Free pode ser recuperada por ociosidade. Sem monitoramento externo | Política pública da Oracle; sem healthcheck externo no repo | Provável | Alta | P1 | Conta Pay As You Go (mantém recursos grátis) + monitor de disponibilidade gratuito |
| 9 | Validação | Anilha com mais de 50 caracteres → **500** (`StringDataRightTruncation`). O mesmo vale para cor, origem e nome | Sonda `test_anilha_vazia_e_gigante` | **Confirmado** | Média | P2 | `max_length` nos schemas Pydantic igual às colunas |
| 10 | Genealogia | Fêmea aceita como pai (e macho como mãe) | Sonda `PAI_FEMEA` = 201 | **Confirmado** | Média | P2 | Decisão de produto: bloquear (proposta) ou só alertar. `DESCONHECIDO` sempre aceito |
| 11 | Proprietário | Excluir um proprietário em uso responde 204 e os pombos perdem o proprietário sem aviso | Sonda `REMOVER_PROPRIETARIO` = 204 | Confirmado (status) | Média | P2 | Bloquear com mensagem listando quantos pombos usam o proprietário |
| 12 | Resultados | Aceita ano 99999 e distância negativa | Sonda `RESULTADO_ABSURDO` = 201 | **Confirmado** | Baixa | P2 | Faixas no schema (ano 1900..ano atual+1, km ≥ 0) |
| 13 | Frontend | Nenhuma tela trata erro de rede (`isError` não aparece no código). O detalhe do pombo fica em "Carregando..." para sempre em 404 ou queda | `grep isError` vazio; `PomboDetail.tsx:22` | Provável | Média | P2 | Estados de erro e vazio padronizados (um componente pequeno) |
| 14 | Pedigree UX | A árvore só mostra dados. Para completar a genealogia, é preciso sair da árvore e ir ao formulário | `components/PedigreeTree.tsx` | **Confirmado** | Média | P2 | Objetivo principal da Fase 6 |
| 15 | Infraestrutura | Backend roda como root no contêiner; imagens sem versão fixa; Caddy sem cabeçalhos de segurança | `backend/Dockerfile`, `deploy/docker-compose.yml`, `frontend/Caddyfile` | **Confirmado** | Baixa a média | P2 | `USER` sem privilégio, versões fixas, CSP/X-Frame-Options/nosniff |
| 16 | Dependências | `npm audit`: 1 alta em `follow-redirects`, via axios. Só afeta uso em Node, não o bundle do navegador | `npm audit --omit=dev` | Confirmado (alerta); Provável (sem impacto real) | Baixa | P3 | `npm audit fix` numa fase de manutenção |
| 17 | Dependências Python | `pip-audit`: WeasyPrint 63.1 (4 alertas: SSRF no fetcher padrão, `url_fetcher` ignorado em `xmp_metadata`/`stylesheets`, CSS em `presentational_hints`, EPS→Ghostscript), Starlette 0.49.3 (5), pydantic-settings 2.12 (1), pytest 8.4 (1) | `pip-audit -r requirements.txt` em venv isolado | **Confirmado** (alertas); **Provável não explorável**: não usamos `xmp_metadata`, `stylesheets`, `presentational_hints`, `secrets_dir`, `HTTPEndpoint` nem formulários; o fetcher recusa tudo, inclusive `data:`, e a imagem não tem Ghostscript | Média | P2 | Atualizar WeasyPrint 70 e FastAPI/Starlette na Fase 8, com teste visual do PDF (salto de versão grande) |
| 18 | Desempenho | A árvore faz carga preguiçosa por nó: até ~126 nós × 4 consultas com 6 gerações | `pedigree.py` acessa `pombo.pai`/`.mae`/`.resultados`/`.proprietario` | Provável | Baixa | P3 | Só otimizar se medir lentidão (CTE ou `selectinload` em lote) |
| 19 | CSRF | Cookie `SameSite=Lax` + API JSON → risco baixo | `routers/auth.py` | Provável | Baixa | P3 | Manter. Revisar se algum dia houver formulário fora de JSON |
| 20 | Logout | O logout apaga o cookie, mas o token continua válido até expirar (30 dias) se tiver sido copiado | `routers/auth.py` | **Confirmado** | Baixa | P3 | Aceitar. A versão da sessão já cobre troca de senha e desativação |
| 21 | Testes | Zero testes de frontend, de PDF com conteúdo malicioso e dos cenários genealógicos 10–20 | `backend/tests/` | **Confirmado** | Média | P2 | Testes de integração no backend primeiro. No front, só fluxos críticos |

---

## D. Lista priorizada

**P0 — bloqueia o lançamento / risco crítico**
- **P0-1** HTML e arquivos no PDF (#1). Explorável hoje por qualquer usuário logado e leva ao controle total do sistema. A correção é pequena: 2 a 4 h com testes.
- **P0-2** Backup externo com restauração comprovada (#2). Um cliente pagante sem backup fora da máquina é risco de perder tudo.

**P1 — confiabilidade e segurança antes do primeiro cliente**
- P1-1 Bloquear ciclos (#3)
- P1-2 Exclusão de pombo com descendentes (#4)
- P1-3 Cópia com anilha homônima (#5)
- P1-4 Limite de tentativas de login (#6)
- P1-5 Banco de dev em `127.0.0.1` (#7)
- P1-6 Conta Oracle e monitor de disponibilidade (#8)

**P2 — experiência e manutenção**
- Validação de tamanhos (#9), sexo × papel (#10), proprietário em uso (#11), resultados (#12)
- Estados de erro no frontend (#13)
- Pedigree interativo (#14)
- Endurecimento dos contêineres e do Caddy (#15), `pip-audit` (#17), testes (#21)

**P3 — futuro**
- `npm audit fix` (#16), desempenho da árvore (#18), revogação no logout (#20)

Nenhum item visual foi classificado como P0 ou P1.

---

## E. Proposta de experiência (para aprovar na Fase 3)

**Fluxos atuais observados no código:** cadastro num formulário único, com seleção de pai e mãe por busca (`PomboSelect`) e cadastro rápido de ancestral dentro do seletor; lista com filtros; detalhe com árvore somente leitura, irmãos, resultados e PDF.

**Problemas:**
- Completar a genealogia exige sair da árvore.
- Não há estado de erro.
- Não está claro quando a árvore está incompleta: "Desconhecido" aparece, mas não convida a completar.
- Não testei no celular de verdade.

**Proposta para a árvore** (o mais simples que resolve):

```
┌───────────────┐      ┌──────────────┐     ┌──────────────┐
│ 12345/2024 ♂  │──┬──▶│ Pai 111/2020 │──┬─▶│ Avô  …       │
│ (principal)   │  │   └──────────────┘  └─▶│ [+ Avó]      │  ← vaga desconhecida
└───────────────┘  │   ┌──────────────┐     └──────────────┘
                   └──▶│ [+ Mãe]      │  ← clique abre um painel lateral:
                       └──────────────┘     ① buscar pombo existente (mesmo plantel,
                                              filtrado pelo sexo certo)
                                            ② ou cadastrar novo (anilha, sexo já fixo, cor)
                                            → salva e a árvore recarrega no mesmo lugar
```

- Vaga vazia é sempre "Desconhecido" com o botão **+**. Nunca se cria um pombo fictício.
- No celular, uma geração por vez (pombo → pais → avós), com navegação "voltar para o principal", em vez de zoom. É mais simples e funciona com o dedo.
- A validação vale também no servidor (ciclo, plantel, sexo). O frontend só ajuda.

**Cadastro:** manter o formulário único, que é rápido. Adicionar "Salvar e cadastrar outro" e erro ao lado do campo. Não dividir em etapas, porque o formulário tem 9 campos e etapas só somariam cliques.

---

## F. EAP (revisada para o tamanho real)

As atividades triviais foram fundidas. Estimativas em horas de trabalho do responsável com apoio de IA, incluindo testes.

| Código | Pacote | Entregável verificável | Depende de | Esforço | Critério de conclusão |
|---|---|---|---|---|---|
| **0** | **Correção urgente** | | | | |
| 0.1 | Correção do PDF | autoescape + bloqueio de busca de URL/arquivo + teste | aprovação | 2–4 h | Teste com `<a rel=attachment>` e `<img src=http…>` passa; o PDF não contém `/EmbeddedFile` |
| 0.2 | Troca de segredos | `SECRET_KEY` e senha do banco novas na VPS (o responsável executa) | 0.1 implantado | 0,5 h | Login funciona e as sessões antigas caem |
| **1** | **Planejamento** | este documento aprovado | — | 0,5–1 h (revisão) | Aprovação registrada |
| **2** | **Auditoria complementar** | relatório da VPS (o responsável roda os comandos), `pip-audit`, passeio no navegador desktop e celular | 1 | 2–4 h | Itens "não verificado" reclassificados |
| **3** | **Requisitos e desenho** | `docs/requisitos.md` com as regras genealógicas numeradas e critérios de aceitação; especificação da árvore e do cadastro | 2 | 4–8 h | Cada regra tem um teste planejado; o responsável aprova |
| **4** | **Integridade e segurança base** | | 3 | | |
| 4.1 | Regras genealógicas | ciclo, exclusão com descendentes, cópia homônima, sexo × papel, proprietário em uso | | 6–10 h | Cenários 1–15 e 19–20 da seção 24 com testes passando |
| 4.2 | Validações | tamanhos, resultados e mensagens padronizadas | | 2–3 h | Nenhuma entrada gera 500 |
| 4.3 | Limite de login | limite por login e por IP | | 3–5 h | Teste: 6ª tentativa → 429; a contagem é atômica |
| 4.4 | Erros no frontend | componente de erro e vazio aplicado às telas | | 3–5 h | Sem "Carregando" infinito em 404 ou queda |
| **5** | **Backup e recuperação** | | 1 (paralelo a 3–4) | | |
| 5.1 | Cópia externa | script envia para armazenamento externo criptografado (decisão de serviço pendente) | | 3–5 h | Arquivo aparece fora da VPS; falha gera alerta |
| 5.2 | Restauração testada | restauração em ambiente isolado + registro (data, tempo, contagens) | 5.1 | 2–3 h | Contagens batem; login e PDF funcionam na cópia |
| 5.3 | Runbook | `docs/operacao.md`: incidentes da seção 23 em formato curto | 5.2 | 2–3 h | Cada incidente tem detectar, conter, recuperar e verificar |
| **6** | **Pedigree interativo** | vaga "+", buscar/vincular, cadastrar no contexto, navegação no celular | 4.1 | 16–28 h | Cenários 5, 6, 17, 18 e 20; teste manual no celular |
| **7** | **Refatoração integral de UX/UI (adendo)** | | 3 | **35–55 h** | |
| 7.1 | Auditoria de UX | inventário de telas e componentes, o que preservar em cada uma, problemas com evidência, impacto, frequência (hipótese) e gravidade; desktop, tablet e celular; estados de carregamento, erro, vazio e sem permissão; teclado | 2 | 5–8 h | Toda tela avaliada; registro de preservação funcional por tela |
| 7.2 | Linha de base de usabilidade | 7 cenários do adendo (G) medidos antes: passos, cliques, erros, perda de contexto. Avaliação heurística, sem inventar dados de usuários; teste com o cliente se ele topar | 7.1 | 2–4 h | Tabela "antes" registrada |
| 7.3 | Arquitetura de informação e fluxos | navegação proposta + fluxos antes/depois (cadastro, vários pombos, pesquisa, edição, detalhe, pai/mãe, pedigree, resultados, PDF, compartilhar/copiar, erros) | 7.1 | 4–6 h | Cada fluxo com etapas removidas, mantidas e acrescentadas e o porquê |
| 7.4 | Especificação visual | tokens (cor, tipografia, espaçamento, raios), botões, campos, cartões, diálogos, alertas, vazios, carregamento, foco; contraste AA | 7.3 | 3–5 h | `docs/ux/sistema-visual.md` aprovado |
| 7.5 | Protótipos baixa fidelidade | lista, cadastro/edição, detalhe e árvore (inclui Fase 6) | 7.3, 7.4 | 4–6 h | **Aprovação do responsável** |
| 7.6 | Protótipos detalhados | telas aprovadas em alta fidelidade (página HTML navegável) | 7.5 | 4–6 h | **Aprovação do responsável** |
| 7.7 | Implementação em grupos | componentes compartilhados → lista → cadastro → detalhe → demais telas; um grupo por vez, testes de regressão a cada grupo | 7.6 | 12–18 h | Critérios por grupo; nenhum recurso removido sem aprovação |
| 7.8 | Validação final | cenários de 7.2 medidos depois; responsividade; acessibilidade básica | 7.7 | 2–3 h | Tabela "antes × depois"; pendências priorizadas |
| **8** | **Endurecimento** | contêiner sem root, imagens com versão fixa, cabeçalhos no Caddy, dependências, `docs/ameacas.md` | 2 | 5–8 h | Checklist da seção 19/20 com evidência |
| **9** | **Preparação comercial** | guia do usuário de 1–2 páginas, política de privacidade simples, canal de suporte, checklist de lançamento, aceitação com o cliente | 4, 5, 8 | 6–10 h | Checklist da seção 27 completo |
| **10** | **Merge e lançamento** | PR `dev → main`, deploy, verificação pós-deploy | 9 | 2–3 h | Produção na versão nova; backup do dia restaurável |

Gestão (registro de riscos, decisões, mudanças): esta seção e as seções H e J fazem esse papel. Ao fim de cada fase, só atualizo as tabelas, sem documentos separados.

---

## G. Cronograma

**Premissa a confirmar:** quantas horas por semana o responsável tem. Os cenários abaixo supõem **~10 h/semana**.

Ritmo confirmado: **10 h/semana**. Valores atualizados com o adendo de UX:

| Cenário | Esforço total | + contingência 20% | Semanas (10 h/sem) |
|---|---|---|---|
| Otimista | ~90 h | 108 h | ~11 |
| Provável | ~120 h | 145 h | ~14–15 |
| Conservador | ~160 h | 190 h | ~19 |

**Marcos:**
- **M0** Correção do PDF em produção (semana 1)
- **M1** Plano aprovado
- **M2** Requisitos aprovados
- **M3** "Pronto para o primeiro cliente": fases 0, 4 e 5 concluídas, cerca de **25–40 h, 3–5 semanas**
- **M4** Pedigree interativo
- **M5** UX
- **M6** Lançamento (merge na `main`)

**Caminho crítico provável:** 1 → 3 → 4.1 → 7.1 → 7.3 → 7.5 (aprovação) → 6 + 7.7 → 7.8 → 9 → 10. A UX passou a ser o maior bloco. A Fase 6 é desenhada dentro dos protótipos 7.5/7.6. O pedigree interativo é o maior pacote e depende das regras de integridade.

**Pode correr em paralelo:** a Fase 5 (backup) com 3 e 4, a Fase 8 com 6 e 7. A espera por decisões do responsável (serviço de backup, sexo × papel, aprovação de protótipos) **não está nas horas**. Conte de 1 a 3 dias de calendário por decisão.

**Conflito com a regra "só para a main no fim":** o cliente pode esperar 11 semanas ou mais. Se for preciso atendê-lo antes, a alternativa é um **merge intermediário em M3**: segurança e backup, sem UX nova. A decisão é do responsável.

---

## H. Registro de riscos

| Risco | Prob. | Impacto | Mitigação | Resp. | Residual |
|---|---|---|---|---|---|
| Exploração do PDF antes da correção | Média (exige conta) | Crítico | Correção 0.1 já. Até lá, não criar contas para terceiros | Responsável | Baixo após a troca de segredos |
| Perda da VPS sem backup externo | Baixa a média | Crítico | Fase 5 | Responsável | Baixo |
| Oracle recupera a instância ociosa | Média | Alto | Conta Pay As You Go + monitor | Responsável | Baixo |
| Migração de integridade quebra dados existentes (ex.: ciclos que já existem) | Média | Alto | Antes de travar, rodar uma consulta de diagnóstico numa cópia do banco de produção (pg_dump → banco local) | Dev | Baixo |
| Escopo cresce (o prompt é amplo) | Alta | Médio | Registro de mudanças, MVP em M3, P3 fora | Responsável | Médio |
| `dev` diverge muito da `main` e o merge final fica arriscado | Média | Médio | Fases pequenas com testes; ensaio do merge numa cópia | Dev | Baixo |
| Disponibilidade do responsável | Alta | Médio | Cenários de cronograma; marcos que entregam valor sozinhos | Responsável | Médio |
| Banco de dev exposto na Wi-Fi | Média | Médio a alto | `127.0.0.1` (P1-5) | Dev | Baixo |
| Cópia de interface do concorrente (PombalPro) | Baixa | Médio (jurídico e marca) | Usar só como referência de fluxo | Responsável | Baixo |

---

## I. Plano de segurança e backup

| Verificação / mudança | Prova de eficácia |
|---|---|
| autoescape + `url_fetcher` restrito no PDF | Teste automático: observação com `<a rel="attachment" href="file:///etc/hostname">` e `<img src="http://127.0.0.1:1/x">` → PDF sem `/EmbeddedFile` e nenhuma requisição feita |
| Troca de `SECRET_KEY` e senha do Postgres | Sessão antiga → 401 |
| Limite de login | Teste: 5 erros → 6ª tentativa com 429, inclusive com a senha certa; libera depois do prazo |
| Autorização por recurso | Os testes cruzados já existentes (`test_multiusuario.py`) + novos para vincular pai de outro plantel, ciclo e cópia |
| Backup externo | **RPO proposto:** 24 h (cópia diária). Custo ~zero. RPO menor exige backup contínuo (WAL), desproporcional agora |
| | **RTO proposto:** 4 h (subir VPS nova + restaurar), validado na Fase 5.2 |
| | Criptografia antes de sair da VPS; credencial do destino só com permissão de escrita (sem apagar) |
| Alerta de falha | O script avisa se falhar ou se o arquivo vier vazio. Monitor externo de "backup recente" |
| Teste de restauração | Restaurar num Postgres descartável local, nunca sobre produção. Registrar data, tamanho, tempo e contagem de pombos, usuários e resultados |

Pendente de decisão: o destino do backup externo. Opções de custo zero ou muito baixo: Object Storage da própria Oracle (outra região), Backblaze B2 ou um computador do responsável via `rsync`. Não contrato nada sem aprovação.

---

## J. Critérios de aprovação

**Antes de implementar (o responsável aprova):**
1. A correção do PDF como exceção à regra da `main` (ver K).
2. Este plano: EAP, prioridades e o recorte do MVP em M3.
3. Decisões de produto:
   - sexo × papel: bloquear ou alertar;
   - excluir pombo com descendentes: bloquear ou confirmar;
   - critério da cópia homônima;
   - destino do backup;
   - horas por semana disponíveis.

**Antes de lançar (precisa estar comprovado):**
- P0 e P1 fechados, com testes.
- Restauração de um backup externo registrada.
- Suíte de testes verde.
- Checklist da seção 27.
- Fluxos principais percorridos no celular e no computador.

---

## K. Próxima ação recomendada

**Atualização 2026-11-07:** a Fase 0 está concluída. A próxima é a **Fase 2 complementar**:
- Comandos de leitura na VPS (o responsável executa): instância, disco, portas, firewall, SSH, atualizações, backups, cron, e as consultas de integridade (`pombos_em_ciclo`, pai fêmea/mãe macho, vínculos entre plantéis).
- Passeio no navegador, que vira o insumo da 7.1.

Depois vêm a Fase 3 (requisitos) e, em paralelo, o backup externo (Fase 5).

### Recomendação original (Fase 0, já executada)

**Fase 0: corrigir o PDF agora, como hotfix na `main`.**

- **Por que antes de tudo:** é a única falha que dá controle total do sistema a qualquer usuário com login, e já está em produção. A correção é pequena (2 a 4 h), isolada e fácil de reverter.
- **Por que na `main`, apesar da regra:** manter a falha em produção por semanas, até o fim do projeto, é um risco maior que o de um commit pequeno e testado.
- **Proposta:**
  1. Criar uma branch `hotfix/pdf` a partir da `main`.
  2. Corrigir e testar.
  3. O responsável faz o merge na `main` e o deploy.
  4. Trocar os segredos na VPS.
  5. Trazer o hotfix para a `dev`.
- **Se o responsável preferir manter a regra:** até o fim do projeto, **não criar contas para outras pessoas** (o cliente inclusive).

Em seguida, a **Fase 2 complementar**: comandos de leitura na VPS, que o responsável roda, e `pip-audit`. Com isso o diagnóstico fica completo antes dos requisitos.
