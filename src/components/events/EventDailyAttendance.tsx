import React, { useState, useMemo } from 'react';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useWorkLogsQuery, useCreateWorkLogMutation, useUpdateWorkLogMutation, useDeleteWorkLogMutation } from '@/hooks/queries/useWorkLogsQuery';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Search, Calendar, UserCheck, Clock, Users, Filter, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDateBR } from '@/utils/dateUtils';
import { getExpectedWorkHours, formatTimeRange } from '@/utils/allocationUtils';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PaginationControl } from '@/components/shared/PaginationControl';
import { useUrlState } from '@/hooks/useUrlState';

interface DailyAttendanceListProps {
  eventId: string;
}

const ITEMS_PER_PAGE = 10;

export const DailyAttendanceList: React.FC<DailyAttendanceListProps> = ({ eventId }) => {
  const { assignments, personnel, functions, divisions, events } = useEnhancedData();
  const { data: globalWorkLogs = [] } = useWorkLogsQuery();
  const createWorkLog = useCreateWorkLogMutation();
  const updateWorkLog = useUpdateWorkLogMutation();
  const deleteWorkLog = useDeleteWorkLogMutation();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useUrlState('att_date', '');
  const [searchTerm, setSearchTerm] = useUrlState('att_q', '');
  const [selectedFunction, setSelectedFunction] = useUrlState('att_func', 'all');
  const [selectedStatus, setSelectedStatus] = useUrlState('att_status', 'all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [page, setPage] = useUrlState('att_page', 1);

  // 1. Obter todas as alocações deste evento
  const eventAssignments = useMemo(() => 
    assignments.filter(a => a.event_id === eventId),
    [assignments, eventId]
  );

  const currentEvent = events.find(e => e.id === eventId);

  // 2. Extrair dias do evento (Range completo)
  const uniqueWorkDays = useMemo(() => {
    // Se tiver datas definidas no evento, usa o intervalo do evento
    if (currentEvent?.start_date && currentEvent?.end_date) {
      const dates: string[] = [];
      const [startYear, startMonth, startDay] = currentEvent.start_date.split('-').map(Number);
      const [endYear, endMonth, endDay] = currentEvent.end_date.split('-').map(Number);
      
      const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
      const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const year = currentDate.getUTCFullYear();
        const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getUTCDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
      return dates;
    }

    // Fallback: Se não tiver datas no evento, usa os dias das alocações
    const days = new Set<string>();
    eventAssignments.forEach(a => {
      a.work_days?.forEach(day => days.add(day));
    });
    return Array.from(days).sort();
  }, [currentEvent, eventAssignments]);

  // Selecionar o primeiro dia por padrão se nenhum selecionado
  React.useEffect(() => {
    if (!selectedDate && uniqueWorkDays.length > 0) {
      setSelectedDate(uniqueWorkDays[0]);
    }
  }, [uniqueWorkDays, selectedDate]);

  // 3. Filtrar worklogs para este evento
  const eventWorkLogs = useMemo(() => 
    globalWorkLogs.filter(log => log.event_id === eventId),
    [globalWorkLogs, eventId]
  );

  // 4. Obter lista de pessoas para o dia selecionado (Raw)
  const rawDailyPersonnel = useMemo(() => {
    if (!selectedDate) return [];

    const assignmentsForDay = eventAssignments.filter(a => 
      a.work_days?.includes(selectedDate)
    );

    return assignmentsForDay.map(assignment => {
      const person = personnel.find(p => p.id === assignment.personnel_id);
      const func = functions.find(f => f.id === assignment.function_id);
      const division = divisions.find(d => d.id === assignment.division_id);
      const event = events.find(e => e.id === eventId);
      
      const { startTime, endTime } = getExpectedWorkHours(assignment, division, event);
      
      const workLog = eventWorkLogs.find(log => 
        log.employee_id === assignment.personnel_id && 
        log.work_date === selectedDate
      );

      return {
        id: assignment.personnel_id,
        assignmentId: assignment.id,
        name: person?.name || 'Desconhecido',
        avatar: person?.photo_url,
        functionName: assignment.function_name || func?.name || 'Função não definida',
        status: workLog?.attendance_status || 'pending',
        workLog,
        formattedTime: formatTimeRange(startTime, endTime)
      };
    });
  }, [selectedDate, eventAssignments, personnel, functions, eventWorkLogs, divisions, events, eventId]);

  // 5. Extrair funções únicas para o filtro
  const uniqueFunctions = useMemo(() => {
    const funcs = new Set<string>();
    rawDailyPersonnel.forEach(p => funcs.add(p.functionName));
    return Array.from(funcs).sort();
  }, [rawDailyPersonnel]);

  // 6. Aplicar filtros de busca e função
  const filteredPersonnel = useMemo(() => {
    return rawDailyPersonnel.filter(p => {
      const matchesSearch = (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (p.functionName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesFunction = selectedFunction === 'all' || p.functionName === selectedFunction;
      const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
      return matchesSearch && matchesFunction && matchesStatus;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawDailyPersonnel, searchTerm, selectedFunction, selectedStatus]);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedFunction, selectedStatus, selectedDate]);

  // Handler para alternar presença individual
  const handleToggleAttendance = async (person: any, clickedStatus: 'present' | 'absent') => {
    setLoadingId(person.id);
    try {
      // Se clicar no mesmo status, desmarcar (voltar para pending)
      if (person.status === clickedStatus) {
        if (person.workLog) {
          // Se tiver notas, atualiza para pending para não perder as notas
          if (person.workLog.notes) {
            await updateWorkLog.mutateAsync({
              ...person.workLog,
              attendance_status: 'pending',
              hours_worked: 0,
              overtime_hours: 0,
              total_pay: 0
            });
          } else {
            // Se não tiver notas, deleta o registro para limpar
            await deleteWorkLog.mutateAsync(person.workLog.id);
          }
          toast({
            title: "Status removido",
            description: `Presença/Falta de ${person.name} removida.`,
          });
        }
        // Se não tiver workLog mas status for igual (o que seria estranho pois status vem do workLog), nada a fazer
        setLoadingId(null);
        return;
      }

      if (person.workLog) {
        await updateWorkLog.mutateAsync({
          ...person.workLog,
          attendance_status: clickedStatus,
          hours_worked: clickedStatus === 'absent' ? 0 : 8,
          overtime_hours: clickedStatus === 'absent' ? 0 : person.workLog.overtime_hours,
          total_pay: 0
        });
      } else {
        await createWorkLog.mutateAsync({
          employee_id: person.id,
          event_id: eventId,
          work_date: selectedDate,
          attendance_status: clickedStatus,
          hours_worked: clickedStatus === 'absent' ? 0 : 8,
          overtime_hours: 0,
          total_pay: 0
        });
      }
      
      toast({
        title: clickedStatus === 'present' ? "Presença confirmada" : "Falta registrada",
        description: `${person.name} - ${formatDateBR(selectedDate)}`,
        variant: clickedStatus === 'present' ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Erro ao atualizar presença:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar status de presença",
        variant: "destructive"
      });
    } finally {
      setLoadingId(null);
    }
  };

  // Cálculos de estatísticas
  const stats = useMemo(() => {
    const total = rawDailyPersonnel.length;
    const present = rawDailyPersonnel.filter(p => p.status === 'present').length;
    const absent = rawDailyPersonnel.filter(p => p.status === 'absent').length;
    const pending = total - present - absent;
    return { total, present, absent, pending };
  }, [rawDailyPersonnel]);

  // Paginação
  const totalPages = Math.ceil(filteredPersonnel.length / ITEMS_PER_PAGE);
  const paginatedPersonnel = filteredPersonnel.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  if (uniqueWorkDays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed">
        <Calendar className="w-12 h-12 mb-4 opacity-50" />
        <h3 className="text-lg font-medium">Nenhum dia de trabalho encontrado</h3>
        <p className="max-w-md mt-2 text-sm">
          Não há alocações com dias de trabalho definidos para este evento.
          Adicione alocações e defina os dias de trabalho na aba "Alocações".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Seleção de Data e Resumo */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <label className="text-sm font-medium text-muted-foreground">Data Selecionada</label>
          <ScrollArea className="w-full whitespace-nowrap md:w-[400px]">
            <div className="flex space-x-2 pb-2">
              {uniqueWorkDays.map((date) => (
                <Button
                  key={date}
                  variant={selectedDate === date ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "flex-shrink-0",
                    selectedDate === date && "shadow-md"
                  )}
                >
                  <Calendar className="w-3 h-3 mr-2" />
                  {formatDateBR(date)}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{stats.total}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">{stats.present}</span>
            <span className="text-xs text-green-600">Presentes</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-100">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">{stats.absent}</span>
            <span className="text-xs text-red-600">Faltas</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 rounded-lg border border-yellow-100">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">{stats.pending}</span>
            <span className="text-xs text-yellow-600">Pendentes</span>
          </div>
        </div>
      </div>

      {/* 2. Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou função..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedFunction} onValueChange={setSelectedFunction}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Todas as funções" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as funções</SelectItem>
            {uniqueFunctions.map(func => (
              <SelectItem key={func} value={func}>{func}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full md:w-[200px]">
            <UserCheck className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="present">Presente</SelectItem>
            <SelectItem value="absent">Falta</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 3. Lista de Presença */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-4 font-medium">Profissional</th>
                  <th className="p-4 font-medium hidden md:table-cell">Função</th>
                  <th className="p-4 font-medium hidden sm:table-cell text-center">Horário</th>
                  <th className="p-4 font-medium text-center">Status</th>
                  <th className="p-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum profissional encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  paginatedPersonnel.map((person) => (
                    <tr key={person.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border">
                            <AvatarImage src={person.avatar} />
                            <AvatarFallback>{person.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{person.name}</span>
                            <span className="text-xs text-muted-foreground md:hidden">{person.functionName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <Badge variant="outline" className="font-normal">
                          {person.functionName}
                        </Badge>
                      </td>
                      <td className="p-4 hidden sm:table-cell text-center text-muted-foreground">
                        {person.formattedTime}
                      </td>
                      <td className="p-4 text-center">
                        {loadingId === person.id ? (
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                        ) : (
                          <div className="flex items-center justify-center">
                            {person.status === 'present' && (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 shadow-none">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Presente
                              </Badge>
                            )}
                            {person.status === 'absent' && (
                              <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 shadow-none">
                                <XCircle className="w-3 h-3 mr-1" />
                                Falta
                              </Badge>
                            )}
                            {person.status === 'pending' && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Pendente
                              </Badge>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant={person.status === 'present' ? "default" : "outline"}
                                  className={cn(
                                    "h-8 w-8 p-0",
                                    person.status === 'present' 
                                      ? "bg-green-600 hover:bg-green-700 border-green-600" 
                                      : "hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                                  )}
                                  onClick={() => handleToggleAttendance(person, 'present')}
                                  disabled={loadingId === person.id}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Marcar como Presente</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant={person.status === 'absent' ? "destructive" : "outline"}
                                  className={cn(
                                    "h-8 w-8 p-0",
                                    person.status === 'absent' 
                                      ? "bg-red-600 hover:bg-red-700 border-red-600" 
                                      : "hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                  )}
                                  onClick={() => handleToggleAttendance(person, 'absent')}
                                  disabled={loadingId === person.id}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Marcar como Falta</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Paginação */}
      {filteredPersonnel.length > 0 && (
        <PaginationControl
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={filteredPersonnel.length}
        />
      )}
    </div>
  );
};
