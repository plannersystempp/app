/**
 * Unit tests for validation utilities
 * Parte 7: Testes unitários para prevenir regressões
 */

import { describe, it, expect } from 'vitest';
import { 
  validateUniqueCPF, 
  validateUniqueCNPJ,
  validateCPF,
  validateCNPJ,
  validateEmail,
  validateUniquePersonnelName
} from '../validation';

describe('validateUniqueCPF', () => {
  it('should reject duplicate CPF', () => {
    const existing = [
      { id: '1', name: 'João Silva', cpf: '123.456.789-09' }
    ];
    const result = validateUniqueCPF('12345678909', existing);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('João Silva');
  });

  it('should allow same CPF when editing', () => {
    const existing = [
      { id: '1', name: 'João Silva', cpf: '123.456.789-09' }
    ];
    const result = validateUniqueCPF('12345678909', existing, '1');
    expect(result.isValid).toBe(true);
  });

  it('should allow new unique CPF', () => {
    const existing = [
      { id: '1', name: 'João Silva', cpf: '123.456.789-09' }
    ];
    const result = validateUniqueCPF('98765432100', existing);
    expect(result.isValid).toBe(true);
  });

  it('should handle CPF with formatting', () => {
    const existing = [
      { id: '1', name: 'João Silva', cpf: '12345678909' }
    ];
    const result = validateUniqueCPF('123.456.789-09', existing);
    expect(result.isValid).toBe(false);
  });

  it('should handle null/undefined CPFs', () => {
    const existing = [
      { id: '1', name: 'João Silva', cpf: null }
    ];
    const result = validateUniqueCPF('12345678909', existing);
    expect(result.isValid).toBe(true);
  });
});

describe('validateUniqueCNPJ', () => {
  it('should reject duplicate CNPJ', () => {
    const existing = [
      { id: '1', name: 'Empresa LTDA', cnpj: '12.345.678/0001-90' }
    ];
    const result = validateUniqueCNPJ('12345678000190', existing);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('Empresa LTDA');
  });

  it('should allow same CNPJ when editing', () => {
    const existing = [
      { id: '1', name: 'Empresa LTDA', cnpj: '12.345.678/0001-90' }
    ];
    const result = validateUniqueCNPJ('12345678000190', existing, '1');
    expect(result.isValid).toBe(true);
  });

  it('should allow new unique CNPJ', () => {
    const existing = [
      { id: '1', name: 'Empresa LTDA', cnpj: '12.345.678/0001-90' }
    ];
    const result = validateUniqueCNPJ('98765432000199', existing);
    expect(result.isValid).toBe(true);
  });
});

describe('validateCPF', () => {
  it('should validate valid CPF', () => {
    expect(validateCPF('11144477735')).toBe(true);
  });

  it('should reject invalid CPF', () => {
    expect(validateCPF('12345678900')).toBe(false);
  });

  it('should reject CPF with all same digits', () => {
    expect(validateCPF('11111111111')).toBe(false);
  });

  it('should handle CPF with formatting', () => {
    expect(validateCPF('111.444.777-35')).toBe(true);
  });

  it('should reject empty CPF', () => {
    expect(validateCPF('')).toBe(false);
  });
});

describe('validateCNPJ', () => {
  it('should validate valid CNPJ', () => {
    expect(validateCNPJ('11222333000181')).toBe(true);
  });

  it('should reject invalid CNPJ', () => {
    expect(validateCNPJ('12345678000190')).toBe(false);
  });

  it('should reject CNPJ with all same digits', () => {
    expect(validateCNPJ('11111111111111')).toBe(false);
  });

  it('should handle CNPJ with formatting', () => {
    expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
  });

  it('should reject empty CNPJ', () => {
    expect(validateCNPJ('')).toBe(false);
  });
});

describe('validateEmail', () => {
  it('should validate valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });

  it('should reject email without domain', () => {
    expect(validateEmail('test@')).toBe(false);
  });

  it('should reject empty email', () => {
    expect(validateEmail('')).toBe(false);
  });
});

describe('validateUniquePersonnelName', () => {
  it('should reject duplicate name', () => {
    const existing = [
      { name: 'João Silva' }
    ];
    const result = validateUniquePersonnelName('João Silva', existing);
    expect(result.isValid).toBe(false);
  });

  it('should allow same name when editing', () => {
    const existing = [
      { name: 'João Silva', id: '1' }
    ];
    const result = validateUniquePersonnelName('João Silva', existing, '1');
    expect(result.isValid).toBe(true);
  });

  it('should allow case variation of same name when editing', () => {
    const existing = [
      { name: 'João Silva', id: '1' }
    ];
    const result = validateUniquePersonnelName('JOÃO SILVA', existing, '1');
    expect(result.isValid).toBe(true);
  });

  it('should allow spacing variation of same name when editing', () => {
    const existing = [
      { name: 'João Silva', id: '1' }
    ];
    const result = validateUniquePersonnelName('João Silva ', existing, '1');
    expect(result.isValid).toBe(true);
  });

  it('should reject same name if it belongs to another person', () => {
    const existing = [
      { name: 'João Silva', id: '2' }
    ];
    const result = validateUniquePersonnelName('João Silva', existing, '1');
    expect(result.isValid).toBe(false);
  });

  it('should allow unique name', () => {
    const existing = [
      { name: 'João Silva' }
    ];
    const result = validateUniquePersonnelName('Maria Santos', existing);
    expect(result.isValid).toBe(true);
  });

  it('should suggest alternative when name is duplicate', () => {
    const existing = [
      { name: 'João Silva' }
    ];
    const result = validateUniquePersonnelName('João Silva', existing);
    expect(result.suggestedName).toBeDefined();
    expect(result.suggestedName).toContain('João Silva');
  });

  it('should be case insensitive', () => {
    const existing = [
      { name: 'João Silva' }
    ];
    const result = validateUniquePersonnelName('joão silva', existing);
    expect(result.isValid).toBe(false);
  });
});
