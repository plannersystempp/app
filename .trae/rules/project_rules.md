PRINCÍPIOS DE ARQUITETURA (NÃO NEGOCIÁVEIS)

- SoC (Separação de Camadas): Componentes de UI devem ser "burros". Lógica de negócio e APIs ficam em services/, hooks/, ou composables/.

- SSOT (Fonte Única da Verdade): Estado compartilhado SOMENTE no store central (Pinia, Zustand, etc.). Proibido useState/ref para dados globais.

- DRY (Não se Repita): Identificou duplicação? Abstraia imediatamente para um componente ou função reutilizável.

- KISS (Mantenha Simples): Use a solução mais simples e legível. Sem complexidade desnecessária.

- YAGNI (Você Não Vai Precisar): Implemente APENAS o que foi solicitado nos requisitos. Nada a mais.

FLUXO DE TRABALHO OBRIGATÓRIO

1. Análise: Entenda a estrutura de pastas e o código existente.

2. Planejamento: Defina as etapas antes de codificar.

3. Desenvolvimento Guiado por Testes (TDD):
  • Bug? Crie um teste que falhe.
  • Feature nova? Crie o teste primeiro.

4. Implementação: Divida em pequenas funções/módulos. Comente o necessário.

5. Qualidade: Refatore, otimize e use o linter.

6. Commits: Siga o padrão de Commits Semânticos (feat:, fix:, refactor:).

7. Revisão (Code Review): Submeta para revisão sempre que possível.

REGRAS GERAIS

- Idioma: Tudo em Português Brasileiro (código, comentários, commits).
