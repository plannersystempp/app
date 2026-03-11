import React, { useMemo } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { formatDateBR } from '@/utils/dateUtils';

type PaymentDetail = {
  id: string;
  personnelName: string;
  description: string;
  amount: number;
  paymentDueDate: string;
  paymentStatus: string;
  paidAt?: string;
  paymentMethod?: string;
  notes?: string;
};

interface PersonnelPaymentsPrintTableProps {
  teamName?: string;
  payments: PaymentDetail[];
  filterStatus?: string;
}

export const PersonnelPaymentsPrintTable: React.FC<PersonnelPaymentsPrintTableProps> = ({ 
  teamName, 
  payments,
  filterStatus 
}) => {
  const totalGeral = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPago = payments
    .filter(p => p.paymentStatus === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPendente = payments
    .filter(p => p.paymentStatus === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Ordenar alfabeticamente por nome
  const pagamentosOrdenados = useMemo(() => {
    return [...payments].sort((a, b) =>
      (a.personnelName || '').localeCompare((b.personnelName || ''), 'pt-BR', { sensitivity: 'base' })
    );
  }, [payments]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Pendente',
      'paid': 'Pago',
      'cancelled': 'Cancelado'
    };
    return labels[status] || status;
  };

  const getFilterLabel = () => {
    if (!filterStatus) return 'Todos os Pagamentos';
    const labels: Record<string, string> = {
      'pending': 'Pagamentos Pendentes',
      'paid': 'Pagamentos Realizados',
      'cancelled': 'Pagamentos Cancelados'
    };
    return labels[filterStatus] || 'Pagamentos Avulsos';
  };

  return (
    <div className="payroll-report-page print-section p-8 max-w-[210mm] mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h2 className="payroll-report-subtitle text-center">Relatório de Pagamentos Avulsos</h2>
        <div className="payroll-report-info">
          <div style={{fontSize: '18px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px', textAlign: 'center'}}>
            {teamName}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            <div><strong>Tipo:</strong> {getFilterLabel()}</div>
            <div><strong>Total de Pagamentos:</strong> {payments.length}</div>
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

      {/* Tabela de Pagamentos */}
      <div className="payroll-table-container">
        <table className="payroll-table">
          <thead>
            <tr>
              <th className="payroll-th">Profissional</th>
              <th className="payroll-th">Descrição</th>
              <th className="payroll-th text-center">Vencimento</th>
              <th className="payroll-th text-center">Status</th>
              <th className="payroll-th text-center">Data Pagamento</th>
              <th className="payroll-th text-right">Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            {pagamentosOrdenados.map((payment, index) => (
              <tr key={payment.id} className={index % 2 === 0 ? 'payroll-row-even' : 'payroll-row-odd'}>
                <td className="payroll-td">
                  <div className="payroll-person-name line-clamp-3 whitespace-normal break-words" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{payment.personnelName}</div>
                </td>
                <td className="payroll-td">
                  <div className="line-clamp-3 whitespace-normal break-words" style={{ maxWidth: '200px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {payment.description}
                  </div>
                </td>
                <td className="payroll-td text-center">
                  {formatDateBR(payment.paymentDueDate)}
                </td>
                <td className="payroll-td text-center">
                  {getStatusLabel(payment.paymentStatus)}
                </td>
                <td className="payroll-td text-center">
                  {payment.paidAt ? formatDateBR(payment.paidAt) : '—'}
                </td>
                <td className="payroll-td text-right payroll-value">
                  {formatCurrency(payment.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumo Financeiro */}
      <div className="payroll-summary mt-6 p-4 border-2 border-primary/30 rounded">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground">Total Geral</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalGeral)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground">Total Pago</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPago)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground">Total Pendente</div>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalPendente)}</div>
          </div>
        </div>
      </div>

      {/* Notas adicionais */}
      <div className="mt-6 text-xs text-muted-foreground">
        <p><strong>Observação:</strong> Este relatório apresenta os pagamentos avulsos registrados no sistema. 
        Valores pendentes devem ser quitados até a data de vencimento.</p>
      </div>
    </div>
  );
};
