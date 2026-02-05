
import { useState, useEffect } from 'react';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useToast } from '@/hooks/use-toast';

interface UseAllocationFormProps {
  eventId: string;
  preselectedDivisionId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const useAllocationForm = ({
  eventId,
  preselectedDivisionId,
  open,
  onOpenChange
}: UseAllocationFormProps) => {
  const { divisions, assignments, addAssignment, addDivision } = useEnhancedData();
  const { toast } = useToast();
  
  const [selectedPersonnel, setSelectedPersonnel] = useState('');
  const [selectedFunction, setSelectedFunction] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [eventSpecificCache, setEventSpecificCache] = useState<number>(0);
  const [divisionMode, setDivisionMode] = useState<'existing' | 'new'>('existing');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [newDivisionName, setNewDivisionName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);

  // Get divisions for this specific event
  const eventDivisions = divisions.filter(d => d.event_id === eventId);

  // Set preselected division if provided
  useEffect(() => {
    if (preselectedDivisionId) {
      // Always try to set the preselected division when form opens
      setSelectedDivisionId(preselectedDivisionId);
      setDivisionMode('existing');
    }
  }, [preselectedDivisionId]);

  // Set default to new division mode if no divisions exist
  useEffect(() => {
    if (eventDivisions.length === 0) {
      setDivisionMode('new');
    } else {
      setDivisionMode('existing');
    }
  }, [eventDivisions.length]);

  const resetForm = () => {
    setSelectedPersonnel('');
    setSelectedFunction('');
    setSelectedDays([]);
    setEventSpecificCache(0);
    setDivisionMode(eventDivisions.length > 0 ? 'existing' : 'new');
    setSelectedDivisionId('');
    setNewDivisionName('');
    setStartTime('');
    setEndTime('');
  };

  const isFormValid = () => {
    const hasPersonnel = selectedPersonnel !== '';
    const hasFunction = selectedFunction !== '';
    const hasDays = selectedDays.length > 0;
    const hasDivision = divisionMode === 'existing' 
      ? selectedDivisionId !== ''
      : newDivisionName.trim() !== '';
    
    return hasPersonnel && hasFunction && hasDays && hasDivision;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    // Check if person is already allocated to this event (regardless of function)
    const existingAllocation = assignments.find(a => 
      a.event_id === eventId && 
      a.personnel_id === selectedPersonnel
    );
    
    if (existingAllocation) {
      toast({
        title: "Alocação já existente",
        description: "Esta pessoa já está alocada neste evento. Não é possível alocar a mesma pessoa mais de uma vez.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let finalDivisionId = selectedDivisionId;

      // Create new division if needed
      if (divisionMode === 'new' && newDivisionName.trim()) {
        const newDivisionId = await addDivision({
          event_id: eventId,
          name: newDivisionName.trim(),
          description: ''
        });

        if (!newDivisionId) {
          throw new Error('Failed to create division');
        }

        finalDivisionId = newDivisionId;
      }

      // Create the assignment
      await addAssignment({
        event_id: eventId,
        personnel_id: selectedPersonnel,
        division_id: finalDivisionId,
        function_name: selectedFunction,
        work_days: selectedDays,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        ...(eventSpecificCache > 0 && { event_specific_cache: eventSpecificCache })
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating allocation:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
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
    isFormValid,
    resetForm
  };
};
