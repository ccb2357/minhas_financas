# Regras de negócio

Documento principal das regras. Requisitos e contratos referenciam estas definições. Estados/evidência em [fontes-e-status.md](fontes-e-status.md).

## RN-001

**Propriedade e autorização — Implementado.** Toda leitura/escrita de dado pessoal parte do usuário autenticado. IDs alheios não permitem consulta nem vínculo. `user_id` é proibido nos payloads de lançamento e objetivo e não deve ser confiado ao cliente. Ciclos/configuração são globais, mas dados financeiros e objetivos não são compartilhados. Recursos inexistentes ou de outra conta são tratados por consulta restrita/404, conforme controller.

Evidência: FON-02/FON-04/FON-06.

## RN-002

**Valores monetários — Implementado.** Entrada/saída, limite e movimentação usam valores positivos em centavos inteiros; sinal vem do tipo. Faixa documentada do formulário/voz: 1 a 99.999.999.999 centavos (R$ 0,01 a R$ 999.999.999,99). A regra IntegerCents completa precisa ser reconciliada no checkout, sem mudar o limite por suposição. Somas não usam FLOAT monetário no banco.

Evidência: FON-02/FON-03/FON-06.

## RN-003

**Datas — Implementado.** API usa YYYY-MM-DD; UI usa formato brasileiro. Validações recuperadas aceitam 1900-01-01 a 2100-12-31. Datas financeiras são DATE e não devem mudar de dia por conversão UTC. Referência de hoje e ciclo atual usa America/Sao_Paulo.

Evidência: FON-02/FON-04/FON-06.

## RN-004

**Pertencimento ao ciclo — Implementado.** Um lançamento pertence ao ciclo cujo start_date ≤ transaction_date ≤ end_date. Queries usam início inclusivo e próximo início exclusivo. Referência year/month identifica o mês nominal de início, não um filtro MONTH(date). No corte 10, Outubro/2026 abrange 10/10 a 09/11. Não há transporte automático de saldo.

Evidência: FON-02.

## RN-005

**Corte global e calendário — Implementado.** financial_cycle_settings é singleton id=1. Corte 1–31, ajustado ao último dia quando o mês não contém o dia escolhido. Sem configuração, consultas financeiras dependentes retornam 428/CYCLE_SETUP_REQUIRED. GET de configuração retorna configured=false. Usuários autenticados podem acessar a configuração: não existe papel administrativo comprovado que restrinja a mudança global.

Evidência: FON-02.

## RN-006

**Transição de corte — Implementado.** Ciclos já iniciados ficam preservados. Mudança recalcula projeções futuras mantendo seus IDs e orçamentos associados. Corte 10 atual 10/10–09/11, novo 15: próximo 10/11–14/12, seguinte 15/12–14/01. Novo 5: próximo 10/11–04/12. Versão esperada desatualizada produz erro de validação 422 em cut_day, não 409 no código recuperado.

Evidência: FON-02.

## RN-007

**Totais e resultado — Implementado.** Entradas I=sum(income); saídas E=sum(expense); resultado R=I−E, com sinal negativo permitido. Excluir logicamente retira dos totais. Limites de orçamento, movimentações de objetivos e pagamento de fatura não geram I/E. Períodos vazios produzem totais zero.

Evidência: FON-02/FON-04.

## RN-008

**Donut de consumo na Dashboard — Implementado.** Se I>0: percentual P=100×E/I. Se I=0 e E=0: 0%; se I=0 e E>0: percentual não aplicável (—), anel cheio vermelho e texto acessível esclarecendo ausência de entradas. Verde P≤60, laranja 60<P≤85, vermelho P>85. Arco limitado a 0–100; número pode exceder 100. Texto é arredondado ao inteiro mais próximo, mas cor e cálculo usam P exato. Percentuais extremos podem usar abreviação compacta.

Evidência: FON-03.

## RN-009

**Categoria ativa e compatível — Implementado.** Novos lançamentos usam categoria ativa do usuário e do mesmo tipo. Na edição, categoria inativa previamente vinculada pode permanecer se o tipo for compatível; não pode ser escolhida para novo vínculo. A categoria histórica continua identificada nos rankings/listas. Revalidar sob lock evita vínculo criado durante inativação concorrente.

Evidência: FON-02.

## RN-010

**Identidade do orçamento — Implementado.** Orçamento ativo é único por usuário/categoria/referência anual-mensal, ligado ao financial_cycle_id. Somente categoria de despesa. Atualização muda limite e observação, mantendo categoria e referência. Na recriação de registro removido logicamente, restaurar limite/dados sem criar duplicata. Conferir a restrição física na migration inicial ainda ausente.

Evidência: FON-02.

## RN-011

**Utilização do orçamento — Implementado.** Para categoria com orçamento: G=soma de saídas ativas da categoria nas datas do ciclo; saldo=L−G; P=100×G/L quando L>0. Excesso não é bloqueio de lançamento. Resumo agrega todos os orçamentos do ciclo, não só uma página. G do resumo inclui somente categorias orçadas; total_expense_cents inclui todas as despesas.

