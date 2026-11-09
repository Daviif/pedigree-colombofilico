# Requisitos — Fases 4 e 5 (pronto para o primeiro cliente)

> Fase 3 do plano (`docs/diagnostico.md`). Data: 2026-11-07. Situação: **proposta, aguardando aprovação**.
> Escopo: integridade genealógica, validações, limite de login, ambiente de dev e backup externo. UX e pedigree interativo ficam para a Fase 7 (adendo), com protótipos próprios.
>
> Convenção do projeto: toda regra imposta pelo código está escrita aqui **antes** do código, com teste próprio. Quando implementada, cada regra também entra no README e o teste cita o seu código (ex.: `# RG-03`).

## Decisões do responsável (2026-11-07)

| # | Decisão |
|---|---|
| D1 | Vínculo novo com sexo incompatível (pai fêmea, mãe macho) é **bloqueado**. "Desconhecido" sempre aceito. Os registros antigos inconsistentes (2 pais fêmea e 3 mães macho em produção) **ficam como estão** e recebem um aviso |
| D2 | Excluir pombo que é pai ou mãe de outros é **bloqueado**, com a lista dos filhos |
| D3 | Backup externo vai para o **PC do responsável** |
| D5 | O responsável **não usa gerenciador de senhas**, e o PC fica ligado a maior parte do tempo (2026-11-07). Ajustes em RO-03, RO-04 e RO-10 |
| D4 | Ninguém explorou a falha do PDF: a busca por HTML ou URL nos textos voltou vazia |
| D6 | (2026-11-09) **Oracle Pay As You Go: agora não**, trocar depois. Risco aceito: a conta grátis pode ter a VPS recuperada por ociosidade; o backup no PC (RO-01..10) é a defesa. Rever antes de mais clientes |
| D7 | (2026-11-09) **Monitor externo: sim**, UptimeRobot gratuito (a cada 5 min, aviso por e-mail) olhando `GET /api/saude` (RO-11), que só responde 200 com backend **e** banco funcionando |
| D8 | (2026-11-09) **PDF de 6 gerações fica como está**: com ancestrais cheios de títulos, a legenda e o rodapé vão para uma 2ª página e caixas da última coluna se sobrepõem. Defeito antigo, o layout do PDF não muda |

---

## 1. Regras genealógicas (RG)

| Cód. | Regra | Resposta quando violada | Critério de aceitação / teste |
|---|---|---|---|
| RG-01 | Um pombo não pode ser pai nem mãe de si mesmo | 400 "Um pombo não pode ser pai/mãe de si mesmo" | Já existe. Manter o teste |
| RG-02 | **Sem ciclos:** um pombo não pode ter como pai ou mãe um dos seus descendentes, em qualquer número de gerações | 400 "Esse vínculo faria do pombo X ancestral de si mesmo" | Testes: ciclo de 2 (A↔B), de 3 (A→B→C→A) e de 6 gerações. Vínculo legítimo com ancestral repetido (consanguinidade) continua aceito |
| RG-03 | A verificação de RG-02 é atômica: duas edições simultâneas não podem fechar um ciclo juntas | idem | Trava consultiva por plantel (`pg_advisory_xact_lock`) ao gravar pai ou mãe. Teste com duas threads (A pai de B ‖ B pai de A): no máximo uma passa. **Contraprova:** sem a trava, o teste precisa falhar |
| RG-04 | Pai precisa ter sexo **M** ou **Desconhecido**; mãe precisa ter **F** ou **Desconhecido** (D1) | 400 "O pai precisa ser macho ou de sexo desconhecido" | Testes: criar e editar com pai F → 400; pai Desconhecido → ok |
| RG-05 | A RG-04 só é verificada quando **o vínculo muda**. Editar outros campos de um pombo com vínculo antigo inconsistente continua permitido | — | Teste: pombo com pai F gravado direto no banco; editar a cor → 200 |
| RG-06 | Não é permitido mudar o sexo de um pombo para um valor incompatível com o papel que ele já tem (ex.: é pai de alguém e passa a fêmea). Corrigir para o sexo certo ou para Desconhecido é sempre permitido | 400 "Este pombo é pai de N pombos; não pode ser fêmea" | Testes: pai M → F com filhos → 400; pai F antigo → M → 200 |
| RG-07 | A árvore marca o vínculo inconsistente com um aviso ("⚠ sexo não confere com o papel de pai/mãe"), sem bloquear a visualização nem o PDF | — | Campo `alerta_sexo` no nó da árvore; teste com o registro antigo |
| RG-08 | Pai, mãe e proprietário precisam ser do mesmo plantel do pombo | 400 | Já existe. Manter o teste |
| RG-09 | Excluir um pombo que é pai ou mãe de outro é **bloqueado** (D2) | 409 com `detail` = mensagem + lista das anilhas dos filhos (até 10, mais o total) | Teste: excluir pai → 409 e o filho mantém o `pai_id`. Excluir pombo sem filhos → 204, e os resultados dele somem junto |
| RG-10 | Excluir um proprietário que algum pombo usa é **bloqueado** | 409 "Usado por N pombos" | Teste: 409 e o pombo mantém o proprietário |
| RG-11 | Ancestral desconhecido é representado pela **ausência** de pai ou mãe. O sistema nunca cria pombo fictício para preencher a árvore | — | Revisão de código + teste: árvore de pombo sem pais tem `pai = mae = null` |

