# Plano de implementação e evolução

Esta é uma linha de base de sistema existente. As etapas abaixo organizam continuidade, não fingem reconstruir sprints passadas nem autorizam escopo novo. Tudo nesta entrega é documental; não se executa deploy ou alteração de aplicação.

| Etapa | Objetivo e entregas | Dependências | Condição de conclusão | Estado |
|---|---|---|---|---|
| ETP-01 | Consolidar especificações, ADRs, inventário de telas, contratos e rastreabilidade | Fontes e decisões disponíveis | Arquivos criados, links/IDs/dependências conferidos e limitações explícitas | Concluída nesta entrega documental |
| ETP-02 | Auditar checkout/instalação e reconciliar a linha de base | Disponibilização do checkout completo e configuração não sensível | Versão registrada; migrations, auth, categorias, BudgetMetrics e SW conferidos; divergências classificadas | Pendente de evidência técnica, TAR-037 |
| ETP-03 | Validar funcionalidades existentes sem reimplementá-las | ETP-02, ambiente isolado e massa por usuário | VAL-001 a VAL-033 executados, resultados registrados, falhas vinculadas às especificações | Planejada; execução não autorizada nesta etapa documental |
| ETP-04 | Fechar operação, privacidade e acessibilidade | ETP-02 e decisões PEND-003/004/005/006/007/008/012 | Backup restaurado em teste, política definida, verificações e ajustes aprovados concluídos | Pendente de decisões/verificação |
| ETP-05 | Detalhar exportação CSV e eventual próxima evolução | PEND-002; conformidade e prioridade escolhida | Contrato, UX, segurança e validação aprovados antes do código | CSV aprovado em escopo; detalhamento pendente |

Recorrência/previstos/parcelas (RF-035) e análises/simulações de IA (RF-036) permanecem propostos. Não dependem de “terminar um sprint” para se tornarem aprovados: exigem decisão explícita de escopo. Não há cronograma ou duração contratada; usar capacidade e evidências para estimar após ETP-02.

## Ordem técnica dentro da validação

Começar por sessão/isolamento e corte, depois lançamentos/agregações, orçamento/cópia, objetivos, relatórios e UX/PWA. Voz depende de formulário, catálogo e API, mas falha do OpenRouter não pode bloquear lançamento manual. Testar conta e banco isolados, sem usar gravação financeira real para verificar correção.

Correções encontradas seguem especificação → tarefa de adequação → código em etapa posterior → validação → atualização da linha de base. Mudança de decisão requer ADR ou revisão explícita; tarefa de auditoria não autoriza redesenho. Ver [tarefas](tarefas.md) e [validação](plano-validacao.md).
