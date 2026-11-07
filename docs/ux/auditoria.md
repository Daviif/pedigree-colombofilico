# Auditoria de UX — 7.1 e 7.2 (linha de base)

> Fase 7 do plano (adendo de refatoração de UX/UI). Data: 2026-11-07. Branch `dev`, com as Fases 0 e 4 já aplicadas.
> **Nenhuma tela foi alterada nesta etapa.**

## Método e limitações

- O sistema rodou de verdade (frontend de dev + backend + Postgres de dev) e foi percorrido com Playwright em **desktop (1366 px)** e **celular (390 px, toque)**.
- Usuário temporário `auditoria`, que vê o plantel de dev por compartilhamento e copiou 3 pombos com ancestrais. Assim foram vistos os estados vazio, com dados, só leitura, erro de rede (simulado bloqueando `/api/pombos`) e "não encontrado".
- Foram geradas 28 capturas; as 5 principais estão em `docs/ux/antes/`.
- Roteiros reproduzíveis em `docs/ux/scripts/`. Para rodar: `UX_SENHA=… python3 cenarios.py <pasta>`.
- **Limitações:**
  - **Não houve teste com usuários reais.** As frequências abaixo são **hipóteses a validar**.
  - O "tempo" medido é o da máquina, não o de uma pessoa. Por isso a métrica principal é o **número de ações** (cliques, campos preenchidos, opções escolhidas).
  - Não foi usado leitor de tela. A acessibilidade foi avaliada pelo código e pela navegação por teclado.
  - Tablet não foi testado à parte: o layout só muda em 640 px, então tablet usa a versão desktop.

## 1. Inventário de telas

| Tela | Rota | Tarefa | Frequência (hipótese) | Estados vistos |
|---|---|---|---|---|
| Login | (sem rota) | entrar | toda sessão (30 dias) | normal, erro |
| Painel | `/` | visão geral, últimos cadastrados | alta (porta de entrada) | vazio, com dados |
| **Lista de pombos** | `/pombos` | achar, filtrar, abrir | **muito alta** | vazio, dados, compartilhado, erro |
| **Novo / editar pombo** | `/pombos/novo`, `/pombos/:id/editar` | cadastrar, corrigir, ligar pai/mãe | **muito alta** (temporada de anilhamento) | novo, edição, não encontrado |
| **Detalhe + árvore** | `/pombos/:id` | consultar, ver pedigree, PDF, resultados, irmãos | **muito alta** | dono, só leitura, não encontrado |
| Reprodutores | `/reprodutores` | ver machos e fêmeas reprodutores | média | vazio, dados |
| Proprietários | `/proprietarios` | cadastro de donos/pombais | baixa | vazio, dados |
| Compartilhar | `/compartilhar` | dar/retirar acesso de leitura | baixa | vazio |
| Usuários (admin) | `/usuarios` | gestão de contas | baixa (só admin) | — |
| Certificado PDF | download | imprimir/enviar o pedigree | alta | 4 a 6 gerações |

Componentes compartilhados que já existem: `Layout` (menu), `PomboSelect` (busca + cadastro rápido de pai/mãe), `PedigreeTree`, `ResultadosSection`, `IrmaosSection`, `ProprietarioHeader`, `FalhaAoCarregar`.

## 2. O que funciona bem e deve ser preservado

| Tela | Preservar |
|---|---|
| Lista (desktop) | Tabela densa, que mostra muitos pombos de uma vez, com a anilha clicável. Os filtros por sexo, situação e proprietário ficam no lugar. |
| Lista (celular) | Cartões legíveis, com pai e mãe visíveis. |
| Cadastro | **Formulário único e compacto** (9 campos, 2 colunas). Cadastrar um pombo leva **6 ações**. Não deve virar formulário por etapas. |
| `PomboSelect` | Busca por anilha **e** "Cadastrar pai agora" sem sair do formulário. É a base do pedigree interativo. |
| Detalhe | PDF em 1 clique; "Copiar para meu plantel"; aviso de plantel compartilhado; ⚠ de ancestral repetido e de sexo. |
| Erros | Os estados novos da Fase 4: "Não foi possível carregar… / Tentar de novo" e "Pombo não encontrado" (confirmados nas capturas 16 e 17). |
| Celular | O menu ☰ e os campos com 16 px (sem o zoom do iOS). |

