## Objetivo
Melhorar o card “Fornecedores” do Dashboard para detalhar a origem dos custos por evento, com filtros claros de período e status, mantendo KPIs resumidos e adicionando uma visão expandida com agrupamento por evento.

## Alterações de UI
1. Manter KPIs atuais (Total Cadastrados, Custos Pendentes, Total Pago, Total Pendente) filtrados pelo período.
2. Adicionar um bloco "Detalhes por Evento" abaixo dos KPIs usando `Accordion` (Radix):
   - Cabeçalho: nome do evento + período (datas do evento) + badges com totais (pendente/pago).
   - Conteúdo: lista de custos do fornecedor no período para o evento (linhas: `supplier_name`, `description`, `quantity × unit_price = total_amount`, `paid_amount`, `payment_status`, `payment_date`).
   - Link de ação: botão "Ir para o evento" (`/app/eventos/{id}`).
3. Adicionar chips de filtro de status dentro da seção "Detalhes por Evento": `todos | pendente | pago`.

## Lógica e Organização (SoC)
- Criar hook `hooks/dashboard/useSupplierCostsByEvent.ts`:
  - Entrada: `eventSupplierCosts`, `events`, `range`, `status`.
  - Saída: array de grupos `{ eventId, name, start_date, end_date, totals: { paidAmount, pendingAmount, paidCount, pendingCount }, items: [...] }`.
  - Implementar com `useMemo` e funções puras.
- Funções puras em `src/utils/supplierCostAggregations.ts` (TDD):
  - `groupSupplierCostsByEvent(costs, events)`
  - `calcEventSupplierTotals(items)`
  - `filterSupplierCostsByStatus(items, status)` (análoga a `filterPaymentsByStatus`).
- Reutilizar `filterSupplierCostsByDateRange` já existente para aplicar o período antes do agrupamento.

## Pontos de Integração
- `src/components/Dashboard.tsx`:
  - Importar o hook novo e renderizar a seção `Accordion` com grupos por evento.
  - Adicionar chips de status: usar componente `FilterChips` (`todos | pendente | pago`).
  - Manter `suppliersRange` (já criado) como fonte única para período; criar `suppliersStatus` com `usePersistentFilter`.
- UI components:
  - Usar `src/components/ui/accordion.tsx` já disponível.
  - Formatação com `formatCurrency` existente.

## Regras de Cálculo
- Período:
  - Custos pagos: considerar `payment_date`.
  - Custos pendentes: considerar `created_at`.
- Totais:
  - `paidAmount`: soma de `paid_amount` em itens `paid`.
  - `pendingAmount`: soma de `(total_amount - paid_amount)` em itens não pagos.
  - `paidCount`, `pendingCount`: contagem por status.

## Testes (TDD)
- `src/utils/__tests__/supplierCostAggregations.test.ts`:
  - Agrupamento por evento gera totais consistentes.
  - Filtros de período e status respeitam as regras acima.
  - Casos sem datas definidas são ignorados corretamente.

## Desempenho e UX
- `useMemo` para evitar recomputações.
- Limitar exibição a top 5 eventos por `pendingAmount`, com botão "Ver todos".
- Estado persistente para filtros (`usePersistentFilter`).

## Entregáveis
- Novos utilitários de agregação.
- Hook `useSupplierCostsByEvent`.
- Bloco "Detalhes por Evento" no card Fornecedores com `Accordion`, filtros e navegação.

## Verificação
- Rodar dev (`localhost:8080`) e validar:
  - KPIs variam ao trocar período.
  - Seção detalhada lista corretamente por evento e por status.
  - Navegação para página do evento funciona.

Confirmando, implemento e deixo pronto com testes e verificação no preview.