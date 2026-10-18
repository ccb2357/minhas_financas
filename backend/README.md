# Minhas Finanças — Backend e ambiente local

PWA financeiro pessoal para lançamentos manuais de receitas e despesas.
Moeda exclusiva: real brasileiro (BRL).

## Estado do projeto

Sprint 0 em andamento. A próxima sprint depende de aprovação.

Implementado e validado:

- Laravel conectado ao MySQL com banco e usuário exclusivos.
- Migration inicial de usuários.
- Health check pelo Nginx e pelo proxy do Vite.
- Framework7 Core e Apache ECharts funcionando no frontend.
- Build do frontend.
- Autenticação Sanctum por sessão e cookies.
- Login, consulta de sessão e logout.
- Rejeição de senha incorreta e de requisição sem token CSRF.
- Composer executado com o PHP do container.
- Dependências PHP em volume Docker para melhorar o desempenho local.

Pendente:

- Validar o limite de tentativas de login, cujo teste foi adiado.
- Validar integralmente a preparação em outro computador.
- Concluir os demais critérios da Sprint 0 e obter aprovação.

A interface atual é uma página técnica de teste.
As telas definitivas seguirão as referências visuais aprovadas.

## Stack instalada

- PHP 8.2.29 no container.
- Laravel 12.70.0 e Laravel Sanctum.
- MySQL 8.0.45.
- Framework7 Core 9.2.0, JavaScript e Framework7 Icons 5.0.5.
- Apache ECharts 6.1.0.
- Vite 8.3.4.
- Node 22 e npm pelo Docker.
- Nginx e Docker Compose da infraestrutura existente.

Os arquivos composer.lock e frontend/package-lock.json registram
as versões das dependências e devem permanecer no Git.

## Organização local

Projeto no Windows:

    C:\var\www\minhas_financas

Projeto nos containers Nginx e PHP:

    /var/www/minhas_financas

Infraestrutura compartilhada:

    C:\var\www\infra

O Compose e as configurações Nginx compartilhadas ficam fora deste
repositório. Não substituí-los por arquivos genéricos do projeto.

## Infraestrutura necessária

Reutilizamos os serviços nginx, php-fpm e mysql na rede infra_network.

No serviço php-fpm, o volume exclusivo do vendor é montado em:

    minhas_financas_vendor:/var/www/minhas_financas/backend/vendor

Declaração no bloco de volumes do Compose:

```yaml
minhas_financas_vendor:
    external: true
    name: minhas_financas_vendor
```

O serviço auxiliar minhas-financas-node utiliza:

- Imagem node:22-alpine.
- Perfil dev.
- Diretório de trabalho /app.
- Montagem ../minhas_financas/frontend:/app.
- Volume minhas_financas_node_modules em /app/node_modules.
- Porta 127.0.0.1:5173:5173.
- Rede infra_network.

O volume externo deve existir antes de iniciar o PHP-FPM:

```bat
docker volume create minhas_financas_vendor
```

Em ambiente novo, preencher esse volume pelo Composer no container.
Não copiar o vendor do Windows como procedimento habitual.

Recriar o PHP-FPM compartilhado interrompe brevemente outros projetos.
Seu entrypoint também reaplica permissões sobre /var/www.
Mudanças nesse serviço exigem planejamento e autorização.

## Configuração privada

O backend/.env não é versionado.

Usar backend/.env.example como modelo e preencher as credenciais
exclusivas do banco minhas_financas.

- Host MySQL no Docker: mysql.
- Porta: 3306.
- Sessões e cache: arquivos.
- Fila: execução síncrona.
- Cookie de sessão: minhas_financas_session.
- Domínios Sanctum locais: localhost:5173 e minhas-financas.localhost.

APP_DEBUG=true e SESSION_SECURE_COOKIE=false são configurações locais.
Na produção HTTPS, usar APP_DEBUG=false e SESSION_SECURE_COOKIE=true.

Nunca enviar .env, senhas, cookies, backups ou tokens ao GitHub.

## Composer pelo container

Na raiz do projeto:

```bat
tools\composer.cmd --version
tools\composer.cmd check-platform-reqs
tools\composer.cmd install
```

O atalho executa o Composer com o PHP do serviço php-fpm e utiliza
o vendor do volume Docker.

