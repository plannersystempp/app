## [2026-02-19] - fix: Plano vitalício não expira e superadmin não entra em checkout
 - Mudanças:
   - Plano `lifetime` agora usa checkout de pagamento único (sem assinatura recorrente) e a ativação registra `gateway_payment_intent_id`.
   - `team_subscriptions.current_period_ends_at` passa a aceitar `NULL` para planos vitalícios e o job de expiração ignora `lifetime`.
   - Fluxos de checkout/verify-payment bloqueiam superadmin (bypass) para evitar erros e cobranças indevidas.
   - UI de planos desabilita checkout para superadmin e a tela de sucesso exibe corretamente “pagamento único” quando `billing_cycle=lifetime`.
 - Arquivos:
   - `supabase/migrations/plan_lifetime_not_expiring.sql`
   - `supabase/functions/create-checkout-session/index.ts`
   - `supabase/functions/verify-payment/index.ts`
   - `supabase/functions/stripe-webhooks/index.ts`
   - `supabase/functions/check-subscriptions/index.ts`
   - `src/hooks/useStripeCheckoutEnhanced.ts`
   - `src/hooks/useVerifyPayment.ts`
   - `src/hooks/useSubscriptionActions.ts`
   - `src/pages/PlansPage.tsx`
   - `src/pages/PaymentSuccess.tsx`
   - `src/pages/ManageSubscription.tsx`
 - Impacto:
   - Assinaturas vitalícias deixam de vencer mensalmente e não exigem reativação manual.
   - Superadmin mantém acesso total sem passar por fluxo de pagamentos, reduzindo erros operacionais.

## [2026-02-13] - fix: Dias de trabalho no relatório da folha agora refletem alocação
 - Mudanças:
   - Padronizado o cálculo com `calculateWorkedDaysList`, retornando a lista real de dias (únicos) por pessoa e descontando faltas registradas.
   - `payrollDataService` passa a preencher `workDaysList` no `PayrollDetails`, permitindo renderização correta do período por pessoa.
   - Removido fallback incorreto que gerava range artificial (ex.: primeiros N dias do evento) quando só existia contagem.
   - Adicionados testes cobrindo lista de dias no print e cálculo de dias (incluindo faltas).
 - Arquivos:
   - `src/components/payroll/payrollCalculations.ts`
   - `src/services/payrollDataService.ts`
   - `src/pages/PayrollReportPage.tsx`
   - `src/components/payroll/PayrollPrintTable.tsx`
   - `src/components/payroll/__tests__/PayrollPrintTable.workdays-list.test.tsx`
   - `src/components/payroll/__tests__/payrollCalculations.workdays.test.ts`
   - `vitest.setup.ts`
 - Impacto:
   - A coluna "Dias de trabalho" passa a exibir exatamente os dias alocados (ex.: 4–7) em vez de um período inferido incorretamente.
   - Relatórios/exportações ficam consistentes com a alocação por pessoa e evitam divergências visuais.

## [2026-02-11] - fix: Exibir RG, Data de Nascimento e Nome da Mãe no Cadastro de Pessoal
 - Mudanças:
   - Criada RPC `get_personnel_with_functions_v2` incluindo `rg`, `birth_date` e `mothers_name` (e `custom_overtime` nas funções).
   - Ajustado o fetch de admins/superadmins para usar a nova RPC e carregar corretamente os campos sensíveis.
   - Formulário de edição agora reidrata RG, Data de Nascimento e Nome da Mãe a partir do registro salvo.
 - Arquivos:
   - `supabase/migrations/fix_rpc_get_personnel_with_functions_sensitive_fields.sql`
   - `src/hooks/queries/usePersonnelQuery.ts`
   - `src/components/personnel/PersonnelForm.tsx`
   - `src/components/personnel/PersonnelFormFields.tsx`
   - `src/services/personnelFormMapper.ts`
   - `src/types/personnelForm.ts`
   - `src/services/__tests__/personnelFormMapper.test.ts`
 - Impacto:
   - Dados cadastrados (RG, nascimento e nome da mãe) passam a aparecer para usuários com acesso (admin/superadmin), evitando edição “vazia” e inconsistência de exibição.

