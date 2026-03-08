## [2026-03-05] - fix: Mensagem de erro correta na validação de datas do evento
 - Mudanças:
   - Atualizada a mensagem de erro no schema Zod (`eventSchema.ts`) para "A data de fim não pode ser anterior à data de início" (e similar para montagem).
   - Removido bloqueio manual no `EventForm.tsx` (`handleEndDateChange`) que impedia a atualização do estado do formulário com datas inválidas.
     - Isso permite que o valor inválido seja processado pelo Zod, exibindo a mensagem correta em vez de "Data de fim é obrigatória".
   - Removidos alertas inline duplicados para erros de data (deixando apenas os avisos de reinício de data).
 - Arquivos:
   - `src/schemas/eventSchema.ts`
   - `src/components/events/EventForm.tsx`
 - Impacto:
   - Usuário vê a mensagem de erro específica ("A data de fim não pode ser anterior...") em vez de uma mensagem genérica ou confusa ("Obrigatório").
   - UX melhorada ao permitir que o usuário veja o erro no contexto do campo preenchido.

## [2026-03-05] - fix: Avisos no modal de eventos - Problema de z-index e visualização
 - Mudanças:
   - Ajustado z-index do ToastViewport de `z-[100]` para `z-[1100]` para sobrepor o modal (z-[1060])
   - Reduzida opacidade do overlay do modal de `bg-black/80` para `bg-black/50` para melhor visibilidade
   - Implementado sistema de alertas inline no formulário de eventos para substituir toasts
   - Adicionado estado `inlineAlerts` para controlar exibição de mensagens dentro do modal
   - Alertas aparecem no topo do formulário com auto-remoção após 3 segundos
   - Mensagens de erro e aviso agora são exibidas diretamente no contexto do formulário
 - Arquivos:
   - `src/components/ui/toast.tsx`
   - `src/components/ui/dialog.tsx`
   - `src/components/events/EventForm.tsx`
 - Impacto:
   - Usuários agora veem claramente os avisos e erros de validação
   - Feedback visual imediato dentro do contexto do formulário
   - Eliminação do problema de mensagens "apagadas" ou escondidas pelo modal

## [2026-03-05] - fix: Consistência de cálculo na aba "Pendentes" do Histórico
 - Mudanças:
   - Atualizada a função `calculatePendingPaymentsByEvent` para usar a mesma engine de cálculo oficial (`PayrollCalc.calculateTotalPay`) já aplicada na aba "Eventos".
   - Adicionada busca de `personnel_functions` e dados completos do pessoal (`monthly_salary`, `overtime_rate`, `type`) na query de pagamentos pendentes.
   - Unificada a lógica de obtenção de `custom_cache` e `function_name` para garantir que o valor pendente considere o cachê da função (ex: R$ 600) em vez do padrão (ex: R$ 500).
 - Arquivos:
   - `src/hooks/queries/usePersonnelHistoryQuery.ts`
 - Impacto:
   - Corrige a discrepância visual onde a aba "Pendentes" mostrava um valor menor (ex: R$ 3.000) do que o real (ex: R$ 3.600) por ignorar o cachê específico da função. Agora todas as abas (Folha, Histórico > Eventos, Histórico > Pendentes) exibem o mesmo valor SSOT.

## [2026-03-05] - fix: Correção crítica de query de alocações no Histórico
 - Mudanças:
   - Removida a coluna `function_id` da query de `personnel_allocations` (inexistente no banco), evitando falha silenciosa ou retorno incompleto.
   - Adicionado filtro de `team_id` na busca de `personnel_functions` para garantir contexto correto.
   - Adicionada conversão explícita de `custom_cache` e `custom_overtime` para `Number()`, garantindo que o cálculo matemático funcione corretamente (evitando concatenação de strings).
 - Arquivos:
   - `src/hooks/queries/usePersonnelHistoryQuery.ts`
 - Impacto:
   - Restabelece o funcionamento correto do cálculo de histórico que estava falhando devido à coluna inexistente, garantindo que o valor total bata com a Folha (ex: R$ 3.600,00).

## [2026-03-05] - fix: Consistência total do Histórico com Folha via PayrollCalc SSOT
 - Mudanças:
   - Substituído cálculo manual de `totalAmount` e `daysWorked` no Histórico (`useEventsHistory`) pela função `PayrollCalc.calculateTotalPay` e `calculateWorkedDays`, garantindo paridade exata com a Folha de Pagamento.
   - Ajustada query de `personnel_allocations` para filtrar eventos do time (`events.team_id`) em vez de filtrar alocações (`team_id`), corrigindo omissão de alocações válidas com inconsistência de dados.
   - Incluída busca completa de `workLogs` e `personnel` (com dados salariais/HE) para alimentar o cálculo oficial.
 - Arquivos:
   - `src/hooks/queries/usePersonnelHistoryQuery.ts`
 - Impacto:
   - Eliminação definitiva de divergências de valores (R$ 600 vs R$ 500) causadas por diferenças na regra de cache ou filtros de dados.
   - O Histórico agora reflete fielmente o "Total a Pagar" calculado pela engine da Folha, incluindo Horas Extras e regras de cache avançadas.

