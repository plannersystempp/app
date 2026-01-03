## Diagnóstico
- Unificar credenciais: usar `euquero@plannersystem.com.br` e `EuQuero@2025` em todos os casos.
- Evitar bloqueios: iniciar testes via `/demo` para sessão demo e bypass de termos.
- Corrigir seletores frágeis: substituir XPaths por seletores acessíveis (`getByLabel`, `getByRole`, `getByText`).
- Padronizar datas: manter entrada `dd-MM-yyyy` e converter internamente quando necessário.
- Estabilizar esperas: usar `wait_for_url`, `locator.waitFor`, `expect(...).toBeVisible()` com timeouts coerentes.

## Alterações por Arquivo
- `TC001_Admin_creates_a_new_company_and_receives_unique_invite_code.py`
  - Navegar para `/auth` a partir de `/demo`.
  - Preencher cadastro admin (nome, email, senha), empresa (nome, CNPJ) e marcar confirmação.
  - Assertar feedback: banner “Cadastro realizado!” (ou toast) e presença de estado “Aguardando aprovação”.
  - Seletores: `getByLabel('Nome da Empresa')`, `getByLabel('CNPJ')`, `getByRole('button', { name: 'Criar Conta' })`.
- `TC002_Coordinator_joins_an_existing_team_using_valid_invite_code_and_admin_approval.py`
  - Fluxo coordenador: `getByLabel('Nome')`, `getByLabel('Código da Empresa')`, `getByLabel('Email')`, `getByLabel('Senha')`.
  - Assertar: toast “Solicitação enviada!” e mensagem de pendência.
- `TC003_Personnel_CRUD_actions_respect_role_based_permissions.py`
  - Entrar via `/demo`; navegar para `/app/pessoal`.
  - Adicionar pessoal com CPF válido; validar mensagens de erro/sucesso.
  - Verificar que coordenador não consegue editar/deletar; admin consegue.
- `TC004_Prevent_overlapping_allocations_and_duplicate_divisions_in_event_assignments.py`
  - Criar evento com datas em `dd-MM-yyyy` usando `getByLabel('Data de Início')`/`'Data de Fim'`.
  - Tentar criar alocação sobreposta e duplicar divisão; assertar erro/toast.
- `TC005_Automated_daily_job_updates_event_statuses_based_on_end_dates_and_payments.py`
  - Criar eventos com fim passado; simular pagamento concluído (se disponível).
  - Verificar atualização de status após job (ou acionar função/marcação manual no teste demo).
- `TC006_Record_and_display_freelancer_performance_ratings_after_event_completion.py`
  - Criar freelancer (se inexistente) ou usar dados seed; completar evento e avaliar.
  - Assertar exibição das notas em listagens.
- `TC007_Password_change_requires_current_credential_confirmation_and_completes_successfully.py`
  - Com conta válida, acessar configurações e executar troca de senha; validar feedback.
  - Caso ambiente não permita troca real, validar rejeição com senha atual incorreta.
- `TC008_Account_deletion_triggers_cascading_team_data_rules_and_confirmation_prompts.py`
  - Acessar exclusão de conta; validar confirmação de credenciais e feedback.
- `TC009_Data_isolation_enforced_by_multi_tenant_row_level_security.py`
  - Validar que dados de outros times não aparecem; em demo, simular múltiplos times e conferir filtros/IDs.
- `TC010_PWA_installation_and_offline_support_verified_on_supported_mobile_platforms.py`
  - Ajustar critério: validar presença de `PWAManager` e manifest; se prompt não for possível no ambiente, considerar opção manual.
- `TC011_Optimistic_UI_updates_reflect_changes_before_backend_confirmation.py`
  - Executar um update otimista (ex.: editar descrição de evento) e confirmar rollback em falha simulada.
- `TC012_Mobile_first_and_intuitive_interface_usability_check.py`
  - Manter cenário: validar responsividade em login/landing/planos.
- `TC013_Invitation_code_validation_with_expired_and_incorrect_codes.py`
  - Preencher código inválido/expirado; assertar mensagens de erro visíveis (toasts/banners).
- `TC014_Event_scheduling_validations_prevent_invalid_date_ranges_and_inconsistent_data.py`
  - Criar evento com fim < início; validar bloqueio e mensagem com datas `dd-MM-yyyy`.
- `TC015_Password_reset_flow_sends_reset_email_and_allows_new_password_set.py`
  - Validar envio do e-mail (toast “Link enviado!”); marcação end-to-end condicionada ao acesso ao link.

## Padronizações Comuns
- Início de cada teste:
  - `await page.goto('http://localhost:8080/demo');`
  - `await page.getByRole('button', { name: 'Entrar no Modo Demo' }).click();`
  - `await expect(page).toHaveURL(/\/app|\/auth/);`
- Login explícito (quando necessário):
  - `await page.goto('http://localhost:8080/auth');`
  - `await page.getByLabel('Email').fill('euquero@plannersystem.com.br');`
  - `await page.getByLabel('Senha').fill('EuQuero@2025');`
  - `await page.getByRole('button', { name: 'Entrar' }).click();`
- Datas `dd-MM-yyyy`:
  - `await page.getByLabel('Data de Início').fill('20-11-2025');`
  - `await page.getByLabel('Data de Fim').fill('22-11-2025');`
- Esperas e timeouts:
  - Substituir `wait_for_timeout` por asserts explícitos (`expect(...).toBeVisible`) e aumentar `default_timeout` para 10–15s.

## Refatoração dos Testes (DRY)
- Criar `testsprite_tests/helpers.py` (mínimo necessário) com:
  - `login_demo(page)` para sequência `/demo`/`/auth`.
  - `fill_date_by_label(page, label, ddmmyyyy)` para datas.
  - `assert_toast(page, text)` para mensagens.
- Importar nos 15 testes e remover duplicações.

## Ajustes de Plano de Testes
- Atualizar `testsprite_frontend_test_plan.json` com critérios revistos:
  - Password reset: considerar “pass” quando envio do e-mail é confirmado.
  - PWA: validar presença de manifest/service worker e UI `PWAManager`.
  - Jobs e avaliações: preparar dados seed (em modo demo ou pré-cenário).

## Entregáveis
- 15 arquivos de teste atualizados com seletores acessíveis e credenciais corretas.
- `helpers.py` com utilitários de login/datas/toasts.
- Plano de testes ajustado para refletir critérios realistas do ambiente.

## Validação
- Reexecutar TestSprite com preview na porta `8080`.
- Conferir `testsprite_tests/tmp/raw_report.md` e consolidar em `testsprite-mcp-test-report.md`.

## Risco & Mitigação
- Dependência de dados: provisionar seed básico para evitar bloqueios.
- Limitações de e-mail/PWA: ajustar critérios de aceitação quando o ambiente não suporta end-to-end.