## 2. Cópia entre plantéis (RC)

| Cód. | Regra | Critério de aceitação / teste |
|---|---|---|
| RC-01 | Copiar exige poder **ver** o pombo (compartilhamento ou admin). Nunca dá acesso de edição ao original | Já existe. Manter o teste |
| RC-02 | Um ancestral do destino só é **reaproveitado** se a anilha for igual **e** o sexo for compatível (igual, ou um dos dois Desconhecido) **e** a cor for igual, ignorando maiúsculas e espaços (ou uma das duas vazia) | Teste: mesma anilha, mesma cor → reaproveita |
| RC-03 | Se a anilha já existe no destino mas o pombo **não** é compatível (RC-02), a cópia inteira é **cancelada** sem gravar nada | 409 com a lista dos conflitos (`anilha`, cor no original, cor no destino). Teste: a cor diferente que hoje liga o pai errado passa a responder 409, e nada é gravado |
| RC-04 | A cópia respeita RG-02 e RG-04 no destino: um reaproveitamento que criaria ciclo ou sexo incompatível também conta como conflito (RC-03) | Teste com um ancestral reaproveitado de sexo errado |
| RC-05 | A cópia é atômica: ou copia tudo, ou nada | Teste: depois do 409, o destino tem as mesmas contagens de antes |

## 3. Validação de entrada (RV)

Nenhuma entrada do usuário pode gerar erro 500. Os limites acompanham as colunas do banco. Espaços nas pontas são removidos. Texto opcional vazio vira `null`.

| Cód. | Campo | Regra |
|---|---|---|
| RV-01 | Anilha | 1–50 caracteres, só números e `/` (já existe) |
| RV-02 | Pombo: cor ≤ 100, origem ≤ 200, observações ≤ 5.000 | 422 com a mensagem do campo |
| RV-03 | Proprietário: nome obrigatório ≤ 200; colombódromo ≤ 200; endereço ≤ 300; telefone ≤ 50; e-mail ≤ 200; observações ≤ 5.000 | 422 |
| RV-04 | Resultado: competição obrigatória ≤ 200; ano entre 1900 e o ano atual + 1; distância entre 0 e 5.000 km; colocação ≤ 100; prêmio ≤ 200; observação ≤ 5.000 | 422 |
| RV-06 | Senha: no cadastro e na redefinição, de 8 a **72 bytes** (limite do bcrypt; o bcrypt 5 recusa senha maior com erro). No **login**, senha com mais de 72 bytes conta como senha errada (401), nunca 500. *Incluída em 2026-11-07, durante a implementação: o bcrypt 5.0 lança ValueError* | 422 / 401 |
| RV-07 | Mensagens de validação em português e com o nome do campo (ex.: "Cor: no máximo 100 caracteres"), mantendo o formato 422 do FastAPI | Teste da mensagem |
| RV-05 | Corrida no cadastro (duas anilhas iguais ao mesmo tempo, cópia simultânea): a violação de unicidade do banco vira **409**, não 500 | Teste com duas threads ou simulação do `IntegrityError` |

Teste geral: um teste parametrizado que manda o limite e o limite + 1 de cada campo e verifica 2xx e 422.

## 4. Autenticação (RA)

