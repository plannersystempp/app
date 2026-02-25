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
  insert(rows: PersonnelFunctionRow[]): Promise<{ error: PostgrestError | null }>;
  upsert(rows: PersonnelFunctionRow[], onConflict: string): Promise<{ error: PostgrestError | null }>;
}

const normalizeOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return null;
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
  return uniqueIds.map((functionId) => ({
    personnel_id: params.personnelId,
    function_id: functionId,
    team_id: params.teamId,
    is_primary: params.primaryFunctionId
      ? functionId === params.primaryFunctionId
      : uniqueIds.length === 1
        ? functionId === uniqueIds[0]
        : false,
    custom_cache: normalizeOptionalNumber(params.functionCaches?.[functionId]),
    custom_overtime: normalizeOptionalNumber(params.functionOvertimes?.[functionId]),
  }));
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

  const { error: deleteError } = await repo.deleteByPersonnelId({
    teamId: params.teamId,
    personnelId: params.personnelId,
  });
  if (deleteError) {
    logger.query.error('personnel_functions_delete', deleteError);
    throw deleteError;
  }

  if (params.rows.length === 0) return;

  const { error: insertError } = await repo.insert(params.rows);
  if (!insertError) return;

  logger.query.error('personnel_functions_insert', insertError);

  if (existingRows.length > 0) {
    const { error: restoreError } = await repo.insert(existingRows);
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

