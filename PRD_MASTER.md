# PRD MASTER - PlannerSystem

## 1. Visão Geral
O **PlannerSystem** é uma plataforma SaaS completa para gestão de eventos, alocação de pessoal, controle financeiro e folha de pagamento. O sistema visa centralizar a operação de agências de eventos e empresas que gerenciam equipes temporárias (freelancers), oferecendo ferramentas robustas para planejamento, execução e análise financeira.

## 2. Objetivos
- **Centralização:** Unificar gestão de eventos, escalas de trabalho e pagamentos em um único local.
- **Eficiência:** Automatizar cálculos de folha de pagamento e reduzir erros manuais.
- **Visibilidade:** Fornecer dashboards em tempo real sobre custos, lucros e desempenho da operação.
- **Escalabilidade:** Suportar desde pequenas agências até grandes operações com múltiplos usuários e níveis de acesso.

## 3. Público-Alvo
- Agências de Eventos e Promoções.
- Produtores de Eventos.
- Gestores de RH e Departamento Pessoal focados em freelancers.
- Administradores Financeiros.

## 4. Stack Tecnológico

### Frontend
- **Core:** React 18, TypeScript, Vite.
- **UI/UX:** Tailwind CSS, Shadcn/UI (Radix Primitives), Lucide React.
- **Gerenciamento de Estado:** React Context API (para estados globais simples), TanStack Query (para estado do servidor e cache).
- **Roteamento:** React Router DOM v6.
- **Formulários:** React Hook Form + Zod (validação).
- **Visualização de Dados:** Recharts.
- **Interatividade:** @dnd-kit (Drag & Drop).
- **Geração de Documentos:** jsPDF, jsPDF-AutoTable.
- **Mobile:** PWA (Progressive Web App).

### Backend & Infraestrutura
- **BaaS:** Supabase (PostgreSQL, Auth, Realtime, Storage).
- **Pagamentos:** Stripe Integration.
- **Testes:** Vitest (Unitários/Integração), Playwright (E2E).

## 5. Arquitetura do Projeto
O projeto segue uma arquitetura modular baseada em funcionalidades (Feature-based), promovendo a separação de responsabilidades (SoC).

- `src/components`: Componentes de UI reutilizáveis e componentes específicos de features.
- `src/contexts`: Gerenciamento de estado global (Auth, Data, Team).
- `src/hooks`: Custom hooks para lógica de negócios e abstração de queries.
- `src/pages`: Componentes de página (rotas).
- `src/services`: Camada de comunicação com APIs e Supabase.
- `src/types`: Definições de tipos TypeScript.
- `src/utils`: Funções utilitárias e helpers.
- `src/lib`: Configurações de bibliotecas (utils do shadcn, etc).

## 6. Funcionalidades Principais

### 6.1. Autenticação e Usuários
- Login e Recuperação de Senha.
- Controle de Sessão.
- Níveis de Acesso: Usuário, Admin, SuperAdmin.
- Contas Demo.

### 6.2. Gestão de Eventos
- **CRUD de Eventos:** Criação, edição e listagem de eventos.
- **Alocação de Pessoal:** Seleção de freelancers, definição de dias trabalhados e funções. Interface otimizada para mobile com divisões recolhidas por padrão para melhor organização visual.
- **Divisões:** Organização interna do evento (ex: Bar, Recepção).
- **Custos:** Registro de custos com fornecedores e despesas extras.
- **Log de Trabalho:** Acompanhamento de presença e horas.

### 6.3. Gestão de Pessoal (Freelancers)
- **Cadastro Completo:** Dados pessoais, bancários e fotos.
- **Histórico:** Visualização de todos os eventos trabalhados e pagamentos recebidos.
- **Avaliação:** Sistema de rating de desempenho por evento.
- **Comunicação:** Integração direta com WhatsApp.

### 6.4. Financeiro e Folha de Pagamento
- **Cálculo Automático:** Geração de folha baseada nas alocações e taxas.
- **Status de Pagamento:** Controle de Pendente, Pago, Atrasado.
- **Pagamentos Parciais:** Suporte a adiantamentos e parcelamento.
- **Relatórios:** Exportação de espelhos de pagamento em PDF.
- **Previsão:** Forecast de pagamentos futuros.

### 6.5. Fornecedores
- **Cadastro e gestão de fornecedores.
- **Avaliação de serviços prestados.
- **Controle de itens e custos associados.

### 6.6. Dashboard e Analytics
- **KPIs em Tempo Real (MRR, Custos, Lucro).
- **Gráficos de conversão e atividade.
- **Monitoramento de saúde do sistema (para Admins).

### 6.7. Assinaturas (SaaS)
- **Integração com Stripe para gestão de planos.
- **Upgrade/Downgrade de planos.
- **Controle de limites por plano.

### 6.8. Mobile / PWA
- **Interface responsiva adaptada para mobile:** Ajustes de layout em cartões e modais para telas pequenas.
- **Interação Touch:** Otimização de componentes de arrastar (Drag & Drop) com alças (handles) específicas para não bloquear a rolagem da página em dispositivos móveis.
- **Funcionalidades offline-first (onde aplicável).
- **Instalação na tela inicial.

## 7. Requisitos Não-Funcionais
- **Performance:** Carregamento rápido e feedback imediato nas interações.
- **Segurança:** RLS (Row Level Security) no Supabase para isolamento de dados entre tenants/times.
- **Acessibilidade:** Componentes compatíveis com leitores de tela e navegação por teclado.
- **Confiabilidade:** Backups automáticos e logs de erro (Error Reporting).

## 8. Estrutura de Dados (Resumo)
- `users`: Dados de autenticação e perfil.
- `teams`: Tenants/Organizações.
- `events`: Dados dos eventos.
- `personnel`: Cadastro de freelancers.
- `allocations`: Tabela pivô ligando Personnel <-> Events com detalhes de função e valor.
- `payments`: Registros financeiros.
- `suppliers`: Fornecedores.
- `subscriptions`: Dados de assinatura do cliente.

## 9. Diretrizes de Desenvolvimento (Rules)
- **Idioma:** Todo o código, comentários e commits em **Português Brasileiro**.
- **Atualização:** Qualquer mudança no código que impacte funcionalidade deve refletir neste documento.
- **Testes:** TDD é encorajado. Novas features devem ter testes associados.
- **Commits:** Seguir padrão Conventional Commits (`feat:`, `fix:`, `docs:`, etc).
