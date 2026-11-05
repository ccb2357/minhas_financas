# ADR-007 — Interface financeira compacta e consistente

Data de registro retrospectivo: 05/11/2026.

## Estado

Aceita em sucessivas revisões; implementada nas entregas de UX.

## Contexto

Usuário simplificou cartões e formulários após revisão visual. Existem capturas e arquivos antigos com conteúdo revogado.

## Decisão

Dashboard: resultado e donut no azul, demais totais separados. Orçamento: valor utilizado de total, percentual só dentro do donut. Mesmos fundo, dimensão e fonte de donut. Relatórios: resultado após entradas/saídas; sem comparações, maior gasto ou categoria mais usada. Remover rótulo opcional e elementos de campo explicitamente rejeitados.

## Justificativa

Reduzir ruído visual e repetição conforme aprovação. Detalhes e estados em telas-ux.md, que é a definição principal de UX.

## Consequências

Preservar escolhas mesmo que payload antigo forneça campos extras. Igualdade visual dos donuts não unifica limiares. Foco por teclado exige validação e alternativa editorial conforme PEND-006.

## Rastreabilidade

RF-012/RF-015/RF-022/RF-023/RF-032; RN-008/RN-012/RN-032. Ver [matriz](../rastreabilidade.md), [regras](../regras-negocio.md), [arquitetura](../arquitetura.md), [contratos](../contratos-integracoes.md) e [pendências](../pendencias-riscos.md).

[Índice das decisões](README.md).
