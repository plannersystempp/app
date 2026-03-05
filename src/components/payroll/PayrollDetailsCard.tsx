import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, DollarSign, Copy, AlertTriangle, Clock, Trash2 } from 'lucide-react';
import { PayrollDetails } from './types';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { PersonnelHistoryDialog } from '../personnel/PersonnelHistory/PersonnelHistoryDialog';
import { AbsencesModal } from '../personnel/AbsencesModal';
import { PartialPaymentDialog } from './PartialPaymentDialog';
import { FullPaymentConfirmationDialog } from './FullPaymentConfirmationDialog';
import { formatCurrency } from '@/utils/formatters';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { Checkbox } from '@/components/ui/checkbox';

interface PayrollDetailsCardProps {
  detail: PayrollDetails;
  onRegisterPayment: (personnelId: string, totalAmount: number, notes?: string) => void;
  onRegisterPartialPayment: (personnelId: string, amount: number, notes: string) => void;
  onCancelPayment: (paymentId: string, personnelName: string) => void;
  loading: boolean;
  pixKey?: string;
  hasEventSpecificCache?: boolean;
  eventSpecificCacheRate?: number;
}

export const PayrollDetailsCard: React.FC<PayrollDetailsCardProps> = ({
  detail,
  onRegisterPayment,
  onRegisterPartialPayment,
  onCancelPayment,
  loading,
  pixKey,
  hasEventSpecificCache,
  eventSpecificCacheRate
}) => {
  const { userRole } = useTeam();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const [showAbsencesModal, setShowAbsencesModal] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showPartialPaymentDialog, setShowPartialPaymentDialog] = useState(false);
  const [showFullPaymentDialog, setShowFullPaymentDialog] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [confirmPermanent, setConfirmPermanent] = useState(false);
  const cacheDailyRate = eventSpecificCacheRate
    || (detail as any).cacheRate
    || (typeof detail.workDays === 'number' && detail.workDays > 0 ? (detail.cachePay / detail.workDays) : undefined);

  const copyPixKey = async () => {
    if (pixKey) {
      try {
        await navigator.clipboard.writeText(pixKey);
        toast({
          title: "Copiado!",
          description: "Chave PIX copiada para a área de transferência",
        });
      } catch (error) {
        console.error('Error copying PIX key:', error);
        toast({
          title: "Erro",
          description: "Não foi possível copiar a chave PIX",
          variant: "destructive"
        });
      }
    }
  };
  return (
    <Card className="border-l-2 border-l-primary shadow-lg hover:shadow-xl transition-shadow">
      <CardContent className="p-2 sm:p-2">
        <div className={`${isMobile ? 'space-y-1.5' : 'flex items-center justify-between'} mb-1.5`}>
          <div className={isMobile ? 'space-y-1.5' : ''}>
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <h3
                className="font-semibold text-sm sm:text-base cursor-pointer hover:underline decoration-primary hover:text-primary transition-colors"
                onClick={() => setShowHistoryDialog(true)}
              >
                {detail.personName}
              </h3>
              {detail.absencesCount > 0 && (
                <Badge
                  variant="destructive"
                  className="cursor-pointer hover:bg-destructive/90 text-xs"
                  onClick={() => setShowAbsencesModal(true)}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {detail.absencesCount} falta{detail.absencesCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">{detail.personType}</Badge>
          </div>
          <div className={`${isMobile ? 'text-center' : 'text-right'}`}>
            {detail.paidAmount > 0 ? (
              <div>
                <p className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-green-600`}>
                  {formatCurrency(detail.totalPay)}
                </p>
                <div className={`${isMobile ? 'flex-col space-y-1' : 'flex items-center gap-1'} text-xs sm:text-sm`}>
                  <span className="text-green-600">Pago: {formatCurrency(detail.paidAmount)}</span>
                  {detail.pendingAmount > 0 && (
                    <span className="text-orange-600">Pendente: {formatCurrency(detail.pendingAmount)}</span>
                  )}
                </div>
                <Badge variant={detail.paid ? "default" : "secondary"} className="mt-0.5 text-xs">
                  {detail.paid ? "Pago Integral" : "Pagamento Parcial"}
                </Badge>
              </div>
            ) : (
              <div>
                <p className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-green-600`}>
                  {formatCurrency(detail.totalPay)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total a Pagar</p>
              </div>
            )}
          </div>
        </div>

        <Separator className="my-1.5" />

        {/* Detalhamento dos Cálculos */}
        <div className={`${isMobile
          ? 'grid grid-cols-2 gap-1.5'
          : 'grid grid-cols-[1fr_1fr_minmax(180px,auto)_auto] items-start gap-1 md:gap-1.5 lg:gap-2'
          } mb-0.5`}>
          {detail.personType === 'fixo' && (
            <div className={`${isMobile ? 'p-1.5 rounded-lg' : 'lg:flex-1 lg:min-w-0'}`}>
              <p className="text-xs sm:text-sm text-muted-foreground">Salário Base</p>
              <p className="font-semibold text-sm">R$ {detail.baseSalary.toFixed(2)}</p>
            </div>
          )}
          <div className={`${isMobile ? 'p-1.5 rounded-lg' : 'lg:flex-1 lg:min-w-0'}`}>
            <div className="inline-flex items-center gap-1 mb-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Cachês ({detail.workDays} dias)
              </p>
              {hasEventSpecificCache && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-[11px] bg-orange-50 text-orange-700 border-orange-200">
                        ⭐ Específico
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <div className="font-medium">Cache específico do evento</div>
                        <div>Taxa aplicada: {formatCurrency(eventSpecificCacheRate || 0)}/dia</div>
                        <div>Cálculo: {formatCurrency(eventSpecificCacheRate || 0)} × {detail.workDays} dias</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="font-semibold text-sm">R$ {detail.cachePay.toFixed(2)}</p>
            {cacheDailyRate !== undefined && typeof detail.workDays === 'number' && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {formatCurrency(cacheDailyRate)} × {detail.workDays} dias
              </p>
            )}
          </div>
          <div className={`${isMobile ? 'p-1.5 rounded-lg' : 'lg:flex-1 lg:min-w-0'}`}>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Horas Extras: {detail.totalOvertimeHours}h
            </p>
            <p className="font-semibold text-sm">{formatCurrency(detail.overtimePay)}</p>
            {detail.overtimeConversionApplied ? (
              <p className="text-[11px] text-muted-foreground mt-1">
                {detail.overtimeCachesUsed} cachê{detail.overtimeCachesUsed > 1 ? 's' : ''} diário{detail.overtimeCachesUsed > 1 ? 's' : ''}
                {detail.overtimeRemainingHours && detail.overtimeRemainingHours > 0 &&
                  ` + ${detail.overtimeRemainingHours.toFixed(1)}h avulsas`
                }
              </p>
            ) : (
              detail.totalOvertimeHours > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {detail.totalOvertimeHours}h × {formatCurrency(detail.overtimeRate)}
                </p>
              )
            )}
          </div>
          {/* PIX Key Section */}
          {isAdmin && (
            <div className={`${isMobile ? 'p-1.5 rounded-lg col-span-2' : 'min-w-0'}`}>
              <p className="text-[11px] sm:text-xs text-muted-foreground mb-0 text-center">Chave PIX</p>
              <div className={`${isMobile ? 'flex flex-col items-center gap-0.5' : 'flex flex-col min-w-0 gap-0.5 items-center'}`}>
                <div className="flex items-center gap-1 min-w-0 justify-center">
                  <p className={`text-xs font-mono ${isMobile ? 'truncate text-center' : 'truncate sm:max-w-[200px] md:max-w-[260px] lg:max-w-[340px]'}`}>{pixKey || '—'}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyPixKey}
                    disabled={!pixKey}
                    className="h-6 w-6 p-0 flex-shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* Ações na 4ª coluna (desktop) */}
          {!isMobile && (
            <div className="flex items-center justify-end gap-0 sm:gap-0 md:gap-1 lg:gap-1.5 justify-self-end">
              {detail.paid ? (
                <div className="flex items-center gap-1 sm:gap-0 text-green-600">
                  <Check className="w-3 h-3" />
                  <span className="text-xs sm:text-sm">Pagamento Integral Concluído</span>
                </div>
              ) : detail.paidAmount > 0 ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPartialPaymentDialog(true)}
                    disabled={loading}
                    className={`h-4 px-1 sm:px-1 text-[11px]`}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Parcial
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowFullPaymentDialog(true)}
                    disabled={loading}
                    className={`h-4 px-1 sm:px-1 text-[11px]`}
                  >
                    <DollarSign className="w-3 h-3 mr-1" />
                    Pagar Restante
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPartialPaymentDialog(true)}
                    disabled={loading}
                    className={`h-4 px-1 sm:px-1 text-[11px]`}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Parcial
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowFullPaymentDialog(true)}
                    disabled={loading}
                    className={`h-4 px-1 sm:px-1 text-[11px]`}
                  >
                    <DollarSign className="w-3 h-3 mr-1" />
                    Registrar Integral
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Payment History */}
        {detail.paymentHistory.length > 0 && (
          <>
            <Separator className="my-2" />
            <div>
              <h4 className="font-medium mb-1.5 text-sm">Histórico de Pagamentos</h4>
              <div className="space-y-1.5">
                {detail.paymentHistory.map((payment) => (
                  <div key={payment.id} className={`${isMobile
                    ? 'flex flex-col space-y-1.5 p-1.5'
                    : 'flex items-center justify-between p-1.5'
                    } bg-muted rounded-lg`}>
                    <div className={`${isMobile ? 'flex items-center gap-1.5 flex-1' : 'flex items-center gap-1.5'}`}>
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{formatCurrency(payment.amount)}</span>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(payment.paidAt).toLocaleString('pt-BR')}
                        </p>
                        {payment.notes && (
                          <p className="text-[11px] text-muted-foreground italic break-words">"{payment.notes}"</p>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmCancelId(payment.id)}
                        disabled={loading}
                        className={`${isMobile
                          ? 'h-6 w-full justify-center'
                          : 'h-6 w-6 p-0'
                          } text-destructive hover:text-destructive flex-shrink-0`}
                      >
                        <Trash2 className="w-3 h-3" />
                        {isMobile && <span className="ml-2 text-xs">Cancelar</span>}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons - mobile only */}
        {isMobile && (
          <div className={`flex flex-col gap-1.5 pt-2`}>
            {detail.paid ? (
              <div className={`text-center`}>
                <div className="flex items-center gap-1.5 text-green-600 justify-center">
                  <Check className="w-3 h-3" />
                  <span className="font-medium text-xs sm:text-sm">Pagamento Integral Concluído</span>
                </div>
              </div>
            ) : detail.paidAmount > 0 ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPartialPaymentDialog(true)}
                  disabled={loading}
                  className={`w-full h-5 px-1.5 text-xs`}
                >
                  <Clock className="w-3 h-3 mr-1.5" />
                  Pagamento Parcial
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowFullPaymentDialog(true)}
                  disabled={loading}
                  className={`w-full h-5 px-1.5 text-xs`}
                >
                  <DollarSign className="w-3 h-3 mr-1.5" />
                  Pagar Restante
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPartialPaymentDialog(true)}
                  disabled={loading}
                  className={`w-full h-5 px-1.5 text-xs`}
                >
                  <Clock className="w-3 h-3 mr-1.5" />
                  Pagamento Parcial
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowFullPaymentDialog(true)}
                  disabled={loading}
                  className={`w-full h-5 px-1.5 text-xs`}
                >
                  <DollarSign className="w-3 h-3 mr-1.5" />
                  Registrar Pagamento
                </Button>
              </>
            )}
          </div>
        )}

        {/* Modals */}
        <AbsencesModal
          open={showAbsencesModal}
          onOpenChange={setShowAbsencesModal}
          personnelName={detail.personName}
          absences={detail.absences}
          eventName="Evento" // You may want to pass the actual event name
        />

        <PersonnelHistoryDialog
          open={showHistoryDialog}
          onOpenChange={setShowHistoryDialog}
          personnel={{
            id: detail.personnelId,
            name: detail.personName
          }}
        />

        <PartialPaymentDialog
          open={showPartialPaymentDialog}
          onOpenChange={setShowPartialPaymentDialog}
          personName={detail.personName}
          totalAmount={detail.totalPay}
          paidAmount={detail.paidAmount}
          onConfirm={(amount, notes) => {
            onRegisterPartialPayment(detail.personnelId, amount, notes);
            setShowPartialPaymentDialog(false);
          }}
          loading={loading}
        />

        <FullPaymentConfirmationDialog
          open={showFullPaymentDialog}
          onOpenChange={setShowFullPaymentDialog}
          personName={detail.personName}
          amount={detail.pendingAmount > 0 ? detail.pendingAmount : detail.totalPay}
          onConfirm={(notes) => {
            onRegisterPayment(detail.personnelId, detail.pendingAmount > 0 ? detail.pendingAmount : detail.totalPay, notes);
            setShowFullPaymentDialog(false);
          }}
          loading={loading}
        />

        {/* Confirmação de cancelamento de pagamento */}
        <AlertDialog
          open={!!confirmCancelId}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmCancelId(null);
              setConfirmPermanent(false);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar registro de pagamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja cancelar este registro de pagamento? Esta ação é permanente e removerá o registro desta folha.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {(() => {
              const pay = detail.paymentHistory.find(p => p.id === confirmCancelId);
              if (!pay) return null;
              return (
                <div className="mt-3 space-y-1 text-sm">
                  <div><strong>Profissional:</strong> {detail.personName}</div>
                  <div><strong>Valor:</strong> {formatCurrency(pay.amount)}</div>
                  <div><strong>Pago em:</strong> {new Date(pay.paidAt).toLocaleString('pt-BR')}</div>
                  {pay.notes && (
                    <div><strong>Observações:</strong> {pay.notes}</div>
                  )}
                </div>
              );
            })()}
            <div className="mt-4 flex items-center gap-2">
              <Checkbox
                id={`confirm-permanent-cancel-${detail.id}`}
                checked={confirmPermanent}
                onCheckedChange={(v) => setConfirmPermanent(!!v)}
              />
              <label htmlFor={`confirm-permanent-cancel-${detail.id}`} className="text-sm leading-none select-none">
                Entendo que esta ação é permanente
              </label>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!confirmPermanent || !confirmCancelId) return;
                  onCancelPayment(confirmCancelId, detail.personName);
                  setConfirmCancelId(null);
                  setConfirmPermanent(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={!confirmPermanent}
              >
                Cancelar definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
