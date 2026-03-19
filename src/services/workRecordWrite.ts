import type { WorkRecord } from '@/contexts/EnhancedDataContext';

export type WorkRecordWrite = {
  employee_id: WorkRecord['employee_id'];
  event_id: WorkRecord['event_id'];
  work_date: WorkRecord['work_date'];
  hours_worked?: WorkRecord['hours_worked'];
  overtime_hours?: WorkRecord['overtime_hours'];
  total_pay?: WorkRecord['total_pay'];
  logged_by_id?: WorkRecord['logged_by_id'];
  date_logged?: WorkRecord['date_logged'];
  attendance_status?: WorkRecord['attendance_status'];
  notes?: WorkRecord['notes'];
  check_in_time?: WorkRecord['check_in_time'];
  check_out_time?: WorkRecord['check_out_time'];
};

export const toWorkRecordWrite = (input: Partial<WorkRecordWrite>): Partial<WorkRecordWrite> => {
  const out: Partial<WorkRecordWrite> = {};

  if (input.employee_id != null) out.employee_id = input.employee_id;
  if (input.event_id != null) out.event_id = input.event_id;
  if (input.work_date != null) out.work_date = input.work_date;
  if (input.hours_worked != null) out.hours_worked = input.hours_worked;
  if (input.overtime_hours != null) out.overtime_hours = input.overtime_hours;
  if (input.total_pay != null) out.total_pay = input.total_pay;
  if (input.logged_by_id != null) out.logged_by_id = input.logged_by_id;
  if (input.date_logged != null) out.date_logged = input.date_logged;
  if (input.attendance_status != null) out.attendance_status = input.attendance_status;
  if (input.notes !== undefined) out.notes = input.notes;
  if (input.check_in_time !== undefined) out.check_in_time = input.check_in_time;
  if (input.check_out_time !== undefined) out.check_out_time = input.check_out_time;

  return out;
};