| Cód. | Regra | Critério de aceitação / teste |
|---|---|---|
| RA-01 | **5 falhas** de senha para o mesmo login em 15 minutos bloqueiam **esse login** por 15 minutos | A 6ª tentativa responde **429** "Muitas tentativas. Tente de novo em X minutos", **mesmo com a senha certa** |
| RA-02 | **20 falhas** vindas do mesmo IP em 15 minutos bloqueiam **esse IP** por 15 minutos (protege contra quem testa muitos logins) | Teste com logins variados |
| RA-03 | Só **falhas já ocorridas** contam. Login certo não consome a cota, e vários logins certos simultâneos nunca recebem 429 | Teste com 10 logins certos em paralelo → todos 200. (lição de outro projeto: contar a tentativa ao chegar e descontar no acerto barra logins certos em paralelo) |
| RA-04 | Login certo zera as falhas daquele login | Teste: 4 falhas + 1 acerto + 4 falhas → ainda não bloqueia |
| RA-05 | Login inexistente conta como falha, com o mesmo tempo de resposta (já existe o hash fictício) e a mesma mensagem | Teste: as respostas para login inexistente e senha errada são iguais |
| RA-06 | O IP vem do `X-Forwarded-For` definido pelo Caddy. O Caddy sobrescreve o valor que o cliente manda, e o backend só é acessível pela rede interna do Docker | Teste: com `X-Forwarded-For` diferente, conta por IP. Verificação manual do comportamento do Caddy na Fase 9: ✅ no Caddy 2.11.9 local (2026-11-09: o `X-Forwarded-For` do cliente é trocado pelo IP real; direto no backend, sem Caddy, o falso passaria — por isso o backend fica só na rede interna); ✅ na VPS (2026-11-09: o log do backend mostrou o IP público real, não o `1.2.3.4` enviado) |
| RA-07 | O registro de tentativas fica no Postgres (tabela `tentativas_login`) e as linhas com mais de 24 h são apagadas. Sem Redis e sem serviço novo | Teste da limpeza |
| RA-08 | O admin desbloqueia um login na tela Usuários (redefinir a senha também desbloqueia) | Teste |

## 5. Ambiente e operação (RO)

| Cód. | Regra | Critério de aceitação |
|---|---|---|
| RO-01 | O Postgres de dev publica só em `127.0.0.1:5436` | `ss -ltn` mostra `127.0.0.1:5436`; os testes continuam passando |
| RO-02 | **Backup na VPS:** além do dump diário, o script falha alto (código ≠ 0 e linha `ERRO` no log) se o dump vier vazio ou o gzip estiver corrompido (`gzip -t`) | Teste local do script com um dump forçado a falhar |
| RO-03 | **Cifra:** a cópia que sai da VPS é cifrada lá com **age** para uma chave pública (`deploy/backup.pub`). Na VPS não há nada que decifre. Os backups **locais** da VPS continuam sem cifra (quem invade a VPS já lê o banco; assim, perder a chave privada não inutiliza os backups da VPS) | Arquivo `.sql.gz.age` em `backups/externo/`; tentar decifrar com outra chave falha |
| RO-04 | **Cópia para o PC (D3):** o **PC puxa** os arquivos da VPS (`rsync` via SSH, com timer do systemd do usuário a cada 12 h e 5 min depois de ligar; execução perdida é feita na próxima). **Se a busca falhar** (ex.: o PC acabou de voltar da suspensão e a rede ainda não voltou), tenta de novo **até 3 vezes no total, com 1 min entre elas**, antes de registrar a falha (2026-11-09: 08/11 e 09/11 só chegaram no disparo manual). A VPS não tem credencial nenhuma para o PC. A chave SSH usada pelo PC é **exclusiva** e restrita na VPS a `rrsync -ro` da pasta `backups/externo`: só lê backups cifrados, sem shell | Timer ativo; arquivo do dia aparece no PC; `ssh` com essa chave não abre shell |
| RO-05 | **Retenção no PC:** 14 diários + 8 semanais + 12 mensais. Na VPS: 30 dias (já é assim) | Script de rotação com teste usando datas simuladas |
| RO-06 | **Alerta:** se a cópia mais recente no PC tiver mais de 48 h, o PC mostra uma notificação na área de trabalho ao ligar e a cada execução | Teste: mudar a data do arquivo → notificação |
| RO-07 | **Restauração comprovada:** script que decifra e restaura num Postgres **descartável** local (nunca na produção) e confere as contagens (usuários, pombos, resultados, proprietários) e um login | Registro em `docs/operacao.md`: data, arquivo, tempo, contagens, problemas |
| RO-08 | **Objetivos:** RPO ≤ 24 h **se o PC ligar todo dia**. Com o PC desligado por N dias, o RPO vira N dias (limitação aceita da D3; o backup local da VPS continua diário). RTO ≤ 4 h (VPS nova + deploy + restauração), medido no RO-07 | Valores registrados após o RO-07 |
| RO-10 | **Chave privada do age (D5):** gerada no PC (`~/.config/pedigree-backup/chave-age.txt`, permissão 600), **sem senha**: é uma linha só, que cabe num papel (uma chave com senha vira um bloco de texto que não dá para copiar à mão; e o PC já guarda os dados de dev). Cópias em **papel e pendrive**, guardadas longe do PC. O runbook diz onde estão e como testar a cópia | Teste de restauração usando a cópia do pendrive |
| RO-09 | Os segredos (`.env`) **não** vão no backup e **não são necessários** para recuperar: numa VPS nova, geram-se segredos novos (todos fazem login de novo) e o dump é restaurado no banco novo. O runbook descreve o passo a passo | Revisão do script; ensaio no RO-07 |
| RO-11 | **Saúde para o monitor (D7):** `GET /api/saude`, sem login, responde **200** `{"status": "ok"}` só se o backend consegue fazer `SELECT 1` no banco; se o banco não responder, **503** `{"status": "banco indisponível"}`. Não revela versão, contagens nem dados. O monitor externo olha esse endereço a cada 5 min | Testes: 200 com banco; 503 com o banco falhando; sem login |

