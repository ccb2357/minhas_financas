# Plano de validação

Cenários vinculados à linha de base, **não executados na aplicação por esta entrega documental**. Evidência antiga de testes/código não substitui execução na instalação atual. Preparar banco e contas isolados; nunca truncar produção para montar massa. Código de terceiros deve ser simulado nos testes automatizados da voz; teste real de áudio exige aparelho, autorização de microfone e conta configurada.

Cada caso contém sucesso, falha/recuperação e limite. Registrar data, versão, ambiente, dados fictícios, passos, resultado esperado/obtido e evidência sanitizada. RF-034 a RF-036 têm apenas gates de definição e não passam como testes de funcionalidades prontas.

## VAL-001

**Login com sessão.** [RF-001](requisitos-funcionais.md#rf-001); [TAR-001](tarefas.md#tar-001).

Regras: [RN-001](regras-negocio.md#rn-001).

- Sucesso: Conta provisionada; abrir sem sessão, informar credenciais válidas e verificar identificação e entrada.
- Falha e recuperação: Senha inválida ou 419 não abre área privada; corrigir credenciais/renovar CSRF e tentar pelo usuário.
- Limites/alternativas: Duplo toque durante busy não duplica envio; acesso com sessão válida não pede microfone.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-002

**Saída e expiração.** [RF-002](requisitos-funcionais.md#rf-002); [TAR-002](tarefas.md#tar-002).

Regras: [RN-001](regras-negocio.md#rn-001), [RN-031](regras-negocio.md#rn-031).

- Sucesso: Entrar, abrir dados próprios, sair e voltar pelo navegador: dados não reaparecem.
- Falha e recuperação: Simular 401 durante consulta e durante voz; fluxo de acesso é acionado e tracks são encerradas.
- Limites/alternativas: Trocar de conta na mesma aba/dispositivo não preserva rascunho ou dados da anterior.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-003

**Perfil e senha.** [RF-003](requisitos-funcionais.md#rf-003); [TAR-003](tarefas.md#tar-003).

Regras: [RN-001](regras-negocio.md#rn-001).

- Sucesso: Alterar nome e e-mail com senha atual; trocar senha e validar novo login.
- Falha e recuperação: Senha atual incorreta ou confirmação divergente mantém formulário e erro sanitizado.
- Limites/alternativas: Conferir mínimo de 12 caracteres na UI e regra backend efetiva; não presumir equivalência sem checkout.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-004

**Categorias e isolamento.** [RF-004](requisitos-funcionais.md#rf-004); [TAR-004](tarefas.md#tar-004).

Regras: [RN-001](regras-negocio.md#rn-001), [RN-009](regras-negocio.md#rn-009).

- Sucesso: Criar receita/despesa própria, alternar filtros, editar cor/ícone e inativar.
- Falha e recuperação: Tentar vincular categoria alheia/inativa de outra transação; rejeitar sem expor seus dados.
- Limites/alternativas: Histórico com categoria inativa continua legível; concorrência com inativação não cria novo vínculo inválido.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-005

**Ícones, datas e seletores.** [RF-005](requisitos-funcionais.md#rf-005); [TAR-005](tarefas.md#tar-005).

Regras: [RN-003](regras-negocio.md#rn-003), [RN-032](regras-negocio.md#rn-032).

- Sucesso: Abrir seletor de ícone/data/ciclo, escolher e retornar com demais campos preservados.
- Falha e recuperação: Ícone fora do catálogo ou data inexistente deve ser recusado; fechar sem confirmar não grava.
- Limites/alternativas: Conferir mudança de mês/ano, fevereiro bissexto e teclado/foco sem salto de rolagem.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-006

**Lançamento manual e limites monetários.** [RF-006](requisitos-funcionais.md#rf-006); [TAR-006](tarefas.md#tar-006).

Regras: [RN-001](regras-negocio.md#rn-001), [RN-002](regras-negocio.md#rn-002), [RN-003](regras-negocio.md#rn-003), [RN-009](regras-negocio.md#rn-009), [RN-033](regras-negocio.md#rn-033), [RN-022](regras-negocio.md#rn-022).

- Sucesso: Criar saída de 1 centavo e entrada; conferir centavos no Resource e totais, inclusive observação.
- Falha e recuperação: Recusar zero, negativo, decimal em amount_cents, categoria incompatível ou user_id injetado.
- Limites/alternativas: Aceitar limite de RN-002 e recusar MAX+1; input vazio mantém R$ cinza fixo; não existe segunda despesa de fatura.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-007

**Edição e mudança de ciclo.** [RF-007](requisitos-funcionais.md#rf-007); [TAR-007](tarefas.md#tar-007).

Regras: [RN-004](regras-negocio.md#rn-004), [RN-009](regras-negocio.md#rn-009), [RN-023](regras-negocio.md#rn-023).

- Sucesso: Editar valor/data para outro ciclo e conferir os totais de origem e destino.
- Falha e recuperação: Categoria alheia/erro de rede não fecha o formulário nem substitui dados válidos.
- Limites/alternativas: Preservar categoria inativa original do mesmo tipo; alterar para outra inativa não é permitido; voz ausente.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-008

**Exclusão de lançamento.** [RF-008](requisitos-funcionais.md#rf-008); [TAR-008](tarefas.md#tar-008).

Regras: [RN-001](regras-negocio.md#rn-001), [RN-023](regras-negocio.md#rn-023).

- Sucesso: Confirmar remoção própria; registro some dos agregados e deleted_at é preenchido.
- Falha e recuperação: Cancelar mantém registro; ID alheio não permite remoção.
- Limites/alternativas: Repetir exclusão no fluxo atual mantém estado removido; histórico paginado recalcula sem ressuscitar registro.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-009

**Filtros e paginação.** [RF-009](requisitos-funcionais.md#rf-009); [TAR-009](tarefas.md#tar-009).

Regras: [RN-004](regras-negocio.md#rn-004), [RN-020](regras-negocio.md#rn-020).

- Sucesso: Montar massa em dois usuários e três ciclos; combinar tipo/categoria/busca e navegar páginas.
- Falha e recuperação: Parâmetro inválido retorna validação; busca com % ou _ procura caracteres literais.
- Limites/alternativas: Mesmo dia usa ID decrescente; soma de páginas/consulta agregada coincide sem mistura de contas.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-010

**Primeiro corte.** [RF-010](requisitos-funcionais.md#rf-010); [TAR-010](tarefas.md#tar-010).

Regras: [RN-004](regras-negocio.md#rn-004), [RN-005](regras-negocio.md#rn-005), [RN-025](regras-negocio.md#rn-025).

- Sucesso: Em banco isolado sem configuração, abrir Dashboard, definir corte e consultar período criado.
- Falha e recuperação: Antes da definição, rota financeira retorna 428/CYCLE_SETUP_REQUIRED; não criar corte default silencioso.
- Limites/alternativas: Recusar 0 e 32; aceitar 1 e 31, inclusive fevereiro com ajuste de último dia.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-011

**Transição de corte e versão.** [RF-011](requisitos-funcionais.md#rf-011); [TAR-011](tarefas.md#tar-011).

Regras: [RN-005](regras-negocio.md#rn-005), [RN-006](regras-negocio.md#rn-006).

- Sucesso: Com ciclo iniciado no corte 10, agendar 15 e verificar exemplo de RN-006 e IDs futuros preservados.
- Falha e recuperação: Enviar versão antiga e esperar 422 errors.cut_day sem alterar calendário/orçamentos.
- Limites/alternativas: Testar novo corte 5, ano novo, fevereiro e reagendamento/cancelamento; passado e ciclo iniciado permanecem intactos.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-012

**Resultado e donut Dashboard.** [RF-012](requisitos-funcionais.md#rf-012); [TAR-012](tarefas.md#tar-012).

Regras: [RN-007](regras-negocio.md#rn-007), [RN-008](regras-negocio.md#rn-008).

- Sucesso: Com I=10000 e E=6000 centavos, resultado 4000 e donut verde 60%; cartões externos corretos.
- Falha e recuperação: Com I=0/E>0, percentual é — e anel vermelho; I=E=0 produz 0%.
- Limites/alternativas: Testar 60,01%, 85%, 85,01%, 100% e 120%: cor usa valor exato, rótulo arredonda, resultado pode ser negativo.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-013

**Drill-down do ranking.** [RF-013](requisitos-funcionais.md#rf-013); [TAR-013](tarefas.md#tar-013).

Regras: [RN-020](regras-negocio.md#rn-020), [RN-032](regras-negocio.md#rn-032).

- Sucesso: Abrir uma categoria de cada origem e comparar total do histórico com valor de origem.
- Falha e recuperação: Categoria removida/alheia ou URL adulterada não mostra dados de outra conta.
- Limites/alternativas: Relatórios em 3 ciclos/ano preservam todas as datas; Demais categorias não vira ID fictício.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-014

**Orçamento com observação.** [RF-014](requisitos-funcionais.md#rf-014); [TAR-014](tarefas.md#tar-014).

Regras: [RN-010](regras-negocio.md#rn-010), [RN-033](regras-negocio.md#rn-033).

- Sucesso: Criar limite/observação e editar apenas esses campos; conferir persistência e posição do campo.
- Falha e recuperação: Recusar categoria de receita, duplicação ativa, limite zero e alteração de competência na edição.
- Limites/alternativas: Notes com 2000 caracteres aceita; 2001 rejeita; omitir notes preserva e null limpa conforme contrato.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-015

**Métricas e visual do orçamento.** [RF-015](requisitos-funcionais.md#rf-015); [TAR-015](tarefas.md#tar-015).

Regras: [RN-011](regras-negocio.md#rn-011), [RN-012](regras-negocio.md#rn-012).

- Sucesso: Gastar em categoria orçada e conferir G, L−G e percentual com agregação independente da página.
- Falha e recuperação: Excesso não bloqueia lançamento; falta de dados não cria percentual fictício.
- Limites/alternativas: Testar 75%, 75,01%, 90%, 90,01% e >100; comparar dimensões/fonte/fundo com Dashboard na mesma largura.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-016

**Sem orçamento.** [RF-016](requisitos-funcionais.md#rf-016); [TAR-016](tarefas.md#tar-016).

Regras: [RN-013](regras-negocio.md#rn-013), [RN-032](regras-negocio.md#rn-032).

- Sucesso: Inserir despesa em categoria sem limite e conferir cartão/lista/total e navegação.
- Falha e recuperação: unbudgeted com range ampliado é rejeitado; categoria de outro usuário não entra no cálculo.
- Limites/alternativas: Criar/remover orçamento muda classificação; múltiplas páginas não alteram total e voltar preserva contexto.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-017

**Cópia integral e atomicidade.** [RF-017](requisitos-funcionais.md#rf-017); [TAR-017](tarefas.md#tar-017).

Regras: [RN-014](regras-negocio.md#rn-014).

- Sucesso: Origem com mais de uma página de orçamentos: copiar ao destino e conferir notas/limites/quantidade.
- Falha e recuperação: Origem vazia, mesmo ciclo, conflito no destino ou categoria inativa deixam zero novos registros.
- Limites/alternativas: Simular alteração concorrente e corrida de duplicação; abortar lote completo; nenhuma transaction é copiada.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-018

**Objetivo e metadados.** [RF-018](requisitos-funcionais.md#rf-018); [TAR-018](tarefas.md#tar-018).

Regras: [RN-015](regras-negocio.md#rn-015), [RN-017](regras-negocio.md#rn-017), [RN-018](regras-negocio.md#rn-018).

- Sucesso: Criar com UUID novo, nome/ícone/meta e prazo por switch; editar sem mexer diretamente no saldo.
- Falha e recuperação: Recusar saved_cents/user_id enviados pelo cliente, meta zero e objetivo alheio.
- Limites/alternativas: Prazo desligado é null; meta menor que valor guardado não implica conclusão automática; arquivado bloqueia edição.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-019

**Livro de movimentos do objetivo.** [RF-019](requisitos-funcionais.md#rf-019); [TAR-019](tarefas.md#tar-019).

Regras: [RN-015](regras-negocio.md#rn-015), [RN-016](regras-negocio.md#rn-016), [RN-018](regras-negocio.md#rn-018).

- Sucesso: Guardar 100, retirar 30, corrigir contribuição para 90: saldo 60; conferir sem impacto em transactions.
- Falha e recuperação: Retirada acima do saldo e exclusão de contribuição que causaria saldo negativo falham sem efeito parcial.
- Limites/alternativas: Repetir UUID+conteúdo reutiliza resultado; UUID+outro conteúdo/versão antiga gera 409; concorrência não perde saldo.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-020

**Estados do objetivo.** [RF-020](requisitos-funcionais.md#rf-020); [TAR-020](tarefas.md#tar-020).

Regras: [RN-017](regras-negocio.md#rn-017), [RN-018](regras-negocio.md#rn-018).

- Sucesso: Arquivar/reabrir; depois atingir meta e concluir explicitamente; verificar stamps e abas.
- Falha e recuperação: Concluir antes da meta retorna 422; operar arquivado/versão antiga retorna conflito sem mutação.
- Limites/alternativas: Atingir ou superar meta não conclui sozinho; progresso limita a 100, reabertura limpa stamps e preserva ledger.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-021

**Recortes dos relatórios.** [RF-021](requisitos-funcionais.md#rf-021); [TAR-021](tarefas.md#tar-021).

Regras: [RN-019](regras-negocio.md#rn-019).

- Sucesso: Selecionar agosto de um ano: totais janeiro–agosto, gráfico anual com doze ciclos; conferir dados conhecidos.
- Falha e recuperação: range inválido ou falta de corte não apresenta total de calendário incorreto.
- Limites/alternativas: 3 ciclos atravessa ano e inclui dois anteriores; datas coincidem com calendário de corte, não MONTH(date).
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-022

**Gráfico e ranking.** [RF-022](requisitos-funcionais.md#rf-022); [TAR-022](tarefas.md#tar-022).

Regras: [RN-007](regras-negocio.md#rn-007), [RN-019](regras-negocio.md#rn-019), [RN-020](regras-negocio.md#rn-020).

- Sucesso: Conferir séries monetárias e ranking com massa de categorias; tocar abre histórico coerente.
- Falha e recuperação: Falha de API apresenta recuperação sem gráfico de sucesso fictício; texto de categoria escapa HTML.
- Limites/alternativas: Ano inclui ciclos futuros no gráfico sem ampliar totais; cartões Maior gasto/Categoria mais usada não aparecem.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-023

**Resultado em Relatórios.** [RF-023](requisitos-funcionais.md#rf-023); [TAR-023](tarefas.md#tar-023).

Regras: [RN-007](regras-negocio.md#rn-007).

- Sucesso: Conferir resultado logo após Entradas/Saídas em card de largura total.
- Falha e recuperação: Não reaparecem percentual/anterior/diferença após atualização ou retorno de rota.
- Limites/alternativas: Valores positivo, zero, negativo e longos cabem; diferença monetária entre API e UI é zero.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-024

**Tema e ícones.** [RF-024](requisitos-funcionais.md#rf-024); [TAR-024](tarefas.md#tar-024).

Regras: [RN-032](regras-negocio.md#rn-032).

- Sucesso: Alternar claro/escuro, recarregar e abrir outra aba; preferência local e ícones permanecem.
- Falha e recuperação: Valor de storage inválido não quebra renderização nem afeta finanças.
- Limites/alternativas: Conferir contrastes/estados disabled/erro em ambos os temas e ausência de chamada externa para carregar Nunito.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-025

**Instalação PWA.** [RF-025](requisitos-funcionais.md#rf-025); [TAR-025](tarefas.md#tar-025).

Regras: [RN-031](regras-negocio.md#rn-031).

- Sucesso: Em HTTPS e navegador compatível, instalar; abrir standalone e conferir navegação/assets.
- Falha e recuperação: Navegador sem prompt mantém uso normal e instrução pertinente; sem afirmar instalação executada.
- Limites/alternativas: Após instalado, ação instala não insiste; testar Android/iOS reais antes de definir suporte mínimo.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-026

**Atualização PWA.** [RF-026](requisitos-funcionais.md#rf-026); [TAR-026](tarefas.md#tar-026).

Regras: [RN-031](regras-negocio.md#rn-031), [RN-032](regras-negocio.md#rn-032).

- Sucesso: Publicar build de teste com identificador novo e verificar atualização de assets e UI.
- Falha e recuperação: Interromper rede e manter formulário sujo: não perder conteúdo nem carregar combinação incoerente de versões.
- Limites/alternativas: Conferir caches/SW efetivo: /api e /sanctum não entram como dados privados persistidos; fechar/reabrir versão antiga.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-027

**Captura real e cancelamento.** [RF-027](requisitos-funcionais.md#rf-027); [TAR-027](tarefas.md#tar-027).

Regras: [RN-026](regras-negocio.md#rn-026), [RN-030](regras-negocio.md#rn-030), [RN-032](regras-negocio.md#rn-032).

- Sucesso: Novo lançamento: permitir microfone; falar baixo/alto e observar barras do mesmo stream; central finaliza.
- Falha e recuperação: Permissão negada, API indisponível ou saída da página abre erro apropriado/libera tracks e não salva.
- Limites/alternativas: Cancelar no X durante captura/processamento e receber retorno tardio não altera formulário; aos 45s respeitar limite.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-028

**Pipeline e dados não confiáveis.** [RF-028](requisitos-funcionais.md#rf-028); [TAR-028](tarefas.md#tar-028).

Regras: [RN-001](regras-negocio.md#rn-001), [RN-026](regras-negocio.md#rn-026), [RN-027](regras-negocio.md#rn-027), [RN-028](regras-negocio.md#rn-028).

- Sucesso: Com fixture de áudio suportada e provedores simulados, validar sequência transcrição→schema→draft com categorias próprias.
- Falha e recuperação: Recusar JSON inválido, categoria alheia, fala múltipla/instrução maliciosa e erro externo; sem registro financeiro.
- Limites/alternativas: Arquivo no limite 8192 KiB e um byte acima; chamada 6 no intervalo limitado, timeout e flag false produzem falha contratada.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-029

**Observação ditada e conferência.** [RF-029](requisitos-funcionais.md#rf-029); [TAR-029](tarefas.md#tar-029).

Regras: [RN-028](regras-negocio.md#rn-028), [RN-029](regras-negocio.md#rn-029).

- Sucesso: Ditar supermercado com “na observação coloque compra para o churrasco”; draft.notes preenche e usuário salva depois.
- Falha e recuperação: Transcrição sem notas não apaga observação anterior; campo ambíguo fica para conferência, sem inventar valor/categoria.
- Limites/alternativas: Salvar apenas após ação explícita; duas respostas fora de ordem não sobrescrevem formulário mais recente; sem link Ver transcrição.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-030

**Demonstração isolada.** [RF-030](requisitos-funcionais.md#rf-030); [TAR-030](tarefas.md#tar-030).

Regras: [RN-024](regras-negocio.md#rn-024).

- Sucesso: Em banco de teste, executar DemoSeeder explicitamente e conferir 24 ciclos, 432 orçamentos e 8 objetivos.
- Falha e recuperação: Conta real preexistente não perde dado; configuração de corte real não é substituída.
- Limites/alternativas: Repetir seed não duplica nem repovoa parcialmente dados existentes; não usar banco de produção para validar.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-031

**Catálogo inicial.** [RF-031](requisitos-funcionais.md#rf-031); [TAR-031](tarefas.md#tar-031).

Regras: [RN-025](regras-negocio.md#rn-025), [RN-001](regras-negocio.md#rn-001).

- Sucesso: Executar seeder isolado com exatamente um usuário; conferir categorias por tipo/nome.
- Falha e recuperação: Zero ou múltiplos usuários impedem execução ambígua; nenhuma conta alheia recebe vínculo.
- Limites/alternativas: Repetição preserva existentes; caminho seedFor(user) funciona no contexto de demonstração sem duplicar catálogo.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-032

**Navegação, foco e proteção.** [RF-032](requisitos-funcionais.md#rf-032); [TAR-032](tarefas.md#tar-032).

Regras: [RN-032](regras-negocio.md#rn-032).

- Sucesso: Abrir rotas pelo menu/ranking/voltar; testar seletores deslizantes e confirmação de formulário alterado.
- Falha e recuperação: Cancelar saída não descarta; modal não prende foco em elemento inexistente; busy impede mutação duplicada.
- Limites/alternativas: Relatórios/Categorias sem item inferior incorreto; 320px/teclado/fonte ampliada não escondem ação; respeitar redução de movimento.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-033

**Indisponibilidade.** [RF-033](requisitos-funcionais.md#rf-033); [TAR-033](tarefas.md#tar-033).

Regras: [RN-031](regras-negocio.md#rn-031).

- Sucesso: Cortar rede, abrir estado de indisponibilidade e recuperar; recarregar pela ação disponível.
- Falha e recuperação: POST interrompido não informa sucesso nem é reenviado automaticamente em fila.
- Limites/alternativas: Após falha de resposta de criação, conferir histórico antes de repetir; recursos estáticos não prometem dados privados offline.
- Execução nesta entrega: não executado; validar no checkout consolidado.

## VAL-034

**Especificação futura de CSV.** [RF-034](requisitos-funcionais.md#rf-034); [TAR-034](tarefas.md#tar-034).

Regras: [RN-001](regras-negocio.md#rn-001).

- Sucesso: Após aprovar contrato, definir massa com múltiplos usuários e filtros para conferir exportação própria.
- Falha e recuperação: Incluir células com prefixos interpretáveis como fórmula e dados alheios no plano; expectativa depende do contrato aprovado.
- Limites/alternativas: Sem execução de endpoint fictício nesta linha de base; completar colunas/limites antes de tornar cenário executável.
- Execução nesta entrega: não executado — gate de especificação, funcionalidade não implementada.

## VAL-035

**Decisão sobre recorrência.** [RF-035](requisitos-funcionais.md#rf-035); [TAR-035](tarefas.md#tar-035).

Regras: a definir após autorização.

- Sucesso: Somente após aprovação, especificar ocorrências previstas/pagas e efeito nos ciclos.
- Falha e recuperação: Não executar gravação de série nem aceitar sucesso enquanto escopo estiver apenas proposto.
- Limites/alternativas: Critérios de parcela, edição parcial e idempotência serão adicionados após decisão, sem simular cobertura de código inexistente.
- Execução nesta entrega: não executado — gate de especificação, funcionalidade não implementada.

## VAL-036

**Decisão sobre análise IA.** [RF-036](requisitos-funcionais.md#rf-036); [TAR-036](tarefas.md#tar-036).

Regras: [RN-021](regras-negocio.md#rn-021).

- Sucesso: Somente se retomado e aprovado, definir pergunta, dados suficientes e forma de avaliação.
- Falha e recuperação: Não tratar resultado do ciclo como saldo bancário nem produzir análise autorizada pelo simples uso de voz.
- Limites/alternativas: Sem endpoint/teste fictício; revisar privacidade/custo/limites antes de habilitar qualquer nova análise.
- Execução nesta entrega: não executado — gate de especificação, funcionalidade não implementada.

## VAL-037

**Isolamento, sessão e segredos.** RNFs: [RNF-003](requisitos-nao-funcionais.md#rnf-003), [RNF-004](requisitos-nao-funcionais.md#rnf-004), [RNF-005](requisitos-nao-funcionais.md#rnf-005). Regras: [RN-001](regras-negocio.md#rn-001).

Dois usuários; tentar cada GET/PATCH/DELETE e vínculo com ID alheio. Conferir 401/419, expiração, cookies efetivos e mudança de senha. Procurar segredos em dist/storage do navegador/respostas sem reproduzi-los em relatório. Zero dados alheios divulgados ou alterados; configuração ausente vira pendência, não aprovação.

Estado: não executado nesta entrega documental.

## VAL-038

**Privacidade e ciclo de vida do áudio.** RNFs: [RNF-006](requisitos-nao-funcionais.md#rnf-006), [RNF-014](requisitos-nao-funcionais.md#rnf-014). Regras: [RN-026](regras-negocio.md#rn-026), [RN-029](regras-negocio.md#rn-029), [RN-030](regras-negocio.md#rn-030).

Observar Network e tracks com permissão explícita; cancelar/sair e verificar encerramento. Inspecionar logs/temp sem conteúdo sensível; confirmar política do provedor separadamente. Sem gravação permanente de áudio/transcrição no domínio; não alegar ausência de temporário de upload ou retenção externa.

Estado: não executado nesta entrega documental.

## VAL-039

**Acessibilidade e responsividade.** RNFs: [RNF-007](requisitos-nao-funcionais.md#rnf-007), [RNF-008](requisitos-nao-funcionais.md#rnf-008). Regras: [RN-032](regras-negocio.md#rn-032).

Teclado, leitor de tela, redução de movimento, zoom/fonte ampliada, larguras 320/390/760 e ambos os temas. Conferir foco perceptível, ordem dos labels, modais, anúncios busy/erro, botões do overlay e área segura. Registrar falhas e aprovar alternativa de foco antes de alterar direção visual.

Estado: não executado nesta entrega documental.

## VAL-040

**Restauração e consistência.** RNFs: [RNF-001](requisitos-nao-funcionais.md#rnf-001), [RNF-011](requisitos-nao-funcionais.md#rnf-011). Regras: [RN-007](regras-negocio.md#rn-007), [RN-015](regras-negocio.md#rn-015), [RN-016](regras-negocio.md#rn-016), [RN-023](regras-negocio.md#rn-023).

Após política aprovada, restaurar backup isolado; comparar contagens/totais por usuário/ciclo e saldos de objetivos com evidência anterior. Medir tempo/perda e confrontar RTO/RPO definidos, não inventados. Simular falha na restauração e recuperar sem tocar produção.

Estado: não executado nesta entrega documental.

## VAL-041

**Desempenho e compatibilidade.** RNFs: [RNF-002](requisitos-nao-funcionais.md#rnf-002), [RNF-009](requisitos-nao-funcionais.md#rnf-009), [RNF-012](requisitos-nao-funcionais.md#rnf-012). Regras: não acrescenta regra de domínio.

Medir consultas e navegação com massa de dois anos, quantidade de requests, tempo e memória/bundle. Testar codecs/aparelhos Android/iOS e falta de MediaRecorder. Registrar valores e propor P95/matriz; não dar aprovado/reprovado contra meta numérica inexistente.

Estado: não executado nesta entrega documental.

## VAL-042

**Falhas externas e observabilidade.** RNFs: [RNF-005](requisitos-nao-funcionais.md#rnf-005), [RNF-006](requisitos-nao-funcionais.md#rnf-006), [RNF-010](requisitos-nao-funcionais.md#rnf-010), [RNF-014](requisitos-nao-funcionais.md#rnf-014). Regras: [RN-026](regras-negocio.md#rn-026), [RN-027](regras-negocio.md#rn-027), [RN-028](regras-negocio.md#rn-028).

Simular OpenRouter 401/429/5xx, timeout, silêncio, áudio sem fala clara e resposta que viola schema/semântica. Verificar status interno sanitizado, modal e formulário preservado; nenhuma transação criada. Falha de rede depois de salvar manualmente exige consulta antes de reenviar; logs só com metadados adequados.

Estado: não executado nesta entrega documental.

## VAL-043

**Integridade dos recursos PWA.** RNFs: [RNF-013](requisitos-nao-funcionais.md#rnf-013). Regras: [RN-031](regras-negocio.md#rn-031).

Auditar SW integral: autenticação/dados privados fora do cache estático; assets de build consistente, fonte local e versões antigas removidas conforme ciclo de atualização. Repetir update com formulário alterado e sem rede. Conclusão depende do template não recuperado nesta base.

Estado: não executado nesta entrega documental.

## VAL-044

**Consistência da documentação.** RNFs: [RNF-015](requisitos-nao-funcionais.md#rnf-015). Regras: não acrescenta regra de domínio.

Verificar arquivos e fragmentos relativos, unicidade de IDs, RF→tarefa→VAL, cobertura de regras/telas/dados e grafo de dependências sem ciclo. Comparar hashes dos diretórios da aplicação antes/depois e procurar conteúdo secreto. Resultado desta entrega em relatorio-consistencia.md; limitações de evidência permanecem explícitas.

Estado: executado para a parte documental, ver relatório; não valida a aplicação.
