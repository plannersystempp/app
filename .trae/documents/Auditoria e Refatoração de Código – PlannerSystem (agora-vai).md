## Objetivos
- Identificar e remover código desnecessário (variáveis/imports não usados, funções obsoletas, comentários desatualizados, duplicações, controles redundantes).
- Melhorar legibilidade, consistência e simplicidade sem alterar comportamento funcional.
- Otimizar onde viável e manter cobertura de testes com validação contínua.

## Abordagem Geral
- Auditoria estática com ESLint/TypeScript para detectar não usados e padrões inconsistentes.
- Auditoria semântica por módulos críticos (components, hooks, services, contexts, utils, pages).
- Identificação de duplicações e extração para utilitários/abstrações comuns (DRY).
- Refatoração incremental guiada por testes (TDD), assegurando SSOT e SoC.
- Validação contínua: vitest, build Vite e verificação funcional em `localhost:8080`.

## Ferramentas e Configurações
- ESLint (já presente: `eslint.config.js`):
  - Ativar/gradual `@typescript-eslint/no-unused-vars` (hoje está "off") e regras de boas práticas.
  - Opcional (sob aprovação): adicionar `eslint-plugin-import` para `no-unused-modules`/`no-duplicates`.
- TypeScript (tsconfig):
  - Executar auditorias com `noUnusedLocals`/`noUnusedParameters` e ajustar gradualmente (hoje desativadas).
  - Revisar `paths` e imports `@/*` para simplificar rotas.
- Testes: `vitest` + `jsdom` (presentes em `package.json`).
- Build: Vite em `8080`, mantendo preview funcional para validar regressões.

## Etapas Detalhadas
### Fase 1: Mapeamento e Planejamento
- Inventariar pastas e módulos: `src/components`, `src/hooks`, `src/services`, `src/contexts`, `src/utils`, `src/pages`.
- Levantar hotspots: arquivos com maior complexidade/tamanho, componentes com múltiplas responsabilidades e funções duplicadas.
- Definir ordem de ataque por impacto/risco: utils → services → hooks → contexts → components → pages.

### Fase 2: Limpeza de Não Usados
- Importações não utilizadas: remoção automatizada (ESLint fix) + verificação manual em arquivos sensíveis.
- Variáveis/parâmetros não usados: remoção ou substituição por `_` quando necessário.
- Comentários desatualizados: atualizar ou remover; manter comentários explicativos apenas onde agregam valor.

### Fase 3: Funções/Métodos Obsoletos
- Catalogar por módulo funções não referenciadas (via Grep/referências).
- Verificar uso indireto (via re-exports, hooks) antes de remover.
- Marcar com `@deprecated` temporariamente onde for necessário para migração e então eliminar.

### Fase 4: Duplicações e Abstrações
- Detectar duplicações em formatadores, validações, datas e componentes visuais.
- Extrair para `src/utils/` ou componentes `src/ui/` conforme SoC/DRY.
- Unificar funções semelhantes (ex.: formatações de datas e nomes) mantendo testes.

### Fase 5: Simplificação de Estruturas
- Reduzir `if/else` aninhados, early-return, e guard clauses.
- Quebrar componentes grandes em subcomponentes “burros”; mover lógica para hooks/services.
- Garantir SSOT: remover estados globais dispersos; centralizar em `contexts`/store quando aplicável.

### Fase 6: Otimizações
- Micro-otimizações seguras: memoização (`useMemo`/`useCallback`) somente em hotspots confirmados.
- Evitar recalculações em selectors/queries; revisar caches (`react-query`).

### Fase 7: Garantia de Comportamento
- TDD: criar/atualizar testes para cada refatoração relevante.
- Rodar `npm test` e `npm run build`; validar em `http://localhost:8080/`.
- Regressão zero: qualquer falha volta para ajuste.

### Fase 8: Documentação e Versionamento
- Relatório detalhado: itens removidos/refatorados, justificativas e impacto.
- Comentários explicativos apenas para mudanças significativas.
- Commits semânticos em PT-BR (feat:/fix:/refactor:/chore:/docs:), PRs por módulo.
- Atualização de docs (`docs/`) somente se necessário.

## Critérios de Aceite
- Build e testes passam sem warnings críticos.
- Nenhum comportamento funcional alterado inadvertidamente.
- Redução substancial de não usados e duplicações.
- Código mais simples, legível e consistente com SoC/SSOT/DRY/KISS/YAGNI.

## Plano de Execução por Lotes
- Lote 1 (utils/services): remoção não usados, unificações simples.
- Lote 2 (hooks/contexts): limpeza e simplificação de estados e efeitos.
- Lote 3 (components/pages): separar responsabilidades, remover redundâncias.
- Lote 4: otimizações pontuais e revisão final.

## Entregáveis
- Relatório de auditoria/refatoração.
- Testes atualizados e novos quando necessário.
- Comentários explicativos de mudanças relevantes.
- Branch com commits semânticos; PRs por lote.
- Documentação atualizada (se aplicável).

Confirma este plano para eu iniciar a execução? 