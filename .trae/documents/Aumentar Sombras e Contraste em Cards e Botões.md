## Objetivo
- Tornar os cards e botões visualmente mais destacados, com maior profundidade (sombras) e contraste, mantendo consistência com o tema Tailwind/shadcn.

## Abordagem Técnica
- Usar utilitários Tailwind (`shadow-*`, `transition-shadow`) sem alterar tokens de cor globais.
- Centralizar mudanças nos componentes base (`Card` e `Button`) para efeito amplo e consistente.
- Aplicar reforço específico nos cards de folha de pagamento (`PayrollDetailsCard.tsx`).

## Alterações Propostas
1. `src/components/ui/card.tsx`
- Atualizar classe base de `"shadow-sm"` para `"shadow-md"` para todos os `Card`.
- Manter `border bg-card text-card-foreground` inalterados.

2. `src/components/ui/button.tsx`
- Adicionar sombras padrão ao `buttonVariants` base: `shadow-sm transition-shadow hover:shadow-md active:shadow-sm`.
- Manter foco com `ring-2` já existente.
- Ajustar variante `link` para não ter sombra: adicionar `shadow-none` apenas nela.

3. `src/components/payroll/PayrollDetailsCard.tsx`
- Aumentar a ênfase visual dos cards desta tela: incluir `shadow-lg` (e opcionalmente `hover:shadow-xl`) no `className` do `Card`.

## Impacto Visual Esperado
- Cards com profundidade maior por padrão (de `sm` para `md`).
- Botões com leve sombra padrão e incremento no hover, destacando ações principais sem alterar cores.
- Na tela de folha de pagamento, os cards principais ficam mais proeminentes.

## Testes
- Criar testes com Vitest/RTL para garantir classes aplicadas:
  - `src/components/ui/__tests__/card.shadow.test.tsx`: renderiza `Card` e verifica `shadow-md`.
  - `src/components/ui/__tests__/button.shadow.test.tsx`: renderiza `Button` default e verifica `shadow-sm`; variante `link` sem sombra.
  - `src/components/payroll/__tests__/PayrollDetailsCard.shadow.test.tsx`: verifica `shadow-lg` no `Card`.

## Validação Manual
- Subir o dev server em `localhost:8080` e navegar pelas telas que usam `Card` e `Button` (dashboard, landing, plans, payroll) para avaliar o ganho de contraste.

## Conformidade com Regras do Projeto
- SoC: apenas componentes de UI modificados; lógica intacta.
- SSOT/DRY: mudanças centralizadas nos componentes base.
- KISS/YAGNI: sem alterar tokens de tema; apenas sombras e classes utilitárias.

## Risco e Rollback
- Baixo risco (apenas estilo). Rollback simples: retornar `shadow-sm` em `Card` e remover sombras do `Button`/`PayrollDetailsCard` caso necessário.

Confirma que posso aplicar essas mudanças e criar os testes?