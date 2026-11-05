# Requisitos funcionais

Estados e evidências: [fontes-e-status.md](fontes-e-status.md). Prioridades P0/P1/P2 organizam a manutenção e são propostas nesta SDD; novas funcionalidades exigem aprovação. Cada RF tem tarefa e cenário associados na [rastreabilidade](rastreabilidade.md).

## RF-001

**Acessar por e-mail e senha**

- Estado: **Implementado**. Evidência: C parcial/R; FON-03/FON-08.
- Prioridade: P0.
- Critérios de aceite:
  1. Credenciais válidas abrem a área autenticada; inválidas exibem erro sem revelar existência de conta.
  2. Carregamento bloqueia envios repetidos; login não depende de microfone ou OpenRouter.
  3. A sessão existente é verificada ao abrir o app; a opção Lembrar de mim não armazena senha legível no frontend.
- Regras: [RN-001](regras-negocio.md#rn-001)

## RF-002

**Encerrar e expirar sessão**

- Estado: **Implementado**. Evidência: C parcial/R; FON-03.
- Prioridade: P0.
- Critérios de aceite:
  1. Sair encerra a sessão e retorna ao acesso.
  2. HTTP 401 dos módulos financeiros aciona o fluxo de sessão expirada.
  3. Ao sair, formulários, referências ao usuário e gravação de voz são limpos; não exibir dados da conta anterior.
- Regras: [RN-001](regras-negocio.md#rn-001), [RN-031](regras-negocio.md#rn-031)

## RF-003

**Editar perfil e trocar senha**

- Estado: **Implementado**. Evidência: C parcial/R; FON-03.
- Prioridade: P1.
- Critérios de aceite:
  1. Editar nome/e-mail reflete o perfil após sucesso; alterar e-mail exige confirmação de senha atual na UI.
  2. Troca de senha solicita senha atual, nova e confirmação; a UI informa mínimo de 12 caracteres e exige novo acesso após sucesso.
  3. Falha mantém o formulário e indica campos; não registrar conteúdo das senhas. Validação backend integral depende de auditoria.
- Regras: [RN-001](regras-negocio.md#rn-001)

## RF-004

**Gerenciar categorias próprias**

- Estado: **Implementado**. Evidência: C parcial/R; FON-02/FON-03.
- Prioridade: P0.
- Critérios de aceite:
  1. Listar Todas/Receitas/Despesas e estado ativa/inativa; nome, tipo, cor e ícone são editáveis conforme regras existentes.
  2. Novos vínculos usam categoria ativa, do mesmo tipo e usuário.
  3. Inativar não apaga a identificação de lançamentos anteriores; restrições de exclusão/troca de tipo com vínculos devem ser verificadas no backend.
- Regras: [RN-001](regras-negocio.md#rn-001), [RN-009](regras-negocio.md#rn-009)

## RF-005

**Escolher ícones e datas com controles do app**

- Estado: **Implementado**. Evidência: C/R; FON-03.
- Prioridade: P1.
- Critérios de aceite:
  1. Seletor de ícones fornece escolhas do catálogo e prévia; não aceitar nome arbitrário no backend.
  2. Campos de datas e ciclos abrem os seletores do app e preservam o valor no formato do contrato.
  3. Fechar um seletor retorna ao formulário sem descartar alterações ou provocar salto de rolagem.
- Regras: [RN-003](regras-negocio.md#rn-003), [RN-032](regras-negocio.md#rn-032)

## RF-006

**Criar lançamento manual**

- Estado: **Implementado**. Evidência: C/R; FON-02/FON-03.
- Prioridade: P0.
- Critérios de aceite:
  1. Entrada/Saída, Valor, Descrição, Categoria, Data e Observação são registrados pelo mesmo formulário.
  2. Valor e R$ em negrito; prefixo R$ cinza é fixo e permanece com input vazio; seletor de tipo dentro do cartão branco acima do valor.
  3. Salvar exige valor positivo, categoria válida e campos obrigatórios; sucesso atualiza agregações e feedback.
- Regras: [RN-001](regras-negocio.md#rn-001), [RN-002](regras-negocio.md#rn-002), [RN-003](regras-negocio.md#rn-003), [RN-009](regras-negocio.md#rn-009), [RN-033](regras-negocio.md#rn-033), [RN-022](regras-negocio.md#rn-022)

## RF-007

**Editar lançamento existente**

- Estado: **Implementado**. Evidência: C/R; FON-02.
- Prioridade: P0.
- Critérios de aceite:
  1. Abrir preenche os dados atuais; preservar categoria inativa já vinculada quando compatível.
  2. Alterar data/valor/tipo/categoria recalcula origem e destino após salvar; data pertence ao ciclo pelo intervalo real.
  3. Edição não mostra botão de voz; falha não fecha nem substitui silenciosamente o formulário.
- Regras: [RN-004](regras-negocio.md#rn-004), [RN-009](regras-negocio.md#rn-009), [RN-023](regras-negocio.md#rn-023)

## RF-008

**Excluir lançamento com confirmação**

- Estado: **Implementado**. Evidência: C; FON-02.
- Prioridade: P0.
- Critérios de aceite:
  1. Excluir pede confirmação e somente afeta lançamento do próprio usuário.
  2. Exclusão lógica remove o lançamento das consultas ativas; repetir remoção já feita não recria nem duplica efeitos.
  3. Cancelar confirmação preserva dados; falha mantém acesso à edição.
- Regras: [RN-001](regras-negocio.md#rn-001), [RN-023](regras-negocio.md#rn-023)

## RF-009

**Consultar e filtrar histórico**

- Estado: **Implementado**. Evidência: C; FON-02/FON-03.
- Prioridade: P0.
- Critérios de aceite:
  1. Combinar ciclo/intervalo, tipo, categoria e busca de descrição; paginação mantém filtros.
  2. Busca trata % e _ como caracteres literais, sem ampliar resultados por curinga.
  3. Lista ordena por data decrescente e ID decrescente; filtros herdados da navegação persistem na URL.
- Regras: [RN-004](regras-negocio.md#rn-004), [RN-020](regras-negocio.md#rn-020)

## RF-010

**Configurar primeiro ciclo financeiro**

- Estado: **Implementado**. Evidência: C; FON-02.
- Prioridade: P0.
- Critérios de aceite:
  1. Sem corte definido, consultas financeiras exibem Definir ciclo e tratam HTTP 428.
  2. Selecionar dia de 1 a 31 cria configuração global e calendário correspondente.
  3. Não presumir dia 10 como padrão do backend; demonstração tem regra própria explícita.
- Regras: [RN-004](regras-negocio.md#rn-004), [RN-005](regras-negocio.md#rn-005), [RN-025](regras-negocio.md#rn-025)

## RF-011

**Agendar mudança de corte**

- Estado: **Implementado**. Evidência: C; FON-02.
- Prioridade: P0.
- Critérios de aceite:
  1. Mudança não recalcula ciclos iniciados; aplica-se aos futuros preservando identidade.
  2. Exibir corte atual, próximo ciclo e corte agendado; selecionar corte atual cancela/substitui agendamento quando aplicável.
  3. Versão desatualizada bloqueia sobrescrita; reabrir recarrega configuração.
- Regras: [RN-005](regras-negocio.md#rn-005), [RN-006](regras-negocio.md#rn-006)

## RF-012

**Exibir resumo do ciclo na Dashboard**

- Estado: **Implementado**. Evidência: C/R; FON-03.
- Prioridade: P0.
- Critérios de aceite:
  1. Cartão azul mostra resultado e donut; comparação anterior e totais internos foram removidos.
  2. Entradas/saídas ficam em cartões separados com contagem; resultado admite sinal negativo.
  3. Donut mostra percentual inteiro e limiares 60/85 com base exata; resultado segue padrão de espaçamento/negrito de Relatórios.
- Regras: [RN-007](regras-negocio.md#rn-007), [RN-008](regras-negocio.md#rn-008)

## RF-013

**Abrir histórico a partir de categorias**

- Estado: **Implementado**. Evidência: C/R; FON-02/FON-03.
- Prioridade: P1.
- Critérios de aceite:
  1. Categoria em Dashboard ou Relatórios abre Histórico com Saídas e categoria selecionadas.
  2. Preservar intervalo completo de um, três ou ano de ciclos, conforme origem.
  3. Demais categorias é resumo agregado e não um filtro de categoria inexistente.
- Regras: [RN-020](regras-negocio.md#rn-020), [RN-032](regras-negocio.md#rn-032)

## RF-014

**Criar e editar orçamento**

- Estado: **Implementado**. Evidência: C/R; FON-02/FON-03.
- Prioridade: P0.
- Critérios de aceite:
  1. Orçamento é de categoria de despesa e ciclo; limite positivo e Observação até 2000 caracteres.
  2. Observação aparece abaixo de Limite do ciclo em criação e edição, sem placeholder e sem legenda opcional.
  3. Edição altera limite/observação e não troca categoria/competência; impedir duplicação ativa da mesma combinação.
- Regras: [RN-010](regras-negocio.md#rn-010), [RN-033](regras-negocio.md#rn-033)

## RF-015

**Apurar utilização de orçamentos**

- Estado: **Implementado**. Evidência: C; FON-02/FON-03.
- Prioridade: P0.
- Critérios de aceite:
  1. Soma de despesas da categoria no ciclo alimenta gasto, saldo do limite e percentual, independentemente da paginação.
  2. Permitir exceder 100%; anel visual satura e o número não oculta excesso.
  3. Resumo azul mostra valor utilizado e total em negrito, percentual somente no donut; donut usa mesmas dimensões e fonte da Dashboard.
- Regras: [RN-011](regras-negocio.md#rn-011), [RN-012](regras-negocio.md#rn-012)

## RF-016

**Consultar despesas sem orçamento**

- Estado: **Implementado**. Evidência: C/R; FON-02/FON-03.
- Prioridade: P1.
- Critérios de aceite:
  1. Somar somente despesas de categorias sem orçamento ativo no ciclo.
  2. Abrir listagem/ranking pelo cartão e manter período; total não depende da página carregada.
  3. Tela abre no topo e retorna ao orçamento sem salto causado pelo foco.
- Regras: [RN-013](regras-negocio.md#rn-013), [RN-032](regras-negocio.md#rn-032)

## RF-017

**Copiar todos os orçamentos de um ciclo**

- Estado: **Implementado**. Evidência: C/R; FON-02.
- Prioridade: P1.
- Critérios de aceite:
  1. Selecionar destino diferente e exibir seu intervalo completo no campo.
  2. Copiar todas as páginas, categorias, limites e observações; não copiar lançamentos nem gastos.
  3. Qualquer conflito/categoria inativa bloqueia o lote inteiro; não há cópia parcial silenciosa.
- Regras: [RN-014](regras-negocio.md#rn-014)

## RF-018

**Cadastrar e editar objetivo**

- Estado: **Implementado**. Evidência: C; FON-04.
- Prioridade: P1.
- Critérios de aceite:
  1. Informar nome, ícone, meta positiva e prazo opcional por switch.
  2. Objetivo ativo aceita edição de metadados; não permite inserir saldo salvo diretamente.
  3. Arquivado deve ser reaberto para edição; nenhum objetivo cria despesa ou receita automaticamente.
- Regras: [RN-015](regras-negocio.md#rn-015), [RN-017](regras-negocio.md#rn-017), [RN-018](regras-negocio.md#rn-018)

## RF-019

**Guardar, retirar e corrigir movimentação**

- Estado: **Implementado**. Evidência: C; FON-04.
- Prioridade: P0.
- Critérios de aceite:
  1. Guardar/Retirar registra valor positivo, data e observação até 1000 caracteres.
  2. Editar/excluir recalcula saldo removendo o efeito anterior e aplicando o novo; impedir saldo negativo e excesso do limite monetário.
  3. Versionamento/idempotência impedem sobrescrita silenciosa e repetição de criação com o mesmo identificador.
- Regras: [RN-015](regras-negocio.md#rn-015), [RN-016](regras-negocio.md#rn-016), [RN-018](regras-negocio.md#rn-018)

## RF-020

**Arquivar, concluir e reabrir objetivo**

- Estado: **Implementado**. Evidência: C; FON-04.
- Prioridade: P1.
- Critérios de aceite:
  1. Arquivar preserva saldo e histórico; não expõe exclusão definitiva de objetivo.
  2. Concluir só quando saldo atinge meta; atingir meta não conclui sozinho.
  3. Reabrir devolve aos ativos e permite movimentar; abas Ativos/Arquivados usam seleção deslizante.
- Regras: [RN-017](regras-negocio.md#rn-017), [RN-018](regras-negocio.md#rn-018)

## RF-021

**Selecionar período dos relatórios**

- Estado: **Implementado**. Evidência: C; FON-02.
- Prioridade: P0.
- Critérios de aceite:
  1. Ciclo usa intervalo real; 3 ciclos inclui selecionado e dois anteriores.
  2. Ano de ciclos totaliza janeiro até o selecionado; gráfico anual apresenta os 12 ciclos.
  3. Mostrar datas e manter seletor deslizante; não misturar total de gráfico ampliado com total do período.
- Regras: [RN-019](regras-negocio.md#rn-019)

## RF-022

**Apresentar ranking e gráfico de relatórios**

- Estado: **Implementado**. Evidência: C/R; FON-03.
- Prioridade: P1.
- Critérios de aceite:
  1. Ranking lista despesas por categoria com valor/participação e acesso ao histórico.
  2. Gráfico Entradas × Despesas usa série própria do recorte.
  3. Não renderizar Maior gasto, Categoria mais usada ou comparações removidas, ainda que a API forneça esses dados.
- Regras: [RN-007](regras-negocio.md#rn-007), [RN-019](regras-negocio.md#rn-019), [RN-020](regras-negocio.md#rn-020)

## RF-023

**Mostrar resultado destacado nos relatórios**

- Estado: **Implementado**. Evidência: C/R; FON-03.
- Prioridade: P1.
- Critérios de aceite:
  1. Logo abaixo dos dois cartões de entradas/saídas, um cartão de largura total mostra entradas menos saídas.
  2. Resultado positivo/negativo/zero tem apresentação apropriada sem depender de período anterior.
  3. Cartões superiores mantêm valor e contagem, sem percentual/anterior/diferença.
- Regras: [RN-007](regras-negocio.md#rn-007)

## RF-024

**Alternar tema claro e escuro**

- Estado: **Implementado**. Evidência: C; FON-09.
- Prioridade: P1.
- Critérios de aceite:
  1. Aparência alterna claro/escuro e persiste preferência por dispositivo.
  2. Troca não altera dados financeiros ou registro de usuário.
  3. Fonte Nunito local é aplicada sem converter ícones em texto comum; sincronização entre abas respeita evento de storage.
- Regras: [RN-032](regras-negocio.md#rn-032)

## RF-025

**Instalar PWA**

- Estado: **Implementado**. Evidência: C parcial/R; FON-09.
- Prioridade: P1.
- Critérios de aceite:
  1. Mais oferece instalar quando cabível; instalado oculta a ação.
  2. Aplicação web funciona no navegador sem instalação e não exige APK.
  3. Manifest/ícones e HTTPS são validados no ambiente de destino; instrução iOS depende do suporte real do navegador.
- Regras: [RN-031](regras-negocio.md#rn-031)

## RF-026

**Versionar e atualizar recursos estáticos**

- Estado: **Implementado**. Evidência: C parcial/R; FON-09.
- Prioridade: P0.
- Critérios de aceite:
  1. Build identifica seus recursos por hash e versão consistente.
  2. Atualização não perde formulário pendente; interfaces antigas abertas devem ser tratadas sem reaparecer botão removido.
  3. Não colocar credenciais nem respostas financeiras no cache estático; conferir template de SW atual antes de alegar validação completa.
- Regras: [RN-031](regras-negocio.md#rn-031), [RN-032](regras-negocio.md#rn-032)

## RF-027

**Gravar uma movimentação por voz**

- Estado: **Implementado**. Evidência: C/R; FON-06.
- Prioridade: P1.
- Critérios de aceite:
  1. Disponível só em Novo lançamento; botão fixo de 48 px abre overlay branco translúcido.
  2. Botão central com microfone finaliza; X cancela; cronômetro é visível; não há Ouvindo você, Toque para finalizar ou Ver transcrição.
  3. Barras reagem ao mesmo áudio realmente gravado; cancelar/sair libera recursos; respeitar limite de 45 segundos no cliente.
- Regras: [RN-026](regras-negocio.md#rn-026), [RN-030](regras-negocio.md#rn-030), [RN-032](regras-negocio.md#rn-032)

## RF-028

**Transcrever e extrair com OpenRouter**

- Estado: **Implementado**. Evidência: C/R; FON-06.
- Prioridade: P0.
- Critérios de aceite:
  1. Backend autenticado valida upload e chama transcrição seguida de extração JSON, com chave somente no backend.
  2. Usar categorias ativas da conta; validar tipos, centavos, datas e observação antes de devolver rascunho.
  3. Erro não grava lançamento; limitar upload a 8 MiB, solicitações a 5/min e tratar timeout/JSON inválido.
- Regras: [RN-001](regras-negocio.md#rn-001), [RN-026](regras-negocio.md#rn-026), [RN-027](regras-negocio.md#rn-027), [RN-028](regras-negocio.md#rn-028)

## RF-029

**Aplicar rascunho ditado para conferência**

- Estado: **Implementado**. Evidência: C/R; FON-06.
- Prioridade: P0.
- Critérios de aceite:
  1. Preencher tipo, valor, descrição, categoria, data e observação explicitamente ditada.
  2. Sem observação ditada, preservar texto já escrito; sem dado claro, pedir conferência, sem inventar categoria.
  3. Salvar somente no comando do usuário; falhas e dados ausentes geram modal padrão; não aplicar resposta cancelada/tardia.
- Regras: [RN-028](regras-negocio.md#rn-028), [RN-029](regras-negocio.md#rn-029)

## RF-030

**Gerar demonstração de dois anos**

- Estado: **Implementado**. Evidência: C; FON-07.
- Prioridade: P1.
- Critérios de aceite:
  1. Execução explícita cria/usa conta demonstrativa com 24 ciclos, 432 orçamentos e 8 objetivos com histórico.
  2. Preservar outras contas e configuração real de corte; repetição com dados existentes não duplica.
  3. Não publicar credenciais em documentos nem executar seeder padrão inadvertidamente em produção.
- Regras: [RN-024](regras-negocio.md#rn-024)

## RF-031

**Gerar catálogo inicial de categorias**

- Estado: **Implementado**. Evidência: C; FON-07.
- Prioridade: P1.
- Critérios de aceite:
  1. Seed explícito preserva categorias existentes por tipo/nome.
  2. Modo isolado exige exatamente um usuário; o método por usuário atende DemoSeeder sem depender dessa restrição global.
  3. Erro não deixa categorias parcialmente vinculadas a outra conta.
- Regras: [RN-025](regras-negocio.md#rn-025), [RN-001](regras-negocio.md#rn-001)

## RF-032

**Navegar e proteger formulários pendentes**

- Estado: **Implementado**. Evidência: C/R; FON-03.
- Prioridade: P0.
- Critérios de aceite:
  1. Menu inferior corresponde apenas ao item da tela atual; Relatórios/Categorias não destacam Início/Mais indevidamente.
  2. Ao sair com alterações, pedir confirmação; não fechar silenciosamente durante gravação/mutação.
  3. Abertura no topo e retorno com preventScroll; seletores deslizam, ícones preservados e rótulos opcional removidos.
- Regras: [RN-032](regras-negocio.md#rn-032)

## RF-033

**Tratar indisponibilidade de conexão**

- Estado: **Implementado**. Evidência: C parcial/R; FON-09.
- Prioridade: P0.
- Critérios de aceite:
  1. Estado sem conexão orienta recuperar rede; operações financeiras não fingem sucesso.
  2. Não existe fila offline de gravação financeira aprovada; reenvio demanda conferência.
  3. PWA pode manter recursos estáticos/fonte, sem presumir acesso offline aos dados privados.
- Regras: [RN-031](regras-negocio.md#rn-031)

## RF-034

**Exportar dados pessoais em CSV**

- Estado: **Aprovado para implementação**. Evidência: R/H; FON-01.
- Prioridade: P2.
- Critérios de aceite:
  1. Antes de implementar, aprovar colunas, escopo por usuário/período e proteção contra fórmulas em planilhas.
  2. Definir codificação, formato monetário, datas e tratamento de observações.
  3. Não ativar item de menu sem funcionalidade e contrato concluídos.
- Regras: [RN-001](regras-negocio.md#rn-001)

## RF-035

**Recorrência e compromissos previstos**

- Estado: **Proposto**. Evidência: R; sugestão não autorizada.
- Prioridade: P2.
- Critérios de aceite:
  1. Decidir se recorrência, parcelas e previsto/pago entrarão no produto.
  2. Especificar competência, idempotência, edição/exclusão de série e impacto em orçamento antes de escrever dados.
  3. Não criar tabelas ou telas antecipadamente.
- Regras: Definir somente após autorização de escopo.

## RF-036

**Análise e simulação por IA**

- Estado: **Proposto**. Evidência: R; discussão suspensa.
- Prioridade: P2.
- Critérios de aceite:
  1. Definir benefício concreto e entradas suficientes antes de retomar a antiga proposta de análise/simulação.
  2. Não usar saldo do ciclo como prova de dinheiro disponível em conta.
  3. Não confundir esta proposta com o preenchimento por voz já implementado.
- Regras: [RN-021](regras-negocio.md#rn-021)
