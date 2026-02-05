import { useEffect, useRef } from 'react';

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
  const lastLoadedKeyRef = useRef<string | null>(null);

  // Reset loaded state when closed
  useEffect(() => {
    if (!open) {
      lastLoadedKeyRef.current = null;
    }
  }, [open]);

  // Save to sessionStorage whenever form state changes
  useEffect(() => {
    if (open && eventId) {
      sessionStorage.setItem(storageKey, JSON.stringify(formState));
    }
  }, [storageKey, formState, open, eventId]);

  // Load from sessionStorage when component opens
  useEffect(() => {
    if (open && eventId) {
      // Prevent reloading if already loaded for this key
      if (lastLoadedKeyRef.current === storageKey) return;

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
          lastLoadedKeyRef.current = storageKey;
        } catch (error) {
          console.error('Error parsing saved allocation form state:', error);
          sessionStorage.removeItem(storageKey);
        }
      } else {
        // Mark as loaded even if empty, to prevent loop
        lastLoadedKeyRef.current = storageKey;
      }
    }
  }, [storageKey, setFormState, open, eventId, excludeFields]);

  // Clear storage on successful submit or explicit close
  const clearPersistedState = () => {
    sessionStorage.removeItem(storageKey);
    lastLoadedKeyRef.current = null;
  };

  return { clearPersistedState };
};