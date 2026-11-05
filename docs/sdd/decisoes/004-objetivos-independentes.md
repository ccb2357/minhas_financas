# ADR-004 — Objetivos com livro de movimentações independente

Data de registro retrospectivo: 05/11/2026.

## Estado

Implementada no código recuperado.

## Contexto

Guardar/retirar e corrigir um objetivo exige histórico consistente sem duplicar receitas/despesas.

## Decisão

Separar goals e goal_movements de transactions; saldo deriva das contribuições/retiradas. Usar transações de banco, locks, versão e chaves de idempotência nos fluxos definidos. Conclusão é explícita; objetivo atingido não se arquiva sozinho.

## Justificativa

Permitir correção e repetição segura sem inventar transferência bancária ou contabilidade dupla.

## Consequências

Totais de lançamentos não incluem movimentos de objetivos. Arquivar preserva histórico; reabrir habilita movimento. Não há exclusão definitiva de objetivo na API documentada.

## Rastreabilidade

RF-018/RF-019/RF-020; RN-015/RN-016/RN-017/RN-018. Ver [matriz](../rastreabilidade.md), [regras](../regras-negocio.md), [arquitetura](../arquitetura.md), [contratos](../contratos-integracoes.md) e [pendências](../pendencias-riscos.md).

[Índice das decisões](README.md).
