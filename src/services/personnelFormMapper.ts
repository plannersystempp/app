import type { Personnel } from '@/contexts/EnhancedDataContext';
import type { PersonnelFormData } from '@/types/personnelForm';

export const buildPersonnelFormInitialData = (personnel: Personnel): PersonnelFormData => {
  const functionIds = personnel.functions?.map((f) => f.id) ?? [];
  const primaryFunctionId = personnel.primaryFunctionId ?? (personnel.functions?.[0]?.id ?? '');

  const functionCaches = (personnel.functions ?? []).reduce<Record<string, number>>((acc, f) => {
    if (f.custom_cache !== undefined && f.custom_cache !== null) acc[f.id] = f.custom_cache;
    return acc;
  }, {});

  const functionOvertimes = (personnel.functions ?? []).reduce<Record<string, number>>((acc, f) => {
    if (f.custom_overtime !== undefined && f.custom_overtime !== null) acc[f.id] = f.custom_overtime;
    return acc;
  }, {});

  return {
    name: personnel.name,
    email: personnel.email ?? '',
    phone: personnel.phone ?? '',
    phone_secondary: personnel.phone_secondary ?? '',
    type: personnel.type === 'fixo' ? 'fixo' : 'freelancer',
    functionIds,
    primaryFunctionId,
    monthly_salary: personnel.monthly_salary ?? 0,
    event_cache: personnel.event_cache ?? 0,
    overtime_rate: personnel.overtime_rate ?? 0,
    cpf: personnel.cpf ?? '',
    cnpj: personnel.cnpj ?? '',
    pixKey: '',
    photo_url: personnel.photo_url ?? '',
    shirt_size: personnel.shirt_size ?? '',
    address_zip_code: personnel.address_zip_code ?? '',
    address_street: personnel.address_street ?? '',
    address_number: personnel.address_number ?? '',
    address_complement: personnel.address_complement ?? '',
    address_neighborhood: personnel.address_neighborhood ?? '',
    address_city: personnel.address_city ?? '',
    address_state: personnel.address_state ?? '',
    functionCaches,
    functionOvertimes,
    rg: personnel.rg ?? '',
    birth_date: personnel.birth_date ?? '',
    mothers_name: personnel.mothers_name ?? '',
  };
};
