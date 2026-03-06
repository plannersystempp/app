## [2026-03-06] - fix: Ajuste no frontend para usar taxa de hora extra histórica
 - Mudanças:
   - Atualizada a interface `RawAllocation` e as queries no `payrollDataService.ts` para incluir a coluna `event_specific_overtime`.
   - Ajustada a função `getOvertimeRate` em `payrollCalculations.ts` para priorizar a `event_specific_overtime` da alocação, se existir.
   - Isso garante que o card de detalhes da folha de pagamento exiba o valor de horas extras calculado com a taxa congelada (snapshot), corrigindo a divergência visual de centavos ou valores incorretos em eventos passados.
 - Arquivos:
   - `src/services/payrollDataService.ts`
   - `src/components/payroll/payrollCalculations.ts`
 - Impacto:
   - O card de detalhes do pagamento agora bate exatamente com o valor "Pendente: R$ 0,00" (ou valor real pendente) calculado pelo backend, eliminando a confusão onde o usuário via uma pendência de centavos que não deveria existir.
