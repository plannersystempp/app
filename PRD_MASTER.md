## [2026-03-04] - fix: Dashboard pending logic respects payroll closings
 - Mudanças:
   - Atualizada a função `get_events_with_payment_status` para considerar eventos com fechamento de folha (`payroll_closings`) como quitados, independentemente de divergências de valores (ex: negociações abaixo da tabela).
   - Corrigida referência à coluna inexistente `function_id` na tabela `personnel_allocations`, que impedia a aplicação da migração anterior.
 - Arquivos:
   - `supabase/migrations/20260304130000_fix_dashboard_pending_logic_with_closings.sql`
 - Impacto:
   - Eventos onde o pagamento foi negociado (valor diferente do esperado) mas a folha foi fechada deixam de aparecer como "Pendentes".
   - A migração agora aplica corretamente, resolvendo o problema de "continua do mesmo jeito".

## [2026-03-04] - fix: Correção de regressão no Dashboard (pagamentos pendentes)
 - Mudanças:
   - Restaurada a lógica robusta da função `get_events_with_payment_status` (versão 20260303230000), que lida corretamente com horas extras, conversão diária e tolerância de centavos.
   - Corrigido erro de tipo (DATE vs TEXT[]) na agregação de dias de falta (`absent_days`), que causava falha na query anterior.
   - A função agora considera corretamente:
     - Dias trabalhados descontando faltas.
     - Conversão de horas extras para diárias (se habilitado).
     - Taxas específicas por evento/função.
     - Pagamentos parciais e totais com tolerância de R$ 0,10.
 - Arquivos:
   - `supabase/migrations/20260304120000_restore_and_fix_dashboard_logic.sql`
 - Impacto:
   - Resolve o problema onde eventos totalmente pagos apareciam como "Pendentes" no Dashboard devido a uma simplificação incorreta na query anterior.

## [2026-03-03] - fix: Correção profunda de pendências no Dashboard e logs de depuração
 - Mudanças:
   - Atualizada a RPC `get_events_with_payment_status` para ignorar alocações onde `attendance_status = 'absent'`, alinhando com a lógica do frontend.
   - Aumentada a tolerância de arredondamento de R$ 0,01 para R$ 0,10 no cálculo de `has_pending_payments` para evitar "falsos positivos" por dízimas periódicas.
   - Implementados logs detalhados no `Dashboard.tsx` para listar no console do navegador quais eventos o sistema ainda considera pendentes e por quê.
 - Arquivos:
   - `supabase/migrations/20260303220000_fix_dashboard_absences_and_tolerance.sql`
   - `src/components/Dashboard.tsx`
 - Impacto:
   - Eliminação de eventos que apareciam como pendentes indevidamente devido a faltas totais de profissionais ou diferenças de centavos.
   - Facilita a depuração futura caso o problema persista em cenários específicos.

## [2026-03-03] - fix: Correção definitiva de pendências no Dashboard (considerando faltas)
 - Mudanças:
   - Atualizada novamente a RPC `get_events_with_payment_status` para subtrair explicitamente os dias com status `absent` (faltas) do cálculo de valor esperado.
   - Anteriormente, a lógica considerava apenas os dias alocados, gerando "falsos pendentes" para quem faltou (recebeu menos que o alocado, mas o correto).
 - Arquivos:
   - `supabase/migrations/20260303204000_fix_dashboard_pending_events_absences.sql`
 - Impacto:
   - Eventos onde houveram faltas agora terão o valor "Esperado" reduzido, batendo com o valor "Pago", removendo o status de pendência incorreto.

## [2026-03-03] - fix: Eventos pagos ainda apareciam como pendentes no Dashboard
 - Mudanças:
   - Ajustada a RPC `get_events_with_payment_status` para alinhar o cálculo de pendência com as regras do frontend (cachê por função/evento, taxa de hora extra, conversão diária por limiar e desconto de faltas).
   - Adicionado teste automatizado cobrindo cenário de pagamento completo com conversão e faltas.
 - Arquivos:
   - `supabase/migrations/20260303194000_fix_dashboard_pending_events_paid.sql`
   - `src/services/__tests__/dashboardPendingPaymentsAlignment.test.ts`
 - Impacto:
   - Eventos totalmente pagos deixam de aparecer no card “Pagamentos Próximos”, reduzindo falsos positivos de pendência.

