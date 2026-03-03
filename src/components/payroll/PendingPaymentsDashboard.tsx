import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeamPendingPayments, TeamPendingPaymentItem } from '@/hooks/queries/useTeamPendingPayments';
import { usePersonnelPaymentsQuery, personnelPaymentsKeys } from '@/hooks/queries/usePersonnelPaymentsQuery';
import { usePersonnelPaymentsRealtime } from '@/hooks/queries/usePersonnelPaymentsRealtime';
import { usePayrollClosingsRealtime } from '@/hooks/queries/usePayrollClosingsRealtime';
import { useSupplierCostsQuery } from '@/hooks/queries/useSupplierCostsQuery';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, Check, AlertCircle, ChevronDown, ChevronRight, Calendar, CreditCard, Package, Loader2 } from 'lucide-react';
import { useTeam } from '@/contexts/TeamContext';
import { personnelPaymentsService } from '@/services/personnelPaymentsService';
import { CreatePersonnelPaymentData } from '@/contexts/data/formTypes';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { personnelHistoryKeys } from '@/hooks/queries/usePersonnelHistoryQuery';
import { eventKeys } from '@/hooks/queries/useEventsQuery';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from '@/components/ui/separator';

export const PendingPaymentsDashboard: React.FC = () => {
  const { data: pendingItems, isLoading } = useTeamPendingPayments();
  const { activeTeam, userRole } = useTeam();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  // ✅ TAREFA 1 + 2: Avulso payments pending
  const { data: avulsoPending = [], isLoading: avulsoLoading } = usePersonnelPaymentsQuery({ status: 'pending' });
  const { data: eventSupplierCosts = [], isLoading: isLoadingCosts } = useSupplierCostsQuery();

  // ✅ TAREFA 1: Supplier costs pending
  const supplierPending = useMemo(() => {
    return (eventSupplierCosts || []).filter(c => c.payment_status !== 'paid');
  }, [eventSupplierCosts]);

  // ✅ TAREFA 2: Realtime subscriptions so other users see changes without reload
  usePersonnelPaymentsRealtime();
  usePayrollClosingsRealtime();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedPersonnel, setExpandedPersonnel] = useState<Set<string>>(new Set());

  // Group by personnel
  const groupedItems = useMemo(() => {
    if (!pendingItems) return [];

    const groups = new Map<string, {
      personnelId: string;
      personnelName: string;
      items: TeamPendingPaymentItem[];
      totalPending: number;
    }>();

    pendingItems.forEach(item => {
      if (!groups.has(item.personnelId)) {
        groups.set(item.personnelId, {
          personnelId: item.personnelId,
          personnelName: item.personnelName,
          items: [],
          totalPending: 0
        });
      }
      const group = groups.get(item.personnelId)!;
      group.items.push(item);
      group.totalPending += item.pendingAmount;
    });

    return Array.from(groups.values()).sort((a, b) => b.totalPending - a.totalPending);
  }, [pendingItems]);

  // ✅ TAREFA 1: Grand total includes all payment types
  const totalPayrollPending = pendingItems?.reduce((acc, item) => acc + item.pendingAmount, 0) || 0;
  const totalAvulsoPending = avulsoPending.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalSupplierPending = supplierPending.reduce((acc, c) => acc + Math.max((Number(c.total_amount) || 0) - (Number(c.paid_amount) || 0), 0), 0);
  const totalPendingAll = totalPayrollPending + totalAvulsoPending + totalSupplierPending;
  const selectedTotal = pendingItems
    ?.filter(item => selectedIds.has(`${item.personnelId}-${item.eventId}`))
    .reduce((acc, item) => acc + item.pendingAmount, 0) || 0;

  const handleToggleSelectAll = () => {
    if (!pendingItems) return;
    if (selectedIds.size === pendingItems.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(pendingItems.map(item => `${item.personnelId}-${item.eventId}`));
      setSelectedIds(allIds);
    }
  };

  const handleTogglePersonnel = (personnelId: string, items: TeamPendingPaymentItem[]) => {
    const newSelected = new Set(selectedIds);
    const allSelected = items.every(item => newSelected.has(`${item.personnelId}-${item.eventId}`));

    items.forEach(item => {
      const key = `${item.personnelId}-${item.eventId}`;
      if (allSelected) {
        newSelected.delete(key);
      } else {
        newSelected.add(key);
      }
    });
    setSelectedIds(newSelected);
  };

  const handleToggleItem = (key: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedIds(newSelected);
  };

  const toggleExpand = (personnelId: string) => {
    const newExpanded = new Set(expandedPersonnel);
    if (newExpanded.has(personnelId)) {
      newExpanded.delete(personnelId);
    } else {
      newExpanded.add(personnelId);
    }
    setExpandedPersonnel(newExpanded);
  };

  const handleBulkSettle = async () => {
    if (!activeTeam || !pendingItems) return;

    try {
      setIsProcessing(true);

      const itemsToSettle = pendingItems.filter(item =>
        selectedIds.has(`${item.personnelId}-${item.eventId}`)
      );

      const promises = itemsToSettle.map(item => {
        const paymentData: CreatePersonnelPaymentData = {
          team_id: activeTeam.id,
          personnel_id: item.personnelId,
          amount: item.pendingAmount,
          description: `Pagamento - ${item.eventName}`,
          payment_due_date: new Date().toISOString().split('T')[0],
          related_events: [item.eventId],
          notes: 'Pagamento em lote (Painel Financeiro)',
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: 'Outro'
        };
        return personnelPaymentsService.create(paymentData);
      });

      await Promise.all(promises);

      toast({
        title: 'Pagamentos realizados',
        description: `${itemsToSettle.length} pagamentos foram registrados com sucesso.`,
      });

      // Invalidate queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['team-pending-payments'] }),
        queryClient.invalidateQueries({ queryKey: personnelPaymentsKeys.all }),
        queryClient.invalidateQueries({ queryKey: eventKeys.all }),
        // We might want to invalidate specific personnel history if possible, but 'all' is safe
      ]);

      setSelectedIds(new Set());
      setIsAlertOpen(false);
    } catch (error) {
      console.error('Erro ao processar pagamentos:', error);
      toast({
        title: 'Erro ao processar',
        description: 'Ocorreu um erro ao tentar baixar os pagamentos.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const anyLoading = isLoading || avulsoLoading || isLoadingCosts;

  if (anyLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Carregando indicadores financeiros...</p>
      </div>
    );
  }

  // ✅ TAREFA 1: Consider ALL types for empty state, not just payroll
  const hasAnyPending = (pendingItems && pendingItems.length > 0) || avulsoPending.length > 0 || supplierPending.length > 0;

  if (!hasAnyPending) {
    return (
      <Card className="bg-muted/10 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-green-100 p-4 rounded-full mb-4 dark:bg-green-900/20">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Tudo em dia!</h3>
          <p className="text-muted-foreground max-w-sm">
            Não há pendências de pagamento (folha, avulso ou fornecedores) neste momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo — All types consolidated */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pendente Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalPendingAll)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Folha + Avulso + Fornecedor
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Folha (Eventos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">
              {formatCurrency(totalPayrollPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingItems?.length || 0} itens pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" /> Pagamentos Avulsos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(totalAvulsoPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {avulsoPending.length} pagamento(s) pendente(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Package className="h-3.5 w-3.5" /> Fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-600">
              {formatCurrency(totalSupplierPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {supplierPending.length} custo(s) pendente(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Selecionado para Baixa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(selectedTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedIds.size} itens selecionados
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end">
          {isAdmin && (
            <Button
              size="lg"
              className="w-full md:w-auto gap-2"
              disabled={selectedIds.size === 0}
              onClick={() => setIsAlertOpen(true)}
            >
              <DollarSign className="w-4 h-4" />
              Baixar Selecionados
            </Button>
          )}
        </div>
      </div>

      {/* Lista de Pendências */}
      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Pendências por Profissional</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectedIds.size === pendingItems.length && pendingItems.length > 0}
                onCheckedChange={handleToggleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Selecionar Todos
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {groupedItems.map((group) => {
              const allSelected = group.items.every(item =>
                selectedIds.has(`${item.personnelId}-${item.eventId}`)
              );
              const someSelected = group.items.some(item =>
                selectedIds.has(`${item.personnelId}-${item.eventId}`)
              );
              const isExpanded = expandedPersonnel.has(group.personnelId);

              return (
                <Collapsible
                  key={group.personnelId}
                  open={isExpanded}
                  onOpenChange={() => toggleExpand(group.personnelId)}
                  className="bg-card hover:bg-muted/5 transition-colors"
                >
                  <div className="p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-4 flex-1">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </CollapsibleTrigger>

                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => handleTogglePersonnel(group.personnelId, group.items)}
                        className={someSelected && !allSelected ? "opacity-50" : ""}
                      />

                      <div className="flex flex-col cursor-pointer" onClick={() => toggleExpand(group.personnelId)}>
                        <span className="font-medium">{group.personnelName}</span>
                        <span className="text-xs text-muted-foreground">
                          {group.items.length} eventos pendentes
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-bold text-orange-600">
                        {formatCurrency(group.totalPending)}
                      </span>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="bg-muted/30 px-4 pb-4 pt-0 space-y-2">
                      {group.items.map(item => {
                        const key = `${item.personnelId}-${item.eventId}`;
                        const isSelected = selectedIds.has(key);

                        return (
                          <div key={key} className="flex items-center justify-between p-3 bg-background rounded-md border ml-8">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleItem(key)}
                              />
                              <div>
                                <p className="text-sm font-medium">{item.eventName}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(item.eventStartDate), 'dd/MM')} - {format(new Date(item.eventEndDate), 'dd/MM/yy')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-orange-600">{formatCurrency(item.pendingAmount)}</p>
                              {item.paidAmount > 0 && (
                                <p className="text-xs text-green-600">Já pago: {formatCurrency(item.paidAmount)}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ✅ TAREFA 1: Avulso Pending Payments Section */}
      {avulsoPending.length > 0 && (
        <Card>
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Pagamentos Avulsos Pendentes
              <Badge variant="secondary">{avulsoPending.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {avulsoPending.map((payment) => {
                const isOverdue = payment.payment_due_date && new Date(payment.payment_due_date) < new Date();
                return (
                  <div key={payment.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <span className="font-medium truncate">{payment.personnel?.name || '—'}</span>
                      {payment.description && (
                        <span className="text-xs text-muted-foreground truncate">{payment.description}</span>
                      )}
                      {payment.payment_due_date && (
                        <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                          <Calendar className="h-3 w-3" />
                          Vencimento: {format(new Date(payment.payment_due_date), 'dd/MM/yyyy', { locale: ptBR })}
                          {isOverdue && <Badge variant="destructive" className="ml-1 text-[10px] py-0">Atrasado</Badge>}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-blue-600 ml-4 shrink-0">
                      {formatCurrency(Number(payment.amount) || 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ TAREFA 1: Supplier Pending Payments Section */}
      {supplierPending.length > 0 && (
        <Card>
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              Fornecedores com Pagamento Pendente
              <Badge variant="secondary">{supplierPending.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {supplierPending.map((cost) => {
                const pendingAmount = Math.max((Number(cost.total_amount) || 0) - (Number(cost.paid_amount) || 0), 0);
                const isOverdue = cost.payment_date && new Date(cost.payment_date) < new Date();
                return (
                  <div key={cost.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <span className="font-medium truncate">{(cost as any).suppliers?.name || cost.supplier_id}</span>
                      {(cost as any).description && (
                        <span className="text-xs text-muted-foreground truncate">{(cost as any).description}</span>
                      )}
                      {cost.payment_date && (
                        <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                          <Calendar className="h-3 w-3" />
                          Previsto: {format(new Date(cost.payment_date), 'dd/MM/yyyy', { locale: ptBR })}
                          {isOverdue && <Badge variant="destructive" className="ml-1 text-[10px] py-0">Atrasado</Badge>}
                        </span>
                      )}
                      {Number(cost.paid_amount) > 0 && (
                        <span className="text-xs text-green-600">Já pago: {formatCurrency(Number(cost.paid_amount))}</span>
                      )}
                    </div>
                    <span className="font-bold text-purple-600 ml-4 shrink-0">
                      {formatCurrency(pendingAmount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Baixa em Lote</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a realizar a baixa de <strong>{selectedIds.size} pagamentos</strong>, totalizando <strong>{formatCurrency(selectedTotal)}</strong>.
              <br /><br />
              Os registros de pagamento serão criados com a data de hoje. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleBulkSettle(); }} disabled={isProcessing}>
              {isProcessing ? 'Processando...' : 'Confirmar Pagamentos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
