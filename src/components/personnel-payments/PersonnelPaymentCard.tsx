import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, User, DollarSign, CheckCircle, XCircle, Edit, Trash, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarkAsPaidDialog } from './MarkAsPaidDialog';
import { PersonnelPaymentFormDialog } from './PersonnelPaymentFormDialog';
import { useQueryClient } from '@tanstack/react-query';
import { personnelPaymentsKeys } from '@/hooks/queries/usePersonnelPaymentsQuery';
import { personnelPaymentsService } from '@/services/personnelPaymentsService';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { parseDateSafe } from '@/utils/dateUtils';
import type { PersonnelPayment } from '@/contexts/data/types';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface PersonnelPaymentCardProps {
  payment: PersonnelPayment & { personnel?: any };
}

export const PersonnelPaymentCard = ({ payment }: PersonnelPaymentCardProps) => {
  const [showMarkAsPaid, setShowMarkAsPaid] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmPermanent, setConfirmPermanent] = useState(false);
  const queryClient = useQueryClient();

  const dueDate = parseDateSafe(payment.payment_due_date);
  const isOverdue = payment.payment_status === 'pending' && dueDate < new Date();

  // Configuração de cores e estilos baseados no status
  const getStatusStyle = () => {
    if (payment.payment_status === 'paid') return {
      border: 'border-l-4 border-l-green-500',
      badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100',
      icon: <CheckCircle className="h-4 w-4 text-green-600" />
    };
    if (payment.payment_status === 'cancelled') return {
      border: 'border-l-4 border-l-gray-400',
      badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-100',
      icon: <XCircle className="h-4 w-4 text-gray-500" />
    };
    if (isOverdue) return {
      border: 'border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-900/10',
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100',
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />
    };
    return {
      border: 'border-l-4 border-l-amber-400',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100',
      icon: <Clock className="h-4 w-4 text-amber-600" />
    };
  };

  const style = getStatusStyle();

  const statusLabels = {
    pending: isOverdue ? 'Em Atraso' : 'Pendente',
    paid: 'Pago',
    cancelled: 'Cancelado'
  };

  const handleDelete = async () => {
    if (!confirmPermanent) {
      toast({
        title: 'Confirmação necessária',
        description: 'Marque o checkbox “Entendo que esta ação é permanente”.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await personnelPaymentsService.delete(payment.id);
      // Atualização otimista
      queryClient.setQueriesData<(any[])>({ queryKey: personnelPaymentsKeys.all }, (old) => {
        if (!old) return old as any;
        return (old as any[]).filter((p) => p.id !== payment.id);
      });

      queryClient.invalidateQueries({ queryKey: personnelPaymentsKeys.all });
      toast({
        title: 'Pagamento excluído',
        description: 'O pagamento foi removido com sucesso.',
      });
      setConfirmPermanent(false);
      setShowDelete(false);
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o pagamento.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async () => {
    try {
      await personnelPaymentsService.cancel(payment.id);
      queryClient.invalidateQueries({ queryKey: ['personnel-payments'] });
      toast({
        title: 'Pagamento cancelado',
        description: 'O pagamento foi marcado como cancelado.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao cancelar',
        description: 'Não foi possível cancelar o pagamento.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card className={cn("transition-all hover:shadow-md animate-in fade-in duration-300", style.border)}>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                 <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                 </div>
                 <div>
                    <p className="font-semibold text-sm leading-none">{payment.personnel?.name || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1" title={payment.description}>
                        {payment.description}
                    </p>
                 </div>
              </div>
            </div>
            <Badge variant="outline" className={cn("ml-2 whitespace-nowrap gap-1", style.badge)}>
                {style.icon}
                {statusLabels[payment.payment_status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="px-4 py-2">
          <div className="flex items-center justify-between mt-2">
             <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Valor</span>
                <span className="text-xl font-bold text-foreground">
                    {formatCurrency(Number(payment.amount))}
                </span>
             </div>
             
             <div className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground">Vencimento</span>
                <div className={cn("flex items-center gap-1 text-sm font-medium", isOverdue ? "text-red-600" : "")}>
                    <Calendar className="h-3.5 w-3.5" />
                    {format(dueDate, "dd/MM", { locale: ptBR })}
                </div>
             </div>
          </div>
          
          {payment.notes && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-xs italic text-muted-foreground border border-border/50">
                "{payment.notes}"
            </div>
          )}
        </CardContent>

        <CardFooter className="px-4 py-3 bg-muted/20 border-t flex gap-2 items-center">
             {payment.payment_status === 'pending' ? (
                 <>
                    <Button 
                        size="sm" 
                        className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white gap-1 shadow-sm"
                        onClick={() => setShowMarkAsPaid(true)}
                    >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Pagar
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 h-8 gap-1"
                        onClick={() => setShowEdit(true)}
                    >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                    </Button>
                    <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setShowDelete(true)}
                        title="Excluir"
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                 </>
             ) : (
                <>
                    {payment.payment_status !== 'cancelled' && (
                        <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1 h-8 gap-1"
                            onClick={handleCancel}
                        >
                            <XCircle className="h-3.5 w-3.5" />
                            Cancelar
                        </Button>
                    )}
                     <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 h-8 gap-1"
                        onClick={() => setShowEdit(true)}
                    >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                    </Button>
                    <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 w-8 p-0 ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setShowDelete(true)}
                        title="Excluir"
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                </>
             )}
        </CardFooter>
      </Card>

      {showMarkAsPaid && (
        <MarkAsPaidDialog
          open={showMarkAsPaid}
          onOpenChange={setShowMarkAsPaid}
          payment={payment}
        />
      )}

      {showEdit && (
        <PersonnelPaymentFormDialog
          open={showEdit}
          onOpenChange={setShowEdit}
          payment={payment}
        />
      )}

      <AlertDialog
        open={showDelete}
        onOpenChange={(open) => {
          setShowDelete(open);
          if (!open) setConfirmPermanent(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.
              <div className="mt-3 space-y-1 text-sm bg-muted p-3 rounded">
                <div><strong>Pessoa:</strong> {payment.personnel?.name || 'N/A'}</div>
                <div><strong>Valor:</strong> {formatCurrency(Number(payment.amount))}</div>
                <div><strong>Vencimento:</strong> {format(dueDate, 'dd/MM/yyyy', { locale: ptBR })}</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 flex items-center gap-2">
            <Checkbox
              id="confirm-permanent"
              checked={confirmPermanent}
              onCheckedChange={(v) => setConfirmPermanent(!!v)}
            />
            <label htmlFor="confirm-permanent" className="text-sm leading-none select-none cursor-pointer">
              Entendo que esta ação é permanente
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!confirmPermanent}
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
