# Contratos e integrações

## Convenções

Base observada no cliente: `/api/v1`. Mesma origem, sessão autenticada, `Accept: application/json`. JSON em cadastros/consultas, multipart no upload de áudio. Antes de mutações, obter cookie CSRF via `GET /sanctum/csrf-cookie` e enviar `X-XSRF-TOKEN` decodificado com credenciais same-origin. Não enviar chave OpenRouter pelo frontend.

Respostas usam Resources/envelopes quando descritos; `/me` retorna objeto direto na rota recuperada. Não assumir envelope único para toda API. Datas `YYYY-MM-DD`, valores `*_cents` inteiros, tipos de lançamento `income`/`expense`. Paginação normalmente default 25 e limite 100 onde verificado; links/meta de Resources podem incluir campos Laravel além dos explicitados.

## API-001

### Autenticação e perfil

| Método/rota | Entrada | Saída/comportamento | Certeza |
|---|---|---|---|
| GET `/sanctum/csrf-cookie` | Cookie/session | Prepara XSRF | Cliente verificado; configuração do middleware a auditar |
| POST `/auth/login` | email, password, remember conforme login | Acesso; throttle 5/min | Rota e campos UI verificados; envelope/status de falha do controller não recuperado |
| POST `/auth/logout` | Sessão + CSRF | Encerra acesso | Rota e fluxo observados; envelope a conferir |
| GET `/me` | Sessão | `{id,name,email}` | Objeto direto verificado |
| PATCH `/me` | name, email, current_password quando e-mail muda | Perfil atualizado | Rota/cliente; throttle 10/min; validação/envelope completos a conferir |
| PUT `/me/password` | current_password, password, password_confirmation | Troca e novo acesso conforme UI | Rota/cliente; throttle 5/min; TTL/invalidação exatos a conferir |

Não há contrato implementado de MFA, SSO, cadastro público ou recuperação de senha comprovada. Controle de sessão segue [seguranca-privacidade.md](seguranca-privacidade.md).

## API-002

### Categorias

`GET /categories`, `POST /categories`, `PATCH /categories/{category}`, `DELETE /categories/{category}`. Rotas autenticadas; ID numérico. Payload lógico de cadastro/edição: name, type, icon, color, is_active quando admitido. Filtros observados na UI: tipo e estado active/inactive/all, paginação.

A fonte do controller/FormRequests de categorias não foi recuperada integralmente. Campos exatos permitidos na atualização, envelope da listagem, unicidade de nome, permissão de mudança de tipo e semântica DELETE vs inativação precisam ser confrontados no checkout. Requisito invariável: não apagar vínculos históricos nem permitir categoria alheia/incompatível. Não inventar uma rota toggle adicional.

## API-003

### Ciclo financeiro

- `GET /financial-cycle?year=2026&month=11`: year/month opcionais, requeridos em conjunto, 1900–2100 e 1–12. Resposta `{data:{configured,version,current,next,pending_cut_day,...}}`; período pode acrescentar calendário de referências. Não configurado: configured=false, current/next nulos.
- `PUT /financial-cycle`: `{cut_day:10,version:0}`; corte 1–31, versão ≥0. Retorna configuração atualizada. Throttle 10/min.
- Versão concorrente falha com 422/errors.cut_day no serviço recuperado. Não padronizar para 409 sem alterar contrato explicitamente.
- Consultas financeiras antes do corte definido: 428 com `{message,code:"CYCLE_SETUP_REQUIRED"}`.

Objeto de ciclo: `{id,year,month,key,start_date,end_date,cut_day}`. Valores current/next podem atravessar mês calendário. Regras completas RN-004 a RN-006.

## API-004

### Lançamentos

| Método/rota | Contrato |
|---|---|
| GET `/transactions` | year/month, range=month/three_months/year, type, category_id, search≤255, unbudgeted, page, per_page 1–100 |
| POST `/transactions` | Criar; retorna Resource com status 201 |
| GET `/transactions/{transaction}` | Resource próprio, 404 se indisponível |
| PATCH `/transactions/{transaction}` | Atualização validada; Resource atualizado |
| DELETE `/transactions/{transaction}` | Exclusão lógica; 204, inclusive se já removido no fluxo recuperado |

Payload de criação:

```json
{
  "type": "expense",
  "category_id": 12,
  "amount_cents": 12590,
  "description": "Compra no supermercado",
  "transaction_date": "2026-11-05",
  "notes": "Compra da semana"
}
```

IDs são ilustrativos e só funcionam com categoria própria real. Campos obrigatórios na criação: type/category_id/amount_cents/description/transaction_date; notes nullable até 2000. Regras de update usam presença condicional e o formulário atual envia o conjunto. Proibidos: user_id, id, timestamps e deleted_at.