Evidência: FON-02.

## RN-012

**Donut de Orçamentos — Implementado.** Helper recuperado: verde P≤75, laranja 75<P≤90, vermelho P>90; valor indefinido é neutro. Arco limitado a 100%, texto inteiro sem repetir percentual fora do anel. Os limiares diferem da Dashboard e não devem ser alterados sem decisão. Dimensão comum atual: 84 px normal, 72 px abaixo de 360 px, 112 px a partir de 760 px; texto interno normal 15 px, pequeno 12 px e grande 21 px, com compactação quando aplicável.

Evidência: FON-03.

## RN-013

**Sem orçamento — Implementado.** Uma despesa é sem orçamento quando sua categoria não possui orçamento ativo para o ciclo selecionado. Total sem orçamento = total das saídas do ciclo − gastos das categorias orçadas, sem duplicar categorias. O filtro unbudgeted força saídas e restringe range a month. Agregados são independentes da paginação da lista.

Evidência: FON-02.

## RN-014

**Cópia atômica entre ciclos — Implementado.** Origem e destino diferentes; copiar todos os orçamentos ativos da origem, limite e observação. Rejeitar origem vazia, categoria inativa/incompatível, conflito de orçamento no destino ou alteração concorrente da origem. Validar o conjunto e executar em transação: falha não deixa parte copiada. Gastos são recalculados no destino e não copiados.

Evidência: FON-02.

## RN-015

**Objetivos não movimentam o financeiro — Implementado.** Goal representa uma declaração de reserva. Guardar contribui positivamente e retirar negativamente para saved_cents. Não cria transactions, budgets ou ciclos. Retirar de objetivo não é receita do ciclo e concluir não gera despesa.

Evidência: FON-04.

## RN-016

**Correção de saldo de objetivo — Implementado.** Novo saldo = saldo anterior − efeito da movimentação antiga + efeito da nova; exclusão usa efeito novo zero. Valor de cada movimento é positivo; sinal vem de contribution/withdrawal. Rejeitar saldo <0 ou >IntegerCents::MAX. Bloquear também exclusão de contribuição que tornaria o saldo negativo após retiradas posteriores. Ordem histórica não implica recálculo de saldo diário, pois a regra implementada valida saldo agregado.

Evidência: FON-04.

## RN-017

**Estados do objetivo — Implementado.** Status armazenado é active ou archived. Conclusão é archived com completed_at; arquivamento simples usa completed_at nulo. Concluir exige saved≥target e é explícito. Reabrir limpa timestamps de arquivamento/conclusão. Arquivado preserva histórico e bloqueia edição/movimentação. Progresso visual limita a 100 e remaining=max(0,target−saved); pode guardar acima da meta dentro do limite monetário.

Evidência: FON-04.

## RN-018

**Concorrência e idempotência em objetivos — Implementado.** Versão inteira começa em 1 e aumenta a cada atualização do objetivo/movimento/estado. Versão antiga gera 409. Criação usa request_key UUID e request_hash: mesma chave e mesmo conteúdo reutiliza resultado; mesma chave com conteúdo diferente gera 409. Locks no pai serializam alterações; transação faz até três tentativas no serviço. Não generalizar essa garantia para lançamentos comuns.

Evidência: FON-04.

## RN-019

**Recortes de Relatórios — Implementado.** month: ciclo selecionado; three_months: selecionado e dois anteriores; year: de janeiro ao ciclo selecionado. Em year, gráfico de barras usa doze ciclos do ano, inclusive futuros; totais/ranking mantêm janeiro–selecionado. period_status informa calendário, sem cortar lançamentos futuros já cadastrados dentro do recorte. API pode fornecer comparação anterior/insights que a UI decidiu ocultar.

Evidência: FON-02.

## RN-020

**Navegação a partir de ranking — Implementado.** URL de Histórico usa month e tipo=expense, category_id e, quando vindo de Relatórios, range. A API usa year/month/type/category_id/range. O frontend converte nomes de URL para contrato. Valores do histórico filtrado devem somar o valor de origem. Demais categorias não representa categoria única clicável.

Evidência: FON-02/FON-03.

## RN-021

**Convenção de planejamento de salário — Implementado.** Decisão de uso: o usuário pode registrar no ciclo atual uma receita que associa ao próximo salário e abater gastos desse ciclo. O app não diferencia previsto de recebido e não verifica a chegada desse dinheiro. Resultado indica margem planejada nesse uso, não saldo real. Essa convenção não cria cálculo de fatura, juros, fluxo de caixa ou recomendação financeira.

Evidência: R; conversa.

## RN-022

**Meios de pagamento fora do domínio — Implementado.** O lançamento representa gasto/receita independentemente de cartão, Pix ou outro meio. Não existe lançamento especial de pagamento de fatura neste produto. Não introduzir um segundo gasto automático para quitar a compra e não inventar colunas de cartão/conta na documentação.

Evidência: R; conversa/FON-05.

## RN-023

