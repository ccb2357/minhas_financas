# Minhas Finanças — Backend e ambiente local

PWA financeiro pessoal para lançamentos manuais de receitas e despesas, exclusivamente em real brasileiro (BRL).

## Estado do projeto

Sprint 0 implementada, aguardando aceite. Nenhuma próxima sprint deve começar sem aprovação.

Validado:

- Laravel, conexão MySQL e migration de usuários.
- Health check direto pelo Nginx e pelo proxy do Vite.
- Framework7 Core, Apache ECharts, build e viewport mobile.
- Login, consulta de sessão e logout com Sanctum por cookies.
- Rejeição de credenciais incorretas e requisição sem proteção CSRF.
- Quatro testes de autenticação, com 23 verificações.
- Composer executado no PHP do container.
- Correção do desempenho local com `vendor` em volume Docker.
- Conferência dos demais sites após a recriação do PHP-FPM.

Pendências registradas:

- Teste do limite de tentativas de login adiado pelo responsável.
- Procedimento de instalação em outro computador documentado, ainda não validado integralmente em uma segunda máquina.
- Otimização do tamanho do frontend.

A interface atual é técnica. As telas definitivas seguirão as referências visuais aprovadas.

## Stack

- PHP 8.2.29 no container e Laravel 12.70.0 com Sanctum.
- MySQL 8.0.45.
- Framework7 Core 9.2.0 e Framework7 Icons 5.0.5, com JavaScript.
- Apache ECharts 6.1.0 e Vite 8.3.4.
- Node 22 pelo Docker.
- Nginx e Docker Compose da infraestrutura existente.

`composer.lock` e `frontend/package-lock.json` registram as versões das dependências e devem permanecer no Git.

## Organização

| Item | Caminho |
| --- | --- |
| Projeto no Windows | `C:\var\www\minhas_financas` |
| Projeto em Nginx/PHP | `/var/www/minhas_financas` |
| Infraestrutura compartilhada | `C:\var\www\infra` |

O Compose e as configurações Nginx compartilhadas ficam fora deste repositório. Não substituí-los por arquivos genéricos.

## Infraestrutura utilizada

Serviços existentes: `nginx`, `php-fpm` e `mysql`, na rede `infra_network`.

Além da montagem existente de `/var/www`, o PHP-FPM utiliza:

```yaml
- minhas_financas_vendor:/var/www/minhas_financas/backend/vendor
```

Declaração no bloco de volumes do Compose:

```yaml
minhas_financas_vendor:
    external: true
    name: minhas_financas_vendor
```

O serviço `minhas-financas-node` utiliza `node:22-alpine`, perfil `dev`, diretório `/app`, montagem `../minhas_financas/frontend:/app`, volume `minhas_financas_node_modules:/app/node_modules`, porta `127.0.0.1:5173:5173` e rede `infra_network`.

Recriar o PHP-FPM compartilhado interrompe brevemente os outros projetos PHP. Seu entrypoint também reaplica permissões sobre `/var/www`. Planejar essa operação antes de executá-la.

## Instalação em outro computador — somente www/infra já está pronta

### Premissas

- Windows com Docker Desktop funcionando e Git disponível (`git --version`). Instalar Git for Windows caso esse comando não exista.
- `C:\var\www\infra` já contém o Compose atualizado, Dockerfile, `php.ini` e configurações Nginx, inclusive o site `minhas-financas.localhost`, o serviço Node e a montagem do volume `vendor` descritos acima.
- Os serviços existentes da infraestrutura estão disponíveis. Não executar `docker compose down` nem apagar volumes.
- A pasta do projeto ainda não existe. Se existir, não clonar por cima: conferir seu conteúdo primeiro.
- Este procedimento cria uma instalação local independente, com banco inicialmente vazio. Não transfere dados financeiros do outro computador.

Infraestrutura atualizada não significa que os volumes, o banco ou as dependências do aplicativo já existam. As etapas abaixo preparam esses itens.

### 1. Clonar o projeto

```bat
cd /d C:\var\www
git clone -b master https://github.com/ccb2357/minhas_financas.git minhas_financas
cd minhas_financas
```

Autenticar no GitHub quando solicitado. A conta precisa ter acesso ao repositório privado.

### 2. Disponibilizar o Composer

Criar a pasta caso ela não exista:

```bat
if not exist tools mkdir tools
```

Copiar `tools\composer.phar` do computador em que o projeto já funciona para:

```text
C:\var\www\minhas_financas\tools\composer.phar
```

Alternativamente, se Composer já estiver instalado pelo instalador Windows no novo PC:

```bat
copy "C:\ProgramData\ComposerSetup\bin\composer.phar" "C:\var\www\minhas_financas\tools\composer.phar"
```

Se esse arquivo não existir, usar a cópia do primeiro computador ou obter o Composer pelo site oficial https://getcomposer.org/. Não usar arquivos de origem desconhecida.

`tools\composer.cmd` vem do Git; o binário `composer.phar` é ignorado. Não é necessário instalar PHP no Windows para executar esse atalho: ele utiliza o PHP do container.

### 3. Criar a configuração local

Na raiz do projeto:

```bat
copy backend\.env.example backend\.env
```

Esse comando é para a primeira instalação. Não sobrescrever um `.env` já configurado.

Editar `backend\.env` e conferir:

```dotenv
APP_NAME="Minhas Finanças"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://minhas-financas.localhost

APP_LOCALE=pt_BR
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=pt_BR

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=minhas_financas
DB_USERNAME=minhas_financas
DB_PASSWORD=

SESSION_DRIVER=file
SESSION_COOKIE=minhas_financas_session
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=false
SESSION_SAME_SITE=lax

CACHE_STORE=file
QUEUE_CONNECTION=sync
SANCTUM_STATEFUL_DOMAINS=localhost:5173,minhas-financas.localhost
```

Manter `APP_KEY=` vazia por enquanto. A senha do banco será preenchida na etapa 6. Se houver `DB_URL` configurada, removê-la para usar os campos `DB_*` acima. Não duplicar variáveis.

### 4. Criar o volume de dependências e conectar ao PHP-FPM

```bat
docker volume create minhas_financas_vendor
cd /d C:\var\www\infra
docker compose --profile dev config --quiet
```

Se a validação apresentar erro, parar e corrigir antes de continuar.

Com a configuração validada, em uma janela adequada para a breve interrupção dos projetos PHP:

```bat
docker compose up -d --no-deps --no-build --force-recreate php-fpm
```

O entrypoint pode demorar devido ao ajuste de permissões existente. O volume recém-criado ainda não contém dependências. Não copiar `vendor` do Windows para preenchê-lo; a próxima etapa fará a instalação diretamente no volume.

### 5. Instalar as dependências PHP e gerar a chave local

```bat
cd /d C:\var\www\minhas_financas
tools\composer.cmd --version
tools\composer.cmd install
tools\composer.cmd check-platform-reqs
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan key:generate
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan config:clear
```

O Composer deve informar PHP 8.2.29, e os requisitos devem passar. Se algum comando falhar, parar e investigar.

Não usar `composer update` para reproduzir a instalação: `install` utiliza o arquivo de lock. Não executar o Composer diretamente com o PHP do Windows para atualizar o `vendor` usado pelo container.

Gerar uma chave própria para este novo ambiente local. Não executar `key:generate` posteriormente em um ambiente existente que precisa preservar sua chave.

### 6. Criar banco e usuário pelo phpMyAdmin

Entrar no phpMyAdmin da infraestrutura como administrador. Primeiro conferir se o banco `minhas_financas` já existe. Se existir, parar e revisar antes de aplicar migrations.

Para uma instalação nova, na aba SQL:

