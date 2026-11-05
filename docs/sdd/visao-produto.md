# Visão do produto

## Produto e problema

**Minhas Finanças** é uma PWA pessoal para registrar entradas e despesas e acompanhar a margem restante de um ciclo financeiro. O usuário recebe em uma data de corte, faz gastos ao longo do período e precisa enxergar quanto já comprometeu, sem depender de atraso de integração bancária.

O produto registra os gastos individualmente, qualquer que seja o meio de pagamento. Não representa o saldo de uma conta bancária nem gerencia faturas. O usuário pode usar a entrada registrada no ciclo como referência do recebimento que financiará aqueles gastos; isso é uma convenção manual de planejamento, sem estado automático “previsto/recebido”. Ver [RN-021](regras-negocio.md#rn-021).

## Público e proposta de valor

Público atual: Christopher e usuários pessoais provisionados no aplicativo; dados de contas distintas são isolados. Não há definição de SaaS público, assinatura, equipe financeira, papel de gestor ou administração comercial.

Proposta de valor: registrar rapidamente pelo celular, acompanhar limites por categoria e objetivos de reserva, analisar ciclos e reduzir digitação pelo preenchimento por voz. A experiência foi aprovada como aplicação web instalável com visual mobile, tema claro/escuro e fonte própria.

## Objetivos

| ID | Objetivo | Resultado verificável |
|---|---|---|
| OBJ-01 | Controle consistente | Mesmo conjunto de lançamentos e mesmo período produzem totais coerentes em Histórico, Dashboard, Orçamentos e Relatórios. |
| OBJ-02 | Clareza para decidir gastos | Resultado do ciclo pode ser negativo; donut informa a parcela das entradas consumida sem fingir saldo bancário. |
| OBJ-03 | Menos trabalho manual | Uma gravação preenche os campos sem obrigar ditar categoria; usuário confere e salva. |
| OBJ-04 | Histórico confiável | Editar/excluir altera agregações; categorias inativas preservam identidade histórica; mudanças de corte não reescrevem ciclos iniciados. |
| OBJ-05 | Continuidade técnica | Outra pessoa ou IA encontra regras, contratos, estado e pendências nesta SDD e verifica o código antes de evoluir. |

## Critérios de sucesso

- Todos os requisitos implementados passam nos cenários financeiros e de isolamento do [plano de validação](plano-validacao.md).
- O cadastro manual permanece utilizável se microfone ou OpenRouter falharem.
- Não há duplicação automática de despesas por objetivos, fatura ou voz.
- A UI respeita as alterações editoriais aprovadas e mantém leitura de valores positivos, negativos e extensos.
- Usuário valida as entregas antes de avançar para nova sprint ou ampliar o escopo.

Não há metas aprovadas de quantidade de usuários, receita, SLA, latência, precisão da IA, taxa de conversão ou crescimento. Não criar métricas numéricas sem medição/decisão: [PEND-007](pendencias-riscos.md#pend-007).

## Referências

Escopo: [escopo.md](escopo.md). Estados/evidência: [fontes-e-status.md](fontes-e-status.md). Requisitos: [requisitos-funcionais.md](requisitos-funcionais.md).
