## [2026-02-03] - fix: Estabilidade no Cadastro de Fornecedores (loading state)
 - Mudanças:
   - `src/contexts/TeamContext.tsx`: `refreshTeams` deixa de setar `loading=true` se já existir um time ativo, evitando unmount/remount de componentes protegidos por `PermissionGuard` quando o usuário é atualizado (ex: refresh de token ao focar na janela).
 - Arquivos:
   - `src/contexts/TeamContext.tsx`
 - Impacto:
   - Resolve o problema de fechamento do modal e perda de dados ao trocar de aba no navegador (que disparava atualização de sessão).

## [2026-02-03] - fix: Cadastro de fornecedores não fecha ao trocar de aba interna
 - Mudanças:
   - `TabsTrigger` passa a aplicar `type="button"` por padrão (mantém override via prop `type`).
 - Arquivos:
   - `src/components/ui/tabs.tsx`
 - Impacto:
   - Evita submit/fechamento acidental do modal quando Tabs estiver dentro de `<form>`.

## [2026-02-03] - fix: Cache e Otimização de Performance na Folha de Pagamento
 - Mudanças:
   - `src/components/payroll/usePayrollData.ts`: Refatorado para usar `usePayrollQuery` (React Query) internamente, eliminando fetch manual e duplicado.
   - `src/components/payroll/usePayrollActions.ts`: Atualizado para usar `queryClient.invalidateQueries` em vez de manipulação manual de estado, garantindo SSOT e re-fetch automático limpo.
   - `src/components/payroll/PayrollEventView.tsx`: Atualizada chamada do hook de ações para remover argumento depreciado.
 - Arquivos:
   - `src/components/payroll/usePayrollData.ts`
   - `src/components/payroll/usePayrollActions.ts`
   - `src/components/payroll/PayrollEventView.tsx`
 - Impacto:
   - Elimina o problema de "demora para carregar ao sair e voltar da tela", pois os dados agora persistem em cache por 1 minuto (staleTime) e 5 minutos (gcTime).
   - Melhora a consistência dos dados após ações de pagamento, pois força atualização via servidor em vez de update otimista local propenso a erros.

## [2026-02-03] - fix: Horário padrão persiste e reflete em Presença/Alocações

## [2026-02-03] - fix: Tratamento de Erro no Checkout
 - Mudanças:
   - `src/hooks/useStripeCheckout.ts`: Melhoria na extração de erros da Edge Function. Agora tenta ler o corpo da resposta (JSON ou Texto) mesmo em falhas 500/400, e expõe a mensagem real do servidor em vez de um erro genérico.
 - Arquivos:
   - `src/hooks/useStripeCheckout.ts`
 - Impacto:
   - Permite diagnosticar falhas de produção (como config do Stripe ou timeouts) que antes eram mascaradas como "Falha ao iniciar o checkout".
   - Melhora a UX informando erros mais precisos quando disponíveis.