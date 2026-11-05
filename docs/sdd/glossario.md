# Glossário do projeto

Definições operacionais; fórmulas e restrições permanecem nas [regras](regras-negocio.md).

| Termo | Significado neste produto |
|---|---|
| Ciclo financeiro | Intervalo contínuo de datas definido pelo corte, não necessariamente mês civil. |
| Referência year/month | Nome do ciclo pelo mês nominal de início; não extrair mês da data da transação para filtrar. |
| Corte | Dia de referência 1–31 com ajuste ao fim do mês; configuração global. |
| Competência do orçamento | Referência do ciclo ao qual o limite pertence; nomes de tabela ainda usam monthly. |
| Entrada/receita | Transação income, valor positivo; não inclui retirada de objetivo. |
| Saída/despesa | Transação expense, valor positivo; não inclui contribuição a objetivo. |
| Resultado | Entradas menos saídas no recorte. Pode ser negativo; não é saldo bancário. |
| Limite | Valor planejado para uma categoria de despesa num ciclo; não bloqueia gasto excedente. |
| Utilização | Gasto dividido pelo denominador pertinente: entradas na Dashboard ou limite em Orçamentos. |
| Sem orçamento | Despesa cuja categoria não tem limite ativo no ciclo. |
| Objetivo | Meta independente com livro próprio de valores declarados como guardados/retirados. |
| Movimentação de objetivo | Contribution ou withdrawal; não é lançamento financeiro em transactions. |
| Rascunho por voz | Dados estruturados extraídos do áudio, sem gravação financeira até o usuário salvar. |
| Transcrição | Texto reconhecido pelo primeiro modelo, usado para extração; sem link de exibição na UI atual. |
| Idempotência | Repetir chave/conteúdo tem um único efeito nos endpoints que explicitamente suportam isso. |
| Versão | Controle otimista de atualização; conflito de objetivos usa 409, corte usa 422. |
| Soft delete | Registro mantido com deleted_at, excluído das consultas ativas; não é auditoria completa. |
| PWA | Aplicação web instalável com manifest/recursos próprios; não implica fila offline de gravação. |
| HMR/polling | Atualização em desenvolvimento; polling observa filesystem montado, não atualiza VPS publicada. |
| SDD | Especificação orienta tarefa, implementação, validação e evolução; linha de base do existente explicita evidência e lacunas. |
| ADR | Registro de contexto, decisão, motivo e consequências, incluindo estado e eventual substituição. |
| RPO/RTO | Perda de dados e tempo de recuperação toleráveis, ainda sem valores aprovados. |
