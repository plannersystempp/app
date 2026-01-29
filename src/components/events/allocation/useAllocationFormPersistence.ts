import { useEffect } from 'react';

interface AllocationFormState {
  selectedPersonnel: string;
  selectedFunction: string;
  selectedDays: string[];
  eventSpecificCache: number;
  divisionMode: 'existing' | 'new';
  selectedDivisionId: string;
  newDivisionName: string;
  startTime?: string;
  endTime?: string;
}

export const useAllocationFormPersistence = (
  eventId: string,
  formState: AllocationFormState,
  setFormState: (state: Partial<AllocationFormState>) => void,
  open: boolean,
  excludeFields?: string[]
) => {
  const storageKey = `plannersystem-allocation-form-state-${eventId}`;

  // Save to sessionStorage whenever form state changes
  useEffect(() => {
    if (open && eventId) {
      sessionStorage.setItem(storageKey, JSON.stringify(formState));
    }
  }, [storageKey, formState, open, eventId]);

  // Load from sessionStorage when component mounts
  useEffect(() => {
    if (open && eventId) {
      const savedState = sessionStorage.getItem(storageKey);
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          // Filter out excluded fields
          const filteredState = excludeFields?.length 
            ? Object.keys(parsedState).reduce((acc, key) => {
                if (!excludeFields.includes(key)) {
                  acc[key] = parsedState[key];
                }
                return acc;
              }, {} as any)
            : parsedState;
          setFormState(filteredState);
        } catch (error) {
          console.error('Error parsing saved allocation form state:', error);
          sessionStorage.removeItem(storageKey);
        }
      }
    }
  }, [storageKey, setFormState, open, eventId, excludeFields]);

  // Clear storage on successful submit or explicit close
  const clearPersistedState = () => {
    sessionStorage.removeItem(storageKey);
  };

  return { clearPersistedState };
};