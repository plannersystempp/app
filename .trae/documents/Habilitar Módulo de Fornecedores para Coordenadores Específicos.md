## Objetivo
- Permitir que coordenadores selecionados tenham acesso ao módulo **Fornecedores**, sem abrir permissões de escrita que são exclusivas de `admin` (e `financeiro` quando aplicável).

## Escopo
- Acesso de coordenador: leitura de fornecedores e itens.
- Não altera políticas de custos por evento: continuam restritas a `admin`/`financeiro`.
- Mantém a flag global `teams.allow_coordinators_suppliers` como override; adiciona controle por coordenador.

## Modelo de Dados
- Adicionar coluna `team_members.can_access_suppliers BOOLEAN NOT NULL DEFAULT false`.
- Políticas RLS (Supabase):
  - `suppliers` e `supplier_items`: permitir `SELECT` para membros do time quando `can_access_suppliers = true` ou usuário `admin`/`financeiro`.
  - `INSERT/UPDATE/DELETE`: permanecer somente para `admin` (e `financeiro` onde já existir política).
- Sem mudanças em `event_supplier_costs` (permanece admin/financeiro).

## Frontend
- TeamContext:
  - Carregar e expor `currentMemberCaps.canAccessSuppliers` a partir de `team_members.can_access_suppliers`.
- Navegação:
  - `AppSidebar` e `AppMobileBottomNav`: mostrar "Fornecedores" se `userRole === 'admin' || userRole === 'financeiro' || (userRole === 'coordinator' && (activeTeam.allow_coordinators_suppliers || currentMemberCaps.canAccessSuppliers))`.
- Rota:
  - Guardar `'/fornecedores'` com verificação acima; negar acesso redirecionando para dashboard.
- Páginas:
  - `ManageSuppliers`: manter CRUD apenas para `admin` (e `financeiro` conforme política); coordenadores com acesso veem lista/busca/export.
- TeamManagement:
  - Na lista de coordenadores, adicionar um toggle "Acesso ao módulo Fornecedores" que atualiza `team_members.can_access_suppliers` via Supabase.

## Testes
- Unit: função de `canShowSuppliersModule(userRole, activeTeamFlag, memberCaps)` cobrindo cenários admin/financeiro/coordenador com/sem flags.
- Integração (frontend):
  - Sidebar/BottomNav mostra/oculta "Fornecedores" conforme combinações.
  - Guard da rota bloqueia/permite acesso.
- E2E leve: simular usuário coordenador com flag ativa e verificar leitura de fornecedores.

## Considerações de Segurança
- SSOT/SoC: lógica de permissão centralizada no TeamContext/util de permissões.
- RLS impede escrita indevida; UI não exibe botões de criação/edição para coordenadores.

## Rollout
- Executar migration da coluna e políticas RLS.
- Atualizar TeamContext, navegação, guard e TeamManagement.
- Validar no preview `http://localhost:8080/` com perfis: admin, financeiro, coordenador com/sem flag.

Confirma implementar este plano?