Não executar composer install ou composer require diretamente pelo
PHP do Windows para atualizar as dependências utilizadas pelo container:
o vendor local do Windows fica oculto pela montagem do volume.

O arquivo tools/composer.phar é ignorado pelo Git. Na instalação
Windows atual, ele foi copiado de:

    C:\ProgramData\ComposerSetup\bin\composer.phar

Em outro computador, disponibilizar o Composer nessa mesma pasta tools,
obtendo-o de uma instalação confiável do Composer.

## Comandos Laravel

Executados pelo PHP do container:

```bat
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan --version
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan db:show
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan migrate:status
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan config:clear
```

Aplicar migrations somente após conferir o banco de destino:

```bat
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan migrate
```

Criar usuário inicial sem cadastro público:

```bat
docker exec -it -w /var/www/minhas_financas/backend php-fpm php artisan app:create-user
```

A senha é solicitada de forma oculta e armazenada como hash.
Não executar novamente para um e-mail já cadastrado.

## Frontend

Executar os comandos abaixo na pasta da infraestrutura.

Instalar dependências após clonar ou atualizar o arquivo de lock:

```bat
docker compose --profile dev run --rm --no-deps minhas-financas-node npm ci
```

Iniciar o desenvolvimento:

```bat
docker compose --profile dev run --rm --no-deps --service-ports minhas-financas-node npm run dev
```

Manter o terminal aberto. Encerrar com Ctrl+C.

Gerar o build:

```bat
docker compose --profile dev run --rm --no-deps minhas-financas-node npm run build
```

O resultado fica em frontend/dist e não é versionado.

Node não precisa executar na VPS quando o frontend é compilado antes
da publicação.

## Endereços locais

- Frontend: http://localhost:5173
- Laravel: http://minhas-financas.localhost
- Health check direto: http://minhas-financas.localhost/up
- Health check pelo Vite: http://localhost:5173/up

O Vite encaminha /api, /sanctum e /up ao Nginx existente,
com Host minhas-financas.localhost.

A configuração Nginx atual serve backend/public.
A configuração para publicação do frontend ainda será preparada.

## Autenticação

Rotas:

- GET /sanctum/csrf-cookie
- POST /api/v1/auth/login
- GET /api/v1/me
- POST /api/v1/auth/logout

Fluxo:

1. Preparar os cookies CSRF.
2. Enviar login com o cabeçalho X-XSRF-TOKEN.
3. Consultar o usuário autenticado.
4. Encerrar a sessão pelo logout.

O frontend centraliza as chamadas em frontend/src/js/api.js.
Não armazenar senha ou token de autenticação em localStorage.

Respostas verificadas:

- 204: preparação de cookies e logout.
- 200: login e consulta autenticada.
- 401: consulta sem autenticação.
- 419: requisição sem proteção CSRF.
- 422: credenciais incorretas.

O login possui throttle:5,1, limitado a cinco requisições por minuto
por IP para clientes não autenticados. O teste de HTTP 429 foi adiado.

## Desempenho local

O backend está montado a partir do Windows. No diagnóstico realizado:

- Inicialização CLI na montagem Windows: 2567 ms.
- Mesma inicialização em cópia interna do container: 85 ms.

Após mover vendor para o volume Docker, o health check HTTP respondeu
em aproximadamente 46–67 ms nas chamadas aquecidas.

Essas medições são locais e não constituem garantia de desempenho
em produção.

## Preparação em outro computador

1. Clonar o repositório na pasta minhas_financas.
2. Preparar a infraestrutura compartilhada e revisar suas configurações.
3. Criar o volume externo e configurar sua montagem no PHP-FPM.
4. Disponibilizar tools/composer.phar.
5. Copiar backend/.env.example para backend/.env e preencher os dados locais.
6. Executar tools\composer.cmd install.
7. Gerar uma APP_KEY própria para o novo ambiente local.
8. Preparar o banco exclusivo, aplicar migrations e criar o usuário.
9. Executar npm ci pelo serviço Node.
10. Iniciar Vite e repetir os testes da Sprint 0.

Não copiar APP_KEY de outro ambiente para uma instalação nova.
Em restauração de um ambiente existente, preservar a chave original.

## Publicação

A publicação na VPS ainda não foi executada nem validada.
Será preparada em etapa própria, com HTTPS, configuração de produção,
backup e instruções de atualização e rollback.

Não executar alterações na VPS sem autorização.
