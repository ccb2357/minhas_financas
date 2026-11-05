# ADR-003 — Centavos, resultado e ausência de saldo bancário

Data de registro retrospectivo: 05/11/2026.

## Estado

Aceita no produto; implementada.

## Contexto

O sistema organiza movimentações por ciclo, inclusive planejamento manual. Saldo bancário, fatura de cartão e resultado do recorte são conceitos diferentes.

## Decisão

Persistir dinheiro como centavos inteiros; resultado do ciclo é entradas menos saídas e pode ser negativo. Não carregar resultado automaticamente para o próximo ciclo. Não gerar fatura pelo meio de pagamento.

## Justificativa

Evitar erro monetário e interpretações de caixa que o modelo de dados não sustenta.

## Consequências

Usuário decide data financeira ao registrar salário esperado; isso não cria estado previsto/pago. Nunca usar resultado como prova de valor disponível em conta ou de retorno de investimento.

## Rastreabilidade

RF-006/RF-012/RF-023; RN-002/RN-007/RN-021/RN-022. Ver [matriz](../rastreabilidade.md), [regras](../regras-negocio.md), [arquitetura](../arquitetura.md), [contratos](../contratos-integracoes.md) e [pendências](../pendencias-riscos.md).

[Índice das decisões](README.md).
