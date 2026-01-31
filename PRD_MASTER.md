## [2026-01-31] - fix: Custos de Fornecedores Atualizam Imediatamente (Pagamentos/Total)
 - Mudanças:
   - Sincronização imediata de `paid_amount`/`payment_status` no estado local ao carregar/criar/excluir pagamentos (sem depender de refresh).
   - Modal de pagamentos passa a calcular "Já Pago" e "Restante" a partir do histórico carregado, evitando UI stale.
   - Atualização de custo (qty/preço) passa a recalcular `payment_status` localmente; update no banco não sobrescreve campos de pagamento.
 - Arquivos:
   - `src/components/events/costs/SupplierPaymentDialog.tsx`
   - `src/components/events/costs/SupplierCostCard.tsx`
   - `src/components/events/costs/AddSupplierCostDialog.tsx`
   - `src/contexts/EnhancedDataContext.tsx`
   - `src/services/supplierService.ts`
   - `src/components/events/costs/__tests__/SupplierPaymentDialog.reactive.test.tsx`
 - Impacto:
   - Cards e resumo do evento refletem pagamentos/alterações de custo imediatamente, reduzindo divergência visual e risco de sobrescrever status/valores de pagamento.

## [2026-01-31] - fix: Coluna "Divisão" antes de Entrada/Saída + Botões Maiores (Desktop)
 - Mudanças:
   - Lista de presença: reordenadas as colunas no desktop para exibir "Divisão" antes de "Entrada/Saída".
   - Botões de ação (presença/falta) aumentados em telas grandes para melhorar clique/visibilidade.
 - Arquivos:
   - `src/components/events/EventDailyAttendance.tsx`
 - Impacto:
   - Leitura mais natural por divisão e ações mais fáceis de operar no desktop, sem afetar o layout mobile.

## [2026-01-31] - fix: Cards de Alocação ("extras") Atualizam Imediatamente
 - Mudanças:
   - `src/components/events/DivisionCard.tsx` + `src/components/events/DraggableAllocationCard.tsx`:
     - Cards passam a usar `useWorkLogsQuery()` como fonte de dados para HE, refletindo imediatamente após lançamentos.
   - `src/components/events/AllocationListView.tsx` + `src/components/events/AllocationCard.tsx`:
     - Removida dependência de `workLogs` do `EnhancedDataContext` (deprecado) para exibir horas extras.
     - Somatório de HE normalizado com `Number(...)` para garantir valor correto.
 - Arquivos:
   - `src/components/events/DivisionCard.tsx`
   - `src/components/events/DraggableAllocationCard.tsx`
   - `src/components/events/AllocationListView.tsx`
   - `src/components/events/AllocationCard.tsx`
 - Impacto:
   - Elimina atraso e divergência nos cards por pessoa ("extras"), mantendo UI consistente com os lançamentos em tempo real.

## [2026-01-31] - fix: Métrica "H. EXTRAS" Atualiza Imediatamente após Entrada/Saída
 - Mudanças:
   - `src/components/events/EventDetail.tsx`:
     - Métrica de horas extras passa a ler de `useWorkLogsQuery()` (React Query) em vez do `EnhancedDataContext` (deprecado).
     - Garante que ao salvar Entrada/Saída na lista de presença, o card "H. EXTRAS" reflete imediatamente o valor correto.
 - Arquivos:
   - `src/components/events/EventDetail.tsx`
 - Impacto:
   - Remove divergência visual e atraso na atualização das métricas do evento, melhorando consistência e confiança do operador.

## [2026-01-31] - fix: HE Mobile sem Badge (Texto Vermelho + Mais Área Útil)
 - Mudanças:
   - `src/components/events/EventDailyAttendance.tsx`:
     - Removida sinalização de HE em `Badge` no mobile (evita clipping).
     - HE passa a ser exibida como texto em vermelho, com layout em coluna para mais área visível.
 - Arquivos:
   - `src/components/events/EventDailyAttendance.tsx`
 - Impacto:
   - Melhora legibilidade e reduz ruído visual no mobile, mantendo feedback claro de horas extras.

