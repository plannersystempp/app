import { usePayrollQuery } from '@/hooks/queries/usePayrollQuery';
import { EventData } from './types';
import { useCallback } from 'react';

/**
 * Hook legado mantido para compatibilidade.
 * Internamente usa o novo usePayrollQuery que possui cache e otimizações.
 * @deprecated Prefira usar usePayrollQuery diretamente.
 */
export const usePayrollData = (selectedEventId: string) => {
  const { 
    eventData, 
    payrollDetails, 
    pixKeys, 
    loading 
  } = usePayrollQuery(selectedEventId);

  // Função mock para manter compatibilidade com componentes que ainda esperam setEventData
  // Idealmente, os componentes devem migrar para usar invalidation via React Query
  const setEventData = useCallback((value: React.SetStateAction<EventData> | EventData) => {
    console.warn('setEventData is deprecated. Use query invalidation instead.');
  }, []);

  return {
    eventData,
    setEventData,
    payrollDetails,
    pixKeys,
    loading
  };
};
