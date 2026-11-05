# Botão flutuante de voz

Extraia na raiz do projeto e gere novamente o build. Não há migrations, dependências novas nem alteração de variáveis de ambiente.

Somente em Novo lançamento:
- Microfone redondo fixo no canto inferior direito.
- Ao tocar, inicia a gravação e fica vermelho com uma bolinha branca no centro.
- Ao tocar novamente, finaliza o áudio e preenche o formulário.
- Durante o processamento, mostra um indicador de espera.
- Cancelar continua disponível durante a captura/processamento.
- Falhas de gravação, permissão ou serviço aparecem no diálogo padrão do aplicativo. Campos não identificados também geram um aviso para conferência.
- O usuário continua conferindo e salvando pelo botão Salvar lançamento.

A área inferior de rolagem foi ampliada para permitir acessar os botões do formulário sem ficarem atrás do microfone. A consulta da transcrição continua disponível após o preenchimento.

Verificado em Chromium com captura e respostas simuladas: posição fixa durante a rolagem, estados do ícone/bolinha, preenchimento dos campos, observação ditada e preservada, envio multipart com CSRF, confirmação antes de salvar, ausência da função na edição, cancelamento, liberação do microfone, modal de permissão negada e modal de falha do serviço. Os módulos JavaScript e o CSS alterados foram compilados com Vite. O build completo deve ser executado no projeto instalado.
