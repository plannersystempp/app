import { describe, it, expect } from 'vitest';
import { calcularTotalPagoFornecedores } from '../supplierUtils';

describe('calcularTotalPagoFornecedores', () => {
  it('deve retornar 0 quando o array estiver vazio', () => {
    const resultado = calcularTotalPagoFornecedores([]);
    expect(resultado).toBe(0);
  });

  it('deve retornar 0 quando não houver custos com status paid', () => {
    const custos = [
      { payment_status: 'pending', paid_amount: 100 },
      { payment_status: 'partially_paid', paid_amount: 50 },
      { payment_status: null, paid_amount: 200 },
      { payment_status: undefined, paid_amount: 150 },
    ];
    const resultado = calcularTotalPagoFornecedores(custos);
    expect(resultado).toBe(0);
  });

  it('deve somar apenas custos com status paid', () => {
    const custos = [
      { payment_status: 'paid', paid_amount: 100 },
      { payment_status: 'pending', paid_amount: 50 },
      { payment_status: 'paid', paid_amount: 200 },
      { payment_status: 'partially_paid', paid_amount: 75 },
      { payment_status: 'paid', paid_amount: 150 },
    ];
    const resultado = calcularTotalPagoFornecedores(custos);
    expect(resultado).toBe(450); // 100 + 200 + 150
  });

  it('deve considerar case insensitive para status paid', () => {
    const custos = [
      { payment_status: 'PAID', paid_amount: 100 },
      { payment_status: 'Paid', paid_amount: 200 },
      { payment_status: 'paid', paid_amount: 150 },
    ];
    const resultado = calcularTotalPagoFornecedores(custos);
    expect(resultado).toBe(450); // 100 + 200 + 150
  });

  it('deve tratar valores nulos e undefined corretamente', () => {
    const custos = [
      { payment_status: 'paid', paid_amount: null },
      { payment_status: 'paid', paid_amount: undefined },
      { payment_status: 'paid', paid_amount: 0 },
      { payment_status: 'paid', paid_amount: 100 },
    ];
    const resultado = calcularTotalPagoFornecedores(custos);
    expect(resultado).toBe(100); // apenas o último valor válido
  });

  it('deve converter strings numéricas para números', () => {
    const custos = [
      { payment_status: 'paid', paid_amount: '100.50' },
      { payment_status: 'paid', paid_amount: '200' },
      { payment_status: 'paid', paid_amount: 'invalid' },
    ];
    const resultado = calcularTotalPagoFornecedores(custos);
    expect(resultado).toBe(300.5); // 100.50 + 200
  });

  it('deve retornar 0 quando o parâmetro não for um array', () => {
    const resultado1 = calcularTotalPagoFornecedores(null as unknown as Array<{ payment_status?: string; paid_amount?: string | number }>);
    const resultado2 = calcularTotalPagoFornecedores(undefined as unknown as Array<{ payment_status?: string; paid_amount?: string | number }>);
    const resultado3 = calcularTotalPagoFornecedores('not an array' as unknown as Array<{ payment_status?: string; paid_amount?: string | number }>);
    const resultado4 = calcularTotalPagoFornecedores({} as unknown as Array<{ payment_status?: string; paid_amount?: string | number }>);
    
    expect(resultado1).toBe(0);
    expect(resultado2).toBe(0);
    expect(resultado3).toBe(0);
    expect(resultado4).toBe(0);
  });

  it('deve lidar com arrays grandes eficientemente', () => {
    const custos = Array.from({ length: 1000 }, (_, i) => ({
      payment_status: i % 2 === 0 ? 'paid' : 'pending',
      paid_amount: i + 1,
    }));
    
    const resultado = calcularTotalPagoFornecedores(custos);
    
    // Soma dos números ímpares de 1 a 999 (500 termos: 1, 3, 5, ..., 999)
    const expected = Array.from({ length: 500 }, (_, i) => i * 2 + 1).reduce((sum, val) => sum + val, 0);
    expect(resultado).toBe(expected);
  });
});