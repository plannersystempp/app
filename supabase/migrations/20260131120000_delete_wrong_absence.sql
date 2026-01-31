DO $$
DECLARE
    target_employee_id UUID;
    target_record_id UUID;
BEGIN
    -- 1. Find the employee ID
    SELECT id INTO target_employee_id
    FROM personnel
    WHERE name = 'Felipe Gomes Oliveira de Abreu';

    IF target_employee_id IS NULL THEN
        RAISE NOTICE 'Employee not found';
        RETURN;
    END IF;

    -- 2. Find the work record ID
    SELECT id INTO target_record_id
    FROM work_records
    WHERE employee_id = target_employee_id
      AND work_date = '2025-11-13'
      AND attendance_status = 'absent';

    IF target_record_id IS NULL THEN
        RAISE NOTICE 'Absence record not found';
        RETURN;
    END IF;

    -- 3. Delete the record
    DELETE FROM work_records
    WHERE id = target_record_id;

    RAISE NOTICE 'Deleted absence record % for employee %', target_record_id, target_employee_id;
END $$;