## [2026-03-03] - fix: Dashboard exibia eventos sem pagamentos pendentes (vazios/concluídos)
 - Mudanças:
   - Removida a verificação `allocated_count > 0` no filtro de eventos concluídos do Dashboard.
   - Eventos sem alocações de pessoal (ou com pagamentos totalmente quitados) agora são corretamente identificados como "sem pendências" e ocultados do card "Pagamentos Próximos".
 - Arquivos:
   - `src/components/Dashboard.tsx`
 - Impacto:
   - O Dashboard deixa de listar eventos vazios ou totalmente pagos como "Pendentes", limpando a visualização para o usuário.

## [2026-03-03] - fix: Correção de compatibilidade do Preview com Vite (process.env)
 - Mudanças:
   - Substituído `process.env.NODE_ENV` por `import.meta.env.MODE` em arquivos do frontend, pois `process` não está definido no ambiente do navegador (causava crash na inicialização do preview).
 - Arquivos:
   - `src/providers/QueryProvider.tsx`
   - `src/services/errorReporting.ts`
 - Impacto:
   - O Preview do aplicativo volta a carregar corretamente, eliminando o erro silencioso de inicialização.

## [2026-03-03] - fix: Exportação PDF/CSV de fornecedores com colunas selecionáveis e PDF legível
 - Mudanças:
   - Adicionada seleção de colunas (persistida por equipe) na exportação da página Fornecedores e no Relatório de Pagamentos de Fornecedores.
   - PDF passou a limitar quebra de texto em até 3 linhas por célula (com truncamento), evitando “colunas verticais” ilegíveis.
   - Botão “Exportar” em Fornecedores agora abre uma página dedicada com seleção de colunas e pré-visualização.
   - Adicionados filtros na página de exportação (busca, cidade e estado) para viabilizar “Exportar Filtrado”.
 - Arquivos:
   - `src/components/suppliers/ManageSuppliers.tsx`
   - `src/pages/SupplierExportPage.tsx`
   - `src/components/suppliers/SupplierExportColumnPicker.tsx`
   - `src/components/suppliers/SupplierReportColumnSelector.tsx`
   - `src/components/suppliers/supplierReportColumns.ts`
   - `src/pages/SupplierPaymentsReportPage.tsx`
   - `src/components/suppliers/SupplierPaymentsReportColumnSelector.tsx`
   - `src/components/suppliers/supplierPaymentsReportColumns.ts`
   - `src/utils/exportUtils.ts`
 - Impacto:
   - Exportações deixam de sair desconfiguradas e o usuário consegue exportar apenas as colunas necessárias para o relatório.

## [2026-03-03] - fix: Relatório de fornecedores não quebra a rota ao abrir
 - Mudanças:
   - Corrigido crash por `SelectItem` com value vazio usando sentinel `all` e mapeando para `undefined` nos filtros.
   - Corrigido ReferenceError por acesso a `costsQuery` antes da inicialização (ordem de declaração na página).
   - Ajustado o fetch de `event_supplier_costs` para filtrar no servidor por período/status/fornecedor/evento e limitar volume retornado.
 - Arquivos:
   - `src/pages/SupplierPaymentsReportPage.tsx`
   - `src/hooks/queries/useSupplierCostsQuery.ts`
 - Impacto:
   - A rota `/app/relatorios/pagamentos-fornecedores` abre de forma estável e com melhor performance em equipes grandes.

