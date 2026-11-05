# ADR-002 — Calendário financeiro global e transição de corte

Data de registro retrospectivo: 05/11/2026.

## Estado

Decisão reconstruída do código existente; implementada, sem nova aprovação de modelo por usuário.

## Contexto

Totais e orçamentos deixaram o mês-calendário fixo. É preciso alterar corte sem reescrever períodos já iniciados.

## Decisão

Usar singleton global de corte e ciclos persistidos. Ajustar dia ao fim do mês quando necessário. Preservar atual/passado e identidade dos futuros ao reagendar. Sem configuração inicial, exigir definição com HTTP 428.

## Justificativa

Permitir períodos reais e transição coerente sem deslocar silenciosamente histórico. Identidade de ciclo liga orçamento e calendário.

## Consequências

Valores são por usuário, calendário não. API de alteração não tem administrador identificado: uso compartilhado exige avaliar PEND-009. Não criar corte individual nem cron presumido. Conflito de versão desta API é 422, distinto dos objetivos.

## Rastreabilidade

RF-010/RF-011; RN-004/RN-005/RN-006. Ver [matriz](../rastreabilidade.md), [regras](../regras-negocio.md), [arquitetura](../arquitetura.md), [contratos](../contratos-integracoes.md) e [pendências](../pendencias-riscos.md).

[Índice das decisões](README.md).
