# Política de privacidade — Pedigree Colombófilo

> Versão de 2026-11-09. Texto simples, para os criadores que usam o sistema.
> **Antes de entregar ao cliente, preencha o número do WhatsApp** (`[NÚMERO]`).
> Esta política descreve o que o sistema faz hoje. Ela **não é** um parecer jurídico nem uma declaração de conformidade com a LGPD; para isso, consulte um profissional.

## Quem cuida dos dados

O sistema é mantido por **Davi Emilio de Paula Fonseca**, contato por **WhatsApp: [NÚMERO]**. É com essa pessoa que você fala sobre qualquer assunto desta política.

## Que dados o sistema guarda

| Dado | De quem | Para quê |
|---|---|---|
| Nome completo e login | De cada usuário | Entrar no sistema e identificar quem compartilha o plantel |
| Senha | De cada usuário | Entrar. Guardada **só como código irreversível** (bcrypt): ninguém consegue ler a senha, nem o responsável |
| Último acesso | De cada usuário | O administrador ver quem está usando |
| Pombos, genealogia, resultados e observações | Do plantel de cada usuário | É o próprio serviço |
| Nome, pombal, endereço, telefone, e-mail e observações dos **proprietários** | Pessoas cadastradas pelo criador | Aparecer no pombo e no cabeçalho do certificado |
| Tentativas de login erradas (login e IP) | De quem tenta entrar | Bloquear quem tenta adivinhar senhas. **Apagadas depois de 24 horas** |
| Registros de acesso do servidor (IP, data e endereço pedido) | De quem acessa o site | Investigar erros e ataques. Guardados em arquivos que se apagam sozinhos (no máximo 30 MB por serviço) |

O sistema **não** usa cookies de propaganda nem de estatística, **não** carrega nada de outros sites (fontes, scripts ou rastreadores) e **não** vende nem repassa dados a ninguém. O único cookie é o da sessão, necessário para continuar conectado.

**Dados de outras pessoas:** quando você cadastra um proprietário (nome, telefone, endereço…), você é responsável por ter a autorização dessa pessoa para isso. Cadastre só o necessário para o certificado.

## Quem vê os dados

- **Você** vê e edita o seu plantel.
- **Quem você escolher** na tela Compartilhar vê o seu plantel inteiro, só para leitura, e pode copiar pombos para o plantel dele. Você pode parar de compartilhar quando quiser. O que a pessoa já copiou continua com ela.
- **O administrador do sistema** vê e edita todos os plantéis, para dar suporte.
- Mais ninguém.

## Onde os dados ficam

- **Servidor:** uma máquina alugada na Oracle Cloud, região de **São Paulo (Brasil)**, acessada só por HTTPS (conexão cifrada).
- **Cópias de segurança:** uma por dia. No próprio servidor ficam as dos últimos **30 dias**. Uma versão **cifrada** (só abre com uma chave que fica com o responsável) é guardada no computador do responsável, onde ficam as dos últimos 14 dias, 8 semanas e 12 meses.

## Quanto tempo os dados ficam

- Enquanto a sua conta existir.
- Se você pedir para sair, o responsável desativa a conta (ninguém mais entra) e, se você pedir, **apaga** os seus dados do sistema (é feito à mão pelo responsável; não há botão para isso). As cópias de segurança antigas que ainda tiverem esses dados se apagam sozinhas em até **12 meses**.

## Seus direitos

Você pode pedir ao responsável, pelo contato acima, para:
- saber quais dados seus estão no sistema e receber uma cópia;
- corrigir algum dado (a maior parte você mesmo corrige nas telas);
- apagar os seus dados e a sua conta;
- tirar uma informação de proprietário que tenha sido cadastrada sobre você.

Resposta em até **15 dias**.

## Segurança

Senhas guardadas como código irreversível, limite de tentativas de login, conexão sempre cifrada (HTTPS), cada plantel separado dos outros, servidor atualizado automaticamente e cópia de segurança cifrada fora do servidor. Detalhes técnicos: `docs/ameacas.md`.

Se acontecer um incidente que exponha os seus dados, o responsável avisa você pelo contato cadastrado.

## Mudanças nesta política

Quando mudar algo importante, o responsável avisa os usuários antes. A data no topo mostra a versão.