## [2026-02-26] - fix: Erro 409 ao salvar funções/cachês por função (trigger de função principal)
 - Mudanças:
   - Ajustada a estratégia de substituição de funções no update para evitar conflito do trigger `ensure_primary_function` durante deleções em lote.
   - Inserção em `personnel_functions` passa a ocorrer com a linha primária primeiro para evitar múltiplos `is_primary=true` em inserts multi-row.
 - Arquivos:
   - `src/services/personnelFunctionsService.ts`
   - `src/hooks/queries/usePersonnelQuery.ts`
 - Impacto:
   - Salvar edição de pessoal com múltiplas funções deixa de falhar with `409 Conflict` e os valores por função persistem corretamente.

## [2026-02-25] - fix: Cachê por função e hora extra não persistiam no cadastro de pessoal
 - Mudanças:
   - Ajustada a persistência de `custom_cache`/`custom_overtime` por função com tratamento de erro e rollback seguro.
   - Alinhadas as políticas de escrita da tabela `personnel_functions` para permitir `coordinator` (quando membro aprovado) gerenciar funções/cachês.
 - Arquivos:
   - `supabase/migrations/allow_coordinator_manage_personnel_functions.sql`
   - `src/services/personnelFunctionsService.ts`
   - `src/hooks/queries/usePersonnelQuery.ts`
   - `src/services/__tests__/personnelFunctionsService.test.ts`
 - Impacto:
   - Ao editar/cadastrar uma pessoa com múltiplas funções, os valores por função (cachê e hora extra) passam a salvar e reaparecem corretamente ao reabrir.

## [2026-02-25] - feat: Relatório de Pagamentos de Fornecedores (CSV/PDF)
 - Mudanças:
   - Criada página de relatório com filtros (período, status, fornecedor, evento), totais e tabela.
   - Implementadas queries via React Query para fornecedores e custos, com exportação CSV/PDF.
   - Adicionada rota com `PermissionGuard` (finance) e item no menu Financeiro.
 - Arquivos:
   - `src/pages/SupplierPaymentsReportPage.tsx`
   - `src/hooks/queries/useSuppliersQuery.ts`
   - `src/hooks/queries/useSupplierCostsQuery.ts`
   - `src/hooks/reports/useSupplierPaymentsReport.ts`
   - `src/utils/supplierPaymentsReport.ts`
   - `src/lib/routeAccess.ts`
   - `src/App.tsx`
   - `src/components/AppSidebar.tsx`
   - `src/utils/__tests__/supplierPaymentsReport.test.ts`
 - Impacto:
   - Time financeiro consegue auditar pagamentos de fornecedores por recorte e exportar relatórios.

## [2026-03-03] - fix: Relatório de pagamentos de fornecedores não trava ao abrir
 - Mudanças:
   - Ajustado o fetch de `event_supplier_costs` para filtrar no servidor por período/status/fornecedor/evento e limitar volume retornado.
   - A página de relatório passa a buscar dados já recortados, reduzindo processamento e renderização em datasets grandes.
   - Corrigido crash de UI ao abrir relatório (Radix Select não aceita `SelectItem` com value vazio).
 - Arquivos:
   - `src/hooks/queries/useSupplierCostsQuery.ts`
   - `src/pages/SupplierPaymentsReportPage.tsx`
 - Impacto:
   - Navegação para `/app/relatorios/pagamentos-fornecedores` deixa de “congelar” em equipes com muitos custos lançados.

## [2026-02-20] - fix: Hardening de segurança no Supabase (Security Advisor)
 - Mudanças:
   - Fixado `search_path` (pg_catalog, public) em funções críticas e SECURITY DEFINER para mitigar hijacking.
   - Habilitado RLS em `event_supplier_payments` com políticas alinhadas ao acesso de `event_supplier_costs`.
   - Ajustada a view `freelancer_ratings_enriched` para `security_invoker` quando suportado.
   - Tentativa segura (idempotente) de mover `pg_net`/`pg_cron` para o schema `extensions` quando instaladas em `public`.
 - Arquivos:
   - `supabase/migrations/fix_security_advisor_issues.sql`
 - Impacto:
   - Reduz superfície de ataque em funções SECURITY DEFINER e remove warning de RLS desabilitado em pagamentos de fornecedores.
