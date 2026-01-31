import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Users, Calendar, Crown } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { AllocationForm } from './AllocationForm';
import { AllocationEditForm } from './AllocationEditForm';
import { WorkLogManager } from './WorkLogManager';
import { AllocationListView } from './AllocationListView';
import { DivisionCard } from './DivisionCard';
import { DivisionForm } from './DivisionForm';
import { AllocationSearchFilter } from './allocation/AllocationSearchFilter';
import { PersonnelForm } from '@/components/personnel/PersonnelForm';
import { Personnel } from '@/contexts/EnhancedDataContext';
import { useUrlState } from '@/hooks/useUrlState';
import { useToast } from '@/hooks/use-toast';

import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor, // Added TouchSensor
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableAllocationCard } from './DraggableAllocationCard';

import { useWorkLogsQuery } from '@/hooks/queries/useWorkLogsQuery'; // Importar hook do React Query

interface AllocationManagerProps {
  eventId: string;
}

export const AllocationManager: React.FC<AllocationManagerProps> = ({ eventId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  // Usar workLogs direto do React Query para ter atualizações em tempo real
  const { data: workLogs = [] } = useWorkLogsQuery(); 
  
  const { 
    assignments, 
    events, 
    divisions, 
    personnel, 
    // workLogs, // Remover do EnhancedData para evitar dados obsoletos
    deleteAssignment, 
    updateAssignment, 
    updateDivision 
  } = useEnhancedData();
  
  // Persist allocation form state in sessionStorage
  const allocationFormKey = `plannersystem-allocation-form-open-${eventId}`;
  const getPersistedFormState = () => {
    try {
      const saved = sessionStorage.getItem(allocationFormKey);
      return saved === 'true';
    } catch {
      return false;
    }
  };
  
  const [showAllocationForm, setShowAllocationForm] = useState(getPersistedFormState);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [assignmentToEdit, setAssignmentToEdit] = useState<any>(null);
  const [showWorkLogManager, setShowWorkLogManager] = useState(false);
  const [preselectedDivisionId, setPreselectedDivisionId] = useState<string | undefined>(undefined);
  const [divisionToEdit, setDivisionToEdit] = useState<any>(null);
  const [personnelToEdit, setPersonnelToEdit] = useState<Personnel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // DnD State
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<'division' | 'assignment' | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  // Expanded Divisions State (URL Persisted)
  const [expandedDivisionsParam, setExpandedDivisionsParam] = useUrlState('expanded', '');
  const [expandedDivisions, setExpandedDivisions] = useState<string[]>([]);
  const [hasInitializedDivisions, setHasInitializedDivisions] = useState(false);

  // Initialize expanded divisions from URL
  useEffect(() => {
    if (hasInitializedDivisions) return;
    
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      setExpandedDivisions([]);
    } else if (expandedDivisionsParam) {
      setExpandedDivisions(expandedDivisionsParam.split(','));
    } else {
      // Default: All divisions collapsed
      setExpandedDivisions([]);
    }
    setHasInitializedDivisions(true);
  }, [expandedDivisionsParam, divisions, eventId, hasInitializedDivisions]);

  // Sync state to URL
  useEffect(() => {
    if (!hasInitializedDivisions) return;
    setExpandedDivisionsParam(expandedDivisions.join(','));
  }, [expandedDivisions, setExpandedDivisionsParam, hasInitializedDivisions]);

  // Persist form open state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(allocationFormKey, showAllocationForm.toString());
    } catch (error) {
      console.error('Error saving allocation form state:', error);
    }
  }, [showAllocationForm, allocationFormKey]);

  const eventAssignments = assignments.filter(a => a.event_id === eventId);
  
  // Sort divisions by order_index if available, otherwise by creation/name
  const eventDivisions = useMemo(() => {
    return divisions
      .filter(d => d.event_id === eventId)
      .sort((a, b) => {
        if (a.order_index !== undefined && b.order_index !== undefined) {
            return a.order_index - b.order_index;
        }
        return a.name.localeCompare(b.name);
      });
  }, [divisions, eventId]);

  // Separação de divisões de Coordenação vs Outras
  const { coordDivisions, otherDivisions } = useMemo(() => {
    const coords: typeof eventDivisions = [];
    const others: typeof eventDivisions = [];
    
    eventDivisions.forEach(div => {
      const name = div.name.toLowerCase();
      if (name.includes('coord') || name.includes('direção') || name.includes('produção') || name.includes('liderança') || name.includes('gerência')) {
        coords.push(div);
      } else {
        others.push(div);
      }
    });

    return { coordDivisions: coords, otherDivisions: others };
  }, [eventDivisions]);

  const currentEvent = events.find(e => e.id === eventId);

  // Filter assignments based on search term
  const filteredAssignments = useMemo(() => {
    if (!searchTerm.trim()) {
      return eventAssignments;
    }

    const searchLower = searchTerm.toLowerCase();
    return eventAssignments.filter(assignment => {
      const person = personnel.find(p => p.id === assignment.personnel_id);
      const personName = person?.name?.toLowerCase() || '';
      const functionName = assignment.function_name?.toLowerCase() || '';
      
      return personName.includes(searchLower) || functionName.includes(searchLower);
    });
  }, [eventAssignments, searchTerm, personnel]);

  // Date Logic
  const availableDays = useMemo(() => {
    if (!currentEvent || !currentEvent.start_date || !currentEvent.end_date) {
      return [];
    }

    const dates = [];
    const [startYear, startMonth, startDay] = currentEvent.start_date.split('-').map(Number);
    const [endYear, endMonth, endDay] = currentEvent.end_date.split('-').map(Number);

    const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const year = currentDate.getUTCFullYear();
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      dates.push(dateStr);
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    
    return dates;
  }, [currentEvent]);

  const selectedAssignmentData = assignments.find(a => a.id === selectedAssignment);

  const handleLaunchHours = (assignmentId: string) => {
    setSelectedAssignment(assignmentId);
    setShowWorkLogManager(true);
  };

  const handleAddAllocation = (divisionId?: string) => {
    setPreselectedDivisionId(divisionId);
    setShowAllocationForm(true);
  };

  const handleOpenChange = (open: boolean) => {
    setShowAllocationForm(open);
    if (!open) {
      setPreselectedDivisionId(undefined);
    }
  };

  const handleEditAssignment = (assignment: any) => {
    setAssignmentToEdit(assignment);
  };

  const handleEditDivision = (division: any) => {
    setDivisionToEdit(division);
  };

  const handleEditPerson = (person: Personnel) => {
    setPersonnelToEdit(person);
  };

  const toggleDivision = (divisionId: string) => {
    setExpandedDivisions(prev => {
      if (prev.includes(divisionId)) {
        return prev.filter(id => id !== divisionId);
      } else {
        const newExpanded = [...prev, divisionId];
        // Limit to 3 expanded
        if (newExpanded.length > 3) {
          return newExpanded.slice(newExpanded.length - 3);
        }
        return newExpanded;
      }
    });
  };

  // DnD Sensors - Optimized for Mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Increased distance slightly to prevent accidental drags
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Increased delay for "press and hold" feel
        tolerance: 5, // Reduced tolerance to ensure intention
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    
    // Add haptic feedback if available
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    
    setActiveDragId(active.id as string);
    setActiveDragType(activeData?.type || null);
    
    if (activeData?.type === 'division') {
      setActiveDragItem(activeData.division);
    } else if (activeData?.type === 'assignment') {
      setActiveDragItem(activeData.assignment);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveDragId(null);
    setActiveDragType(null);
    setActiveDragItem(null);

    if (!over) return;

    // Division Reordering
    if (active.data.current?.type === 'division' && over.data.current?.type === 'division') {
      if (active.id !== over.id) {
        // Verificar se estamos reordenando dentro do grupo de Coordenação ou Outros
        const isCoordActive = coordDivisions.some(d => d.id === active.id);
        const isCoordOver = coordDivisions.some(d => d.id === over.id);
        
        const isOtherActive = otherDivisions.some(d => d.id === active.id);
        const isOtherOver = otherDivisions.some(d => d.id === over.id);

        let targetList = null;

        if (isCoordActive && isCoordOver) {
            targetList = coordDivisions;
        } else if (isOtherActive && isOtherOver) {
            targetList = otherDivisions;
        }

        if (targetList) {
            const oldIndex = targetList.findIndex(d => d.id === active.id);
            const newIndex = targetList.findIndex(d => d.id === over.id);
            
            if (oldIndex !== -1 && newIndex !== -1) {
              const newOrder = arrayMove(targetList, oldIndex, newIndex);
              
              // Recalcular índices baseados na ordem visual atual do targetList
              const currentIndices = targetList.map(d => d.order_index || 0).sort((a, b) => a - b);
              
              // Se os índices forem todos 0 ou iguais, precisamos criar uma sequência
              // Pegar o menor índice possível ou começar do 0
              let baseIndex = currentIndices[0] || 0;
              
              const updates = newOrder.map((division, idx) => ({
                  id: division.id,
                  // Garantir que a ordem seja sequencial
                  order_index: baseIndex + idx
              }));

              try {
                // Atualizar um por um para garantir
                await Promise.all(updates.map(update => updateDivision({
                    id: update.id,
                    order_index: update.order_index
                } as any)));
                
                toast({
                    title: "Ordem atualizada",
                    description: "A nova ordem foi salva."
                });
              } catch (error) {
                console.error("Failed to reorder", error);
                toast({
                    title: "Erro",
                    variant: "destructive",
                    description: "Falha ao salvar a ordem."
                });
              }
            }
        }
      }
    }

    // Assignment Moving
    if (active.data.current?.type === 'assignment') {
      const assignment = active.data.current.assignment;
      const overData = over.data.current;
      
      let newDivisionId = null;

      if (overData?.type === 'division') {
        newDivisionId = overData.division.id;
      } else if (overData?.type === 'assignment') {
        newDivisionId = overData.divisionId;
      }

      if (newDivisionId && newDivisionId !== assignment.division_id) {
        // Move to new division
        await updateAssignment({
          ...assignment,
          division_id: newDivisionId
        });
        
        // Auto expand target division
        if (!expandedDivisions.includes(newDivisionId)) {
          toggleDivision(newDivisionId);
        }
      }
    }
  };

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  const renderDivisionList = (divs: typeof eventDivisions, gridClass: string) => (
    <div className={gridClass}>
      {divs.map((division) => {
        const divisionAssignments = filteredAssignments.filter(a => a.division_id === division.id);
        return (
          <DivisionCard
            key={division.id}
            division={division}
            assignments={divisionAssignments}
            availableDays={availableDays}
            isExpanded={expandedDivisions.includes(division.id)}
            onToggle={() => toggleDivision(division.id)}
            onLaunchHours={handleLaunchHours}
            onAddAllocation={handleAddAllocation}
            onEditAssignment={handleEditAssignment}
            onEditDivision={handleEditDivision}
            onEditPerson={handleEditPerson}
          />
        );
      })}
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-semibold">Alocações de Pessoal</h3>
          <div className="w-full sm:w-auto flex justify-end">
            <Button onClick={() => handleAddAllocation()} className="hidden sm:flex">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Alocação
            </Button>
            <Button onClick={() => handleAddAllocation()} size="icon" className="sm:hidden w-12 h-12 rounded-full shadow-lg fixed bottom-32 right-4 z-50 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Search Filter - Show only if there are assignments */}
        {eventAssignments.length > 0 && (
          <AllocationSearchFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            totalCount={eventAssignments.length}
            filteredCount={filteredAssignments.length}
          />
        )}

        {availableDays.length === 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-600">
                <Calendar className="h-4 w-4" />
                <p className="text-sm">
                  Configure as datas de início e fim do evento para poder alocar pessoas.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredAssignments.length === 0 && eventAssignments.length > 0 ? (
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="Nenhuma pessoa encontrada"
            description="Tente alterar o termo de busca"
          />
        ) : eventAssignments.length === 0 ? (
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="Nenhuma alocação encontrada"
            description="Adicione pessoas a este evento para começar"
            action={{
              label: "Adicionar Primeira Alocação",
              onClick: () => handleAddAllocation()
            }}
          />
        ) : eventDivisions.length === 0 ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Alocações sem divisão</h4>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? filteredAssignments.length : eventAssignments.length} pessoa(s) {searchTerm ? 'encontrada(s)' : 'alocada(s) sem divisão específica'}
                      </p>
                    </div>
                  <Button 
                    variant="outline" 
                    onClick={() => handleAddAllocation()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Organizar em divisões
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Lista das alocações sem divisão - formato tabela responsivo */}
            <AllocationListView
              assignments={filteredAssignments}
              onLaunchHours={handleLaunchHours}
              onEditAssignment={handleEditAssignment}
              onDeleteAssignment={(assignmentId) => deleteAssignment(assignmentId)}
              onEditPerson={handleEditPerson}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Seção de Coordenação (Destaque) */}
            {coordDivisions.length > 0 && (
              <SortableContext 
                items={coordDivisions.map(d => d.id)}
                strategy={rectSortingStrategy}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary font-semibold border-b pb-2">
                    <Crown className="w-4 h-4" />
                    <h4>Coordenação & Direção</h4>
                  </div>
                  {renderDivisionList(coordDivisions, "grid grid-cols-1 md:grid-cols-2 gap-4")}
                </div>
              </SortableContext>
            )}

            {/* Demais Divisões (Grid de 3 colunas) */}
            {otherDivisions.length > 0 && (
              <SortableContext 
                items={otherDivisions.map(d => d.id)}
                strategy={rectSortingStrategy}
              >
                <div className="space-y-3">
                  {coordDivisions.length > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground font-semibold border-b pb-2">
                      <Users className="w-4 h-4" />
                      <h4>Equipes Operacionais</h4>
                    </div>
                  )}
                  {renderDivisionList(otherDivisions, "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start")}
                </div>
              </SortableContext>
            )}
          </div>
        )}

        <DragOverlay dropAnimation={dropAnimation}>
          {activeDragType === 'division' && activeDragItem ? (
             <div className="opacity-90 rotate-2 cursor-grabbing">
                <DivisionCard
                  division={activeDragItem}
                  assignments={filteredAssignments.filter(a => a.division_id === activeDragItem.id)}
                  availableDays={availableDays}
                  isExpanded={expandedDivisions.includes(activeDragItem.id)}
                  onToggle={() => {}}
                  onLaunchHours={() => {}}
                  onAddAllocation={() => {}}
                  onEditAssignment={() => {}}
                  onEditDivision={() => {}}
                  onEditPerson={() => {}}
                />
             </div>
          ) : activeDragType === 'assignment' && activeDragItem ? (
             <div className="opacity-90 rotate-2 cursor-grabbing w-[300px]">
                <DraggableAllocationCard
                  assignment={activeDragItem}
                  person={personnel.find(p => p.id === activeDragItem.personnel_id)}
                  workLogs={workLogs}
                  onLaunchHours={() => {}}
                  onEditAssignment={() => {}}
                  onDeleteAssignment={() => {}}
                  onEditPerson={() => {}}
                />
             </div>
          ) : null}
        </DragOverlay>

        <AllocationForm
          eventId={eventId}
          preselectedDivisionId={preselectedDivisionId}
          open={showAllocationForm}
          onOpenChange={handleOpenChange}
        />

        {assignmentToEdit && (
          <AllocationEditForm
            assignment={assignmentToEdit}
            availableDays={availableDays}
            open={!!assignmentToEdit}
            onOpenChange={(open) => {
              if (!open) setAssignmentToEdit(null);
            }}
          />
        )}

        <WorkLogManager
          assignment={selectedAssignmentData ? {
            ...selectedAssignmentData,
            function_name: selectedAssignmentData.function_name,
            user_id: user?.id || ''
          } : null}
          open={showWorkLogManager}
          onOpenChange={setShowWorkLogManager}
        />

        <DivisionForm
          division={divisionToEdit}
          open={!!divisionToEdit}
          onOpenChange={(open) => {
            if (!open) setDivisionToEdit(null);
          }}
        />

        {personnelToEdit && (
          <PersonnelForm
            personnel={personnelToEdit}
            onClose={() => setPersonnelToEdit(null)}
            onSuccess={() => {
              setPersonnelToEdit(null);
            }}
          />
        )}
      </div>
    </DndContext>
  );
};
