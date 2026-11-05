# ADR-001 — Stack e separação técnica

Data de registro retrospectivo: 05/11/2026.

## Estado

Decisão aceita; implementada em entregas e ambiente informado.

## Contexto

O projeto é uma aplicação pessoal mobile com API própria. A fundação aprovou Framework7 Core, sem framework reativo adicional.

## Decisão

Manter Framework7 Core em JavaScript, Vite, ECharts e fonte Nunito no frontend; Laravel/PHP e MySQL no backend. Frontend e backend têm dependências/configurações próprias. Node 22 é usado no comando de build conhecido.

## Justificativa

Preservar o produto e o investimento existente; duas configurações Vite têm responsabilidades distintas. Versões precisas e evidência em arquitetura.md, sem promover versões antigas do documento histórico a obrigação de upgrade.

## Consequências

Não introduzir React, Vue, TypeScript, PostgreSQL, Redis ou nova biblioteca de áudio como requisito sem decisão específica. Auditar lockfiles e serviços completos antes de manutenção de infraestrutura.

## Rastreabilidade

RF-025; RNF-012; PEND-001. Ver [matriz](../rastreabilidade.md), [regras](../regras-negocio.md), [arquitetura](../arquitetura.md), [contratos](../contratos-integracoes.md) e [pendências](../pendencias-riscos.md).

[Índice das decisões](README.md).
