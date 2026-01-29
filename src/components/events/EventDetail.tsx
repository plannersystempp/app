import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventsQuery, useDeleteEventMutation } from '@/hooks/queries/useEventsQuery';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Calendar, Users, Clock, Settings2, Printer, Trash2, 
  MapPin, Phone, DollarSign, ShieldAlert, Star, Info, ChevronRight, LayoutDashboard,
  CalendarDays, Wallet, FileText
} from 'lucide-react';
import { AllocationManager } from './AllocationManager';
import { DailyAttendanceList } from './DailyAttendanceList';
import { EventForm } from './EventForm';
import { formatDateBR } from '@/utils/dateUtils';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { assignments, personnel, workLogs, divisions, loading } = useEnhancedData();
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
  const { data: canManageCosts } = useHasEventPermission(id || '', 'costs');
  const { data: canViewPayroll } = useHasEventPermission(id || '', 'payroll');

  const event = eventsList?.find(e => e.id === id);

  // Refs para rolar até o conteúdo correspondente
  const allocationsRef = useRef<HTMLDivElement | null>(null);
  const attendanceRef = useRef<HTMLDivElement | null>(null);
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
    if (target) {
        const id = window.setTimeout(() => {
        scrollToSection(target);
        }, 50);
        return () => window.clearTimeout(id);
    }
  }, [activeTab]);

  // Verificação de acesso para coordenadores
  useEffect(() => {
    if (!loading && !checkingPermission && event) {
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
  
  if (checkingPermission || (loading && (!eventsList || eventsList.length === 0))) {
    return (
      <div className="p-4 space-y-4 max-w-[1600px] mx-auto">
        <div className="h-8 w-16 bg-muted rounded animate-pulse" />
        <SkeletonCard />
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-xl font-bold mb-4">Evento não encontrado</h1>
        <Button onClick={() => navigate('/app/eventos')}>
          Voltar para Eventos
        </Button>
      </div>
    );
  }
  
  if (event && userRole === 'coordinator' && canView === false) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>
            Você não tem permissão para visualizar os detalhes deste evento. 
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/app/eventos')} className="mt-4">
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
  const eventDivisionsCount = divisions.filter(d => d.event_id === event.id).length;

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
    <div className="min-h-screen bg-muted/10 pb-12 print-section">
      {/* Compact Header */}
      <header className="bg-background border-b sticky top-0 z-10 no-print">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/app/eventos')}
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-4 shrink-0" />
            
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-semibold truncate">{event.name}</h1>
              <StatusBadge status={event.status || 'planejado'} className="scale-75 origin-left" />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-4 mr-4 text-xs text-muted-foreground">
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[150px]">{event.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDateBR(event.start_date)}</span>
              </div>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <Info className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                  <SheetTitle>Detalhes do Evento</SheetTitle>
                  <SheetDescription>Visão completa e configurações.</SheetDescription>
                </SheetHeader>
                
                <div className="space-y-6">
                  {/* ... (Conteúdo do Sheet mantido igual) ... */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações Gerais</h4>
                    <div className="grid gap-3 bg-muted/30 p-3 rounded-md text-sm">
                      <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className="text-muted-foreground">Status</span>
                        <StatusBadge status={event.status || 'planejado'} />
                      </div>
                      <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className="text-muted-foreground">Local</span>
                        <span className="font-medium">{event.location || '-'}</span>
                      </div>
                      <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className="text-muted-foreground">Cliente</span>
                        <span className="font-medium">{event.client_contact_phone || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cronograma</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 border rounded bg-background">
                        <span className="text-muted-foreground">Início</span>
                        <span className="font-medium">{formatDateBR(event.start_date)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 border rounded bg-background">
                        <span className="text-muted-foreground">Fim</span>
                        <span className="font-medium">{formatDateBR(event.end_date)}</span>
                      </div>
                      {(event.setup_start_date || event.setup_end_date) && (
                        <div className="flex justify-between items-center p-2 border rounded bg-muted/20">
                          <span className="text-muted-foreground">Montagem</span>
                          <span className="font-medium text-xs">
                            {event.setup_start_date ? formatDateBR(event.setup_start_date) : '...'} - {event.setup_end_date ? formatDateBR(event.setup_end_date) : '...'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Actions in Sheet for Mobile/Compact View */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {(userRole === 'admin' || canViewPayroll) && (
                        <Button variant="outline" size="sm" onClick={() => navigate(`/app/folha/${event.id}`)} className="justify-start">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Folha
                        </Button>
                      )}
                      {(userRole === 'admin' || userRole === 'coordinator') && (
                        <Button variant="outline" size="sm" onClick={() => navigate(`/app/eventos/${event.id}/avaliar-freelancers`)} className="justify-start">
                          <Star className="w-4 h-4 mr-2" />
                          Avaliar
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => window.print()} className="justify-start">
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                      </Button>
                      {(userRole === 'admin' || (userRole === 'coordinator' && canEdit)) && (
                        <Button variant="outline" size="sm" onClick={() => setShowEditForm(true)} className="justify-start">
                          <Settings2 className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>

                  {userRole === 'admin' && (
                    <>
                      <Separator />
                      <div className="pt-2">
                        <AlertDialog onOpenChange={(open) => { if (!open) setConfirmPermanent(false); }}>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="w-full">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir Evento
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Evento</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação é irreversível.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="mt-4 flex items-center gap-2">
                              <Checkbox
                                id="confirm-delete"
                                checked={confirmPermanent}
                                onCheckedChange={(v) => setConfirmPermanent(!!v)}
                              />
                              <label htmlFor="confirm-delete" className="text-sm leading-none select-none">
                                Confirmar exclusão permanente
                              </label>
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteEvent} disabled={!confirmPermanent} className="bg-destructive hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Separator orientation="vertical" className="h-4 hidden sm:block" />

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
              {(userRole === 'admin' || canViewPayroll) && (
                <Button variant="ghost" size="sm" onClick={() => navigate(`/app/folha/${event.id}`)}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Folha
                </Button>
              )}
              
              <Button variant="ghost" size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>

              {(userRole === 'admin' || (userRole === 'coordinator' && canEdit)) && (
                <Button variant="default" size="sm" onClick={() => setShowEditForm(true)} className="h-8">
                  Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Overview Cards - Compact Grid */}
      <div className="bg-background border-b no-print">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 space-y-4">
          {event.description && (
             <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded border border-l-4 border-l-primary">
                <span className="font-semibold text-foreground mr-2">Sobre o evento:</span>
                {event.description}
             </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-none border bg-muted/20">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pessoal</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{uniquePersonnel.size}</p>
                </div>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card className="shadow-none border bg-muted/20">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Divisões</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{eventDivisionsCount}</p>
                </div>
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card className="shadow-none border bg-muted/20">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">H. Extras</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{totalOvertimeHours}h</p>
                </div>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card className="shadow-none border bg-muted/20">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Financeiro</p>
                  <p className="text-sm font-medium text-foreground mt-0.5 truncate">
                    {event.payment_due_date ? formatDateBR(event.payment_due_date) : '-'}
                  </p>
                </div>
                <Wallet className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 no-print">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
          <TabsList className="w-full justify-start h-9 p-0 bg-transparent border-b rounded-none gap-6">
            <TabsTrigger 
              value="allocations" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Gestão de Equipe
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="attendance" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Lista de Presença
              </div>
            </TabsTrigger>
            {(userRole === 'admin' || canManageCosts) && (
              <TabsTrigger 
                value="costs" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Custos
                </div>
              </TabsTrigger>
            )}
            {userRole === 'admin' && (
              <TabsTrigger 
                value="absences" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Faltas
                </div>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="min-h-[500px]">
            <TabsContent value="allocations" className="mt-0 focus-visible:ring-0 animate-in fade-in-50 duration-300">
               <div ref={allocationsRef}>
                 <AllocationManager eventId={event.id} />
               </div>
            </TabsContent>

            <TabsContent value="attendance" className="mt-0 focus-visible:ring-0 animate-in fade-in-50 duration-300">
               <div ref={attendanceRef}>
                <DailyAttendanceList eventId={event.id} />
               </div>
            </TabsContent>

            {user?.role === 'admin' && (
              <>
                <TabsContent value="costs" className="mt-0 focus-visible:ring-0 animate-in fade-in-50 duration-300">
                   <div ref={costsRef}>
                    <EventCostsTab eventId={event.id} />
                   </div>
                </TabsContent>
                <TabsContent value="absences" className="mt-0 focus-visible:ring-0 animate-in fade-in-50 duration-300">
                   <div ref={absencesRef}>
                    <AbsenceHistory eventId={event.id} />
                   </div>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
        
        {/* Permission Manager - Discrete Section */}
        {userRole === 'admin' && (
          <div className="mt-12 pt-8 border-t">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <ShieldAlert className="w-4 h-4" />
                Controle de Acesso
              </h3>
            </div>
            <Card className="shadow-sm border-dashed">
              <CardContent className="pt-6">
                <EventPermissionsManager
                  eventId={event.id}
                  eventName={event.name}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Print View Simplified */}
      <div className="print-only space-y-6 hidden">
        <div className="text-center mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
          <div className="flex justify-center gap-4 text-sm text-gray-600">
             <span>{formatDateBR(event.start_date)} - {formatDateBR(event.end_date)}</span>
             <span>|</span>
             <span>{event.location}</span>
          </div>
        </div>

        {/* Relatório de Alocação para Impressão */}
        {(() => {
          const eventDivs = divisions
            .filter(d => d.event_id === event.id)
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0) || a.name.localeCompare(b.name));
            
          const coordDivs = eventDivs.filter(d => {
             const name = d.name.toLowerCase();
             return name.includes('coord') || name.includes('direção') || name.includes('produção') || name.includes('liderança') || name.includes('gerência');
          });
          const otherDivs = eventDivs.filter(d => !coordDivs.includes(d));
          const allDivsOrdered = [...coordDivs, ...otherDivs];

          return (
            <div className="space-y-8">
              {allDivsOrdered.map(division => {
                const divisionAssignments = eventAssignments.filter(a => a.division_id === division.id);
                if (divisionAssignments.length === 0) return null;

                return (
                  <div key={division.id} className="break-inside-avoid">
                    <h3 className="text-lg font-bold border-b-2 border-gray-300 mb-4 pb-1 uppercase tracking-wider">
                      {division.name}
                    </h3>
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-2 font-semibold w-[30%]">Nome</th>
                          <th className="py-2 font-semibold w-[25%]">Função</th>
                          <th className="py-2 font-semibold w-[25%]">Dias</th>
                          <th className="py-2 font-semibold w-[20%] text-right">Horário</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {divisionAssignments.map(assignment => {
                          const person = personnel.find(p => p.id === assignment.personnel_id);
                          return (
                            <tr key={assignment.id}>
                              <td className="py-2 font-medium">{person?.name || 'Desconhecido'}</td>
                              <td className="py-2 text-gray-600">{assignment.function_name}</td>
                              <td className="py-2 text-gray-600 text-xs">
                                {assignment.work_days?.map(d => d.split('-').reverse().slice(0, 2).join('/')).join(', ')}
                              </td>
                              <td className="py-2 text-right text-gray-600">
                                {assignment.start_time && assignment.end_time 
                                  ? `${assignment.start_time} - ${assignment.end_time}`
                                  : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {/* Sem Divisão */}
              {(() => {
                const noDivisionAssignments = eventAssignments.filter(a => !a.division_id);
                if (noDivisionAssignments.length === 0) return null;
                return (
                  <div className="break-inside-avoid">
                    <h3 className="text-lg font-bold border-b-2 border-gray-300 mb-4 pb-1 uppercase tracking-wider text-gray-500">
                      Sem Divisão
                    </h3>
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-2 font-semibold w-[30%]">Nome</th>
                          <th className="py-2 font-semibold w-[25%]">Função</th>
                          <th className="py-2 font-semibold w-[25%]">Dias</th>
                          <th className="py-2 font-semibold w-[20%] text-right">Horário</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {noDivisionAssignments.map(assignment => {
                           const person = personnel.find(p => p.id === assignment.personnel_id);
                           return (
                             <tr key={assignment.id}>
                               <td className="py-2 font-medium">{person?.name || 'Desconhecido'}</td>
                               <td className="py-2 text-gray-600">{assignment.function_name}</td>
                               <td className="py-2 text-gray-600 text-xs">
                                 {assignment.work_days?.map(d => d.split('-').reverse().slice(0, 2).join('/')).join(', ')}
                               </td>
                               <td className="py-2 text-right text-gray-600">
                                 {assignment.start_time && assignment.end_time 
                                   ? `${assignment.start_time} - ${assignment.end_time}`
                                   : '-'}
                               </td>
                             </tr>
                           );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          );
        })()}
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
