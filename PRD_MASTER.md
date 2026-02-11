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

## [2026-02-06] - fix: Polimento Visual do Menu de Ações (Dark Mode e Detalhes)
 - Mudanças:
   - `src/components/events/EventDetail.tsx`:
     - Refinado o design do `DropdownMenu` para corresponder exatamente ao mockup solicitado (tema escuro/popover):
       - Ícones agora usam contornos brancos (`text-white`) sobre fundo translúcido escuro (`bg-white/5`), com borda sutil.
       - Títulos dos itens em branco semibold, subtítulos em cinza claro (`text-muted-foreground`).
       - Botão "Avaliar" com fundo branco e texto preto (alto contraste) para destaque máximo.
       - Adicionado efeito de hover/focus consistente em todo o menu.
       - Ajustado espaçamento e alinhamento para uma experiência mais "premium".
 - Arquivos:
   - `src/components/events/EventDetail.tsx`
 - Impacto:
   - Interface mais sofisticada e com melhor hierarquia visual, facilitando a identificação rápida das ações e melhorando a percepção de qualidade do produto.

## [2026-02-06] - fix: Melhoria UX no botão de Instalar App (PWA)
 - Mudanças:
   - `src/components/shared/PWAManager.tsx`:
     - Adicionado temporizador de 15 segundos para ocultar automaticamente o botão "Instalar App" após aparecer.
     - Botão permanece visível se o usuário abrir o diálogo de instalação, desaparecendo apenas se o diálogo for fechado após o tempo limite.
 - Arquivos:
   - `src/components/shared/PWAManager.tsx`
 - Impacto:
   - Reduz a intrusão visual do prompt de instalação, atendendo ao feedback de que "não deve ficar o tempo todo na tela", mantendo a disponibilidade inicial.

## [2026-02-06] - fix: Melhoria visual do Menu de Ações (Split Button)
 - Mudanças:
   - `src/components/events/EventDetail.tsx`:
     - Implementado padrão "Split Button" na barra de ações desktop: botão "Avaliar" e menu "..." agora formam um bloco visual único quando ambos estão visíveis.
     - Botões agora compartilham bordas internas (`rounded-r-none` / `rounded-l-none`) e variante de cor, com uma linha separadora sutil.
     - Ajuste condicional para manter o botão de menu arredondado quando a ação "Avaliar" não está disponível.
 - Arquivos:
   - `src/components/events/EventDetail.tsx`
 - Impacto:
   - Interface mais coesa e moderna ("ligando os pontos"), dando o devido destaque à ação principal e suas opções secundárias sem desconexão visual.

## [2026-02-06] - fix: Reverter Split Button e Melhorar Itens do Menu (UX)
 - Mudanças:
   - `src/components/events/EventDetail.tsx`:
     - Revertida a junção dos botões "Avaliar" e Menu (Split Button) pois a usabilidade não agradou. Voltaram a ser botões independentes com espaçamento.
     - Melhorado o conteúdo do `DropdownMenu`: agora os itens (Folha, Imprimir, Editar) possuem ícones com destaque (fundo colorido suave), títulos e descrições curtas para melhor contexto e clicabilidade.
     - Aumentada a largura do menu para acomodar o novo layout rico.
 - Arquivos:
   - `src/components/events/EventDetail.tsx`
 - Impacto:
   - O menu de opções agora é visualmente mais rico e fácil de escanear, oferecendo melhor affordance e clareza sobre as ações secundárias disponíveis, sem comprometer a independência do botão principal "Avaliar".

## [2026-02-06] - feat: Função e Divisão no Relatório do Evento
 - Mudanças:
   - Coluna "Função no evento" passa a exibir a função cadastrada na alocação do evento (em vez do tipo do colaborador), com suporte a múltiplas funções.
   - Adicionada coluna opcional "Divisão" baseada na alocação do evento (suporta múltiplas divisões) e disponível também na exportação.
 - Arquivos:
   - `src/services/payrollDataService.ts`
   - `src/hooks/queries/usePayrollQuery.ts`
   - `src/components/payroll/types.ts`
   - `src/components/payroll/PayrollPrintTable.tsx`
   - `src/components/payroll/payrollReportColumns.ts`
   - `src/pages/PayrollReportPage.tsx`
 - Impacto:
   - Relatório fica alinhado ao contexto do evento (função/divisão) e melhora o uso para credenciamento e gestão operacional.

## [2026-02-06] - perf: Seletor de colunas com edição em lote (menu não fecha ao clicar)
 - Mudanças:
   - Dropdown de colunas agora permanece aberto durante marca/desmarca, permitindo escolher tudo e fechar apenas ao final (botão "Fechar").
 - Arquivos:
   - `src/components/payroll/PayrollColumnSelector.tsx`
 - Impacto:
   - Reduz fricção na configuração do relatório, evitando reabrir o menu a cada mudança.