**Exclusão e integridade — Implementado.** Lançamentos e orçamentos usam exclusão lógica nas consultas/controller recuperados; registros removidos não entram nas agregações. Movimentações de objetivo usam exclusão física com recálculo; objetivos são arquivados. Não tratar soft delete/timestamps como trilha de auditoria completa. TRUNCATE transactions é operação administrativa destrutiva de todas as contas, não ação do app.

Evidência: FON-02/FON-04.

## RN-024

**Demonstração repetível — Implementado.** DemoSeeder considera os dados existentes antes de gerar 24 ciclos. Preserva outras contas, categorias já existentes e corte configurado. Define corte 10 somente se ambiente de demonstração ainda não tiver configuração válida. Repetição com dados demo existentes não repovoa parcialmente nem duplica. DatabaseSeeder chama DemoSeeder: execução padrão merece cautela operacional.

Evidência: FON-07.

## RN-025

**Catálogo inicial por usuário — Implementado.** CategoriesSeeder::run exige exatamente um usuário existente. seedFor(user) serve para criar catálogo de uma conta específica sem essa ambiguidade. Usa firstOrCreate por type/name, preservando cores/ícones de categorias existentes. Transação evita vincular catálogo à conta errada em execução inválida.

Evidência: FON-07.

## RN-026

**Captura e limites da voz — Implementado.** Somente criação. Cliente interrompe em 45 s ou ao atingir cerca de 8 MiB nos chunks; servidor impõe tamanho máximo de arquivo 8192 KiB e throttle 5/min. Limite de duração é do cliente, não há validação de duração por decodificação no backend. HTTPS/localhost, MediaRecorder e AudioContext são necessários ao fluxo visual.

Evidência: FON-06.

## RN-027

**Extração restrita e validada — Implementado.** Backend envia só catálogo ativo próprio, data de referência, transcrição e instruções. Valores em centavos, datas válidas e categoria pertencente ao catálogo são revalidados após JSON. Categoria incompatível com tipo vira null. JSON inválido, montante fora da faixa ou categoria alheia são recusados. Texto de áudio/categoria é dado, nunca autorização para mudar as regras ou executar ações.

Evidência: FON-06.

## RN-028

**Ambiguidade e revisão da voz — Implementado.** Uma movimentação por áudio; múltiplas ou não financeiras geram erro de validação. Ausências recebem null. Aplicação limpa campos incompletos de valor/descrição/data/categoria para conferência; tipo não identificado preserva seleção atual, mas modal solicita conferir tipo. Data omitida é orientada como hoje no prompt; backend valida formato/faixa, não garante a interpretação semântica da fala. Nada é salvo até confirmação.

Evidência: FON-06.

## RN-029

**Observação ditada — Implementado.** Pedidos como “na observação coloque …” extraem apenas a frase desejada para notes, sem o comando introdutório e sem misturar à descrição. Até 2000 caracteres. Se notes vier null, preservar observação já digitada; se string, substituir por ela. A interpretação é probabilística e a conferência final é obrigatória.

Evidência: FON-06.

## RN-030

**Visualização fiel ao áudio — Implementado.** Canvas usa 56 barras de energia entre 80–6000 Hz em escala logarítmica, moduladas por RMS do mesmo MediaStream gravado. Configuração entregue: FFT 1024, suavização 0,5, ganho visual (rms−0,0015)/0,025 limitado a 0–1; barras têm marcação mínima no silêncio, não movimento aleatório. Ruído do ambiente também pode mover as barras. Não conectar analisador ao alto-falante. Liberar tracks, AudioContext e requestAnimationFrame ao terminar/cancelar.

Evidência: FON-06.

## RN-031

**Offline e atualização não são sincronização financeira — Implementado.** Recursos públicos podem ser cacheados para a PWA; usuário não recebeu promessa de gravar dados privados offline. Requests financeiros usam rede e devem falhar de forma explícita. Fonte local no cache não significa dados financeiros disponíveis offline. Template SW e comportamento de atualização efetivos exigem conferência antes de declaração integral de conformidade.

Evidência: FON-09.

## RN-032

**Interação, foco e apresentação — Implementado.** Seleção deslizante em Entrada/Saída, Objetivos, Relatórios e Categorias. Menu destaca somente a tela correspondente. Formulários abrem no cabeçalho sem rolar ao botão final; restauração de foco usa preventScroll. Não exibir rótulo opcional ao lado do campo. Inputs limpos aprovados não reintroduzem ícones/placeholders removidos. Foco visível alternativo para teclado é pendência de acessibilidade, não autorização para voltar ao azul removido.

Evidência: FON-03/FON-06.

## RN-033

**Observações e limites de texto — Implementado.** Lançamento: descrição obrigatória até 255 e observação até 2000; orçamento: observação nullable até 2000; movimento de objetivo: observação até 1000. Trim é aplicado nas rotas/serviços recuperados; vazio pode se tornar null. Não reutilizar o limite de um módulo em outro. Backend, não apenas maxlength, deve validar.

Evidência: FON-02/FON-04/FON-06.
