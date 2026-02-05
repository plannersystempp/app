## [2026-02-05] - fix: Correção da exibição de fornecedores na folha de pagamento
 - Mudanças:
   - Corrigido campo de valor de `amount` para `total_amount` na aba de fornecedores.
   - Corrigido campo de status de `status` para `payment_status` para refletir corretamente o estado do pagamento.
   - Adicionados botões de ação para "Pagamento Parcial" e "Pagamento Integral" nos cards de fornecedores.
   - Integrado o componente `SupplierPaymentDialog` para permitir o registro de pagamentos diretamente da folha.
   - Corrigidos os cálculos de totais e contadores de fornecedores.
 - Arquivos:
   - `src/components/payroll/PayrollEventView.tsx`
 - Impacto:
   - Usuários agora podem visualizar corretamente os valores devidos aos fornecedores e registrar seus pagamentos sem sair da tela de gestão financeira do evento.

## [2026-02-05] - refactor: Remoção do campo descrição nas divisões
 - Mudanças:
   - `src/components/events/DivisionForm.tsx`: Removido o campo de descrição do formulário de criação/edição de divisões para simplificar a interface.
 - Arquivos:
   - `src/components/events/DivisionForm.tsx`
 - Impacto:
   - Interface de criação de divisões mais limpa e direta.

## [2026-02-05] - feat: Botão de criar divisão no AllocationManager
 - Mudanças:
   - `src/components/events/AllocationManager.tsx`: Adicionado botão "Criar Divisão" no cabeçalho da gestão de alocações (desktop e mobile) para agilizar a organização.
   - `src/components/events/DivisionForm.tsx`: Atualizado para suportar modo de criação (além de edição), integrando com `useCreateDivisionMutation`.
 - Arquivos:
   - `src/components/events/AllocationManager.tsx`
   - `src/components/events/DivisionForm.tsx`
 - Impacto:
   - Maior agilidade na criação de estrutura organizacional de equipes sem depender de fluxos aninhados.

## [2026-02-05] - feat: Criar Divisão no modal Editar Alocação
 - Mudanças:
   - `src/components/events/AllocationEditForm.tsx`: Campo "Divisão" agora permite buscar e criar novas divisões inline (mesmo evento) durante a realocação.
   - `src/components/events/AllocationEditForm.tsx`: Ao salvar, se a divisão for nova, ela é criada e já vinculada à alocação.
 - Arquivos:
   - `src/components/events/AllocationEditForm.tsx`
 - Impacto:
   - Remove fricção do fluxo de realocação (não precisa sair do modal para cadastrar divisão).

## [2026-02-05] - feat: Design moderno no modal Nova Alocação
 - Mudanças:
   - `src/components/events/AllocationForm.tsx`: Aplicado visual mais moderno (cards com blur/sombra leve, separadores suaves, destaque no resumo) sem alterar lógica.
 - Arquivos:
   - `src/components/events/AllocationForm.tsx`
 - Impacto:
   - Melhor hierarquia visual e sensação de produto mais atual.

## [2026-02-05] - feat: Nova Alocação (UX – Layout, Resumo e Validações)
 - Mudanças:
   - `src/components/events/AllocationForm.tsx`: Reformulado layout em seções (Cards) com painel de resumo sticky, exibindo contexto do evento e melhorando legibilidade.
   - `src/components/events/AllocationForm.tsx`: Botão de salvar agora fica desabilitado até preencher campos obrigatórios, reduzindo tentativas falhas.
   - `src/components/events/AllocationForm.tsx`: Validação preventiva de conflito de dias (sobreposição) para evitar erro do banco e dar feedback claro.
   - `src/components/events/AllocationForm.tsx`: Feedback imediato ao criar nova divisão (toast + aviso "será criada ao salvar").
   - `src/components/events/allocation/useAllocationForm.ts`: `isFormValid` passa a considerar dias selecionados.
   - `src/components/events/allocation/PersonnelSelector.tsx` e `src/components/events/allocation/MultiPersonnelSelector.tsx`: Ajustado `PersonnelForm` para uso sem `any`.
 - Arquivos:
   - `src/components/events/AllocationForm.tsx`
   - `src/components/events/allocation/useAllocationForm.ts`
   - `src/components/events/allocation/PersonnelSelector.tsx`
   - `src/components/events/allocation/MultiPersonnelSelector.tsx`
 - Impacto:
   - Fluxo de alocação mais guiado e eficiente (menos cliques/erros e mais previsibilidade).
   - Melhor feedback visual e operacional em criação de divisão.

