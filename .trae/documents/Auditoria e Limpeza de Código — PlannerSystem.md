## Objetivo
- Remover código inutilizável, duplicado e desnecessário, mantendo 100% de estabilidade.
- Tornar o código mais seguro e consistente com os princípios SoC/SSOT/DRY/KISS/YAGNI.

## Achados-Chave
- Logs dispersos com `console.log` em múltiplos arquivos, apesar de existir `src/utils/logger.ts` (ex.: `src/services/notificationService.ts:61`, `src/contexts/AuthContext.tsx:212`, vários hooks de realtime).
- CSS com duplicação e regras potencialmente perigosas:
  - Variáveis duplicadas em `src/index.css:6–33` e `src/index.css:304–355`.
  - Bloco massivo anti-"Lovable" que pode ocultar UI indevidamente (`src/index.css:711–851`). O próprio app já comentou problemas similares em `src/App.tsx:55`.
- Contexto duplicado: `DataContext` e `EnhancedDataContext`.
  - `EnhancedDataProvider` é o contexto efetivo usado (`src/App.tsx:254`).
  - `DataContext` não é usado como provider; apenas seus tipos são importados por `src/components/payroll/EventSelector.tsx:10`.
- Páginas aparentemente não referenciadas:
  - `src/pages/Index.tsx` (não há referências)
  - `src/pages/LazyRoutes.tsx` (exports não utilizados)
- Manifests duplicados: `public/site.webmanifest` e `public/icons/site.webmanifest` não são usados; o app usa `public/manifest.json` (`index.html:7`).
- Configuração Supabase com chave e URL hardcoded (`src/integrations/supabase/client.ts:5–6`) apesar de existir `.env` com VITE_*; falta `/.env` no `.gitignore`.
- ESLint desativa `@typescript-eslint/no-unused-vars` (`eslint.config.js:26`), o que esconde código não utilizado.
- Uso extensivo de `any` em serviços e queries (ex.: `src/services/paymentForecastService.ts:35–39, 89, 152`; diversas `hooks/queries/*`).

## Plano de Limpeza (Incremental e Seguro)
### Fase 1: Infra de verificação
- Ativar verificação local: executar testes (`npm test`) e checagem de tipos (`tsc --noEmit`) para baseline.
- Habilitar ESLint para detectar lixo de forma controlada:
  - Ajustar `eslint.config.js` para ligar `@typescript-eslint/no-unused-vars` com `argsIgnorePattern: "^_"` e `varsIgnorePattern: "^_"`.
- Não alterar comportamento de runtime nesta fase; apenas medir impacto.

### Fase 2: Logs e Segurança
- Substituir `console.log`/`console.warn`/`console.error` por `logger` de `src/utils/logger.ts` onde for log de depuração (mantendo mensagens de erro críticas).
  - Prioridade: serviços (`src/services/*`) e hooks realtime (`src/hooks/queries/*`).
- Unificar `Supabase` para ler de env:
  - Atualizar `src/integrations/supabase/client.ts` para usar `import.meta.env.VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, com fallback seguro.
  - Adicionar `/.env` ao `.gitignore`; manter apenas chaves públicas (VAPID/Supabase anon).

### Fase 3: CSS e Estilo
- Consolidar variáveis em `src/index.css` removendo duplicações; manter o design system único.
- Isolar/remover o bloco anti-"Lovable" de `src/index.css:711–851` que pode ocultar UI; se necessário, mover para um arquivo dev-only ou atrás de uma classe guarda.
- Validar impressão: `src/print.css` permanece; garantir que import em `src/index.css:111` continue ok.

### Fase 4: Contextos e Tipos
- Atualizar usos de tipos para `src/contexts/data/types.ts` (ex.: refatorar `src/components/payroll/EventSelector.tsx:10`).
- Após a migração dos imports de tipos, remover `DataContext.tsx` e `dataService.ts` se nenhum uso restante; manter `dataFetcher.ts` (é usado em `ManageEvents.tsx:17`).

### Fase 5: Remoção de Arquivos Mortos
- Remover `src/pages/Index.tsx` e `src/pages/LazyRoutes.tsx` (não referenciados).
- Remover `public/site.webmanifest` e `public/icons/site.webmanifest`; manter apenas `manifest.json`.

### Fase 6: Tipos e DRY
- Reduzir `any` prioritariamente em:
  - `src/services/paymentForecastService.ts` (tipar coleções e retornos)
  - Queries de folha/pagamentos com mapeamentos conhecidos (`hooks/queries/*`).
- Evitar duplicação entre utils similares (ex.: normalizações repetidas de datas/formatadores) usando `src/utils/dateUtils.ts` e `src/utils/formatters.ts`.

## Validação e Estabilidade
- Testes: rodar `npm test` a cada fase; corrigir quebras antes de seguir.
- Build: rodar `npm run build` para garantir tipos/árvore de dependências saudáveis.
- Smoke manual em `npm run dev` (localhost preferencialmente `8080`) cobrindo:
  - Login, Dashboard, Eventos (CRUD), Folha (visualização/impressão), Assinaturas.
- A/B de impressão: validar páginas com `.print-section` mantendo layout A4 (ex.: `PayrollReportPage`).

## Entregáveis
- Código mais limpo (sem logs dispersos e duplicações CSS).
- Contextos unificados e tipos mais seguros.
- Remoção de arquivos e manifests não utilizados.
- Supabase com configuração centralizada via env.

## Observações
- Todas as mudanças seguem SoC/SSOT/DRY; sem alterações de comportamento funcional.
- Caso algum item seja crítico para operação (ex.: rotas de debug), podemos apenas esconder por flag de ambiente.

Confirma seguir com esta limpeza incremental?