
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonnelSelector } from './allocation/PersonnelSelector';
import { MultiPersonnelSelector } from './allocation/MultiPersonnelSelector';
import { generateDateArray } from '@/utils/dateUtils';
import { DivisionSelector } from './allocation/DivisionSelector';
import { WorkDaysSelector } from './allocation/WorkDaysSelector';
import { useAllocationForm } from './allocation/useAllocationForm';
import { useTeam } from '@/contexts/TeamContext';
import { useCreateAllocationMutation } from '@/hooks/queries/useAllocationsQuery';
import { useCreateDivisionMutation } from '@/hooks/queries/useDivisionsQuery';
import { useEventsQuery } from '@/hooks/queries/useEventsQuery';
import { formatCurrency } from '@/utils/formatters';
import { useAllocationFormPersistence } from './allocation/useAllocationFormPersistence';
import { useToast } from '@/hooks/use-toast';
import { type SelectedPerson } from '@/hooks/useMultipleSelection';
import { usePersonnelQuery } from '@/hooks/queries/usePersonnelQuery';
import { usePersonnelRealtime } from '@/hooks/queries/usePersonnelRealtime';
import { useFunctionsQuery } from '@/hooks/queries/useFunctionsQuery';
import { useAllocationsQuery } from '@/hooks/queries/useAllocationsQuery';
import { useIsMobile } from '@/hooks/use-mobile';
import { getDailyCacheRate } from '@/components/payroll/payrollCalculations';