## [2026-02-05] - fix: Criação de Divisão Inline - Feedback Visual e Funcional
 - Mudanças:
   - `src/components/ui/creatable-combobox.tsx`: Adicionada prop `allowCreate` e corrigida lógica para exibir botão de criação apenas quando houver texto digitado.
   - `src/components/events/allocation/DivisionSelector.tsx`: Reimplementada lógica de seleção para distinguir entre seleção de divisão existente e criação de nova divisão, garantindo feedback visual imediato.
 - Arquivos:
   - `src/components/ui/creatable-combobox.tsx`
   - `src/components/events/allocation/DivisionSelector.tsx`
 - Impacto:
   - Resolve o bug crítico onde criar uma nova divisão não fornecia feedback visual. Agora o nome da nova divisão aparece imediatamente no campo após clicar em "Criar".

## [2026-02-05] - fix: Correção de Persistência de Estado (Loop de Alocação)
 - Mudanças:
   - `src/components/events/allocation/useAllocationFormPersistence.ts`: Adicionada verificação com `useRef` para garantir que o estado do formulário seja carregado do `sessionStorage` apenas uma vez ao abrir o modal.
 - Arquivos:
   - `src/components/events/allocation/useAllocationFormPersistence.ts`
 - Impacto:
   - Resolve o bug crítico onde qualquer atualização de estado no formulário de alocação (como criar uma nova divisão) disparava um re-carregamento imediato do estado antigo salvo, revertendo a ação do usuário e dando a impressão de que "nada acontecia".

## [2026-02-05] - fix: Feedback visual na criação de Divisão Inline
 - Mudanças:
   - `src/components/events/allocation/DivisionSelector.tsx`: Atualizado para exibir corretamente o nome da nova divisão sendo criada (modo 'new') no `CreatableCombobox`.
   - `src/components/events/AllocationForm.tsx`: Atualizado para passar `divisionMode` e `newDivisionName` para o seletor e gerenciar corretamente a limpeza do estado ao selecionar uma divisão existente.
 - Arquivos:
   - `src/components/events/allocation/DivisionSelector.tsx`
   - `src/components/events/AllocationForm.tsx`
 - Impacto:
   - Resolve o bug onde clicar em "Criar nova divisão" parecia não ter efeito visual (embora funcionasse internamente), dando feedback imediato ao usuário.

## [2026-02-05] - feat: Melhorias de UX e Features (Parte 2)
 - Mudanças:
   - **Divisão de Alocação (Inline):** Criado componente `CreatableCombobox` e atualizado `DivisionSelector` para permitir criar divisões diretamente no dropdown de alocação.
   - **Dados Pessoais Sensíveis:** Adicionados campos CPF, RG, Nome da Mãe e Data de Nascimento ao cadastro de pessoal, relatório e serviço de folha de pagamento.
   - **Calendário de Eventos:** Nova visualização de calendário mensal/semanal (`EventsCalendarView`) usando `react-big-calendar`.
   - **Categorização Financeira:** A tela de Folha de Pagamento do Evento agora possui abas separadas para "Staff" (Freelancers) e "Fornecedores", consolidando os custos totais do evento.
 - Arquivos:
   - `src/components/ui/creatable-combobox.tsx`
   - `src/components/events/allocation/DivisionSelector.tsx`
   - `src/components/personnel/PersonnelFormFields.tsx`
   - `src/components/payroll/PayrollReport.tsx`
   - `src/services/payrollDataService.ts`
   - `src/components/events/EventsCalendarView.tsx`
   - `src/components/payroll/PayrollEventView.tsx`
   - `src/contexts/EnhancedDataContext.tsx`
   - `supabase/migrations/20260205_add_personnel_sensitive_fields.sql`
 - Impacto:
   - Melhora significativa no fluxo de trabalho de coordenadores (criação rápida de divisões).
   - Compliance com requisitos de documentação legal (dados pessoais).
   - Visão holística dos custos do evento (pessoal + fornecedores).