## 6. Frontend mínimo desta etapa (RF)

O redesenho é da Fase 7. Aqui entra só o necessário para as regras acima funcionarem para o usuário.

| Cód. | Regra |
|---|---|
| RF-01 | As mensagens de 400, 409 e 429 aparecem para o usuário com o texto do servidor. As listas (filhos que impedem a exclusão, conflitos da cópia) aparecem legíveis |
| RF-02 | Tela de pombo ou árvore com erro de carregamento mostra "Não foi possível carregar" com "Tentar de novo". Pombo inexistente mostra "Pombo não encontrado" com um link para a lista. Nada fica em "Carregando..." para sempre |
| RF-03 | O seletor de pai mostra só machos e Desconhecidos, e o de mãe só fêmeas e Desconhecidos. O servidor continua validando (RG-04) |

## 7. Cenários do prompt mestre (seção 24) × onde são testados

| # | Cenário | Teste |
|---|---|---|
| 1–4 | Sem pais / só pai / só mãe / ambos | RG-11 + testes da árvore existentes (ampliar) |
| 5–6 | Cadastrar ou vincular ancestral pelo pedigree | Fase 6/7 (UI); a API já é coberta por RG-01..08 |
| 7–8 | Anilha duplicada no mesmo plantel / igual em outro | Existentes + RV-05 |
| 9 | Pombo de outro plantel como pai | RG-08 |
| 10 | O próprio pombo como pai | RG-01 |
| 11 | Ciclo indireto | RG-02, RG-03 |
| 12 | Ancestral repetido | Existente (`duplicado`) + RG-02 (não bloquear) |
| 13–14 | Cópia com vários ancestrais / reaproveitamento | RC-02..05 |
| 15 | Exclusão de ancestral | RG-09 |
| 16 | PDF com genealogia incompleta | Novo teste: PDF de pombo sem pais e com só a mãe |
| 17 | Várias gerações | Teste de árvore e PDF com 6 gerações |
| 18 | Falha de rede durante o vínculo | RF-02 (manual na Fase 7) |
| 19 | Sem permissão alterando a árvore | Existentes (403/404) |
| 20 | Consistência após editar | Teste: trocar o pai e conferir árvore, irmãos e PDF |

## 8. Fora deste escopo (registrado para não se perder)

- Pedigree interativo, redesenho e sistema visual → Fase 7.
- Endurecimento da VPS (`.env` 600, rpcbind, atualizações, contêiner sem root, versões fixas, cabeçalhos do Caddy, WeasyPrint 70) → Fase 8.
- Oracle Pay As You Go → D6 (agora não). Monitor externo → D7 (sim, RO-11).
- Revogar a sessão no logout → P3, aceito.

## 9. Plano de migração e reversão

- **Uma migração nova:** cria a tabela `tentativas_login`. Não altera dados existentes.
- **RG-02 a RG-09 não exigem migração:** são verificações na API. Em produção há 0 ciclos e 0 vínculos entre plantéis. Os 5 vínculos de sexo inconsistente ficam como estão (RG-05).
- **Antes do merge:** rodar `deploy/integridade.sql` numa cópia local do banco de produção (pg_dump → banco local) com a versão nova e conferir que todos os pombos abrem, a árvore monta e o PDF é gerado.
- **Reversão:** `alembic downgrade -1` remove só a tabela nova, e o código anterior volta com `git revert`. Os dados dos pombos não são tocados.

## 10. Estimativa (atualiza os pacotes 4 e 5 do diagnóstico)

| Bloco | Horas |
|---|---|
| RG + RC (integridade e cópia) | 7–11 |
| RV (validações) | 2–3 |
| RA (limite de login) | 4–6 |
| RF (mensagens, erro, seletores) | 3–5 |
| RO-01 | 0,5 |
| RO-02..09 (backup no PC + restauração + runbook) | 6–9 |
| **Total** | **~23–35 h ≈ 3 semanas a 10 h/semana** |

Ordem proposta, cada item com commit próprio na `dev`:
1. RO-01, que é trivial;
2. RG;
3. RC;
4. RV;
5. RA;
6. RF;
7. RO-02..09.

Os itens 1 a 6 são só código e testes. O item 7 precisa de você na VPS e no seu PC.