## [2026-01-31] - fix: Atualização Imediata de Entrada/Saída (Mobile)
 - Mudanças:
   - `src/components/events/EventDailyAttendance.tsx`:
     - Aplicada atualização otimista dos horários ao salvar no modal, refletindo instantaneamente na lista.
     - Lista (mobile) passa a exibir o horário preenchido (Entrada/Saída) no botão, em vez de apenas o previsto.
 - Arquivos:
   - `src/components/events/EventDailyAttendance.tsx`
 - Impacto:
   - Elimina sensação de "não salvou" e reduz erros operacionais, mantendo consistência visual e feedback imediato.

## [2026-01-31] - feat: UX de Horas Extras ao Preencher Entrada/Saída
 - Mudanças:
   - `src/components/events/EventDailyAttendance.tsx`:
     - Mobile: o modal de horários agora exibe o resumo de horas trabalhadas e horas extras (HE) em tempo real, antes de salvar.
     - Desktop: exibe HE estimada abaixo do horário previsto e abre um dialog de alerta na primeira vez que HE > 0 (por pessoa/dia).
 - Arquivos:
   - `src/components/events/EventDailyAttendance.tsx`
 - Impacto:
   - Reduz erros operacionais ao registrar HE e torna explícito, no ato do preenchimento, quantas horas extras serão lançadas.

## [2026-01-31] - fix: Acessibilidade em Sheets (Radix DialogTitle obrigatório)
 - Mudanças:
   - Adicionado título acessível (via `VisuallyHidden`) nos `SheetContent` que eram renderizados sem `SheetTitle`, eliminando warning do Radix e garantindo suporte correto a leitores de tela.
 - Arquivos:
   - `src/components/ui/sidebar.tsx`
   - `src/components/SettingsPage.tsx`
 - Impacto:
   - Remove erros no console relacionados a acessibilidade e melhora a conformidade ARIA sem alterar o layout visual.

## [2026-01-31] - feat: Sincronização em Tempo Real (Presença x Histórico de Faltas)
 - Mudanças:
   - `src/components/events/EventDailyAttendance.tsx`:
     - Implementado registro de `logged_by_id` ao marcar presença/falta, permitindo auditoria de quem realizou a ação.
   - `src/components/events/AbsenceHistory.tsx`:
     - Migrada a fonte de dados da tabela legada `absences` para a tabela ativa `work_records`.
     - Implementada sincronização em tempo real (Supabase Realtime) que reflete mudanças na lista de presença instantaneamente no histórico.
     - Unificado o sistema de cache (React Query) para invalidar o histórico sempre que um registro de trabalho é alterado.
   - `src/hooks/queries/usePersonnelHistoryQuery.ts`:
     - Atualizada toda a lógica de histórico individual e estatísticas para ler de `work_records`.
     - Garante consistência absoluta entre o que o administrador vê na lista de presença e o que é calculado para pagamentos e relatórios.
 - Arquivos:
   - `src/components/events/EventDailyAttendance.tsx`
   - `src/components/events/AbsenceHistory.tsx`
   - `src/hooks/queries/usePersonnelHistoryQuery.ts`
 - Impacto:
   - Elimina a divergência de dados entre abas, garante que faltas registradas apareçam imediatamente em todos os logs e assegura a integridade dos cálculos de pagamento baseados em presença.

## [2026-01-31] - infra: Configuração de Preview Estável (Porta 8080 + Build Estático)
 - Mudanças:
   - `vite.config.ts`:
     - Alterado `host` para `true` e configurado `strictPort: true` na porta 8080 (conforme diretrizes SRE).
   - Fluxo de Preview:
     - Implementado build de produção (`npm run build`) seguido de `vite preview` para mitigar erros `ERR_ABORTED` causados por excesso de requisições a módulos individuais em ambiente de IDE.
 - Arquivos:
   - `vite.config.ts`
 - Impacto:
   - Garante que o sistema possa ser visualizado de forma estável e performática na porta 8080, eliminando timeouts de carregamento.

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

