## [2026-02-04] - fix: Estabilização do Preview e Otimização Vite
 - Mudanças:
   - `src/hooks/usePWA.ts`: Registro do Service Worker restringido apenas para modo produção ou via parâmetro `?pwa=1`, evitando conflitos de cache e `ERR_ABORTED` durante o desenvolvimento.
   - `vite.config.ts`: Adicionadas configurações de `hmr`, `watch` (polling) e expansão de `optimizeDeps` para melhorar a estabilidade do servidor de desenvolvimento em projetos de grande escala.
   - Executado build de produção e inicializado via `npm run preview` para garantir disponibilidade imediata e estável na porta 8080.
 - Arquivos:
   - `src/hooks/usePWA.ts`
   - `vite.config.ts`
   - `PRD_MASTER.md`
 - Impacto:
   - Preview funcional e estável na porta 8080. Melhor performance do HMR e eliminação de erros de carregamento de módulos causados por Service Workers residuais.

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
   - Evita deleção indevida de imagens por rotina de “órfãs” e reduz risco de perder referência de foto em edições/salvamentos.

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

## [2026-02-03] - fix: Tratamento de Erro no Checkout
 - Mudanças:
   - `src/hooks/useStripeCheckout.ts`: Melhoria na extração de erros da Edge Function. Agora detecta explicitamente erro 404 (Função não deployada) e tenta ler o corpo da resposta (JSON ou Texto) em outras falhas, expondo a mensagem real do servidor.
 - Arquivos:
   - `src/hooks/useStripeCheckout.ts`
 - Impacto:
   - Identifica claramente quando a função de checkout não está deployada (404), instruindo correções de infraestrutura.
   - Melhora a UX informando "Serviço indisponível" em vez de erro genérico em caso de falha de rota.

## [2026-02-03] - fix: Correção Robusta do CurrencyInput (Cursor e Digitação)
 - Mudanças:
   - `src/components/ui/currency-input.tsx`: Simplificada a lógica de cursor para comportamento padrão do navegador, removendo `useLayoutEffect` que forçava posição e causava conflitos visuais (mouse sumindo).
   - Removido `console.log` de depuração.
   - Propriedade `max` filtrada para não ser repassada ao elemento DOM, evitando validações nativas indesejadas em inputs de texto.
   - Ajustado para `type="tel"` para melhor suporte mobile e menos interferência nativa de desktop.
 - Arquivos:
   - `src/components/ui/currency-input.tsx`
 - Impacto:
   - Restaura a capacidade de digitação normal e visibilidade do cursor/ponteiro, eliminando comportamentos "mágicos" que quebravam a UX em certas condições.
