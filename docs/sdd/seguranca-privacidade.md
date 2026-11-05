# Segurança e privacidade

## Estado e responsabilidade

Há controles de validação, sessão/CSRF, escopo por usuário, locks e escape em código. Não há auditoria completa de produção nesta entrega, certificação de acessibilidade/segurança, política de retenção aprovada ou trilha completa de auditoria financeira comprovada. A conformidade deve ser sustentada por validação, não pelo nome do framework.

## Autenticação e sessões

Login por e-mail/senha e sessão sob Sanctum. Não registrar senha em log, documentação ou armazenamento local. Hash é responsabilidade do backend; algoritmo efetivo, regras superiores de senha, rotação, tempo da sessão e invalidação das demais sessões após troca dependem de `AuthController`, `ProfileController` e configuração não recuperados integralmente.

A UI de senha exige confirmação, mínimo de 12 caracteres e novo login após sucesso. Alterar e-mail pede senha atual. Verificar implementação correspondente no servidor; validação só no cliente não é suficiente. Cookie Secure/HttpOnly/SameSite, CORS e stateful domains precisam ser checados no deploy, sem presumir valores defaults. Não introduzir JWT/MFA/SSO por associação com projetos distintos.

## Autorização

Escopo pessoal em consultas e mutações, inclusive IDs enviados nos filtros e no JSON da IA. Catálogo de extração é só da conta autenticada. Movimentação de objetivo herda propriedade do objetivo. `user_id` é definido pelo servidor. A configuração de corte é **global** e o código recuperado a permite a usuários autenticados sem papel diferenciado; isso exige entendimento explícito em uso com várias pessoas, não uma alteração silenciosa nesta etapa.

## Entrada, saída e ações destrutivas

- Parametrizar consultas e escapar conteúdo antes de inseri-lo em HTML. Busca literal de descrição escapa curingas.
- Validar type, IDs, enum de ícone, limites monetários e datas no servidor. Verificar catálogo/cores no controller de categorias ainda ausente.
- Resposta JSON da IA não é confiável só por declarar schema; serviço revalida pertencimento, tipo, valores e datas.
- Dados de fala e categorias não podem virar instruções para executar comandos ou acessar informações externas.
- Exclusões e arquivamentos passam por confirmação. Soft delete não equivale a auditoria completa; movimentações de objetivos são fisicamente excluídas após recompor saldo.
- TRUNCATE e seeders são operações administrativas, fora da UX normal, sujeitas a backup e autorização de quem opera o ambiente.

## Mapa de dados e circulação

| Dado | Local/processamento | Persistência conhecida | Lacuna |
|---|---|---|---|
| Nome/e-mail e hash de senha | Laravel/MySQL | Usuário | Política de exclusão/retenção e sessão efetiva |
| Gastos, limites e objetivos | API/MySQL e memória da interface | Entidades de negócio | Expurgo definitivo e auditoria |
| Áudio | Microfone → memória/Blob → upload temporário → OpenRouter/provedor | Sem tabela/arquivo permanente criado pelo serviço | Retenção e processamento pelo serviço externo |
| Transcrição | Resposta de STT → extração → resposta interna | Sem persistência no domínio; pode existir no transporte/memória | Logs de infraestrutura/APM/provedor devem ser auditados |
| Catálogo de categoria | Banco → modelo de extração | Banco próprio e processamento externo | Nomes de categorias podem ser sensíveis; não enviar dados desnecessários |
| Chave da IA | Configuração do PHP | Ambiente seguro do servidor | Rotação/permissão de acesso e limites de gastos |
| Tema e recursos públicos | localStorage/CacheStorage | Dispositivo | Conferir que caches não incluem dados privados |

Ausência de gravação local de áudio não significa “nenhum terceiro retém áudio”. Não prometer anonimato ou eliminação externa sem contrato/política verificados. O aplicativo é pessoal; se aberto a terceiros, definir aviso de privacidade e base de tratamento antes da expansão.

## Microfone e visualização

A captura começa por gesto explícito. Permissão negada deve encerrar o estado busy e explicar o erro. Cancelar, finalizar, sair, fechar popup ou interromper gravação em segundo plano deve liberar MediaStream, AudioContext e quadros de desenho. O analisador não conecta à saída de som, evitando retorno pelo alto-falante.

Backend impõe tamanho/tipo de áudio e throttle; limite de duração existe no cliente, não é proteção suficiente contra chamadas manuais longas. Se necessário para disponibilização pública, aprovação de validação de duração e cotas por usuário deve preceder a implementação. Não salvar secret em VITE_ nem fazer chamadas do browser diretamente com a chave de OpenRouter.

## Segredos e configuração

Documentar **nomes** de variáveis, nunca valores. Não incluir `.env`, dumps com credenciais, contas reais nem áudio pessoal em entregas de documentação. Usar configuração restrita ao servidor e política de rotação que considere vazamento/Git/logs. Em arquivos de exemplo, manter campos de segredo vazios.

O seeder de demonstração usa acesso previsível no código histórico; esta SDD não reproduz a credencial. Antes de exposição pública, decidir remover a conta demo, isolar ambiente de demonstração ou redefinir o acesso. Não executar DatabaseSeeder em produção como parte de deploy, pois chama DemoSeeder.

## Auditoria e logs

Código possui timestamps, algumas exclusões lógicas e request_key/hash em objetivos, mas isso não é ledger de auditoria de “quem mudou o quê”. Não foi identificado serviço completo de auditoria de login/operação financeira. Registro proposto: ação técnica, usuário/ID de correlação quando apropriado, status, duração e código sanitizado, sem conteúdo sensível. Campos, acesso e retenção devem ser aprovados antes de implementação.

Logs Laravel/Nginx/Docker, backups e eventuais ferramentas de terceiros precisam ser incluídos na política de retenção. Evitar dump de request/resposta do provedor em erros de produção. APP_DEBUG deve estar false na publicação; verificar exposição de stack traces.

## Backup, retenção e incidente

Backup inclui banco e configuração necessária à restauração, com criptografia, acesso restrito e cópia fora da VPS como direção da fundação. Frequência, RPO/RTO, destino e testes ainda pendentes de comprovação; ver [operação](operacao-deploy.md).

Em suspeita de vazamento: restringir acesso afetado, preservar evidências sem expandir dados sensíveis, rotacionar segredo comprometido, verificar logs/uso do OpenRouter e restaurar/retomar após diagnóstico. Exigências legais aplicáveis e comunicação a terceiros requerem análise específica, não conclusão jurídica automática nesta SDD.

## Decisões pendentes

[PEND-003](pendencias-riscos.md#pend-003) backup; [PEND-004](pendencias-riscos.md#pend-004) privacidade/retenção; [PEND-005](pendencias-riscos.md#pend-005) demonstração; [PEND-006](pendencias-riscos.md#pend-006) acessibilidade; [PEND-008](pendencias-riscos.md#pend-008) controle de custo/abuso e produção da voz.
