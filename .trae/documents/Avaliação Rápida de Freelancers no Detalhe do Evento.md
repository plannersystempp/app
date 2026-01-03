## Objetivo
Adicionar um fluxo rápido de avaliação de freelancers diretamente a partir da tela de "Detalhes do Evento", com um botão que leva para uma lista dos freelancers alocados naquele evento, exibindo estrelas ao lado dos nomes para avaliar. Acesso permitido para coordenadores e administradores.

## Alterações de UI
1. **Botão no Detalhe do Evento**: Inserir um botão "Avaliar Freelancers" no header da tela `EventDetail`, visível para `admin` e `coordinator`.
2. **Página de Avaliação**: Criar uma página simples listando os freelancers alocados ao evento, com `FreelancerRating` ao lado do nome, permitindo avaliação por estrelas (1–5). Exibir também a média (`FreelancerAverageRating`) de forma compacta.

## Rotas
- Adicionar rota: `/app/eventos/:id/avaliar-freelancers` no `App.tsx` ao lado da rota existente `/app/eventos/:id`.
- Navegação do botão: `navigate('/app/eventos/${id}/avaliar-freelancers')`.

## Dados e Lógica
- **Fonte de Dados**: Reutilizar `useEnhancedData()` para obter `assignments` e `personnel`.
- **Filtro**: Selecionar somente `personnel` com `type === 'freelancer'` e com `assignments.some(a.event_id === id && a.personnel_id === person.id)`.
- **Componente de Estrelas**: Usar `components/personnel/FreelancerRating` existente, passando `eventId`, `freelancerId`, `freelancerName`.
- **Média (opcional)**: Mostrar `FreelancerAverageRating` para contexto rápido.
- **Atualização**: Ao enviar avaliação, chamar `onRatingSubmitted` para invalidar métricas (via React Query) e atualizar a UI.

## Permissões
- Gate na UI: exibir botão e página somente quando `userRole` for `'admin'` ou `'coordinator'` (de `useTeam`).
- Mensagem de acesso restrito caso contrário.

## Testes (TDD)
1. **EventDetail**: Renderiza botão para `admin`/`coordinator` e oculta para demais; clique navega para a rota correta.
2. **Página de Avaliação**: Lista apenas freelancers alocados ao evento; renderiza estrelas (`FreelancerRating`) ao lado dos nomes.
3. **Envio de Avaliação**: Simula clique em estrela e verifica chamada ao Supabase (mock), exibe toast de sucesso e atualiza métricas.

## Padrões e Regras
- SoC/SSOT: Lógica de filtro dentro do componente usando `useMemo` ou pequeno hook local; estado no store/contextos existentes.
- DRY/KISS/YAGNI: Reutilizar componentes já prontos (`FreelancerRating`, `FreelancerAverageRating`, `EnhancedDataContext`); nenhuma tabela nova.
- Idioma: UI e mensagens em pt-br.

## Entregáveis
- Botão em `EventDetail` para avaliação.
- Nova rota com página de avaliação dos freelancers do evento.
- Testes unitários cobrindo permissão, navegação e avaliação.

Confirma prosseguir com a implementação?