Recursos que **não podem sumir** (preservação funcional): todos os campos do pombo; filtros da lista; seletor de plantel (meu, compartilhados, todos); escolha de gerações; PDF; cópia; irmãos; resultados; exclusão protegida; tela Compartilhar; tela Usuários; avisos de consanguinidade e de sexo.

## 3. Problemas encontrados

Gravidade: **Alta** = impede ou atrapalha muito uma tarefa frequente · **Média** = atrapalha ou confunde · **Baixa** = acabamento.

| ID | Tela | Problema e evidência | Impacto | Frequência (hipótese) | Grav. | Solução proposta |
|---|---|---|---|---|---|---|
| UX-01 | Árvore (celular) | Mostra só o pombo e os pais, **cortados na borda**, com ~700 px de espaço vazio. Avós e bisavós ficam fora da tela, numa rolagem lateral sem nenhuma indicação (`celular-12-detalhe.png`) | O pedigree é **inutilizável no celular** | Alta | **Alta** | No celular, uma geração por vez: pombo → pais → avós, tocando para descer, com "voltar ao principal" |
| UX-02 | Árvore (desktop) | A 4ª geração sai cortada à direita (a rolagem existe, mas não aparece). Caixas com resultados ficam mais altas e desalinham os ramos; linhas verticais longas soltas (`desktop-12-detalhe.png`) | Leitura difícil; parece incompleta | Alta | Média | Colunas por geração com altura igual por nível; resultados resumidos ("4 provas") e detalhe ao passar o mouse ou abrir |
| UX-03 | Árvore | **Ancestral desconhecido não aparece como vaga.** Quando um ramo para, não há caixa "Desconhecido"; ela só surge se o irmão daquele ramo existir. Não há "+ adicionar" na árvore. Medido: completar o pai leva **9 ações** (10 no celular) e **sai da árvore**. O avô exige ir antes ao pai (+2) | Completar o pedigree, a tarefa central, é lento e perde o contexto | Alta | **Alta** | Todas as vagas até a geração escolhida aparecem como **"+ Pai" / "+ Mãe"**, que abrem um painel: buscar existente (já filtrado pelo sexo) ou cadastrar novo. Salva e a árvore recarrega no mesmo lugar (Fase 6) |
| UX-04 | Detalhe | O cartão do proprietário, em MAIÚSCULAS e com faixa azul, vem **antes** e com mais destaque que o próprio pombo | Hierarquia invertida: o assunto da página é o pombo | Alta | Média | Cabeçalho do pombo primeiro (anilha grande, sexo, cor, situação); proprietário como uma linha abaixo |
| UX-05 | Lista, detalhe, árvore | Códigos crus: `M`, `F`, `ATIVO`, `DESCONHECIDO` | Pouco amigável; parece sistema técnico | Muito alta | Média | Rótulos ("Macho", "Ativo") e um selo de situação com cor (Reprodutor, Vendido, Falecido) |
| UX-06 | Resultados | O formulário tem **um campo só** (texto livre), mas o modelo tem ano, distância, colocação e prêmio. Os dados ficam despadronizados, e o PDF só ordena por ano se o ano for preenchido (o que esta tela não faz) | Resultados inconsistentes no certificado | Média | Média | Formulário curto em linha: ano, prova, km, colocação (prêmio e observação opcionais) |
| UX-07 | Navegação | **Sem busca global.** Achar um pombo pela anilha exige ir à lista (3 ações no desktop, 4 no celular). O filtro da lista não tem rótulo | Tarefa mais comum mais lenta que o necessário | Muito alta | Média | Campo "Buscar anilha" fixo no topo (atalho `/`), que abre direto quando há um resultado só |
| UX-08 | Cadastro | Depois de salvar, vai para o detalhe. Para cadastrar o próximo, mais 2 ações | Cadastro em série (filhotes da temporada) cansativo | Alta na temporada | Média | Botão **"Salvar e cadastrar outro"**, mantendo pai, mãe, proprietário e cor, que costumam se repetir entre irmãos |
| UX-09 | Detalhe, proprietários | Ações destrutivas ao lado das comuns, com o mesmo peso ("Excluir" junto de "Editar"). Confirmações e erros usam `confirm()`/`alert()` nativos (10 usos), fora do visual e confusos no celular | Risco de clique errado; aparência de erro do navegador | Média | Média | "Excluir" num menu "Mais ações"; diálogo próprio de confirmação; avisos no padrão visual |
| UX-10 | Lista | Pai e mãe não são clicáveis; não mostra quantos pombos aparecem; sem ordenação por coluna | Pequenos atritos | Alta | Baixa | Links em pai/mãe; "24 pombos"; ordenar por anilha e por ano da anilha |
| UX-11 | Cadastro | A cor é texto livre ("Azul", "azul", "Escama"…). Não há sugestões | Filtros e relatórios inconsistentes | Alta | Baixa | Sugestões com as cores já usadas no plantel (`datalist`), sem impedir outra cor |
| UX-12 | Acessibilidade | Filtros sem `<label>` (só placeholder); o `PomboSelect` não tem papel de combobox nem navegação por setas; nenhum estilo de foco próprio (depende do navegador); menu ☰/✕ como texto | Teclado e leitor de tela com dificuldade | — | Média | Rótulos (visíveis ou `aria-label`); combobox acessível com setas e Enter; anel de foco padrão do sistema visual |
| UX-13 | Painel | 3 números e 5 últimos cadastrados. Não leva à ação mais comum (buscar ou cadastrar). "Início" no menu e "Painel" no título | Página de entrada pouco útil | Alta | Baixa | Busca por anilha + "Novo pombo" em destaque + últimos cadastrados; um nome só |
| UX-14 | Estados | "Carregando..." em texto; no erro da lista, o cabeçalho da tabela vazia continua aparecendo abaixo da mensagem (`desktop-17`) | Acabamento | — | Baixa | Esqueleto leve no carregamento; esconder a tabela no erro |
| UX-15 | Árvore/PDF | O seletor "Gerações" vale também para o PDF, mas isso não está dito | O PDF sai com menos gerações que o esperado | Média | Baixa | Texto no botão: "Gerar PDF (4 gerações)" |

