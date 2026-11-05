# Lançamento por voz

## Instalação

1. Extraia o pacote na raiz de `minhas_financas`, substituindo os arquivos indicados.
2. Copie estas variáveis para `backend/.env` e informe sua chave do OpenRouter:

```dotenv
TRANSACTION_VOICE_ENABLED=true
OPENROUTER_API_KEY=sua_chave_aqui
OPENROUTER_TRANSCRIPTION_MODEL=openai/whisper-large-v3
OPENROUTER_EXTRACTION_MODEL=google/gemini-2.5-flash-lite
```

A chave fica somente no backend. Não use variáveis com prefixo `VITE_`.

3. Limpe o cache de configuração:

```bash
docker exec -w /var/www/minhas_financas/backend php-fpm php artisan config:clear
```

4. Gere novamente o build do frontend com o comando habitual. Em desenvolvimento, o Vite carrega os arquivos alterados.

Não há migrations, novas dependências ou alterações no banco.

## Uso

Em **Novo lançamento**, toque em **Preencher por voz**, permita o microfone, fale uma movimentação e toque em **Parar e preencher**. Exemplo: “Gastei cento e vinte e cinco reais e noventa no supermercado ontem”.

O áudio é transcrito e o texto é interpretado numa segunda chamada. O formulário recebe os campos identificados. Confira e toque em **Salvar lançamento**. Uma observação ditada explicitamente preenche o campo Observação. Se não houver observação na fala, o texto já digitado nesse campo é preservado. Exemplo: “Gastei 10 reais no supermercado Munhoz, na observação coloque compra para o churrasco”. O botão não aparece na edição.

- Gravação limitada a 45 segundos e envio de até 8 MiB.
- Até 5 solicitações por minuto por usuário autenticado.
- Categorias restritas às categorias ativas da própria conta e compatíveis com o tipo.
- Campos não identificados ficam para conferência/preenchimento; a mensagem indica os ausentes. Se o tipo não for identificado, o seletor atual é preservado e a mensagem pede conferência explícita do tipo.
- Data de referência no fuso America/Sao_Paulo. O modelo recebe a orientação de usar hoje se a data for omitida.
- Um lançamento por gravação. Falas com várias movimentações são recusadas.
- “Cancelar” interrompe o fluxo sem salvar. Fechar o formulário libera o microfone; deixar a página em segundo plano durante a gravação cancela a captura.
- A transcrição pode ser consultada na própria tela. O aplicativo não grava o áudio nem a transcrição no banco; o upload temporário é usado durante a requisição. O áudio é enviado ao OpenRouter e ao provedor de transcrição, e o texto/catálogo ao provedor de interpretação, conforme as políticas desses serviços.
- Uso de microfone exige HTTPS em produção ou localhost em desenvolvimento. O preenchimento manual continua disponível.

## Verificação e limites

Foram executadas 23 verificações do serviço com Laravel 12, SQLite e respostas HTTP simuladas: processamento em duas etapas, valores em centavos, catálogo por usuário, categorias inativas e alheias, incompatibilidade de tipo, campos ausentes, limites monetários, datas inválidas, JSON inválido, múltiplas movimentações, transcrição vazia, resposta 429 e função desativada.

Testes em Chromium com captura simulada verificaram gravação, cancelamento antes e depois do envio, permissão negada, limpeza do microfone, envio multipart com CSRF, preenchimento dos campos, incluindo observação ditada e preservação da observação existente quando não mencionada, máscara monetária, salvamento somente mediante confirmação e ausência da função na edição.

Os módulos JavaScript e o CSS alterados foram compilados com Vite 8.3.4. Não foi possível executar o build completo do aplicativo neste ambiente recuperado, pois a cópia integral do projeto não estava disponível. O pacote contém somente os arquivos desta alteração e preserva o formulário e estilos anteriores recuperados dos últimos ajustes.

Sem uma chave configurada, não houve chamada real ao OpenRouter. Após ativar, teste uma despesa e uma receita reais e confira principalmente valores e categorias antes de salvar. Os modelos e rotas de integração foram preparados conforme a documentação consultada do OpenRouter; disponibilidade, cobrança e precisão reais precisam ser confirmadas nessa primeira utilização.

## Problemas comuns

- “Ainda não foi configurado”: confira as variáveis no `.env` e rode `config:clear`.
- Microfone indisponível: confira HTTPS/localhost, permissão no navegador e suporte a MediaRecorder.
- Serviço indisponível: confira saldo, chave, acesso aos modelos e conectividade do container PHP com `https://openrouter.ai`.
- Se a infraestrutura rejeitar um arquivo antes de chegar ao Laravel, confira os limites de upload do Nginx e PHP. O limite da funcionalidade no Laravel é 8 MiB.

## Desativar

Defina `TRANSACTION_VOICE_ENABLED=false` no backend e limpe o cache de configuração. As chamadas de IA serão bloqueadas; o cadastro manual permanece disponível.
