import React, { useMemo } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { formatDateShort } from '@/utils/dateUtils';
import type { WeekForecast } from '@/services/paymentForecastService';

interface PaymentForecastPrintTableProps {
  teamName?: string;
  weeks: WeekForecast[];
  weeksAhead: number;
}

export const PaymentForecastPrintTable: React.FC<PaymentForecastPrintTableProps> = ({ 
  teamName, 
  weeks,
  weeksAhead 
}) => {
  const totalGeral = useMemo(() => {
    return weeks.reduce((acc, w) => acc + w.totalAmount, 0);
  }, [weeks]);

  const maxWeekTotal = useMemo(() => {
    return weeks.reduce((m, w) => Math.max(m, w.totalAmount), 0);
  }, [weeks]);

  return (
    <div className="payroll-report-page print-section p-8 max-w-[210mm] mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h2 className="payroll-report-subtitle text-center">Previsão de Pagamentos</h2>
        <div className="payroll-report-info">
          <div style={{fontSize: '18px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px', textAlign: 'center'}}>
            {teamName}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            <div><strong>Período:</strong> Próximas {weeksAhead} semanas</div>
            <div><strong>Total de Semanas:</strong> {weeks.length}</div>
            <div><strong>Gerado em:</strong> {new Date().toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</div>
          </div>
        </div>
      </div>

      {/* Tabelas por Semana */}
      {weeks.map((week) => {
        const eventos = week.items.filter(i => i.kind === 'evento');
        const avulsos = week.items.filter(i => i.kind === 'avulso');
        
        const parseDate = (d: string) => new Date(`${d}T12:00:00`).getTime();
        const byDateThenAmount = (a: any, b: any) => {
          const da = parseDate(a.dueDate);
          const db = parseDate(b.dueDate);
          if (da !== db) return da - db;
          return b.amount - a.amount;
        };
        const eventosSorted = [...eventos].sort(byDateThenAmount);
        const avulsosSorted = [...avulsos].sort(byDateThenAmount);
        const isTopWeek = week.totalAmount === maxWeekTotal && maxWeekTotal > 0;

        return (
          <div key={`${week.weekStart}_${week.weekEnd}`} className="mb-6 break-inside-avoid">
            {/* Cabeçalho da Semana */}
            <div 
              className="px-4 py-3 mb-2 rounded"
              style={{
                backgroundColor: isTopWeek ? '#fef3c7' : '#f1f5f9',
                border: '2px solid ' + (isTopWeek ? '#f59e0b' : '#cbd5e1'),
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              Semana de {formatDateShort(week.weekStart)} a {formatDateShort(week.weekEnd)}
              <span style={{ float: 'right', color: '#1e40af' }}>
                Total: {formatCurrency(week.totalAmount)}
              </span>
            </div>

            {/* Tabela de Eventos */}
            {eventos.length > 0 && (
              <div className="mb-4">
                <div className="payroll-table-container">
                  <div style={{ 
                    backgroundColor: '#f8fafc', 
                    padding: '8px 12px', 
                    fontWeight: 'bold',
                    borderBottom: '2px solid #cbd5e1'
                  }}>
                    Eventos
                  </div>
                  <table className="payroll-table">
                    <thead>
                      <tr>
                        <th className="payroll-th">Evento</th>
                        <th className="payroll-th">Local</th>
                        <th className="payroll-th text-center">Vencimento</th>
                        <th className="payroll-th text-right">Total a Pagar (R$)</th>
                        <th className="payroll-th">Observações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventosSorted.map((item, idx) => (
                        <tr key={`evento_${item.id}`} className={idx % 2 === 0 ? 'payroll-row-even' : 'payroll-row-odd'}>
                          <td className="payroll-td">
                            <div className="payroll-person-name line-clamp-3 whitespace-normal break-words" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</div>
                          </td>
                          <td className="payroll-td">
                            <div className="line-clamp-3 whitespace-normal break-words" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.location || '—'}
                            </div>
                          </td>
                          <td className="payroll-td text-center">{formatDateShort(item.dueDate)}</td>
                          <td className="payroll-td text-right payroll-value">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="payroll-td" style={{ fontSize: '11px' }}>
                            <div className="line-clamp-3 whitespace-normal break-words" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.notes || '—'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tabela de Pagamentos Avulsos */}
            {avulsos.length > 0 && (
              <div className="mb-4">
                <div className="payroll-table-container">
                  <div style={{ 
                    backgroundColor: '#f8fafc', 
                    padding: '8px 12px', 
                    fontWeight: 'bold',
                    borderBottom: '2px solid #cbd5e1'
                  }}>
                    Pagamentos Avulsos
                  </div>
                  <table className="payroll-table">
                    <thead>
                      <tr>
                        <th className="payroll-th">Descrição</th>
                        <th className="payroll-th">Profissional</th>
                        <th className="payroll-th text-center">Vencimento</th>
                        <th className="payroll-th text-right">Total a Pagar (R$)</th>
                        <th className="payroll-th">Observações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {avulsosSorted.map((item, idx) => (
                        <tr key={`avulso_${item.id}`} className={idx % 2 === 0 ? 'payroll-row-even' : 'payroll-row-odd'}>
                          <td className="payroll-td">
                            <div className="payroll-person-name line-clamp-3 whitespace-normal break-words" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</div>
                          </td>
                          <td className="payroll-td">
                            <div className="line-clamp-3 whitespace-normal break-words" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.personnelName || '—'}
                            </div>
                          </td>
                          <td className="payroll-td text-center">{formatDateShort(item.dueDate)}</td>
                          <td className="payroll-td text-right payroll-value">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="payroll-td" style={{ fontSize: '11px' }}>
                            <div className="line-clamp-3 whitespace-normal break-words" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.notes || '—'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Resumo Financeiro */}
      <div className="payroll-summary mt-6 p-4 border-2 border-primary/30 rounded">
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground">Total Geral do Período</div>
          <div className="text-3xl font-bold text-primary">{formatCurrency(totalGeral)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Soma de todas as {weeks.length} semanas
          </div>
        </div>
      </div>

      {/* Notas adicionais */}
      <div className="mt-6 text-xs text-muted-foreground">
        <p><strong>Observação:</strong> Esta previsão consolida pagamentos de eventos e pagamentos avulsos 
        organizados por semana de vencimento. Os valores são estimativas baseadas nos dados atuais do sistema.</p>
      </div>
    </div>
  );
};
