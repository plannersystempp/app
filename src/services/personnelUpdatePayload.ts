import type { PersonnelFormData } from '@/types/personnelForm';

const normalizeOptionalString = (value: string | undefined): string => value ?? '';

const areStringArraysEqual = (a: string[], b: string[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const areNumberRecordsEqual = (a: Record<string, number>, b: Record<string, number>): boolean => {
  if (a === b) return true;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!(key in b)) return false;
    if (a[key] !== b[key]) return false;
  }
  return true;
};

export const buildPersonnelUpdatePayload = (params: {
  current: PersonnelFormData;
  initial: PersonnelFormData;
}): Partial<PersonnelFormData> => {
  const { current, initial } = params;
  const patch: Partial<PersonnelFormData> = {};

  if (current.name !== initial.name) patch.name = current.name;
  if (current.email !== initial.email) patch.email = current.email;
  if (current.phone !== initial.phone) patch.phone = current.phone;
  if (current.phone_secondary !== initial.phone_secondary) patch.phone_secondary = current.phone_secondary;
  if (current.type !== initial.type) patch.type = current.type;

  if (!areStringArraysEqual(current.functionIds, initial.functionIds)) patch.functionIds = current.functionIds;
  if (current.primaryFunctionId !== initial.primaryFunctionId) patch.primaryFunctionId = current.primaryFunctionId;

  if (current.monthly_salary !== initial.monthly_salary) patch.monthly_salary = current.monthly_salary;
  if (current.event_cache !== initial.event_cache) patch.event_cache = current.event_cache;
  if (current.overtime_rate !== initial.overtime_rate) patch.overtime_rate = current.overtime_rate;

  if (current.cpf !== initial.cpf) patch.cpf = current.cpf;
  if (current.cnpj !== initial.cnpj) patch.cnpj = current.cnpj;

  if (current.photo_url !== initial.photo_url) patch.photo_url = current.photo_url;
  if (current.shirt_size !== initial.shirt_size) patch.shirt_size = current.shirt_size;

  if (current.address_zip_code !== initial.address_zip_code) patch.address_zip_code = current.address_zip_code;
  if (current.address_street !== initial.address_street) patch.address_street = current.address_street;
  if (current.address_number !== initial.address_number) patch.address_number = current.address_number;
  if (current.address_complement !== initial.address_complement) patch.address_complement = current.address_complement;
  if (current.address_neighborhood !== initial.address_neighborhood) patch.address_neighborhood = current.address_neighborhood;
  if (current.address_city !== initial.address_city) patch.address_city = current.address_city;
  if (current.address_state !== initial.address_state) patch.address_state = current.address_state;

  const currentRg = normalizeOptionalString(current.rg);
  const initialRg = normalizeOptionalString(initial.rg);
  if (currentRg !== initialRg) patch.rg = currentRg;

  const currentBirth = normalizeOptionalString(current.birth_date);
  const initialBirth = normalizeOptionalString(initial.birth_date);
  if (currentBirth !== initialBirth) patch.birth_date = currentBirth;

  const currentMother = normalizeOptionalString(current.mothers_name);
  const initialMother = normalizeOptionalString(initial.mothers_name);
  if (currentMother !== initialMother) patch.mothers_name = currentMother;

  if (!areNumberRecordsEqual(current.functionCaches, initial.functionCaches)) patch.functionCaches = current.functionCaches;
  if (!areNumberRecordsEqual(current.functionOvertimes, initial.functionOvertimes)) patch.functionOvertimes = current.functionOvertimes;

  return patch;
};

