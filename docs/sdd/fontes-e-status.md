# Fontes, estados e limites da documentação

Data da linha de base: **05/11/2026**, fuso `America/Sao_Paulo`. Projeto: **Minhas Finanças**. Esta documentação consolida o produto existente; não inicia uma reescrita nem autoriza funcionalidades novas.

## Como interpretar os estados

| Estado | Significado |
|---|---|
| Implementado | Encontrado em código de entrega recuperado e/ou confirmado como funcionando pelo usuário. Não equivale a auditoria da VPS atual. |
| Aprovado para implementação | Decisão aceita na conversa ou escopo aprovado, mas sem código suficiente para afirmar implementação. |
| Proposto | Sugestão de evolução sem autorização de execução. |
| Pendente de definição | Falta uma decisão de produto ou informação operacional/técnica. |

A evidência complementa o estado: **C** = código lido; **R** = relato/decisão registrada na conversa; **H** = documento histórico de fundação. Prioridades e sequência das tarefas desta SDD são uma organização proposta para continuidade; não representam autorização para novos desenvolvimentos. Critérios descrevem o resultado esperado, não um relatório de testes recém-executados.

## FON-01

**Fundação histórica:** `FUNDACAO_MINHAS_FINANCAS_FINAL.md`, 25.544 bytes, recuperado dos documentos disponíveis. Define propósito pessoal, PWA, Framework7 Core, ECharts e isolamento por usuário. Contém versões, navegação e cálculo por mês-calendário anteriores às evoluções. Não deve ser tratado como retrato atual em pontos substituídos.

## FON-02

**Núcleo financeiro e ciclos:** pacote `Minhas_Financas_Sprint6_Ciclos.zip`, `FinancialCycles`, `FinancialSummary`, `TransactionWriter`, controllers e resources; refinamentos `Categorias_Acesso_Historico`, cópia de orçamento por ciclo e observação. Fontes em `backend/app/Services/`, `backend/app/Http/` e migrations recuperadas. A data financeira é um `DATE`; agregações são do usuário e do intervalo do ciclo.

## FON-03

**UX financeira atual:** entregas de Dashboard/donuts, simplificação dos Relatórios, menu ativo, foco/rolagem, formulários, fonte Nunito, seletores deslizantes e remoção de rótulos “opcional”. Fontes em `frontend/src/js/` e `frontend/src/css/`. Decisões e sequência da conversa prevalecem sobre uma cópia antiga de um arquivo de entrega.

## FON-04

**Objetivos:** `Minhas_Financas_Objetivos.zip`, `Objetivos_Somente_Arquivar`, refinamentos de movimentações e botões; `Goals`, `GoalController`, migration `2026_10_26_000006_create_goals.php` e módulo `frontend/src/js/goals/`. Não foi encontrada integração financeira automática entre objetivos e `transactions`.

## FON-05

**Remoção bancária:** `Minhas_Financas_Remover_Integracao_Bancaria.zip`, código de limpeza, rotas atualizadas e confirmação do usuário. Pluggy e conciliação foram removidas. Arquivos antigos de integração podem existir como material histórico e não compõem o estado-alvo do sistema.

## FON-06

**Lançamento por voz:** código atual `TransactionVoice`, controller, configuração `transaction_voice.php`, `transactions/form.js`, `voice.js` e `voice-visualizer.js`. Inclui observação ditada, overlay branco, captura real de amplitude/frequência, maior sensibilidade e remoção de “Ver transcrição”. O usuário confirmou o fluxo real com OpenRouter e a correção de observação; os últimos ajustes visuais têm evidência de código/entrega, sem nova inspeção do celular/VPS.

## FON-07

**Demonstração:** `DemoSeeder`, `CategoriesSeeder`, `DatabaseSeeder` e testes recuperados. Dados de 24 ciclos, 432 orçamentos e 8 objetivos com movimentações. Não reproduzir credenciais de demonstração em documentos. Ver risco de exposição em [segurança](seguranca-privacidade.md).

## FON-08

**Ambiente informado na conversa:** Windows, Docker/Nginx, frontend Vite, PHP-FPM, MySQL 8.0, domínio e caminhos descritos em [operação](operacao-deploy.md). Não houve acesso SSH, leitura da configuração efetiva da VPS, inspeção do banco real nem leitura dos manifests completos de dependências nesta etapa.

