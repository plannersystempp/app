## Objetivo
Garantir funcionamento consistente em iPhones, iPads e MacBooks (Safari/WebKit) cobrindo PWA, viewport, safe-area, gestos de toque, uploads de arquivo, cache/Service Worker e notificações.

## Diagnóstico e Matriz de Teste
- Mapear versões alvo: iOS 14–18, iPadOS, macOS Safari atual.
- Executar emulators e WebKit via Playwright/WebKit; validar páginas críticas, modais (Radix), navegação bottom, formulários e uploads.
- Levantar ocorrências de `100vh`, `position: fixed`, áreas de scroll e inputs de arquivo.

## Correções de Viewport e Safe-Area
- Corrigir bloco inválido de CSS iOS PWA em `src/index.css:785–805` que mistura seletor e `@media` (separar regras, garantir aplicação em PWA e não-PWA).
- Trocar usos de `100vh` por `100svh`/`100dvh` com fallback:
  - `[data-radix-dialog-content]` em `src/index.css:781` → `calc(100svh - env(...))`.
  - Container raiz PWA: `min-height: 100dvh` com fallback `min-height: -webkit-fill-available` apenas sob `@supports (-webkit-touch-callout: none)`.
- Padronizar utilitários de safe-area (`.safe-area-inset-bottom`, `.safe-bottom`) e revisar componentes com barra fixa (bottom navs) para usar os utilitários.

## Gestos de Toque e Scroll
- Garantir `touch-action: manipulation` onde há cliques/gestos; já presente em `src/index.css:765–769`, revisar componentes interativos.
- Assegurar listeners `passive: true` para `scroll`/`touchmove` quando não houver `preventDefault`; auditar hooks como `src/hooks/useScrollNavigation.ts`.
- Aplicar `-webkit-overflow-scrolling: touch` em áreas de scroll (já configurado) e `overscroll-behavior` para evitar bounce indesejado.

## Upload de Arquivo (Câmera iOS)
- Ajustar input de foto em `src/components/personnel/PersonnelPhotoUpload.tsx:357–364`/`404–411`:
  - Detectar iOS Safari e adicionar `capture="environment"`/`accept="image/*"` para abrir câmera nativamente.
  - Manter fallback sem `capture` para outros navegadores.

## PWA e Service Worker
- Validar registro de SW:
  - Hoje só registra em PWA (`src/hooks/usePWA.ts:41–67`). Avaliar registro também fora de PWA para cache de assets em Safari, mantendo lógica de atualização.
- Revisar `public/sw.js` para compatibilidade iOS:
  - Confirmar uso seguro de `navigator.userAgent` no escopo SW.
  - Manter estratégia network-first para HTML e TTL curto para Supabase em iOS.

## Notificações no iOS
- Documentar e tratar limitações: Push disponível apenas iOS ≥16.4.
- Em `src/hooks/useNotifications.ts`, proteger chamadas a `pushManager` com detecção de suporte e fallback de UI.

## Testes Automatizados (TDD)
- Adicionar Playwright com WebKit para cenários:
  - Verificar que modais e páginas usam `100svh/100dvh` sem recortes em iOS.
  - Validar que bottom nav respeita `env(safe-area-inset-bottom)` e não sobrepõe conteúdo.
  - Testar upload de foto com input `capture` em iOS simulado.
- Complementar com testes unitários dos utilitários de detecção (isIOSSafari) e hooks de viewport.

## Observabilidade e Documentação
- Adicionar logs suaves (não sensíveis) em falhas de SW/instalação PWA no Safari.
- Documentar comportamento esperado no README (instalação em iOS, limitações de push, limpeza de cache via botão de emergência).

## Entregáveis
- Patches em `src/index.css` e componentes afetados.
- Utilitário `isIOSSafari()` e uso nos inputs de arquivo.
- Ajustes opcionais no registro de SW.
- Suite Playwright/WebKit para regressão de compatibilidade.

## Verificação
- Rodar em localhost na porta `8080` e abrir Preview.
- Executar bateria de testes WebKit e revisão visual em iPhone/iPad/macOS Safari.
