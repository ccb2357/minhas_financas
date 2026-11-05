# ADR-006 — Voz em duas etapas pelo OpenRouter e revisão manual

Data de registro retrospectivo: 05/11/2026.

## Estado

Aceita; implementada e funcional segundo relato do usuário.

## Contexto

Usuário quer ditar lançamento com tipo, descrição, categoria, valor e observação. Comparou processamento único e transcrição seguida de interpretação e escolheu duas etapas, centralizadas no OpenRouter.

## Decisão

Gravar via APIs nativas; backend envia áudio à transcrição whisper-large-v3 e texto à extração gemini-2.5-flash-lite, com schema e validação próprios. Retornar rascunho; usuário confere e salva pelo fluxo normal. Modelos exatos estão no contrato API-008.

## Justificativa

Separar reconhecimento e estruturação, aproveitar catálogo da conta e impedir que saída livre de IA se torne escrita financeira direta. Observação explicitamente ditada deve ser extraída.

## Consequências

Chave somente no servidor; dados seguem ao provedor. Cancelamento não aplica retorno tardio. Há custo por uso e falhas externas; não há preço fixo prometido. Não adicionar SDK/plugin desnecessário nem trocar modelo sem avaliar contrato.

## Rastreabilidade

RF-027/RF-028/RF-029; RN-026 a RN-030; PEND-004/PEND-008. Ver [matriz](../rastreabilidade.md), [regras](../regras-negocio.md), [arquitetura](../arquitetura.md), [contratos](../contratos-integracoes.md) e [pendências](../pendencias-riscos.md).

[Índice das decisões](README.md).
