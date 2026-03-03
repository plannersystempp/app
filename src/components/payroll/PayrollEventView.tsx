import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeam } from '@/contexts/TeamContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { DollarSign, FileText, ArrowLeft, Calendar, Search } from 'lucide-react';
import { NoTeamSelected } from '@/components/shared/NoTeamSelected';
import { PayrollList } from './PayrollList';
import { usePayrollData } from './usePayrollData';
import { usePayrollActions } from './usePayrollActions';
import { formatDateBR } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SupplierPaymentDialog } from '../events/costs/SupplierPaymentDialog';
import { type EventSupplierCost } from '@/contexts/data/types';
import { useEventsQuery } from '@/hooks/queries/useEventsQuery';
import { useSupplierCostsQuery } from '@/hooks/queries/useSupplierCostsQuery';
import { Clock, Loader2 } from 'lucide-react';

export const PayrollEventView: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();

  const { data: events = [], isLoading: loadingEvents } = useEventsQuery();
  const { data: eventSupplierCosts = [], isLoading: loadingCosts } = useSupplierCostsQuery({ eventId });

  const { activeTeam, userRole } = useTeam();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Tab de Categoria (Pessoal vs Fornecedores)
  const [categoryTab, setCategoryTab] = useState<'staff' | 'suppliers'>('staff');

  const [paymentFilter, setPaymentFilter] = useState<'todos' | 'pendentes' | 'pagos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCostForPayment, setSelectedCostForPayment] = useState<EventSupplierCost | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Hooks personalizados
  const { payrollDetails, pixKeys, loading, setEventData } = usePayrollData(eventId || '');
  const { handleRegisterPayment, handleRegisterPartialPayment, handleCancelPayment } = usePayrollActions(eventId || '');

  // Filter suppliers costs from Context
  const supplierCosts = useMemo(() => {
    if (!eventSupplierCosts || !eventId) return [];
    let result = eventSupplierCosts.filter(cost => cost.event_id === eventId);

    // Filter by search
    if (searchTerm.trim() && categoryTab === 'suppliers') {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.description.toLowerCase().includes(lowerTerm) ||
        (item.supplier_name || '').toLowerCase().includes(lowerTerm)
      );
    }

    return result;
  }, [eventSupplierCosts, eventId, searchTerm, categoryTab]);

  // Filtrar dados de acordo com o filtro selecionado e busca
  const filteredPayrollDetails = useMemo(() => {
    let result = payrollDetails;

    // 1. Filtro de Status
    if (paymentFilter === 'pendentes') {
      result = result.filter(item => !item.paid);
    } else if (paymentFilter === 'pagos') {
      result = result.filter(item => item.paid);
    }

    // 2. Filtro de Busca (Nome)
    if (searchTerm.trim() && categoryTab === 'staff') {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.personName.toLowerCase().includes(lowerTerm)
      );
    }

    return result;
  }, [payrollDetails, paymentFilter, searchTerm, categoryTab]);

  // Estatísticas gerais (Combinadas)
  const totalStaffToPay = useMemo(() => payrollDetails.reduce((sum, item) => sum + (item.totalPay || 0), 0), [payrollDetails]);
  const totalStaffPaid = useMemo(() => payrollDetails.reduce((sum, item) => sum + (item.paidAmount || 0), 0), [payrollDetails]);

  const totalSuppliersToPay = useMemo(() => (supplierCosts || []).reduce((sum, item) => sum + Number(item.total_amount || 0), 0), [supplierCosts]);
  const totalSuppliersPaid = useMemo(() => (supplierCosts || []).reduce((sum, item) => sum + Number(item.paid_amount || 0), 0), [supplierCosts]);

  // Totais exibidos dependem da aba ativa
  const currentTotalToPay = categoryTab === 'staff' ? totalStaffToPay : totalSuppliersToPay;
  const currentTotalPaid = categoryTab === 'staff' ? totalStaffPaid : totalSuppliersPaid;

  const percentCompleted = useMemo(() => {
    if (currentTotalToPay <= 0) return 0;
    return Math.round((currentTotalPaid / currentTotalToPay) * 100);
  }, [currentTotalToPay, currentTotalPaid]);

  const pendingAmount = useMemo(() => {
    return Math.max(currentTotalToPay - currentTotalPaid, 0);
  }, [currentTotalToPay, currentTotalPaid]);

  const paidCount = useMemo(() =>
    categoryTab === 'staff'
      ? payrollDetails.filter(p => p.paid).length
      : (supplierCosts || []).filter(c => c.payment_status === 'paid').length
    , [payrollDetails, supplierCosts, categoryTab]);

  const pendingCount = useMemo(() =>
    categoryTab === 'staff'
      ? payrollDetails.filter(p => !p.paid).length
      : (supplierCosts || []).filter(c => c.payment_status !== 'paid').length
    , [payrollDetails, supplierCosts, categoryTab]);

  const handleOpenPaymentDialog = (cost: EventSupplierCost) => {
    setSelectedCostForPayment(cost);
    setShowPaymentDialog(true);
  };

  const canManagePayroll = userRole === 'admin';
  const selectedEvent = events.find(e => e.id === eventId);

  const handleOpenReport = () => {
    if (eventId) {
      navigate(`/app/folha/relatorio/${eventId}`);
    }
  };

  const handleBackToSelection = () => {
    navigate(-1);
  };

  const handleGoToEvent = () => {
    if (eventId) {
      navigate(`/app/eventos/${eventId}`);
    }
  };

  if (!activeTeam) {
    return (
      <NoTeamSelected
        title="Gestão de Folha de Pagamento"
        description="Selecione uma equipe para gerenciar a folha de pagamento."
      />
    );
  }

  if (!canManagePayroll) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Apenas administradores podem gerenciar a folha de pagamento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingEvents || loadingCosts) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Carregando dados do evento...</p>
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="w-full max-w-full p-3 sm:p-4 md:p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Evento não encontrado.</p>
            <Button onClick={handleBackToSelection} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-full ${isMobile ? 'px-0 py-3' : 'p-4 md:p-6'} space-y-4 md:space-y-6 overflow-x-hidden`}>
      {/* Cabeçalho com informações do evento */}
      <div className="space-y-3">
        <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center justify-between'}`}>
          <Button
            variant="ghost"
            onClick={handleBackToSelection}
            className={`${isMobile ? 'self-start' : ''} -ml-2`}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <Button
            onClick={handleGoToEvent}
            className={`${isMobile ? 'w-full' : 'w-auto'}`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {isMobile ? 'Ver Evento' : 'Ver Detalhes do Evento'}
          </Button>
        </div>

        <div className="space-y-1">
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold leading-tight`}>
            Gestão Financeira do Evento
          </h1>
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} text-muted-foreground`}>
            {selectedEvent.name}
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {selectedEvent.start_date && formatDateBR(selectedEvent.start_date)}
              {selectedEvent.end_date && selectedEvent.start_date !== selectedEvent.end_date &&
                ` - ${formatDateBR(selectedEvent.end_date)}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            * Funcionários fixos são pagos mensalmente e não aparecem nesta folha de evento
          </p>
        </div>
      </div>

      {/* Card de Folha de Pagamento */}
      <Card className={isMobile ? 'border-0' : undefined}>
        <CardHeader className="px-2 sm:px-3 pb-2 sm:pb-4">
          <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between'}`}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <DollarSign className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <span>Detalhes da Folha</span>
            </CardTitle>
            <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex gap-2'}`}>
              <Button
                onClick={handleOpenReport}
                disabled={payrollDetails.length === 0}
                className={`${isMobile ? 'w-full' : 'w-auto'} text-sm`}
              >
                <FileText className="w-4 h-4 mr-2" />
                {isMobile ? 'Imprimir' : 'Imprimir Relatório'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-3">
          {/* Estatísticas de topo com skeleton */}
          {loading ? (
            <div className={`${isMobile ? 'grid grid-cols-2 gap-1' : 'grid grid-cols-4 gap-3'} mb-3`}>
              <div className="rounded-sm p-1 sm:p-2">
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="rounded-sm p-1 sm:p-2">
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="rounded-sm p-1 sm:p-2">
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="rounded-sm p-1 sm:p-2">
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : (
            <div className={`${isMobile ? 'grid grid-cols-2 gap-1' : 'grid grid-cols-4 gap-3'} mb-3`}>
              <div className="rounded-sm bg-blue-50 p-1 sm:p-2 text-center">
                <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-blue-600`}>{formatCurrency(currentTotalToPay)}</div>
                <div className="text-sm text-blue-700">Total a Pagar</div>
              </div>
              <div className="rounded-sm bg-green-50 p-1 sm:p-2 text-center">
                <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-green-600`}>{formatCurrency(currentTotalPaid)}</div>
                <div className="text-sm text-green-700">Total Pago</div>
              </div>
              <div className="rounded-sm bg-amber-50 p-1 sm:p-2 text-center">
                <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-amber-600`}>{formatCurrency(pendingAmount)}</div>
                <div className="text-sm text-amber-700">Pendente</div>
              </div>
              <div className="rounded-sm bg-purple-50 p-1 sm:p-2 text-center">
                <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-purple-600`}>{percentCompleted}%</div>
                <div className="text-sm text-purple-700">Concluído</div>
              </div>
            </div>
          )}

          {/* Contagem de pagos vs pendentes */}
          {!loading && (
            <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center gap-2'} mb-3`}>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Profissionais:</span>
                <Badge variant="default">{paidCount} pagos</Badge>
                <Badge variant="destructive">{pendingCount} pendentes</Badge>
              </div>
            </div>
          )}

          <Tabs value={categoryTab} onValueChange={(v) => setCategoryTab(v as 'staff' | 'suppliers')} className="w-full mb-4">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="staff">Pessoal / Staff</TabsTrigger>
              <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
            </TabsList>

            <TabsContent value="staff">
              {/* Barra de Busca (Apenas para Staff) */}
              <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar profissional por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Tabs value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as 'todos' | 'pendentes' | 'pagos')} className="w-full mb-4">
                <TabsList className={isMobile ? 'grid w-full grid-cols-3 gap-2' : 'grid w-full grid-cols-3'}>
                  <TabsTrigger value="todos" className={isMobile ? 'text-sm w-full' : undefined}>Todos</TabsTrigger>
                  <TabsTrigger value="pendentes" className={isMobile ? 'text-sm w-full' : undefined}>Pendentes <Badge className="ml-2 hidden sm:inline-flex" variant="outline">{pendingCount}</Badge></TabsTrigger>
                  <TabsTrigger value="pagos" className={isMobile ? 'text-sm w-full' : undefined}>Pagos <Badge className="ml-2 hidden sm:inline-flex" variant="outline">{paidCount}</Badge></TabsTrigger>
                </TabsList>
                <TabsContent value={paymentFilter} className="mt-3">
                  <PayrollList
                    payrollDetails={filteredPayrollDetails}
                    loading={loading}
                    pixKeys={pixKeys}
                    onRegisterPayment={handleRegisterPayment}
                    onRegisterPartialPayment={handleRegisterPartialPayment}
                    onCancelPayment={handleCancelPayment}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="suppliers">
              {/* Barra de Busca (Fornecedores) */}
              <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar fornecedor ou item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Placeholder para Loading (usando dados do contexto não temos loading state explícito separado) */}
              {false ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : supplierCosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum custo de fornecedor registrado para este evento.
                </div>
              ) : (
                <div className="space-y-3">
                  {supplierCosts.map((cost) => (
                    <Card key={cost.id} className="border-l-2 border-l-primary shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="font-semibold text-base">{cost.description}</div>
                            <div className="text-sm text-muted-foreground">{cost.supplier_name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{formatCurrency(Number(cost.total_amount))}</div>
                            <Badge
                              variant={cost.payment_status === 'paid' ? 'default' : 'destructive'}
                              className={cost.payment_status === 'paid' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                            >
                              {cost.payment_status === 'paid' ? 'Pago' : cost.payment_status === 'partially_paid' ? 'Parcial' : 'Pendente'}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t">
                          <div className="text-sm text-muted-foreground w-full sm:w-auto">
                            {cost.paid_amount > 0 && (
                              <span className="text-green-600 font-medium">
                                Pago: {formatCurrency(cost.paid_amount)}
                              </span>
                            )}
                            {cost.total_amount - cost.paid_amount > 0 && (
                              <span className={cost.paid_amount > 0 ? "ml-2 text-orange-600" : "text-orange-600"}>
                                Pendente: {formatCurrency(cost.total_amount - cost.paid_amount)}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2 w-full sm:w-auto">
                            {cost.payment_status !== 'paid' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenPaymentDialog(cost)}
                                  className="flex-1 sm:flex-none h-8 text-xs"
                                >
                                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                                  Parcial
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenPaymentDialog(cost)}
                                  className="flex-1 sm:flex-none h-8 text-xs"
                                >
                                  <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                                  Integral
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedCostForPayment && (
        <SupplierPaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          cost={selectedCostForPayment}
          onSuccess={() => {
            setShowPaymentDialog(false);
            // O contexto EnhancedData atualizará automaticamente através do listener do Supabase ou refresh manual
          }}
        />
      )}
    </div>
  );
};
