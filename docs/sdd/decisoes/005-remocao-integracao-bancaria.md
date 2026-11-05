# ADR-005 — Remoção de integração bancária

Data de registro retrospectivo: 05/11/2026.

## Estado

Aceita e removida nas entregas posteriores.

## Contexto

Pacotes antigos incluíam Pluggy/operações bancárias. O usuário aprovou abandonar esse escopo.

## Decisão

Remover integração, menu, rotas, tabelas e coluna external_transaction_id do caminho atual; não reaplicar migration 2026_10_24_000005_create_bank_operations.php de pacote antigo.

## Justificativa

Reduzir complexidade e manter apenas os fluxos efetivamente desejados.

## Consequências

ZIP histórico pode conter código obsoleto. Verificar schema real antes de eventual limpeza remanescente, sem executar ações destrutivas nesta etapa. OpenRouter para voz é integração distinta e permanece.

## Rastreabilidade

escopo.md; PEND-001; operacao-deploy.md. Ver [matriz](../rastreabilidade.md), [regras](../regras-negocio.md), [arquitetura](../arquitetura.md), [contratos](../contratos-integracoes.md) e [pendências](../pendencias-riscos.md).

[Índice das decisões](README.md).