```sql
CREATE DATABASE minhas_financas
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

Em **Contas de usuário → Adicionar conta de usuário**:

- Nome: `minhas_financas`.
- Host: `%`, para permitir conexão pela rede Docker com IPs variáveis.
- Definir uma senha exclusiva, usando o gerador do phpMyAdmin se desejado, e guardá-la.
- Não conceder privilégios globais nem opção de conceder permissões a terceiros.
- Após criar, conceder os privilégios necessários somente sobre `minhas_financas.*`, incluindo os de criação/alteração de tabelas para migrations.

Preencher `DB_PASSWORD` em `backend\.env` com essa senha, respeitando a sintaxe do arquivo dotenv. Não enviar senha ao GitHub.

Conferir a conexão antes de criar tabelas:

```bat
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan config:clear
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan db:show
```

O resultado deve mostrar banco `minhas_financas`, usuário `minhas_financas`, host `mysql` e conexão bem-sucedida.

### 7. Criar tabelas e usuário de acesso

Somente após conferir o banco de destino:

```bat
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan migrate
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan migrate:status
docker exec -it -w /var/www/minhas_financas/backend php-fpm php artisan app:create-user
```

Informar nome, e-mail e senha quando solicitado. A senha de acesso ao aplicativo é independente da senha MySQL. Não executar seeders padrão para criar usuários de demonstração.

### 8. Conferir o Nginx existente

```bat
docker exec nginx nginx -t
```

Somente se o teste passar, recarregar a configuração para atualizar também a resolução do PHP-FPM recriado:

```bat
docker exec nginx nginx -s reload
```

Abrir http://minhas-financas.localhost/up. Deve aparecer **Application up**.

Se o nome não resolver, conferir a resolução local e a porta 80 do Docker. Não alterar o endereço ou as configurações de outros sites para contornar o problema.

### 9. Instalar o frontend e validar o build

Na pasta da infraestrutura:

```bat
cd /d C:\var\www\infra
docker compose --profile dev run --rm --no-deps minhas-financas-node npm ci
docker compose --profile dev run --rm --no-deps minhas-financas-node npm run build
```

O Compose cria o volume de `node_modules` quando necessário. Não repetir `npm init` nem os comandos iniciais de instalação de cada pacote: `npm ci` utiliza `package-lock.json`.

### 10. Iniciar e conferir a aplicação

```bat
docker compose --profile dev run --rm --no-deps --service-ports minhas-financas-node npm run dev
```

Manter o terminal aberto e acessar http://localhost:5173.

Conferir:

- Página Framework7 e gráfico ECharts.
- http://localhost:5173/up respondendo.
- Login com o usuário criado neste computador.
- Consulta de sessão e logout.
- Consulta após logout retornando HTTP 401.
- Outros sites da infraestrutura continuando disponíveis.

Em outro terminal, executar os testes:

```bat
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan config:clear
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan test
```

Na configuração versionada, os testes usam SQLite em memória, com cache e sessões em memória. Não devem usar o banco MySQL de desenvolvimento. Não alterar essa configuração para apontar os testes ao banco real.

Para encerrar apenas o Vite, pressionar `Ctrl+C` no terminal onde ele está executando.

### O que o Git não transfere

- `.env`, credenciais e chave da aplicação.
- Banco MySQL, usuários e dados financeiros.
- Volumes Docker e dependências instaladas.
- `tools/composer.phar`.
- Sessões, logs, arquivos privados e build `dist`.
- Compose e arquivos Nginx compartilhados, que pertencem à infraestrutura externa ao repositório.

Não copiar senhas do primeiro computador para o README nem desativar o `.gitignore` para transferir esses itens. Uma migração de dados existentes exige procedimento separado de backup e restauração.

## Comandos de uso diário

Na raiz do projeto:

```bat
tools\composer.cmd --version
tools\composer.cmd install
tools\composer.cmd check-platform-reqs
```

Na pasta da infraestrutura, iniciar Vite:

```bat
docker compose --profile dev run --rm --no-deps --service-ports minhas-financas-node npm run dev
```

Gerar build:

```bat
docker compose --profile dev run --rm --no-deps minhas-financas-node npm run build
```

Após alterar `.env`, limpar a configuração em cache:

```bat
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan config:clear
```

## Testar no Android por USB — procedimento validado

Este procedimento abre o Vite no Chrome do Android pelo cabo USB, usando um túnel do ADB. O endereço utilizado no celular é **http://localhost:5173**. O acesso não depende da comunicação entre os aparelhos pelo Wi-Fi.

### Preparação inicial — uma vez por computador e celular

**No Windows:**

1. Baixar **SDK Platform-Tools for Windows** na página oficial: https://developer.android.com/tools/releases/platform-tools.
2. Extrair a pasta `platform-tools` para `C:\tools\platform-tools`.
3. Conferir se existe `C:\tools\platform-tools\adb.exe`. Não é necessário instalar Android Studio nem alterar o PATH.

**No Android:**

1. Ativar as opções do desenvolvedor. No Samsung usado na validação: **Configurações → Sobre o telefone → Informações do software → Número de compilação**, tocando sete vezes e informando o PIN quando solicitado.
2. Em **Opções do desenvolvedor**, ativar **Depuração USB**.
3. Conectar o celular ao computador com cabo USB que permita transferência de dados e manter a tela desbloqueada.
4. Se surgir **Permitir depuração USB?**, autorizar este computador. Marcar a autorização permanente somente se for um computador de confiança.

No Chrome do computador, em `chrome://inspect/#devices`, manter **Enable port forwarding** desmarcado: o encaminhamento deste procedimento será feito pelo ADB. Durante o diagnóstico de autorização que validou este fluxo, **Discover USB devices** também ficou desmarcado.

