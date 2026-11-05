# Telas e UX

## Convenções para design e criação de imagens

Estado da linha de base: implementado, com evidências C/R parciais indicadas em [fontes](fontes-e-status.md). Modais, sheets e overlays são superfícies reais mesmo quando não possuem rota própria. Não inventar uma rota para cada modal.

- UI mobile pt-BR, fonte Nunito local, Framework7 Icons, fundo claro suave, cartões brancos arredondados, azul primário. Tema escuro usa os tokens existentes; a camada de gravação aprovada é branca translúcida.
- Navegação inferior: **Início / Orçamento / Lançar (+ central) / Objetivos / Mais**. Histórico, Relatórios e Categorias são acessíveis por atalhos; neles nenhum item inferior é marcado por associação indireta.
- Cabeçalho com título/subtítulo e ilustração aprovada. Não criar novo cabeçalho corporativo ou marca diferente a partir de imagens geradas de prévia.
- Valores em BRL e contagens por período. Não usar cor como prova de qualidade financeira; as cores dos donuts obedecem regras numéricas específicas.
- Abrir formulários no topo com foco no título sem rolagem; restaurar foco com preventScroll. Estados de validação e confirmação de descarte são obrigatórios.
- Imagens futuras são representações para aprovação, não autorização de alterar cálculo/escopo. Usar dados fictícios consistentes com as fórmulas e mostrar os estados pedidos; manter campo sem legenda “(opcional)”.

## TELA-001

### Login

**Acesso:** abertura do app sem sessão válida; superfície `auth-view`, fora das rotas financeiras. **Objetivo:** autenticar usuário provisionado.

**Componentes/campos:** marca/título de acesso, E-mail, Senha, botão mostrar/ocultar, Lembrar de mim e Entrar. E-mail tem teclado apropriado e autocomplete; a referência recuperada limita-o a 254 caracteres. Não adicionar registro público, SSO ou MFA por associação com outros projetos.

**Ações/estados:** inicial verifica sessão com carregamento; credenciais válidas abrem workspace. Campos inválidos e falha de credenciais ficam junto ao formulário. Entrar mostra busy e impede duplo envio. Sessão expirada retorna a essa tela; preservar apenas o que o fluxo existente permite, nunca a senha legível. Recuperação de senha não é funcionalidade comprovada.

## TELA-002

### Dashboard / Início — `/inicio/`

**Acesso:** login, item Início, retorno ao resumo. **Objetivo:** acompanhar o ciclo selecionado.

**Ordem/componentes:** cabeçalho Dashboard; seletor de ciclo com referência e datas; cartão azul compacto com Resultado do ciclo à esquerda e donut à direita; dois cartões separados de Entradas e Saídas com contagens; ranking Onde você mais gastou/Ver todas; gráfico Entradas × Despesas dos últimos seis ciclos; atalho Relatórios; Últimos lançamentos; atalho Histórico completo.

**Cartão azul:** mesmo fundo/ondas discretas de Orçamentos, padding vertical reduzido; número branco com espaçamento normal e negrito alinhado ao resultado de Relatórios. Resultado negativo permitido. Sem comparação anterior, sem valores de entradas/saídas dentro dele e sem frase Entradas utilizadas. Donut pequeno de dimensões comuns; percentual inteiro conforme RN-008.

**Ações:** cartões de entrada/saída abrem histórico do tipo; categoria abre filtro; Ver todas e gráfico levam a Relatórios, sem manter Início marcado; último lançamento abre editar; + abre criar.

**Estados:** ciclo não configurado mostra Definir ciclo; carregando não exibe valores de outra referência; vazio mostra totais zero e convites apropriados; falha tem tentar novamente; mutação bem-sucedida atualiza dados; valores longos não colidem com donut.

## TELA-003

### Novo lançamento — popup

**Acesso:** + central de qualquer área autenticada. **Objetivo:** registrar uma movimentação.

