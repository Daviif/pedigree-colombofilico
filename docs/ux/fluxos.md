# Navegação e fluxos — 7.3

> Base: `docs/ux/auditoria.md` (problemas UX-xx e linha de base S1–S6). Situação: **proposta, aguardando aprovação**.
> Princípio: menos passos nas tarefas frequentes, **sem** tirar validações, permissões ou clareza.

## 1. Arquitetura de informação

### Hoje
Menu: Início · Pombos · Reprodutores · Proprietários · Compartilhar (· Usuários). Não há busca global; "Início" no menu e "Painel" no título.

### Proposta
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🐦 Pedigree   [🔍 Buscar anilha…  /]   Pombos  Reprodutores  Mais ▾   Nome ▾ │
└──────────────────────────────────────────────────────────────────────────────┘
  Mais ▾  = Proprietários · Compartilhar · Usuários (admin)
  Nome ▾  = Sair
```
- **Busca por anilha sempre visível** (atalho `/`). Com um resultado só, abre direto; com vários, mostra uma lista curta; com nenhum, oferece "Cadastrar 12345/26". Resolve UX-07 e UX-13.
- **Pombos** é o centro. O painel vira a página inicial com: busca grande, "+ Novo pombo" e os últimos cadastrados. Um nome só: "Início".
- As telas raras (Proprietários, Compartilhar, Usuários) vão para "Mais". O menu de topo fica com o que é frequente.
- **Celular:** cabeçalho com 🐦, 🔍 e ☰. A lupa abre a busca em tela cheia. O menu ☰ continua igual (ele funciona bem).
- **Onde estou / como volto:** título da página com "‹ Voltar" contextual (do detalhe para a lista com os filtros que estavam; de um ancestral para o pombo de onde se veio).

## 2. Fluxos — antes × depois

Ações contadas como na auditoria (cliques + campos + escolhas), a partir da tela inicial, no desktop. "=" mantido, "−" removido, "+" acrescentado.

| # | Fluxo | Antes | Depois (proposto) | Mudanças e porquê |
|---|---|---|---|---|
| 1 | **Cadastro individual** | 6 (Pombos → Novo → anilha → sexo → cor → Salvar) | **5** (Novo na página inicial → anilha → sexo → cor → Salvar) | − ir à lista antes. = formulário único (preservado) |
| 2 | **Vários pombos em série** | +8 por pombo seguinte (voltar à lista, Novo, refazer pai/mãe…) | **+3** por pombo seguinte (anilha → sexo → "Salvar e cadastrar outro") | + botão "Salvar e cadastrar outro", que mantém pai, mãe, proprietário e cor (irmãos de ninhada repetem esses campos). A anilha seguinte é sugerida (último número + 1), editável (UX-08) |
| 3 | **Pesquisa e filtros** | 3 (Pombos → filtro → clicar) | **2** (busca no topo → Enter) | + busca global. = filtros da lista (com rótulos, UX-12), + contagem "24 pombos" e ordenação (UX-10) |
| 4 | **Edição e correção** | 6 | **5** (busca → Enter → Editar → campo → Salvar) | = mesmo formulário. Volta para o detalhe com a mensagem "Salvo" |
| 5 | **Consulta de detalhes** | 3 | **2** | Cabeçalho do pombo primeiro (UX-04), rótulos legíveis (UX-05), pai e mãe clicáveis |
| 6 | **Pai e mãe** | 10 (no formulário) | 10 no formulário (=) **ou** 3 por genitor pela árvore | = o seletor com busca (já bom). + filtro por sexo (feito na Fase 4). + caminho pela árvore (fluxo 7) |
| 7 | **Completar o pedigree** | 9 para o pai, saindo da árvore; avô +2 e mais perda de contexto | **3 a 5 sem sair da árvore**: clicar a vaga "+ Pai" → buscar e escolher (3), ou "Cadastrar novo" → anilha → cor → Salvar (5) | + vagas explícitas até a geração escolhida; + painel lateral (no celular, de baixo para cima); a árvore recarrega no mesmo lugar. Validação no servidor (RG-02/04/08) inalterada (UX-03) |
| 8 | **Consulta de resultados** | Lista em texto livre | Tabela curta: ano · prova · km · colocação | + campos estruturados (o modelo já tem); o PDF passa a ordenar por ano (UX-06) |
| 9 | **Gerar PDF** | 4 | **3** (busca → Enter → "PDF (4 gerações)") | O botão diz quantas gerações vão (UX-15) |
| 10 | **Compartilhar e copiar** | Compartilhar: 3 · Copiar: 3 + confirmação nativa | = número de passos | Confirmação num diálogo próprio que diz o que vai acontecer; em conflito (RC-03), a lista de conflitos no diálogo, com link para cada pombo do seu plantel (UX-09) |
| 11 | **Erros e recuperação** | Feito na Fase 4 (Tentar de novo, Não encontrado) | = e mais: o formulário **nunca perde o que foi digitado** num erro do servidor; erro de campo (422) aparece **ao lado do campo** | Hoje o erro aparece só no topo do formulário |

## 3. Árvore genealógica — telas grandes × pequenas

Alternativas avaliadas:

| Alternativa | Desktop | Celular | Decisão |
|---|---|---|---|
| A. Árvore inteira com rolagem lateral (hoje) | Funciona, mas corta a 4ª geração e desalinha | **Ilegível** (UX-01) | ✗ |
| B. Zoom e arrastar (pan) | Bom para árvores grandes | Gestos conflitam com a rolagem da página; precisa de biblioteca | ✗ (custo e complexidade) |
| C. **Colunas por geração com altura fixa** (desktop) + **uma geração por vez** (celular) | Cabe 4 gerações em 1366 px sem rolagem; 5 e 6 com rolagem visível | Toque no ancestral = ele vira o centro (mostra ele e os pais); trilha "Pombo › Pai › Avô" para voltar | ✓ **escolhida**: sem biblioteca, resolve UX-01/02 |

Regras da árvore (valem para os dois tamanhos):
1. O pombo principal fica destacado (borda grossa, sempre no início).
2. Pai em cima e mãe embaixo, com rótulo ("Pai", "Avó materna").
3. **Vaga desconhecida** = caixa tracejada "+ Pai" / "+ Mãe", só para quem pode editar. No modo só leitura aparece "Desconhecido", sem botão. **Nunca** um pombo fictício (RG-11).
4. Caixa de altura fixa: anilha, sexo e cor, dono abreviado, "🏆 4 provas" (não a lista inteira).
5. Aviso de repetido (⚠ amarelo) e de sexo (⚠ vermelho): os de hoje, mantidos.
6. Clicar na caixa de um ancestral cadastrado abre um resumo com "Abrir pombo" e "Ver a árvore dele".

## 4. Critérios de aceitação desta etapa

- [ ] Arquitetura (seção 1) aprovada.
- [ ] Os 11 fluxos (seção 2) aprovados ou ajustados.
- [ ] Alternativa C para a árvore aprovada.
- [ ] Protótipos de lista, cadastro, detalhe e árvore aprovados (`docs/ux/prototipos/baixa-fidelidade.html`).
