/**
 * Hook central que ativa todos os sistemas de sincronização em tempo real
 * Deve ser chamado uma vez no componente raiz da aplicação
 * 
 * FASE 4: Agora inclui sincronização cross-tab
 */
import { usePersonnelRealtime } from './usePersonnelRealtime';
import { useEventsRealtime } from './useEventsRealtime';
import { useAllocationsRealtime } from './useAllocationsRealtime';
import { useDivisionsRealtime } from './useDivisionsRealtime';
import { useWorkLogsRealtime } from './useWorkLogsRealtime';
import { useFunctionsRealtime } from './useFunctionsRealtime';
import { usePersonnelPaymentsRealtime } from './usePersonnelPaymentsRealtime';
import { usePayrollClosingsRealtime } from './usePayrollClosingsRealtime';
import { useCrossTabSync } from './useCrossTabSync';
import { logger } from '@/utils/logger';


export const useRealtimeSync = () => {
  // Ativar todos os sistemas de Realtime
  usePersonnelRealtime();
  useEventsRealtime();
  useAllocationsRealtime();
  useDivisionsRealtime();
  useWorkLogsRealtime();
  useFunctionsRealtime();
  usePersonnelPaymentsRealtime();
  usePayrollClosingsRealtime();

  // FASE 4: Ativar sincronização cross-tab
  useCrossTabSync();


  logger.realtime.info('SUBSCRIPTIONS_ACTIVE');
};
