/**
 * Data transformation utilities for sanitizing and normalizing form data
 * Parte 2: Centralizar lógica de sanitização
 */

/**
 * Converte strings vazias em null (para compatibilidade com banco)
 */
export const sanitizeString = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Arredonda números para 2 casas decimais
 */
export const sanitizeNumber = (value: any): number => {
  const num = Number(value) || 0;
  return Math.round(num * 100) / 100;
};

/**
 * Sanitiza objeto de formulário de pessoal para inserção/atualização
 */
export const sanitizePersonnelData = (data: any): any => {
  const result: any = { ...data };
  
  // Campos string
  const stringFields = [
    'cpf', 'cnpj', 'email', 'phone', 'phone_secondary', 
    'photo_url', 'shirt_size', 'address_zip_code', 
    'address_street', 'address_number', 'address_complement',
    'address_neighborhood', 'address_city', 'address_state',
    'rg', 'mothers_name', 'birth_date'
  ];
  
  stringFields.forEach(field => {
    if (field in data) result[field] = sanitizeString(data[field]);
  });
  
  // Campos numéricos
  const numberFields = ['monthly_salary', 'event_cache', 'overtime_rate'];
  numberFields.forEach(field => {
    if (field in data) result[field] = sanitizeNumber(data[field]);
  });
  
  return result;
};