## [2026-02-05] - fix/feat: Correções de Regressão e Melhorias de UX
 - Mudanças:
   - **Horário Padrão:** Adicionada invalidação de cache explícita para alocações (`['allocations']`) ao atualizar eventos ou divisões, garantindo que a UI reflita as mudanças de horário padrão imediatamente.
   - **Drag & Drop Mobile:** Substituído `PointerSensor` por `MouseSensor` + `TouchSensor` e adicionado `touch-action: none` para resolver conflitos de gesto em dispositivos móveis.
   - **Busca na Folha:** Adicionado campo de busca por nome na visualização de Folha de Pagamento do Evento.
   - **Fix Import Duplicado:** Removida importação duplicada de `useEnhancedData` em `PayrollEventView.tsx` que causava crash na aplicação.
 - Arquivos:
   - `src/hooks/queries/useEventsQuery.ts`
   - `src/hooks/queries/useDivisionsQuery.ts`
   - `src/components/events/AllocationManager.tsx`
   - `src/components/payroll/PayrollEventView.tsx`
 - Impacto:
   - Resolve bugs críticos de atualização de dados e usabilidade mobile.
   - Facilita a gestão de pagamentos em eventos com muitos profissionais.
   - Corrige erro fatal de execução do React.

## [2026-02-05] - fix/feat: Edição de Data de Vencimento e Gestão de Custos
 - Mudanças:
   - `src/services/supplierService.ts`: Atualizado `updateEventSupplierCost` para permitir a atualização do campo `payment_date` (anteriormente removido na sanitização), possibilitando a edição de datas de vencimento/pagamento.
   - `src/components/events/costs/AddSupplierCostDialog.tsx`:
     - Adicionado campo `payment_date` ao formulário de edição (visível mesmo para custos já existentes).
     - Rótulo dinâmico "Data de Vencimento" (se pendente) ou "Data do Pagamento".
     - Incluído `payment_date` no payload de envio/atualização.
     - Adicionado botão "X" para limpar (excluir) a data de vencimento facilmente.
 - Arquivos:
   - `src/services/supplierService.ts`
   - `src/components/events/costs/AddSupplierCostDialog.tsx`
 - Impacto:
   - Permite aos usuários corrigir ou reprogramar a data de vencimento de custos de fornecedores pendentes diretamente pelo modal de edição, atendendo à solicitação de flexibilidade na gestão de prazos.

## [2026-02-04] - feat: Filtros rápidos na Gestão de Eventos
 - Mudanças:
   - Adicionado dropdown de filtro rápido com opções: Mês atual, Mês passado, Últimos 3 meses, Ano atual, Últimos 12 eventos.
   - Implementada lógica de filtragem por período e limite de quantidade (top N recentes).
   - Atualizada a listagem e exportação para respeitar os filtros e limites aplicados.
 - Arquivos:
   - `src/components/events/ManageEvents.tsx`
 - Impacto:
   - Facilita a navegação e visualização de eventos recentes ou de períodos específicos, melhorando a UX para listas longas.

## [2026-02-04] - fix: Ajuste Divisor Hora Extra (10h -> 12h)
 - Mudanças:
   - `src/components/payroll/payrollCalculations.ts`: Atualizado divisor de cálculo de taxa implícita de hora extra de 10h para 12h, refletindo a jornada padrão correta do negócio.
   - `src/components/payroll/__tests__/payrollCalculations.overtime.test.ts`: Atualizados casos de teste para validar o novo divisor.
 - Arquivos:
   - `src/components/payroll/payrollCalculations.ts`
   - `src/components/payroll/__tests__/payrollCalculations.overtime.test.ts`
 - Impacto:
   - A taxa implícita de hora extra (calculada a partir do cachê) será menor (Cachê/12 em vez de Cachê/10), tornando o cálculo mais preciso em relação à jornada real de 12 horas.

