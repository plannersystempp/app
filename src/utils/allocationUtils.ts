
import { Assignment, Division, Event } from '@/contexts/EnhancedDataContext';

export const getExpectedWorkHours = (
  assignment: Assignment,
  division: Division | undefined,
  event: Event | undefined
): { startTime: string | null; endTime: string | null } => {
  // 1. Individual Allocation Level
  if (assignment.start_time && assignment.end_time) {
    return {
      startTime: assignment.start_time,
      endTime: assignment.end_time
    };
  }

  // 2. Division Level
  if (division && division.default_entry_time && division.default_exit_time) {
    return {
      startTime: division.default_entry_time,
      endTime: division.default_exit_time
    };
  }

  // 3. Event Level
  if (event && event.default_entry_time && event.default_exit_time) {
    return {
      startTime: event.default_entry_time,
      endTime: event.default_exit_time
    };
  }

  // 4. Default (Blank)
  return {
    startTime: null,
    endTime: null
  };
};

export const formatTimeRange = (startTime: string | null, endTime: string | null): string => {
  if (!startTime || !endTime) return 'Horário não definido';
  return `${startTime} - ${endTime}`;
};
