
import { parseDateSafe } from './dateUtils';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Apply Brazilian phone number formatting
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};

export const formatWhatsAppNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it's a Brazilian number without country code, add 55
  if (cleaned.length === 11 || cleaned.length === 10) {
    return `55${cleaned}`;
  }
  
  // If it already has a country code or is in another format, return as is
  return cleaned;
};

export const formatDate = (date: string): string => {
  if (!date) return '';

  const s = String(date).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    return `${m[3]}/${m[2]}/${m[1]}`;
  }

  const d = parseDateSafe(s);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
};

export const formatDateTime = (date: string): string => {
  if (!date) return '';
  const d = parseDateSafe(String(date));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR');
};

/**
 * Parse hours input in various formats:
 * - "2" ou "2.5" (horas decimais)
 * - "02:30" (formato HH:MM)
 * Retorna valor decimal (ex: 2.5 para 2h30min)
 */
export const parseHoursInput = (input: string): number => {
  if (!input || input.trim() === '') return 0;
  
  const trimmed = input.trim();
  
  // Formato HH:MM (ex: "02:30")
  if (trimmed.includes(':')) {
    const [hours, minutes] = trimmed.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours + (minutes / 60);
  }
  
  // Formato decimal (ex: "2.5")
  const decimal = parseFloat(trimmed.replace(',', '.'));
  return isNaN(decimal) ? 0 : decimal;
};

/**
 * Formata horas decimais para formato legível
 * 2.5 => "02:30"
 * 1.75 => "01:45"
 * 0 => "00:00"
 */
export const formatHours = (hours: number): string => {
  if (isNaN(hours) || hours < 0) return '00:00';
  
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Formata a entrada de texto para horas no formato HH:MM enquanto o usuário digita.
 * Regras:
 * - Dígitos apenas: até 2 dígitos = horas (HH:00); 3-4 dígitos = HHMM (ex: 230 -> 02:30)
 * - Com ':' já presente: normaliza para HH:MM com padding
 * - Decimal com ponto/vírgula: 2.5 -> 02:30
 */
export const formatHoursInputLive = (input: string): string => {
  if (!input) return '';

  const raw = input.replace(/[^\d:.,]/g, '');

  // Já no formato com dois pontos
  if (raw.includes(':')) {
    const [hoursRaw, minutesRaw = ''] = raw.split(':');
    const hoursDigits = hoursRaw.replace(/\D/g, '').slice(0, 2);
    const minutesDigits = minutesRaw.replace(/\D/g, '').slice(0, 2);

    const hh = String(hoursDigits || '0').padStart(2, '0');
    const mmNum = minutesDigits ? parseInt(minutesDigits, 10) : 0;
    const mm = String(Math.min(isNaN(mmNum) ? 0 : mmNum, 59)).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // Decimal (ex: "2.5" ou "2,5")
  if (raw.includes('.') || raw.includes(',')) {
    const asNum = parseFloat(raw.replace(',', '.'));
    if (isNaN(asNum)) return '';
    return formatHours(asNum);
  }

  // Dígitos somente: minutos-primeiro
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 2) {
    // Tratar como minutos
    const mmNum = parseInt(digits, 10);
    const mm = String(Math.min(isNaN(mmNum) ? 0 : mmNum, 59)).padStart(2, '0');
    return `00:${mm}`;
  }

  // 3 ou mais dígitos: últimos 2 são minutos, anteriores horas
  const h = digits.slice(0, digits.length - 2);
  const m = digits.slice(-2);
  const hh = String(parseInt(h, 10) || 0).padStart(2, '0');
  const mmNum = parseInt(m, 10);
  const mm = String(Math.min(isNaN(mmNum) ? 0 : mmNum, 59)).padStart(2, '0');
  return `${hh}:${mm}`;
};

// ====== Helpers para digitação minutos-primeiro (push-left) ======

/** Extrai apenas dígitos de uma string mascarada */
export const extractDigits = (masked: string): string => masked.replace(/\D/g, '');

/** Aplica máscara HH:MM assumindo que os dois últimos dígitos são minutos */
export const applyMinutesFirstMaskFromDigits = (digits: string): string => {
  if (!digits) return '';
  if (digits.length <= 2) {
    const mmNum = parseInt(digits, 10);
    const mm = String(Math.min(isNaN(mmNum) ? 0 : mmNum, 59)).padStart(2, '0');
    return `00:${mm}`;
  }
  const h = digits.slice(0, digits.length - 2);
  const m = digits.slice(-2);
  const hh = String(parseInt(h, 10) || 0).padStart(2, '0');
  const mmNum = parseInt(m, 10);
  const mm = String(Math.min(isNaN(mmNum) ? 0 : mmNum, 59)).padStart(2, '0');
  return `${hh}:${mm}`;
};

/** Adiciona um dígito empurrando para a esquerda (minutos-primeiro) */
export const pushLeftAddDigit = (currentMasked: string, digit: string): string => {
  if (!/^[0-9]$/.test(digit)) return currentMasked || '';
  const digits = extractDigits(currentMasked) + digit;
  return applyMinutesFirstMaskFromDigits(digits);
};

/** Remove o último dígito (backspace) mantendo minutos-primeiro */
export const pushLeftBackspace = (currentMasked: string): string => {
  const digits = extractDigits(currentMasked);
  const newDigits = digits.slice(0, -1);
  return applyMinutesFirstMaskFromDigits(newDigits);
};

/**
 * Formata CPF: 00000000000 -> 000.000.000-00
 */
export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return cleaned.replace(/(\d{3})(\d+)/, '$1.$2');
  if (cleaned.length <= 9) return cleaned.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
  
  return cleaned
    .slice(0, 11)
    .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formata CNPJ: 00000000000000 -> 00.000.000/0000-00
 */
export const formatCNPJ = (cnpj: string): string => {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return cleaned.replace(/(\d{2})(\d+)/, '$1.$2');
  if (cleaned.length <= 8) return cleaned.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
  if (cleaned.length <= 12) return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
  
  return cleaned
    .slice(0, 14)
    .replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};
