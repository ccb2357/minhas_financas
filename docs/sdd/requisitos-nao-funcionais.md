# Requisitos não funcionais

Cada item identifica a evidência existente e o critério verificável. Metas numéricas não aprovadas continuam pendentes. RNFs que exigem decisões não autorizam correções de código nesta etapa.

## RNF-001

**Precisão e consistência financeira. Estado: Implementado; C.**

Centavos inteiros, agregações por usuário e ciclos conforme RN-002/RN-004/RN-007.

**Verificação:** Comparar API, banco e telas na mesma massa; diferença monetária aceitável: zero centavo. Não calcular totais de uma página como total do período.

## RNF-002

**Desempenho de consultas e gráficos. Estado: Implementado parcialmente; C.**

Agregações no backend e paginação reduzem tráfego; gráficos carregados sob demanda.

**Verificação:** Medir tempo e volume usando demonstração de 24 ciclos, conferir que totais não carregam cada transação para o frontend. P95, usuários concorrentes e orçamento de bundle não foram aprovados; registrar medições antes de estabelecer limite.

## RNF-003

**Autorização e isolamento. Estado: Implementado; C.**

Escopo por usuário em categorias, lançamentos, orçamentos, objetivos e catálogo enviado à IA.

**Verificação:** Para dois usuários, executar consulta/edição/exclusão/vínculo cruzado e obter zero divulgação ou alteração alheia. Corte global é a exceção funcional explícita, não falha de filtro.

## RNF-004

**Sessões e segredos. Estado: Implementado parcialmente; C/R.**

Login com sessão/Sanctum e CSRF; segredo OpenRouter só no PHP.

**Verificação:** Verificar ausência de segredos em dist, Git, localStorage e respostas de erro. Conferir expiração, rotação, cookies Secure/HttpOnly/SameSite e invalidação após troca de senha no ambiente; valores efetivos de TTL ainda pendentes.

## RNF-005

**Segurança de entradas. Estado: Implementado parcialmente; C.**

FormRequests, validação semântica após IA, escape na UI e consulta parametrizada.

**Verificação:** Recusar tipos errados, números negativos/decimais em centavos, data inválida, categoria alheia, texto longo e payload de script. Upload não é executável e fica limitado a 8 MiB na aplicação.

## RNF-006

**Privacidade da voz. Estado: Implementado parcialmente; C.**

Áudio enviado por ação explícita ao backend e serviços de IA; catálogo mínimo de categorias; sem persistência de áudio/transcrição no domínio.

**Verificação:** Conferir que gravação não inicia ao abrir tela, tracks param após sair/cancelar e logs não recebem corpo/chave. Retenção pelo provedor, termos e eventual consentimento de terceiros ainda exigem definição.

## RNF-007

**Acessibilidade. Estado: Pendente de validação integral.**

Labels, aria-live, aria-busy, diálogos e respeito a redução de movimento aparecem no código. Remoção de contornos azuis foi aprovada.

**Verificação:** Testar teclado e leitor de tela; foco deve permanecer localizável e no modal correto. Definir alternativa visual de foco sem alterar a direção editorial por conta própria. Não declarar WCAG AA certificada sem auditoria.

## RNF-008

**Responsividade. Estado: Implementado; C/R.**

Experiência mobile com cartões, modais e área segura; valores longos precisam caber.

**Verificação:** Conferir 320, 390, 760 px, orientação horizontal, teclado virtual e fonte ampliada. Nenhum comando primário inacessível atrás da barra inferior ou do microfone; não truncar silenciosamente valores negativos.

## RNF-009

**Compatibilidade de gravação. Estado: Implementado parcialmente; C.**

Usa getUserMedia, MediaRecorder, AudioContext/webkitAudioContext, canvas e HTTPS/localhost.

**Verificação:** Testar Android real e Safari/iOS antes de afirmar suporte uniforme. Navegador sem suporte deve abrir modal informativo e preservar cadastro manual. Lista exata de versões mínimas é pendente.

## RNF-010

**Confiabilidade de operações. Estado: Implementado parcialmente; C.**

Estados busy e proteção contra resposta tardia; transações/locks; idempotência explícita em objetivos.

**Verificação:** Simular clique repetido, rede interrompida, 409 e retorno fora de ordem. Nenhum replay automático de lançamento manual ou salvamento por voz. Não alegar idempotência global em POST /transactions.

## RNF-011

**Disponibilidade e recuperação. Estado: Pendente de definição operacional.**

Aplicação publicada em VPS com TLS informado; SLA/RPO/RTO e rotina de backup não comprovados.

**Verificação:** Definir responsáveis e executar restauração isolada com conferência de saldos e amostras. Proposta de monitorar /up não equivale a monitoramento instalado.

## RNF-012

**Manutenibilidade e compatibilidade de stack. Estado: Implementado parcialmente; C/R.**

Framework7 Core JS/Vite/ECharts e API Laravel/MySQL; modularização por domínio.

**Verificação:** Não introduzir React/TypeScript ou trocar bibliotecas sem ADR aprovada; revisar contrato ao alterar payload. Registrar versões reais dos lockfiles no primeiro checkout integral.

## RNF-013

**PWA/cache. Estado: Implementado parcialmente; C/R.**

Build gera hashes dos recursos estáticos; atualização e offline têm UX própria.

**Verificação:** Checar mf-build e sw.js, cache de fonte, limpeza de versões e preservação de formulários; verificar que /api e /sanctum não são persistidos como recursos privados no SW efetivo.

## RNF-014

**Observabilidade. Estado: Pendente de consolidação.**

Logs Laravel/Nginx/Docker estão disponíveis conforme infraestrutura; não há auditoria financeira completa comprovada.

**Verificação:** Diagnosticar endpoint/status/duração sem conteúdo de áudio, transcrição, senha ou chave. Política de retenção de logs, correlação e alertas deve ser aprovada antes da implementação.

## RNF-015

**Portabilidade do conhecimento. Estado: Aprovado para implementação; entrega documental atual.**

Especificações em Markdown com IDs estáveis, links relativos, ADRs, contratos e rastreabilidade.

**Verificação:** Nenhum link interno quebrado, requisito sem tarefa/validação ou ciclo de dependências. Mudança de código deve avaliar impacto documental; entregas documentais não alteram aplicação.

Ver [plano-validacao.md](plano-validacao.md), [seguranca-privacidade.md](seguranca-privacidade.md) e [pendencias-riscos.md](pendencias-riscos.md).
