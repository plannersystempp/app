## ARQUITETURA E SEGURANÇA (NÃO NEGOCIÁVEIS)
1. **Imutabilidade de Produção:** Nunca sugira `DROP TABLE` ou deleções destrutivas sem um plano de migração seguro (ex: `ADD COLUMN` + script de migração).
2. **SoC & Clean Code:** UI é burra; Lógica fica em Services/Hooks. Separe responsabilidades.
3. **Tratamento de Erros:** Todo fluxo crítico (pagamentos, salvamento) deve ter tratamento de erro (Try/Catch) com logs estruturados.
4. **Estado Global:** Use Stores (Pinia/Zustand) apenas para dados globais reais. Evite Prop Drilling.

## FLUXO DE TRABALHO & DOCUMENTAÇÃO
1. **Deep Think:** Antes de codar, analise o impacto no que já existe (Regressão).
2. **Atualização do PRD_MASTER.md:**
   - Toda resposta que altere código deve vir acompanhada de um bloco de atualização para o `PRD_MASTER.md`.
   - Estrutura obrigatória do Log:
     `## [DATA] - [TIPO] Título`
     ` - Mudanças:`
     ` - Arquivos:`
     ` - Impacto:`
   - **IMPORTANTE:** Mantenha os registros anteriores abaixo da nova entrada.

## QUALIDADE
- **Testes:** Priorize testes de integração para funcionalidades críticas.
- **Commits:** Siga Conventional Commits (`feat:`, `fix:`, `docs:`, `perf:`).
- **Lint:** O código deve estar pronto para passar no Linter sem warnings.