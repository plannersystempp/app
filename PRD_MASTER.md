## [2026-03-16] - fix: Remoção da opção de administrador legal no cadastro
 - Mudanças:
   - Removida a opção "Sou o administrador legal" do fluxo de cadastro quando o usuário escolhe cadastrar uma empresa.
   - Ajustada a validação do formulário para não bloquear o envio por confirmação administrativa.
 - Arquivos:
   - `src/components/LoginScreen.tsx`
 - Impacto:
   - Simplifica o cadastro de empresa e reduz fricção no formulário.

## [2026-03-16] - fix: Ajuste de cabeçalho/rodapé e branding no relatório de folha
 - Mudanças:
   - Removido o texto "Relatório de Folha de Pagamento" do topo do relatório por evento.
   - Adicionado rodapé discreto com aviso de uso interno/dados sensíveis (dinâmico conforme colunas) e assinatura "by PlannerSystem".
   - Incluído logo PNG do PlannerSystem no cabeçalho do relatório e normalizadas referências de logo para o PNG em telas principais.
 - Arquivos:
   - `src/components/payroll/PayrollPrintTable.tsx`
   - `src/components/payroll/PayrollReport.tsx`
   - `src/components/payroll/__tests__/PayrollPrintTable.render.test.tsx`
   - `src/components/payroll/__tests__/PayrollPrintTable.sort.test.tsx`
   - `src/components/LoginScreen.tsx`
   - `src/components/AppSidebar.tsx`
 - Impacto:
   - Reduz poluição visual do relatório e adiciona aviso de confidencialidade quando há dados pessoais.
   - Mantém padronização de branding e melhora compatibilidade com verificações automatizadas de UI.

## [2026-03-16] - feat: Cachê diferente por função/divisão no mesmo evento
 - Mudanças:
   - Liberada criação/edição de múltiplas alocações da mesma pessoa no mesmo evento, mantendo a regra de não sobrepor dias.
   - Folha passou a calcular cachê somando taxa por dia, usando a taxa da alocação (cache específico do evento > cache por função > cache padrão).
   - Conversão diária de horas extras passou a usar o cachê do dia (por data) quando disponível.
   - Atualizada a função SQL do dashboard para calcular esperado/pendente somando o cachê por dia/alocação.
 - Arquivos:
   - `src/hooks/queries/useAllocationsQuery.ts`
   - `src/components/events/AllocationEditForm.tsx`
   - `src/components/payroll/payrollCalculations.ts`
   - `src/services/payrollDataService.ts`
   - `src/components/payroll/types.ts`
   - `src/components/payroll/PayrollDetailsCard.tsx`
   - `src/components/payroll/__tests__/payrollCalculations.cache.test.ts`
   - `supabase/migrations/fix_event_payment_status_cache_per_day.sql`
 - Impacto:
   - Permite que o mesmo profissional tenha cachês diferentes por função/divisão dentro do mesmo evento (desde que em dias distintos).
   - Evita que a maior taxa “contamine” todos os dias quando existem alocações com valores diferentes.

## [2026-03-16] - fix: Correção de perda de dados no cadastro de pessoal (RG/nascimento/mãe e cachê por função)
 - Mudanças:
   - Alterado o fluxo de edição do cadastro para enviar ao backend apenas os campos realmente alterados (sem sobrescrever campos não carregados/tocados).
   - Ajustada a substituição de funções (`replacePersonnelFunctions`) para preservar `custom_cache` e `custom_overtime` existentes quando o payload não informa novos valores.
   - Adicionados testes unitários cobrindo o patch de update e a preservação de overrides por função.
 - Arquivos:
   - `src/components/personnel/PersonnelForm.tsx`
   - `src/services/personnelUpdatePayload.ts`
   - `src/services/personnelFunctionsService.ts`
   - `src/services/__tests__/personnelFunctionsService.test.ts`
   - `src/services/__tests__/personnelUpdatePayload.test.ts`
 - Impacto:
   - Evita apagar involuntariamente RG, data de nascimento e nome da mãe ao salvar uma edição.
   - Evita perder o cachê/hora extra configurados por função quando as funções do profissional são atualizadas.

