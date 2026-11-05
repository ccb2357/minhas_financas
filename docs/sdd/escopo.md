# Escopo

## Linha de base implementada

| Área | Incluído | Evidência |
|---|---|---|
| Acesso | Login por e-mail/senha, sessão, saída, perfil e troca de senha | C parcial/R; FON-03/FON-08 |
| Calendário | Corte global 1–31, ciclos persistidos, transição futura e versão de configuração | C; FON-02 |
| Lançamentos | CRUD de entrada/saída, categoria, data, descrição e observação | C/R; FON-02/FON-03 |
| Histórico | Busca, filtro por tipo/categoria/período, paginação e edição | C; FON-02 |
| Dashboard | Resultado, donut, cartões de entradas/saídas, ranking, gráfico, últimos lançamentos e atalhos | C/R; FON-03 |
| Orçamentos | Limite por categoria/ciclo, observação, gastos, excedentes, sem orçamento e cópia de ciclo | C/R; FON-02/FON-03 |
| Objetivos | Meta, prazo opcional, guardar/retirar, corrigir/excluir movimento, arquivar/concluir/reabrir | C; FON-04 |
| Relatórios | Um, três e ano de ciclos; totais, resultado, ranking e barras | C/R; FON-02/FON-03 |
| Preferências | Tema claro/escuro no aparelho, categorias, ciclo e instalação | C; FON-03/FON-09 |
| PWA | Recursos estáticos versionados, fonte local, tela sem conexão, atualização | C parcial/R; FON-09 |
| Voz | Um lançamento por gravação, OpenRouter em duas chamadas, observação ditada, overlay e gráfico de áudio real | C/R; FON-06 |
| Demonstração | Seeders explícitos e dados fictícios por 24 ciclos | C; FON-07 |

“C parcial” não autoriza supor detalhes de arquivos faltantes. Ver [fontes](fontes-e-status.md).

## Aprovado para implementação futura, sem comprovação de conclusão

**RF-034 — exportação de dados pessoais/CSV.** Consta do planejamento de Configurações; a fundação a trata como extensão futura e o menu recuperado não oferece essa ação. Manter como escopo futuro aprovado, com formato, campos e priorização ainda pendentes. Não confundir exportação com importação bancária.

## Propostas ainda não autorizadas

- RF-035: recorrência, despesas previstas/pagas e parcelamento organizado.
- RF-036: análise financeira por IA e simulação de compra.
- Biometria/passkeys, cadastro público, recuperação de senha por e-mail, múltiplas contas bancárias e outros recursos sem decisão de execução não integram uma sprint ativa.
- Eventual mudança de corte global para individual exige decisão explícita; não é ajuste de interface.

## Exclusões atuais

- Pluggy, Open Finance, sincronização/conciliação, webhooks ou saldo bancário. A integração intermediária foi expressamente removida.
- Pagamento de fatura, fechamento/vencimento de cartão, contas por instituição, transferência entre contas e meio de pagamento como entidade de domínio.
- Compras/transferências reais, Pix transacional, emissão de boleto, gateway de pagamentos, análise de investimentos ou recomendação de ações.
- Aplicativo nativo, APK/Capacitor, React, Vue, Angular, TypeScript, troca de ECharts e dependências novas não aprovadas.
- Escrita financeira offline e sincronização posterior; a PWA não oferece fila de lançamentos offline comprovada.
- Chat geral, agente autônomo ou lançamento automático a partir de voz sem conferência.

## Limites

BRL, centavos inteiros, idioma pt-BR, datas 1900–2100 nas validações recuperadas. Não extrapolar relatórios para anos não aceitos pelos contratos. O resultado não transporta automaticamente saldo anterior. Objetivos são declarações de reserva independentes do saldo financeiro do ciclo.

## Fases

1. **Consolidação atual:** documentar e reconciliar a instalação, sem mudança funcional nesta entrega.
2. **Manutenção da linha de base:** corrigir defeitos comprovados sob as especificações atuais e validar no ambiente de destino.
3. **Operação verificável:** definir e validar backup, privacidade, acesso, indicadores e recuperação.
4. **Extensões:** elaborar a especificação de CSV e propostas somente após escolha do usuário.

A sequência executável e as aprovações estão em [plano-implementacao.md](plano-implementacao.md) e [tarefas.md](tarefas.md).