interface AllocationFormProps {
  eventId: string;
  preselectedDivisionId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AllocationForm: React.FC<AllocationFormProps> = ({
  eventId,
  preselectedDivisionId,
  open,
  onOpenChange
}) => {
  const { data: personnel = [] } = usePersonnelQuery();
  const { data: events = [] } = useEventsQuery();
  const { data: functions = [] } = useFunctionsQuery();
  const { data: assignments = [] } = useAllocationsQuery();
  const createAllocation = useCreateAllocationMutation();
  const createDivision = useCreateDivisionMutation();
  usePersonnelRealtime();
  const { userRole } = useTeam();
  const { toast } = useToast();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isMobile = useIsMobile();
  
  // Block Home/End keyboard shortcuts when modal is open
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open]);
  
  // Get event details for work days calculation
  const event = events.find(e => e.id === eventId);
  const availableDays = event ? generateDateArray(event.start_date, event.end_date) : [];
  
  const {
    selectedPersonnel,
    setSelectedPersonnel,
    selectedFunction,
    setSelectedFunction,
    selectedDays,
    setSelectedDays,
    eventSpecificCache,
    setEventSpecificCache,
    divisionMode,
    setDivisionMode,
    selectedDivisionId,
    setSelectedDivisionId,
    newDivisionName,
    setNewDivisionName,
    loading,
    eventDivisions,
    handleSubmit,
    isFormValid
  } = useAllocationForm({
    eventId,
    preselectedDivisionId,
    open,
    onOpenChange
  });
  
  // Selection mode state
  const [selectionMode, setSelectionMode] = useState<'individual' | 'multiple'>('individual');
  const [multipleSelection, setMultipleSelection] = useState<SelectedPerson[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [totalEventValue, setTotalEventValue] = useState(0);

  // Add persistence for form state
  const { clearPersistedState } = useAllocationFormPersistence(
    eventId,
    {
      selectedPersonnel,
      selectedFunction,
      selectedDays,
      eventSpecificCache,
      divisionMode,
      selectedDivisionId,
      newDivisionName
    },
    (newState) => {
      if (newState.selectedPersonnel !== undefined) setSelectedPersonnel(newState.selectedPersonnel);
      if (newState.selectedFunction !== undefined) setSelectedFunction(newState.selectedFunction);
      if (newState.selectedDays !== undefined) setSelectedDays(newState.selectedDays);
      if (newState.eventSpecificCache !== undefined) setEventSpecificCache(newState.eventSpecificCache);
      if (newState.divisionMode !== undefined) setDivisionMode(newState.divisionMode);
      if (newState.selectedDivisionId !== undefined) setSelectedDivisionId(newState.selectedDivisionId);
      if (newState.newDivisionName !== undefined) setNewDivisionName(newState.newDivisionName);
    },
    open,
    preselectedDivisionId ? ['selectedDivisionId'] : undefined
  );

  const handleFormSubmit = async () => {
    setFormLoading(true);
    
    try {
      if (selectionMode === 'individual') {
        // Individual validation
        if (!selectedPersonnel || !selectedFunction || selectedDays.length === 0) {
          toast({
            title: "Campos obrigatórios",
            description: "Preencha todos os campos obrigatórios",
            variant: "destructive"
          });
          return;
        }

        // Check if person is already allocated to this event with the same function
        const existingAllocation = assignments.find(a => 
          a.event_id === eventId && 
          a.personnel_id === selectedPersonnel &&
          a.function_name === selectedFunction
        );
        
        if (existingAllocation) {
          toast({
            title: "Função já alocada",
            description: "Esta pessoa já está alocada com esta função neste evento. Escolha uma função diferente.",
            variant: "destructive"
          });
          return;
        }

        if (divisionMode === 'existing' && !selectedDivisionId) {
          toast({
            title: "Campos obrigatórios",
            description: "Selecione uma divisão",
            variant: "destructive"
          });
          return;
        }
        
        if (divisionMode === 'new' && !newDivisionName.trim()) {
          toast({
            title: "Campos obrigatórios",
            description: "Digite o nome da nova divisão",
            variant: "destructive"
          });
          return;
        }

        await handleSubmit();
      } else {
        // Multiple selection validation
        if (multipleSelection.length === 0) {
          toast({
            title: "Nenhuma pessoa selecionada",
            description: "Selecione pelo menos uma pessoa para alocar",
            variant: "destructive"
          });
          return;
        }

        // Check for people already allocated to this event with the same function
        const alreadyAllocated = multipleSelection.filter(sp => 
          assignments.some(a => a.event_id === eventId && a.personnel_id === sp.personnel.id && a.function_name === sp.selectedFunction)
        );
        
        if (alreadyAllocated.length > 0) {
          const names = alreadyAllocated.map(sp => `${sp.personnel.name} (${sp.selectedFunction})`).join(', ');
          toast({
            title: "Funções já alocadas",
            description: `As seguintes pessoas já estão alocadas com essas funções neste evento: ${names}`,
            variant: "destructive"
          });
          return;
        }

        const invalidSelections = multipleSelection.filter(sp => !sp.selectedFunction);
        if (invalidSelections.length > 0) {
          toast({
            title: "Função não selecionada",
            description: `Selecione a função para ${invalidSelections.length} pessoa(s)`,
            variant: "destructive"
          });
          return;
        }

        if (selectedDays.length === 0) {
          toast({
            title: "Campos obrigatórios",
            description: "Selecione pelo menos um dia de trabalho",
            variant: "destructive"
          });
          return;
        }

        if (divisionMode === 'existing' && !selectedDivisionId) {
          toast({
            title: "Campos obrigatórios",
            description: "Selecione uma divisão",
            variant: "destructive"
          });
          return;
        }
        
        if (divisionMode === 'new' && !newDivisionName.trim()) {
          toast({
            title: "Campos obrigatórios",
            description: "Digite o nome da nova divisão",
            variant: "destructive"
          });
          return;
        }

        // Handle multiple allocations
        let finalDivisionId = selectedDivisionId;

        // Create new division if needed
        if (divisionMode === 'new' && newDivisionName.trim()) {
          const newDivision = await createDivision.mutateAsync({
            event_id: eventId,
            name: newDivisionName.trim(),
            description: ''
          });

          finalDivisionId = newDivision.id;
        }

        // Create assignments for all selected personnel
        const promises = multipleSelection.map(selectedPerson => 
          createAllocation.mutateAsync({
            event_id: eventId,
            personnel_id: selectedPerson.personnel.id,
            division_id: finalDivisionId,
            function_name: selectedPerson.selectedFunction,
            work_days: selectedDays,
            ...(eventSpecificCache > 0 && { event_specific_cache: eventSpecificCache })
          })
        );

        await Promise.all(promises);

        toast({
          title: "Sucesso!",
          description: `${multipleSelection.length} pessoa(s) alocada(s) com sucesso!`
        });

        onOpenChange(false);
        setMultipleSelection([]);
        setSelectionMode('individual');
      }
      
      clearPersistedState();
    } catch (error) {
      console.error('Error creating allocation:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar alocação",
        variant: "destructive"
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancel = () => {
    clearPersistedState();
    onOpenChange(false);
  };

  // Handle total event value change
  const handleTotalEventValueChange = (value: number) => {
    setTotalEventValue(value);
    if (selectedDays.length > 0) {
      setEventSpecificCache(value / selectedDays.length);
    }
  };

  // Handle daily cache change
  const handleDailyCacheChange = (value: number) => {
    setEventSpecificCache(value);
    setTotalEventValue(value * selectedDays.length);
  };

  // Update total when selected days change
  useEffect(() => {
    if (eventSpecificCache > 0 && selectedDays.length > 0) {
      setTotalEventValue(eventSpecificCache * selectedDays.length);
    }
  }, [selectedDays.length, eventSpecificCache]);

  return (
    <Dialog 
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          clearPersistedState();
          setMultipleSelection([]);
          setSelectionMode('individual');
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className={`${isMobile ? 'top-0 left-0 translate-x-0 translate-y-0 w-screen h-[92vh] max-w-none rounded-none px-2 sm:px-3 border-0' : 'max-w-5xl md:max-w-6xl'} max-h-[92vh] overflow-y-auto overflow-x-hidden`} aria-modal="true" data-modal="true">
        <DialogHeader className="pb-6">
          <DialogTitle>Nova Alocação</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Selection Mode Tabs */}
          <Tabs value={selectionMode} onValueChange={(value) => setSelectionMode(value as 'individual' | 'multiple')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual" className="text-sm">Individual</TabsTrigger>
              <TabsTrigger value="multiple" className="text-sm">Múltipla Seleção</TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="space-y-6 mt-6">
              <PersonnelSelector
                personnel={personnel}
                functions={functions}
                selectedPersonnel={selectedPersonnel}
                selectedFunction={selectedFunction}
                onPersonnelChange={setSelectedPersonnel}
                onFunctionChange={setSelectedFunction}
              />
            </TabsContent>

            <TabsContent value="multiple" className="space-y-6 mt-6">
              <MultiPersonnelSelector
                personnel={personnel}
                functions={functions}
                value={multipleSelection}
                onChange={setMultipleSelection}
              />
            </TabsContent>
          </Tabs>

          <DivisionSelector
            eventDivisions={eventDivisions}
            divisionMode={divisionMode}
            selectedDivisionId={selectedDivisionId}
            newDivisionName={newDivisionName}
            onDivisionModeChange={setDivisionMode}
            onSelectedDivisionChange={setSelectedDivisionId}
            onNewDivisionNameChange={setNewDivisionName}
          />

          <WorkDaysSelector
            availableDays={availableDays}
            selectedDays={selectedDays}
            onDayToggle={(day, checked) => {
              if (checked) {
                setSelectedDays([...selectedDays, day]);
              } else {
                setSelectedDays(selectedDays.filter(d => d !== day));
              }
            }}
            onSelectAllDays={() => {
              if (selectedDays.length === availableDays.length) {
                setSelectedDays([]);
              } else {
                setSelectedDays([...availableDays]);
              }
            }}
          />

          {isAdmin && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Label className="font-semibold">💰 Cache Específico para este Evento</Label>
              </div>
              
              {/* Show default rate for comparison */}
              {selectionMode === 'individual' && selectedPersonnel && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Cache base: </span>
                  {(() => {
                    const person = personnel.find(p => p.id === selectedPersonnel);
                    if (!person) return null;
                    
                    // Check base rate (without event specific override)
                    const rate = getDailyCacheRate([{
                      id: 'temp',
                      personnel_id: person.id,
                      event_id: eventId,
                      work_days: [],
                      event_specific_cache: null,
                      function_name: selectedFunction
                    }], person);
                    
                    const isFunctionCache = person.functions?.some(f => f.name === selectedFunction && f.custom_cache === rate && rate > (person.event_cache || 0));

                    return (
                      <span className={isFunctionCache ? "text-purple-600 font-bold" : ""}>
                        {formatCurrency(rate)}/dia
                        {isFunctionCache && " (Cache de Função ✨)"}
                        {!isFunctionCache && " (Padrão)"}
                      </span>
                    );
                  })()}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventSpecificCache" className="text-sm">
                    Cache por Dia (Específico)
                  </Label>
                  <CurrencyInput
                    id="eventSpecificCache"
                    value={eventSpecificCache}
                    onChange={handleDailyCacheChange}
                    placeholder="R$ 0,000"
                    maxDecimals={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="totalEventValue" className="text-sm">
                    Total do Evento
                  </Label>
                  <CurrencyInput
                    id="totalEventValue"
                    value={totalEventValue}
                    onChange={handleTotalEventValueChange}
                    placeholder="R$ 0,00"
                  />
                  {selectedDays.length > 0 && totalEventValue > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(totalEventValue)} ÷ {selectedDays.length} dias = {formatCurrency(totalEventValue / selectedDays.length)} por dia
                    </div>
                  )}
                </div>
                
                {selectedDays.length > 0 && eventSpecificCache > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Total do Evento
                    </Label>
                    <div className="mt-2 p-2 bg-primary/10 rounded border">
                      <div className="font-semibold text-primary">
                        {formatCurrency(eventSpecificCache * selectedDays.length)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(eventSpecificCache)} × {selectedDays.length} dias
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                {eventSpecificCache > 0 ? (
                  <div className="flex items-start gap-2">
                    <span className="text-orange-600">⚠️</span>
                    <div>
                      <div className="font-medium text-orange-700">Cache específico será aplicado</div>
                      <div>
                        {selectionMode === 'multiple' 
                          ? 'Este valor substituirá o padrão para todas as pessoas selecionadas'
                          : 'Este valor substituirá o cache padrão do profissional'
                        }
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>ℹ️</span>
                    <span>Será usado o cache padrão de cada profissional se não informado</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile-optimized buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleFormSubmit}
              disabled={formLoading}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {formLoading ? 'Salvando...' : 
                selectionMode === 'multiple' && multipleSelection.length > 0 
                  ? `Alocar ${multipleSelection.length} pessoa(s)` 
                  : 'Alocar'
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