**Layout:** cabeçalho Novo lançamento; um único cartão branco contendo seletor deslizante Entrada/Saída no topo, seguido de Valor, Descrição, Categoria, Data e Observação. Abaixo, Salvar lançamento e Cancelar. Microfone flutuante pequeno no canto inferior direito com área segura e espaço para rolar até ações sem encobrimento.

| Campo | Tipo/conteúdo | Apresentação/ação |
|---|---|---|
| Tipo | income/expense | Botões Entrada/Saída com fundo azul deslizante; troca atualiza categorias compatíveis. |
| Valor | moeda positiva | Input no padrão da descrição; R$ cinza fixo, ambos em negrito, nunca retirar prefixo com campo vazio. |
| Descrição | texto obrigatório, 255 | Sem ícone, placeholder ou azul removido; texto livre. |
| Categoria | seletor | Categorias ativas do tipo; ícone representativo preservado. |
| Data | data obrigatória | Ícone de calendário mantido; fundo azul removido; abre calendário do app. |
| Observação | textarea, 2000 | Sem ícone/placeholder/rótulo opcional/azul removido. |

**Estados:** carregando categorias bloqueia salvar; erro de categorias informa recuperação; nenhuma categoria pede cadastro; validação mantém conteúdo; salvando bloqueia campos e dupla submissão. Sair com alterações pede confirmação. Sucesso fecha/atualiza conforme contexto; não salvar automaticamente ao terminar áudio.

## TELA-004

### Editar lançamento — popup

Mesmo formulário de TELA-003, com título/subtítulo de edição, dados preenchidos, Salvar lançamento, Excluir lançamento e Cancelar. **Não possui microfone nem overlay de voz.** Categoria inativa já vinculada pode continuar visível; nova categoria segue o filtro de ativas. Alterar data ou tipo impacta ciclo/categoria após confirmação. Excluir abre TELA-020. Falha de registro removido em outra sessão deve orientar atualizar o histórico.

## TELA-005

### Histórico — `/historico/`

**Acesso:** atalhos da Dashboard, cartões de resumo, ranking ou URL com filtros. **Objetivo:** consultar e corrigir lançamentos.

**Componentes:** cabeçalho, seletor de ciclo/intervalo, filtros tipo/categoria, busca por descrição, contagem, lista de linhas com ícone de categoria, descrição, categoria/data, valor com sinal e ação de edição; paginação/carregar mais conforme módulo atual. URL usa month, tipo, category_id e range quando herdado.

**Estados:** início carrega; vazio reflete filtro atual e não afirma ausência global de dados; erro permite repetir; mais páginas mantêm filtro; retorno da edição atualiza lista/totais. Ao abrir por categoria de Relatórios, manter 3 ciclos/ano correspondente ao valor de origem. Anular um filtro não deve alterar tipo/período dos demais sem ação explícita.

## TELA-006

### Relatórios — `/relatorios/`

**Ordem:** cabeçalho; seletor de referência com datas; seletor deslizante Ciclo / 3 ciclos / Ano de ciclos; nota do intervalo; cartões Entradas e Saídas com valor/contagem; cartão de largura total Resultado do período (entradas menos saídas); ranking completo Despesas por categoria; gráfico Entradas × Despesas.

**Exclusões visuais aprovadas:** não mostrar percentual/anterior/diferença nos cartões de totais; não mostrar comparação antiga de resultado; não mostrar Maior gasto nem Categoria mais usada. Campo extra na API não autoriza reintroduzir esses cartões.

**Ações/estados:** categoria abre histórico filtrado com intervalo; seleção deslizante mantém dados consistentes durante carregamento; erro tem recuperação; vazio mostra zero/mensagem sem dado residual. No ano, datas do gráfico de 12 ciclos e datas dos totais até o ciclo selecionado precisam ser legíveis e não sugerir mesma extensão quando diferirem.

## TELA-007

### Orçamentos — `/orcamentos/`

**Ordem:** cabeçalho, seletor de ciclo, resumo azul, cartão Sem orçamento, lista de orçamentos, ação Copiar orçamentos entre ciclos e ação Novo orçamento. A cópia fica abaixo da listagem conforme refinamento aprovado.

