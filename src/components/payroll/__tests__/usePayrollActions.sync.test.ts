// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { invalidateAfterPayrollClosingChange } from '../usePayrollActions';
import { payrollKeys } from '../../../hooks/queries/usePayrollQuery';
import { monthlyPayrollKeys } from '../../../hooks/queries/useMonthlyPayrollQuery';
import { personnelHistoryKeys } from '../../../hooks/queries/usePersonnelHistoryQuery';

type InvalidateArgs = {
  queryKey: readonly unknown[];
  refetchType?: 'active' | 'all' | 'none';
};

type QueryClientLike = {
  invalidateQueries: (args: InvalidateArgs) => unknown;
};

describe('invalidateAfterPayrollClosingChange', () => {
  it('invalida payroll, folha mensal e histórico do profissional', () => {
    const invalidateQueries = vi.fn() as unknown as (args: InvalidateArgs) => unknown;
    const queryClient: QueryClientLike = { invalidateQueries };

    invalidateAfterPayrollClosingChange(queryClient, 'event-1', 'person-1');

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: payrollKeys.event('event-1'),
      refetchType: 'active',
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: payrollKeys.all,
      refetchType: 'active',
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: monthlyPayrollKeys.all,
      refetchType: 'active',
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: personnelHistoryKeys.all('person-1'),
      refetchType: 'active',
    });
  });

  it('faz fallback para invalidar histórico de todos quando personnelId não é informado', () => {
    const invalidateQueries = vi.fn() as unknown as (args: InvalidateArgs) => unknown;
    const queryClient: QueryClientLike = { invalidateQueries };

    invalidateAfterPayrollClosingChange(queryClient, 'event-1');

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['personnel-history'],
      refetchType: 'active',
    });
  });
});