## [2026-01-31] - fix: Compactação Mobile (Gutters menores + Status abreviado + Botões menores)
 - Mudanças:
   - `src/index.css`:
     - Reduzido `--ps-gutter` para ganhar espaço útil sem encostar nas bordas (mantendo `safe-area-inset-*`).
   - `src/components/events/EventDailyAttendance.tsx`:
     - Status abreviado em mobile: "Presente" → "P", "Falta" → "F", "Pendente" → "–".
     - Botões de ação menores em mobile e gap reduzido.
     - Cards de estatísticas com bordas/raios mais compactos (`rounded-md`, padding menor).
 - Arquivos:
   - `src/index.css`
   - `src/components/events/EventDailyAttendance.tsx`
 - Impacto:
   - Aumenta área útil em mobile e melhora legibilidade/operabilidade sem scroll horizontal.

## [2026-01-31] - fix: Remoção de Coluna de Status (Lista de Presença)
 - Mudanças:
   - `src/components/events/EventDailyAttendance.tsx`:
     - Removida coluna "Status" da tabela (tanto header quanto corpo) para evitar redundância e sobreposição com botões de ação em mobile.
     - Ajustadas larguras das colunas restantes: Profissional (60% sm/50% md), Função (25% md), Ações (40% sm/25% sm/10% md).
 - Arquivos:
   - `src/components/events/EventDailyAttendance.tsx`
 - Impacto:
   - Elimina poluição visual e conflito de espaço em telas pequenas, já que os botões de ação já indicam visualmente o estado atual (verde/vermelho).

## [2026-01-31] - feat: Lista de Presença (Divisão + Chegada/Saída + HE automática > 12h)
 - Mudanças:
   - `src/components/events/EventDailyAttendance.tsx`:
     - Removidos filtro e cards de resumo por status (presente/falta/pendente), mantendo apenas total.
     - Adicionada "Divisão" na lista: no mobile aparece abaixo da função; no desktop entra como coluna no lugar do status.
     - Adicionados campos de `Entrada/Saída` (hora de chegada e saída) com `input[type=time]`.
     - Ajuste UX: no desktop, a função também é exibida abaixo do nome (sem coluna separada).
     - Ajuste UX: no mobile, exibe apenas o horário previsto; ao clicar abre modal para preencher Entrada/Saída individual.
     - Ajuste UX: ao clicar na foto do profissional, abre em tela cheia para facilitar identificação.
     - Cálculo automático: ao informar Entrada e Saída, calcula `hours_worked` e `overtime_hours = max(0, hours_worked - 12)` e persiste em `work_records`.
   - `src/components/events/WorkLogManager.tsx`:
     - Ajustado limite de validação de horas extras para até 12h (compatível com cenários de longas jornadas).
   - `supabase/migrations/add_checkin_checkout_times.sql`:
     - Adicionadas colunas `check_in_time` e `check_out_time` em `public.work_records`.
 - Arquivos:
   - `src/components/events/EventDailyAttendance.tsx`
   - `src/components/events/WorkLogManager.tsx`
   - `src/contexts/EnhancedDataContext.tsx`
   - `supabase/migrations/add_checkin_checkout_times.sql`
 - Impacto:
   - Evita sobreposição no mobile, mostra a divisão alocada e sincroniza HE automaticamente com a folha via `work_records.overtime_hours`.