Resource: id, category_id, type, amount_cents, description, transaction_date, notes, category, created_at, updated_at; `cycle_key` aparece quando atribuído após gravação. Listagem ordena data/id decrescentes e inclui meta.period. Em unbudgeted, acrescenta total_amount_cents/by_category do conjunto filtrado. `search` usa LIKE escapando !, % e _. `unbudgeted=true` não aceita range ampliado.

Não existe request_key de idempotência neste contrato. Falha de rede depois do POST exige conferir o histórico antes de repetir.

## API-005

### Dashboard e Relatórios

- `GET /dashboard?year=2026&month=11`: ciclo selecionado, totals, latest_transactions, by_category e last_six_months; campos anteriores de comparação podem permanecer por compatibilidade. Validar envelope do controller ao integrar.
- `GET /reports?year=2026&month=11&range=three_months`: range month/three_months/year; retorna `data` com period, period_status, totals, by_category, monthly_series, comparison_series, income_expense_series/income_expense_period, previous_period, changes e insights no serviço recuperado.

Totals: income_cents, expense_cents, result_cents, income_count, expense_count. Categoria agregada: category, amount_cents e transaction_count quando presente. Séries incluem referência e datas do ciclo.

**Compatibilidade:** a UI atual não mostra comparação anterior nem insights removidos; mantê-los na resposta não é defeito por si só. Excluir campos do backend exige analisar consumidores/testes antes de quebrar o contrato. No modo year, totais terminam no ciclo selecionado e income_expense_series inclui os 12 ciclos. Ver RN-019.

## API-006

### Orçamentos

| Método/rota | Entrada/saída |
|---|---|
| GET `/budgets` | year/month, paginação; Resource collection e meta.period/meta.summary |
| POST `/budgets` | category_id, year, month, limit_cents, notes nullable; 201 |
| GET `/budgets/{budget}` | Resource com métricas recalculadas |
| PATCH `/budgets/{budget}` | limit_cents obrigatório, notes opcional/nullable; categoria/year/month proibidos |
| DELETE `/budgets/{budget}` | Exclusão lógica; 204 |
| POST `/budgets/copy` | source_year/source_month e year/month de destino; 201 se todo lote copiado |

Notes até 2000, categoria ativa própria de despesa, limite positivo. Omitir notes numa atualização preserva texto; enviar null limpa. Resource: id/category_id/year/month/financial_cycle_id/limit_cents/notes, category, timestamps e métricas spent_cents, remaining_cents, used_percent, status. Summary inclui budget_count, limit_cents, gasto agregado, total_expense_cents e unbudgeted_expense_cents.

Cópia retorna `{data:{year,month,copied_count,limit_cents,period}}`. Falhas são de validação 422 e não retorno parcial. Não usar a rota antiga `/budgets/{id}/copy`, presente em entrega anterior; o fluxo aprovado atual copia o ciclo completo.

A fórmula das métricas está em RN-011. Faixas numéricas dos status de API BudgetMetrics não foram recuperadas; não confundir com as faixas de cor do donut de RN-012.

## API-007

### Objetivos

| Método/rota | Payload / consulta |
|---|---|
| GET `/goals` | status=active/archived; page/per_page (1–100), default 25 |
| POST `/goals` | name≤80, icon do catálogo, target_cents, deadline presente nullable, request_key UUID |
| GET `/goals/{goal}` | Objetivo próprio |
| PATCH `/goals/{goal}` | name/icon/target_cents/deadline e version≥1 |
| POST `/goals/{goal}/state` | action=archive/complete/reopen, version |
| GET `/goals/{goal}/movements` | page/per_page; data/id decrescentes |
| POST `/goals/{goal}/movements` | type=contribution/withdrawal, amount_cents, movement_date, notes≤1000, version, request_key |
| PATCH `/goals/{goal}/movements/{movement}` | Campos do movimento e version, sem nova request_key obrigatória |
| DELETE `/goals/{goal}/movements/{movement}` | JSON com version; devolve objetivo recalculado |

Retornos de item usam `{data:...}`; criações 201, alterações/estado/exclusão de movimento 200. Listagens têm `{data,meta:{current_page,last_page,total}}` no controller. A lista de movimentos devolve id/type/amount_cents/movement_date/notes. Não há DELETE de objetivo.

Objeto de objetivo: id, name, icon, target_cents, saved_cents, remaining_cents, progress_percent, target_reached, deadline, status, archived_at, completed_at, version, movement_count. Campos de saldo/estado/proprietário são controlados pelo servidor. 409: versão antiga, estado incompatível ou request_key reutilizada com outros dados. 422: saldo fora dos limites ou conclusão antes da meta. Ver RN-015 a RN-018.

## API-008

### Preenchimento por voz

