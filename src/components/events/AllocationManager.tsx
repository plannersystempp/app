
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Users, Calendar, Clock, Trash2, User, Edit2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { getSimplifiedName } from '@/utils/nameUtils';
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

interface AllocationManagerProps {
  eventId: string;
}

export const AllocationManager: React.FC<AllocationManagerProps> = ({ eventId }) => {
  const { user } = useAuth();
  const { assignments, events, divisions, personnel, functions, workLogs, deleteAssignment } = useEnhancedData();
  
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

  // Persist form open state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(allocationFormKey, showAllocationForm.toString());
    } catch (error) {
      console.error('Error saving allocation form state:', error);
    }
  }, [showAllocationForm, allocationFormKey]);

  const eventAssignments = assignments.filter(a => a.event_id === eventId);
  const eventDivisions = divisions.filter(d => d.event_id === eventId);
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

  // CORREÇÃO: Lógica centralizada de datas com UTC - fonte única da verdade
  const availableDays = useMemo(() => {
    if (!currentEvent || !currentEvent.start_date || !currentEvent.end_date) {
      return [];
    }

    const dates = [];
    
    // CORREÇÃO: Decompomos a data e usamos Date.UTC para criar um objeto de data
    // que é agnóstico ao fuso horário, representando sempre a meia-noite em UTC.
    const [startYear, startMonth, startDay] = currentEvent.start_date.split('-').map(Number);
    const [endYear, endMonth, endDay] = currentEvent.end_date.split('-').map(Number);

    const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));

    // Cria uma cópia da data de início para iterar sobre ela com segurança
    let currentDate = new Date(startDate);

    // Itera do início ao fim, incluindo a data final
    while (currentDate <= endDate) {
      // Format as YYYY-MM-DD using UTC methods
      const year = currentDate.getUTCFullYear();
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      dates.push(dateStr);
      
      // Adiciona um dia (em UTC) à data atual para a próxima iteração
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold">Alocações de Pessoal</h3>
        <Button onClick={() => handleAddAllocation()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Alocação
        </Button>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {eventDivisions.map((division) => {
            const divisionAssignments = filteredAssignments.filter(a => a.division_id === division.id);
            return (
              <DivisionCard
                key={division.id}
                division={division}
                assignments={divisionAssignments}
                availableDays={availableDays}
                onLaunchHours={handleLaunchHours}
                onAddAllocation={handleAddAllocation}
                onEditAssignment={handleEditAssignment}
                onEditDivision={handleEditDivision}
                onEditPerson={handleEditPerson}
              />
            );
          })}
        </div>
      )}

      <AllocationForm
        eventId={eventId}
        preselectedDivisionId={preselectedDivisionId}
        open={showAllocationForm}
        onOpenChange={handleOpenChange}
      />

      {/* CORREÇÃO: Modal de edição usando as datas centralizadas */}
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
  );
};
