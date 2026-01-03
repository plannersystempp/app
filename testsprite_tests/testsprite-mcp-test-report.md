# Relatório de Testes (TestSprite)

## Visão Geral
- Ambiente: `http://localhost:8080/`
- Tipo: Frontend (Playwright via TestSprite MCP)
- Período: 2025-11-13

Status resumido:
- Passaram: TC012 (Usabilidade mobile), TC014 (Validações de agendamento)
- Falharam: TC001, TC002, TC003, TC004, TC005, TC006, TC007, TC008, TC009, TC010, TC013, TC015

## Requisitos e Casos Classificados

### Autenticação e Onboarding
- TC001 — Admin cria empresa e recebe código de convite
  - Resultado: Falhou
  - Motivo: Falha de login. Erro 400 em Supabase (`grant_type=password`). Redireciona para criação de conta.
  - Evidência: `test_results.json` linhas 9–15; logs de console com `AuthApiError: Invalid login credentials`.
- TC002 — Coordenador entra em equipe com código e aprovação do admin
  - Resultado: Falhou
  - Motivo: Mesma falha de login; fluxo bloqueado.
- TC008 — Exclusão de conta exige confirmação e regras de equipe
  - Resultado: Falhou
  - Motivo: Sem acesso às configurações por falha de login.
- TC009 — Isolamento multi-tenant (RLS)
  - Resultado: Falhou
  - Motivo: Falha de login impede verificação de isolamento.
- TC013 — Validação de código de convite inválido/expirado
  - Resultado: Falhou
  - Motivo: Fluxo não rejeitou códigos inválidos conforme esperado.
- TC015 — Reset de senha envia e permite nova senha
  - Resultado: Falhou
  - Motivo: Após reset, redireciona para criação de conta; sem confirmação.

### Pessoal e Permissões
- TC003 — CRUD de pessoal respeita permissões
  - Resultado: Falhou
  - Motivo: Sem login; não foi possível validar.
- TC006 — Avaliar freelancers após eventos e exibir notas
  - Resultado: Falhou
  - Motivo: Validação de CPF bloqueia adição de freelancers; sem dados para avaliar.

### Eventos e Alocações
- TC004 — Impedir alocações conflitantes/duplicadas
  - Resultado: Falhou
  - Motivo: UI abre modal incorreto ao tentar "Adicionar Pessoa".
- TC005 — Cron diário atualiza status por data fim e pagamento
  - Resultado: Falhou
  - Motivo: Status inconsistentes com regras: evento com pagamento incompleto marcado como "Concluído"; pago completo permaneceu "Planejado".
- TC014 — Validações de agendamento (fim ≥ início; campos obrigatórios)
  - Resultado: Passou
  - Observação: Front valida corretamente faixas de data (formato `dd-MM-yyyy` respeitado)

### PWA e Usabilidade
- TC010 — Instalação PWA e suporte offline
  - Resultado: Falhou
  - Motivo: Sem prompt de instalação e sem opção manual na UI.
- TC012 — Usabilidade mobile-first
  - Resultado: Passou
  - Observação: Interface acessível e responsiva.

## Principais Problemas Identificados
- Autenticação real indisponível para credenciais de teste (`AuthApiError` 400). Ver provisionamento de seed no Supabase.
- Fluxos de onboarding (código de convite) não validam corretamente casos inválidos/expirados.
- UI de pessoal apresenta navegação/modal incorreto ao adicionar pessoa.
- Regras de status de eventos (cron/atualizações) inconsistentes com pagamento e datas.
- Validação de CPF bloqueia criação de freelancer mesmo em ambiente de teste.
- Ausência de opção/prompt de instalação PWA.

## Recomendações de Correção
- Provisionar conta seed real `euquero@plannersystem.com.br` e equipe mínima no Supabase (ver guia) para destravar testes de autenticação.
- Ajustar validações de convite na camada de serviço e feedback de erro na UI (`services/invitations/*`, `src/pages/*`).
- Revisar fluxo de "Adicionar Pessoa" para abrir o formulário correto (componentes de eventos/pessoal).
- Corrigir lógica de atualização de status de eventos e sincronização com backend (`useEventsQuery`, mutações e cron backend). c
- Relaxar/regra de CPF em ambiente de teste ou fornecer dados válidos por seed.
- Incluir botão "Instalar PWA" na UI quando `display-mode: standalone` não dispara prompt.

## Anexos
- Vídeos: URLs em `test_results.json` campos `testVisualization`.
- Fonte: `testsprite_tests/tmp/test_results.json`.