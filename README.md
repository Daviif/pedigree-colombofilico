# Sistema de Pedigree Colombófilo

Sistema para cadastro de pombos-correio, vínculo de pai/mãe, geração automática da árvore genealógica (com sinalização de consanguinidade), histórico de resultados/campeonatos e emissão de certificado de pedigree em PDF.

Stack: React + Vite (frontend) · FastAPI (backend) · PostgreSQL (via Docker).

## Como rodar localmente

### 1. Banco de dados (PostgreSQL via Docker)

```bash
cd backend
docker compose up -d
```

Sobe o Postgres na porta **5436** (ajustada para não conflitar com outros bancos já rodando nesta máquina; se não houver conflito no seu ambiente, pode trocar a porta em `backend/docker-compose.yml` e em `backend/.env`).

### 2. Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt   # inclui pytest; a imagem de produção usa só requirements.txt
alembic upgrade head
python -m app.criar_usuario admin --admin   # só na primeira vez: usuário para entrar no sistema
uvicorn app.main:app --reload --port 8010
```

API disponível em `http://localhost:8010` (porta 8010 escolhida porque a 8000 já estava em uso neste ambiente; pode trocar livremente, só ajuste o proxy no `frontend/vite.config.ts`).

Rodar os testes automatizados: `python -m pytest` (cria automaticamente um banco `pedigree_test` separado).

### 3. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Testes do frontend (componentes, Vitest + Testing Library): `npm test`.

Acesse a URL impressa pelo Vite (por padrão `http://localhost:5173`, ou a próxima porta livre). As chamadas para `/api/*` são redirecionadas automaticamente para o backend.

## Deploy (VPS Oracle Cloud Free Tier)

