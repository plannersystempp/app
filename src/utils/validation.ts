// Validation utilities for security
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeInput = (input: string): string => {
  // Enhanced XSS protection and dangerous character removal
  return input
    .trim()
    .replace(/[<>&"']/g, '') // Remove XSS vectors
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};

export const sanitizeHtml = (input: string): string => {
  // HTML encode dangerous characters for display
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

export const validateName = (name: string): boolean => {
  const sanitized = sanitizeInput(name);
  return sanitized.length >= 2 && sanitized.length <= 100;
};

export interface PersonnelNameValidationResult {
  isValid: boolean;
  message?: string;
  suggestedName?: string;
}

export const validateUniquePersonnelName = (
  name: string, 
  existingPersonnel: Array<{ name: string; id?: string }>, 
  currentPersonnelId?: string
): PersonnelNameValidationResult => {
  const trimmedName = sanitizeInput(name.trim());
  
  if (!trimmedName) {
    return { isValid: false, message: 'Nome é obrigatório' };
  }
  
  if (!validateName(trimmedName)) {
    return { isValid: false, message: 'Nome deve ter entre 2 e 100 caracteres' };
  }
  
  // Check for duplicates (case insensitive)
  const duplicate = existingPersonnel.find(p => 
    p.name.toLowerCase().trim() === trimmedName.toLowerCase() && 
    // If editing, exclude the current personnel from duplicate check
    (!currentPersonnelId || p.id !== currentPersonnelId)
  );
  
  if (duplicate) {
    // Generate suggestions
    const suggestions = [
      `${trimmedName} (Técnico)`,
      `${trimmedName} (Coordenador)`,
      `${trimmedName} (Freelancer)`,
      `${trimmedName} (2)`,
      `${trimmedName} Jr.`,
      `${trimmedName} Sr.`
    ];
    
    // Find first suggestion that doesn't exist
    const suggestedName = suggestions.find(suggestion => 
      !existingPersonnel.some(p => 
        p.name.toLowerCase().trim() === suggestion.toLowerCase()
      )
    ) || `${trimmedName} (${Math.floor(Math.random() * 100)})`;
    
    return {
      isValid: false,
      message: `Já existe uma pessoa cadastrada com o nome "${duplicate.name}"`,
      suggestedName
    };
  }
  
  return { isValid: true };
};

/**
 * Remove caracteres não numéricos
 */
export const removeNonNumeric = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Valida CPF brasileiro
 */
export const validateCPF = (cpf: string): boolean => {
  const cleaned = removeNonNumeric(cpf);
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;
  
  return true;
};

/**
 * Valida CNPJ brasileiro
 */
export const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = removeNonNumeric(cnpj);
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  let length = cleaned.length - 2;
  let numbers = cleaned.substring(0, length);
  const digits = cleaned.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cleaned.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

export interface DocumentValidationResult {
  isValid: boolean;
  message?: string;
}

export const validateUniqueCPF = (
  cpf: string,
  existingPersonnel: Array<{ cpf?: string | null; name: string; id?: string }>,
  currentPersonnelId?: string
): DocumentValidationResult => {
  const cleaned = removeNonNumeric(cpf);
  
  if (!cleaned) {
    return { isValid: false, message: 'CPF é obrigatório' };
  }
  
  if (!validateCPF(cleaned)) {
    return { isValid: false, message: 'CPF inválido. Verifique os dígitos.' };
  }
  
  const duplicate = existingPersonnel.find(p => {
    if (!p.cpf) return false;
    const existingCPF = removeNonNumeric(p.cpf);
    return existingCPF === cleaned && p.id !== currentPersonnelId;
  });
  
  if (duplicate) {
    return {
      isValid: false,
      message: `CPF já cadastrado para "${duplicate.name}"`
    };
  }
  
  return { isValid: true };
};

export const validateUniqueCNPJ = (
  cnpj: string,
  existingPersonnel: Array<{ cnpj?: string | null; name: string; id?: string }>,
  currentPersonnelId?: string
): DocumentValidationResult => {
  const cleaned = removeNonNumeric(cnpj);
  
  if (!cleaned) {
    return { isValid: true };
  }
  
  if (!validateCNPJ(cleaned)) {
    return { isValid: false, message: 'CNPJ inválido. Verifique os dígitos.' };
  }
  
  const duplicate = existingPersonnel.find(p => {
    if (!p.cnpj) return false;
    const existingCNPJ = removeNonNumeric(p.cnpj);
    return existingCNPJ === cleaned && p.id !== currentPersonnelId;
  });
  
  if (duplicate) {
    return {
      isValid: false,
      message: `CNPJ já cadastrado para "${duplicate.name}"`
    };
  }
  
  return { isValid: true };
};