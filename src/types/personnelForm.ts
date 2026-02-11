export interface PersonnelFormData {
  name: string;
  email: string;
  phone: string;
  phone_secondary: string;
  type: 'fixo' | 'freelancer';
  functionIds: string[];
  primaryFunctionId: string;
  monthly_salary: number;
  event_cache: number;
  overtime_rate: number;
  cpf: string;
  cnpj: string;
  pixKey: string;
  photo_url: string;
  shirt_size: string;
  address_zip_code: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  functionCaches: Record<string, number>;
  functionOvertimes: Record<string, number>;
  rg?: string;
  mothers_name?: string;
  birth_date?: string;
}
