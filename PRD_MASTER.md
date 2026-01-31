
## [2026-01-31] - fix: Tratamento de Erro de Notificação e Correção de Histórico de Pagamentos
 - Mudanças:
   - Implementação de "Circuit Breaker" no `notificationService` para desativar tentativas de push notification após falha de conexão/CORS, evitando spam de erros no console.
   - Correção na busca de histórico de pagamentos de fornecedores (`fetchSupplierPayments`) para evitar erro de join com tabela protegida `auth.users`. Agora busca perfis separadamente.
   - Correção de erro de sintaxe (chaves duplicadas) no hook `usePayrollData`.
   - Reforço na tipagem do input de moeda no diálogo de pagamentos.
 - Arquivos:
   - `src/services/notificationService.ts`
   - `src/services/supplierService.ts`
   - `src/components/events/costs/SupplierPaymentDialog.tsx`
   - `src/components/payroll/usePayrollData.ts`
 - Impacto:
   - Eliminação de erros de console bloqueantes/irritantes para o usuário.
   - Restabelecimento da funcionalidade de visualização de histórico de pagamentos.