**Resumo:** título Orçamento total utilizado; valor utilizado “de” total, maiores e em negrito; percentual exclusivamente dentro do donut. Fundo/ondas iguais à Dashboard, padding superior/inferior compacto. Donut e texto interno têm dimensões iguais aos da Dashboard. Ver RN-012 para limiares específicos.

**Lista:** categoria/ícone, gasto e limite, progresso, restante ou excesso; tocar edita. A observação pertence ao formulário; não inventar sua exibição no card se a tela não a renderiza.

**Estados:** sem configuração → Definir ciclo; sem orçamento → convite para criar e despesas sem orçamento separadas; carregando/erro/repetir; limite excedido é alerta, não bloqueio de novos lançamentos; paginação não altera totais.

## TELA-008

### Novo orçamento / Editar orçamento — popup, dois modos

**Campos em ordem:** Ciclo do orçamento; Categoria de despesa; Limite do ciclo com R$; Observação (textarea abaixo, até 2000 caracteres). Ciclo deve mostrar intervalo completo dentro do campo, no padrão `10 nov. 2026 a 09 dez. 2026`.

**Novo:** ciclo/categoria selecionáveis, categorias ativas de despesa, Salvar orçamento e Cancelar. **Editar:** ciclo e categoria identificam o orçamento e permanecem fixos/desabilitados; limite e observação editáveis; inclui Remover orçamento. Observação sem placeholder, legenda opcional ou foco azul solicitado para remoção.

**Estados:** carregar categorias/datas; opções vazias; duplicação aponta categoria; limite inválido aponta valor; busy bloqueia; confirmação de descarte se alterado; sucesso recarrega ciclo; remoção preserva lançamentos.

## TELA-009

### Sem orçamento — popup/superfície própria

**Acesso:** cartão Sem orçamento na listagem. **Conteúdo:** título, contexto de ciclo, total e ranking/listagem das despesas de categorias sem limite. Respeitar intervalos de datas do ciclo. Permite consultar dados do grupo conforme fluxo existente e voltar ao orçamento. Não transformar essa tela em previsão de gastos.

**Estados:** abre no topo mesmo com lista longa; foco não pula para botão Voltar ao orçamento; vazio informa ausência de despesas sem limite; erro permite tentar novamente; fechar mantém posição anterior sem deslocamento por foco.

## TELA-010

### Copiar orçamentos — diálogo

**Acesso:** ação abaixo da lista. **Componentes:** contexto de origem, campo Ciclo de destino com intervalo completo dentro do campo, Confirmar e Cancelar, área de erro. Não repetir a data em legenda inferior.

**Fluxo:** escolher destino, confirmar lote, indicar conclusão e abrir/atualizar destino conforme contexto. **Erros:** destino igual à origem, origem vazia, categorias inativas, conflito ou mudança concorrente; manter diálogo e mensagem, sem afirmar cópia parcial. Busy impede nova confirmação.

## TELA-011

### Objetivos — `/objetivos/`

**Componentes:** cabeçalho; seletor deslizante Ativos/Arquivados; cartões com nome/ícone, meta, guardado, progresso, prazo quando houver; carregar mais; Novo objetivo. Tocar cartão abre detalhes.

**Vazios distintos:** Ativos convida criar primeiro plano; Arquivados informa que concluídos/arquivados aparecerão ali. Carregamento limpa referência anterior; erro oferece repetir; novas criações retornam ao grupo ativo. Nenhuma exclusão definitiva de objetivo no menu.

## TELA-012

### Detalhes do objetivo e formulário de objetivo

**Detalhes:** cabeçalho com nome e estado; resumo Valor guardado/Meta, barra, faltante/meta atingida, prazo/Sem prazo/Prazo encerrado. Lista Movimentações inicia com até cinco e oferece Ver todas/carregar mais. Card Gerenciar objetivo com Guardar valor, Retirar valor, Editar, Arquivar; Concluir aparece ao atingir meta. Arquivado permite Reabrir e leitura, sem edição direta.

