# Histórico da documentação SDD

Este histórico é da documentação, não lista de releases da aplicação. Datas em ISO, referências por ID e mudanças de estado explícitas. Registrar o que mudou e o motivo; não inserir segredos ou conversas pessoais.

## 2026-11-05 — Linha de base documental 0.1

- Consolidados documentos históricos, código de entregas recuperadas e decisões da conversa, com precedência e limites em fontes-e-status.md.
- Criadas visão/escopo, 36 requisitos funcionais, 15 não funcionais e 33 regras de negócio.
- Inventariadas 25 telas/componentes e 12 entidades/estruturas, incluindo dados efêmeros da voz e cache/localStorage, sem inventar tabelas.
- Documentados contratos, arquitetura, segurança, operação, oito ADRs retrospectivos, tarefas e cenários vinculados.
- Preservadas alterações de Dashboard, Orçamentos, Relatórios, formulários, seletores e voz pelo OpenRouter; integração bancária permanece removida.
- Registradas lacunas de checkout/instalação e decisões de operação/privacidade; código da aplicação não alterado.
- Validação de integridade documental registrada em relatorio-consistencia.md. Cenários funcionais da instalação não executados nesta etapa.

## Como registrar mudanças futuras

Adicionar nova data no topo. Informar RF/RN/TELA/API/ADR afetados, mudança de estado, motivação e evidência. Ao substituir decisão, manter registro anterior e linkar o sucessor. Uma proposta aprovada vira “aprovado para implementação”; só vira “implementado” após evidência de código e entrega. Registrar validação separadamente com versão/ambiente.
