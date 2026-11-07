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
pip install -r requirements.txt
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

## Mensagens e falhas na tela

Detalhes em `docs/requisitos.md` (RF-xx). O redesenho completo é da Fase 7.

- **RF-01:** os erros do servidor (400, 409, 422, 429) aparecem com o texto do servidor, inclusive as listas (filhos que impedem a exclusão, conflitos da cópia) e os erros de validação de campo.
- **RF-02:** nenhuma tela fica em "Carregando..." para sempre. Falha de rede ou do servidor mostra "Não foi possível carregar…" com **Tentar de novo**. Pombo inexistente (ou de um plantel que o usuário não vê) mostra "Pombo não encontrado". Erros 4xx não são repetidos automaticamente; falha de rede e 5xx são repetidos até 2 vezes.
- **RF-03:** o seletor de pai mostra só machos e pombos de sexo desconhecido, e o de mãe, só fêmeas e desconhecidos. O cadastro rápido dentro do seletor segue a mesma regra. O servidor continua validando (RG-04).

## Segurança do certificado PDF

1. Todo texto digitado pelos usuários (anilha, cor, observações, nomes, resultados, dados do proprietário) aparece no PDF **como texto**, nunca como HTML: `<b>` aparece escrito, não em negrito.
2. Ao gerar o PDF, o servidor **não busca nenhum arquivo nem endereço** (`file://`, `http://`, etc.). O certificado não usa recursos externos: as fontes vêm do sistema. Qualquer tentativa de busca é recusada, e o PDF sai sem aquele recurso.

## Estrutura

- `backend/app/models.py` — modelos (Proprietario, Pombo, Resultado); `Pombo` referencia `pai_id`/`mae_id` (self-relation).
- `backend/app/pedigree.py` — monta a árvore genealógica recursivamente e sinaliza anilhas repetidas entre ancestrais (indício de consanguinidade).
- `backend/app/routers/certificado.py` + `backend/app/pdf/templates/certificado.html` — geração do certificado de pedigree em PDF (WeasyPrint).
- `deploy/docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` + `frontend/Caddyfile` — stack de produção.
- `frontend/src/pages/pombos/` — listagem, formulário e detalhe (com árvore genealógica) de cada pombo.
