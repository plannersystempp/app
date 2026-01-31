## [2026-01-31] - fix: Sistema Global de Responsividade (Gutters + Orientação + Sem Overflow)
 - Mudanças:
   - `src/index.css`:
     - Criado `--ps-gutter` com `clamp()` (usa `vw`) e regras por breakpoint + orientação (portrait/landscape).
     - Criada classe utilitária global `ps-container` aplicando padding com `safe-area-inset-*`.
   - `src/components/Layout.tsx`:
     - Header e wrapper principal passam a usar `ps-container` para padronizar margens responsivas em toda a app.
   - `src/components/events/EventDetail.tsx`:
     - Adequado para usar gutters globais e tabs sem necessidade de scroll horizontal.
   - `src/components/events/EventDailyAttendance.tsx`:
     - Removido overflow horizontal (table/grid ajustados para `table-fixed`, paddings responsivos e quebra de texto).
   - `playwright.config.ts` + `tests/responsividade-sem-scroll-horizontal.spec.ts`:
     - Adicionados cenários de teste cobrindo smartphone/tablet em portrait/landscape e múltiplos browsers (Chromium/WebKit/Firefox).
 - Arquivos:
   - `src/index.css`
   - `src/components/Layout.tsx`
   - `src/components/events/EventDetail.tsx`
   - `src/components/events/EventDailyAttendance.tsx`
   - `playwright.config.ts`
   - `tests/responsividade-sem-scroll-horizontal.spec.ts`
 - Impacto:
   - Padroniza margens com unidades relativas e reduz risco de cortes/overflow horizontal, com validação automatizada em viewports-chave.

## [2026-01-31] - fix: Layout Fluido e Correções de Truncamento (iPhone SE)
 - Mudanças:
   - `EventDetail.tsx`:
     - Reduzido padding lateral global de `px-4` para `px-2` em mobile para ganhar espaço horizontal.
     - Implementado wrapper com `inline-block max-w-full` na descrição do evento para forçar quebra de linha.
     - Reduzido gap dos cards de métricas para `gap-2`.
     - Adicionado altura mínima (`min-h-[2.5em]`) no label "Data Pagamento" para permitir quebra de linha sem desalinhamento.
     - Ajustado alinhamento do ícone `Wallet` para `mb-auto` para não centralizar verticalmente quando o texto quebra.
 - Arquivos:
   - `src/components/events/EventDetail.tsx`
 - Impacto:
   - Resolve definitivamente o corte de textos ("Sobre o evento", "DATA PAGAMENTO") em telas de 320px (iPhone SE), aproveitando cada pixel horizontal disponível.

## [2026-01-31] - fix: Refinamento Final de Layout Mobile (Header e Métricas)
 - Mudanças:
   - `EventDetail.tsx`:
     - Header: Removido `h-14` fixo para `min-h-14 h-auto py-2` (permite crescimento vertical).
     - Header: Substituído `truncate` por `break-words` no título do evento.
     - Header: StatusBadge agora usa `size="sm"` nativo e layout flex coluna em mobile para economizar largura.
     - Métricas: Removido `truncate` de TODOS os labels (Pessoal, Divisões, etc.), aplicando `whitespace-normal break-words`.
     - Métricas: Valores numéricos com `break-all` para evitar estouro de container.
     - Tabs: Reduzido `gap-6` para `gap-2` em mobile na lista de abas.
 - Arquivos:
   - `src/components/events/EventDetail.tsx`
 - Impacto:
   - Elimina qualquer possibilidade de texto cortado no cabeçalho e cards de métricas, permitindo que o conteúdo flua verticalmente conforme necessário em telas estreitas.

## [2026-01-31] - fix: Correção Definitiva de Sobreposição e Cortes Mobile
 - Mudanças:
   - `EventDetail.tsx`:
     - "Sobre o evento": Alterado display para `block sm:inline` removendo restrições de flex que causavam truncamento (ellipsis).
     - Tabs: Adicionado `pr-4` para garantir área de scroll visível ao final.
   - `PWAManager.tsx`:
     - Botão "Instalar App" movido para `bottom-20` para não sobrepor a barra de navegação inferior.
   - `AllocationManager.tsx`:
     - Botão "Adicionar Alocação" transformado em Floating Action Button (FAB) `bottom-32` em mobile (ícone apenas), evitando quebra de layout na seção de alocações.
 - Arquivos:
   - `src/components/events/EventDetail.tsx`
   - `src/components/shared/PWAManager.tsx`
   - `src/components/events/AllocationManager.tsx`
 - Impacto:
   - Resolve conflitos de Z-Index e sobreposição na parte inferior da tela e garante que textos longos de descrição quebrem linha corretamente em qualquer viewport.

## [2026-01-31] - fix: Ajuste de Margens e Drag-and-Drop Touch
 - Mudanças:
   - `EventDetail.tsx`:
     - Aumentado padding lateral para `px-4` (padrão seguro) em mobile para evitar conteúdo colado nas bordas.
     - Refinado padding interno dos cards de métricas para `p-3`.
   - `AllocationManager.tsx`:
     - Ajustado `TouchSensor` para delay de 250ms e tolerância de 5px (press-and-hold mais intuitivo e sem conflito com scroll).
     - Ajustado `PointerSensor` para distância de 8px.
   - `DraggableAllocationCard.tsx` e `DivisionCard.tsx`:
     - Adicionado `select-none` nos handles de arraste para evitar seleção de texto acidental.
     - Mantido `touch-none` apenas nos handles para garantir que o scroll da página funcione fora deles.
 - Arquivos:
   - `src/components/events/EventDetail.tsx`
   - `src/components/events/AllocationManager.tsx`
   - `src/components/events/DraggableAllocationCard.tsx`
   - `src/components/events/DivisionCard.tsx`
 - Impacto:
   - Melhora a estética com margens respiráveis e corrige a experiência de arrastar e soltar em dispositivos móveis, permitindo "segurar para arrastar" sem interferir no scroll vertical.

## [2026-01-31] - fix: Conflito de Z-Index em Modais (Editar/Excluir)
 - Mudanças:
   - `src/components/ui/dialog.tsx`: Aumentado z-index de Overlay (`z-[1060]`) e Content (`z-[1070]`) para sobrepor `Sheet` (`z-[1050]`).
   - `src/components/ui/alert-dialog.tsx`: Aumentado z-index de Overlay (`z-[1080]`) e Content (`z-[1090]`) para garantir prioridade sobre Dialogs e Sheets.
 - Arquivos:
   - `src/components/ui/dialog.tsx`
   - `src/components/ui/alert-dialog.tsx`
 - Impacto:
   - Resolve bug onde modais de edição e exclusão abertos a partir do menu lateral (Sheet) ficavam inacessíveis ou "atrás" do menu.
