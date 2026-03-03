import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Check, DollarSign, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usePendingPayments } from '@/hooks/queries/usePersonnelHistoryQuery';
import { formatCurrency } from '@/utils/formatters';
import { format, differenceInCalendarDays, parseISO, addHours, startOfDay, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EmptyState } from '@/components/shared/EmptyState';
import { useTeam } from '@/contexts/TeamContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { personnelPaymentsService } from '@/services/personnelPaymentsService';
import { personnelHistoryKeys, PendingPayment } from '@/hooks/queries/usePersonnelHistoryQuery';
import { personnelPaymentsKeys } from '@/hooks/queries/usePersonnelPaymentsQuery';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PendingPaymentsTabProps {
  personnelId: string;
}

export const PendingPaymentsTab: React.FC<PendingPaymentsTabProps> = ({ personnelId }) => {
  const { data: pendingPayments, isLoading } = usePendingPayments(personnelId);
  const { activeTeam, userRole } = useTeam();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ✅ TAREFA 3: State for settle confirmation dialog
  const [settleTarget, setSettleTarget] = useState<PendingPayment | null>(null);
  const [isSettling, setIsSettling] = useState(false);

  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  // ✅ TAREFA 3: Handle settle action
  const handleSettle = async () => {
    if (!settleTarget || !activeTeam) return;
    setIsSettling(true);
    try {
      await personnelPaymentsService.create({
        team_id: activeTeam.id,
        personnel_id: personnelId,
        amount: settleTarget.pendingAmount,
        description: `Baixa do saldo pendente — ${settleTarget.eventName}`,
        payment_due_date: new Date().toISOString().split('T')[0],
        related_events: [settleTarget.eventId],
        notes: `Baixa realizada pelo usuário ${user?.email || ''} via Histórico de Pessoal`,
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: 'Outro',
      });

      toast({
        title: 'Baixa realizada',
        description: `Saldo de ${formatCurrency(settleTarget.pendingAmount)} registrado como pago.`,
      });

      // Invalidate relevant queries so the UI refreshes
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: personnelHistoryKeys.all(personnelId) }),
        queryClient.invalidateQueries({ queryKey: personnelPaymentsKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['team-pending-payments'] }),
      ]);

      setSettleTarget(null);
    } catch (error) {
      console.error('Erro ao dar baixa:', error);
      toast({
        title: 'Erro ao dar baixa',
        description: 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSettling(false);
    }
  };

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
    <>
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

                  {/* ✅ TAREFA 3: Settle button — only for admins */}
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5 text-green-700 border-green-300 hover:bg-green-50 hover:border-green-400 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20"
                      onClick={() => setSettleTarget(pending)}
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      Dar Baixa
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ✅ TAREFA 3: Confirmation dialog */}
      <AlertDialog open={!!settleTarget} onOpenChange={(open) => { if (!open) setSettleTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Baixa de Saldo</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Você está prestes a registrar a baixa do saldo pendente:</p>
                <div className="rounded-md bg-muted p-3 space-y-1">
                  <p><span className="font-medium text-foreground">Evento:</span> {settleTarget?.eventName}</p>
                  <p><span className="font-medium text-foreground">Valor:</span>{' '}
                    <span className="font-bold text-green-600">{formatCurrency(settleTarget?.pendingAmount || 0)}</span>
                  </p>
                  <p><span className="font-medium text-foreground">Data da baixa:</span> {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                <p>Esta ação será registrada com o seu usuário e não pode ser desfeita. Deseja continuar?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSettling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleSettle(); }}
              disabled={isSettling}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSettling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Confirmar Baixa
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