## [2026-03-14] - fix: Blindagem ao alterar taxa de pessoal para não reabrir eventos quitados
 - Mudanças:
   - Adicionada proteção no fluxo de atualização de pessoal (`useUpdatePersonnelMutation`) para congelar automaticamente `event_specific_cache` e `event_specific_overtime` em alocações históricas concluídas e já pagas antes de aplicar mudança em `event_cache`/`overtime_rate`.
   - A proteção usa os valores antigos do cadastro (`old rates`) para impedir retroação de taxa em eventos já quitados.
   - Adicionada migration `20260314133000_protect_historical_rates_on_personnel_update.sql` com trigger `BEFORE UPDATE` em `personnel` para congelar snapshots históricos também no nível de banco.
   - Incluída invalidação adicional de queries de folha/status/pendências/histórico após atualização de pessoal para refletir o estado protegido imediatamente na interface.
 - Arquivos:
   - `src/hooks/queries/usePersonnelQuery.ts`
   - `supabase/migrations/20260314133000_protect_historical_rates_on_personnel_update.sql`
 - Impacto:
   - Qualquer alteração de diária/hora extra por usuário no app deixa de impactar retroativamente eventos concluídos já pagos.
   - Evita recorrência de pendências indevidas no dashboard e no histórico de pagamentos.

## [2026-03-16] - fix: Backfill de snapshots para eventos já quitados com baixa integral
 - Mudanças:
   - Adicionada migration de backfill que preenche `event_specific_cache` e `event_specific_overtime` automaticamente para eventos já pagos via `payroll_closings` quando o snapshot estava vazio.
   - O snapshot é derivado do valor efetivamente pago e do divisor (dias + HE/12, respeitando conversão de HE por equipe), garantindo que mudanças/ajustes de arredondamento no cadastro não reabram pendências de centavos em eventos antigos.
   - Adicionada migration complementar que recalcula `event_specific_overtime` para bater exatamente com o valor quitado quando já existe `event_specific_cache` (ex.: casos de 1 centavo por arredondamento de taxa).
 - Arquivos:
   - `supabase/migrations/20260316110000_backfill_snapshots_from_payroll_closings.sql`
   - `supabase/migrations/20260316114000_backfill_overtime_to_match_paid_when_closed.sql`
 - Impacto:
   - Remove pendências indevidas por arredondamento/alteração de taxa em eventos já fechados.
   - Consolida a regra: após baixa integral, a folha do evento fica fechada e não é afetada por mudanças futuras.

## [2026-03-14] - fix: Correção de pendências históricas do Luiz por retroação de taxa
 - Mudanças:
   - Diagnosticadas pendências históricas no histórico do profissional Luiz Henrique de Oliveira Rodrigues causadas por alteração posterior de diária/HE no cadastro mestre.
   - Aplicada correção de snapshot por evento concluído, preenchendo `event_specific_cache` e `event_specific_overtime` nas alocações de:
     - `PRÊMIO SIND TALKS`
     - `Jornada Transição Energética`
     - `Congresso de Diabetes 2025`
     - `Torneio Robótica 2025`
     - `ANCLIVEPA 4 SALAS`
   - Registrada migration de ajuste para rastreabilidade (`20260314121000_fix_luiz_historical_pending.sql`).
 - Arquivos:
   - `supabase/migrations/20260314121000_fix_luiz_historical_pending.sql`
 - Impacto:
   - Remove pendências indevidas no histórico/dashboards para eventos já quitados do Luiz.
   - Mantém consistência histórica mesmo com mudanças futuras de taxa no cadastro global.

