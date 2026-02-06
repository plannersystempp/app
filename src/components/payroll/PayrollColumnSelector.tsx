import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Columns } from 'lucide-react';
import {
  PAYROLL_REPORT_COLUMNS,
  type PayrollReportColumnId,
  getDefaultVisiblePayrollReportColumns,
  isLockedPayrollReportColumn,
} from './payrollReportColumns';

type Props = {
  visibleColumns: PayrollReportColumnId[];
  onChange: (next: PayrollReportColumnId[]) => void;
  disabled?: boolean;
};

export const PayrollColumnSelector: React.FC<Props> = ({ visibleColumns, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const visibleSet = new Set(visibleColumns);

  const toggle = (id: PayrollReportColumnId, checked: boolean) => {
    if (isLockedPayrollReportColumn(id)) return;

    const next = checked
      ? Array.from(new Set([...visibleColumns, id]))
      : visibleColumns.filter(c => c !== id);

    onChange(next);
  };

  const reset = () => {
    onChange(getDefaultVisiblePayrollReportColumns());
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Columns className="w-4 h-4 mr-2" />
          Colunas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Configurar colunas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PAYROLL_REPORT_COLUMNS.map(col => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={visibleSet.has(col.id)}
            disabled={disabled || !!col.locked}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(v) => toggle(col.id, !!v)}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => {
          e.preventDefault();
          reset();
        }} disabled={disabled}>
          Restaurar padrão
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setOpen(false)}>
          Fechar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
