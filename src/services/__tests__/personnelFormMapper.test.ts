import { describe, it, expect } from 'vitest';
import type { Personnel } from '@/contexts/EnhancedDataContext';
import { buildPersonnelFormInitialData } from '@/services/personnelFormMapper';

describe('buildPersonnelFormInitialData', () => {
  it('mapeia RG, data de nascimento e nome da mãe para o form', () => {
    const personnel: Personnel = {
      id: 'p1',
      team_id: 't1',
      name: 'Adriano Nogueira de Carvalho',
      type: 'freelancer',
      created_at: new Date().toISOString(),
      rg: '00.000.000-0',
      birth_date: '1990-01-31',
      mothers_name: 'Maria de Carvalho',
      functions: [],
    };

    const form = buildPersonnelFormInitialData(personnel);
    expect(form.rg).toBe('00.000.000-0');
    expect(form.birth_date).toBe('1990-01-31');
    expect(form.mothers_name).toBe('Maria de Carvalho');
  });
});
