
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventsQuery, useDeleteEventMutation } from '@/hooks/queries/useEventsQuery';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Users, Clock, Settings2, Printer, Trash2, MapPin, Phone, DollarSign, Lock, ShieldAlert, Star } from 'lucide-react';
import { AllocationManager } from './AllocationManager';
import { EventForm } from './EventForm';
import { formatDateBR } from '@/utils/dateUtils';
import { FreelancerRating } from '@/components/personnel/FreelancerRating';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AbsenceHistory } from './AbsenceHistory';
import { EventCostsTab } from './costs/EventCostsTab';
import { useHasEventPermission } from '@/hooks/useEventPermissions';
import { useTeam } from '@/contexts/TeamContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EventPermissionsManager } from '@/components/admin/EventPermissionsManager';

export const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { assignments, personnel, functions, workLogs, divisions, loading } = useEnhancedData();
  const { data: eventsList } = useEventsQuery();
  const deleteEventMutation = useDeleteEventMutation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { userRole } = useTeam();
  const [showEditForm, setShowEditForm] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('allocations');
  const [confirmPermanent, setConfirmPermanent] = useState(false);

  // Buscar permissões do coordenador
  const { data: canView, isLoading: checkingPermission } = useHasEventPermission(id || '', 'view');
  const { data: canEdit } = useHasEventPermission(id || '', 'edit');
  const { data: canManageAllocations } = useHasEventPermission(id || '', 'allocations');
  const { data: canManageCosts } = useHasEventPermission(id || '', 'costs');
  const { data: canViewPayroll } = useHasEventPermission(id || '', 'payroll');

  // Refs para rolar até o conteúdo correspondente
  const allocationsRef = useRef<HTMLDivElement | null>(null);
  const absencesRef = useRef<HTMLDivElement | null>(null);
  const costsRef = useRef<HTMLDivElement | null>(null);

  const scrollToSection = (el: HTMLElement | null) => {
    if (!el) return;
    const offset = 80; // compensar cabeçalho/navegação fixa
    const y = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val);
  };

  const tabsCount = 1 + ((userRole === 'admin' || canManageCosts) ? 1 : 0) + (userRole === 'admin' ? 1 : 0);
  const tabsColsClass = tabsCount === 1 ? 'grid-cols-1' : tabsCount === 2 ? 'grid-cols-2' : 'grid-cols-3';

  // Após mudar a aba, rolar quando o conteúdo estiver montado
  useEffect(() => {
    const target =
      activeTab === 'allocations'
        ? allocationsRef.current
        : activeTab === 'absences'
        ? absencesRef.current
        : activeTab === 'costs'
        ? costsRef.current
        : null;

    // Pequeno atraso para garantir montagem/medição do layout
    const id = window.setTimeout(() => {
      scrollToSection(target);
    }, 50);
    return () => window.clearTimeout(id);
  }, [activeTab]);

  const event = eventsList?.find(e => e.id === id);
  
  // Verificação de acesso para coordenadores
  useEffect(() => {
    if (!loading && !checkingPermission && event) {
      // Coordenadores sem permissão são redirecionados
      if (userRole === 'coordinator' && canView === false) {
        toast({
          title: "Acesso Negado",
          description: "Você não tem permissão para visualizar este evento.",
          variant: "destructive"
        });
        navigate('/app/eventos');
      }
    }
  }, [loading, checkingPermission, event, userRole, canView, navigate, toast]);
  
  // Skeleton durante verificação de permissão
  if (checkingPermission) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-16 bg-muted rounded animate-pulse" />
        </div>
        <SkeletonCard />
      </div>
    );
  }
  
  // Only show skeleton on initial load, not on background refreshes
  if (loading && (!eventsList || eventsList.length === 0)) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-16 bg-muted rounded animate-pulse" />
        </div>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <SkeletonCard showSubtitle={false} />
          <SkeletonCard showSubtitle={false} />
          <SkeletonCard showSubtitle={false} />
          <SkeletonCard showSubtitle={false} />
        </div>
        
        <SkeletonCard />
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Evento não encontrado</h1>
          <Button onClick={() => navigate('/app/eventos')}>
            Voltar para Eventos
          </Button>
        </div>
      </div>
    );
  }
  
  // Bloqueio visual se coordenador não tiver acesso
  if (event && userRole === 'coordinator' && canView === false) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>
            Você não tem permissão para visualizar os detalhes deste evento. 
            Entre em contato com um administrador para solicitar acesso.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => navigate('/app/eventos')}
          className="mt-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Lista de Eventos
        </Button>
      </div>
    );
  }

  const eventAssignments = assignments.filter(a => a.event_id === event.id);
  const uniquePersonnel = new Set(eventAssignments.map(a => a.personnel_id));
  const eventWorkLogs = workLogs.filter(log => 
    eventAssignments.some(assignment => 
      assignment.personnel_id === log.employee_id && assignment.event_id === log.event_id
    )
  );

  const totalOvertimeHours = eventWorkLogs.reduce((sum, log) => sum + log.overtime_hours, 0);

  const handleDeleteEvent = async () => {
    if (!confirmPermanent) {
      toast({
        title: 'Confirmação necessária',
        description: 'Marque o checkbox “Entendo que esta ação é permanente”.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await deleteEventMutation.mutateAsync(event.id);
      setConfirmPermanent(false);
      navigate('/app/eventos');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir evento",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 print-section">
      <div className="flex items-center gap-4 no-print">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/app/eventos')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold break-words">{event.name}</h1>
            <StatusBadge status={event.status || 'planejado'} />
          </div>
          <div className="space-y-1">
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="font-medium text-foreground">{event.location}</span>
              </div>
            )}
            {event.client_contact_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span className="font-medium text-foreground">{event.client_contact_phone}</span>
              </div>
            )}
            {event.payment_due_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Vencimento do pagamento: <span className="font-medium text-foreground">{formatDateBR(event.payment_due_date)}</span></span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto no-print">
          {/* Botão de Folha de Pagamento - apenas para admins ou coordenadores com permissão */}
          {(userRole === 'admin' || canViewPayroll) && (
            <Button 
              variant="secondary" 
              onClick={() => navigate(`/app/folha/${event.id}`)}
              className="flex items-center gap-2 w-full sm:w-auto text-xs sm:text-sm"
            >
              <DollarSign className="w-4 h-4" />
              <span className="hidden xs:inline">Folha de Pagamento</span>
              <span className="xs:hidden">Folha</span>
            </Button>
          )}
          {(userRole === 'admin' || userRole === 'coordinator') && (
            <Button
              variant="default"
              onClick={() => navigate(`/app/eventos/${event.id}/avaliar-freelancers`)}
              className="flex items-center gap-2 w-full sm:w-auto text-xs sm:text-sm"
            >
              <Star className="w-4 h-4" />
              <span className="hidden xs:inline">Avaliar Freelancers</span>
              <span className="xs:hidden">Avaliar</span>
            </Button>
          )}
          {/* Botão secundário - Imprimir (outline) */}
          <Button variant="outline" onClick={() => window.print()} className="w-full sm:w-auto text-xs sm:text-sm">
            <Printer className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          {(userRole === 'admin' || (userRole === 'coordinator' && canEdit)) && (
            <>
              {/* Botão de Deletar (apenas admin) */}
              {userRole === 'admin' && (
                <AlertDialog onOpenChange={(open) => { if (!open) setConfirmPermanent(false); }}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto text-xs sm:text-sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Excluir</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Evento</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o evento "{event.name}"? 
                        Esta ação não pode ser desfeita e removerá todas as alocações e registros relacionados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="mt-4 flex items-center gap-2">
                      <Checkbox
                        id={`confirm-permanent-event-detail-${event.id}`}
                        checked={confirmPermanent}
                        onCheckedChange={(v) => setConfirmPermanent(!!v)}
                      />
                      <label htmlFor={`confirm-permanent-event-detail-${event.id}`} className="text-sm leading-none select-none">
                        Entendo que esta ação é permanente
                      </label>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={!confirmPermanent}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {/* Botão primário - Editar */}
              <Button variant="default" onClick={() => setShowEditForm(true)} className="w-full sm:w-auto text-xs sm:text-sm">
                <Settings2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            </>
          )}
        </div>
      </div>


      {/* Print-only simplified layout */}
      <div className="print-only space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
          <div className="text-lg text-muted-foreground">Detalhes do Evento</div>
        </div>

        {/* Event Information Table */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Informações do Evento</h2>
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium bg-gray-50 w-1/3">Status</td>
                <td className="border border-gray-300 px-4 py-2">{event.status || 'planejado'}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium bg-gray-50">Data de Início</td>
                <td className="border border-gray-300 px-4 py-2">{formatDateBR(event.start_date)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium bg-gray-50">Data de Fim</td>
                <td className="border border-gray-300 px-4 py-2">{formatDateBR(event.end_date)}</td>
              </tr>
              {event.location && (
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-medium bg-gray-50">Local</td>
                  <td className="border border-gray-300 px-4 py-2">{event.location}</td>
                </tr>
              )}
              {event.client_contact_phone && (
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-medium bg-gray-50">Contato do Cliente</td>
                  <td className="border border-gray-300 px-4 py-2">{event.client_contact_phone}</td>
                </tr>
              )}
              {event.payment_due_date && (
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-medium bg-gray-50">Vencimento do Pagamento</td>
                  <td className="border border-gray-300 px-4 py-2">{formatDateBR(event.payment_due_date)}</td>
                </tr>
              )}
              {(event.setup_start_date || event.setup_end_date) && (
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-medium bg-gray-50">Período de Montagem</td>
                  <td className="border border-gray-300 px-4 py-2">
                    {event.setup_start_date && event.setup_end_date 
                      ? `${formatDateBR(event.setup_start_date)} - ${formatDateBR(event.setup_end_date)}`
                      : event.setup_start_date 
                        ? `A partir de ${formatDateBR(event.setup_start_date)}`
                        : `Até ${formatDateBR(event.setup_end_date!)}`
                    }
                  </td>
                </tr>
              )}
              {event.description && (
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-medium bg-gray-50">Descrição</td>
                  <td className="border border-gray-300 px-4 py-2">{event.description}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Statistics Table */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Estatísticas</h2>
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium bg-gray-50 w-1/2">Pessoas Alocadas</td>
                <td className="border border-gray-300 px-4 py-2">{uniquePersonnel.size}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium bg-gray-50">Total de Alocações</td>
                <td className="border border-gray-300 px-4 py-2">{eventAssignments.length}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium bg-gray-50">Horas Extras Registradas</td>
                <td className="border border-gray-300 px-4 py-2">{totalOvertimeHours}h</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium bg-gray-50">Lançamentos de Horas</td>
                <td className="border border-gray-300 px-4 py-2">{eventWorkLogs.length}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Allocations by Division */}
        {eventAssignments.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Alocação de Pessoal</h2>
            {(() => {
              // Helper function to format work days as day numbers only
              const formatWorkDays = (workDays: string[]) => {
                if (!workDays || workDays.length === 0) return 'N/A';
                return workDays
                  .map(dateStr => new Date(dateStr).getDate().toString())
                  .join(', ');
              };

              // Get event divisions and group assignments by division
              const eventDivisions = divisions.filter(d => d.event_id === event.id);
              const assignmentsByDivision = eventDivisions.map(division => ({
                division,
                assignments: eventAssignments.filter(a => a.division_id === division.id)
              })).filter(group => group.assignments.length > 0);

              return assignmentsByDivision.map(({ division, assignments }) => (
                <div key={division.id} className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700">{division.name}</h3>
                  <table className="w-full border-collapse border border-gray-300 mb-4">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Nome</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Função</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Tipo</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Dias de Trabalho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((assignment) => {
                        const person = personnel.find(p => p.id === assignment.personnel_id);
                        if (!person) return null;

                        return (
                          <tr key={assignment.id}>
                            <td className="border border-gray-300 px-4 py-2">{person.name}</td>
                            <td className="border border-gray-300 px-4 py-2">{assignment.function_name}</td>
                            <td className="border border-gray-300 px-4 py-2 capitalize">{person.type}</td>
                            <td className="border border-gray-300 px-4 py-2">
                              {formatWorkDays(assignment.work_days)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Regular UI - hidden on print */}
      <div className="no-print">
        {/* Grade 2x2 expandida para os cards de informação */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-4">
          <Card>
            <CardHeader className="pb-1 md:pb-2">
              <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2 md:gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">Data de Início</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm md:text-base font-semibold">{formatDateBR(event.start_date)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 md:pb-2">
              <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2 md:gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">Data de Fim</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm md:text-base font-semibold">{formatDateBR(event.end_date)}</p>
            </CardContent>
          </Card>

          {(event.setup_start_date || event.setup_end_date) && (
            <Card>
              <CardHeader className="pb-1 md:pb-2">
                <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2 md:gap-3">
                  <Settings2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">Montagem</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm md:text-base font-semibold">
                  {event.setup_start_date && event.setup_end_date 
                    ? `${formatDateBR(event.setup_start_date)} - ${formatDateBR(event.setup_end_date)}`
                    : event.setup_start_date 
                      ? `A partir de ${formatDateBR(event.setup_start_date)}`
                      : `Até ${formatDateBR(event.setup_end_date!)}`
                  }
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2">
                <Users className="w-3 md:w-4 h-3 md:h-4 text-muted-foreground" />
                <span className="truncate">Pessoas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm md:text-base font-semibold">{uniquePersonnel.size}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2">
                <Clock className="w-3 md:w-4 h-3 md:h-4 text-muted-foreground" />
                <span className="truncate">H. Extras</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm md:text-base font-semibold">{totalOvertimeHours}h</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-8 space-y-6">
          <TabsList className={`grid w-full h-10 md:h-12 ${tabsColsClass}`}>
            <TabsTrigger value="allocations" className="text-sm">Alocações</TabsTrigger>
            {(userRole === 'admin' || canManageCosts) && (
              <TabsTrigger value="costs" className="text-sm">Custos</TabsTrigger>
            )}
            {userRole === 'admin' && (
              <TabsTrigger value="absences" className="text-sm">Faltas</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="allocations" forceMount>
            <div ref={allocationsRef}>
              <AllocationManager eventId={event.id} />
            </div>
          </TabsContent>


          {user?.role === 'admin' && (
            <>
              <TabsContent value="costs" forceMount>
                <div ref={costsRef}>
                  <EventCostsTab eventId={event.id} />
                </div>
              </TabsContent>
              <TabsContent value="absences" forceMount>
                <div ref={absencesRef}>
                  <AbsenceHistory eventId={event.id} />
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
        
        {/* Gerenciador de Permissões - apenas para admins */}
        {userRole === 'admin' && (
          <div className="mt-8">
            <EventPermissionsManager
              eventId={event.id}
              eventName={event.name}
            />
          </div>
        )}
      </div>

      {showEditForm && (
        <EventForm
          event={event}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => setShowEditForm(false)}
        />
      )}
    </div>
  );
};
