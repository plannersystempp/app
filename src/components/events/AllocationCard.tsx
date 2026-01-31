
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { type Assignment } from '@/contexts/EnhancedDataContext';
import { Users, Calendar, Clock, Trash2, Edit2, User } from 'lucide-react';
import { WorkLogManager } from './WorkLogManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { useTeam } from '@/contexts/TeamContext';
import { getDailyCacheRate, type AllocationData, type PersonnelData } from '@/components/payroll/payrollCalculations';
import { useWorkLogsQuery } from '@/hooks/queries/useWorkLogsQuery';
import { useAbsencesQuery } from '@/hooks/queries/useAbsencesQuery';

interface AllocationCardProps {
  assignment: Assignment;
  onEdit: (assignment: Assignment) => void;
  onDelete: (assignmentId: string) => void;
}

export const AllocationCard: React.FC<AllocationCardProps> = ({
  assignment,
  onEdit,
  onDelete
}) => {
  const { personnel, functions, divisions } = useEnhancedData();
  const { data: workLogs = [] } = useWorkLogsQuery();
  const { data: absences = [] } = useAbsencesQuery(assignment.event_id);
  const { userRole } = useTeam();
  const [workLogManagerOpen, setWorkLogManagerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  
  const person = personnel.find(p => p.id === assignment.personnel_id);
  const func = functions.find(f => f.name === assignment.function_name);
  const division = divisions.find(d => d.id === assignment.division_id);
  
  const assignmentWorkLogs = workLogs.filter(log => 
    log.employee_id === assignment.personnel_id && log.event_id === assignment.event_id
  );
  const totalHours = assignmentWorkLogs.reduce((sum, log) => sum + Number(log.hours_worked || 0), 0);
  const totalOvertimeHours = assignmentWorkLogs.reduce((sum, log) => sum + Number(log.overtime_hours || 0), 0);

  if (!person) return null;

  const assignmentFunction = functions.find(f => f.name === assignment.function_name);
  const personFunctionData = person.functions?.find(f => f.id === assignmentFunction?.id);
  const functionCache = personFunctionData?.custom_cache;
  const isFunctionCache = !!functionCache && functionCache > 0;
  
  // Calculate effective rate for display (priority: event specific > function specific > standard)
  const effectiveCacheRate = assignment.event_specific_cache || functionCache || person.event_cache || 0;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {person.photo_url ? (
              <img
                src={person.photo_url}
                alt={person.name}
                crossOrigin="anonymous"
                loading="lazy"
                className="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-zoom-in"
                onClick={() => {
                  setPreviewImageUrl(person.photo_url!);
                  setPreviewOpen(true);
                }}
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = 'none';
                  const fallback = img.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ display: person.photo_url ? 'none' : 'flex' }}
            >
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">{person.name}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="default" className="text-xs">
                  {assignment.function_name}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {person.type === 'fixo' ? 'Funcionário Fixo' : 'Freelancer'}
                </Badge>
                {assignment.event_specific_cache && assignment.event_specific_cache > 0 ? (
                  <Badge variant="default" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                    💰 Cache Específico
                  </Badge>
                ) : isFunctionCache ? (
                  <Badge variant="default" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                    ✨ Cache Função
                  </Badge>
                ) : null}
                {division && (
                  <Badge variant="secondary" className="text-xs">
                    {division.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button size="sm" variant="ghost" onClick={() => onEdit(assignment)}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(assignment.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Dias Trabalhados</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {assignment.work_days.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {assignment.work_days.length === 1 ? 'dia' : 'dias'}
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Horas Lançadas</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {totalHours}h
            </div>
            {totalOvertimeHours > 0 && (
              <div className="text-xs text-orange-600 mt-1">
                +{totalOvertimeHours}h extras
              </div>
            )}
          </div>

        </div>

        <div className="flex justify-center gap-2 my-4">
          {assignment.work_days.map((day) => {
            const hasLog = assignmentWorkLogs.some(log => log.work_date === day);
            return (
              <div 
                key={day}
                className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                  hasLog ? 'bg-green-500' : 'bg-muted-foreground/30'
                }`}
                title={new Date(day + 'T12:00:00').toLocaleDateString('pt-BR')}
              />
            );
          })}
        </div>

        {/* Financial Section for Admins */}
        {isAdmin && (
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground mb-2">Informações Financeiras (Admin):</div>
            <div className="bg-muted/30 p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cache padrão:</span>
                <span className="font-medium">{formatCurrency(person.event_cache || 0)}/dia</span>
              </div>
              
              {assignment.event_specific_cache && assignment.event_specific_cache > 0 ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-700 font-medium">Cache aplicado:</span>
                    <span className="font-semibold text-orange-700">
                      {formatCurrency(assignment.event_specific_cache)}/dia ⭐
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="font-medium text-primary">Total do evento:</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(assignment.event_specific_cache * effectiveWorkDays)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {formatCurrency(assignment.event_specific_cache)} × {effectiveWorkDays} dias
                  </div>
                </>
              ) : isFunctionCache ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-700 font-medium">Cache aplicado:</span>
                    <span className="font-semibold text-purple-700">
                      {formatCurrency(effectiveCacheRate)}/dia ✨
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="font-medium text-primary">Total do evento:</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(effectiveCacheRate * effectiveWorkDays)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {formatCurrency(effectiveCacheRate)} × {effectiveWorkDays} dias (Função)
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-medium">Total estimado:</span>
                  <span className="font-semibold">
                    {formatCurrency((person.event_cache || 0) * effectiveWorkDays)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setWorkLogManagerOpen(true)}
        >
          <Clock className="h-4 w-4 mr-2" />
          Lançar horas extras
        </Button>
      </CardContent>

      <WorkLogManager
        assignment={{
          ...assignment,
          function_name: assignment.function_name,
          team_id: ''
        }}
        open={workLogManagerOpen}
        onOpenChange={setWorkLogManagerOpen}
      />
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl p-0">
          <DialogHeader>
            <DialogTitle className="sr-only">Pré-visualização da Foto</DialogTitle>
          </DialogHeader>
          {previewImageUrl && (
            <img
              src={previewImageUrl}
              alt="Pré-visualização da foto"
              crossOrigin="anonymous"
              className="w-full h-auto object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