## [2026-03-05] - fix: Gráfico de barras "Custos com Fornecedores (Top 5)" - Correção de valores negativos no eixo Y
 - Mudanças:
   - Adicionado `domain={[0, 'auto']}` no componente YAxis do Recharts para garantir que o eixo Y comece em 0
   - Implementada filtragem de valores negativos na função `getCostsByCategory` para garantir que apenas custos positivos sejam considerados
   - Melhorada a formatação do eixo Y para exibir valores em R$ com notação compacta (R$1.6k, R$2M, etc.)
   - Aumentada a largura do eixo Y de 35 para 40 pixels para acomodar labels maiores
 - Arquivos:
   - `src/components/dashboard/AnalyticsCharts.tsx` (linha 207-218): Adicionado domain e melhorado tickFormatter
   - `src/utils/analyticsData.ts` (linha 120-123): Adicionada validação para filtrar valores negativos
 - Impacto:
   - O gráfico deixa de exibir valores negativos no eixo Y, que são incorretos para representação de custos
   - Formatação monetária mais clara e profissional com notação compacta
   - Melhor experiência visual e precisão nos dados apresentados

## [2026-03-05] - fix: Unificação de cálculo de Total Pago de Fornecedores entre Dashboard e Relatório
 - Mudanças:
   - Criada função compartilhada `calcularTotalPagoFornecedores(custos)` em `src/utils/supplierUtils.ts` que considera apenas custos com `status === 'paid'`
   - Aplicada função compartilhada no Dashboard para substituir cálculo inline anterior
   - Corrigida lógica em `calcSupplierPaymentsReportTotals` para somar apenas valores de custos com `statusLabel === 'Pago'` (antes somava todos os `paidAmount`)
   - Criados testes unitários abrangentes para a função compartilhada com 8 casos de teste
 - Arquivos:
   - `src/utils/supplierUtils.ts`: Nova função `calcularTotalPagoFornecedores`
   - `src/components/Dashboard.tsx`: Substituição do cálculo inline pela função compartilhada
   - `src/utils/supplierPaymentsReport.ts`: Correção da lógica de soma no `calcSupplierPaymentsReportTotals`
   - `src/utils/__tests__/supplierUtils.test.ts`: Testes unitários para garantir funcionamento correto
 - Impacto:
   - Elimina inconsistência entre Dashboard (R$ 1.600,00) e Relatório (R$ 0,00) para Total Pago de Fornecedores
   - Garante que apenas pagamentos com status explicitamente 'paid' sejam considerados, ignorando 'pendente' ou 'parcial'
   - Previne regressões futuras através de testes automatizados
   - Impacto:
   - O gráfico deixa de exibir valores negativos no eixo Y, que são incorretos para representação de custos
   - Formatação monetária mais clara e profissional com notação compacta
   - Melhor experiência visual e precisão nos dados apresentados

## [2026-03-05] - fix: Total do evento no Histórico alinhado com Folha por agregação de alocações
 - Mudanças:
   - Refatorada a aba de eventos do Histórico de Pessoal para calcular por `event_id` agregado, em vez de calcular cada linha de alocação isoladamente.
   - O `cacheRate` do evento passou a usar o maior `event_specific_cache` entre as alocações do evento (mesma regra da Folha), com fallback para `event_cache` da pessoa.
   - `daysWorked` passou a considerar o conjunto de alocações do evento e não apenas uma alocação, evitando sub/superestimação do `totalAmount`.
   - Mantido o rateio de `personnel_payments.related_events` no `totalPaid`, garantindo consistência de pago e pendente no card de eventos do Histórico.
 - Arquivos:
   - `src/hooks/queries/usePersonnelHistoryQuery.ts`
 - Impacto:
   - O campo "Total do Evento" no Histórico passa a bater com o "Total a Pagar" da Folha para o mesmo profissional/evento.
   - Reduz divergência visual e elimina inconsistência entre abas de histórico e folha operacional.

