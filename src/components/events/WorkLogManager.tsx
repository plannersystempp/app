import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { useWorkLogsQuery, useCreateWorkLogMutation, useUpdateWorkLogMutation, useDeleteWorkLogMutation } from '@/hooks/queries/useWorkLogsQuery';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { parseHoursInput, formatHours, formatHoursInputLive, pushLeftAddDigit, pushLeftBackspace } from '@/utils/formatters';
import { normalizeWorkDays } from '@/utils/workDays';
import { Clock, Edit2, Save, X, Trash2, RotateCcw, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { type Assignment, type WorkRecord } from '@/contexts/EnhancedDataContext';

interface AssignmentWithUser extends Assignment {
  user_id?: string;
}

interface WorkLogManagerProps {
  assignment: AssignmentWithUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkLogManager: React.FC<WorkLogManagerProps> = ({
  assignment,
  open,
  onOpenChange
}) => {
  const { user } = useAuth();
  const { data: globalWorkLogs = [] } = useWorkLogsQuery();
  const createWorkLog = useCreateWorkLogMutation();
  const updateWorkLog = useUpdateWorkLogMutation();
  const deleteWorkLog = useDeleteWorkLogMutation();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const [workLogs, setWorkLogs] = useState<WorkRecord[]>([]);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [overtimeHoursText, setOvertimeHoursText] = useState<{[key:string]: string}>({});
  const [overtimeHours, setOvertimeHours] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [loggerNames, setLoggerNames] = useState<Record<string, string>>({});

  const normalizedWorkDays = normalizeWorkDays(assignment?.work_days);

  // Carregar registros de trabalho existentes
  useEffect(() => {
    if (!assignment || !open) return;

    // Filtrar work logs globais para este funcionÃ¡rio e evento
    const filteredLogs = globalWorkLogs.filter(log => 
      log.employee_id === assignment.personnel_id && 
      log.event_id === assignment.event_id
    );

    setWorkLogs(filteredLogs);

    const ids = Array.from(new Set(filteredLogs.map(l => l.logged_by_id).filter(Boolean) as string[]));
    if (ids.length > 0) {
      supabase
        .from('user_profiles')
        .select('user_id,name')
        .in('user_id', ids)
        .then(({ data }) => {
          const map: Record<string, string> = {};
          (data || []).forEach((u: any) => { map[u.user_id] = u.name || ''; });
          setLoggerNames(map);
        });
    } else {
      setLoggerNames({});
    }
    
    // Inicializar estado das horas extras
    const hoursMap: { [key: string]: number } = {};
    filteredLogs.forEach(log => {
      hoursMap[log.work_date || ''] = log.overtime_hours || 0;
    });
    setOvertimeHours(hoursMap);
  }, [assignment, open, globalWorkLogs]);

  const handleSaveOvertimeHours = async (date: string) => {
    if (!assignment || !user) return;

    const hours = parseHoursInput(overtimeHoursText[date] ?? String(overtimeHours[date] ?? '')) || 0;

    // ValidaÃ§Ã£o bÃ¡sica
    if (hours < 0 || hours > 12) {
      toast({
        title: "Erro",
        description: "Horas extras inválidas. Informe entre 0:00 e 12:00",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      console.log('Salvando horas extras:', { 
        personnel_id: assignment.personnel_id, 
        event_id: assignment.event_id, 
        date, 
        hours 
      });

      // Verificar se já existe um registro para esta data
      const existingLog = workLogs.find(log => log.work_date === date);

      if (existingLog) {
        // Atualizar registro existente
        await updateWorkLog.mutateAsync({ 
          ...existingLog,
          overtime_hours: hours,
          total_pay: 0,
          logged_by_id: user.id,
        });
        console.log('Registro atualizado com sucesso');
      } else {
        // Criar novo registro
        await createWorkLog.mutateAsync({
          employee_id: assignment.personnel_id,
          event_id: assignment.event_id,
          work_date: date,
          overtime_hours: hours,
          hours_worked: 8,
          total_pay: 0,
          logged_by_id: user.id,
        });
        console.log('Novo registro criado com sucesso');
      }

      setEditingDate(null);
      
      toast({
        title: "Sucesso",
        description: `${formatHours(hours)} extras salvas para ${new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}`,
      });
    } catch (error) {
      console.error('Erro ao salvar horas extras:', error);
      const message = error instanceof Error ? error.message : "Falha ao salvar horas extras. Tente novamente.";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  

  const handleDeleteRecord = async (date: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro de horas?')) {
      return;
    }

    try {
      setLoading(true);
      const existingLog = workLogs.find(log => log.work_date === date);
      
      if (existingLog) {
        await deleteWorkLog.mutateAsync(existingLog.id);

        setOvertimeHours(prev => {
          const newHours = { ...prev };
          delete newHours[date];
          return newHours;
        });

        toast({
          title: "Sucesso",
          description: "Registro de horas excluído com sucesso",
        });
      }
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir registro",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAbsent = async (date: string) => {
    if (!assignment || !activeTeam) return;
    
    if (!window.confirm(`Tem certeza que deseja marcar falta para ${new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}?`)) {
      return;
    }
    
    try {
      setLoading(true);

      const existingLog = workLogs.find(log => log.work_date === date);

      const payload = {
        employee_id: assignment.personnel_id,
        event_id: assignment.event_id,
        work_date: date,
        attendance_status: 'absent' as const,
        check_in_time: null,
        check_out_time: null,
        hours_worked: 0,
        overtime_hours: 0,
        total_pay: 0,
        logged_by_id: user?.id,
        notes: existingLog?.notes ?? null,
      };

      if (existingLog) {
        await updateWorkLog.mutateAsync({
          ...existingLog,
          ...payload,
        });
      } else {
        await createWorkLog.mutateAsync(payload);
      }

      setOvertimeHours(prev => {
        const next = { ...prev };
        delete next[date];
        return next;
      });

      toast({
        title: "Sucesso",
        description: `Falta registrada para ${new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}`,
      });
    } catch (error: any) {
      console.error('Error marking absence:', error);
      const errorMessage = error?.message || error?.toString() || "Falha ao registrar falta";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevertAbsence = async (date: string) => {
    if (!assignment) return;
    
    if (!window.confirm(`Tem certeza que deseja reverter a falta de ${new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}?`)) {
      return;
    }
    
    try {
      setLoading(true);

      const existingLog = workLogs.find(log => log.work_date === date);
      if (!existingLog || existingLog.attendance_status !== 'absent') return;

      const hasAnyTime = Boolean(existingLog.check_in_time || existingLog.check_out_time);
      const hasAnyHours = Boolean((existingLog.hours_worked || 0) > 0 || (existingLog.overtime_hours || 0) > 0);

      if (existingLog.notes || hasAnyTime || hasAnyHours) {
        await updateWorkLog.mutateAsync({
          ...existingLog,
          attendance_status: 'pending',
          check_in_time: null,
          check_out_time: null,
          hours_worked: 0,
          overtime_hours: 0,
          total_pay: 0,
          logged_by_id: user?.id,
        });
      } else {
        await deleteWorkLog.mutateAsync(existingLog.id);
      }

      toast({
        title: 'Sucesso',
        description: `Falta revertida para ${new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}`,
      });
    } catch (error: any) {
      console.error('Error reverting absence:', error);
      const errorMessage = error?.message || error?.toString() || "Falha ao reverter falta";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!assignment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-5xl lg:max-w-6xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <div className="pb-4 sm:pb-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-xl">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
              Gestão de Horas Extras
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Informações da Alocação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs sm:text-sm">Função:</Label>
                  <p className="font-medium text-sm sm:text-base">{assignment.function_name || 'Função não definida'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs sm:text-sm">Dias de Trabalho:</Label>
                  <p className="font-medium text-sm sm:text-base">{assignment.work_days?.length || 0} dias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Registro de Horas Extras por Data</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Clique em "Adicionar" ou "Editar" para registrar as horas extras trabalhadas em cada dia.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 sm:space-y-3">
                 {normalizedWorkDays.map((date) => {
                   const existingLog = workLogs.find(log => log.work_date === date);
                   const currentHours = overtimeHours[date] || existingLog?.overtime_hours || 0;
                   const isEditing = editingDate === date;
                   const hasAbsence = existingLog?.attendance_status === 'absent';

                   return (
                      <div key={date} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg transition-colors gap-3 sm:gap-3 min-w-0 ${isEditing ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                       <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                         <div className="text-sm font-medium truncate min-w-0">
                           {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
                             weekday: 'short',
                             day: '2-digit',
                             month: '2-digit',
                             year: 'numeric'
                           })}
                         </div>
                         <div className="flex flex-wrap gap-1 sm:gap-2">
                           {hasAbsence && (
                             <Badge variant="destructive" className="text-xs">
                               Falta
                             </Badge>
                           )}
                           {!hasAbsence && existingLog && existingLog.overtime_hours != null && Number(existingLog.overtime_hours) > 0 && (
                             <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                               Registrado
                             </Badge>
                           )}
                           {!hasAbsence && existingLog && existingLog.overtime_hours != null && Number(existingLog.overtime_hours) > 0 && (
                             <span className="text-xs text-muted-foreground">
                               por {loggerNames[existingLog.logged_by_id || ''] || (existingLog.logged_by_id === user?.id ? 'você' : 'usuário')}
                             </span>
                           )}
                           {!hasAbsence && !existingLog && currentHours > 0 && (
                             <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                               Pendente
                             </Badge>
                           )}
                         </div>
                       </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0 sm:ml-4">
                         {isEditing ? (
                          <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
                            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded flex-1 sm:flex-none">
                              <Label className="text-xs whitespace-nowrap">Horas extras</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={overtimeHoursText[date] ?? formatHours(currentHours)}
                                onKeyDown={(e) => {
                                  const prevVal = overtimeHoursText[date] ?? formatHours(currentHours);
                                  // Permitir navegação
                                  if (["ArrowLeft","ArrowRight","Tab"].includes(e.key)) return;
                                  // Digitando números: push-left
                                  if (/^\d$/.test(e.key)) {
                                    e.preventDefault();
                                    const masked = pushLeftAddDigit(prevVal, e.key);
                                    setOvertimeHoursText(prev => ({ ...prev, [date]: masked }));
                                    // Mantém cursor no fim
                                    const el = e.target as HTMLInputElement;
                                    requestAnimationFrame(() => el.setSelectionRange(masked.length, masked.length));
                                    return;
                                  }
                                  // Backspace: remove último dígito
                                  if (e.key === 'Backspace') {
                                    e.preventDefault();
                                    const masked = pushLeftBackspace(prevVal);
                                    setOvertimeHoursText(prev => ({ ...prev, [date]: masked }));
                                    const el = e.target as HTMLInputElement;
                                    requestAnimationFrame(() => el.setSelectionRange(masked.length, masked.length));
                                    return;
                                  }
                                  // Bloquear outros caracteres
                                  if (!['Enter','Escape'].includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => {
                                  // Suporte a colar texto ou mudar via IME
                                  const masked = formatHoursInputLive(e.target.value);
                                  setOvertimeHoursText(prev => ({ ...prev, [date]: masked }));
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const text = e.clipboardData.getData('text') || '';
                                  const masked = formatHoursInputLive(text);
                                  setOvertimeHoursText(prev => ({ ...prev, [date]: masked }));
                                }}
                                className="w-20 sm:w-24 h-8 text-center"
                                placeholder="Ex: 02:00"
                                autoFocus
                              />
                            </div>
                            <div className="flex gap-1 ml-auto">
                               <Button
                                 size="sm"
                                 onClick={() => handleSaveOvertimeHours(date)}
                                 disabled={loading}
                                 className="h-8 px-2 sm:px-3 min-h-[44px] sm:min-h-[auto]"
                               >
                                 <Save className="w-3 h-3 sm:mr-1" />
                                 <span className="hidden sm:inline">Salvar</span>
                               </Button>
                               <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => {
                                   setEditingDate(null);
                                   setOvertimeHoursText(prev => ({...prev, [date]: ''}));
                                   // Restaurar valor original
                                   if (existingLog) {
                                     setOvertimeHours(prev => ({
                                       ...prev,
                                       [date]: existingLog.overtime_hours || 0
                                     }));
                                   }
                                 }}
                                 className="h-8 px-2 sm:px-3 min-h-[44px] sm:min-h-[auto]"
                               >
                                <X className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">Cancelar</span>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                          <div className="text-sm font-medium whitespace-nowrap">
                            <span className={currentHours > 0 ? "text-orange-600 font-semibold" : "text-muted-foreground"}>
                              {formatHours(currentHours)} extras
                            </span>
                          </div>
                              <div className="flex gap-1 flex-wrap sm:flex-nowrap">
                                {hasAbsence ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRevertAbsence(date)}
                                    className="h-8 px-2 sm:px-3 text-orange-600 hover:text-orange-700 hover:bg-orange-50 min-h-[44px] sm:min-h-[auto]"
                                    title="Reverter Falta"
                                    disabled={loading}
                                  >
                                    <RotateCcw className="w-3 h-3 sm:mr-1" />
                                    <span className="hidden sm:inline">Reverter</span>
                                  </Button>
                                ) : (
                                  <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingDate(date);
                                          setOvertimeHoursText(prev => ({
                                            ...prev,
                                            [date]: formatHours(currentHours)
                                          }));
                                        }}
                                        title="Editar horas extras"
                                        className="h-8 px-2 sm:px-3 min-h-[44px] sm:min-h-[auto]"
                                      >
                                      <Edit2 className="w-3 h-3 sm:mr-1" />
                                      <span className="hidden sm:inline">{currentHours > 0 ? 'Editar' : 'Adicionar'}</span>
                                    </Button>
                                    
                                    {existingLog && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteRecord(date)}
                                        className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Excluir registro completo"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleMarkAbsent(date)}
                                        className="h-8 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 min-h-[44px] sm:min-h-[auto]"
                                        title="Lançar Falta"
                                      >
                                      <UserX className="w-3 h-3 sm:mr-1" />
                                      <span className="hidden sm:inline">Falta</span>
                                    </Button>
                                  </>
                                )}
                              </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {assignment.work_days?.length || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Dias de Trabalho</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {workLogs.reduce((sum, log) => sum + (log.overtime_hours || 0), 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Horas Extras Salvas</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">
                    {workLogs.length}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Registros Salvos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

