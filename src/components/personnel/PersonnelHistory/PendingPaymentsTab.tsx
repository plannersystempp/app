import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingPayments } from '@/hooks/queries/usePersonnelHistoryQuery';
import { formatCurrency } from '@/utils/formatters';
import { format, isPast, differenceInCalendarDays, parseISO, addHours, startOfDay, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EmptyState } from '@/components/shared/EmptyState';

interface PendingPaymentsTabProps {
  personnelId: string;
}

export const PendingPaymentsTab: React.FC<PendingPaymentsTabProps> = ({ personnelId }) => {
  const { data: pendingPayments, isLoading } = usePendingPayments(personnelId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!pendingPayments || pendingPayments.length === 0) {
    return (
      <EmptyState
        icon={<Check className="w-12 h-12 text-green-600" />}
        title="Nenhum valor pendente"
        description="Todos os pagamentos desta pessoa estão em dia!"
      />
    );
  }

  return (
    <div className="space-y-3">
      {pendingPayments.map((pending) => {
        // Correção de timezone: adiciona 12h para garantir que a data caia no dia correto
        // independentemente do fuso horário local
        const dueDate = pending.paymentDueDate ? addHours(parseISO(pending.paymentDueDate), 12) : null;
        
        // Para verificações de "passado/atrasado", usamos a data atual e startOfDay para comparar apenas datas
        const today = new Date();
        const isOverdue = dueDate ? isAfter(startOfDay(today), startOfDay(dueDate)) : false;
        const daysUntilDue = dueDate ? differenceInCalendarDays(dueDate, today) : null;
        
        // Formatar datas do evento também corrigindo timezone
        const startDate = pending.startDate ? addHours(parseISO(pending.startDate), 12) : new Date();
        const endDate = pending.endDate ? addHours(parseISO(pending.endDate), 12) : new Date();

        return (
          <Card key={pending.eventId} className={isOverdue ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-orange-500'}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                    <AlertCircle className={`h-4 w-4 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className={`font-semibold text-lg ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {formatCurrency(pending.pendingAmount)}
                      </p>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          ATRASADO
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium mb-1 truncate">{pending.eventName}</p>
                    <p className="text-xs text-muted-foreground">
                      Evento: {format(startDate, 'dd/MM/yy')} - {format(endDate, 'dd/MM/yy')}
                    </p>
                    {dueDate && (
                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <p className={`text-xs ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                          Vencimento: {format(dueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          {daysUntilDue !== null && !isOverdue && daysUntilDue >= 0 && ` (em ${daysUntilDue} dias)`}
                          {isOverdue && daysUntilDue !== null && ` (${Math.abs(daysUntilDue)} dias atrasado)`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