**Novo objetivo:** nome até 80, ícone do catálogo, valor desejado e switch Definir prazo; data só aparece se habilitada. **Editar objetivo:** mesmos metadados preenchidos, sem ajuste direto de valor guardado. São popups, não rotas independentes inventadas.

**Estados:** carregar detalhes; falha/404; busy; meta atingida não conclui automaticamente; arquivado/concluído preserva histórico. Descarte e conflito de versão usam diálogo/feedback e recuperação por atualização.

## TELA-013

### Guardar / Retirar / Editar movimentação — popup, três modos

**Componentes:** contexto do objetivo, tipo Guardar/Retirar, Valor, Data e Observação até 1000 caracteres; ação salvar e cancelar; edição oferece excluir movimento. Sem legenda opcional ao lado do campo. Não atribuir ao objetivo ícones/placeholders removidos somente de lançamento.

**Leitura em arquivados:** movimento pode ser consultado; edição exige reabrir objetivo. **Erros:** valor inválido, falta de saldo, correção que negativaria reserva, 409 de versão, registro não encontrado e rede. Rejeição não altera o saldo visível como se tivesse salvo. Operação aceita atualiza detalhes e cartões de objetivo, sem mudar Dashboard financeiro.

## TELA-014

### Categorias — `/categorias/`

**Componentes:** cabeçalho, seletor deslizante Todas/Receitas/Despesas, estado Ativas/Inativas/Todas as situações, contagem, grid/lista com ícones/cores e ação Nova categoria. Rotas/tipos da API seguem o contrato próprio.

**Estados:** carregando; nenhuma categoria no filtro; erro/repetir; mais páginas. Tocar abre edição. O item Mais do menu inferior não fica marcado só por ter originado a navegação. Regras de desativação/exclusão com vínculos devem ser verificadas no controller completo.

## TELA-015

### Nova categoria / Editar categoria — popup

**Conteúdo:** cabeçalho, prévia, Nome até 80, tipo Receita/Despesa, seletor de ícone, cor e estado quando cabível; Salvar e Cancelar, ações de ciclo de vida existentes no modo editar. Não criar uma opção para apagar históricos relacionados.

**Estados:** prévia acompanha preenchimento; validação mostra erro do nome/tipo/catálogo; busy bloqueia; confirmação de descarte; falha conserva conteúdo; sucesso retorna à listagem. O inventário exato de cores/ícones deve ser derivado do catálogo atual para imagens finais, sem inventar opções.

## TELA-016

### Mais / Configurações — `/mais/`

**Itens atuais:** cartão de perfil; Aparência; Categorias; Ciclo financeiro; Alterar senha; Instalar aplicativo quando disponível; Sair da conta. Não inclui sincronização bancária, duplicação do menu Objetivos nem menus futuros sem ação. O nome técnico `demo/pages.js` não significa tela fictícia.

**Estados:** nome/e-mail em texto escapado; tema claro/escuro com rótulo da ação; instalação oculta se já instalada; logout busy; falha ao sair abre diálogo.

## TELA-017

### Editar perfil — popup

Nome e E-mail preenchidos. Se e-mail mudar, revelar Senha atual e orientação de confirmação; Salvar perfil/Cancelar abaixo. Confirmar descarte se alterado, indicar falha junto aos campos; ao salvar atualizar cartão. Ao fechar limpar inputs e restaurar foco sem rolar.

## TELA-018

### Alterar senha — popup

Senha atual, Nova senha e Confirmar nova senha, botões mostrar/ocultar por campo, instrução de mínimo 12 caracteres e novo acesso após salvar; Salvar nova senha/Cancelar. Não preencher campos com senha existente. Busy bloqueia, erro mantém formulário, sucesso direciona novo login. Limites backend superiores e política efetiva aguardam auditoria.

## TELA-019

### Configurar ciclo financeiro — popup

**Campos/contexto:** corte atual, seletor Dia de corte, versão carregada e informação do próximo ciclo/corte agendado. Primeira configuração não tem valor default silencioso. Salvamento permite perceber que mudança entra no futuro, sem reescrever ciclo já iniciado.

