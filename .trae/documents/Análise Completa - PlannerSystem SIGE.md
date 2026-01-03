# Análise Completa do Sistema PlannerSystem/SIGE

## Visão Geral

O PlannerSystem (também conhecido como SIGE) é um sistema completo de gestão de eventos empresarial desenvolvido em React + TypeScript com Supabase como backend. O sistema é projetado para gerenciar eventos, equipes, pagamentos e custos, com foco em performance, UX e recursos PWA (Progressive Web App).

## Arquitetura Tecnológica

### Stack Principal
- **Frontend**: React 18 + TypeScript + Vite
- **Estilização**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Pagamentos**: Stripe Integration
- **Deploy**: Configurado para Vercel
- **PWA**: Service Worker, Manifest, ícones otimizados

### Estrutura de Dados
- **Banco de Dados**: PostgreSQL via Supabase
- **Autenticação**: Supabase Auth com JWT
- **Realtime**: Sincronização em tempo real de dados
- **Storage**: Supabase Storage para arquivos e fotos

## Módulos Principais

### 1. Módulo de Autenticação e Gestão de Usuários

#### Funcionalidades
- **Login/Logout**: Sistema tradicional com email/senha
- **Cadastro**: Criação de novos usuários com aprovação pendente
- **Reset de Senha**: Via email com link seguro
- **Gestão de Perfis**: Dados do usuário e preferências

#### Tipos de Usuários
| Tipo | Permissões | Características |
|------|------------|----------------|
| **SuperAdmin** | Acesso total ao sistema | Visualiza todas as equipes, usuários e assinaturas |
| **Admin** | Gestão completa da equipe | Cria eventos, gerencia pessoal, visualiza relatórios financeiros |
| **Coordenador** | Acesso limitado por evento | Permissões granulares por evento (visualizar, editar, alocações, custos) |
| **Usuário** | Acesso básico | Aprovação pendente, acesso restrito |

#### Sistema de Permissões Granulares
- Permissões por evento específico
- Controle de acesso a diferentes módulos (alocações, custos, folha de pagamento)
- Sistema de aprovação de novos usuários por administradores

### 2. Módulo de Gestão de Equipes

#### Funcionalidades
- **Criação de Equipes**: Cada equipe é independente
- **Gestão de Membros**: Convites e controle de acesso
- **Papel de Usuários**: Admin/Coordenador na equipe
- **Limites por Plano**: Restrições baseadas na assinatura

#### Características
- Sistema multi-equipe (multi-tenant)
- Isolamento completo de dados entre equipes
- Sistema de convites por email
- Gestão de quotas e limites

### 3. Módulo de Eventos

#### Funcionalidades Principais
- **CRUD de Eventos**: Criação, edição, exclusão
- **Status do Evento**: Planejado, Em Andamento, Concluído, Cancelado, Concluído com Pagamento Pendente
- **Datas Importantes**: Início, término, montagem, pagamento
- **Localização e Contato**: Endereço e informações do cliente

#### Gerenciamento de Divisões
- Criação de divisões/setores dentro do evento
- Organização hierárquica do evento
- Descrições e detalhes por divisão

#### Alocação de Pessoal
- **Alocação por Função**: Designação de pessoal por função específica
- **Dias de Trabalho**: Seleção de dias específicos da semana
- **Cache por Evento**: Valores específicos para cada evento
- **Multi-seleção**: Alocação em lote de múltiplos profissionais

#### Controle de Presenças e Faltas
- **Work Logs**: Registro de horas trabalhadas
- **Sistema de Faltas**: Justificativas e controle
- **Histórico de Presenças**: Visualização completa por profissional

### 4. Módulo de Pessoal

#### Gestão de Profissionais
- **Dados Pessoais**: Nome, email, telefones, documentos (CPF/CNPJ)
- **Endereço Completo**: CEP, rua, número, complemento, bairro, cidade, estado
- **Fotos**: Upload e gestão de fotos do profissional
- **Tipo de Profissional**: Fixo ou Freelancer

#### Funções e Capacitações
- **Funções Múltiplas**: Um profissional pode ter várias funções
- **Cache por Função**: Valores diferentes por tipo de trabalho
- **Salário Mensal**: Para profissionais fixos
- **Taxa de Hora Extra**: Valor adicional para horas extras

#### Sistema de Avaliação
- **Avaliação de Freelancers**: Sistema de 5 estrelas
- **Métricas de Performance**: Baseada em eventos e presenças
- **Comentários e Feedback**: Observações sobre o profissional

