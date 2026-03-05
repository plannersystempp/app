import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useTeam } from '@/contexts/TeamContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Calendar, Users, MoreVertical, Edit, Trash2, XCircle } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { NoTeamSelected } from '@/components/shared/NoTeamSelected';
import { EventForm } from './EventForm';
import { DataFetcher } from '@/contexts/data/dataFetcher';
import { useToast } from '@/hooks/use-toast';
import { ExportDropdown } from '@/components/shared/ExportDropdown';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useCheckSubscriptionLimits } from '@/hooks/useCheckSubscriptionLimits';
import { UpgradePrompt } from '@/components/subscriptions/UpgradePrompt';
import { useMyEventPermissions } from '@/hooks/useEventPermissions';
import { Lock } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useDeleteEventMutation, useEventsQuery } from '@/hooks/queries/useEventsQuery';

export const ManageEvents: React.FC = () => {
  const { assignments } = useEnhancedData();
  const { activeTeam, userRole } = useTeam();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: events = [], isLoading: eventsLoading, isError: eventsIsError } = useEventsQuery();
  const deleteEventMutation = useDeleteEventMutation();
  
  // Buscar permissões do coordenador
  const { data: myPermissions = [] } = useMyEventPermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [sortOption, setSortOption] = useState<'date_newest' | 'date_oldest' | 'name_asc' | 'name_desc'>('date_newest');
  const [showForm, setShowForm] = useState(false);
  const [creatingExamples, setCreatingExamples] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const [limitCheckResult, setLimitCheckResult] = useState<any>(null);
  const checkLimits = useCheckSubscriptionLimits();
  const [confirmPermanent, setConfirmPermanent] = useState(false);
  const [quickFilter, setQuickFilter] = useState<string>('all');
  const [limitEvents, setLimitEvents] = useState<number | null>(null);

  const clearFilters = () => {
    setSearchTerm('');
    setPeriodStart('');
    setPeriodEnd('');
    setQuickFilter('all');
    setLimitEvents(null);
  };

  const handleQuickFilterChange = (value: string) => {
    setQuickFilter(value);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    const formatDateInput = (d: Date) => d.toISOString().split('T')[0];

    if (value === 'current_month') {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      setPeriodStart(formatDateInput(start));
      setPeriodEnd(formatDateInput(end));
      setLimitEvents(null);
    } else if (value === 'last_month') {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      setPeriodStart(formatDateInput(start));
      setPeriodEnd(formatDateInput(end));
      setLimitEvents(null);
    } else if (value === 'last_3_months') {
      const start = new Date(y, m - 2, 1);
      const end = new Date(y, m + 1, 0);
      setPeriodStart(formatDateInput(start));
      setPeriodEnd(formatDateInput(end));
      setLimitEvents(null);
    } else if (value === 'current_year') {
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      setPeriodStart(formatDateInput(start));
      setPeriodEnd(formatDateInput(end));
      setLimitEvents(null);
    } else if (value === 'last_12_events') {
      setPeriodStart('');
      setPeriodEnd('');
      setLimitEvents(12);
      setSortOption('date_newest');
    } else {
      setPeriodStart('');
      setPeriodEnd('');
      setLimitEvents(null);
    }
  };
  
  // Criar map de permissões para lookup rápido
  const permissionsMap = React.useMemo(() => {
    const map = new Map();
    myPermissions.forEach(perm => map.set(perm.event_id, perm));
    return map;
  }, [myPermissions]);

  // Função para verificar se coordenador pode ver detalhes
  const canViewEventDetails = (eventId: string): boolean => {
    // Admins e superadmins sempre podem
    if (userRole === 'admin' || user?.role === 'superadmin') {
      return true;
    }
    
    // Coordenadores precisam de permissão
    if (userRole === 'coordinator') {
      const permission = permissionsMap.get(eventId);
      return permission?.can_view_details === true;
    }
    
    return false;
  };

  if (!activeTeam) {
    return (
      <NoTeamSelected
        title="Gestão de Eventos"
        description="Selecione uma equipe para começar a gerenciar eventos."
      />
    );
  }

  if (eventsLoading) {
    return (
      <div className="py-10">
        <LoadingSpinner />
      </div>
    );
  }

  if (eventsIsError) {
    return (
      <EmptyState
        icon={<Calendar className="w-12 h-12" />}
        title="Falha ao carregar eventos"
        description="Não foi possível carregar a listagem de eventos. Tente novamente em instantes."
      />
    );
  }

  const filteredEvents = events.filter(event => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      event.name.toLowerCase().includes(searchLower) ||
      (event.description || '').toLowerCase().includes(searchLower) ||
      (event.location || '').toLowerCase().includes(searchLower) ||
      (event.client_contact_phone || '').toLowerCase().includes(searchLower)
    );

    // Filtragem por período (sobreposição entre [start_date, end_date] e [periodStart, periodEnd])
    const start = event.start_date || '';
    const end = event.end_date || '';
    let matchesPeriod = true;
    if (periodStart && periodEnd) {
      matchesPeriod = (start <= periodEnd) && (end >= periodStart);
    } else if (periodStart && !periodEnd) {
      matchesPeriod = end >= periodStart;
    } else if (!periodStart && periodEnd) {
      matchesPeriod = start <= periodEnd;
    }

    return matchesSearch && matchesPeriod;
  });

  // Ordenação baseada na opção selecionada
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortOption) {
      case 'name_asc':
        return a.name.localeCompare(b.name, 'pt-BR');
      case 'name_desc':
        return b.name.localeCompare(a.name, 'pt-BR');
      case 'date_oldest': {
        const timeA = Date.parse(a.start_date || a.end_date || a.created_at || '') || 0;
        const timeB = Date.parse(b.start_date || b.end_date || b.created_at || '') || 0;
        return timeA - timeB;
      }
      case 'date_newest':
      default: {
        const timeA = Date.parse(a.start_date || a.end_date || a.created_at || '') || 0;
        const timeB = Date.parse(b.start_date || b.end_date || b.created_at || '') || 0;
        return timeB - timeA;
      }
    }
  });

  const displayedEvents = limitEvents ? sortedEvents.slice(0, limitEvents) : sortedEvents;

  const getEventStats = (eventId: string) => {
    const eventAssignments = assignments.filter(a => a.event_id === eventId);
    const uniquePersonnel = new Set(eventAssignments.map(a => a.personnel_id));
    return {
      totalPeople: uniquePersonnel.size,
      totalAssignments: eventAssignments.length
    };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const canManageEvents = userRole === 'admin';

  const handleCreateEvent = async () => {
    if (!activeTeam) return;

    try {
      const result = await checkLimits.mutateAsync({
        teamId: activeTeam.id,
        action: 'create_event'
      });

      if (!result.can_proceed) {
        setLimitCheckResult(result);
        setUpgradePromptOpen(true);
        return;
      }

      setShowForm(true);
    } catch (error) {
      console.error('Error checking limits:', error);
      setShowForm(true); // Allow creation if check fails
    }
  };

  const handleCreateSampleData = async () => {
    if (!user || !activeTeam) return;

    try {
      setCreatingExamples(true);
      console.log('Creating sample data for team:', activeTeam.id);
      
      const success = await DataFetcher.createSampleData(activeTeam.id, user.id);
      
      if (success) {
        toast({
          title: "Sucesso",
          description: "Dados de exemplo criados com sucesso!",
        });
        // Recarregar os dados após criar exemplos
        // Data will auto-refresh via EnhancedDataContext
      } else {
        toast({
          title: "Erro",
          description: "Falha ao criar dados de exemplo",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating sample data:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar dados de exemplo",
        variant: "destructive"
      });
    } finally {
      setCreatingExamples(false);
    }
  };

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingEvent(null);
    setSearchTerm(''); // Clear search filter to ensure new event is visible
  };

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (!confirmPermanent) {
      toast({
        title: 'Confirmação necessária',
        description: 'Marque o checkbox “Entendo que esta ação é permanente”.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await deleteEventMutation.mutateAsync(eventId);
      toast({
        title: "Sucesso",
        description: `Evento "${eventName}" excluído com sucesso!`,
      });
      setConfirmPermanent(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir evento",
        variant: "destructive"
      });
    }
  };

  // Preparar dados para exportação
  const exportData = displayedEvents.map(event => {
    const stats = getEventStats(event.id);
    return {
      nome: event.name,
      descricao: event.description || '',
      status: event.status || 'planejado',
      data_inicio: formatDate(event.start_date),
      data_fim: formatDate(event.end_date),
      pessoas_alocadas: stats.totalPeople,
      total_alocacoes: stats.totalAssignments,
      criado_em: new Date(event.created_at).toLocaleDateString('pt-BR'),
    };
  });

  const exportHeaders = ['nome', 'descricao', 'status', 'data_inicio', 'data_fim', 'pessoas_alocadas', 'total_alocacoes', 'criado_em'];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Gestão de Eventos</h1>
          <p className="text-sm text-muted-foreground">Equipe: {activeTeam.name}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
          <div className="order-2 sm:order-1 flex-1">
            <ExportDropdown
              data={exportData}
              headers={exportHeaders}
              filename="eventos_filtrados"
              title="Relatório de Eventos"
              disabled={displayedEvents.length === 0}
            />
          </div>
          {canManageEvents && (
            <Button onClick={handleCreateEvent} className="order-1 sm:order-2 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Criar Evento
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nome, descrição, local ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
          <Select value={quickFilter} onValueChange={handleQuickFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os períodos</SelectItem>
              <SelectItem value="current_month">Mês atual</SelectItem>
              <SelectItem value="last_month">Mês passado</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
              <SelectItem value="current_year">Ano atual</SelectItem>
              <SelectItem value="last_12_events">Últimos 12 eventos</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              placeholder="Data inicial"
              className="flex-1 sm:w-[140px]"
              maxLength={10}
            />
            <span className="text-muted-foreground text-xs sm:text-sm">até</span>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              placeholder="Data final"
              className="flex-1 sm:w-[140px]"
              maxLength={10}
            />
          </div>
          
          <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
            <XCircle className="w-4 h-4 mr-2" />
            <span>Limpar filtro</span>
          </Button>
        </div>
        
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as typeof sortOption)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_newest">Data: mais recente</SelectItem>
            <SelectItem value="date_oldest">Data: mais antiga</SelectItem>
            <SelectItem value="name_asc">Nome: A–Z</SelectItem>
            <SelectItem value="name_desc">Nome: Z–A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {displayedEvents.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          title="Nenhum evento encontrado"
          description={
            searchTerm 
              ? "Tente ajustar os termos de busca" 
              : events.length === 0 
                ? "Crie seu primeiro evento para começar" 
                : "Nenhum evento corresponde à sua busca"
          }
          action={canManageEvents && events.length === 0 ? {
            label: "Criar Primeiro Evento",
            onClick: () => setShowForm(true)
          } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {displayedEvents.map((event) => {
            const stats = getEventStats(event.id);
            const hasAccess = canViewEventDetails(event.id);
            
            return (
              <Card 
                key={event.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  if (hasAccess) {
                    navigate(`/app/eventos/${event.id}`);
                  } else {
                    toast({
                      title: "Acesso Restrito",
                      description: "Você não tem permissão para visualizar os detalhes deste evento.",
                      variant: "destructive"
                    });
                  }
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{event.name}</CardTitle>
                      {userRole === 'coordinator' && !hasAccess && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          Acesso Restrito
                        </Badge>
                      )}
                    </div>
                    <StatusBadge status={event.status || 'planejado'} />
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground dark:text-white" />
                      <span>{formatDate(event.start_date)} - {formatDate(event.end_date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground dark:text-white" />
                      <span>{stats.totalPeople} pessoas alocadas</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant={hasAccess ? "outline" : "ghost"}
                        size="sm"
                        disabled={!hasAccess}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasAccess) {
                            navigate(`/app/eventos/${event.id}`);
                          }
                        }}
                        className="flex-1"
                      >
                        {hasAccess ? (
                          <>Ver Detalhes</>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Sem Acesso
                          </>
                        )}
                      </Button>
                      {canManageEvents && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEvent(event);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <AlertDialog onOpenChange={(open) => { if (!open) setConfirmPermanent(false); }}>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Evento</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o evento "{event.name}"? 
                                    Esta ação não pode ser desfeita e removerá todas as alocações e registros relacionados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="mt-4 flex items-center gap-2">
                                  <Checkbox
                                    id={`confirm-permanent-event-${event.id}`}
                                    checked={confirmPermanent}
                                    onCheckedChange={(v) => setConfirmPermanent(!!v)}
                                  />
                                  <label htmlFor={`confirm-permanent-event-${event.id}`} className="text-sm leading-none select-none">
                                    Entendo que esta ação é permanente
                                  </label>
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteEvent(event.id, event.name);
                                    }}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={!confirmPermanent}
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {(showForm || editingEvent) && (
        <EventForm
          event={editingEvent}
          onClose={() => {
            setShowForm(false);
            setEditingEvent(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      <UpgradePrompt
        open={upgradePromptOpen}
        onOpenChange={setUpgradePromptOpen}
        reason={limitCheckResult?.reason || ''}
        currentPlan={limitCheckResult?.current_plan}
        limit={limitCheckResult?.limit}
        currentCount={limitCheckResult?.current_count}
      />
    </div>
  );
};