## [2026-02-06] - feat: Atalho “Gerar Relatório” no menu do Evento
 - Mudanças:
   - Adicionada ação "Gerar Relatório" no menu (⋮) da página do evento, levando ao relatório do evento (`/app/folha/relatorio/:eventId`).
 - Arquivos:
   - `src/components/events/EventDetail.tsx`
 - Impacto:
   - Acesso rápido ao relatório de pessoal/folha direto da página do evento, sem precisar navegar pela Folha primeiro.

## [2026-02-06] - feat: Relatório de Pessoal Personalizável (Colunas Dinâmicas)
 - Mudanças:
   - Banco: aplicada migration para adicionar `cpf`, `rg`, `mothers_name` e `birth_date` em `personnel` (compatível com zero-downtime).
   - UI: adicionado seletor de colunas no relatório por evento e a tabela passou a renderizar colunas dinamicamente (inclui CPF/RG/Nascimento/Nome da Mãe).
   - Exportação: CSV/PDF passam a respeitar a seleção de colunas; PDF ajusta orientação quando há muitas colunas.
 - Arquivos:
   - `supabase/migrations/20260205_add_personnel_sensitive_fields.sql`
   - `src/pages/PayrollReportPage.tsx`
   - `src/components/payroll/PayrollPrintTable.tsx`
   - `src/components/payroll/PayrollColumnSelector.tsx`
   - `src/components/payroll/payrollReportColumns.ts`
   - `src/utils/exportUtils.ts`
   - `src/components/shared/ExportDropdown.tsx`
   - `src/components/payroll/types.ts`
   - `src/contexts/data/types.ts`
 - Impacto:
   - Gestores podem configurar quais campos visualizar e exportar no relatório do evento, com atualização imediata e export consistente com a seleção.

## [2026-02-06] - fix: Ajuste no Modal de Detalhes do Evento (Remoção de Ações e Cronograma Fixo)
 - Mudanças:
   - `src/components/events/EventDetail.tsx`:
     - Removida a seção "Ações" que estava dentro do Accordion (duplicada de menus de contexto e ações desktop).
     - Alterada a seção "Cronograma" de Accordion colapsável para um bloco estático sempre visível (fixado expandido).
     - Removida importação não utilizada de componentes Accordion.
 - Arquivos:
   - `src/components/events/EventDetail.tsx`
 - Impacto:
   - Simplificação da interface do modal de detalhes, focando na visualização direta das informações de cronograma sem necessidade de clique extra, e removendo redundância de ações.

## [2026-02-06] - feat: Rastreabilidade visível (Autor) em Avaliações, Presença, Faltas e Hora Extra
 - Mudanças:
   - Banco: `work_records` passa a atualizar `logged_by_id/date_logged` também em updates relevantes (presença/falta/horários/HE/notas) e `freelancer_ratings` ganha defaults de autoria; criada view `freelancer_ratings_enriched` já retornando `rated_by_name`.
   - UI: lista de presença exibe autoria em tooltip discreto (presença/falta/HE); histórico de faltas exibe “Falta registrada por {Nome} em {Data/Hora}”; avaliação de freelancer mostra popover com histórico de avaliadores (nome + data/hora + nota).
 - Arquivos:
   - `supabase/migrations/add_action_audit_visibility.sql`
   - `src/hooks/queries/useWorkLogsQuery.ts`
   - `src/contexts/EnhancedDataContext.tsx`
   - `src/components/events/EventDailyAttendance.tsx`
   - `src/components/events/AbsenceHistory.tsx`
   - `src/components/personnel/FreelancerRating.tsx`
 - Impacto:
   - A equipe passa a enxergar claramente “quem fez” e “quando” nas ações operacionais críticas, com baixo ruído visual e sem depender de lookup manual por ID.

## [2026-02-06] - fix: Bloquear edição de cadastro via lista de Alocação
 - Mudanças:
   - Removido o clique no nome do profissional (lista/cads de alocação) como atalho para abrir edição quando o usuário não é Admin.
   - Adicionada defesa no `PersonnelForm` para fechar imediatamente se alguém tentar abrir edição sem permissão.
 - Arquivos:
   - `src/components/events/AllocationManager.tsx`
   - `src/components/events/AllocationListView.tsx`
   - `src/components/events/DraggableAllocationCard.tsx`
   - `src/components/personnel/PersonnelForm.tsx`
 - Impacto:
   - Coordenador não consegue mais abrir a edição de cadastro de pessoal a partir de telas de alocação.

