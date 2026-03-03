
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PersonnelSelector } from './allocation/PersonnelSelector';
import { MultiPersonnelSelector } from './allocation/MultiPersonnelSelector';
import { generateDateArray, getEventFullDateRange } from '@/utils/dateUtils';
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
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
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
  const { refreshAssignments } = useEnhancedData();
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
  const availableDays = getEventFullDateRange(event);

  const {
    selectedPersonnel,
    setSelectedPersonnel,
    selectedFunction,
    setSelectedFunction,
    selectedDays,
    setSelectedDays,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
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

  const selectedPerson = personnel.find(p => p.id === selectedPersonnel);
  const selectedDivisionName = eventDivisions.find(d => d.id === selectedDivisionId)?.name;
  const divisionDisplayName = (divisionMode === 'new' ? (newDivisionName || '').trim() : (selectedDivisionName || '')).trim();

  const formatDayShort = (day: string) => {
    try {
      return new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit'
      });
    } catch {
      return day;
    }
  };

  const selectedDaysSorted = [...selectedDays].sort();
  const daysSummary = selectedDaysSorted.length === 0
    ? ''
    : selectedDaysSorted.length === 1
      ? formatDayShort(selectedDaysSorted[0])
      : `${formatDayShort(selectedDaysSorted[0])} – ${formatDayShort(selectedDaysSorted[selectedDaysSorted.length - 1])}`;

  const getOverlappingDaysForPerson = (personnelId: string, days: string[]) => {
    const overlaps = new Set<string>();
    for (const a of assignments) {
      if (a.event_id !== eventId) continue;
      if (a.personnel_id !== personnelId) continue;
      const existingDays = Array.isArray(a.work_days) ? a.work_days : [];
      for (const d of existingDays) {
        if (days.includes(d)) overlaps.add(d);
      }
    }
    return Array.from(overlaps).sort();
  };

  const divisionReady = divisionMode === 'existing'
    ? !!selectedDivisionId
    : !!(newDivisionName || '').trim();

  const daysReady = selectedDays.length > 0;
  const individualReady = !!selectedPersonnel && !!selectedFunction && divisionReady && daysReady;
  const multipleReady = multipleSelection.length > 0 && divisionReady && daysReady && multipleSelection.every(sp => !!sp.selectedFunction);
  const isReadyToSubmit = selectionMode === 'multiple' ? multipleReady : individualReady;

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
      newDivisionName,
      startTime,
      endTime
    },
    (newState) => {
      if (newState.selectedPersonnel !== undefined) setSelectedPersonnel(newState.selectedPersonnel);
      if (newState.selectedFunction !== undefined) setSelectedFunction(newState.selectedFunction);
      if (newState.selectedDays !== undefined) setSelectedDays(newState.selectedDays);
      if (newState.eventSpecificCache !== undefined) setEventSpecificCache(newState.eventSpecificCache);
      if (newState.divisionMode !== undefined) setDivisionMode(newState.divisionMode);
      if (newState.selectedDivisionId !== undefined) setSelectedDivisionId(newState.selectedDivisionId);
      if (newState.newDivisionName !== undefined) setNewDivisionName(newState.newDivisionName);
      if (newState.startTime !== undefined) setStartTime(newState.startTime);
      if (newState.endTime !== undefined) setEndTime(newState.endTime);
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

        const overlappingDays = getOverlappingDaysForPerson(selectedPersonnel, selectedDays);
        if (overlappingDays.length > 0) {
          toast({
            title: "Conflito de dias",
            description: `Esta pessoa já está alocada neste evento nos seguintes dias: ${overlappingDays.map(formatDayShort).join(', ')}.`,
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

        const conflicts = multipleSelection
          .map(sp => {
            const overlappingDays = getOverlappingDaysForPerson(sp.personnel.id, selectedDays);
            return overlappingDays.length > 0
              ? { name: sp.personnel.name, days: overlappingDays }
              : null;
          })
          .filter((v): v is { name: string; days: string[] } => !!v);

        if (conflicts.length > 0) {
          const preview = conflicts
            .slice(0, 4)
            .map(c => `${c.name}: ${c.days.map(formatDayShort).join(', ')}`)
            .join(' | ');
          const suffix = conflicts.length > 4 ? ` (+${conflicts.length - 4})` : '';
          toast({
            title: "Conflito de dias",
            description: `Já existem alocações nos dias selecionados para: ${preview}${suffix}.`,
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

        const created = await Promise.all(promises);

        await refreshAssignments();

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
      <DialogContent className={`${isMobile ? 'top-0 left-0 translate-x-0 translate-y-0 w-screen h-[92vh] max-w-none rounded-none px-2 sm:px-3 border-0' : 'max-w-5xl md:max-w-6xl'} max-h-[92vh] overflow-y-auto overflow-x-hidden bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur border border-border/60 shadow-2xl`} aria-modal="true" data-modal="true">
        <DialogHeader className="pb-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="tracking-tight">Nova Alocação</DialogTitle>
            {event && (
              <div className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-foreground truncate max-w-[min(520px,70vw)]">{event.name}</span>
                <span className="text-muted-foreground/60">·</span>
                <span className="whitespace-nowrap">
                  {new Date(event.start_date + 'T12:00:00').toLocaleDateString('pt-BR')} – {new Date(event.end_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card className="border-border/60 bg-card/80 supports-[backdrop-filter]:bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base tracking-tight">Pessoal</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card className="border-border/60 bg-card/80 supports-[backdrop-filter]:bg-card/70 backdrop-blur shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base tracking-tight">Divisão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DivisionSelector
                    eventDivisions={eventDivisions}
                    selectedDivisionId={selectedDivisionId}
                    onSelectedDivisionChange={(id) => {
                      setSelectedDivisionId(id);
                      setDivisionMode('existing');
                      setNewDivisionName('');
                    }}
                    onNewDivisionCreate={(name) => {
                      setNewDivisionName(name);
                      setDivisionMode('new');
                      setSelectedDivisionId('');
                      toast({
                        title: 'Nova divisão',
                        description: `"${name}" será criada ao salvar a alocação.`
                      });
                    }}
                    divisionMode={divisionMode}
                    newDivisionName={newDivisionName}
                  />

                  {divisionMode === 'new' && (newDivisionName || '').trim() && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs sm:text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          Nova divisão: <span className="font-medium">{(newDivisionName || '').trim()}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => {
                            setNewDivisionName('');
                            setDivisionMode('existing');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                      <div className="text-muted-foreground mt-1">Será criada ao salvar a alocação.</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/80 supports-[backdrop-filter]:bg-card/70 backdrop-blur shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base tracking-tight">Dias e Horários</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  <Separator className="bg-border/60" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Horário de Entrada</Label>
                      <div className="relative">
                        <input
                          type="time"
                          id="startTime"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background/70 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Opcional</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Horário de Saída</Label>
                      <div className="relative">
                        <input
                          type="time"
                          id="endTime"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background/70 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Opcional</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {isAdmin && (
              <Card className="border-border/60 bg-card/80 supports-[backdrop-filter]:bg-card/70 backdrop-blur shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base tracking-tight">Cache</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

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
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-4 border-t border-border/60">
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
                disabled={formLoading || !isReadyToSubmit}
                className="w-full sm:w-auto min-h-[44px] shadow-sm"
              >
                {formLoading ? 'Salvando...' :
                  selectionMode === 'multiple' && multipleSelection.length > 0
                    ? `Alocar ${multipleSelection.length} pessoa(s)`
                    : 'Alocar'
                }
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-4 border-border/60 bg-card/80 supports-[backdrop-filter]:bg-card/70 backdrop-blur shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base tracking-tight">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Modo</span>
                  <Badge variant="secondary" className="text-xs">
                    {selectionMode === 'multiple' ? 'Múltipla' : 'Individual'}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pessoal</span>
                    <span className="text-sm font-medium">
                      {selectionMode === 'multiple'
                        ? `${multipleSelection.length} selecionado(s)`
                        : (selectedPerson?.name || '—')}
                    </span>
                  </div>
                  {selectionMode === 'individual' && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Função</span>
                      <span className="text-sm font-medium">{selectedFunction || '—'}</span>
                    </div>
                  )}
                </div>

                <Separator className="bg-border/60" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Divisão</span>
                  <span className="text-sm font-medium truncate max-w-[60%]">{divisionDisplayName || '—'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dias</span>
                  <span className="text-sm font-medium">
                    {selectedDays.length ? `${selectedDays.length} (${daysSummary})` : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Horários</span>
                  <span className="text-sm font-medium">
                    {startTime || endTime ? `${startTime || '—'} – ${endTime || '—'}` : '—'}
                  </span>
                </div>

                {isAdmin && eventSpecificCache > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cache/dia</span>
                    <span className="text-sm font-medium">{formatCurrency(eventSpecificCache)}</span>
                  </div>
                )}

                {divisionMode === 'new' && (newDivisionName || '').trim() && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                    A divisão será criada ao salvar.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
