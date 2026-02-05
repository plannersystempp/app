import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useWorkLogsQuery, useCreateWorkLogMutation, useUpdateWorkLogMutation, useDeleteWorkLogMutation } from '@/hooks/queries/useWorkLogsQuery';
import { useToast } from '@/hooks/use-toast';
import { useUrlState } from '@/hooks/useUrlState';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatDateBR } from '@/utils/dateUtils';
import { formatTimeRange, getExpectedWorkHours } from '@/utils/allocationUtils';
import { cn } from '@/lib/utils';
import { PaginationControl } from '@/components/shared/PaginationControl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar, CheckCircle2, Filter, Search, Users, X, XCircle } from 'lucide-react';

interface DailyAttendanceListProps {
  eventId: string;
}

const ITEMS_PER_PAGE = 10;

export const DailyAttendanceList: React.FC<DailyAttendanceListProps> = ({ eventId }) => {
  const { user } = useAuth();
  const { assignments, personnel, functions, divisions, events } = useEnhancedData();
  const { data: globalWorkLogs = [] } = useWorkLogsQuery();
  const createWorkLog = useCreateWorkLogMutation();
  const updateWorkLog = useUpdateWorkLogMutation();
  const deleteWorkLog = useDeleteWorkLogMutation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [selectedDate, setSelectedDate] = useUrlState('att_date', '');
  const [searchTerm, setSearchTerm] = useUrlState('att_q', '');
  const [selectedFunction, setSelectedFunction] = useUrlState('att_func', 'all');
  const [page, setPage] = useUrlState('att_page', 1);

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [timeDrafts, setTimeDrafts] = useState<Record<string, { checkIn: string; checkOut: string }>>({});
  const [timeModalPerson, setTimeModalPerson] = useState<any | null>(null);
  const [modalCheckIn, setModalCheckIn] = useState('');
  const [modalCheckOut, setModalCheckOut] = useState('');

  const [overtimeDialog, setOvertimeDialog] = useState<{ open: boolean; personName: string; hoursWorked: number; overtimeHours: number }>(
    { open: false, personName: '', hoursWorked: 0, overtimeHours: 0 }
  );
  const [overtimeNotifiedKeys, setOvertimeNotifiedKeys] = useState<Record<string, boolean>>({});
  const [photoModalPerson, setPhotoModalPerson] = useState<any | null>(null);

  const toTimeInputValue = (value: string | null | undefined) => (value ? value.slice(0, 5) : '');
  const toDbTimeValue = (value: string) => (value ? (value.length === 5 ? `${value}:00` : value) : null);
  const getTimeKey = (personId: string) => `${eventId}:${selectedDate}:${personId}`;

  const computeHoursFromTimes = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return null;
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    if ([inH, inM, outH, outM].some(n => Number.isNaN(n))) return null;
    const inMinutes = inH * 60 + inM;
    const outMinutes = outH * 60 + outM;
    let diff = outMinutes - inMinutes;
    if (diff < 0) diff += 24 * 60;
    const hours = Math.round((diff / 60) * 100) / 100;
    const overtime = Math.max(0, Math.round((hours - 12) * 100) / 100);
    return { hoursWorked: hours, overtimeHours: overtime };
  };

  const saveCheckTimes = async (person: any, nextCheckIn: string, nextCheckOut: string) => {
    if (!selectedDate) return;

    const hasAnyTime = Boolean(nextCheckIn || nextCheckOut);
    const computed = computeHoursFromTimes(nextCheckIn, nextCheckOut);
    const existingLog = person.workLog;

    if (!existingLog && !hasAnyTime) return;

    const check_in_time = toDbTimeValue(nextCheckIn);
    const check_out_time = toDbTimeValue(nextCheckOut);
    const attendance_status = hasAnyTime ? 'present' : (existingLog?.attendance_status ?? 'pending');
    const hours_worked = computed ? computed.hoursWorked : (existingLog?.hours_worked ?? 0);
    const overtime_hours = computed ? computed.overtimeHours : (existingLog?.overtime_hours ?? 0);

    if (existingLog) {
      await updateWorkLog.mutateAsync({
        ...existingLog,
        attendance_status,
        check_in_time,
        check_out_time,
        hours_worked,
        overtime_hours,
        total_pay: 0,
        logged_by_id: user?.id,
      });
      return;
    }

    await createWorkLog.mutateAsync({
      employee_id: person.id,
      event_id: eventId,
      work_date: selectedDate,
      attendance_status,
      check_in_time,
      check_out_time,
      hours_worked,
      overtime_hours,
      total_pay: 0,
      logged_by_id: user?.id,
    });
  };

  const getDisplayedTimes = (person: any) => {
    const key = getTimeKey(person.id);
    return (
      timeDrafts[key] ?? {
        checkIn: toTimeInputValue(person.workLog?.check_in_time),
        checkOut: toTimeInputValue(person.workLog?.check_out_time),
      }
    );
  };

  const handleTimeChange = async (person: any, field: 'checkIn' | 'checkOut', value: string) => {
    const key = getTimeKey(person.id);
    const current = getDisplayedTimes(person);
    const next = { ...current, [field]: value } as { checkIn: string; checkOut: string };
    setTimeDrafts(prev => ({ ...prev, [key]: next }));
    try {
      await saveCheckTimes(person, next.checkIn, next.checkOut);

      const computed = computeHoursFromTimes(next.checkIn, next.checkOut);
      if (!isMobile && computed) {
        if (computed.overtimeHours > 0 && !overtimeNotifiedKeys[key]) {
          setOvertimeDialog({
            open: true,
            personName: person.name,
            hoursWorked: computed.hoursWorked,
            overtimeHours: computed.overtimeHours,
          });
          setOvertimeNotifiedKeys(prev => ({ ...prev, [key]: true }));
        }
        if (computed.overtimeHours === 0 && overtimeNotifiedKeys[key]) {
          setOvertimeNotifiedKeys(prev => ({ ...prev, [key]: false }));
        }
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar horários de chegada/saída',
        variant: 'destructive',
      });
    }
  };

  const openTimeModal = (person: any) => {
    const times = getDisplayedTimes(person);
    setTimeModalPerson(person);
    setModalCheckIn(times.checkIn);
    setModalCheckOut(times.checkOut);
  };

  const closeTimeModal = () => {
    setTimeModalPerson(null);
    setModalCheckIn('');
    setModalCheckOut('');
  };

  const saveTimeModal = async () => {
    if (!timeModalPerson) return;
    setLoadingId(timeModalPerson.id);
    const key = getTimeKey(timeModalPerson.id);
    const previousTimes = getDisplayedTimes(timeModalPerson);
    setTimeDrafts(prev => ({ ...prev, [key]: { checkIn: modalCheckIn, checkOut: modalCheckOut } }));
    try {
      await saveCheckTimes(timeModalPerson, modalCheckIn, modalCheckOut);
      closeTimeModal();
    } catch {
      setTimeDrafts(prev => ({ ...prev, [key]: previousTimes }));
      toast({
        title: 'Erro',
        description: 'Falha ao salvar horários de chegada/saída',
        variant: 'destructive',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const closePhotoModal = () => {
    setPhotoModalPerson(null);
  };

  const eventAssignments = useMemo(() => assignments.filter(a => a.event_id === eventId), [assignments, eventId]);
  const currentEvent = events.find(e => e.id === eventId);

  const uniqueWorkDays = useMemo(() => {
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

    const days = new Set<string>();
    eventAssignments.forEach(a => {
      a.work_days?.forEach(day => days.add(day));
    });
    return Array.from(days).sort();
  }, [currentEvent, eventAssignments]);

  React.useEffect(() => {
    if (!selectedDate && uniqueWorkDays.length > 0) {
      setSelectedDate(uniqueWorkDays[0]);
    }
  }, [uniqueWorkDays, selectedDate, setSelectedDate]);

  const eventWorkLogs = useMemo(() => globalWorkLogs.filter(log => log.event_id === eventId), [globalWorkLogs, eventId]);

  const rawDailyPersonnel = useMemo(() => {
    if (!selectedDate) return [];

    const assignmentsForDay = eventAssignments.filter(a => a.work_days?.includes(selectedDate));

    return assignmentsForDay.map(assignment => {
      const person = personnel.find(p => p.id === assignment.personnel_id);
      const func = functions.find(f => f.id === assignment.function_id);
      const division = divisions.find(d => d.id === assignment.division_id);
      const event = events.find(e => e.id === eventId);

      const { startTime, endTime } = getExpectedWorkHours(assignment, division, event);

      const workLog = eventWorkLogs.find(log => log.employee_id === assignment.personnel_id && log.work_date === selectedDate);
      const status = workLog?.attendance_status || 'pending';

      return {
        id: assignment.personnel_id,
        assignmentId: assignment.id,
        name: person?.name || 'Desconhecido',
        avatar: person?.photo_url,
        functionName: assignment.function_name || func?.name || 'Função não definida',
        divisionName: division?.name || '—',
        status,
        workLog,
        formattedTime: formatTimeRange(startTime, endTime),
      };
    });
  }, [selectedDate, eventAssignments, personnel, functions, divisions, events, eventId, eventWorkLogs]);

  const uniqueFunctions = useMemo(() => {
    const funcs = new Set<string>();
    rawDailyPersonnel.forEach(p => funcs.add(p.functionName));
    return Array.from(funcs).sort();
  }, [rawDailyPersonnel]);

  const filteredPersonnel = useMemo(() => {
    return rawDailyPersonnel
      .filter(p => {
        const matchesSearch = (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (p.functionName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesFunction = selectedFunction === 'all' || p.functionName === selectedFunction;
        return matchesSearch && matchesFunction;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rawDailyPersonnel, searchTerm, selectedFunction]);

  React.useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedFunction, selectedDate]);

  const handleToggleAttendance = async (person: any, clickedStatus: 'present' | 'absent') => {
    if (!selectedDate) return;

    setLoadingId(person.id);
    try {
      if (person.status === clickedStatus) {
        if (person.workLog) {
          if (person.workLog.notes) {
            await updateWorkLog.mutateAsync({
              ...person.workLog,
              attendance_status: 'pending',
              check_in_time: null,
              check_out_time: null,
              hours_worked: 0,
              overtime_hours: 0,
              total_pay: 0,
              logged_by_id: user?.id,
            });
          } else {
            await deleteWorkLog.mutateAsync(person.workLog.id);
          }
        }
        toast({
          title: 'Status removido',
          description: `Presença/Falta de ${person.name} removida.`,
        });
        setLoadingId(null);
        return;
      }

      if (person.workLog) {
        const currentCheckIn = toTimeInputValue(person.workLog.check_in_time);
        const currentCheckOut = toTimeInputValue(person.workLog.check_out_time);
        const computed = computeHoursFromTimes(currentCheckIn, currentCheckOut);

        await updateWorkLog.mutateAsync({
          ...person.workLog,
          attendance_status: clickedStatus,
          check_in_time: clickedStatus === 'absent' ? null : (person.workLog.check_in_time ?? null),
          check_out_time: clickedStatus === 'absent' ? null : (person.workLog.check_out_time ?? null),
          hours_worked: clickedStatus === 'absent' ? 0 : (computed?.hoursWorked ?? (person.workLog.hours_worked ?? 8)),
          overtime_hours: clickedStatus === 'absent' ? 0 : (computed?.overtimeHours ?? (person.workLog.overtime_hours ?? 0)),
          total_pay: 0,
          logged_by_id: user?.id,
        });
      } else {
        await createWorkLog.mutateAsync({
          employee_id: person.id,
          event_id: eventId,
          work_date: selectedDate,
          attendance_status: clickedStatus,
          check_in_time: null,
          check_out_time: null,
          hours_worked: clickedStatus === 'absent' ? 0 : 8,
          overtime_hours: 0,
          total_pay: 0,
          logged_by_id: user?.id,
        });
      }

      toast({
        title: clickedStatus === 'present' ? 'Presença confirmada' : 'Falta registrada',
        description: `${person.name} - ${formatDateBR(selectedDate)}`,
        variant: clickedStatus === 'present' ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Erro ao atualizar presença:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar status de presença',
        variant: 'destructive',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const totalPages = Math.ceil(filteredPersonnel.length / ITEMS_PER_PAGE);
  const paginatedPersonnel = filteredPersonnel.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

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
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card p-3 sm:p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <label className="text-sm font-medium text-muted-foreground">Data Selecionada</label>
          <div className="flex flex-wrap gap-2 w-full">
            {uniqueWorkDays.map(date => (
              <Button
                key={date}
                variant={selectedDate === date ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDate(date)}
                className={cn('flex-shrink-0', selectedDate === date && 'shadow-md')}
              >
                <Calendar className="w-3 h-3 mr-2" />
                {date.split('-').reverse().slice(0, 2).join('/')}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto pb-2 md:pb-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 rounded-md border">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{rawDailyPersonnel.length}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou função..."
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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
              <SelectItem key={func} value={func}>
                {func}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2 sm:p-4 font-medium w-[60%] sm:w-[45%]">Profissional</th>
                  <th className="p-2 sm:p-4 font-medium hidden sm:table-cell w-[20%]">Divisão</th>
                  <th className="p-2 sm:p-4 font-medium hidden sm:table-cell text-center w-[25%]">Entrada/Saída</th>
                  <th className="p-2 sm:p-4 font-medium text-right w-[40%] sm:w-[10%] lg:w-[12%]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      Nenhum profissional encontrado.
                    </td>
                  </tr>
                ) : (
                  paginatedPersonnel.map(person => {
                    const times = getDisplayedTimes(person);
                    const computed = computeHoursFromTimes(times.checkIn, times.checkOut);
                    const timeLabel = (times.checkIn || times.checkOut) ? `${times.checkIn || '--:--'} - ${times.checkOut || '--:--'}` : person.formattedTime;
                    return (
                      <tr key={person.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="p-2 sm:p-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <button
                              type="button"
                              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              aria-label={`Ver foto de ${person.name}`}
                              onClick={() => setPhotoModalPerson(person)}
                            >
                              <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border">
                                <AvatarImage src={person.avatar} />
                                <AvatarFallback>{String(person.name || '').substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            </button>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium break-words leading-tight text-xs sm:text-sm">{person.name}</span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground break-words leading-tight">{person.functionName}</span>
                              <span className="text-[10px] text-muted-foreground sm:hidden break-words leading-tight">{person.divisionName}</span>
                              <div className="flex flex-col gap-1 mt-1 sm:hidden">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs w-full justify-start"
                                  onClick={() => openTimeModal(person)}
                                  disabled={loadingId === person.id}
                                >
                                  {timeLabel}
                                </Button>
                                {computed && computed.overtimeHours > 0 && (
                                  <div className="text-[11px] text-red-600 font-medium whitespace-nowrap">
                                    HE: {computed.overtimeHours.toFixed(2)}h
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 sm:p-4 hidden sm:table-cell text-muted-foreground">
                          <span className="break-words">{person.divisionName}</span>
                        </td>
                        <td className="p-2 sm:p-4 hidden sm:table-cell">
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="time"
                              value={times.checkIn}
                              onChange={e => handleTimeChange(person, 'checkIn', e.target.value)}
                              className="h-8 w-[96px] px-2 text-xs"
                              aria-label="Hora de chegada"
                            />
                            <Input
                              type="time"
                              value={times.checkOut}
                              onChange={e => handleTimeChange(person, 'checkOut', e.target.value)}
                              className="h-8 w-[96px] px-2 text-xs"
                              aria-label="Hora de saída"
                            />
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground font-medium text-center flex items-center justify-center gap-1">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 hidden lg:inline">Previsto:</span>
                            {person.formattedTime}
                          </div>
                          {computed && computed.overtimeHours > 0 && (
                            <div className="mt-1 text-[10px] text-destructive text-center">HE: {computed.overtimeHours.toFixed(2)}h</div>
                          )}
                        </td>
                        <td className="p-2 sm:p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 lg:gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant={person.status === 'present' ? 'default' : 'outline'}
                                    className={cn(
                                      'h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 p-0',
                                      person.status === 'present'
                                        ? 'bg-green-600 hover:bg-green-700 border-green-600'
                                        : 'hover:bg-green-50 hover:text-green-600 hover:border-green-200'
                                    )}
                                    onClick={() => handleToggleAttendance(person, 'present')}
                                    disabled={loadingId === person.id}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
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
                                    variant={person.status === 'absent' ? 'destructive' : 'outline'}
                                    className={cn(
                                      'h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 p-0',
                                      person.status === 'absent'
                                        ? 'bg-red-600 hover:bg-red-700 border-red-600'
                                        : 'hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                    )}
                                    onClick={() => handleToggleAttendance(person, 'absent')}
                                    disabled={loadingId === person.id}
                                  >
                                    <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!timeModalPerson} onOpenChange={open => { if (!open) closeTimeModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Horários</DialogTitle>
          </DialogHeader>

          {timeModalPerson && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="font-medium break-words">{timeModalPerson.name}</div>
                <div className="text-sm text-muted-foreground break-words">{timeModalPerson.functionName}</div>
                <div className="text-sm text-muted-foreground break-words">{timeModalPerson.divisionName}</div>
                <div className="text-xs text-muted-foreground">Previsto: {timeModalPerson.formattedTime}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Entrada</div>
                  <Input type="time" value={modalCheckIn} onChange={e => setModalCheckIn(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Saída</div>
                  <Input type="time" value={modalCheckOut} onChange={e => setModalCheckOut(e.target.value)} />
                </div>
              </div>

              {(() => {
                const computed = computeHoursFromTimes(modalCheckIn, modalCheckOut);
                if (!computed) {
                  return <div className="text-xs text-muted-foreground">Preencha entrada e saída para calcular as horas extras.</div>;
                }
                return (
                  <div className="rounded-md border p-3 space-y-1">
                    <div className="text-sm font-medium">Resumo</div>
                    <div className="text-xs text-muted-foreground">Trabalhadas: {computed.hoursWorked.toFixed(2)}h</div>
                    <div className={cn('text-xs font-medium', computed.overtimeHours > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                      HE: {computed.overtimeHours.toFixed(2)}h
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeTimeModal}>
                  Cancelar
                </Button>
                <Button type="button" onClick={saveTimeModal} disabled={loadingId === timeModalPerson.id}>
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={overtimeDialog.open} onOpenChange={open => setOvertimeDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Horas extras registradas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <div className="font-medium break-words">{overtimeDialog.personName}</div>
              <div className="text-xs text-muted-foreground">Trabalhadas: {overtimeDialog.hoursWorked.toFixed(2)}h</div>
            </div>
            <div className="text-xs font-medium text-destructive">HE: {overtimeDialog.overtimeHours.toFixed(2)}h</div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setOvertimeDialog(prev => ({ ...prev, open: false }))}>
                Ok
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!photoModalPerson} onOpenChange={open => { if (!open) closePhotoModal(); }}>
        <DialogContent className="w-screen h-screen max-w-none p-0 rounded-none border-0">
          {photoModalPerson && (
            <div className="relative w-full h-full bg-black">
              <button
                type="button"
                onClick={closePhotoModal}
                className="absolute top-3 right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              {photoModalPerson.avatar ? (
                <img src={photoModalPerson.avatar} alt={photoModalPerson.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <div className="text-7xl font-semibold">{String(photoModalPerson.name || '').substring(0, 2).toUpperCase()}</div>
                    <div className="mt-3 text-lg break-words px-6">{photoModalPerson.name}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
