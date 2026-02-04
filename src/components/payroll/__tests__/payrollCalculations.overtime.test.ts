
import { describe, it, expect } from 'vitest';
import { 
  getOvertimeRate, 
  calculateOvertimePay, 
  PersonnelData, 
  AllocationData, 
  WorkLogData 
} from '../payrollCalculations';

describe('Payroll Calculations - Overtime', () => {
  const mockPerson: PersonnelData = {
    id: 'p1',
    name: 'Test Person',
    type: 'freelancer',
    overtime_rate: 0, // Taxa padrão zerada
    functions: [
      { id: 'f1', name: 'Developer', custom_overtime: 50 }
    ]
  };

  const mockAllocations: AllocationData[] = [
    {
      id: 'a1',
      personnel_id: 'p1',
      event_id: 'e1',
      work_days: ['2024-01-01'],
      function_id: 'f1',
      function_name: 'Developer'
    }
  ];

  const mockWorkLogs: WorkLogData[] = [
    {
      id: 'w1',
      employee_id: 'p1',
      event_id: 'e1',
      hours_worked: 8,
      overtime_hours: 2,
      work_date: '2024-01-01'
    }
  ];

  it('should calculate overtime rate correctly from function allocation', () => {
    const rate = getOvertimeRate(mockAllocations, mockPerson);
    expect(rate).toBe(50);
  });

  it('should use person default rate if no allocation specific rate found', () => {
    const personWithRate = { ...mockPerson, overtime_rate: 30 };
    // Alocação sem função específica com override e sem nome que dê match
    const allocationsNoOverride = [{ 
      ...mockAllocations[0], 
      function_id: 'f2',
      function_name: 'Other'
    }]; 
    
    const rate = getOvertimeRate(allocationsNoOverride, personWithRate);
    expect(rate).toBe(30);
  });

  it('should calculate overtime pay using allocation rate', () => {
    // 2 horas extras * taxa 50 = 100
    const pay = calculateOvertimePay(mockWorkLogs, mockPerson, mockAllocations);
    expect(pay).toBe(100);
  });

  it('should use implicit rate from daily cache if it is higher than explicit rate', () => {
    // Cachê de 720 -> Taxa implícita 720/12 = 60
    // Taxa da função é 50
    // Deve escolher 60
    const allocationsWithHighCache = [{ 
      ...mockAllocations[0], 
      event_specific_cache: 720 
    }];
    
    const rate = getOvertimeRate(allocationsWithHighCache, mockPerson);
    expect(rate).toBe(60);
  });

  it('should use explicit rate if it is higher than implicit rate', () => {
    // Cachê de 400 -> Taxa implícita 400/12 = 33.33...
    // Taxa da função é 50
    // Deve escolher 50
    const allocationsWithLowCache = [{ 
      ...mockAllocations[0], 
      event_specific_cache: 400 
    }];
    
    const rate = getOvertimeRate(allocationsWithLowCache, mockPerson);
    expect(rate).toBe(50);
  });

  it('should return 0 if allocations are not provided (legacy behavior fallback to person rate)', () => {
    // Como a pessoa tem taxa 0, se não passar alocações, deve dar 0
    const pay = calculateOvertimePay(mockWorkLogs, mockPerson); // Sem allocations
    expect(pay).toBe(0);
  });
});