### 1. Conferir a publicação local do Vite

No serviço `minhas-financas-node` do arquivo `C:\var\www\infra\docker-compose.yml`, a publicação usada neste procedimento é:

```yaml
ports:
    - "127.0.0.1:5173:5173"
```

Se esse valor tiver sido alterado durante algum teste de rede, encerrar o `vite dev` com `Ctrl+C` e executá-lo novamente depois de salvar o Compose. O atalho usa `docker compose run --rm --service-ports`: a nova execução cria outro container com a publicação atualizada. Reiniciar o mesmo container não altera seu mapeamento de portas.

Essa operação se limita ao Node de desenvolvimento. Não executar `docker compose down`, recriar PHP/MySQL ou reiniciar a infraestrutura inteira para este teste.

### 2. Iniciar o Vite e conferir a resposta no computador

Em um terminal **Cmder/CMD**:

```bat
cd /d C:\var\www\minhas_financas\frontend
vite dev
```

Manter esse terminal aberto. Em outro terminal:

```bat
curl.exe -I http://localhost:5173
```

A resposta esperada contém **HTTP 200 OK**. Isso confirma que o frontend está disponível no computador antes de configurar o celular.

### 3. Conferir a autorização do Android

No segundo terminal, ainda em **Cmder/CMD**:

```bat
cd /d C:\tools\platform-tools
adb start-server
adb devices -l
```

A lista deve conter o identificador do aparelho seguido de **`device`**, por exemplo:

```text
List of devices attached
IDENTIFICADOR_DO_APARELHO    device product:... model:... device:...
```

O identificador e os demais campos variam por aparelho. O estado necessário é `device`; `unauthorized` e `offline` ainda não permitem o teste.

Se a autorização estiver pendente, deixar **Discover USB devices** desmarcado no Chrome do PC e executar:

```bat
adb kill-server
adb start-server
adb devices -l
```

Manter o Android conectado e desbloqueado para aceitar a autorização, caso seja solicitada. Se `adb kill-server` informar que não conseguiu conectar à porta `5037`, o serviço ainda não estava em execução; continuar com `adb start-server`.

Se continuar como `unauthorized` ou `offline`, conferir a depuração USB e a solicitação de autorização no celular antes de prosseguir. A mensagem do Chrome **Pending authentication** não confirma que o aparelho já está autorizado; usar a saída de `adb devices -l` como verificação.

### 4. Criar o túnel USB

Com o aparelho no estado `device`:

```bat
adb reverse tcp:5173 tcp:5173
adb reverse --list
```

A saída da listagem deve conter:

```text
UsbFfs tcp:5173 tcp:5173
```

O prefixo pode variar; os dois endpoints devem ser `tcp:5173`. O comando encaminha a porta `5173` do Android para a porta `5173` local do computador.

### 5. Abrir e validar no celular

No **Chrome do Android**, abrir:

```text
http://localhost:5173
```

Manter o cabo conectado e o Vite em execução. O terminal dos comandos ADB pode ser fechado após a criação do túnel; o serviço ADB continua em segundo plano.

A abertura da aplicação por esse endereço foi validada no aparelho. A validação de uso deve conferir:

- Login, navegação inferior e retorno entre telas.
- Novo lançamento: teclado de valor, máscara em centavos, descrição, categoria, data, observação e botão salvar.
- Edição e exclusão, com atualização dos totais e gráficos.
- Categorias e orçamentos, incluindo rolagem até os botões dos formulários.
- Relatórios nos períodos Mês, 3 meses e Ano.
- Perfil, troca de senha e retorno ao login.
- Legibilidade em retrato e paisagem, sem campos ou ações encobertos pelo teclado.

