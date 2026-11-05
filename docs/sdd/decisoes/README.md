# Decisões arquiteturais e de produto

Registros retrospectivos consolidados em 05/11/2026 a partir das [fontes](../fontes-e-status.md). “Aceita” se refere à evidência original; esta documentação não cria nova autorização. Registros derivados apenas de código deixam isso explícito. Uma decisão futura pode substituir um ADR com vínculo de sucessão, sem apagar o contexto.

| ID | Decisão | Estado |
|---|---|---|
| [ADR-001](001-stack-e-separacao.md) | Stack e separação técnica | Decisão aceita; implementada em entregas e ambiente informado |
| [ADR-002](002-ciclos-financeiros.md) | Calendário financeiro global e transição de corte | Decisão reconstruída do código existente; implementada, sem nova aprovação de modelo por usuário |
| [ADR-003](003-centavos-e-resultado.md) | Centavos, resultado e ausência de saldo bancário | Aceita no produto; implementada |
| [ADR-004](004-objetivos-independentes.md) | Objetivos com livro de movimentações independente | Implementada no código recuperado |
| [ADR-005](005-remocao-integracao-bancaria.md) | Remoção de integração bancária | Aceita e removida nas entregas posteriores |
| [ADR-006](006-voz-openrouter.md) | Voz em duas etapas pelo OpenRouter e revisão manual | Aceita; implementada e funcional segundo relato do usuário |
| [ADR-007](007-interface-compacta.md) | Interface financeira compacta e consistente | Aceita em sucessivas revisões; implementada nas entregas de UX |
| [ADR-008](008-pwa-e-sessao.md) | PWA estática com sessão e sem escrita financeira offline | Aceita no escopo; implementação parcial auditada |

Não existe ADR aprovado para recorrência, análise financeira por IA, mudança de banco, nova stack ou retorno de integração bancária. Exportação CSV tem escopo aprovado, mas contrato pendente.
