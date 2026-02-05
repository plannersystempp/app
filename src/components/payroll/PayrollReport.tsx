
import React from 'react';
import { formatCurrency } from '@/utils/formatters';
import { formatDateBR } from '@/utils/dateUtils';

export interface PayrollReportData {
  id: string;
  personName: string;
  eventName: string;
  eventDate: string;
  eventStartDate: string;
  eventEndDate: string;
  workDays: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  cacheRate: number;
  overtimeRate: number;
  basePayment: number;
  overtimePayment: number;
  totalPayment: number;
  paid: boolean;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  mothersName?: string;
  pixKey?: string;
}

interface PayrollReportProps {
  data: PayrollReportData[];
}

export const PayrollReport: React.FC<PayrollReportProps> = ({ data }) => {
  if (!data.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum dado de folha de pagamento encontrado.</p>
      </div>
    );
  }

  const totalAmount = data.reduce((sum, item) => sum + item.totalPayment, 0);
  const paidAmount = data.filter(item => item.paid).reduce((sum, item) => sum + item.totalPayment, 0);
  const pendingAmount = totalAmount - paidAmount;

  const eventInfo = data[0];

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Cabeçalho */}
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold">Relatório de Folha de Pagamento</h1>
        <div className="mt-2 text-muted-foreground">
          <h2 className="text-lg font-semibold">{eventInfo.eventName}</h2>
          <p>
            Período: {formatDateBR(eventInfo.eventStartDate)} a {formatDateBR(eventInfo.eventEndDate)}
          </p>
          <p className="text-sm">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</div>
          <div className="text-sm text-blue-700">Total Geral</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</div>
          <div className="text-sm text-green-700">Total Pago</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(pendingAmount)}</div>
          <div className="text-sm text-orange-700">Pendente</div>
        </div>
      </div>

      {/* Detalhamento por Pessoa */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Detalhamento por Profissional</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-3 py-2 text-left">Profissional</th>
                <th className="border border-gray-300 px-3 py-2 text-left hidden print:table-cell">Doc. Pessoais</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Dias</th>
                <th className="border border-gray-300 px-3 py-2 text-center">H. Extras</th>
                <th className="border border-gray-300 px-3 py-2 text-right">Cachê</th>
                <th className="border border-gray-300 px-3 py-2 text-right">H. Extras</th>
                <th className="border border-gray-300 px-3 py-2 text-right">Total</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2">
                    <div className="font-medium">{item.personName}</div>
                    {/* Exibe PIX na tela normal, esconde na impressão se quiser limpar */}
                    {item.pixKey && (
                      <div className="text-xs text-muted-foreground print:hidden">
                        PIX: {item.pixKey}
                      </div>
                    )}
                  </td>
                  {/* Coluna de Documentos (Visível na impressão) */}
                  <td className="border border-gray-300 px-3 py-2 text-xs hidden print:table-cell">
                    <div>CPF: {item.cpf || '-'}</div>
                    {item.rg && <div>RG: {item.rg}</div>}
                    {item.mothersName && <div>Mãe: {item.mothersName}</div>}
                    {item.birthDate && <div>Nasc: {formatDateBR(item.birthDate)}</div>}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {item.workDays}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {item.totalOvertimeHours}h
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatCurrency(item.basePayment)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatCurrency(item.overtimePayment)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                    {formatCurrency(item.totalPayment)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.paid 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {item.paid ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td className="border border-gray-300 px-3 py-2" colSpan={5}>
                  Total Geral
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {formatCurrency(totalAmount)}
                </td>
                <td className="border border-gray-300 px-3 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Observações */}
      <div className="mt-8 text-xs text-muted-foreground print:mt-4">
        <p>* Este relatório foi gerado automaticamente pelo sistema PlannerSystem.</p>
        <p>* Valores calculados com base nas alocações e registros de horas do evento.</p>
      </div>
    </div>
  );
};
