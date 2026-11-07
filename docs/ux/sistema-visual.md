# Sistema visual mínimo — 7.4

> Situação: **proposta, aguardando aprovação**. Feito para um app pequeno: só o necessário para as telas ficarem coerentes.
> Implementação: tokens no `@theme` do Tailwind 4 (`frontend/src/index.css`) + poucos componentes em `frontend/src/components/ui/`. **Nenhuma biblioteca nova.**

## 1. Princípios
1. **O pombo é o assunto.** A anilha é sempre o texto mais forte da tela.
2. **Uma ação principal por tela**, em azul. As outras são secundárias, e as perigosas ficam separadas.
3. **Denso onde se consulta** (lista, árvore) e **folgado onde se digita** (formulários).
4. Identidade de colombofilia (azul-marinho e dourado): **menu superior** azul-marinho, ♂/♀ e abas no detalhe. **O layout do certificado PDF não muda** (decisão do responsável, 2026-11-07).

## 2. Cores (tokens) — identidade azul-marinho e dourado (escolhida em 2026-11-07)

Escolhida entre as referências do responsável (verde/dourado, **azul-marinho/dourado**, escuro). Contrastes calculados pela fórmula WCAG 2.x.

| Token | Uso | Valor | Contraste |
|---|---|---|---|
| `marinho` | barra do menu superior, faixa de cabeçalho do pombo, títulos fortes | `#0f1f3d` (hover `#1a3160`) | branco sobre ele: **16,4:1** ✓ |
| `dourado` | **ação principal** (botão dourado com texto marinho), item ativo do menu, destaques | `#e3b04b` | marinho sobre dourado: **8,2:1** ✓ · dourado sobre marinho: 8,2:1 ✓ |
| `dourado-texto` | texto dourado sobre fundo claro (ícones de troféu, rótulos) | `#8a5a00` | sobre branco: 5,9:1 ✓ — **nunca** use `#e3b04b` como texto sobre claro (2,0:1 ✗) |
| `link` | links e anilhas clicáveis | `#1d4ed8` | sobre branco: 6,7:1 ✓ |
| `texto` / `texto-suave` | corpo / secundário | `#0f172a` / `#475569` | 17,9:1 ✓ / 7,6:1 ✓ |
| `menu-texto` | itens do menu lateral | `#cbd5e1` sobre marinho | 11,0:1 ✓ |
| `fundo` / `cartao` / `borda` | página / cartões / bordas | `#f4f6fa` / `#fff` / `#dbe1ea` | — |
| `sucesso` · `perigo` · `aviso` | salvo · excluir, erro · repetido, só leitura | green-700 · red-700 · amber-800 sobre fundos claros | 4,8 · 5,9 · 6,8 ✓ |
| `macho` / `femea` | símbolos **♂ / ♀** sempre acompanhados do texto ("Macho") | `#2563eb` / `#db2777` | — |

**Situação** (selo): Ativo = verde claro · Reprodutor = dourado claro com texto `dourado-texto` · Vendido = âmbar · Falecido = cinza riscado.

**Fora do escopo por decisão do responsável:** modo escuro (só se o cliente pedir).

### Imagens e ícones
- **Logo:** pomba branca de asas abertas, **vetorizada (potrace) da imagem de referência do responsável** (`docs/ux/prototipos/img/logo-pomba.svg`). Se houver o arquivo original em alta resolução, vetorizar de novo a partir dele.
- **Ícones de interface:** [Lucide](https://lucide.dev), licença ISC. **Não** desenhar ilustração à mão.
- **Foto:** pombo-correio de licença livre (`docs/ux/prototipos/img/`, créditos em `CREDITOS.md`), com o crédito visível no rodapé (exigência da CC BY-SA). Se o responsável ou o cliente fornecer uma foto própria, ela substitui esta.

## 3. Tipografia
Fonte do sistema (sem download): `ui-sans-serif, system-ui`. **Anilha em `tabular-nums`** para alinhar os números na lista.

| Nível | Uso | Tamanho / peso |
|---|---|---|
| Título da página | "Pombos", anilha no detalhe | 24 px / 600 (anilha no detalhe: 28 px) |
| Seção | "Árvore genealógica", "Resultados" | 18 px / 600 |
| Corpo | texto, tabela, campos | 14 px (16 px nos campos do celular, por causa do zoom do iOS) |
| Pequeno | rótulos da árvore ("AVÓ MATERNA"), dicas | 12 px / 500 |

## 4. Espaço, bordas, sombras
- Escala de 4 px: 4 · 8 · 12 · 16 · 24 · 32. Entre seções: 24; dentro do cartão: 16 (celular) e 20 (desktop).
- Raio: 8 px em cartões e botões; 6 px em campos; 999 px em selos.
- Sombra só em cartões (`shadow-sm`) e no painel lateral e diálogos (`shadow-lg`).

## 5. Componentes (os únicos que serão criados)

| Componente | Variações e estados | Substitui |
|---|---|---|
| `Botao` | primária · secundária · fantasma · perigo; normal, hover, foco, desabilitado, **carregando** ("Salvando…") | ~15 classes repetidas |
| `Campo` | rótulo sempre visível, dica, **erro embaixo do campo** (vermelho + ícone), obrigatório (*) | `Campo` do PomboForm |
| `Selo` | situação, sexo, "Só leitura" | textos crus (UX-05) |
| `Cartao` | com título e ação opcional | divs repetidas |
| `Dialogo` | confirmação (título, o que acontece, botões "Cancelar" e ação); perigo em vermelho; **Esc fecha, o foco fica preso dentro e volta ao botão de origem** | `confirm()`/`alert()` (UX-09) |
| `Aviso` | sucesso · erro · aviso · info, com `role="status"`/`alert` | caixas coloridas soltas |
| `Vazio` | ícone + frase + ação ("Nenhum pombo ainda. + Cadastrar o primeiro") | textos soltos |
| `Carregando` | esqueleto de linhas (lista) e de caixas (árvore) | "Carregando…" (UX-14) |
| `PainelLateral` | desktop: à direita, 420 px; celular: de baixo para cima, 85% da altura; foco e Esc como no Diálogo | — (novo, para a árvore) |
| `FalhaAoCarregar` | já existe (Fase 4); passa a usar `Botao` e `Aviso` | — |

## 6. Foco e teclado
- **Anel de foco** em tudo que é clicável: `outline 2px blue-600, offset 2px`, só com `:focus-visible` (não aparece no clique do mouse).
- Busca global: `/` foca; Enter abre o primeiro resultado; Esc fecha.
- Seletor de pai/mãe: papel de combobox, ↑ ↓ escolhem, Enter confirma, Esc fecha.
- Todos os filtros com rótulo (visível ou `aria-label`).
- Alvo de toque mínimo de 44 × 44 px no celular.

## 7. Critérios de aceitação
- [ ] Tokens e componentes aprovados.
- [ ] Na implementação: nenhum texto com contraste abaixo de 4,5:1, foco visível em todos os controles (verificação com Playwright + teclado), alvos ≥ 44 px no celular.