**Estados:** carregamento de configuração; inicial não configurado; edição com pendência; conflito 422 pede reabrir; rede/401 têm tratamento correspondente; sucesso atualiza resumo e datas. Componente de escolher ciclo no restante do app é descrito em TELA-024.

## TELA-020

### Diálogos de confirmação, aviso e erro

Padrão Framework7 já usado: título curto, mensagem contextual escapada, botões claros. Usos: descartar formulário, excluir lançamento/orçamento/movimento, arquivar/concluir/reabrir, erro de voz e conferência de campos não identificados. Não usar alert nativo do navegador como substituição improvisada.

Ao cancelar, manter formulário/seleção; ao confirmar operação destrutiva, aguardar backend. Diálogo de voz pode exigir Entendi antes de reabilitar microfone. Nunca mostrar corpo bruto do provedor, stack trace ou segredo.

## TELA-021

### Sem conexão e estados de atualização PWA

**Sem conexão:** recurso `offline.html` informado no build; mensagem de indisponibilidade e tentativa de recuperar acesso. Não prometer leitura de dados financeiros cacheados.

**Atualização:** aviso automático entregue anteriormente, sem restaurar o antigo botão Atualizar versão. Deve preservar edição ativa; janela antiga pode necessitar recarga. Layout e estratégia final dependem do módulo SW/updates efetivo, não disponível integralmente. Registre essa limitação em imagens para aprovação de uma eventual mudança.

## TELA-022

### Overlay de gravação

**Acesso:** microfone da TELA-003. **Aspecto aprovado:** tela branca translúcida sobre formulário desfocado, sem título Ouvindo você; centro com círculo azul e microfone branco, maior que na última prévia; 56 barras azul/ciano ao redor; cronômetro abaixo; botão vermelho circular com X mais abaixo. Sem frase Toque para finalizar, sem botão Cancelar textual e sem link Ver transcrição.

**Interação:** círculo central finaliza; X cancela; Escape cancela em teclado; backdrop não salva. O overlay é modal, recebe foco e deixa o conteúdo anterior inerte. Microfone flutuante fica oculto durante a captura. Barras reais reagem mais sensivelmente ao sinal, com marcação mínima no silêncio.

**Estados:** solicitando permissão (indicador de espera); gravando (barras/tempo); processando (botão central bloqueado e indicador, mensagem breve Preenchendo); sucesso fecha e aplica rascunho; erro fecha e abre TELA-020; cancelamento libera recursos e não aplica resposta tardia. Limites e datas em RN-026/RN-030.

## TELA-023

### Seletor de ícones — sheet/modal auxiliar

Origem em categorias/objetivos. Catálogo, busca se disponível no componente, prévia e escolha. Retornar ao editor sem fechar o formulário; não alterar dados antes do salvamento do pai. Fechar por botão/voltar respeita prioridade de seletor sobre descarte do formulário.

## TELA-024

### Calendário e seletor de ciclo — auxiliares

Calendário em datas de lançamento/objetivo/movimento; seletor de referência em Dashboard/Histórico/Relatórios/Orçamento e cópia. Exibir referência e datas reais; escolher outra referência mantém regra de corte. Foco/rolagem e limites 1900–2100 são verificados. Data desejada de objetivo não usa ciclo financeiro como vencimento automático.

## TELA-025

### Seletor de categoria — auxiliar

Opções do tipo selecionado com nome/ícone, seleção via componente do app; respeitar ativa/própria e exceção histórica. Carregamento, nenhuma opção e erro são diferentes. Fechar sem selecionar mantém o valor anterior, salvo troca de tipo que o tornou incompatível. Não usar select nativo inconsistente para substituir o componente aprovado.

## Checklist para gerar imagens futuras

Para cada TELA, informar estado, modo (novo/editar), tema, largura e exemplos coerentes de valores/datas. Mostrar todos os campos/ações descritos; não adicionar módulos financeiros ausentes. Para imagens da Dashboard/Orçamentos, manter donut pequeno e resultado/valores prioritários; para voz, não simular que a animação aleatória será a implementação. Aprovação visual não altera contratos nem status de funcionalidades propostas.
