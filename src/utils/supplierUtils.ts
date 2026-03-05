// Formatação e validação de CNPJ
export const formatCNPJ = (cnpj: string): string => {
  if (!cnpj) return '';
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

export const validateCNPJ = (cnpj: string): boolean => {
  if (!cnpj) return false;
  
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  
  // Eliminar CNPJs com todos os dígitos iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validar primeiro dígito verificador
  let sum = 0;
  let pos = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * pos;
    pos = pos === 2 ? 9 : pos - 1;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(cleaned.charAt(12))) return false;
  
  // Validar segundo dígito verificador
  sum = 0;
  pos = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * pos;
    pos = pos === 2 ? 9 : pos - 1;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(cleaned.charAt(13))) return false;
  
  return true;
};

// Máscara de CNPJ para input
export const applyCNPJMask = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  let masked = cleaned;
  
  if (cleaned.length > 2) {
    masked = cleaned.slice(0, 2) + '.' + cleaned.slice(2);
  }
  if (cleaned.length > 5) {
    masked = masked.slice(0, 6) + '.' + masked.slice(6);
  }
  if (cleaned.length > 8) {
    masked = masked.slice(0, 10) + '/' + masked.slice(10);
  }
  if (cleaned.length > 12) {
    masked = masked.slice(0, 15) + '-' + cleaned.slice(12, 14);
  }
  
  return masked.slice(0, 18); // Limitar ao tamanho máximo
};

// Busca de CEP via ViaCEP
export interface AddressData {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export const fetchAddressByCEP = async (cep: string): Promise<AddressData | null> => {
  try {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return null;
    
    const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
    const data = await response.json();
    
    if (data.erro) return null;
    
    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || ''
    };
  } catch (error) {
    console.error('Error fetching address by CEP:', error);
    return null;
  }
};

// Máscara de CEP para input
export const applyCEPMask = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 5) return cleaned;
  return cleaned.slice(0, 5) + '-' + cleaned.slice(5, 8);
};

// Lista de estados brasileiros
export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
];

// Formatação de telefone brasileiro
export const formatPhoneBrazil = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};

// Máscara de telefone para input
export const applyPhoneMask = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  let masked = cleaned;
  
  if (cleaned.length > 0) {
    masked = '(' + cleaned;
  }
  if (cleaned.length > 2) {
    masked = masked.slice(0, 3) + ') ' + masked.slice(3);
  }
  if (cleaned.length > 7) {
    masked = masked.slice(0, 10) + '-' + masked.slice(10);
  }
  
  return masked.slice(0, 15); // Limitar ao tamanho máximo
};

// Calcula o total pago de fornecedores considerando apenas status 'paid'
export const calcularTotalPagoFornecedores = (custos: Array<{
  payment_status?: string | null;
  paid_amount?: string | number | null;
}>): number => {
  if (!custos || !Array.isArray(custos)) return 0;
  
  return custos
    .filter(custo => {
      const status = String(custo.payment_status || '').toLowerCase();
      return status === 'paid';
    })
    .reduce((total, custo) => {
      const paidAmount = Number(custo.paid_amount) || 0;
      return total + paidAmount;
    }, 0);
};