## [2026-03-14] - fix: Congelamento automático de taxa ao quitar pagamento integral da folha
 - Mudanças:
   - Atualizada a ação de pagamento integral em `usePayrollActions.ts` para receber snapshot de taxas do card e, após registrar o `payroll_closings`, persistir `event_specific_cache` e `event_specific_overtime` em `personnel_allocations` do evento/profissional.
   - Incluído rollback do fechamento recém-criado caso a persistência do snapshot falhe, evitando estado inconsistente entre pagamento e congelamento.
   - Expandida a invalidação de cache/queries para refletir imediatamente a baixa e o congelamento no evento, status de pagamento, pendências da equipe e histórico do profissional.
   - Atualizadas assinaturas de callback em `PayrollDetailsCard.tsx` e `PayrollList.tsx` para enviar o snapshot de taxa diária e hora extra no fluxo de quitação integral.
 - Arquivos:
   - `src/components/payroll/usePayrollActions.ts`
   - `src/components/payroll/PayrollDetailsCard.tsx`
   - `src/components/payroll/PayrollList.tsx`
 - Impacto:
   - Ao dar baixa integral, os valores do evento ficam congelados e não sofrem retroação quando a diária/hora extra do cadastro for alterada no futuro.
   - Pendências reais continuam aparecendo no dashboard/histórico, mas casos já quitados deixam de reaparecer por recálculo com taxa atual.

## [2026-03-09] - fix: Correção na validação de nome duplicado ao editar pessoa
 - Mudanças:
   - Atualizada a função `validateUniquePersonnelName` em `src/utils/validation.ts` para usar comparação de ID (`p.id !== currentPersonnelId`) em vez de comparação de nome (`p.name !== name`).
   - Isso elimina falsos positivos de "Nome duplicado" quando o usuário edita o próprio nome (ex: apenas mudando caixa ou espaços).
 - Arquivos:
   - `src/utils/validation.ts`
 - Impacto:
   - Permite que administradores corrijam nomes de pessoas sem serem bloqueados pela validação de duplicidade incorreta.
   - Mantém a proteção contra criação de homônimos reais (outras pessoas com o mesmo nome).

## [2026-03-09] - feat: Busca de pessoal insensível a acentos (unaccent)
 - Mudanças:
   - Implementada extensão `unaccent` no PostgreSQL e criada coluna computada `search_text` (imutável) na tabela `personnel`.
   - Atualizada a função `get_personnel_stats` para usar `unaccent` tanto no termo de busca quanto nos dados.
   - Atualizado o frontend (`usePersonnelQuery.ts`) para normalizar (remover acentos) do termo de busca antes de enviar para a API.
   - Adicionada função utilitária `removeAccents` em `src/lib/utils.ts`.
 - Arquivos:
   - `supabase/migrations/20260309100000_enable_unaccent_search.sql`
   - `src/hooks/queries/usePersonnelQuery.ts`
   - `src/lib/utils.ts`
 - Impacto:
   - A busca por "Andre" agora retorna corretamente "André", "Andre", "Andrè", etc.
   - Melhora significativa na UX, pois o usuário não precisa se preocupar com a acentuação exata ao buscar pessoas.

## [2026-03-11] - feat: Limitação de linhas nos relatórios de pessoal
 - Mudanças:
   - Adicionado `line-clamp-3` (máximo de 3 linhas) com `whitespace-normal` e `break-words` nas células dos relatórios de impressão (`PayrollPrintTable`, `PersonnelPaymentsPrintTable`, `PaymentForecastPrintTable`).
   - Atualizado CSS global (`index.css`) e específico da página (`PayrollReportPage.tsx`) para permitir quebra de linha (`white-space: normal`) em vez de forçar linha única (`nowrap`).
 - Arquivos:
   - `src/components/payroll/PayrollPrintTable.tsx`
   - `src/components/personnel-payments/PersonnelPaymentsPrintTable.tsx`
   - `src/components/payment-forecast/PaymentForecastPrintTable.tsx`
   - `src/pages/PayrollReportPage.tsx`
   - `src/index.css`
 - Impacto:
   - Resolve o problema de sobreposição de informações em células com muito texto nos relatórios.
   - Garante que nomes longos, descrições e observações sejam exibidos corretamente, limitados a 3 linhas para manter o layout da tabela.