#### Controle de Pagamentos
- **Histórico de Pagamentos**: Todos os pagamentos realizados
- **Pagamentos Pendentes**: Visualização de valores a pagar
- **Integração com Folha**: Dados sincronizados com módulo financeiro

### 5. Módulo de Folha de Pagamento

#### Cálculos Automáticos
- **Cache por Evento**: Baseado nas alocações
- **Horas Trabalhadas**: Registro e cálculo de horas
- **Horas Extras**: Cálculo automático com taxas diferenciadas
- **Adicionais**: Comissões, bonificações, descontos

#### Tipos de Pagamento
- **Pagamento por Evento**: Individual por evento concluído
- **Pagamento Mensal**: Para profissionais fixos
- **Pagamento Avulso**: Valores extras não vinculados a eventos
- **Adiantamentos**: Sistema de adiantamentos com controle

#### Relatórios e Comprovantes
- **Recibos de Pagamento**: Geração automática em PDF
- **Relatórios de Folha**: Detalhamento por período
- **Exportação**: Dados em Excel/CSV para contabilidade

### 6. Módulo de Custos e Fornecedores

#### Gestão de Fornecedores
- **Dados Cadastrais**: Nome fantasia, razão social, CNPJ
- **Endereço Completo**: Todos os dados de localização
- **Contatos**: Pessoas de contato, telefones, emails
- **Avaliação**: Sistema de classificação de fornecedores

#### Itens e Serviços
- **Catálogo de Itens**: Produtos e serviços oferecidos
- **Preços**: Valores por item e fornecedor
- **Categorias**: Organização por tipo de item/serviço

#### Custos por Evento
- **Registro de Custos**: Valores gastos por evento
- **Categorização**: Separação por tipo de custo
- **Controle de Pagamentos**: Status de pagamento a fornecedores
- **Previsão de Custos**: Estimativas baseadas em eventos similares

### 7. Módulo de Assinaturas e Planos

#### Planos Disponíveis
- **Plano Básico**: Limites para pequenas equipes
- **Plano Profissional**: Recursos expandidos
- **Plano Enterprise**: Recursos completos sem limites

#### Integração Stripe
- **Checkout Seguro**: Páginas de pagamento do Stripe
- **Assinaturas Recorrentes**: Cobrança automática mensal/anual
- **Gestão de Assinatura**: Upgrade, downgrade, cancelamento
- **Trial Gratuito**: Período de teste para novos usuários

#### Controle de Limites
- **Limite de Eventos**: Quantidade máxima por mês
- **Limite de Pessoal**: Número máximo de profissionais
- **Limite de Usuários**: Quantidade de usuários por equipe
- **Upgrade Automático**: Sugestões quando próximo aos limites

### 8. Módulo Administrativo (SuperAdmin)

#### Dashboard Administrativo
- **Métricas Gerais**: Total de usuários, equipes, assinaturas
- **Crescimento**: Gráficos de evolução do sistema
- **Conversão**: Taxa de conversão free-to-paid
- **Churn**: Análise de cancelamentos

#### Gestão de Usuários
- **Visualização Global**: Todos os usuários do sistema
- **Aprovações**: Gestão de usuários pendentes
- **Bloqueio/Desbloqueio**: Controle de acesso
- **Exclusão**: Remoção completa de contas

#### Gestão de Equipes
- **Visualização de Equipes**: Todas as equipes cadastradas
- **Gestão de Assinaturas**: Controle manual de planos
- **Suporte a Equipes**: Ferramentas de suporte

#### Auditoria e Logs
- **Log de Atividades**: Registro completo de ações
- **Log de Exclusões**: Controle de dados removidos
- **Relatórios de Erros**: Sistema de bug tracking
- **Análise de Uso**: Estatísticas detalhadas

### 9. Módulo de Notificações e Comunicação

#### Sistema de Notificações
- **Notificações em Tempo Real**: Via Supabase Realtime
- **Alertas de Sistema**: Limite de assinatura, pagamentos atrasados
- **Notificações Push**: Suporte para PWA instalado
- **Email**: Integração com serviços de email

#### Comunicação com Equipe
- **Avisos Importantes**: Sistema de banners e alertas
- **Atualizações de Status**: Mudanças em eventos e pagamentos
- **Lembretes**: Próximos vencimentos e compromissos

### 10. Módulo de Relatórios e Analytics

