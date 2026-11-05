# Pendências, divergências e riscos

Este registro separa decisão de produto de verificação técnica. Nenhuma pendência autoriza mudança de código. Prioridade indica impacto proposto para acompanhamento. Responsáveis são papéis sugeridos, não pessoas designadas.

## PEND-001

**Checkout integral e versão instalada — alta; pendente de verificação técnica.** A base disponível é composta por entregas parciais e histórico; não foi obtido checkout completo ou acesso à VPS. Conferir commit, lockfiles, migrations aplicadas, controllers de autenticação/categorias, `BudgetMetrics`, template efetivo do service worker e configuração real. Responsável sugerido: manutenção. Saída: inventário com evidências e divergências corrigidas nas especificações. Bloqueia afirmações de conformidade integral; não bloqueia a leitura desta linha de base. TAR-037.

## PEND-002

**Contrato de exportação CSV — média; decisão do produto.** Exportação foi incluída no escopo histórico aprovado, mas não há implementação comprovada nem formato detalhado. Aprovar quais dados exportar, colunas, filtros, formato de datas/valores e tratamento seguro de células interpretadas como fórmulas. RF-034/TAR-034. Não confundir com integração bancária, que foi removida.

## PEND-003

**Backup e recuperação — alta; decisão operacional e comprovação.** Definir frequência, destino externo, retenção, criptografia, responsável, perda de dados tolerável (RPO) e tempo de recuperação (RTO). Não há evidência suficiente de rotina instalada ou restauração testada. Proposta: banco e configuração, com teste isolado e conferência de saldos. Aprovar política antes de automatizar. RNF-011/TAR-038.

## PEND-004

**Privacidade, retenção e descarte — alta; decisão do responsável pelo produto.** Definir prazo de retenção de logs, exclusão definitiva de registros/conta, guarda em backups e informações ao usuário sobre envio de voz/transcrição/categorias ao provedor. Verificar termos e retenção efetivos do OpenRouter e modelos; não foram auditados nesta documentação. Não há autorização para apagar dados existentes. RNF-006/RNF-014/TAR-039.

## PEND-005

**Dados de demonstração em produção — alta; decisão operacional.** `DatabaseSeeder` chama demonstração nas fontes recuperadas; existe risco de executar seed indiscriminado. Definir se a conta demonstrativa será permitida na VPS e como provisionar acesso seguro, sem publicar senha. Até isso ser decidido, não executar seed genérico em produção. RF-030 e [operação](operacao-deploy.md).

## PEND-006

**Foco acessível após remoção do azul — média; decisão visual e validação.** A remoção do foco azul de determinados campos foi aprovada e deve ser preservada. Verificar se o CSS atual deixa alternativa perceptível para teclado; se não, apresentar opção discreta coerente com o sistema para aprovação. Não reinserir o azul nem declarar acessibilidade integral automaticamente. RNF-007/TAR-040.

## PEND-007

**Metas de desempenho e disponibilidade — média; definição após medição.** Não estão aprovados P95, concorrência, SLA, navegadores mínimos ou limite de bundle. Medir na infraestrutura real com a massa de demonstração e propor metas com base no uso pessoal. Não transformar números arbitrários em requisito contratado. RNF-002/RNF-009/RNF-011.

## PEND-008

**Voz: custo, limites e resposta em produção — média; verificação e decisão de operação.** Modelos e fluxo atual estão aprovados; não precisam ser escolhidos novamente. Conferir disponibilidade das rotas/modelos na conta, preços vigentes, limites do Nginx/PHP e timeouts compatíveis com o cliente. Cinco chamadas/minuto não constituem teto mensal de gasto; definir orçamento/alerta se desejado. Áudio médio informado de oito segundos não é garantia de custo fixo. RNF-006/RNF-009/API-008.

## PEND-009

**Configuração global de corte e evolução multiusuário — média; limite atual explícito.** Código usa configuração única e endpoints autenticados, sem papel de administrador identificado. Alterar corte afeta calendário de todos; valores continuam isolados por usuário. Se houver uso compartilhado real, decidir se apenas um responsável poderá mudar corte ou se será necessário redesenho por conta. Não converter para corte individual sem aprovação. RN-005/ADR-002.

## PEND-010

**Limiares do orçamento — baixa; confirmação sem mudança automática.** Dashboard usa 60/85; donut de orçamento usa 75/90 no código recuperado. A conversa pediu igualdade de tamanho/fonte/fundo, sem aprovar unificação de cores. Regras de estado dos cartões por categoria dependem de `BudgetMetrics`, não recuperado integralmente. Preservar diferenças conhecidas; auditar classe antes de completar contrato. RN-008/RN-012.

## PEND-011

**Cache e atualização PWA — alta; verificação técnica.** Gerador de build e fluxos de atualização foram encontrados, mas template completo de `sw.js` não está na base auditada. Confirmar que dados privados não são persistidos, cache antigo é limpo e formulário não se perde ao atualizar. Relato de recurso antigo na UI não prova sozinho defeito de API ou CSS. RF-026/RNF-013.

## PEND-012

**Sessão, provisionamento e auditoria — alta; verificação técnica e política.** Autenticação funciona segundo histórico; configuração final de cookies, TTL, invalidação de outras sessões, política de recuperação de senha, provisão de conta real e logs não foi comprovada integralmente. Não há cadastro público ou MFA aprovado. Conferir código/configuração antes de afirmar garantia. API-001/TAR-037/TAR-039.

## Divergências documentadas e adequações

| Evidência antiga/atual | Resultado esperado aprovado | Tratamento |
|---|---|---|
| Fundação fala em mês-calendário e versões diferentes de PHP/MySQL | Ciclos financeiros; ambiente PHP 8.2/MySQL 8.0 informado depois | Preservar decisões recentes; conferir ambiente em TAR-037. |
| Pacotes antigos contêm Pluggy/operações bancárias | Integração removida integralmente | Não reaplicar arquivos/migration antigos; conferir schema antes de manutenção. |
| Relatórios/API podem conter comparação, maior gasto e categoria mais usada | Esses elementos não aparecem na UI atual | Manter compatibilidade do payload se necessário, sem renderizar cartões removidos. |
| Campos antigos podem ter “opcional”, placeholder/ícone azul | Formulários seguem últimos ajustes aprovados | Auditar arquivos implantados, não restaurar versão antiga de uma entrega. |
| Dashboard com onda clara e porcentagem grande | Mesmo fundo do orçamento; dimensões e fonte do donut iguais | Validar visualmente na mesma largura e tema. |
| Solicitação inicial falava em IA fazer lançamento | Fluxo entregue prepara rascunho e exige salvar manualmente, confirmado funcionando | Preservar revisão; qualquer gravação automática exige decisão nova. |
| `.env.example` Laravel pode indicar SQLite | Ambiente do projeto usa MySQL | Configurar ambiente real; não mudar banco por copiar exemplo. |

## Riscos de manutenção

Reaplicar ZIP isolado pode sobrescrever correções posteriores. Toda entrega deve partir do checkout consolidado, comparar arquivos e executar migrations necessárias, com backup. `TRUNCATE transactions` não é fluxo de limpeza do produto: ignora exclusão lógica, hooks e isolamento, podendo afetar todos os usuários e recalcular totais sem retorno. Relações físicas atuais precisam ser conferidas; não recomendar desligar foreign keys. A análise não autorizou qualquer execução destrutiva.