## FON-09

**PWA e preferências:** `frontend/build/pwa-plugin.js`, `index.html`, tema e fontes. O plugin usa hash dos bytes finais, metadado `mf-build`, `sw.js` e recursos públicos. O template completo do service worker, módulo atual de atualização e configuração HTTP efetiva não estavam integralmente disponíveis. A atualização automática foi entregue anteriormente e relatada na conversa; seus detalhes de cache precisam de reconciliação técnica.

## Método de análise e precedência

1. Decisão explícita posterior do usuário para o mesmo assunto.
2. Código recuperado da entrega posterior correspondente, sem assumir que um ZIP posterior contém todos os arquivos do aplicativo.
3. Comportamento confirmado pelo usuário.
4. Fundação histórica, somente nos pontos não substituídos.
5. Hipóteses identificadas como propostas ou pendências; nunca convertidas silenciosamente em implementação.

Uma cópia de análise combinou pacotes recuperados em ordem de evolução e preservou a aplicação de trabalho. Os arquivos originais da aplicação não foram alterados nesta etapa. Não foi localizado um conjunto SDD anterior nos arquivos analisados; documentos de sprint e fundação foram preservados como fontes, não substituídos.

## Limites de completude

- Não foi obtido um checkout integral com commit verificável. Alguns arquivos importados e migrations iniciais não estão na amostra. O inventário lógico e os contratos presentes foram especificados; detalhes físicos ausentes estão marcados no [modelo de dados](modelo-dados.md).
- `AuthController`, `ProfileController`, regras completas de categorias, `IntegerCents` e configuração efetiva de sessão/CORS não foram integralmente recuperados. Não afirmar algoritmos, TTL, índices ou restrições exatos sem verificá-los.
- Totais de testes citados nas entregas anteriores não foram reexecutados integralmente para esta documentação. Nesta etapa a validação é documental: links, IDs, cobertura, dependências e integridade dos arquivos de código.
- “Implementado” não significa deploy confirmado em 05/11/2026. A reconciliação com o repositório e a instalação é a primeira tarefa de continuidade.

## Divergências e resolução

| Tema | Histórico/artefato anterior | Estado esperado atual | Adequação |
|---|---|---|---|
| PHP/MySQL | Fundação cita PHP 8.4 e MySQL 8.4 | Ambiente aprovado/informado usa PHP 8.2 e MySQL 8.0; Laravel 12.70.0 | Manter ambiente, verificar manifests e runtime; não atualizar por causa do documento antigo. |
| Períodos | Mês-calendário | Ciclos com corte configurável | Especificações usam ciclos; não reintroduzir `MONTH(date)` como critério financeiro. |
| Menu inferior | Histórico/Relatórios no menu antigo | Início, Orçamento, Lançar, Objetivos, Mais | Telas sem item próprio não deixam Início/Mais destacados. |
| Gráficos | Pizza/rosca por categoria no plano inicial | Ranking de despesas por categoria e barras; donut nos resumos azuis | Não recriar os gráficos removidos por mera aderência à fundação. |
| Bancos | Integração Pluggy em sprints intermediárias | Integração removida | Confirmar limpeza em cada instalação; não restaurar migration/rotas antigas. |
| IA | Sugestões de análise/simulação | Captura → transcrição → extração → conferência | Análise e simulação permanecem propostas, sem implementação autorizada. |
| Relatórios | Comparações, maior gasto e categoria frequente visíveis | Totais, resultado, ranking e barras | API ainda pode retornar campos antigos; a UI não deve renderizá-los. |
| Ciclos | Preferência poderia ser entendida como individual | Configuração global no código | Documentar explicitamente; per-user exige nova decisão/migração. |
| Donuts | Expectativa de uma regra única de cor | Dashboard 60/85; Orçamentos 75/90 no helper recuperado | Preservar os dois limiares; discutir uniformização somente se desejada. |
| Acessibilidade | Contorno azul removido por solicitação | Sem restaurar esse visual por conta própria | Definir alternativa de foco perceptível antes de alegar conformidade completa. |

As pendências e seus responsáveis estão em [pendencias-riscos.md](pendencias-riscos.md).
