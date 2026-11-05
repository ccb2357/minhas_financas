# Jornadas de usuários

As regras detalhadas ficam em [regras-negocio.md](regras-negocio.md). As telas e estados estão em [telas-ux.md](telas-ux.md).

## JOR-001 — Primeiro acesso e corte

RF-001/RF-010. Usuário provisionado acessa Login, informa credenciais e entra. Workspace consulta configuração; se não houver corte, mostra Definir ciclo em vez de totais fictícios. Usuário escolhe 1–31, salva com versão e passa ao resumo do ciclo.

**Alternativas:** senha inválida permanece no login; falha de rede oferece recuperação. HTTP 428 não encerra sessão: direciona configuração. Se outra sessão definiu o corte, reabrir e carregar a versão atual. Não criar novo usuário público para contornar erro de login.

## JOR-002 — Registrar gasto manual

RF-006/RF-032. Tocar no + central, abrir no topo, selecionar Saída, informar valor, descrição, categoria e data; observação é livre. Conferir e salvar. Evento de lançamento atualiza as áreas dependentes; data fora do ciclo selecionado pode exigir abrir o ciclo correspondente informado pela API.

**Alternativas:** campo ausente indica erro junto ao campo; não fechar. Categoria sem opção exige criar categoria em sua área. Sair com alterações pede descartar; cancelar esse diálogo mantém o preenchimento. Em falha de rede, conferir o histórico antes de reenviar, pois POST de lançamento não possui garantia de idempotência igual à de objetivos.

## JOR-003 — Registrar por voz

RF-027/RF-028/RF-029. Em Novo lançamento, tocar microfone pequeno. Abre overlay branco; após permissão, cronômetro e barras reais acompanham a captura. Falar uma movimentação, por exemplo: “Gastei 10 reais no supermercado Munhoz; na observação coloque compra para o churrasco”. Tocar no círculo central; aguardar transcrição/JSON. Overlay fecha e formulário é preenchido. Conferir e salvar manualmente.

**Alternativas:** X cancela e não aplica resposta; sair da tela cancela captura. Permissão negada, falta de suporte, timeout, falta de configuração ou retorno inválido abre modal explicativo. Campo ambíguo pede completar. Se notes não foi ditado, preservar texto previamente escrito. Não há link Ver transcrição. Editar lançamento não oferece voz.

## JOR-004 — Investigar uma categoria

RF-013/RF-009. Tocar categoria do ranking da Dashboard ou Relatórios. Histórico abre com Saídas e a categoria, preservando todo o recorte da origem. Conferir valores, abrir um lançamento, editar e salvar; recalcular o recorte. Ao voltar pelo navegador, menu e período refletem a tela real.

**Alternativas:** categoria histórica inativa continua nomeada. Demais categorias não abre um filtro impossível. Lista vazia mostra vazio; erro de consulta oferece tentar novamente sem perder contexto.

## JOR-005 — Planejar e copiar orçamento

RF-014 a RF-017. Abrir Orçamento, escolher ciclo, cadastrar categoria/limite/observação. Conforme despesas entram, acompanhar gasto e excedente. Sem orçamento abre a lista específica. Copiar escolhe destino com datas completas, confirma e retorna ao orçamento do destino conforme fluxo existente.

**Alternativas:** duplicação/confecção inválida bloqueia salvar. Cópia com qualquer conflito/inatividade deve falhar integralmente, orientando revisar destino/origem. Não remover limites existentes para forçar a cópia sem decisão do usuário. Observação editável em ambos os modos e copiada com o limite.

## JOR-006 — Guardar dinheiro para um objetivo

RF-018 a RF-020. Criar objetivo com meta, nome e ícone, e prazo se desejado. Abrir detalhes, Guardar valor, informar data/valor/observação e salvar. Registrar retirada quando apropriado. Corrigir erro pela edição/exclusão da movimentação, não por ajuste direto do saldo.

**Alternativas:** saldo negativo/excesso bloqueia operação. 409 pede recarregar por concorrência, sem reaplicar cegamente. Guardar ou retirar não afeta resultado do ciclo. Meta atingida permite Concluir explicitamente; arquivar antes da meta preserva tudo; reabrir volta aos ativos.

## JOR-007 — Consultar Relatórios

RF-021 a RF-023. Escolher ciclo e alternar Ciclo/3 ciclos/Ano de ciclos. Ver totais e resultado de largura total, depois ranking e barras. No ano, ler o recorte dos totais separado do recorte de 12 ciclos do gráfico.

**Alternativas:** dados vazios mostram zero e vazio, sem percentuais indefinidos apresentados como melhora/piora. Falha não reutiliza resultados de período anterior como se fossem atuais. Não procurar cartões Maior gasto/Categoria mais usada: foram removidos.

## JOR-008 — Mudar a data de corte

RF-011. Mais → Ciclo financeiro. Ler atual/próximo/agendado, escolher novo dia e salvar versão atual. Conferir datas de transição. A mudança afeta todos os usuários no calendário global, sem compartilhar seus dados.

**Alternativas:** conflito de versão retorna 422 em cut_day; reabrir. Ciclos atuais/anteriores não são corrigidos retroativamente por essa ação. Se a intenção for corte individual, registrar proposta antes de implementar.

## JOR-009 — Perfil, senha e sessão

RF-002/RF-003/RF-024. Mais permite editar perfil, confirmar senha para mudar e-mail, trocar senha com confirmação e alternar tema. Troca de senha concluída exige novo login conforme UI. Sair encerra sessão e limpa a área autenticada.

**Alternativas:** 401 durante operações fecha o fluxo sensível e pede novo acesso. Campos de senha são apagados do DOM ao fechar. Preferência de tema é do aparelho e não muda dados financeiros.

## JOR-010 — PWA, atualização e conexão

RF-025/RF-026/RF-033. Instalar via ação disponível; continuar usando pelo navegador também é válido. Nova publicação gera versão de recursos. Atualização deve respeitar formulário em edição. Sem rede, apresentar estado/tela de indisponibilidade e permitir tentar novamente quando voltar.

**Alternativas:** janela antiga em segundo plano pode ainda executar JS anterior, mesmo com SW novo; recarregar com cuidado com rascunhos, sem recomendar limpeza indiscriminada dos dados. Não afirmar que a gravação/lançamento foi salvo offline.
