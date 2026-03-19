import { describe, expect, it } from 'vitest';
import { toWorkRecordWrite, type WorkRecordWrite } from '@/services/workRecordWrite';

describe('toWorkRecordWrite', () => {
  it('mantém apenas campos conhecidos e ignora undefined', () => {
    const input: Partial<WorkRecordWrite> = {
      employee_id: 'emp_1',
      event_id: 'evt_1',
      work_date: '2026-03-16',
      hours_worked: 8,
      overtime_hours: 1,
      total_pay: 0,
      logged_by_id: 'usr_1',
      date_logged: undefined,
      attendance_status: 'present',
      notes: undefined,
      check_in_time: undefined,
      check_out_time: '08:00:00',
    };

    const out = toWorkRecordWrite(input);

    expect(out).toEqual({
      employee_id: 'emp_1',
      event_id: 'evt_1',
      work_date: '2026-03-16',
      hours_worked: 8,
      overtime_hours: 1,
      total_pay: 0,
      logged_by_id: 'usr_1',
      attendance_status: 'present',
      check_out_time: '08:00:00',
    });
  });

  it('preserva null quando explicitamente definido', () => {
    const out = toWorkRecordWrite({
      notes: null,
      check_in_time: null,
      check_out_time: null,
    });

    expect(out).toEqual({
      notes: null,
      check_in_time: null,
      check_out_time: null,
    });
  });

  it('não propaga campos extras acidentais (ex: logged_by_name)', () => {
    const out = toWorkRecordWrite(
      ({
        employee_id: 'emp_1',
        logged_by_name: 'Fulano',
      } as unknown) as Partial<WorkRecordWrite>
    );

    expect(out).toEqual({ employee_id: 'emp_1' });
    expect('logged_by_name' in (out as Record<string, unknown>)).toBe(false);
  });
});

