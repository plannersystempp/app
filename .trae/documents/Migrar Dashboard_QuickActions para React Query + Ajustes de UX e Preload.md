## Objetivo
- Remover dependências do EnhancedDataContext em `Dashboard` e `QuickActions`, usando exclusivamente hooks do React Query.
- Ocultar o aviso de preload da logo ajustando a estratégia de carregamento.
- Adicionar a ação “+ Cadastrar nova pessoa” na seleção múltipla para paridade de UX.

## Escopo
- Componentes: `src/components/Dashboard.tsx`, `src/components/dashboard/QuickActions.tsx`, `src/components/events/allocation/MultiPersonnelSelector.tsx`.
- Hooks: `useEventsQuery`, `usePersonnelQuery`, `useFunctionsQuery`, `useAllocationsQuery`, `useMyEventPermissions`, `useCreateWorkLogMutation`.
- HTML: `index.html` (preload da logo).

## Alterações Propostas
### 1) Dashboard: migrar para React Query
- Substituir `useEnhancedData()` por hooks individuais:
  - `const { data: events = [] } = useEventsQuery()`
  - `const { data: personnel = [] } = usePersonnelQuery()`
  - `const { data: functions = [] } = useFunctionsQuery()`
  - `const { data: eventSupplierCosts = [] } = useEventSupplierCostsQuery()` (se existir; caso contrário, manter via serviço/hook específico já no projeto)
  - `const { data: suppliers = [] } = useSuppliersQuery()` (idem)
- Atualizar variáveis derivadas, `useMemo` e `useEffect` para usar os arrays acima.
- Remover imports do contexto e de tipos associados ao contexto legado.
- Manter hooks auxiliares já existentes (ex.: `useSubscriptionGuard`, `useEventsInProgress`, `useUpcomingPayments`).

### 2) QuickActions: migrar para React Query e corrigir mutations
- Substituir `useEnhancedData()` por:
  - `const { data: events = [] } = useEventsQuery()`
  - `const { data: assignments = [] } = useAllocationsQuery()`
  - `const { mutateAsync: createWorkLog } = useCreateWorkLogMutation()`
  - `const { data: personnel = [] } = usePersonnelQuery()`
- Trocar `addWorkLog(...)` por `createWorkLog({ employee_id, event_id, work_date, hours_worked, overtime_hours, total_pay })`.
- Garantir invalidation correta ao terminar (`onSuccess` do mutation) para queries de `workLogs`/`allocations` (usar a configuração já existente do hook).
- Manter `useMyEventPermissions()` para filtragem de eventos e manter o cálculo de `eventsForUser` dentro do componente.

### 3) MultiPersonnelSelector: ação “+ Cadastrar nova pessoa”
- Adicionar um botão “+ Cadastrar nova pessoa” ao lado do campo de busca (somente para admin/superadmin).
- Acionar `setShowCreateForm(true)` ao clicar.
- Manter o fluxo atual de `PersonnelForm` (render condicional já presente) e fechamento no sucesso.

### 4) Preload da logo
- Em `index.html`, trocar `<link rel="preload" href="/icons/logo_plannersystem.png" as="image" ...>` por uma de duas opções:
  - Opção A (recomendado): `rel="prefetch"` para baixar com baixa prioridade e evitar aviso.
  - Opção B: remover a linha se a logo não é usada imediatamente na primeira pintura.
- Justificativa: o aviso ocorre quando o recurso preloaded não é consumido logo após o load; `prefetch` ou remoção evita o warning sem impacto visual.

## Testes
- Atualizar e/ou criar testes unitários para `QuickActions`:
  - Mockar `useCreateWorkLogMutation` e garantir que `handleQuickOvertime` chama a mutação com payload correto.
- Adicionar teste para `MultiPersonnelSelector` verificando presença do CTA e abertura do formulário.
- Foco nos testes existentes do dashboard (mantê-los, ajustando mocks para hooks `use*Query`).

## Validação Manual
- Rodar o dev server em `http://localhost:8080/`.
- Navegar:
  - Dashboard: verificar KPIs e cartões carregando corretamente sem `EnhancedDataContext`.
  - QuickActions: validar fluxo de lançamento de hora extra e filtragem de eventos por permissão.
  - Seleção múltipla: confirmar que o botão “+ Cadastrar nova pessoa” aparece e abre o formulário.
  - Console: confirmar ausência do warning de preload da logo.

## Riscos e Mitigação
- Risco: queries adicionais podem alterar timing de render. Mitigar com `staleTime` adequado e skeletons (já presentes).
- Risco: ausência de hooks para `eventSupplierCosts`/`suppliers`. Mitigar usando serviços/hooks existentes no projeto e planejar migração subsequente.
- Risco: invalidação de cache pós-mutation. Mitigar confiando na configuração de `useCreateWorkLogMutation` e adicionando invalidações manuais se necessário.

## Entregáveis
- Components atualizados para usar React Query.
- CTA adicionada em seleção múltipla.
- Ajuste do preload/prefetch da logo.
- Testes atualizados/cobertura mínima garantida.

Confirma que posso executar estas mudanças agora?