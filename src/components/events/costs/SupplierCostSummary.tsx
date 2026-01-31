import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { EventSupplierCost } from '@/contexts/data/types';
import { formatCurrency } from '@/utils/formatters';

interface SupplierCostSummaryProps {
  costs: EventSupplierCost[];
}

export const SupplierCostSummary: React.FC<SupplierCostSummaryProps> = ({ costs }) => {
  const totalCost = costs.reduce((sum, cost) => sum + cost.total_amount, 0);
  const totalPaid = costs.reduce((sum, cost) => sum + cost.paid_amount, 0);
  const totalPending = totalCost - totalPaid;

  const pendingCount = costs.filter(c => c.payment_status === 'pending').length;
  const paidCount = costs.filter(c => c.payment_status === 'paid').length;
  const partialCount = costs.filter(c => c.payment_status === 'partially_paid').length;

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card>
        <CardContent className="p-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold break-words leading-tight">{formatCurrency(totalCost)}</div>
          <p className="text-xs text-muted-foreground mt-1">Custo Total</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold text-green-600 break-words leading-tight">{formatCurrency(totalPaid)}</div>
          <p className="text-xs text-muted-foreground mt-1">Total Pago</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold text-orange-600 break-words leading-tight">{formatCurrency(totalPending)}</div>
          <p className="text-xs text-muted-foreground mt-1">Pendente</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold break-words leading-tight">{costs.length}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground break-words mt-1 leading-tight">
            {paidCount} pagos • {partialCount} parciais • {pendingCount} pendentes
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
