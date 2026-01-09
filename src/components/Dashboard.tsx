
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useTeam } from '@/contexts/TeamContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar, Users, Briefcase, CheckCircle, Clock, AlertCircle, DollarSign, Package, AlertTriangle, UserCheck, Circle, TrendingUp, CalendarClock, CalendarRange } from 'lucide-react';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { EmptyState } from './shared/EmptyState';
import { NoTeamSelected } from './shared/NoTeamSelected';
import { SkeletonCard } from './shared/SkeletonCard';
import { QuickActions } from './dashboard/QuickActions';
import { formatDateShort } from '@/utils/dateUtils';
import * as PayrollCalc from './payroll/payrollCalculations';
import { getCachedEventStatus } from './payroll/eventStatusCache';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/utils/formatters';
import { useEventsInProgress } from '@/hooks/dashboard/useEventsInProgress';
import { useUpcomingPayments } from '@/hooks/dashboard/useUpcomingPayments';
import { usePersonnelPaymentsQuery } from '@/hooks/queries/usePersonnelPaymentsQuery';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { KpiGroup } from '@/components/dashboard/KpiGroup';
import { FilterChips } from '@/components/dashboard/FilterChips';
import { filterByDateRange, filterPaymentsByDateRange, sortByNearestDate, sortPaymentsByNearestDate, filterSupplierCostsByDateRange, type DateRange, type PaymentStatusFilter, type SupplierStatusFilter } from '@/utils/dashboardFilters';
import { useSupplierCostsByEvent } from '@/hooks/dashboard/useSupplierCostsByEvent';
import { SupplierCostsByEvent } from '@/components/dashboard/SupplierCostsByEvent';
import { countEventsByRanges, countPaymentsByRanges } from '@/utils/dashboardFilterCounts';
import { usePersistentFilter } from '@/hooks/usePersistentFilter';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { logger } from '@/utils/logger';
import { getAverageEventsPerWeek, getAverageEventsPerMonth, getAverageEventsPerYear } from '@/utils/dashboardData';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';


