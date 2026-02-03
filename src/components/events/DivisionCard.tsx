import React, { useState } from 'react';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit2, Users, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { type Assignment, type Division, type Personnel } from '@/contexts/EnhancedDataContext';
import { useToast } from '@/hooks/use-toast';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDndContext } from '@dnd-kit/core';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useWorkLogsQuery } from '@/hooks/queries/useWorkLogsQuery';

import { DraggableAllocationCard } from './DraggableAllocationCard';
interface DivisionCardProps {
  division: Division;
  assignments: Assignment[];
  availableDays: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onLaunchHours: (assignmentId: string) => void;
  onAddAllocation: (divisionId: string) => void;
  onEditAssignment: (assignment: Assignment) => void;
  onEditDivision: (division: Division) => void;
  onEditPerson?: (person: Personnel) => void;
}

export const DivisionCard: React.FC<DivisionCardProps> = ({
  division,
  assignments,
  availableDays,
  isExpanded,
  onToggle,
  onLaunchHours,
  onAddAllocation,
  onEditAssignment,
  onEditDivision,
  onEditPerson
}) => {
  const { personnel, deleteAssignment, deleteDivision } = useEnhancedData();
  const { data: workLogs = [] } = useWorkLogsQuery();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmPermanentDivision, setConfirmPermanentDivision] = useState(false);
  const { active } = useDndContext();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({
    id: division.id,
    data: {
      type: 'division',
      division
    }
  });

  const isOverAssignment = isOver && active?.data.current?.type === 'assignment';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDeleteDivision = async () => {
    if (!confirmPermanentDivision) {
      toast({
        title: 'Confirmação necessária',
        description: 'Marque o checkbox “Entendo que esta ação é permanente”.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await deleteDivision(division.id);
      setShowDeleteDialog(false);
      setConfirmPermanentDivision(false);
      toast({
        title: "Sucesso",
        description: "Divisão excluída com sucesso!"
      });
    } catch (error) {
      console.error('Error deleting division:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir divisão",
        variant: "destructive"
      });
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("h-fit", isDragging && "z-50")}>
      <Card className={cn(
        isDragging && "shadow-xl ring-2 ring-primary/20",
        isOverAssignment && "ring-2 ring-primary bg-primary/5"
      )}>
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CardHeader className="pb-3 space-y-0">
            <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-2">
              <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                <div 
                  {...attributes} 
                  {...listeners} 
                  className="cursor-grab active:cursor-grabbing p-3 -ml-2 hover:bg-muted active:bg-primary/10 active:text-primary active:ring-2 active:ring-primary/20 rounded text-muted-foreground flex items-center justify-center min-w-[44px] min-h-[44px] touch-none select-none"
                >
                  <GripVertical className="h-5 w-5" />
                </div>
                
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-auto hover:bg-transparent">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <CardTitle className="text-xs sm:text-sm md:text-base break-words cursor-pointer leading-tight" onClick={onToggle}>
                    {division.name} 
                    <span className="ml-2 text-[10px] sm:text-xs font-normal text-muted-foreground inline-block">
                      ({assignments.length})
                    </span>
                  </CardTitle>
                </div>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onAddAllocation(division.id)}
                        className="h-8 w-8"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="sr-only">Adicionar</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Adicionar</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditDivision(division)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {division.description && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 pl-8">
                {division.description}
              </p>
            )}
          </CardHeader>
          
          <CollapsibleContent className="animate-collapsible-down">
            <CardContent className="pt-0">
              <SortableContext 
                id={division.id} 
                items={assignments.map(a => a.id)} 
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 min-h-[50px]">
                  {assignments.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground">Arraste pessoas para cá</p>
                    </div>
                  ) : (
                    assignments.map((assignment) => {
                      const person = personnel.find(p => p.id === assignment.personnel_id);
                      return (
                        <DraggableAllocationCard
                          key={assignment.id}
                          assignment={assignment}
                          person={person}
                          workLogs={workLogs}
                          onLaunchHours={onLaunchHours}
                          onEditAssignment={onEditAssignment}
                          onDeleteAssignment={deleteAssignment}
                          onEditPerson={onEditPerson}
                        />
                      );
                    })
                  )}
                </div>
              </SortableContext>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) setConfirmPermanentDivision(false); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Divisão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a divisão "{division.name}"? 
                Esta ação não pode ser desfeita e removerá todas as alocações desta divisão.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="mt-4 flex items-center gap-2">
              <Checkbox
                id={`confirm-permanent-division-${division.id}`}
                checked={confirmPermanentDivision}
                onCheckedChange={(v) => setConfirmPermanentDivision(!!v)}
              />
              <label htmlFor={`confirm-permanent-division-${division.id}`} className="text-sm leading-none select-none">
                Entendo que esta ação é permanente
              </label>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteDivision}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={!confirmPermanentDivision}
              >
                Excluir definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
};
