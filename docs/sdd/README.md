# Minhas Finanças — documentação SDD

Linha de base em português do produto existente, consolidada em **05/11/2026**. Finalidade: orientar manutenção, implementação futura, revisão de layouts e validação a partir de especificações rastreáveis, preservando decisões aprovadas. Não houve alteração no código da aplicação nesta entrega.

**Limite importante:** foram analisadas entregas de código e documentos recuperados, não checkout integral nem instalação de produção. “Implementado” é acompanhado por evidência e não significa conformidade da VPS auditada. Leia primeiro os estados e a precedência das fontes.

## Ordem recomendada e finalidade

| Ordem | Documento | Finalidade |
|---|---|---|
| 1 | [Fontes e estados](fontes-e-status.md) | Evidências, precedência, limitações e significado dos estados. |
| 2 | [Visão do produto](visao-produto.md) | Problema, público, proposta de valor e sucesso. |
| 3 | [Escopo](escopo.md) | Incluído, removido, aprovado futuro e proposto. |
| 4 | [Requisitos funcionais](requisitos-funcionais.md) | RFs com prioridade e aceite. |
| 5 | [Regras de negócio](regras-negocio.md) | Regras centrais de cálculos, validações e permissões. |
| 6 | [Requisitos não funcionais](requisitos-nao-funcionais.md) | Qualidade, verificações e metas ainda indefinidas. |
| 7 | [Jornadas](jornadas-usuarios.md) | Fluxos principais, alternativas e recuperação. |
| 8 | [Telas e UX](telas-ux.md) | Inventário, formulários, navegação e estados para implementação/preview. |
| 9 | [Arquitetura](arquitetura.md) | Stack, componentes e comunicação. |
| 10 | [Modelo de dados](modelo-dados.md) | Entidades, campos, relações, restrições e ciclo de vida. |
| 11 | [Contratos e integrações](contratos-integracoes.md) | Endpoints, payloads, autenticação e falhas, inclusive voz. |
| 12 | [Segurança e privacidade](seguranca-privacidade.md) | Isolamento, sessão, segredos, dados e limites de evidência. |
| 13 | [Decisões](decisoes/README.md) | Índice de oito registros retrospectivos e respectivas consequências. |
| 14 | [Plano de implementação](plano-implementacao.md) | Etapas, entregas e critérios de conclusão. |
| 15 | [Tarefas](tarefas.md) | Trabalho executável, dependências e estado. |
| 16 | [Plano de validação](plano-validacao.md) | Cenários de sucesso, falha e limites. |
| 17 | [Operação e deploy](operacao-deploy.md) | Desenvolvimento, build, publicação, diagnóstico e recuperação. |
| 18 | [Rastreabilidade](rastreabilidade.md) | Relações diretas e inversas entre requisitos e artefatos. |
| 19 | [Pendências e riscos](pendencias-riscos.md) | Decisões necessárias, lacunas técnicas e divergências. |
| 20 | [Glossário](glossario.md) | Vocabulário específico, evitando confundir resultado e saldo bancário. |
| 21 | [Guia de continuidade](guia-continuidade.md) | Como evoluir a SDD e orientar futuros layouts. |
| 22 | [Relatório de consistência](relatorio-consistencia.md) | Resultado das verificações documentais desta entrega. |
| 23 | [CHANGELOG](CHANGELOG.md) | Histórico da documentação e regra de atualização. |

## Organização e adaptação

Não existe lista universal obrigatória para SDD. Todos os documentos solicitados são aplicáveis à combinação API/PWA/IA deste projeto. Glossário, fontes/estados, guia de continuidade e relatório de consistência foram adicionados porque há várias entregas parciais e decisões de UX que substituem versões antigas. ADRs individuais ficam em decisoes/; anexos de código, segredos e dumps não fazem parte da documentação.

Aspectos sem aplicação atual são explicitados no escopo/arquitetura: não há integração bancária vigente, app nativo, motor de faturas ou fila offline financeira. Não foram inventados documentos de infraestrutura/serviços inexistentes para preencher uma metodologia.

## Identificadores e uso

`RF` requisito funcional; `RNF` não funcional; `RN` regra; `TELA` tela/componente; `DAT` entidade/estrutura; `API` grupo de contrato; `TAR` tarefa; `VAL` validação; `PEND` pendência; `ADR` decisão; `FON` fonte; `ETP` etapa. Links relativos funcionam com a pasta completa.

Regras e fórmulas pertencem a regras-negocio.md; schema a modelo-dados.md; payloads a contratos-integracoes.md; aparência e campos a telas-ux.md. Demais documentos remetem a essas definições. Nunca usar um estado “proposto” como autorização para implementar. Começar qualquer manutenção pela rastreabilidade e pelas pendências do domínio afetado.