const Dashboard = () => {
  
  
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - BEFORE ANY CONDITIONAL RETURNS
  const { events, personnel, functions, eventSupplierCosts, suppliers, loading } = useEnhancedData();
  const { activeTeam, userRole } = useTeam();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'superadmin';
  const { subscription, isLoading: subscriptionLoading } = useSubscriptionGuard(activeTeam?.id);

  // All useState hooks must be at the top level
  const [superAdminPersonnelCount, setSuperAdminPersonnelCount] = useState<number | null>(null);
  const [eventsWithCompletePayments, setEventsWithCompletePayments] = useState<string[]>([]);
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const { value: eventsRange, setValue: setEventsRange } = usePersistentFilter<DateRange>({
    filterName: 'eventsRange',
    defaultValue: '7dias',
    userId: user?.id,
    teamId: activeTeam?.id,
  });
  const { value: paymentsRange, setValue: setPaymentsRange } = usePersistentFilter<DateRange>({
    filterName: 'paymentsRange',
    defaultValue: '30dias',
    userId: user?.id,
    teamId: activeTeam?.id,
  });
  const { value: suppliersStatus, setValue: setSuppliersStatus } = usePersistentFilter<SupplierStatusFilter>({
    filterName: 'suppliersStatus',
    defaultValue: 'todos',
    userId: user?.id,
    teamId: activeTeam?.id,
  });
  const supplierStatusSafe: 'todos' | 'pendente' | 'pago' = suppliersStatus;

  // Custom dashboard hooks MUST be called unconditionally before any conditional returns
  const eventsInProgress = useEventsInProgress();
  const upcomingPayments = useUpcomingPayments(eventsWithCompletePayments);
  const { data: avulsosPending = [] } = usePersonnelPaymentsQuery({ status: 'pending' });
  const avgEventsWeek = useMemo(() => getAverageEventsPerWeek(events as any), [events]);
  const avgEventsMonth = useMemo(() => getAverageEventsPerMonth(events as any), [events]);
  const avgEventsYear = useMemo(() => getAverageEventsPerYear(events as any), [events]);

  // Check if user is superadmin - HOOK MUST BE CALLED UNCONDITIONALLY
  const { data: isSuperAdminCheck } = useQuery({
    queryKey: ['is-superadmin'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_super_admin');
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Fetch total personnel count for super admin - HOOK MUST BE CALLED UNCONDITIONALLY
  useEffect(() => {
    if (isSuperAdmin && !loading) {
      const fetchTotalPersonnel = async () => {
        try {
          const { count, error } = await supabase
            .from('personnel')
            .select('*', { head: true, count: 'exact' });
          
          if (error) {
            logger.query.error('personnelCount', error);
            return;
          }
          
          setSuperAdminPersonnelCount(count || 0);
        } catch (error) {
          logger.query.error('personnelCount', error);
        }
      };

      fetchTotalPersonnel();
    }
  }, [isSuperAdmin, loading]);

  // Check which events have completed payments using cached data - HOOK MUST BE CALLED UNCONDITIONALLY
  useEffect(() => {
    const checkCompletedPayments = async () => {
      if (!activeTeam || isSuperAdmin) return;

      try {
        // Usar cache para reduzir queries redundantes
        const eventsWithStatus = await getCachedEventStatus(activeTeam.id);

        // Filter events that have allocations but no pending payments
        const completedEventIds = eventsWithStatus
          .filter(e => e.allocated_count > 0 && !e.has_pending_payments)
          .map(e => e.event_id);

        setEventsWithCompletePayments(completedEventIds);
      } catch (error) {
        logger.query.error('checkCompletedPayments', error);
      }
    };

    checkCompletedPayments();
  }, [events, activeTeam, isSuperAdmin]);

  useEffect(() => {
    if (loading || subscriptionLoading) return;
    const summary = {
      eventsCount: events?.length || 0,
      personnelCount: isSuperAdmin && superAdminPersonnelCount !== null ? superAdminPersonnelCount : personnel?.length || 0,
      functionsCount: functions?.length || 0,
      activeTeam: activeTeam?.id,
      isSuperAdmin,
    };
    logger.query.info('DASHBOARD_SUMMARY', summary);
  }, [loading, subscriptionLoading, events, personnel, functions, activeTeam?.id, isSuperAdmin, superAdminPersonnelCount]);
  
  // Hooks e cálculos baseados em hooks DEVEM ser chamados antes de returns condicionais
  // Data atual usada para filtrar próximos eventos
  const currentDate = new Date();
  const nowKey = currentDate.toDateString();
  // Garantir que o intervalo selecionado é válido (removendo 'todos')
  const eventsRangeSafe: DateRange = (eventsRange === 'todos' ? '30dias' : eventsRange);

  // Próximos eventos com ordenação e aplicação de filtro de intervalo
  const upcomingEvents = sortByNearestDate(
    filterByDateRange(events, eventsRangeSafe, currentDate),
    currentDate
  ).slice(0, 5);

  // Contagens para chips (useMemo incondicionais)
  const eventsCounts = useMemo(() => countEventsByRanges(events, currentDate), [events, nowKey]);
  
  // Converter eventos para formato compatível com filtros
  const upcomingPaymentsFormatted = useMemo(() => 
    upcomingPayments.map(e => ({ 
      ...e, 
      name: e.name || 'Evento sem nome',
      payment_due_date: e.payment_due_date || e.end_date
    })), 
    [upcomingPayments]
  );
  
  const paymentsIntervalCounts: Record<DateRange, number> = useMemo(() => 
    countPaymentsByRanges(upcomingPaymentsFormatted, currentDate), 
    [upcomingPaymentsFormatted, nowKey]
  );
  const filteredSupplierCosts = useMemo(() => (
    // KPIs continuam em todo o período; para última N apenas na lista detalhada
    filterSupplierCostsByDateRange(eventSupplierCosts as any, 'todos', currentDate)
  ), [eventSupplierCosts, nowKey]);
  const supplierGroups = useSupplierCostsByEvent(
    eventSupplierCosts as any,
    events as any,
    'todos',
    supplierStatusSafe
  );
  
  // CONDITIONAL RETURNS ONLY AFTER ALL HOOKS HAVE BEEN CALLED
  if (!activeTeam && !isSuperAdmin) {
    return <NoTeamSelected />;
  }

  if (loading || subscriptionLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>
        
        <SkeletonCard />
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard showSubtitle={false} />
          <SkeletonCard showSubtitle={false} />
          <SkeletonCard showSubtitle={false} />
          <SkeletonCard showSubtitle={false} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // Calculate unique functions count for super admin (no duplicates by name)
  const uniqueFunctionsCount = isSuperAdmin 
    ? new Set(functions.map(f => f.name.trim().toLowerCase())).size 
    : functions.length;

  // Calculate personnel count based on user role
  const personnelCount = isSuperAdmin && superAdminPersonnelCount !== null 
    ? superAdminPersonnelCount 
    : personnel.length;

  // Filtrar eventos em andamento e próximos (via hook)
  // já chamado no topo

  // Contagens para chips já calculadas via useMemo acima

  // Pagamentos próximos (via hook)
  // já chamado no topo

  // StatusBadge já encapsula as cores e ícones para cada status

  // Ícones e cores foram movidos para StatusBadge

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 p-4 sm:p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words">Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {isSuperAdmin ? 'Visão Global (Super Admin)' : `Equipe: ${activeTeam?.name || '—'}`}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {/* Espaço reservado para ações rápidas do topo (ex.: filtros) */}
          </div>
        </div>
      </div>

      {/* Banner de Aviso de Assinatura - ação disponível só para admin, nunca para planos vitalícios */}
      {!isSuperAdmin && subscription && !subscription.isLifetime && subscription.daysUntilExpiration && subscription.daysUntilExpiration <= 7 && subscription.daysUntilExpiration > 0 && subscription.status !== 'trial_expired' && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900">
                  {subscription.status === 'trial' ? 'Trial Expirando em Breve' : 'Assinatura Expirando em Breve'}
                </h3>
                <p className="text-sm text-orange-800 mt-1">
                  {subscription.status === 'trial' 
                    ? `Seu período de trial expira em ${subscription.daysUntilExpiration} dia(s). Assine um plano para continuar usando o PlannerSystem.`
                    : `Sua assinatura ${subscription.planName} expira em ${subscription.daysUntilExpiration} dia(s). Renove agora para continuar usando o PlannerSystem sem interrupções.`
                  }
                </p>
                {userRole === 'admin' ? (
                  <Button 
                    size="sm" 
                    className="mt-3"
                    onClick={() => navigate(subscription.status === 'trial' ? '/plans' : '/upgrade')}
                  >
                    {subscription.status === 'trial' ? 'Escolher Plano' : 'Renovar Assinatura'}
                  </Button>
                ) : (
                  <p className="text-xs text-orange-700 mt-2">Apenas o administrador pode alterar o plano. Solicite a renovação ao admin.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <QuickActions />

      {/* KPIs organizados por grupos: Atividade, Cadastro e Financeiro */}
      <div className="space-y-4 sm:space-y-6">
        <KpiGroup title="Atividade" icon={<AlertCircle className="h-4 w-4 text-yellow-600" />}> 
          <div className="col-span-1">
            <KpiCard
              title="Em Andamento"
              value={eventsInProgress.length}
              icon={<AlertCircle className="h-4 w-4 text-yellow-600" />}
              accentClassName="border-yellow-200 bg-yellow-50/50"
              valueClassName="text-yellow-600"
              size="xs"
            />
          </div>
          <KpiCard
            title="Média Semanal"
            value={avgEventsWeek}
            icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
            size="xs"
          />
          <KpiCard
            title="Média Mensal"
            value={avgEventsMonth}
            icon={<CalendarRange className="h-4 w-4 text-muted-foreground" />}
            size="xs"
          />
          <KpiCard
            title="Média Anual"
            value={avgEventsYear}
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            size="xs"
          />
        </KpiGroup>

        <AnalyticsCharts events={events as any} personnel={personnel as any} costs={eventSupplierCosts as any} />

        <KpiGroup title="Cadastro" icon={<Users className="h-4 w-4 text-muted-foreground" />}> 
          <KpiCard
            title="Total Eventos"
            value={events.length}
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            size="xs"
          />
          <KpiCard
            title="Pessoal"
            value={personnelCount}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            size="xs"
          />
          <KpiCard
            title="Funções"
            value={uniqueFunctionsCount}
            icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
            size="xs"
          />
        </KpiGroup>

        {/* KPI removido conforme solicitação: Pagamentos Avulsos Pendentes */}
      </div>

      {/* Estatísticas de Fornecedores (somente admin) */}
      {!isSuperAdmin && userRole === 'admin' && (
        <Card className="bg-muted/30 dark:bg-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Fornecedores
            </CardTitle>
            <CardDescription className="text-xs">Resumo dos fornecedores e custos por evento</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Separator className="my-2" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 min-w-[300px] overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
              <div className="text-center min-w-[70px]">
                <div className="text-base sm:text-lg font-bold">{suppliers.length}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground break-words">
                  <span className="hidden sm:inline">Total Cadastrados</span>
                  <span className="sm:hidden">Total</span>
                </p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {filteredSupplierCosts.filter(c => c.payment_status === 'pending').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="hidden sm:inline">Custos Pendentes</span>
                  <span className="sm:hidden">Pendentes</span>
                </p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(filteredSupplierCosts
                    .filter(c => c.payment_status === 'paid')
                    .reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="hidden sm:inline">Total Pago</span>
                  <span className="sm:hidden">Pago</span>
                </p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">
                  {formatCurrency(filteredSupplierCosts
                    .filter(c => c.payment_status !== 'paid')
                    .reduce((sum, c) => sum + (((Number(c.total_amount) || 0) - (Number(c.paid_amount) || 0))), 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="hidden sm:inline">Total Pendente</span>
                  <span className="sm:hidden">Pendente</span>
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowSupplierDetails(v => !v)}>
                {showSupplierDetails ? 'Ocultar detalhes' : 'Exibir detalhes'}
              </Button>
            </div>
            <Collapsible open={showSupplierDetails} onOpenChange={setShowSupplierDetails}>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <Separator className="my-3" />
                <SupplierCostsByEvent
                  groups={supplierGroups}
                  status={supplierStatusSafe}
                  onStatusChange={(s) => setSuppliersStatus(s as any)}
                  onNavigate={(id) => navigate(`/app/eventos/${id}`)}
                />
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Seções principais - Layout otimizado para mobile */}
      <div className={`grid gap-4 md:gap-6 ${isSuperAdmin 
        ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' 
        : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
      }`}>
        {!isSuperAdmin && (
          <Card 
            className="bg-muted/30 dark:bg-muted/20 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/app/eventos')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Eventos em Andamento
              </CardTitle>
              <CardDescription className="text-xs">Eventos que estão acontecendo neste momento</CardDescription>
            </CardHeader>
            <CardContent>
              <Separator className="my-2" />
              {eventsInProgress.length === 0 ? (
                <EmptyState
                  title="Nenhum evento em andamento"
                  description="Não há eventos acontecendo no momento."
                />
              ) : (
                <div className="space-y-2">
                  {eventsInProgress.map(event => (
                    <button
                      key={event.id}
                      className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer bg-card"
                      onClick={(e) => { e.stopPropagation(); navigate(`/app/eventos/${event.id}`); }}
                    >
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="font-medium text-xs sm:text-sm whitespace-normal break-words line-clamp-2">{event.name || 'Evento sem nome'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDateShort(event.start_date)} - {formatDateShort(event.end_date)}
                        </p>
                      </div>
                      <StatusBadge status={event.status as any} />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!isSuperAdmin && (
          <Card className="bg-muted/30 dark:bg-muted/20 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximos Eventos
              </CardTitle>
              <CardDescription className="text-xs">Resumo de próximos eventos ({eventsRangeSafe})</CardDescription>
            </CardHeader>
            <CardContent>
              <Separator className="my-2" />
              <div className="mb-3">
                <FilterChips
                  label="Intervalo"
                  options={['hoje','7dias','30dias'] as const}
                  value={eventsRangeSafe}
                  onChange={(v) => setEventsRange(v)}
                  showCounts
                  counts={eventsCounts}
                  showActiveIcon
                  activeVariant="outline"
                />
              </div>
              {upcomingEvents.length === 0 ? (
                <EmptyState
                  title="Nenhum evento próximo"
                  description="Não há eventos programados para os próximos dias."
                />
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map(event => (
                    <button 
                      key={event.id} 
                      className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer bg-card"
                      onClick={() => navigate(`/app/eventos/${event.id}`)}
                    >
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="font-medium text-xs sm:text-sm whitespace-normal break-words line-clamp-2">{event.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDateShort(event.start_date)} - {formatDateShort(event.end_date)}
                        </p>
                      </div>
                      <StatusBadge status={event.status as any} />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card de Pagamentos Próximos - apenas para não-superadmin */}
        {!isSuperAdmin && (
          <Card className="bg-muted/30 dark:bg-muted/20 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-red-600" />
                Pagamentos Próximos
              </CardTitle>
              <CardDescription className="text-xs">Pagamentos próximos (intervalo: {paymentsRange})</CardDescription>
            </CardHeader>
            <CardContent>
              <Separator className="my-2" />
              <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <FilterChips
                  label="Intervalo"
                  options={['hoje','7dias','30dias','todos'] as const}
                  value={paymentsRange}
                  onChange={(v) => setPaymentsRange(v)}
                  showCounts
                  counts={paymentsIntervalCounts}
                  showActiveIcon
                  activeVariant="outline"
                />
              </div>
              {upcomingPayments.length === 0 ? (
                <EmptyState
                  title="Nenhum pagamento próximo"
                  description="Não há pagamentos pendentes ou com vencimento nos próximos 15 dias."
                />
              ) : (
                <div className="space-y-2">
                  {sortPaymentsByNearestDate(
                      filterPaymentsByDateRange(upcomingPaymentsFormatted, paymentsRange, currentDate),
                      currentDate
                    ).map(event => {
                    const dueDate = event.payment_due_date || event.end_date;
                    const displayDate = dueDate ? formatDateShort(dueDate) : 'Data não definida';
                    
                    return (
                      <button 
                        key={event.id} 
                        className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors border-red-200 bg-red-50/30 dark:bg-muted/20 cursor-pointer"
                        onClick={() => navigate(`/app/folha/${event.id}`)}
                      >
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="font-medium text-xs sm:text-sm whitespace-normal break-words line-clamp-2">{event.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {`Vence: ${displayDate}`}
                          </p>
                        </div>
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300 px-2 py-0.5">
                          <AlertCircle className="h-3 w-3" />
                          <span className="ml-1 hidden sm:inline">Pendente</span>
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card de Pagamentos Avulsos - apenas para não-superadmin */}
        {!isSuperAdmin && (
          <Card className="bg-muted/30 dark:bg-muted/20 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Pagamentos Avulsos
              </CardTitle>
              <CardDescription className="text-xs">Lista de pagamentos avulsos pendentes</CardDescription>
            </CardHeader>
            <CardContent>
              <Separator className="my-2" />
              {avulsosPending.length === 0 ? (
                <EmptyState
                  title="Nenhum pagamento avulso pendente"
                  description="Sem pagamentos avulsos pendentes no momento."
                />
              ) : (
                <div className="space-y-2">
                  {avulsosPending.slice(0, 6).map((p) => {
                    const isOverdue = p.payment_status === 'pending' && p.payment_due_date && new Date(p.payment_due_date) < new Date();
                    const dueLabel = p.payment_due_date ? `Vence: ${formatDateShort(p.payment_due_date)}` : 'Sem data de vencimento';
                    return (
                      <button
                        key={p.id}
                        className={`w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer bg-card ${isOverdue ? 'border-red-200' : ''}`}
                        onClick={(e) => { e.stopPropagation(); navigate('/app/pagamentos-avulsos'); }}
                      >
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="font-medium text-xs sm:text-sm whitespace-normal break-words line-clamp-2">{p.personnel?.name || 'Funcionário'}</h4>
                          <p className="text-sm text-muted-foreground">{dueLabel}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOverdue && (
                            <Badge variant="destructive">Atrasado</Badge>
                          )}
                          <span className="font-semibold">{formatCurrency(Number(p.amount) || 0)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); navigate('/app/pagamentos-avulsos'); }}
                >
                  Ver todos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
