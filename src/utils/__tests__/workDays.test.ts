import { describe, it, expect } from 'vitest';
import { normalizeWorkDays } from '../workDays';

describe('normalizeWorkDays', () => {
  it('deduplica, ordena e remove entradas inválidas', () => {
    const out = normalizeWorkDays([
      '2026-03-24',
      ' 2026-03-23 ',
      '2026-03-23',
      '',
      '   ',
      'invalid',
    ]);

    expect(out).toEqual(['2026-03-23', '2026-03-24']);
  });

  it('normaliza datas com time para YYYY-MM-DD', () => {
    const out = normalizeWorkDays(['2026-03-23T00:00:00', '2026-03-23T12:00:00']);
    expect(out).toEqual(['2026-03-23']);
  });

  it('filtra por availableDays quando fornecido', () => {
    const out = normalizeWorkDays(['2026-03-23', '2026-03-24', '2026-03-25'], {
      availableDays: ['2026-03-24', '2026-03-25'],
    });

    expect(out).toEqual(['2026-03-24', '2026-03-25']);
  });
});
