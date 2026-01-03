## Diagnóstico

* Há mistura de `console.*` com o utilitário central `src/utils/logger.ts` (apenas DEV) em componentes e hooks.

* O `Dashboard.tsx` loga renderizações e estados repetidamente (linhas \~39 e \~137), gerando ruído.

* Hooks de realtime logam muito via `console.log` (status, invalidations, cache), além de alguns `logger.realtime.*`.

* O utilitário de logs já fornece módulos: `Realtime`, `Query`, `Cache`, `Validation`, `Personnel` (src/utils/logger.ts:81–198), com níveis `info|warn|error|debug` (src/utils/logger.ts:12,22–48) e gate por ambiente (`import.meta.env.DEV`, src/utils/logger.ts:10,22–24).

## Padrão de Logs (proposto)

* Produção: apenas `error`.

* Desenvolvimento:

  * `info` para eventos importantes (conectado, subscrito, carregamento concluído).

  * `debug` para detalhes (mudanças realtime, invalidation de cache, métricas).

  * `warn` para validações suspeitas.

  * `error` para falhas.

* Usar exclusivamente `src/utils/logger.ts` e remover `console.*` dos fluxos principais.

* UI deve ser “silenciosa”: sem logs de render ciclo; logar apenas marcos (dados carregados) ou erros.

## Alterações por arquivo

* `src/components/Dashboard.tsx`:

  * Remover `console.log('🏠 Dashboard: Iniciando renderização')` (\~39).

  * Substituir `console.log('🏠 Dashboard: Dados carregados', {...})` (\~137) por `logger.query.success('dashboardSummary', counts)`.

  * Substituir `console.error(...)` por `logger.query.error('dashboardSummary', error)`.

  * Mover o log de “dados carregados” para um `useEffect` dependente dos counts, evitando logs em cada render.

* `src/hooks/queries/useRealtimeSync.ts`:

  * Trocar `console.log('[RealtimeSync] All realtime subscriptions active...')` por `logger.realtime.info('SUBSCRIPTIONS_ACTIVE')`.

* Hooks realtime (`usePersonnelRealtime.ts`, `useEventsRealtime.ts`, `useAllocationsRealtime.ts`, `useDivisionsRealtime.ts`, `useWorkLogsRealtime.ts`, `useFunctionsRealtime.ts`, `usePersonnelPaymentsRealtime.ts`, `useAbsencesRealtime.ts`):

  * Remover `console.log` de: connecting, change detected, invalidations, status, unsubscribing.

  * Manter/usar:

    * `logger.realtime.connected()` ao criar canal.

    * `logger.realtime.info('SUBSCRIBED')` ao confirmar assinatura.

    * `logger.realtime.change(eventType, { id })` para mudanças (nível `debug`).

    * `logger.cache.invalidate(queryKey)` para invalidations.

    * `logger.realtime.error('CHANNEL_ERROR')` e `logger.realtime.error('SUBSCRIPTION_TIMEOUT')` para erros.

* `src/context/EnhancedDataContext.tsx` (ou caminho equivalente onde aparecem mensagens "Work records loaded" e "Data initialization completed"):

  * Substituir contagens por `logger.query.success('<entity>', count)` e etapa concluída por `logger.query.info('INIT_COMPLETED')`.

* `src/utils/eventStatusCache.ts`:

  * Trocar `console.log('[EventStatusCache] Retornando dados do cache')` por `logger.cache.hit('<eventStatusCache>')`.

* `src/utils/logger.ts`:

  * Opcional: adicionar um módulo `ui` com ações `RENDER`, `LOADED`, `ERROR` para casos pontuais de UI.

  * Alternativa: exportar um `getLogger(moduleName)` para permitir usar `createModuleLogger` em páginas sem duplicar padrões.

## Verificação

* Rodar em DEV e validar que:

  * `Dashboard` gera apenas 1 log `info` ao carregar dados (mudanças de contagem geram novo log, render pura não).

  * Hooks realtime: ver apenas `info` de conexão/inscrição e `debug` em mudanças; invalidations aparecem como `Cache:INVALIDATE` (debug).

  * Erros continuam visíveis como `error`.

* Rodar em PROD (simular `import.meta.env.DEV=false`) e verificar ausência de logs exceto erros.

## Observações

* A solução respeita SoC: lógica de logs centralizada em `services/hooks/utils`; UI sem ruído.

* Mantém SSOT e DRY: usa `logger.ts` como

