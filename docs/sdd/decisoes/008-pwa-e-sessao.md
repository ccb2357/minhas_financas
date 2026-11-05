# ADR-008 — PWA estática com sessão e sem escrita financeira offline

Data de registro retrospectivo: 05/11/2026.

## Estado

Aceita no escopo; implementação parcial auditada.

## Contexto

Aplicação pode ser instalada e atualizada, mas depende de API autenticada para dados financeiros. Não há fila offline de mutação aprovada.

## Decisão

Manter manifest/SW/versionamento de build para recursos do app e sessão Sanctum/CSRF para API. Não persistir respostas financeiras no cache estático nem anunciar sucesso sem servidor.

## Justificativa

Distinguir instalação de disponibilidade offline de dados privados e evitar duplicação de lançamentos.

## Consequências

Auditar template completo do SW e preservação de formulário antes de alegar conformidade. Não substituir autenticação por token local nem criar sincronização offline nesta fase.

## Rastreabilidade

RF-001/RF-025/RF-026/RF-033; RN-031; PEND-011. Ver [matriz](../rastreabilidade.md), [regras](../regras-negocio.md), [arquitetura](../arquitetura.md), [contratos](../contratos-integracoes.md) e [pendências](../pendencias-riscos.md).

[Índice das decisões](README.md).