Este acesso é para desenvolvimento e revisão no aparelho. Instalação e atualização do PWA em produção serão validadas em etapa própria.

### Uso nas próximas sessões

Com a preparação inicial concluída, a rotina é:

1. Conectar e desbloquear o Android, mantendo a depuração USB ativada.
2. Iniciar `vite dev` na pasta `frontend`.
3. Em outro terminal:

```bat
cd /d C:\tools\platform-tools
adb devices -l
adb reverse tcp:5173 tcp:5173
adb reverse --list
```

4. Abrir **http://localhost:5173** no Chrome do Android.

Refazer o `adb reverse` se a conexão USB ou o serviço ADB forem reiniciados e o encaminhamento deixar de aparecer na listagem.

### Diagnóstico rápido e encerramento

| Verificação | Resultado esperado | Se não ocorrer |
| --- | --- | --- |
| `curl.exe -I http://localhost:5173` no PC | HTTP 200 | Conferir Vite ligado e publicação `127.0.0.1:5173:5173`; recriar apenas o container de desenvolvimento se o Compose mudou. |
| `adb devices -l` | Aparelho com estado `device` | Conferir cabo, depuração e autorização USB; reiniciar o serviço ADB conforme a etapa 3. |
| `adb reverse --list` | `tcp:5173 tcp:5173` | Executar novamente `adb reverse tcp:5173 tcp:5173`, com o aparelho autorizado. |
| Chrome do Android | Login em `http://localhost:5173` | Atualizar a aba e conferir as três verificações anteriores. Se persistir, guardar as saídas e o código exato do erro para diagnóstico. |

Para remover somente este túnel:

```bat
C:\tools\platform-tools\adb.exe reverse --remove tcp:5173
```

Para encerrar o Vite, usar `Ctrl+C` no terminal em que ele está rodando.

O túnel USB usa a publicação em `127.0.0.1`; não exige uma regra de entrada da porta 5173 para acesso pela rede Wi-Fi. Caso a regra abaixo tenha sido criada apenas durante esse diagnóstico e não seja mais necessária, removê-la em **PowerShell como administrador**:

```powershell
Remove-NetFirewallRule -DisplayName "Minhas Financas - Vite Dev 5173"
```

Referências oficiais: [ADB](https://developer.android.com/tools/adb) e [Platform-Tools](https://developer.android.com/tools/releases/platform-tools).


## Autenticação

| Método | Rota | Finalidade |
| --- | --- | --- |
| GET | `/sanctum/csrf-cookie` | Preparar cookies CSRF |
| POST | `/api/v1/auth/login` | Entrar |
| GET | `/api/v1/me` | Consultar usuário autenticado |
| POST | `/api/v1/auth/logout` | Encerrar sessão |

As chamadas são centralizadas em `frontend/src/js/api.js`. Operações de escrita enviam `X-XSRF-TOKEN`. Não armazenar senhas ou tokens de autenticação em `localStorage`.

O login possui `throttle:5,1`. O teste do bloqueio HTTP 429 foi adiado. Os testes automatizados não comprovam proteção CSRF, pois essa proteção é desabilitada no ambiente de testes; o retorno HTTP 419 foi verificado manualmente.

## Desempenho local

Na medição realizada, a inicialização CLI do mesmo backend levou 2567 ms na montagem do Windows e 85 ms na cópia interna do container. Após mover `vendor` para volume Docker, o health check HTTP apresentou aproximadamente 46–67 ms nas chamadas aquecidas.

São medições locais, sem garantia de desempenho em produção. A cópia temporária usada no diagnóstico não faz parte da instalação nem deve ser usada para desenvolvimento.

## Segurança e publicação

Não versionar `.env`, senhas, cookies, tokens, backups ou chaves privadas. O Git ignora `vendor`, `node_modules`, `dist` e o binário Composer.

`APP_DEBUG=true` e `SESSION_SECURE_COOKIE=false` são configurações locais. Na produção HTTPS, usar `APP_DEBUG=false` e `SESSION_SECURE_COOKIE=true`.

A publicação na VPS ainda não foi executada nem validada. Será preparada em etapa própria, incluindo HTTPS, backup, atualização e rollback. Node não precisa rodar na VPS quando o frontend é compilado antes da publicação.

Não executar alterações na VPS sem autorização.