**Rota interna:** `POST /transactions/voice/prepare`, autenticada, throttle 5/min. Multipart com campo `audio`, arquivo até 8192 KiB. Cliente prepara XSRF e envia credenciais same-origin. Não definir Content-Type manualmente para multipart: o navegador inclui o boundary.

MIME detectado aceito: audio/webm, video/webm, audio/ogg, application/ogg, audio/mp4, video/mp4, audio/x-m4a, audio/mpeg, audio/wav, audio/x-wav, audio/aac; mapeados a formato do provedor. Cliente negocia WebM/Opus, MP4 ou Ogg conforme MediaRecorder. A aceitação efetiva de codec pelo provedor deve ser validada nos aparelhos.

Resposta ilustrativa:

```json
{
  "data": {
    "transcript": "Gastei dez reais no supermercado; na observação coloque compra da semana",
    "draft": {
      "type": "expense",
      "description": "Supermercado",
      "category_id": 12,
      "amount_cents": 1000,
      "transaction_date": "2026-11-05",
      "notes": "compra da semana"
    }
  }
}
```

É um rascunho, não um registro salvo. Todos os campos podem ser null quando não identificados, observadas validações; o backend recusa resposta estrutural/semanticamente inválida. A transcrição continua no contrato, mas não há link Ver transcrição na UI. Notes null preserva texto existente.

**Integração externa atual:**

1. Laravel → `https://openrouter.ai/api/v1/audio/transcriptions`: modelo `openai/whisper-large-v3` por padrão, input_audio com bytes base64/format, language=pt, temperature=0, response_format=json. Receber text não vazio e até 6000 caracteres para a etapa seguinte.
2. Laravel → `https://openrouter.ai/api/v1/chat/completions`: modelo `google/gemini-2.5-flash-lite`, temperature=0, max_tokens=1500, require_parameters=true e JSON Schema strict. Prompt informa today/timezone/catálogo ativo próprio/transcrição. Schema exige is_single_transaction, type, description, notes, category_id, amount_cents e transaction_date; additionalProperties=false. is_single_transaction não integra draft final.
3. Validar e devolver rascunho; o POST normal de lançamento ocorre só ao salvar no formulário.

Chave: `OPENROUTER_API_KEY` no backend. Modelos: `OPENROUTER_TRANSCRIPTION_MODEL` e `OPENROUTER_EXTRACTION_MODEL`. Flag `TRANSACTION_VOICE_ENABLED` default false. Sem chave/flag: 503; a UI não possui capability endpoint comprovado para ocultar automaticamente o botão por configuração.

Timeout externo: conexão 10 s, chamada 40 s por etapa; cliente aborta em 95 s. Não há retry automático indiscriminado para evitar cobrança/repetição. Alinhar limites do PHP/Nginx à operação síncrona; a instalação efetiva é pendente de conferência. Cancelar no frontend impede aplicar resultado, mas não garante cancelar uma chamada externa já recebida pelo provedor.

## API-009

### Falhas e recuperação

| Código/caso | Tratamento esperado |
|---|---|
| 401 | Sessão expirada, retorno ao fluxo de acesso; na voz pode avisar antes de redirecionar. |
| 419 | Falha/expiração CSRF; renovar fluxo de sessão ou recarregar, sem replay cego. |
| 422 | `{message,errors}` de validação; apontar campos ou modal de áudio; não declarar sucesso. |
| 404 | Recurso inexistente/alheio ou removido; atualizar listagem/contexto. |
| 409 | Conflito em objetivos; carregar versão atual. Não confundir com 422 da configuração de corte. |
| 428 | CYCLE_SETUP_REQUIRED; abrir definição do ciclo. |
| 429 | Rate limit local ou provedor; aguardar e tentar de novo por ação do usuário. |
| 502 | Voz: provedor não bem-sucedido ou JSON/dados inválidos; mensagem sanitizada. |
| 503 | Voz desativada/sem chave; configurar backend ou usar manualmente. |
| 504 | Falha de conexão/timeout da chamada externa na voz; permitir nova tentativa. |
| Rede/abort | Não salvar nem aplicar resposta tardia; preservar formulário e liberar recursos. |

Corpos brutos de provedor, senhas e tokens não aparecem em mensagens. Erros de contrato não são resolvidos inventando dados faltantes.

## API-010

### Saúde, build e extensões

`GET /up` é a rota de saúde Laravel informada. Checar exatamente o que ela cobre no ambiente; não equivale a teste de toda integração externa. Assets e manifest não são APIs financeiras.

CSV (RF-034) ainda não tem endpoint, MIME, campos ou limites definidos. Recorrência/análise IA não possuem contrato aprovado. Pluggy e conciliação não são integrações vigentes; não reutilizar suas rotas ou secrets.

Endereços externos acima são destinos técnicos documentados; não registram credenciais. Conferir [operação](operacao-deploy.md) e [privacidade](seguranca-privacidade.md).
