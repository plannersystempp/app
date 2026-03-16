import { describe, it, expect } from 'vitest';
import type { PersonnelFormData } from '@/types/personnelForm';
import { buildPersonnelUpdatePayload } from '@/services/personnelUpdatePayload';

const makeBase = (): PersonnelFormData => ({
  name: 'Fulano',
  email: 'a@a.com',
  phone: '11999999999',
  phone_secondary: '',
  type: 'freelancer',
  functionIds: ['f1'],
  primaryFunctionId: 'f1',
  monthly_salary: 0,
  event_cache: 500,
  overtime_rate: 80,
  cpf: '000.000.000-00',
  cnpj: '',
  pixKey: '',
  photo_url: '',
  shirt_size: '',
  address_zip_code: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  functionCaches: {},
  functionOvertimes: {},
  rg: '12.345.678-9',
  birth_date: '1990-01-01',
  mothers_name: 'Maria',
});

describe('buildPersonnelUpdatePayload', () => {
  it('retorna patch vazio quando nada muda', () => {
    const initial = makeBase();
    const current = makeBase();
    const patch = buildPersonnelUpdatePayload({ current, initial });
    expect(patch).toEqual({});
  });

  it('não inclui pixKey no patch mesmo se mudar', () => {
    const initial = makeBase();
    const current = { ...makeBase(), pixKey: 'chave' };
    const patch = buildPersonnelUpdatePayload({ current, initial });
    expect(patch).toEqual({});
  });

  it('inclui rg/birth_date/mothers_name quando mudam', () => {
    const initial = makeBase();
    const current = { ...makeBase(), rg: '', birth_date: '', mothers_name: '' };
    const patch = buildPersonnelUpdatePayload({ current, initial });
    expect(patch).toEqual({ rg: '', birth_date: '', mothers_name: '' });
  });

  it('inclui functionCaches quando mudam', () => {
    const initial = makeBase();
    const current = { ...makeBase(), functionCaches: { f1: 1000 } };
    const patch = buildPersonnelUpdatePayload({ current, initial });
    expect(patch).toEqual({ functionCaches: { f1: 1000 } });
  });
});

