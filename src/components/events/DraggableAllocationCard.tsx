import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Clock, User, GripVertical } from 'lucide-react';
import { getSimplifiedName } from '@/utils/nameUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { type Assignment, type Personnel, type WorkRecord } from '@/contexts/EnhancedDataContext';
import { cn } from '@/lib/utils';

interface DraggableAllocationCardProps {
  assignment: Assignment;
  person: Personnel | undefined;
  workLogs: WorkRecord[];
  onLaunchHours: (assignmentId: string) => void;
  onEditAssignment: (assignment: Assignment) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onEditPerson?: (person: Personnel) => void;
}

export const DraggableAllocationCard: React.FC<DraggableAllocationCardProps> = ({
  assignment,
  person,
  workLogs,
  onLaunchHours,
  onEditAssignment,
  onDeleteAssignment,
  onEditPerson
}) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [confirmPermanent, setConfirmPermanent] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: assignment.id,
    data: {
      type: 'assignment',
      assignment,
      divisionId: assignment.division_id
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignmentWorkLogs = workLogs.filter(log => 
    log.employee_id === assignment.personnel_id && log.event_id === assignment.event_id
  );
  const totalOvertimeHours = assignmentWorkLogs.reduce((sum, log) => sum + Number(log.overtime_hours || 0), 0);

  const pickBestDailyLog = (day: string) => {
    const sameDay = assignmentWorkLogs.filter(l => l.work_date === day);
    if (sameDay.length === 0) return null;

    const score = (status?: string) => {
      if (status === 'absent') return 3;
      if (status === 'present') return 2;
      if (status === 'pending') return 1;
      return 0;
    };

    return [...sameDay].sort((a, b) => {
      const byStatus = score(b.attendance_status) - score(a.attendance_status);
      if (byStatus !== 0) return byStatus;
      const byCreated = String(b.created_at || '').localeCompare(String(a.created_at || ''));
      if (byCreated !== 0) return byCreated;
      return String(b.id || '').localeCompare(String(a.id || ''));
    })[0];
  };

  // Stop propagation for interactive elements to prevent drag start
  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "p-3 bg-muted/50 rounded-lg space-y-3 group relative",
          isDragging && "z-50 shadow-xl ring-2 ring-primary/20 bg-muted/80"
        )}
      >
        {/* Header com nome e função */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Drag Handle */}
            <div 
              {...attributes} 
              {...listeners}
              style={{ touchAction: 'none' }}
              className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground p-3 -ml-3 active:bg-primary/10 active:text-primary active:ring-2 active:ring-primary/20 rounded-md touch-none flex items-center justify-center min-w-[44px] min-h-[44px] select-none"
            >
              <GripVertical className="w-5 h-5" />
            </div>

            {person?.photo_url ? (
              <img
                src={person.photo_url}
                alt={person.name}
                crossOrigin="anonymous"
                loading="lazy"
                className="w-7 h-7 sm:w-6 sm:h-6 rounded-full object-cover flex-shrink-0 cursor-zoom-in"
                onClick={(e) => handleAction(e, () => {
                  setPreviewImageUrl(person.photo_url!);
                  setPreviewOpen(true);
                })}
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = 'none';
                  const fallback = img.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="w-7 h-7 sm:w-6 sm:h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ display: person?.photo_url ? 'none' : 'flex' }}
            >
              <User className="w-4 h-4 sm:w-3 sm:h-3 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              {onEditPerson ? (
                <button
                  type="button"
                  className="font-medium text-xs sm:text-sm break-words hover:underline text-left cursor-pointer leading-tight"
                  onClick={(e) => handleAction(e, () => {
                    if (person) onEditPerson(person);
                  })}
                >
                  {person ? getSimplifiedName(person.name) : 'Pessoa não encontrada'}
                </button>
              ) : (
                <div className="font-medium text-xs sm:text-sm break-words text-left leading-tight">
                  {person ? getSimplifiedName(person.name) : 'Pessoa não encontrada'}
                </div>
              )}
              <div className="text-[10px] sm:text-xs text-muted-foreground break-words leading-tight mt-0.5">
                {assignment.function_name}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleAction(e, () => onEditAssignment(assignment))}
              className="h-8 w-8 sm:h-6 sm:w-6 p-0"
            >
              <Edit2 className="w-4 h-4 sm:w-3 sm:h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleAction(e, () => setDeleteConfirmation(assignment.id))}
              className="h-8 w-8 sm:h-6 sm:w-6 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 sm:w-3 sm:h-3" />
            </Button>
          </div>
        </div>

        {/* Informações da alocação */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="text-center bg-background/50 rounded-md p-2">
            <div className="font-medium text-primary text-sm sm:text-base">{assignment.work_days?.length || 0}</div>
            <div className="text-muted-foreground text-[10px] sm:text-xs">
              {(assignment.work_days?.length || 0) === 1 ? 'dia' : 'dias'}
            </div>
          </div>
          <div className="text-center bg-background/50 rounded-md p-2">
            <div className="font-medium text-orange-600 text-sm sm:text-base">{totalOvertimeHours}h</div>
            <div className="text-muted-foreground text-[10px] sm:text-xs">extras</div>
          </div>
        </div>

        {/* Indicadores de Presença */}
        <div className="flex justify-center gap-2 my-2">
          {(assignment.work_days || []).map((day) => {
            const dayLog = pickBestDailyLog(day);
            const status = dayLog?.attendance_status;
            return (
              <div 
                key={day}
                className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                  status === 'absent' ? 'bg-red-500' : status === 'present' ? 'bg-green-500' : 'bg-muted-foreground/30'
                }`}
                title={`${new Date(day + 'T12:00:00').toLocaleDateString('pt-BR')}${status === 'absent' ? ' (Falta)' : ''}`}
              />
            );
          })}
        </div>

        {/* Botão de lançar horas - Mobile optimized */}
        <div className="flex justify-center pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => handleAction(e, () => onLaunchHours(assignment.id))}
            className="text-xs h-8 sm:h-6 px-3 sm:px-2 min-h-[44px] sm:min-h-0 w-full"
          >
            <Clock className="w-4 h-4 sm:w-3 sm:h-3 mr-1" />
            Lançar horas extras
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmation} onOpenChange={(open) => { if (!open) { setDeleteConfirmation(null); setConfirmPermanent(false); } }}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir permanentemente esta alocação. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 flex items-center gap-2">
            <Checkbox
              id={`confirm-permanent-assignment-${assignment.id}`}
              checked={confirmPermanent}
              onCheckedChange={(v) => setConfirmPermanent(!!v)}
            />
            <label htmlFor={`confirm-permanent-assignment-${assignment.id}`} className="text-sm leading-none select-none">
              Entendo que esta ação é permanente
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.stopPropagation();
                if (deleteConfirmation) {
                  if (!confirmPermanent) return;
                  onDeleteAssignment(deleteConfirmation);
                  setDeleteConfirmation(null);
                  setConfirmPermanent(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!confirmPermanent}
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl p-0" onClick={(e) => e.stopPropagation()}>
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
    </>
  );
};
