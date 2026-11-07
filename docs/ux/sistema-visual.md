# Sistema visual mínimo — 7.4

> Situação: **proposta, aguardando aprovação**. Feito para um app pequeno: só o necessário para as telas ficarem coerentes.
> Implementação: tokens no `@theme` do Tailwind 4 (`frontend/src/index.css`) + poucos componentes em `frontend/src/components/ui/`. **Nenhuma biblioteca nova.**

## 1. Princípios
1. **O pombo é o assunto.** A anilha é sempre o texto mais forte da tela.
2. **Uma ação principal por tela**, em azul. As outras são secundárias, e as perigosas ficam separadas.
3. **Denso onde se consulta** (lista, árvore) e **folgado onde se digita** (formulários).
4. Mudanças pequenas sobre o que já existe: os mesmos azuis e cinzas de hoje, mais organizados.

## 2. Cores (tokens)

| Token | Uso | Valor (Tailwind) | Contraste com o texto |
|---|---|---|---|
| `primaria` | ação principal, links, foco | `blue-600` / hover `blue-700` | branco sobre blue-600: 5,2:1 ✓ AA |
| `texto` | texto principal | `slate-900` | sobre branco: 17,9:1 ✓ |
| `texto-suave` | rótulos, dados secundários | `slate-600` | 7,6:1 ✓ (hoje há `slate-400` em texto: **2,6:1 ✗**; troca para slate-500 = 4,8:1 ou slate-600) |
| `borda` | campos, cartões | `slate-300` (campos) / `slate-200` (cartões) | — |
| `fundo` | página / cartão | `slate-50` / `white` | — |
| `sucesso` | salvo, ativo, PDF | `green-700` texto, `green-50` fundo | 4,8:1 ✓ |
| `perigo` | excluir, erro | `red-700` texto, `red-50` fundo | 5,9:1 ✓ |
| `aviso` | ancestral repetido, só leitura | `amber-800` texto, `amber-50` fundo | 6,8:1 ✓ |
| `macho` / `femea` | marcador de sexo na árvore | `sky-600` / `rose-600` (só a borda esquerda da caixa, nunca a única pista: o texto diz "Macho") | — |

**Situação do pombo** (selo): Ativo = cinza · Reprodutor = azul · Vendido = âmbar · Falecido = cinza riscado. Sempre com texto, nunca só cor.

Contrastes calculados pela fórmula WCAG 2.x com os valores hex da paleta Tailwind (o Tailwind 4 usa OKLCH, então a diferença pode ser de ±0,1). A confirmação final será feita no navegador.

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