## [2026-03-05] - fix: Alinhamento do cálculo de pendentes entre Folha e Histórico de Pessoal
 - Mudanças:
   - Corrigido o cálculo de `totalPaid` no Histórico para pagamentos de `personnel_payments` com múltiplos `related_events`, aplicando rateio por evento (`valor / quantidade de eventos`) como já ocorre na folha do evento.
   - Adicionada normalização de `related_events` (array/string JSON) para evitar diferenças de interpretação entre fontes de pagamento.
   - Ajustado o cálculo de histórico de eventos para usar o mesmo rateio ao compor `totalPaid` por evento.
 - Arquivos:
   - `src/hooks/queries/usePersonnelHistoryQuery.ts`
 - Impacto:
   - Sincroniza o valor de `pendente` entre Folha de Pagamento e Histórico de Pessoal, evitando divergências quando há pagamentos com múltiplos eventos relacionados.

## [2026-03-05] - fix: Dashboard - Estatísticas de Eventos não considerava filtros de equipe
 - Mudanças:
   - Refatorados `getEventsByStatus`, `getMonthlyEvents`, `getCostsByCategory` e `getFinancialEvolution` para aceitarem eventos filtrados por equipe
   - Atualizado componente `AnalyticsCharts` para passar `filteredEvents`, `filteredPersonnel` e `filteredCosts` para as funções de analytics
   - Removida dependência de `events`, `personnel` e `costs` sem filtro nas chamadas dos gráficos
 - Arquivos:
   - `src/components/dashboard/AnalyticsCharts.tsx`
   - `src/utils/analyticsData.ts`
 - Impacto:
   - Gráficos do Dashboard agora refletem apenas dados da equipe ativa selecionada, mantendo consistência com o restante da aplicação

## [2026-03-05] - fix: Modal de Baixa de Pagamento - Prevenção de duplicatas e sincronização de estado
 - Mudanças:
   - Adicionada validação pré-baixa no `PendingPaymentsTab` com refetch do estado pendente antes do insert, bloqueando operação quando o evento já está quitado.
   - Reforçado o refresh imediato com refetch/invalidate das chaves de histórico e invalidação em realtime de `personnel-history` quando `personnel_payments` muda.
   - Atualizado o total pago em estatísticas e histórico de eventos para incluir pagamentos diretos de `personnel_payments`.
 - Arquivos:
   - `src/hooks/queries/usePersonnelHistoryQuery.ts`
   - `src/components/personnel/PersonnelHistory/PendingPaymentsTab.tsx`
   - `src/hooks/queries/usePersonnelPaymentsRealtime.ts`
 - Impacto:
   - O modal deixa de permitir baixa duplicada do mesmo pendente após quitação.
   - Ao clicar em "Dar Baixa", o estado pendente e os cards do histórico atualizam imediatamente.
   - Cálculos de pendência e pago ficam consistentes entre histórico, estatísticas e realtime.

## [2026-03-05] - fix: Validação de datas no formulário de eventos - Melhorias de UX
 - Mudanças:
   - Adicionada validação em tempo real com `useEffect` para monitorar mudanças nas datas
   - Implementado estado `dateValidationErrors` para controlar exibição de erros cross-field
   - Adicionadas bordas vermelhas (`border-red-500`) nos campos com erro de validação
   - Mensagens de erro inline agora exibem tanto erros do Zod quanto validações customizadas
   - Feedback visual imediato quando usuário seleciona datas inválidas
   - Mantidos toast notifications para consistência com padrão existente
 - Arquivos:
   - `src/components/events/EventForm.tsx`
 - Impacto:
   - Usuários agora recebem feedback visual imediato sobre erros de data
   - Campos inválidos são destacados com borda vermelha
   - Mensagens de erro claras abaixo dos campos problemáticos
   - Experiência de usuário significativamente melhorada

## [2026-03-05] - fix: Filtro de pagamento pendente por valor em aberto
 - Mudanças:
   - Ajustada a função `get_events_with_payment_status` para considerar pagamento concluído apenas quando `paid >= expected - 0.10`, sem quitação automática apenas por existência de fechamento.
   - Corrigida a sinalização de `has_pending_payments` para refletir saldo em aberto por valor esperado vs valor pago.
   - Removida a dica de estado vazio no seletor de eventos da folha e substituída por mensagem neutra no filtro "Pagamento Pendente".
 - Arquivos:
   - `supabase/migrations/20260305123000_fix_payroll_pending_filter_amount_based.sql`
   - `src/components/payroll/EventSelector.tsx`
 - Impacto:
   - Eventos concluídos com valores ainda em aberto voltam a aparecer no filtro "Pagamento Pendente".
   - Evita mensagem enganosa de "pagamentos em dia" quando o problema é cálculo de pendência no backend.

