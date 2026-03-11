## [2026-03-09] - fix: Correção na validação de nome duplicado ao editar pessoa
 - Mudanças:
   - Atualizada a função `validateUniquePersonnelName` em `src/utils/validation.ts` para usar comparação de ID (`p.id !== currentPersonnelId`) em vez de comparação de nome (`p.name !== name`).
   - Isso elimina falsos positivos de "Nome duplicado" quando o usuário edita o próprio nome (ex: apenas mudando caixa ou espaços).
 - Arquivos:
   - `src/utils/validation.ts`
 - Impacto:
   - Permite que administradores corrijam nomes de pessoas sem serem bloqueados pela validação de duplicidade incorreta.
   - Mantém a proteção contra criação de homônimos reais (outras pessoas com o mesmo nome).

## [2026-03-09] - feat: Busca de pessoal insensível a acentos (unaccent)
 - Mudanças:
   - Implementada extensão `unaccent` no PostgreSQL e criada coluna computada `search_text` (imutável) na tabela `personnel`.
   - Atualizada a função `get_personnel_stats` para usar `unaccent` tanto no termo de busca quanto nos dados.
   - Atualizado o frontend (`usePersonnelQuery.ts`) para normalizar (remover acentos) do termo de busca antes de enviar para a API.
   - Adicionada função utilitária `removeAccents` em `src/lib/utils.ts`.
 - Arquivos:
   - `supabase/migrations/20260309100000_enable_unaccent_search.sql`
   - `src/hooks/queries/usePersonnelQuery.ts`
   - `src/lib/utils.ts`
 - Impacto:
   - A busca por "Andre" agora retorna corretamente "André", "Andre", "Andrè", etc.
   - Melhora significativa na UX, pois o usuário não precisa se preocupar com a acentuação exata ao buscar pessoas.

## [2026-03-11] - feat: Limitação de linhas nos relatórios de pessoal
 - Mudanças:
   - Adicionado `line-clamp-3` (máximo de 3 linhas) com `whitespace-normal` e `break-words` nas células dos relatórios de impressão (`PayrollPrintTable`, `PersonnelPaymentsPrintTable`, `PaymentForecastPrintTable`).
   - Atualizado CSS global (`index.css`) e específico da página (`PayrollReportPage.tsx`) para permitir quebra de linha (`white-space: normal`) em vez de forçar linha única (`nowrap`).
 - Arquivos:
   - `src/components/payroll/PayrollPrintTable.tsx`
   - `src/components/personnel-payments/PersonnelPaymentsPrintTable.tsx`
   - `src/components/payment-forecast/PaymentForecastPrintTable.tsx`
   - `src/pages/PayrollReportPage.tsx`
   - `src/index.css`
 - Impacto:
   - Resolve o problema de sobreposição de informações em células com muito texto nos relatórios.
   - Garante que nomes longos, descrições e observações sejam exibidos corretamente, limitados a 3 linhas para manter o layout da tabela.
