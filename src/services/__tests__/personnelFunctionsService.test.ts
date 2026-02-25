import { describe, it, expect, vi } from 'vitest';
import type { PostgrestError } from '@supabase/supabase-js';
import type { PersonnelFunctionsRepository, PersonnelFunctionRow } from '@/services/personnelFunctionsService';
import {
  buildPersonnelFunctionRows,
  replacePersonnelFunctions,
} from '@/services/personnelFunctionsService';

const makePgError = (message: string): PostgrestError => {
  return {
    message,
    details: null,
    hint: null,
    code: '42501',
  };
};

describe('personnelFunctionsService', () => {
  describe('buildPersonnelFunctionRows', () => {
    it('deduplica functionIds e define primary quando só há uma função', () => {
      const rows = buildPersonnelFunctionRows({
        personnelId: 'p1',
        teamId: 't1',
        functionIds: ['f1', 'f1'],
        functionCaches: { f1: 500 },
        functionOvertimes: { f1: 80 },
      });

      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        personnel_id: 'p1',
        function_id: 'f1',
        team_id: 't1',
        is_primary: true,
        custom_cache: 500,
        custom_overtime: 80,
      });
    });

    it('define primary pelo primaryFunctionId quando fornecido', () => {
      const rows = buildPersonnelFunctionRows({
        personnelId: 'p1',
        teamId: 't1',
        functionIds: ['f1', 'f2'],
        primaryFunctionId: 'f2',
        functionCaches: { f1: 1000 },
      });

      const f1 = rows.find((r) => r.function_id === 'f1');
      const f2 = rows.find((r) => r.function_id === 'f2');
      expect(f1?.is_primary).toBe(false);
      expect(f2?.is_primary).toBe(true);
      expect(f1?.custom_cache).toBe(1000);
      expect(f2?.custom_cache).toBe(null);
    });
  });

  describe('replacePersonnelFunctions', () => {
    it('restaura associações anteriores se insert falhar', async () => {
      const previous: PersonnelFunctionRow[] = [
        {
          personnel_id: 'p1',
          function_id: 'f_old',
          team_id: 't1',
          is_primary: true,
          custom_cache: 123,
          custom_overtime: 10,
        },
      ];

      const repo: PersonnelFunctionsRepository = {
        listByPersonnelId: vi.fn(async () => ({ data: previous, error: null })),
        deleteByPersonnelId: vi.fn(async () => ({ error: null })),
        insert: vi.fn(async () => ({ error: makePgError('rls') })),
        upsert: vi.fn(async () => ({ error: null })),
      };

      await expect(
        replacePersonnelFunctions(repo, {
          personnelId: 'p1',
          teamId: 't1',
          rows: [
            {
              personnel_id: 'p1',
              function_id: 'f_new',
              team_id: 't1',
              is_primary: true,
              custom_cache: 999,
              custom_overtime: null,
            },
          ],
        })
      ).rejects.toMatchObject({ message: 'rls' });

      expect(repo.listByPersonnelId).toHaveBeenCalledTimes(1);
      expect(repo.deleteByPersonnelId).toHaveBeenCalledTimes(1);
      expect(repo.insert).toHaveBeenCalledTimes(2);
      expect((repo.insert as unknown as { mock: { calls: unknown[][] } }).mock.calls[1][0]).toEqual(previous);
    });
  });
});