Produção roda tudo em Docker numa VPS só: Postgres + backend (FastAPI/WeasyPrint) + Caddy (serve o front-end, faz proxy de `/api` e emite HTTPS automático via Let's Encrypt). O acesso é pela tela de login do próprio sistema (sessão em cookie `httpOnly`, válida por 30 dias). Arquivos em [`deploy/`](deploy). Funciona tanto na instância ARM (Ampere A1) quanto na AMD micro.

### 1. Preparar a VPS (uma vez)

1. Crie a instância (Ubuntu 22.04/24.04) e anote o IP público.
2. Na Oracle Cloud, em **Networking → VCN → Security List**, adicione regras de entrada (ingress) TCP para as portas **80** e **443** (origem `0.0.0.0/0`).
3. As imagens Ubuntu da Oracle também bloqueiam essas portas no firewall interno. Na VPS:
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```
4. Instale Docker: `curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER` (saia e entre de novo na sessão SSH).
5. Domínio: aponte um registro DNS `A` para o IP da VPS. Sem domínio próprio, use `<ip-com-hífens>.sslip.io` (ex: `129-151-10-20.sslip.io`), que já resolve para o IP sem configurar nada.

### 2. Subir o sistema

```bash
git clone <url-do-repo> pedigree && cd pedigree/deploy
cp .env.example .env
openssl rand -hex 32        # cole como SECRET_KEY no .env
nano .env                   # DOMAIN, POSTGRES_PASSWORD, SECRET_KEY
docker compose up -d --build
docker compose exec backend python -m app.criar_usuario admin --nome "Seu Nome" --admin
```

As migrações (`alembic upgrade head`) rodam sozinhas a cada início do backend. Acesse `https://SEU-DOMINIO` (no celular também) e entre com o usuário criado.

### Usuários

```bash
cd ~/pedigree/deploy
docker compose exec backend python -m app.criar_usuario LOGIN --nome "Nome Exibido"   # cria
docker compose exec backend python -m app.criar_usuario LOGIN                         # troca a senha
```

O terminal fica para criar o **primeiro admin**. Depois disso, o admin gerencia todos pela tela **Usuários**.

#### Tela Usuários (só admin): regras

1. Só o admin acessa a tela e a API `/api/usuarios`. Para os outros, a API responde **403**.
2. A lista mostra nome, login, perfil (admin ou criador), situação (ativo ou desativado), **último acesso** e quantos pombos cada um tem.
3. **Último acesso** é gravado no login e a cada uso do sistema, no máximo uma vez a cada 5 minutos por usuário, para não escrever no banco a cada clique.
4. **Criar usuário:** login com 3 a 50 caracteres, só letras minúsculas sem acento, números, `.`, `_` e `-`. Espaços nas pontas são removidos e maiúsculas viram minúsculas. O **nome completo** é obrigatório, com pelo menos nome e sobrenome (duas palavras), porque é ele que aparece para os outros e pode haver nomes iguais. Espaços repetidos viram um só. A senha precisa ter pelo menos 8 caracteres. Login repetido responde **409**.
5. **Editar:** o admin muda o nome (mesma regra do nome completo), o perfil (admin/criador) e a situação (ativo/desativado).
6. **Desativar** não apaga nada: o plantel continua no banco, o usuário não consegue entrar, as sessões abertas dele param de funcionar na hora e ele some dos plantéis compartilhados. Reativar devolve tudo como estava. A API não apaga usuários.
7. **Redefinir senha:** o admin define uma senha nova (mínimo 8 caracteres). Todas as sessões abertas daquele usuário são encerradas. Se o admin redefinir a própria senha, a sessão atual dele continua.
8. O admin **não pode tirar o próprio perfil de admin nem se desativar**. Assim ninguém se tranca para fora sem querer.
9. O sistema **sempre tem pelo menos um admin ativo**. Uma mudança que deixaria zero admins ativos responde **400**, inclusive quando dois admins tentam rebaixar um ao outro ao mesmo tempo (trava no banco).

Cada usuário tem o próprio plantel (pombos e proprietários) e só vê o dele. A mesma anilha pode existir em plantéis diferentes. O admin (`--admin`) vê e edita os pombos de todos.

Para mostrar o plantel a outra pessoa, use a tela **Compartilhar**: quem recebe vê todos os pombos do dono, inclusive os cadastrados depois, mas só para leitura. As duas listas da tela, e o seletor "Plantel de …" na lista de pombos, mostram o nome e o login de cada pessoa, para diferenciar quem tem o mesmo nome. No pombo, o botão **Copiar para meu plantel** traz uma cópia independente, com ancestrais e resultados. Se o destino já tiver um ancestral com a mesma anilha, ele é reaproveitado. Pai, mãe e proprietário de um pombo precisam ser do mesmo plantel.

Na migração que criou os plantéis, os pombos e proprietários que já existiam foram para o primeiro admin.

### Atualizar depois de um `git push`

```bash
cd pedigree && git pull && cd deploy && docker compose up -d --build
```

### Migrar os dados do Postgres local para a VPS

```bash
# na máquina de desenvolvimento
docker compose -f backend/docker-compose.yml exec -T db pg_dump -U pedigree --data-only --exclude-table=alembic_version --exclude-table=usuarios pedigree > dados.sql
scp dados.sql ubuntu@IP-DA-VPS:~/
# na VPS (com o sistema já no ar, tabelas vazias)
cd pedigree/deploy && docker compose exec -T db psql -U pedigree pedigree < ~/dados.sql
```

### Backup

Backup diário às 3h na VPS (local, 30 dias), com cópia **cifrada** puxada pelo PC do responsável (14 diários + 8 semanais + 12 mensais) e aviso se passar de 48 h sem cópia. Instalação: `backup-pc/instalar.sh`. Teste de restauração: `backup-pc/testar_restauracao.sh`. Restaurar numa VPS nova e lidar com incidentes: **`docs/operacao.md`**. Regras: RO-xx em `docs/requisitos.md`.

Testes dos scripts do PC: `backend/.venv/bin/python -m pytest backup-pc/`.

## Regras genealógicas

Detalhes, critérios e testes em `docs/requisitos.md` (códigos RG-xx). Os testes citam o código da regra.

- **RG-01/02:** um pombo não pode ser pai ou mãe de si mesmo, nem ter como pai ou mãe um descendente seu, em qualquer número de gerações (sem ciclos). Ancestral repetido em ramos diferentes (consanguinidade) continua permitido.
- **RG-03:** a verificação de ciclo trava o plantel durante a gravação. Duas edições simultâneas não fecham um ciclo juntas.
- **RG-04/05:** o pai precisa ser macho ou de sexo desconhecido, e a mãe, fêmea ou desconhecida. Isso só é verificado quando o vínculo muda: vínculos antigos inconsistentes continuam editáveis nos outros campos.
- **RG-06:** o sexo de um pombo não pode mudar para um valor incompatível com o papel que ele já tem (ex.: é pai de alguém e passaria a fêmea). Corrigir para o sexo certo ou para desconhecido é sempre permitido.
- **RG-07:** a árvore marca com aviso o pai fêmea ou a mãe macho de registros antigos, sem bloquear a visualização nem o PDF.
- **RG-08:** pai, mãe e proprietário precisam ser do mesmo plantel do pombo.
- **RG-09:** excluir um pombo que é pai ou mãe de outro é bloqueado (409), com a lista dos filhos.
- **RG-10:** excluir um proprietário usado por algum pombo é bloqueado (409).
- **RG-11:** ancestral desconhecido é simplesmente a ausência de pai ou mãe. O sistema nunca cria pombo fictício.

## Completar o pedigree pela árvore

`POST /api/pombos/{id}/genitor` com `{"papel": "pai"|"mae", "genitor_id": N}` (pombo já cadastrado) **ou** `{"papel": ..., "novo": {"anilha": "...", "cor": "..."}}` (cadastra e liga).

- **PE-01:** exige poder editar o pombo (403 se o plantel é só leitura; 404 se nem pode vê-lo).
- **PE-02:** só preenche uma vaga **vazia**. Se o pombo já tem pai (ou mãe), responde 409. Trocar um pai existente continua sendo feito pelo Editar, de propósito: um clique na árvore nunca troca um ancestral em silêncio.
- **PE-03:** com pombo existente, valem as regras RG-01, 02, 04 e 08 (não ser ele mesmo, sem ciclo, sexo do papel, mesmo plantel), com a trava RG-03.
- **PE-04:** com pombo novo, o sexo vem do papel (pai = macho, mãe = fêmea), e a anilha e a cor seguem RV-01/02 (anilha única no plantel). O pombo novo é criado no plantel do filho e ligado **na mesma transação**: se algo falha, nada é gravado.
- **PE-05:** é preciso informar exatamente um entre `genitor_id` e `novo` (senão, 422).

## Cópia entre plantéis

Detalhes e testes em `docs/requisitos.md` (RC-xx).

- **RC-01:** só copia quem pode ver o pombo. A cópia nunca dá acesso de edição ao original.
- **RC-02:** um ancestral que você já tem (mesma anilha) só é reaproveitado se o sexo for compatível (igual, ou um dos dois desconhecido) e a cor for a mesma, ignorando maiúsculas e espaços (ou uma das duas vazia).
- **RC-03:** se a anilha já existe no seu plantel, mas o pombo é outro, a cópia inteira é cancelada (409) e a mensagem lista os conflitos. Corrija ou renomeie o seu pombo e copie de novo.
- **RC-04:** um ancestral reaproveitado também precisa ter o sexo certo para o papel (pai macho, mãe fêmea, ou desconhecido). Ciclo não tem como surgir na cópia: os pombos novos só apontam para outros novos ou para os reaproveitados, nunca o contrário, e a origem não tem ciclos (RG-02).
- **RC-05:** a cópia é atômica: ou copia tudo, ou nada.

## Limite de tentativas de login

Detalhes e testes em `docs/requisitos.md` (RA-xx).

- **RA-01:** 5 senhas erradas para o mesmo login em 15 minutos bloqueiam esse login. A tentativa seguinte responde 429 com o tempo de espera, mesmo com a senha certa. O bloqueio acaba quando a 5ª falha mais recente completa 15 minutos.
- **RA-02:** 20 falhas vindas do mesmo IP em 15 minutos bloqueiam esse IP, para quem testa muitos logins.
- **RA-03:** só conta a falha que já aconteceu. Tentativa bloqueada (429) e login certo não contam. As tentativas do mesmo login são processadas uma de cada vez (trava no banco), então ninguém passa do limite mandando várias ao mesmo tempo.
- **RA-04:** login certo zera as falhas daquele login (não as do IP).
- **RA-05:** login inexistente ou desativado conta como falha, com a mesma mensagem ("Usuário ou senha incorretos.").
- **RA-06:** o IP é o que o Caddy informa no `X-Forwarded-For`. O Caddy sobrescreve o valor mandado pelo cliente, e o backend só é acessível pela rede interna do Docker.
- **RA-07:** as falhas ficam na tabela `tentativas_login`, e as com mais de 24 horas são apagadas.
- **RA-08:** na tela Usuários, o admin vê quem está bloqueado e pode desbloquear. Redefinir a senha também desbloqueia.

## Validação de entrada

Detalhes e testes em `docs/requisitos.md` (RV-xx). Nenhuma entrada do usuário pode gerar erro 500.

- **RV-01..04:** limites de tamanho iguais aos do banco. Anilha: 1 a 50 caracteres, só números e `/`. Cor ≤ 100; origem ≤ 200; observações ≤ 5.000. Proprietário: nome obrigatório ≤ 200; colombódromo ≤ 200; endereço ≤ 300; telefone ≤ 50; e-mail ≤ 200. Resultado: competição obrigatória ≤ 200; ano entre 1900 e o ano que vem; distância de 0 a 5.000 km; colocação ≤ 100; prêmio ≤ 200. Espaços nas pontas são removidos e texto opcional vazio vira vazio de verdade (`null`).
- **RV-05:** duas gravações simultâneas da mesma anilha: a segunda recebe 409, não erro 500.
- **RV-06:** senha de 8 a 72 bytes (limite do bcrypt). No login, senha maior conta como senha errada.
- **RV-07:** mensagens de validação em português, com o nome do campo.

## Tela de login

- **LG-01:** a tela segue a identidade do sistema: faixa azul-marinho com a pomba do logo, o nome e a foto de pombo-correio do Início (com o crédito da licença). No computador, a faixa fica à esquerda e o formulário à direita. No celular, a faixa fica no topo e o formulário embaixo, sem rolagem lateral.
- **LG-02:** campos **Usuário** e **Senha** com rótulo visível e o preenchimento automático do navegador (`username`, `current-password`). O usuário não ganha maiúscula automática nem correção. O botão **Mostrar/Ocultar** a senha diz o estado para o leitor de tela.
- **LG-03:** campo vazio mostra o erro embaixo dele ("Usuário: obrigatório", "Senha: obrigatória") e o cursor vai para ele, sem chamar o servidor.
- **LG-04:** a recusa do servidor aparece no topo do formulário, anunciada ao leitor de tela: senha errada ("Usuário ou senha incorretos.", RA-05), muitas tentativas ("Tente de novo em N minutos", RA-01) e sem conexão ("Sem conexão com o servidor. Confira a internet."). Depois de uma recusa, o usuário digitado fica, a senha é apagada e o cursor vai para a senha.
- **LG-05:** enquanto entra, o botão mostra "Entrando…" e não envia duas vezes.
- **LG-06:** não há "esqueci a senha" automático (não há e-mail no cadastro): a tela diz "Esqueceu a senha? Peça ao administrador do sistema", que redefine pela tela Usuários.

## Navegação e busca

Desenho em `docs/ux/fluxos.md` e no protótipo `docs/ux/prototipos/alta-fidelidade.html`.

- **NV-01:** menu superior azul-marinho com Início, Meus pombos, Reprodutores, Proprietários e Compartilhar. **Usuários só aparece para o admin** (e a rota só existe para ele). O item da página atual fica sublinhado em dourado e marcado com `aria-current="page"`.
- **NV-02:** o menu completo aparece a partir de 1280 px de largura. Abaixo disso, vira a gaveta ☰, com itens de 48 px de altura, que fecha ao escolher um item ou com Esc. Entre 640 e 1279 px, a busca continua visível no topo; abaixo de 640 px (celular), ela abre pela lupa.
- **NV-03:** busca por anilha sempre visível no topo. A tecla `/` leva o cursor até ela, a não ser que já se esteja digitando em outro campo. No celular, a busca abre pela lupa.
- **NV-04:** a busca procura nos pombos que o usuário pode ver (o próprio plantel e os compartilhados; o admin vê todos) e mostra até 8 resultados, com sexo e cor. **Os do próprio plantel vêm primeiro** (depois os dos outros), cada grupo em ordem numérica de anilha, e só então é feito o corte em 8. Assim, Enter abre o seu pombo, e não a cópia de outra pessoa com a mesma anilha. Pombos de outro plantel mostram também "Plantel de <dono>", porque a mesma anilha pode existir em plantéis diferentes. ↑ ↓ escolhem, Enter abre o escolhido (o primeiro, se nenhum foi escolhido) e Esc limpa.
- **NV-05:** sem resultado, a busca oferece "Cadastrar <anilha>", que abre o formulário de novo pombo já com a anilha preenchida. Só aparece se o texto for uma anilha válida (números e `/`).
- **NV-06:** as páginas mostram o caminho no topo ("Início › Meus pombos › 4272402/24"). O último item é a página atual e não é link.

## Início e lista de pombos

- **IN-01:** o Início cumprimenta pelo primeiro nome e pela hora do dia ("Bom dia, Davi!") e tem a busca grande por anilha (mesmas regras NV-04/05) e o botão "Cadastrar novo pombo".
- **IN-02:** três números do **próprio plantel**: pombos, reprodutores (situação Reprodutor) e **pedigree incompleto** (sem pai ou sem mãe). Cada número leva à lista correspondente.
- **IN-03:** últimos 5 pombos cadastrados no próprio plantel, com sexo, cor e situação.
- **IN-04:** últimos 5 resultados do próprio plantel (`GET /api/resultados/recentes`): os mais recentes por ano (os sem ano por último) e, no mesmo ano, os registrados por último. Só o próprio plantel, inclusive para o admin. O parâmetro `limite` vai de 1 a 20 (padrão 5).
- **IN-05:** a foto do pombo-correio tem licença CC BY-SA 2.0, e o crédito ao autor aparece no rodapé do Início (exigência da licença; `docs/ux/prototipos/img/CREDITOS.md`).
- **LI-01:** filtros com rótulo visível: Plantel (só quando há outros plantéis para ver), Anilha, Cor, Sexo, Situação e Proprietário (só no próprio plantel). "Limpar filtros" aparece quando há algum filtro ativo.
- **LI-02:** contagem do que está na tela ("24 pombos"). Se a lista não carregou (erro), a contagem não aparece: nunca "0 pombos" no lugar de "não sei".
- **LI-03:** a lista vem em ordem de anilha, comparando números como números (2/24 antes de 10/24). Clicar no cabeçalho "Anilha" inverte a ordem.
- **LI-04:** sexo com ♂/♀ e nome, situação como selo, e pai e mãe como links para os pombos. Pai ou mãe desconhecidos aparecem como "—".
- **LI-05:** estados: carregando (esqueleto), erro (Tentar de novo), plantel vazio ("Cadastrar o primeiro") e nenhum resultado para os filtros ("Limpar filtros").
- **LI-06:** `?incompleto=1` mostra só pombos sem pai ou sem mãe (vindo do número do Início), com um aviso que permite tirar o filtro.

## Cadastro e edição de pombo

- **CA-01:** um formulário único, que não é dividido em etapas. O sexo é escolhido em três botões (♂ Macho, ♀ Fêmea, Não sei), que também funcionam com as setas do teclado.
- **CA-02:** os erros aparecem **embaixo do campo**: a anilha vazia (antes de enviar) e os erros do servidor que dizem respeito a um campo (anilha repetida, pai/mãe inválidos RG-01..08, sexo RG-06, limites RV). Os demais aparecem no topo. **O que foi digitado nunca se perde** num erro.
- **CA-03:** sugestões de cor. As 6 cores mais usadas no plantel aparecem como atalhos, e há uma lista de sugestões enquanto se digita. Qualquer outra cor continua aceita.
- **CA-04:** "Salvar e cadastrar outro" (só no cadastro): salva, avisa ("4272402/24 salvo"), limpa a anilha, o sexo, a origem e as observações, e **mantém pai, mãe, proprietário, cor e situação** (irmãos de ninhada costumam repetir esses campos). O cursor volta para a anilha.
- **CA-05:** "Salvar" leva ao pombo com o aviso "Salvo". Enquanto salva, o botão mostra "Salvando…" e não salva duas vezes.
- **CA-06:** na edição, o formulário só aparece depois que os dados do pombo chegam (antes, aparece o carregando), para não haver um formulário vazio que possa ser salvo por cima.
- **CA-07:** "Cancelar" volta à página anterior sem salvar.

## Detalhe do pombo e árvore

- **DT-01:** faixa azul-marinho com a anilha em destaque, ♂/♀ e sexo, cor, situação e o proprietário numa linha (UX-04). Plantel de outra pessoa mostra o aviso "só leitura".
- **DT-02:** ações: **Certificado PDF** (principal), **Editar** e **⋯** com "Copiar anilha" e "Excluir pombo…". Em plantel só leitura, no lugar de Editar e ⋯, aparece "Copiar para meu plantel".
- **DT-03:** o certificado abre uma janela para escolher **2 a 6 gerações**, já marcada com as gerações da árvore. O layout do PDF não muda.
- **DT-04:** excluir e copiar pedem confirmação numa janela do sistema (sem `confirm()`/`alert()`). Se o servidor recusar (pombo com filhos, RG-09; conflitos da cópia, RC-03), a mensagem aparece **dentro da janela**.
- **DT-05:** abas **Pedigree · Resultados (n) · Observações**, que também funcionam com as setas do teclado. A aba Pedigree tem a árvore e os irmãos.
- **DT-06:** resultados com ano, prova, km, colocação e prêmio, do mais recente para o mais antigo. O formulário de inclusão segue RV-04, com erros embaixo do campo. Remover pede confirmação.
- **AR-01:** no desktop, uma coluna por geração (2 a 6, escolhidas no seletor), cada ancestral alinhado com o filho, com rótulo ("Avó paterna"), ♂/♀, anilha, sexo, cor e número de provas. A partir da 5ª geração, as caixas ficam compactas. Cada caixa ocupa a altura dos ancestrais dela (os dois pais somam a altura do filho), então ramos desconhecidos não deixam espaço vazio e 6 gerações não viram uma página enorme. Ao trocar o número de gerações, a árvore atual continua na tela até a nova chegar.
- **AR-02:** no celular, uma geração por vez: o pombo e os pais dele. Tocar num dos pais sobe uma geração, e a trilha ("Principal › Pai › Avó paterna") leva de volta.
- **AR-03:** onde o filho existe e falta pai ou mãe, aparece a vaga **"+ ♂ Pai" / "+ ♀ Mãe"** (só para quem pode editar). Para quem só lê, aparece "Desconhecido". Acima de uma vaga, o espaço fica vazio. **Nunca** aparece pombo fictício (RG-11).
- **AR-04:** ancestral repetido (consanguinidade) com destaque e "⚠ repetido"; pai fêmea ou mãe macho de registros antigos com "⚠ sexo não confere" (RG-07).
- **AR-05:** a vaga abre o painel lateral (de baixo para cima no celular) com duas abas:
  - "Escolher do plantel": busca pela anilha, só com pombos do sexo do papel e sem o próprio pombo;
  - "Cadastrar novo": anilha e cor, com o sexo fixado pelo papel.

  Usa `POST /pombos/{id}/genitor` (PE-xx). A árvore recarrega **no mesmo lugar**, sem sair da página, e aparece o aviso "4272402/24 ligado como pai de …". Erros do servidor aparecem dentro do painel.
- **AR-06:** clicar num ancestral cadastrado abre a página dele.

## Reprodutores, proprietários, compartilhar e usuários

- **RP-01:** Reprodutores mostra os pombos **do próprio plantel** com situação "Reprodutor", em dois cartões, **Machos** e **Fêmeas**, cada um com a contagem. Reprodutor de sexo desconhecido aparece num terceiro cartão, só quando houver.
- **RP-02:** cada reprodutor mostra a anilha (abre o pombo), a cor, o proprietário (ou "sem proprietário") e quantos **filhos** ele tem no plantel. A ordem é numérica pela anilha, como na lista (LI-04).
- **RP-03:** sem reprodutores, a tela explica como marcar um: no pombo, **Editar → Situação: Reprodutor**.
- **PR-01:** Proprietários lista nome (com endereço e observações embaixo), pombal, contato (telefone e e-mail) e **quantos pombos** usam cada um. No celular, pombal, contato e número de pombos vão para baixo do nome. O pombal aparece como "Pombal Bons Amigos", sem repetir a palavra quando o nome já começa com "Pombal".
- **PR-02:** novo e editar abrem uma janela com **nome** (obrigatório), pombal, telefone, endereço, e-mail e observações, com os limites do servidor (200, 200, 50, 300, 200 e 5000 caracteres). Os erros aparecem embaixo do campo. Uma dica avisa que esses dados aparecem no cabeçalho do certificado. Ao salvar, o pombo e a lista mostram o nome novo sem recarregar a página.
- **PR-03:** excluir um proprietário que algum pombo usa não é oferecido: a janela explica "é proprietário de N pombo(s)" e só tem "Entendi". Sem uso, pede confirmação. Se o servidor recusar mesmo assim (RG-10), a mensagem aparece dentro da janela.
- **CP-01:** Compartilhar pede o **login do criador** num campo com rótulo. Erro do servidor (login inexistente, você mesmo) aparece embaixo do campo. Ao compartilhar, aparece o aviso "Plantel compartilhado com Nome (login)".
- **CP-02:** as duas listas mostram iniciais, nome e login. "Quem vê o meu plantel" tem **Parar de compartilhar**; "Compartilhados comigo" tem **Ver pombos** (abre a lista com aquele plantel) e **Deixar de ver**. Parar e deixar de ver pedem confirmação numa janela que diz o efeito.
- **US-01:** Usuários (só admin) mostra cartões com iniciais, nome, login, número de pombos, selos (admin, bloqueado, desativado) e último acesso (regras 1–9 acima). **Novo usuário** abre uma janela, com os erros do servidor embaixo do campo certo (nome, login, senha). Ao criar, o aviso lembra de passar o login e a senha para a pessoa.
- **US-02:** editar nome e redefinir senha abrem uma janela. Tornar/tirar admin e desativar pedem confirmação numa janela que diz o efeito. Reativar e desbloquear são diretos, com aviso.
- **UI-01:** nenhuma tela usa `alert()`, `confirm()` ou `prompt()` do navegador (UX-09). Há um teste que procura esses usos no código.

## Mensagens e falhas na tela

Detalhes em `docs/requisitos.md` (RF-xx). O redesenho completo é da Fase 7.

- **RF-01:** os erros do servidor (400, 409, 422, 429) aparecem com o texto do servidor, inclusive as listas (filhos que impedem a exclusão, conflitos da cópia) e os erros de validação de campo.
- **RF-02:** nenhuma tela fica em "Carregando..." para sempre. Falha de rede ou do servidor mostra "Não foi possível carregar…" com **Tentar de novo**. Pombo inexistente (ou de um plantel que o usuário não vê) mostra "Pombo não encontrado". Erros 4xx não são repetidos automaticamente; falha de rede e 5xx são repetidos até 2 vezes.
- **RF-03:** o seletor de pai mostra só machos e pombos de sexo desconhecido, e o de mãe, só fêmeas e desconhecidos. O cadastro rápido dentro do seletor segue a mesma regra. O servidor continua validando (RG-04).

## Segurança do certificado PDF

1. Todo texto digitado pelos usuários (anilha, cor, observações, nomes, resultados, dados do proprietário) aparece no PDF **como texto**, nunca como HTML: `<b>` aparece escrito, não em negrito.
2. Ao gerar o PDF, o servidor **não busca nenhum arquivo nem endereço** (`file://`, `http://`, etc.). O certificado não usa recursos externos: as fontes vêm do sistema. Qualquer tentativa de busca é recusada, e o PDF sai sem aquele recurso.

## Segurança da implantação

Ameaças e o que protege cada uma: `docs/ameacas.md`. Verificação depois de cada deploy: `deploy/verificar.sh https://SEU-DOMINIO`.

- **SG-01:** o backend roda com um usuário **sem privilégio** (uid 10001). O código pertence ao root e só pode ser lido. O contêiner roda com o disco **só leitura** (só `/tmp` é gravável, em memória), **sem capacidades** do Linux (`cap_drop: ALL`) e sem ganho de privilégio (`no-new-privileges`).
- **SG-02:** versões **fixas**: imagens `python:3.12.16-slim-trixie`, `node:22.23.4-alpine3.24`, `caddy:2.11.9-alpine` e `postgres:16.15-alpine3.24`; dependências com `==` (`requirements.txt`) e `package-lock.json`. Um rebuild recebe as correções da mesma versão, mas nunca troca de versão sozinho. Trocar WeasyPrint, Python ou Debian **só com o teste visual do PDF** (`backend/scripts/comparar_certificados.py`: mesmo número de páginas e nenhuma diferença além do horário impresso).
- **SG-03:** o Caddy manda em toda resposta: `Strict-Transport-Security` (1 ano), `Content-Security-Policy` (só recursos do próprio site; nada de scripts, estilos, fontes ou imagens de fora; a página não pode ser exibida dentro de outra), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (sem câmera, microfone, localização e pagamento) e `Cross-Origin-Opener-Policy: same-origin`. O cabeçalho `Server` não é enviado.
- **SG-04:** `index.html` não fica em cache (o navegador pega a versão nova logo depois de um deploy). Os arquivos de `/assets/`, que têm o conteúdo no nome, ficam em cache por 1 ano.
- **SG-05:** dependências sem alertas conhecidos: `pip-audit -r backend/requirements-dev.txt` e `npm audit` zerados (2026-11-09). Refazer antes de cada deploy e uma vez por mês.
- **SG-06:** a imagem de produção do backend leva só `requirements.txt`. Ferramentas de teste (`pytest`, `httpx`) ficam em `requirements-dev.txt`.
- **SG-07:** os logs dos contêineres (que têm o IP de cada acesso) giram: no máximo **3 arquivos de 10 MB por serviço** (`logging` no `docker-compose.yml`). Sem isso, o Docker guarda para sempre e enche o disco da VPS.

## Estrutura

- `backend/app/models.py` — modelos (Proprietario, Pombo, Resultado); `Pombo` referencia `pai_id`/`mae_id` (self-relation).
- `backend/app/pedigree.py` — monta a árvore genealógica recursivamente e sinaliza anilhas repetidas entre ancestrais (indício de consanguinidade).
- `backend/app/routers/certificado.py` + `backend/app/pdf/templates/certificado.html` — geração do certificado de pedigree em PDF (WeasyPrint).
- `deploy/docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` + `frontend/Caddyfile` — stack de produção.
- `frontend/src/pages/pombos/` — listagem, formulário e detalhe (com árvore genealógica) de cada pombo.