## [2026-02-04] - fix: Ajuste Proporcional da Taxa de Hora Extra (Cachê Específico)
 - Mudanças:
   - `src/components/payroll/payrollCalculations.ts`: Atualizada a função `getOvertimeRate` para calcular uma taxa implícita baseada no cachê diário (dividido por 10h, padrão de eventos) quando esta for maior que a taxa fixa da função.
   - `src/components/payroll/__tests__/payrollCalculations.overtime.test.ts`: Adicionados testes para garantir que o sistema escolha a maior taxa entre a fixa e a proporcional ao cachê.
 - Arquivos:
   - `src/components/payroll/payrollCalculations.ts`
   - `src/components/payroll/__tests__/payrollCalculations.overtime.test.ts`
 - Impacto:
   - Garante que profissionais com cachê específico elevado recebam horas extras proporcionais ao valor do dia, corrigindo a discrepância onde a taxa de HE ficava defasada em relação ao cachê.

## [2026-02-04] - fix: Correção no Cálculo de Horas Extras (Taxa por Função)
 - Mudanças:
   - `src/components/payroll/payrollCalculations.ts`: Atualizada função `calculateOvertimePay` para receber alocações e buscar a taxa de hora extra correta (priorizando função/cargo sobre taxa padrão).
   - `src/services/payrollDataService.ts`: Ajustado para usar `getOvertimeRate` com as alocações ao montar os detalhes de pagamento.
   - `src/hooks/queries/useMonthlyPayrollQuery.ts`: Ajustado para usar `getOvertimeRate` com as alocações nos cálculos mensais.
   - `src/components/payroll/__tests__/payrollCalculations.overtime.test.ts`: Adicionado teste de unidade para garantir regressão e comportamento correto de fallback.
 - Arquivos:
   - `src/components/payroll/payrollCalculations.ts`
   - `src/services/payrollDataService.ts`
   - `src/hooks/queries/useMonthlyPayrollQuery.ts`
   - `src/components/payroll/__tests__/payrollCalculations.overtime.test.ts`
 - Impacto:
   - Resolve o bug onde horas extras apareciam com valor "R$ 0,00" quando o profissional tinha taxa definida na função mas não no perfil base. O valor agora é calculado e somado corretamente ao total.

## [2026-02-04] - fix: Anti-sumiço de fotos no Cadastro de Pessoal (photo_url canônico)
 - Mudanças:
   - `photo_url` deixa de receber cache-busting via querystring no hook de pessoal, evitando persistência de URLs com `?v=` no banco.
   - Formulário normaliza `photo_url` (remove querystring) antes de salvar e bloqueia submit enquanto upload da foto estiver em andamento.
   - Rotina de limpeza de fotos órfãs passa a ignorar querystring ao comparar referências e pagina a listagem do bucket para maior confiabilidade.
   - Remoção de foto no formulário passa a extrair o filename sem querystring.
 - Arquivos:
   - `src/hooks/queries/usePersonnelQuery.ts`
   - `src/components/personnel/PersonnelForm.tsx`
   - `src/components/personnel/PersonnelFormFields.tsx`
   - `src/components/personnel/PersonnelFormActions.tsx`
   - `src/components/personnel/PersonnelPhotoUpload.tsx`
   - `src/utils/url.ts`
   - `supabase/functions/cleanup-orphan-photos/index.ts`
   - `supabase/migrations/strip_photo_url_querystring.sql`
   - `supabase/migrations/sanitize_personnel_fields_strip_photo_url_query.sql`
 - Impacto:
   - Evita deleção indevida de imagens por rotina de "órfãs" e reduz risco de perder referência de foto em edições/salvamentos.

## [2026-02-03] - fix: Modal Gerenciar Pagamentos (digitação e histórico)
 - Mudanças:
   - `src/components/events/costs/SupplierPaymentDialog.tsx`: estabilizado o carregamento do histórico para rodar apenas ao abrir o modal ou trocar `cost.id`, evitando reset contínuo de `amount` e spinner infinito.
   - `src/components/events/costs/SupplierPaymentDialog.tsx`: adicionado timeout no fetch do histórico para não ficar preso em loading em caso de rede lenta/travada.
   - `src/components/ui/currency-input.tsx`: ajustado fluxo de foco/blur para não sobrescrever o texto durante a digitação (formata em moeda apenas no blur).
 - Arquivos:
   - `src/components/events/costs/SupplierPaymentDialog.tsx`
   - `src/components/ui/currency-input.tsx`
 - Impacto:
   - Permite digitar valores normalmente no campo "Valor" e evita o carregamento infinito do histórico no modal.

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
