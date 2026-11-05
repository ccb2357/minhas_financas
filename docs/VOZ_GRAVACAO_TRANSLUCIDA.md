# Gravação de voz com visualização

Extraia na raiz do projeto e gere novamente o build. Não há migrations, novas dependências nem alteração de configuração do OpenRouter.

## Interface

- Microfone flutuante menor (48 px), somente em Novo lançamento.
- Ao tocar, abre uma camada branca translúcida com desfoque do formulário.
- Botão central azul com microfone maior que na última prévia: toque nele para finalizar e preencher.
- Cronômetro da gravação, sem “Ouvindo você” e sem “Toque para finalizar”.
- Botão circular vermelho com X abaixo cancela a gravação. Também permite cancelar o processamento antes de aplicar a resposta.
- Durante a permissão/processamento, o círculo central mostra um indicador de espera.
- Os erros e os avisos de campos não identificados continuam no modal padrão do aplicativo.
- O lançamento só é salvo ao confirmar no formulário.

## Visualização do áudio

As 56 barras radiais são desenhadas em canvas usando um AnalyserNode da Web Audio API, ligado ao MESMO MediaStream usado para gravar. Cada barra usa energia de frequência entre 80 Hz e 6 kHz, e o tamanho é modulado pela amplitude RMS do áudio captado. Não há animação de volume aleatória ou pré-gravada. O filtro de suavização reduz tremulação; na ausência de sinal significativo, as barras recuam à marcação mínima. O movimento depende do volume e das frequências realmente captadas pelo microfone, inclusive ruído ambiente.

O áudio do analisador não é conectado à saída de som, evitando retorno/eco. Ao finalizar, cancelar, fechar o formulário ou interromper a captura em segundo plano, o aplicativo desconecta o analisador, cancela os quadros e fecha o AudioContext, além de liberar as trilhas do microfone.

O navegador precisa oferecer MediaRecorder e AudioContext (ou webkitAudioContext), em HTTPS ou localhost. Se não oferecer, o usuário recebe um modal e continua podendo preencher manualmente.

## Verificações

Em Chromium, foi utilizado um MediaStream de teste com sinal sonoro real gerado pela Web Audio API. Comparou-se a área desenhada das barras com sinal e com silêncio: ela aumentou com o sinal e recuou no silêncio. Também foram conferidos o preenchimento e a máscara monetária, observação ditada, preservação de observação existente, confirmação antes de salvar, ausência na edição, cancelamento por X e Escape, liberação dos AudioContexts, e modais de permissão negada e indisponibilidade do serviço. As respostas do OpenRouter nesses testes foram simuladas.

Os módulos JavaScript e CSS alterados foram compilados com Vite. O build completo deve ser executado no projeto instalado. Não foi feita uma nova chamada real ao OpenRouter nesta alteração de interface.
