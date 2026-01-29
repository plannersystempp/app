
import React, { useState, useEffect } from 'react';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatters';
import { type Assignment } from '@/contexts/EnhancedDataContext';

interface AllocationEditFormProps {
  assignment: Assignment | null;
  availableDays: string[]; // CORREÇÃO: Recebe as datas já calculadas corretamente
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AllocationEditForm: React.FC<AllocationEditFormProps> = ({
  assignment,
  availableDays, // CORREÇÃO: Usa a prop diretamente - fonte única da verdade
  open,
  onOpenChange
}) => {
  const { personnel, functions, assignments, divisions, updateAssignment } = useEnhancedData();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedPersonnel, setSelectedPersonnel] = useState('');
  const [selectedFunction, setSelectedFunction] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [eventSpecificCache, setEventSpecificCache] = useState<number>(0);
  const [totalEventValue, setTotalEventValue] = useState<number>(0);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);

  // Load assignment data when form opens
  useEffect(() => {
    if (assignment && open) {
      setSelectedPersonnel(assignment.personnel_id);
      setSelectedFunction(assignment.function_name);
      setSelectedDays(assignment.work_days || []);
      setSelectedDivisionId(assignment.division_id);
      // Ensure time values are initialized correctly
      setStartTime(assignment.start_time || '');
      setEndTime(assignment.end_time || '');
      const cache = assignment.event_specific_cache || 0;
      setEventSpecificCache(cache);
      setTotalEventValue(cache * (assignment.work_days?.length || 0));
    }
  }, [assignment, open]);

  const handleSubmit = async () => {
    if (!assignment || !selectedPersonnel || !selectedFunction || selectedDays.length === 0 || !selectedDivisionId) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Check for conflicts with other assignments (excluding current one)
    const existingAssignments = assignments.filter(a => 
      a.event_id === assignment.event_id && 
      a.personnel_id === selectedPersonnel &&
      a.function_name === selectedFunction &&
      a.id !== assignment.id
    );
    
    if (existingAssignments.length > 0) {
      toast({
        title: "Função já alocada",
        description: "Esta pessoa já está alocada com esta função neste evento. Escolha uma função diferente.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const selectedFunctionObj = functions.find(f => f.name === selectedFunction) || 
                                   functions.find(f => f.id === selectedFunction);
      const functionName = selectedFunctionObj ? selectedFunctionObj.name : selectedFunction;

      await updateAssignment({
        ...assignment,
        personnel_id: selectedPersonnel,
        function_name: functionName,
        work_days: selectedDays,
        division_id: selectedDivisionId,
        event_specific_cache: eventSpecificCache > 0 ? eventSpecificCache : undefined,
        start_time: startTime || undefined,
        end_time: endTime || undefined
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Erro",
        description: `Erro ao atualizar alocação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllDays = () => {
    if (selectedDays.length === availableDays.length) {
      setSelectedDays([]);
    } else {
      setSelectedDays([...availableDays]);
    }
  };

  const handleDayToggle = (day: string, checked: boolean) => {
    if (checked) {
      setSelectedDays([...selectedDays, day]);
    } else {
      setSelectedDays(selectedDays.filter(d => d !== day));
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby="allocation-edit-description">
        <DialogHeader>
          <DialogTitle>Editar Alocação</DialogTitle>
          <div id="allocation-edit-description" className="sr-only">
            Formulário para editar alocação de pessoal em evento
          </div>
        </DialogHeader>
        <div className="space-y-6 p-1">
          <div className="space-y-2">
            <Label htmlFor="personnel">Pessoa</Label>
            <Select value={selectedPersonnel} onValueChange={setSelectedPersonnel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma pessoa" />
              </SelectTrigger>
              <SelectContent>
                {personnel.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="function">Função</Label>
            <Select value={selectedFunction} onValueChange={setSelectedFunction}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                {functions.map((func) => (
                  <SelectItem key={func.id} value={func.name}>
                    {func.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="division">Divisão</Label>
            <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma divisão" />
              </SelectTrigger>
              <SelectContent>
                {divisions
                  .filter(d => d.event_id === assignment?.event_id)
                  .map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {division.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Dias de Trabalho</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllDays}
              >
                {selectedDays.length === availableDays.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* CORREÇÃO: Usa availableDays que já contém as datas corretas */}
              {availableDays.map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={day}
                    checked={selectedDays.includes(day)}
                    onCheckedChange={(checked) => handleDayToggle(day, checked as boolean)}
                  />
                  <Label htmlFor={day} className="text-sm">
                    {/* CORREÇÃO: Adiciona T12:00:00 para garantir interpretação correta da data */}
                    {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { 
                      weekday: 'short', 
                      day: '2-digit', 
                      month: '2-digit' 
                    })}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Horário de Entrada</Label>
              <div className="relative">
                <input
                  type="time"
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-muted-foreground">Opcional - sobrescreve o padrão</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Horário de Saída</Label>
              <div className="relative">
                <input
                  type="time"
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-muted-foreground">Opcional - sobrescreve o padrão</p>
            </div>
          </div>

          {/* Event-Specific Cache Section - Admin Only */}
          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">💰 Cache para este Evento</span>
                <span className="text-xs text-muted-foreground">(Apenas Admins)</span>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventSpecificCache">Cache por dia específico</Label>
                    <CurrencyInput
                      id="eventSpecificCache"
                      value={eventSpecificCache}
                      onChange={handleDailyCacheChange}
                      placeholder="R$ 0,000"
                      maxDecimals={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="totalEventValue">Total do Evento</Label>
                    <CurrencyInput
                      id="totalEventValue"
                      value={totalEventValue}
                      onChange={handleTotalEventValueChange}
                      placeholder="R$ 0,00"
                    />
                    {selectedDays.length > 0 && totalEventValue > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(totalEventValue)} ÷ {selectedDays.length} dias = {formatCurrency(totalEventValue / selectedDays.length)} por dia
                      </div>
                    )}
                  </div>
                </div>

                {selectedPersonnel && (
                  <div className="space-y-2 text-sm">
                    {(() => {
                      const selectedPerson = personnel.find(p => p.id === selectedPersonnel);
                      const defaultCache = selectedPerson?.event_cache || 0;
                      const isUsingSpecific = eventSpecificCache > 0;
                      const totalEventValue = (isUsingSpecific ? eventSpecificCache : defaultCache) * selectedDays.length;

                      return (
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Valor padrão:</span>
                            <span>{formatCurrency(defaultCache)}/dia</span>
                          </div>
                          {isUsingSpecific && (
                            <>
                              <div className="flex justify-between font-medium">
                                <span className="text-primary">Valor aplicado:</span>
                                <span className="text-primary">{formatCurrency(eventSpecificCache)}/dia ⭐</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-amber-600">
                                <span>⚠️</span>
                                <span>Cache específico aplicado</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between pt-1 border-t">
                            <span className="font-medium">Total do evento ({selectedDays.length} dias):</span>
                            <span className="font-medium">{formatCurrency(totalEventValue)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4 border-t">
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !selectedPersonnel || !selectedFunction || selectedDays.length === 0 || !selectedDivisionId}
              className="min-h-[44px]"
            >
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="min-h-[44px]">
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
