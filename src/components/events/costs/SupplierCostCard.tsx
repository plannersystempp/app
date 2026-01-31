import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Edit, Package, Trash2, DollarSign, Calendar, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { EventSupplierCost } from '@/contexts/data/types';
import { formatDateBR, parseDateSafe } from '@/utils/dateUtils';
import { differenceInCalendarDays } from 'date-fns';
import { formatCurrency } from '@/utils/formatters';
import { SupplierPaymentDialog } from './SupplierPaymentDialog';

interface SupplierCostCardProps {
  cost: EventSupplierCost;
  onEdit: (cost: EventSupplierCost) => void;
  onDelete: (cost: EventSupplierCost) => void;
}

export const SupplierCostCard: React.FC<SupplierCostCardProps> = ({ cost, onEdit, onDelete }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const handlePaymentSuccess = () => {};

  const getStatusBadge = () => {
    if (cost.payment_status === 'pending') {
      return <StatusBadge status={'concluido_pagamento_pendente'} labelOverride="Pendente" />;
    }
    const statusConfig = {
      partially_paid: { label: 'Parcial', variant: 'default' as const },
      paid: { label: 'Pago', variant: 'default' as const }
    } as const;

    const config = (statusConfig as any)[cost.payment_status];
    return config ? <Badge variant={config.variant}>{config.label}</Badge> : <Badge variant="outline">{cost.payment_status}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base line-clamp-1">{cost.description}</CardTitle>
              <p className="text-sm text-muted-foreground">{cost.supplier_name}</p>
            </div>
            {isAdmin && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(cost)}
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <Edit className="h-4 w-4 text-muted-foreground dark:text-white" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(cost)}
                  className="h-8 w-8 p-0 flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          {cost.category && (
            <div className="flex items-center gap-2">
              <Package className="h-3 w-3 text-muted-foreground dark:text-white" />
              <span className="text-muted-foreground">{cost.category}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Quantidade</p>
              <p className="font-medium">{cost.quantity}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Preço Unit.</p>
              <p className="font-medium">{formatCurrency(cost.unit_price)}</p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-bold break-words">{formatCurrency(cost.total_amount)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            {getStatusBadge()}
            <span className="text-xs text-muted-foreground">
              Pago: {formatCurrency(cost.paid_amount)}
            </span>
          </div>

          {cost.payment_date && (cost.payment_status === 'paid' || cost.payment_status === 'partially_paid') && (
            <div className="text-xs text-muted-foreground">
              Pago em: {formatDateBR(cost.payment_date)}
            </div>
          )}
          {cost.payment_date && cost.payment_status === 'pending' && (() => {
            const payDate = parseDateSafe(String(cost.payment_date));
            const today = new Date();
            const daysDiff = differenceInCalendarDays(payDate, today);
            const isOverdue = daysDiff < 0;
            return (
              <div className={`text-xs ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
                {isOverdue
                  ? `Vencido em: ${formatDateBR(cost.payment_date)} (${Math.abs(daysDiff)} dia(s) de atraso)`
                  : daysDiff === 0
                    ? `Vence hoje: ${formatDateBR(cost.payment_date)}`
                    : `Agendado para: ${formatDateBR(cost.payment_date)} (em ${daysDiff} dia(s))`}
              </div>
            );
          })()}

          {cost.notes && (
            <div className="text-xs text-muted-foreground pt-2 border-t flex gap-1">
              <Info className="h-3 w-3 text-muted-foreground dark:text-white flex-shrink-0 mt-0.5" />
              <p className="line-clamp-2">{cost.notes}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0 pb-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={() => setShowPaymentDialog(true)}
          >
            <DollarSign className="h-3 w-3 mr-2 dark:text-white" />
            Gerenciar Pagamentos
          </Button>
        </CardFooter>
      </Card>

      <SupplierPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        cost={cost}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
};