## [2026-02-11] - fix: Totais Gerais nos Cards de Estatísticas (Gestão de Pessoal)
 - Mudanças:
   - Os cards de estatísticas (Total, Fixos, Freelancers, Cachê Médio) agora refletem o total global do banco de dados (filtrado), em vez de apenas os itens da página atual.
   - Criada RPC `get_personnel_stats` para cálculo eficiente no backend.
   - Adicionado hook `usePersonnelStatsQuery` para consumir os dados.
 - Arquivos:
   - `supabase/migrations/20260211153000_get_personnel_stats.sql`
   - `src/hooks/queries/usePersonnelQuery.ts`
   - `src/components/personnel/ManagePersonnel.tsx`
   - `src/components/personnel/PersonnelStats.tsx`
 - Impacto:
   - Cards de estatísticas agora mostram números reais e úteis para a gestão, corrigindo a confusão causada pela paginação.

## [2026-02-10] - feat: Exportação de Pessoal em página dedicada (PDF/CSV com colunas dinâmicas)
 - Mudanças:
   - Ao clicar em "Exportar" na Gestão de Pessoal, o usuário vai para uma página dedicada de exportação.
   - A página permite escolher: escopo (Filtrado/Todos), colunas (seleção em lote) e formato (PDF ou CSV pronto para Excel).
   - Seleção de colunas é persistida por equipe via localStorage.
 - Arquivos:
   - `src/pages/PersonnelExportPage.tsx`
   - `src/components/personnel/PersonnelExportColumnPicker.tsx`
   - `src/components/personnel/personnelExportColumns.ts`
   - `src/components/personnel/ManagePersonnel.tsx`
   - `src/App.tsx`
 - Impacto:
   - Fluxo de exportação fica mais claro e flexível, reduzindo dúvidas e retrabalho na geração de relatórios.

## [2026-02-10] - feat: Relatório de Pessoal em PDF personalizável (colunas dinâmicas)
 - Mudanças:
   - Adicionado seletor de colunas do PDF no Cadastro de Pessoal, permitindo escolher quais campos entram no relatório.
   - Seleção de colunas é persistida por time via localStorage.
 - Arquivos:
   - `src/components/personnel/ManagePersonnel.tsx`
   - `src/components/personnel/PersonnelPdfColumnSelector.tsx`
   - `src/components/personnel/personnelPdfColumns.ts`
   - `src/utils/exportUtils.ts`
 - Impacto:
   - Usuário controla densidade do PDF (melhor legibilidade) sem perder capacidade de exportar dados.

## [2026-02-10] - fix: Corrigir acentuação no CSV ao abrir direto no Excel
 - Mudanças:
   - Exportação CSV passa a gerar arquivo em UTF-16LE com BOM (mais compatível com Excel no Windows), evitando textos corrompidos (ex: "AndrÃ©").
 - Arquivos:
   - `src/utils/exportUtils.ts`
 - Impacto:
   - Nomes e campos com acentos abrem corretamente no Excel sem precisar de importação manual.

## [2026-02-10] - fix: Exportação de Pessoal mais intuitiva e CSV compatível com Excel
 - Mudanças:
   - Menu "Exportar" no Cadastro de Pessoal passa a ter apenas 2 ações: CSV e PDF.
   - Seleção do escopo do CSV (Filtrado/Todos) foi movida para um seletor ao lado, reduzindo ambiguidade.
   - CSV passa a sair com separador `;`, linha `sep=;`, UTF-8 com BOM e CRLF para abrir corretamente no Excel (colunas e acentuação).
   - PDF permanece restrito ao modo filtrado (exige ao menos um filtro aplicado).
 - Arquivos:
   - `src/components/personnel/ManagePersonnel.tsx`
   - `src/utils/exportUtils.ts`
 - Impacto:
   - Exportação fica mais simples de entender e o CSV abre como planilha no Excel sem “quebrar” colunas.

## [2026-02-10] - feat: Exportação avançada do Cadastro de Pessoal (CSV/PDF)
 - Mudanças:
   - Exportação de Pessoal agora permite:
     - CSV completo com todos os campos, com opção de exportar "Filtrado" (respeita busca/tipo/função/ordenação) ou "Todos".
     - PDF apenas no modo "Filtrado", em layout compacto para evitar excesso de colunas por página.
   - Exportação passa a buscar todos os registros no backend (não mais apenas a página atual) quando necessário.
 - Arquivos:
   - `src/components/personnel/ManagePersonnel.tsx`
   - `src/hooks/queries/usePersonnelQuery.ts`
   - `src/components/shared/ExportDropdown.tsx`
 - Impacto:
   - Atende a necessidade de auditoria/operacional com CSV completo e dá previsibilidade no PDF, mantendo legibilidade.

---
## Histórico Antigo
> **Nota:** Logs anteriores a 2026-02-10 foram movidos para manter este arquivo limpo.
> Consulte o histórico completo em: [PRD_ARCHIVE.md](./PRD_ARCHIVE.md)