## [2026-01-31] - fix: Maximização de Área Útil (Gutters e Paddings Mínimos)
 - Mudanças:
   - `src/index.css`:
     - Reduzido `--ps-gutter` mobile para `clamp(4px, 2vw, 12px)` e landscape para `clamp(4px, 1.5vw, 12px)`.
   - `src/components/events/EventDailyAttendance.tsx`:
     - Reduzido padding de células da tabela em mobile (`p-3` → `p-2`).
     - Reduzido padding interno dos badges (`px-2` → `px-1.5`).
 - Arquivos:
   - `src/index.css`
   - `src/components/events/EventDailyAttendance.tsx`
 - Impacto:
   - Maximiza o espaço para conteúdo em telas muito pequenas (320px), atendendo à solicitação de "diminuir mais as bordas".

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

## [2026-01-31] - fix: Rota Super Admin e Erro 500 Checkout
 - Mudanças:
   - `src/App.tsx`:
     - Adicionada lógica de redirecionamento condicional na rota raiz `/app`: usuários com role `superadmin` são redirecionados automaticamente para `/app/superadmin` em vez do Dashboard comum.
   - `src/components/AppSidebar.tsx`:
     - Removido link "Dashboard" do menu lateral para usuários Super Admin, mantendo apenas acesso às ferramentas de administração.
   - `supabase/functions/create-checkout-session/index.ts`:
     - Implementada validação explícita de variáveis de ambiente (`STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) com logs de erro claros (mas seguros) em caso de falha.
     - Adicionado tratamento de erro global para garantir que falhas (500) retornem um corpo JSON parseável pelo frontend, facilitando o diagnóstico.
 - Arquivos:
   - `src/App.tsx`
   - `src/components/AppSidebar.tsx`
   - `supabase/functions/create-checkout-session/index.ts`
 - Impacto:
  - Melhora a UX do Super Admin (acesso direto) e fornece diagnósticos claros para erros de infraestrutura no checkout (evitando "Internal Server Error" opaco).

## [2026-01-31] - fix: Remoção de Registro de Falta Incorreto (Data Fix)
- Mudanças:
  - Executada migração `20260131120000_delete_wrong_absence.sql` para remover registro de falta incorreto de "Felipe Gomes Oliveira de Abreu" em 13/11/2025.
- Arquivos:
  - `supabase/migrations/20260131120000_delete_wrong_absence.sql`
- Impacto:
  - Correção pontual de dados a pedido do usuário, removendo uma falta lançada erroneamente e regularizando o histórico do profissional.

## [2026-01-31] - fix: Visibilidade e Sincronização de Faltas (Todas as Telas)
 - Mudanças:
   - `src/components/events/AbsenceHistory.tsx`:
     - Refatorado para ler diretamente da tabela `absences` em vez de buscar por `attendance_status='absent'` em `work_records` (que são deletados ao lançar falta).
     - Adicionado join correto com `personnel_allocations` para exibir dados do profissional/divisão.
   - `src/components/events/EventDailyAttendance.tsx`:
     - Adicionada leitura híbrida de `work_records` (presença) e `absences` (falta) para compor o status diário.
     - Corrigida lógica de toggle: criar falta agora insere em `absences` (e remove work_record); marcar presença remove `absence` e cria `work_record`.
   - `src/components/events/AllocationCard.tsx`:
     - Adicionada query de `absences` para identificar dias de falta visualmente (bolinha vermelha).
     - Corrigido cálculo de "Dias Trabalhados": agora subtrai as faltas do total de dias alocados.
     - Ajustado cálculo financeiro para descontar dias de falta do total estimado/pago.
 - Arquivos:
   - `src/components/events/AbsenceHistory.tsx`
   - `src/components/events/EventDailyAttendance.tsx`
   - `src/components/events/AllocationCard.tsx`
 - Impacto:
   - Resolve o bug onde faltas lançadas "sumiam" do histórico e da lista diária. Agora a falta aparece corretamente no Histórico, na Lista de Presença (com botão "X" ativo) e no Resumo do Profissional (com indicador visual e desconto financeiro).