## [2026-02-06] - fix: Restringir edição de Pessoal apenas para Administrador
 - Mudanças:
   - Removido o acesso de Coordenador ao acionamento de edição de pessoal (ícone de lápis) e adicionada guarda para impedir abertura do modal via handler.
   - Endurecida a segurança no banco: apenas Admin/Superadmin podem alterar vínculos em `personnel_functions` (INSERT/UPDATE/DELETE), mantendo leitura para membros.
 - Arquivos:
   - `src/components/personnel/ManagePersonnel.tsx`
   - `supabase/migrations/restrict_personnel_functions_admin_only.sql`
 - Impacto:
   - Coordenadores não conseguem mais abrir o modal “Editar Profissional” nem editar/excluir cadastros; mudanças ficam restritas ao Administrador.

## [2026-02-06] - fix: Ajuste de navegação e texto do botão voltar na Folha de Pagamento
 - Mudanças:
   - Alterado o comportamento do botão "Voltar" na tela `PayrollEventView` para usar navegação baseada em histórico (`navigate(-1)`) em vez de rota fixa.
   - Atualizado o texto do botão de "Voltar à Seleção" para "Voltar" para refletir o comportamento genérico.
 - Arquivos:
   - `src/components/payroll/PayrollEventView.tsx`
 - Impacto:
   - Melhora a experiência do usuário permitindo retornar à página anterior real (seja lista de eventos, dashboard, etc) em vez de forçar a ida para a lista de seleção de folha.

## [2026-02-06] - feat: Refatoração do Menu de Ações do Evento (Accordion/Dropdown)
 - Mudanças:
   - Implementado novo layout de ações em `EventDetail.tsx`, separando a ação primária "Avaliar" das demais opções.
   - Transformado os botões "Folha", "Imprimir" e "Editar" em um `DropdownMenu` acionado por um ícone de três pontinhos (⋮).
   - O botão "Avaliar" foi movido para fora do menu e ganhou destaque visual por ser ação primária.
   - Mantida acessibilidade do menu via teclado e leitores de tela (Radix UI).
 - Arquivos:
   - `src/components/events/EventDetail.tsx`
 - Impacto:
   - Ações do evento ficam mais limpas e priorizadas, reduzindo ruído visual no cabeçalho sem perder atalhos importantes.

## [2026-02-06] - fix: Remover botão de Scroll para o Fundo (UI Cleaner)
 - Mudanças:
   - `src/components/shared/ScrollNavigationButtons.tsx`: Removido o botão circular com seta para baixo (ArrowDown) que servia para rolar até o final da página.
   - `src/hooks/useScrollNavigation.ts`: Removida lógica de detecção de scroll para o fundo e função `scrollToBottom`.
   - `src/components/Layout.tsx`: Removida passagem de props obsoletas.
 - Arquivos:
   - `src/components/shared/ScrollNavigationButtons.tsx`
   - `src/hooks/useScrollNavigation.ts`
   - `src/components/Layout.tsx`
 - Impacto:
   - Remove elemento visual flutuante desnecessário (botão de seta para baixo) da interface, atendendo à solicitação de limpeza visual.

## [2026-02-05] - fix: Drag & Drop mobile (PWA) na Alocação de Pessoal
 - Mudanças:
   - Ajustado o DnD para priorizar dispositivos touch via `PointerSensor` com long press (200ms) e tolerância de movimento, evitando conflito com scroll.
   - Reforçado `touch-action: none` no handle de arraste para impedir interceptação do gesto pelo navegador no mobile.
   - Aumentado `z-index` do `DragOverlay` para garantir que o “fantasma” fique sempre acima da UI.
   - Corrigida tipagem de `updateDivision` no contexto para refletir updates parciais (remove casts e melhora segurança de tipos).
 - Arquivos:
   - `src/components/events/AllocationManager.tsx`
   - `src/components/events/DivisionCard.tsx`
   - `src/components/events/DraggableAllocationCard.tsx`
   - `src/contexts/EnhancedDataContext.tsx`
 - Impacto:
   - Reordenação/realocação por arrastar e soltar passa a funcionar de forma confiável em mobile (PWA), reduzindo fricção e erros operacionais em campo.

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

## [2026-02-06] - feat: Expandir Foto de Freelancer na Avaliação
 - Mudanças:
   - `src/pages/EventFreelancersRatingPage.tsx`:
     - Substituído ícone genérico de usuário pelo avatar (foto) do freelancer na lista de avaliação.
     - Implementado modal (`Dialog`) de expansão de foto ao clicar no avatar, similar à lista de presença.
     - Adicionado estado local `photoModalPerson` para controlar a exibição da foto expandida.
 - Arquivos:
   - `src/pages/EventFreelancersRatingPage.tsx`
 - Impacto:
   - Permite aos avaliadores identificarem visualmente os freelancers antes de avaliar, reduzindo erros de avaliação por confusão de nomes.
