import React, { useMemo } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { formatPeriodDays, generateDateArray, formatDateBR } from '@/utils/dateUtils';
import { getDefaultVisiblePayrollReportColumns, type PayrollReportColumnId, getPayrollReportColumnLabel } from './payrollReportColumns';
import type { ReportBrandingState } from '@/hooks/useReportBranding';

type EventInfo = {
  name?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  setup_start_date?: string;
  setup_end_date?: string;
  payment_due_date?: string;
  status?: string;
};

type PayrollDetail = {
  personName: string;
  personType: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  mothersName?: string;
  eventRole?: string;
  divisions?: string;
  workDays: string[] | number;
  workDaysList?: string[];
  totalOvertimeHours: number | string;
  cachePay: number;
  overtimePay: number;
  totalPay: number;
  paidAmount?: number;
  pendingAmount?: number;
  cacheRate?: number;
  eventSpecificCacheRate?: number;
  hasEventSpecificCache?: boolean;
};

interface PayrollPrintTableProps {
  teamName?: string;
  event?: EventInfo | null;
  details: PayrollDetail[];
  showPartialPaid?: boolean;
  visibleColumns?: PayrollReportColumnId[];
  branding?: ReportBrandingState;
}

export const PayrollPrintTable: React.FC<PayrollPrintTableProps> = ({ teamName, event, details, showPartialPaid, visibleColumns, branding }) => {
  const totalGeral = details.reduce((sum, d) => sum + (d.totalPay || 0), 0);
  const hasPartialPayments = showPartialPaid && details.some(d => (d.paidAmount || 0) > 0 && (d.pendingAmount || 0) > 0);
  const totalPagoParcial = details
    .filter(d => (d.paidAmount || 0) > 0 && (d.pendingAmount || 0) > 0)
    .reduce((sum, d) => sum + (d.paidAmount || 0), 0);
  const totalPendente = details.reduce((sum, d) => sum + (d.pendingAmount || 0), 0);

  const formatDate = (d?: string) => (d ? formatDateBR(d) : '—');

  // Ordenar alfabeticamente por nome, respeitando pt-BR e acentuação
  const detalhesOrdenados = useMemo(() => {
    return [...details].sort((a, b) =>
      (a.personName || '').localeCompare((b.personName || ''), 'pt-BR', { sensitivity: 'base' })
    );
  }, [details]);

  const columns = visibleColumns && visibleColumns.length ? visibleColumns : getDefaultVisiblePayrollReportColumns();

  const containsPersonalData = columns.some(colId => ['cpf', 'rg', 'birthDate', 'mothersName'].includes(colId));
  const footerNotice = containsPersonalData
    ? 'Uso interno — este relatório pode conter dados pessoais e sensíveis.'
    : 'Uso interno — este relatório pode conter informações sensíveis.';

  const showLogo = branding?.showLogo ?? true;
  const brandLogo = branding?.logoDataUrl ?? null;
  const paperLetterhead = branding?.paperLetterhead ?? false;

  const headerClassName = (colId: PayrollReportColumnId) => {
    if (colId === 'dailyCache' || colId === 'overtimePay' || colId === 'totalPay') return 'payroll-th text-right';
    if (colId === 'workDays' || colId === 'workDaysCount' || colId === 'overtimeHours') return 'payroll-th text-center';
    return 'payroll-th';
  };

  const cellClassName = (colId: PayrollReportColumnId) => {
    if (colId === 'dailyCache' || colId === 'overtimePay' || colId === 'totalPay') return 'payroll-td text-right';
    if (colId === 'workDays' || colId === 'workDaysCount' || colId === 'overtimeHours') return 'payroll-td text-center';
    return 'payroll-td';
  };

  const renderWorkDays = (item: PayrollDetail) => {
    const list = item.workDaysList || (Array.isArray(item.workDays) ? (item.workDays as string[]) : undefined);
    if (list?.length) return formatPeriodDays(list);
    if (event?.start_date && event?.end_date) {
      const range = generateDateArray(event.start_date, event.end_date);
      const count = typeof item.workDays === 'number' ? item.workDays : range.length;
      if (count === range.length) return formatPeriodDays(range);
    }
    return '—';
  };

  const renderWorkDaysCount = (item: PayrollDetail) => {
    if (typeof item.workDays === 'number') return item.workDays;
    const list = item.workDaysList || (Array.isArray(item.workDays) ? (item.workDays as string[]) : undefined);
    if (list?.length) return list.length;
    if (event?.start_date && event?.end_date) {
      const range = generateDateArray(event.start_date, event.end_date);
      return range.length;
    }
    return 0;
  };

  const renderCell = (colId: PayrollReportColumnId, item: PayrollDetail) => {
    switch (colId) {
      case 'name':
        return <div className="payroll-person-name">{item.personName}</div>;
      case 'role':
        return <div className="payroll-person-type">{item.eventRole || item.personType || '—'}</div>;
      case 'division':
        return item.divisions || '—';
      case 'cpf':
        return item.cpf || '—';
      case 'rg':
        return item.rg || '—';
      case 'birthDate':
        return item.birthDate ? formatDateBR(item.birthDate) : '—';
      case 'mothersName':
        return item.mothersName || '—';
      case 'dailyCache':
        return formatCurrency((item.eventSpecificCacheRate ?? item.cacheRate ?? 0) as number);
      case 'workDays':
        return renderWorkDays(item);
      case 'workDaysCount':
        return renderWorkDaysCount(item);
      case 'overtimeHours':
        return item.totalOvertimeHours ?? 0;
      case 'overtimePay':
        return formatCurrency(item.overtimePay);
      case 'totalPay':
        return formatCurrency(item.totalPay);
      default:
        return '—';
    }
  };

  const shouldShowFooter = columns.includes('totalPay');

  return (
    <div className="payroll-report-page print-section p-8 max-w-[210mm] mx-auto" style={paperLetterhead ? { paddingTop: '40mm' } : undefined}>
      {/* Cabeçalho Completo */}
      <div className="mb-6">
        <div className="payroll-report-info">
          <div className="flex justify-center mb-2">
            {showLogo ? (
              <img
                src={brandLogo || "/icons/logo_plannersystem.png"}
                alt={brandLogo ? "Logomarca" : "PlannerSystem"}
                className="h-6 w-auto opacity-80"
              />
            ) : null}
          </div>
          <div style={{fontSize: '18px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px', textAlign: 'center'}}>
            {teamName}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            <div><strong>Evento:</strong> {event?.name || '—'}</div>
            <div><strong>Local:</strong> {event?.location || '—'}</div>
            <div><strong>Início:</strong> {formatDate(event?.start_date)} <strong>Fim:</strong> {formatDate(event?.end_date)}</div>
            <div><strong>Montagem:</strong> {formatDate(event?.setup_start_date)} → {formatDate(event?.setup_end_date)}</div>
            <div><strong>Vencimento Pagamento:</strong> {formatDate(event?.payment_due_date)}</div>
            <div><strong>Status:</strong> {event?.status || '—'}</div>
            <div><strong>Gerado em:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
      </div>

      {/* Tabela Resumo por Profissional */}
      <div className="payroll-table-container">
        <table className="payroll-table">
          <thead>
            <tr>
              {columns.map(colId => (
                <th key={colId} className={headerClassName(colId)}>{getPayrollReportColumnLabel(colId)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {detalhesOrdenados.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'payroll-row-even' : 'payroll-row-odd'}>
                {columns.map(colId => (
                  <td key={colId} className={cellClassName(colId)}>
                    <div className="line-clamp-3 whitespace-normal break-words" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {renderCell(colId, item)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {shouldShowFooter && (
            <tfoot>
              <tr className="payroll-total-row">
                <td className="payroll-td font-bold" colSpan={Math.max(1, columns.length - 1)}>TOTAL GERAL:</td>
                <td className="payroll-td text-right font-bold">{formatCurrency(totalGeral)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="mt-6 text-[10px] text-right text-muted-foreground opacity-60">
        {footerNotice} • by PlannerSystem
      </div>
    </div>
  );
};

export default PayrollPrintTable;