#### Dashboard Principal
- **KPIs em Tempo Real**: Eventos, pessoal, pagamentos
- **Gráficos Interativos**: Visualização de dados históricos
- **Filtros Inteligentes**: Por período, status, equipe
- **Exportação**: Dados em múltiplos formatos

#### Relatórios Financeiros
- **Previsão de Pagamentos**: Valores futuros estimados
- **Fluxo de Caixa**: Entradas e saídas
- **Análise de Custos**: Por evento, período, fornecedor
- **Performance de Freelancers**: Ranking e estatísticas

#### Relatórios Operacionais
- **Produtividade por Evento**: Horas trabalhadas vs. planejado
- **Ausências e Faltas**: Controle de frequência
- **Utilização de Pessoal**: Taxa de ocupação
- **Performance de Equipes**: Comparação entre equipes

## Integrações e APIs

### Supabase Integration
- **Autenticação**: JWT com refresh tokens
- **Banco de Dados**: PostgreSQL com RLS (Row Level Security)
- **Realtime**: Atualizações em tempo real
- **Storage**: Arquivos e imagens
- **Edge Functions**: Serverless functions

### Stripe Integration
- **Checkout Sessions**: Páginas de pagamento seguras
- **Webhooks**: Eventos de pagamento (sucesso, falha, cancelamento)
- **Assinaturas**: Planos recorrentes com trial
- **Gestão de Clientes**: Dados de cobrança

### Outras Integrações
- **PWA**: Service worker, manifest, ícones otimizados
- **Email**: Templates e disparo de emails
- **WhatsApp**: Botão de contato direto (em desenvolvimento)

## Características Técnicas Importantes

### Performance e UX
- **Lazy Loading**: Carregamento sob demanda de componentes
- **Virtual Scrolling**: Para listas grandes de dados
- **Cache Inteligente**: React Query para otimização
- **Skeletons**: Loaders durante carregamento

### Segurança
- **RLS (Row Level Security)**: Isolamento de dados por equipe
- **Rate Limiting**: Controle de requisições
- **Sanitização**: Proteção contra XSS e SQL injection
- **HTTPS**: Todo tráfego criptografado

### Acessibilidade
- **WCAG 2.1**: Conformidade com diretrizes de acessibilidade
- **Teclado Navegável**: Navegação completa via teclado
- **Screen Readers**: Suporte para leitores de tela
- **Contraste**: Cores com ratio adequado

### Responsividade
- **Mobile-First**: Design prioritário para mobile
- **Breakpoints**: Tablet, desktop, wide-screen
- **Touch-Friendly**: Botões e elementos otimizados
- **PWA**: Instalação como app nativo

## Fluxos de Trabalho Principais

### 1. Fluxo de Criação de Evento
1. Admin cria novo evento com dados básicos
2. Define divisões e setores do evento
3. Aloca pessoal por função e dias
4. Registra custos estimados
5. Acompanha progresso e realiza ajustes

### 2. Fluxo de Pagamento
1. Sistema calcula valores baseado em alocações
2. Admin revisa e ajusta valores se necessário
3. Gera recibos de pagamento
4. Realiza pagamento via sistema
5. Registra comprovante e atualiza status

### 3. Fluxo de Adesão de Novo Usuário
1. Usuário se cadastra no sistema
2. Solicita entrada em equipe existente
3. Admin da equipe aprova ou rejeita
4. Usuário ganha acesso conforme permissões
5. Pode começar a usar o sistema

### 4. Fluxo de Assinatura
1. Usuário escolhe plano desejado
2. Redirecionado para checkout Stripe
3. Realiza pagamento seguro
4. Assinatura ativada automaticamente
5. Limites da conta atualizados

## Conclusão

O PlannerSystem/SIGE é um sistema empresarial completo para gestão de eventos, com arquitetura moderna, segurança robusta e UX otimizada. O sistema atende desde pequenas equipes até grandes empresas do setor de eventos, com escalabilidade e flexibilidade para crescer conforme as necessidades do negócio.

Os principais diferenciais são:
- Sistema multi-equipe com isolamento completo de dados
- Permissões granulares por evento
- Cálculos automáticos de folha de pagamento
- Integração completa com Stripe para assinaturas
- Interface PWA moderna e responsiva
- Sistema de avaliação de freelancers
- Controle completo de custos e fornecedores

O sistema está em constante evolução com novas funcionalidades sendo adicionadas regularmente, mantendo o foco em performance, segurança e experiência do usuário.