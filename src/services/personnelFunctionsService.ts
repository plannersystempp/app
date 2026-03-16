import type { PostgrestError } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

export interface PersonnelFunctionRow {
  personnel_id: string;
  function_id: string;
  team_id: string;
  is_primary?: boolean;
  custom_cache?: number | null;
  custom_overtime?: number | null;
}

export interface PersonnelFunctionsRepository {
  listByPersonnelId(params: { teamId: string; personnelId: string }): Promise<{
    data: PersonnelFunctionRow[];
    error: PostgrestError | null;
  }>;
  deleteByPersonnelId(params: { teamId: string; personnelId: string }): Promise<{ error: PostgrestError | null }>;
  deleteByFunctionIds(params: {
    teamId: string;
    personnelId: string;
    functionIds: string[];
  }): Promise<{ error: PostgrestError | null }>;
  insert(rows: PersonnelFunctionRow[]): Promise<{ error: PostgrestError | null }>;
  upsert(rows: PersonnelFunctionRow[], onConflict: string): Promise<{ error: PostgrestError | null }>;
}

const normalizeOptionalNumber = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return null;
};

const hasOwn = (record: Record<string, unknown>, key: string): boolean => {
  return Object.prototype.hasOwnProperty.call(record, key);
};

const getOptionalRecordNumber = (
  record: Record<string, unknown> | undefined,
  key: string
): number | null | undefined => {
  if (!record) return undefined;
  if (!hasOwn(record, key)) return undefined;
  return normalizeOptionalNumber(record[key]);
};

export const buildPersonnelFunctionRows = (params: {
  personnelId: string;
  teamId: string;
  functionIds: string[];
  primaryFunctionId?: string;
  functionCaches?: Record<string, number>;
  functionOvertimes?: Record<string, number>;
}): PersonnelFunctionRow[] => {
  const uniqueIds = Array.from(new Set(params.functionIds));
  return uniqueIds.map((functionId) => {
    const customCache = getOptionalRecordNumber(params.functionCaches as Record<string, unknown> | undefined, functionId);
    const customOvertime = getOptionalRecordNumber(
      params.functionOvertimes as Record<string, unknown> | undefined,
      functionId
    );

    return {
      personnel_id: params.personnelId,
      function_id: functionId,
      team_id: params.teamId,
      is_primary: params.primaryFunctionId
        ? functionId === params.primaryFunctionId
        : uniqueIds.length === 1
          ? functionId === uniqueIds[0]
          : false,
      ...(customCache !== undefined ? { custom_cache: customCache } : {}),
      ...(customOvertime !== undefined ? { custom_overtime: customOvertime } : {}),
    };
  });
};

const insertPersonnelFunctionsWithPrimaryFirst = async (
  repo: PersonnelFunctionsRepository,
  rows: PersonnelFunctionRow[]
): Promise<{ error: PostgrestError | null }> => {
  if (rows.length === 0) return { error: null };

  const primaryRow = rows.find((r) => r.is_primary);
  const orderedRows = primaryRow
    ? [primaryRow, ...rows.filter((r) => r.function_id !== primaryRow.function_id)]
    : rows;

  const first = orderedRows[0];
  const { error: firstError } = await repo.insert([first]);
  if (firstError) return { error: firstError };

  const remaining = orderedRows.slice(1);
  if (remaining.length === 0) return { error: null };

  return repo.insert(remaining);
};

export const insertPersonnelFunctions = async (
  repo: PersonnelFunctionsRepository,
  rows: PersonnelFunctionRow[]
): Promise<void> => {
  const { error } = await insertPersonnelFunctionsWithPrimaryFirst(repo, rows);
  if (error) {
    logger.query.error('personnel_functions_insert', error);
    throw error;
  }
};

export const replacePersonnelFunctions = async (repo: PersonnelFunctionsRepository, params: {
  personnelId: string;
  teamId: string;
  rows: PersonnelFunctionRow[];
}): Promise<void> => {
  const { data: existingRows, error: existingError } = await repo.listByPersonnelId({
    teamId: params.teamId,
    personnelId: params.personnelId,
  });

  if (existingError) {
    logger.query.error('personnel_functions_select_existing', existingError);
    throw existingError;
  }

  const existingPrimaryIds = existingRows.filter((r) => r.is_primary).map((r) => r.function_id);
  const existingNonPrimaryIds = existingRows.filter((r) => !r.is_primary).map((r) => r.function_id);

  if (existingNonPrimaryIds.length > 0) {
    const { error: deleteNonPrimaryError } = await repo.deleteByFunctionIds({
      teamId: params.teamId,
      personnelId: params.personnelId,
      functionIds: existingNonPrimaryIds,
    });
    if (deleteNonPrimaryError) {
      logger.query.error('personnel_functions_delete_non_primary', deleteNonPrimaryError);
      throw deleteNonPrimaryError;
    }
  }

  for (const functionId of existingPrimaryIds) {
    const { error: deletePrimaryError } = await repo.deleteByFunctionIds({
      teamId: params.teamId,
      personnelId: params.personnelId,
      functionIds: [functionId],
    });
    if (deletePrimaryError) {
      logger.query.error('personnel_functions_delete_primary', deletePrimaryError);
      throw deletePrimaryError;
    }
  }

  if (params.rows.length === 0) return;

  const existingByFunctionId = existingRows.reduce<Record<string, PersonnelFunctionRow>>((acc, row) => {
    acc[row.function_id] = row;
    return acc;
  }, {});

  const rowsToInsert: PersonnelFunctionRow[] = params.rows.map((row) => {
    const existing = existingByFunctionId[row.function_id];
    if (!existing) return row;

    const merged: PersonnelFunctionRow = { ...row };
    if (merged.custom_cache === undefined && existing.custom_cache !== undefined && existing.custom_cache !== null) {
      merged.custom_cache = existing.custom_cache;
    }
    if (merged.custom_overtime === undefined && existing.custom_overtime !== undefined && existing.custom_overtime !== null) {
      merged.custom_overtime = existing.custom_overtime;
    }
    return merged;
  });

  const { error: insertError } = await insertPersonnelFunctionsWithPrimaryFirst(repo, rowsToInsert);
  if (!insertError) return;

  logger.query.error('personnel_functions_insert', insertError);

  if (existingRows.length > 0) {
    const { error: restoreError } = await insertPersonnelFunctionsWithPrimaryFirst(repo, existingRows);
    if (restoreError) {
      logger.query.error('personnel_functions_restore_previous', restoreError);
    }
  }

  throw insertError;
};

export const upsertPersonnelFunctionCustomValues = async (repo: PersonnelFunctionsRepository, params: {
  personnelId: string;
  teamId: string;
  functionCaches?: Record<string, number>;
  functionOvertimes?: Record<string, number>;
}): Promise<void> => {
  const idsToUpdate = Array.from(
    new Set([...(Object.keys(params.functionCaches || {})), ...(Object.keys(params.functionOvertimes || {}))])
  );

  if (idsToUpdate.length === 0) return;

  const rows: PersonnelFunctionRow[] = idsToUpdate.map((functionId) => ({
    personnel_id: params.personnelId,
    function_id: functionId,
    team_id: params.teamId,
    custom_cache: normalizeOptionalNumber(params.functionCaches?.[functionId]),
    custom_overtime: normalizeOptionalNumber(params.functionOvertimes?.[functionId]),
  }));

  const { error } = await repo.upsert(rows, 'personnel_id,function_id');
  if (error) {
    logger.query.error('personnel_functions_upsert', error);
    throw error;
  }
};
