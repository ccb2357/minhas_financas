# Operação, ambientes e implantação

Estado: comandos e caminhos abaixo refletem arquivos e instruções disponíveis, não uma implantação executada nesta etapa. Confirmar nomes de serviços/volumes no Compose efetivamente instalado. [PEND-001](pendencias-riscos.md#pend-001) controla diferenças.

## Ambientes conhecidos

| Ambiente | Organização conhecida | Limite de evidência |
|---|---|---|
| Desenvolvimento | Windows, `C:\var\www\minhas_financas`, `backend/` e `frontend/`, Nginx/PHP/MySQL em Docker | Compose integral e variáveis locais não auditados. |
| Frontend dev | Serviço `minhas-financas-node`, Vite 5173; backend via Nginx | Verificar nome no Compose antes de usar `docker compose exec`. |
| VPS | `/var/www/minhas_financas`, PHP-FPM, Nginx, MySQL, frontend estático em `dist` | Versões finais, mounts, política de restart e backup pendentes. |
| Endereço público informado | `https://minhasfinancas.zapbee.com.br`; variante www redireciona | TLS/renovação são configuração operacional a verificar, não teste realizado. |

Stack aprovada: [arquitetura](arquitetura.md). PHP 8.2/MySQL 8.0 foram informados após a fundação; não executar upgrade para coincidir com documento antigo. Node 22 foi usado no comando de build aprovado. Recuperar lockfiles atuais antes de reproduzir instalação.

## Configuração segura

O backend usa `.env` próprio; nunca copiar seu conteúdo para documentação, Git ou frontend. Conferir `APP_ENV`, `APP_DEBUG=false` em produção, `APP_URL`, chave existente da aplicação, DB MySQL, configurações de sessão/Sanctum/CSRF e domínio/cookies reais. Não gerar uma nova `APP_KEY` em instalação existente indiscriminadamente. O exemplo Laravel com SQLite não substitui MySQL deste projeto.

Para voz: `TRANSACTION_VOICE_ENABLED`, `OPENROUTER_API_KEY`, `OPENROUTER_TRANSCRIPTION_MODEL` e `OPENROUTER_EXTRACTION_MODEL`. Segredo fica exclusivamente no backend; não usar prefixo `VITE_` para a chave. Modelos e contratos em [API-008](contratos-integracoes.md#api-008). Alteração de variável com configuração cacheada exige renovar o cache conforme procedimento da instalação.

Limites PHP/Nginx devem aceitar a requisição multipart de até 8 MiB da aplicação e suportar latência dos dois serviços externos. Não aumentar limite sem considerar abuso. Validar origem e CSRF: não liberar CORS irrestrito como correção genérica.

## Executar em desenvolvimento

A raiz contém aplicações distintas. O Vite do `frontend/` serve o aplicativo Framework7; o Vite Laravel em `backend/` atende entradas Laravel e não controla automaticamente a interface do app.

No diretório `frontend/`, com dependências do lockfile:

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Caso use o serviço Node do Compose, executar o script nele, preservando publicação local da porta. `vite dev` também inicia Vite, mas precisa executar no projeto correto. Para filesystem montado Windows/Docker, a configuração aprovada no Vite do frontend é:

```js
server: {
  watch: { usePolling: true, interval: 300 },
  proxy: {
    '/api': { ...backend },
    '/sanctum': { ...backend },
    '/up': { ...backend },
  },
}
```

`backend` aponta para `http://nginx`, `changeOrigin: true`, header `Host: minhas-financas.localhost`. Isso é configuração de desenvolvimento; preservar plugins PWA existentes. Após editar `vite.config`, reiniciar o processo Vite; alterações normais em `src` usam HMR/reload. `refresh: true` no Laravel ou ignorar `storage/framework/views` não habilita polling no outro projeto. Em caso de UI antiga, verificar aba/porta, logs do Vite e SW antes de concluir que o código não mudou.

Android conectado por USB pode usar, no computador com ADB configurado:

```sh
adb reverse tcp:5173 tcp:5173
```

No aparelho, abrir `http://localhost:5173`. Acesso por IP em HTTP pode impedir microfone; produção usa HTTPS. Nenhuma instalação de plugin de áudio é necessária no fluxo atual.

## Build do frontend na VPS

Comando já adotado no projeto:

```sh
docker run --rm -v /var/www/minhas_financas/frontend:/app -w /app node:22-alpine sh -c "npm ci && npm run build"
```

Gera `frontend/dist`; não equivale a copiar automaticamente arquivos para um document root diferente. Conferir mount/root do Nginx, permissões/ownership e existência de `index.html`, assets, manifest e `sw.js`. Build depende de rede para dependências se não houver cache. Não executar `npm audit fix --force` ou atualização de stack como parte implícita da publicação.

## Publicar uma alteração

1. Identificar versão atual e checkout pretendido; ler migrations e compatibilidade de contratos.
2. Ter backup restaurável e plano de retorno antes de migrations/dados. Conferir diretório e ambiente.
3. Instalar dependências PHP do lockfile conforme infraestrutura (`composer install --no-dev --prefer-dist --optimize-autoloader`); processo/contêiner real de Composer deve ser confirmado.
4. Executar migrations revistas no PHP-FPM. O nome de contêiner informado foi `php-fpm`; exemplo conhecido:

```sh
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan migrate --force
```

5. Compilar frontend pelo comando acima; renovar caches Laravel exigidos pela alteração (`config:cache` e, quando aplicável e compatível, `route:cache`/`view:cache`). Confirmar diretórios graváveis de `storage` e `bootstrap/cache`.
6. Verificar saúde, login, CSRF, assets, ciclo, leitura de totais e uma operação controlada em conta de teste. Conferir versão PWA em navegador instalado e aberto.
7. Registrar data, versão, migrations e resultado; observar erros após publicação. Não registrar conteúdo de transações/áudio ou credenciais.

Essa sequência é um roteiro operacional proposto a partir da instalação conhecida, não prova de CI/CD configurada. Atualizações com banco exigem estratégia compatível: voltar apenas os arquivos não desfaz schema nem dados. Não usar `migrate:fresh`, `db:wipe`, `TRUNCATE` ou desativação de foreign keys como procedimento de deploy.

## Migrations e seeders especiais

Observação de orçamento depende de `2026_11_01_000007_add_notes_to_monthly_budgets.php`. Conferir migrations aplicadas antes de atribuir erro de coluna à UI. Artefatos Pluggy removidos não devem ser repostos a partir de ZIP antigo; inspeção do schema e histórico é obrigatória antes de limpeza remanescente.

`DatabaseSeeder` chama `DemoSeeder` nas fontes. **Não executar seed genérico em produção por hábito.** Demonstração é operação explícita e usa conta própria, preserva demais usuários, mas política de permanência/credencial depende de PEND-005. `CategoriesSeeder` isolado pressupõe exatamente um usuário; método direcionado por usuário tem contexto próprio. Não documentar nem reaproveitar senha previsível de demonstração para conta real.

## Monitoramento e diagnóstico

`GET /up` é rota de saúde disponível, não prova de integridade financeira, OpenRouter ou backup. Logs Laravel, Nginx e contêineres auxiliam diagnóstico; procurar status/endpoint/tempo e correlação, sem corpo sensível. Acompanhar 401/419 (sessão/CSRF), 422 (validação), 428 (ciclo), 429 (limite), 5xx e falhas externas conforme contratos. Monitoramento externo, alertas de disco, TLS, banco e custo da IA são propostas ainda não comprovadas instaladas.

## Backup e recuperação

Política depende de [PEND-003](pendencias-riscos.md#pend-003). Um backup útil deve incluir banco consistente, código/versão e configuração protegida necessária à recuperação; arquivos de áudio não são arquivo de domínio a preservar. Definir como guardar chave da aplicação/segredos com acesso distinto, criptografia e cópia fora da VPS. Não imprimir credenciais em linha de comando de exemplo.

Restauração deve ocorrer primeiro em ambiente isolado, sem envio real de voz ou comunicação externa. Restaurar banco e versão compatível, configurar sessão/URL de teste, conferir migrations, contagens por usuário, totais de ciclos, limites, saldo dos objetivos e amostras de lançamentos/notas. Registrar duração, ponto recuperado e falhas. Só então considerar a política validada. Nenhum RPO/RTO ou job de backup é declarado existente nesta SDD.

## Limpeza e exclusão

Apagar lançamentos pelo app usa soft delete e recalcula consultas. Limpeza administrativa por usuário/período requer escopo explícito, backup, verificação de relacionamentos e validação posterior. `TRUNCATE transactions` afeta a tabela inteira e não segue regras do produto; não é recomendado como resposta genérica à limpeza de testes. A solicitação de documentação não autoriza nenhuma dessas ações.