## [2026-03-05] - feat: Validação de datas no formulário de eventos
 - Mudanças:
   - Criado schema Zod para validação de eventos em `src/schemas/eventSchema.ts` com validações cross-field
   - Adicionada validação que impede data de fim ser anterior à data de início
   - Adicionada validação que impede fim da montagem ser anterior ao início da montagem
   - Atualizado `EventForm.tsx` para usar `zodResolver` com validação em tempo real (`mode: 'onChange'`)
   - Implementadas mensagens de erro vermelhas abaixo dos campos de data inválidos
   - Botão de submit agora é desabilitado quando há erros de validação (`!isValid`)
   - Mantidas validações manuais existentes com toast notifications para melhor UX
 - Arquivos:
   - `src/schemas/eventSchema.ts`
   - `src/components/events/EventForm.tsx`
 - Impacto:
   - Impede criação de eventos com datas inconsistentes
   - Feedback visual imediato para o usuário sobre erros de validação
   - Reduz erros de usuário e melhora a qualidade dos dados inseridos

## [2026-03-06] - fix: Erro ao registrar pagamento parcial e warning de acessibilidade
 - Mudanças:
   - Corrigido `ReferenceError: eventData is not defined` em `handleRegisterPartialPayment` (`usePayrollActions.ts`) adicionando a busca dos dados do evento antes da notificação.
   - Removido `aria-describedby={undefined}` de `DialogContent` em `dialog.tsx` para permitir que a propriedade seja passada corretamente e evitar warnings de acessibilidade.
 - Arquivos:
   - `src/components/payroll/usePayrollActions.ts`
   - `src/components/ui/dialog.tsx`
 - Impacto:
   - O registro de pagamento parcial agora funciona corretamente sem erros no console.
   - Melhorada a conformidade com acessibilidade em modais.

## [2026-03-06] - feat: Transparência total em datas de vencimento de fornecedores
 - Mudanças:
   - Adicionada exibição explícita da data de vencimento (`Vencimento: DD/MM/AAAA`) no card de cada fornecedor em `SupplierCostsByEvent.tsx`, ou "Sem data de vencimento" caso não haja.
   - Adicionada a data de vencimento ao lado do nome do item no alerta de topo do Dashboard (ex: "Fornecedor: X (12/03/2026)"), eliminando dúvidas sobre o motivo do alerta.
   - Reforçada a validação no filtro de alerta para ignorar strings vazias ou com apenas espaços em `payment_date`.
 - Arquivos:
   - `src/components/Dashboard.tsx`
   - `src/components/dashboard/SupplierCostsByEvent.tsx`
 - Impacto:
   - Resolve a confusão do usuário sobre pagamentos "sem data" aparecendo como atrasados, mostrando claramente qual data o sistema está considerando.
   - Se o sistema estiver usando uma data default incorreta (ex: data do evento para pagamento), o usuário agora poderá ver isso explicitamente e corrigir se necessário.

## [2026-03-06] - feat: Exportação avançada de pessoal (PDF/CSV)
 - Mudanças:
   - Criada nova página `PersonnelExportPage` para exportação de dados de pessoal.
   - Adicionado seletor de colunas persistente (localStorage) para que o usuário escolha exatamente quais campos exportar.
   - Suporte a filtros de busca (nome, função, tipo) e exportação em PDF e CSV compatível com Excel.
 - Arquivos:
   - `src/pages/PersonnelExportPage.tsx`
   - `src/components/personnel/PersonnelExportColumnPicker.tsx`
 - Impacto:
   - Permite que o administrador gere relatórios personalizados da equipe para uso externo ou conferência.

## [2026-03-06] - feat: Relatório de folha por evento personalizável
 - Mudanças:
   - Criada nova página `PayrollReportPage` focada em impressão e exportação.
   - Adicionado seletor de colunas dinâmico para o relatório de folha, permitindo ocultar/exibir dados sensíveis (ex: CPF, Cachê).
   - Layout otimizado para impressão A4 e geração de PDF limpo.
 - Arquivos:
   - `src/pages/PayrollReportPage.tsx`
   - `src/components/payroll/PayrollPrintTable.tsx`
 - Impacto:
   - Facilita a geração de folhas de pagamento físicas ou digitais formatadas profissionalmente.

## [2026-03-08] - fix: Permitir múltiplas alocações por pessoa no mesmo evento (sem conflito de dias)
 - Mudanças:
   - Refatorada a validação no `useAllocationForm.ts` para checar sobreposição de dias (`work_days`) em vez de bloquear qualquer existência prévia do profissional no evento.
   - A validação agora permite que a mesma pessoa seja alocada em divisões diferentes (ex: Sala A e Sala B) desde que em dias diferentes.
 - Arquivos:
   - `src/components/events/allocation/useAllocationForm.ts`
 - Impacto:
   - Permite flexibilidade na alocação de equipes que atuam em múltiplas funções/salas ao longo de um evento multi-dia.
   - Mantém a integridade dos dados impedindo conflitos de agenda (mesmo dia em dois lugares).