**Prioridade para os protótipos (7.5):** UX-01, UX-03 e UX-02 (árvore) → UX-04, UX-05 e UX-09 (detalhe) → UX-07, UX-10 e UX-13 (encontrar) → UX-08, UX-11 e UX-06 (cadastro e resultados) → UX-12, UX-14 e UX-15.

## 4. Linha de base dos cenários (adendo G) — "antes"

Executados de verdade com `docs/ux/scripts/cenarios.py`. **Ações** = cliques + campos preenchidos + opções escolhidas, contando a partir da tela inicial. Todos terminaram com sucesso.

| Cenário | Desktop | Celular | Perda de contexto / observação |
|---|---|---|---|
| S1 Cadastrar um pombo (anilha, sexo, cor) | 6 | 7 | Termina no detalhe; para o próximo, +2 |
| S2 Cadastrar com pai e mãe já existentes | 10 | 11 | Busca de pai e mãe funciona bem |
| S3 Encontrar um pombo pela anilha | 3 | 4 | Sem busca global |
| S4 Corrigir um dado (cor) | 6 | 7 | — |
| S5 Adicionar um ancestral desconhecido (o pai) | 9 | 10 | **Sai da árvore**; para o avô, +2 e mais perda de contexto; a árvore não mostra a vaga |
| S6 Gerar o PDF | 4 | 5 | O PDF usa as gerações escolhidas na tela (não está dito) |
| S7 Tarefas no celular | ver coluna | — | S1–S6 possíveis no celular, mas **a árvore não é legível** (UX-01) |

**Erros e ajuda:** nenhum erro de execução. Nas tarefas simuladas não houve necessidade de ajuda; isso só pode ser medido com pessoas.

## 5. Próximos passos (precisam da sua aprovação para seguir)

1. **7.3:** arquitetura de navegação e fluxos de antes e depois para os 11 fluxos do adendo D.
2. **7.4:** sistema visual mínimo (cores, tipografia, espaçamento, componentes e foco).
3. **7.5:** protótipos de baixa fidelidade de **lista, cadastro, detalhe e árvore** (inclui a Fase 6) para aprovação **antes** de qualquer mudança nas telas.

Metas para a medição "depois" (7.8), a validar nos protótipos:
- S3 em 2 ações, pela busca global;
- S5 em ≤ 5 ações, sem sair da árvore;
- S1 em série com "+1 ação" por pombo seguinte;
- árvore legível no celular.
