
export interface PayrollClosing {
  id: string;
  event_id: string;
  personnel_id: string;
  total_amount_paid: number;
  paid_at: string;
  team_id: string;
  notes?: string;
  created_at: string;
}

export interface EventData {
  allocations: any[];
  workLogs: any[];
  closings: PayrollClosing[];
}

export interface PayrollDetails {
  id: string;
  personnelId: string;
  personName: string;
  personType: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  mothersName?: string;
  eventRole?: string;
  divisions?: string;
  workDays: number;
  workDaysList?: string[];
  regularHours: number;
  totalOvertimeHours: number;
  baseSalary: number;
  cachePay: number;
  overtimePay: number;
  totalPay: number;
  cacheRate: number;
  overtimeRate: number;
  paid: boolean;
  paidAmount: number;
  pendingAmount: number;
  paymentHistory: PaymentHistoryItem[];
  absencesCount: number;
  absences: AbsenceDetail[];
  hasEventSpecificCache?: boolean;
  eventSpecificCacheRate?: number;
  cacheDailyRateAvg?: number;
  cacheDailyRateMin?: number;
  cacheDailyRateMax?: number;
  cacheDailyRateIsVariable?: boolean;
  overtimeConversionApplied?: boolean;
  overtimeCachesUsed?: number;
  overtimeRemainingHours?: number;
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  paidAt: string;
  notes?: string;
}

export interface AbsenceDetail {
  id: string;
  work_date: string;
  logged_by_name?: string;
  notes?: string;
  created_at: string;
}
