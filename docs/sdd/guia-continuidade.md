# Continuidade por especificações

A documentação é linha de base do sistema existente. Não se deve implementar todas as tarefas por estarem listadas; propostas e decisões pendentes conservam seus estados. Primeiro ler [README](README.md), [fontes e estados](fontes-e-status.md), [escopo](escopo.md), requisitos/regras do domínio e seus ADRs.

## Ao iniciar uma mudança

1. Identificar RF/RN/TELA/DAT/API afetados, comportamento atual e decisão esperada. Consultar pendências e últimos ADRs; conferir versão do checkout completo.
2. Se a mudança altera decisão aprovada, apresentar impacto e obter decisão explícita. Se é correção para cumprir aceite já aprovado, vincular tarefa de adequação ao requisito existente.
3. Atualizar especificação principal, critérios e estados antes do código. Não duplicar fórmulas em telas ou contratos; apontar para a regra central.
4. Criar tarefa com dependências e validação concreta. Preservar IDs antigos; novos itens recebem próximo número, sem reaproveitar removidos.
5. Implementar em etapa autorizada; executar casos de sucesso, erro e limites em ambiente isolado. Registrar versão/evidência, sem segredos.
6. Atualizar rastreabilidade, operação quando aplicável, changelog e ADR substituído. “Implementado” exige evidência; “validado” exige resultado e ambiente, não apenas ausência de erro observado.

## Ao criar imagens de layout para aprovação

Usar [telas-ux.md](telas-ux.md) como inventário, informando TELA-ID, tema, largura, estado e massa fictícia. Imagens devem manter navegação, hierarquia, campos e remoções aprovadas. Mostrar positivo/negativo/zero, valores longos, erro/vazio quando relevantes. Imagem aprovada não altera contrato de dados ou regra de negócio por implicação.

## Evitar regressões de contexto

Não restaurar cartões rejeitados, comparação anterior, link de transcrição, categoria mais usada, integração bancária ou estilos de campo removidos ao reaplicar uma entrega antiga. Não misturar config Vite Laravel com config do frontend. Não substituir stack. Não inventar saldo bancário, faturas, recebimento confirmado ou conta compartilhada. Gravação por voz continua sendo preenchimento com revisão manual.

## Ao registrar resultado de validação

Modelo sugerido: `VAL-ID; versão; data; ambiente; pré-condições; entrada fictícia; esperado; obtido; passou/falhou/bloqueado; evidência sanitizada; pendência/tarefa`. Não incluir áudio pessoal, transcrição real, senha ou chave em relatório. Guardar falha com requisito e dados mínimos reproduzíveis.

## Documentação e entrega

Markdown e links relativos permitem versionamento junto ao projeto. SDD não exige um ritual universal de arquivos: os documentos escolhidos refletem este produto, seus riscos e o legado recuperado. Artefatos operacionais adicionais podem ser criados quando houver decisão e necessidade concreta. Esta entrega não inclui execução de migrations, seeding, build ou deploy.
