import { describe, expect, it } from 'vitest';
import { findRouteAccessRule } from '@/lib/routeAccess';

describe('routeAccess', () => {
  it('encontra regra de folha com parâmetro', () => {
    const rule = findRouteAccessRule('/app/folha/123');
    expect(rule?.required).toBe('finance');
  });

  it('retorna null para rota não mapeada', () => {
    const rule = findRouteAccessRule('/app/eventos');
    expect(rule).toBe(null);
  });
});

