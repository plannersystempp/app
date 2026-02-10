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
  PERSONNEL_PDF_COLUMNS,
  type PersonnelPdfColumnId,
  getDefaultVisiblePersonnelPdfColumns,
  isLockedPersonnelPdfColumn,
} from './personnelPdfColumns';

type Props = {
  visibleColumns: PersonnelPdfColumnId[];
  onChange: (next: PersonnelPdfColumnId[]) => void;
  disabled?: boolean;
};

export const PersonnelPdfColumnSelector: React.FC<Props> = ({ visibleColumns, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const visibleSet = new Set(visibleColumns);

  const toggle = (id: PersonnelPdfColumnId, checked: boolean) => {
    if (isLockedPersonnelPdfColumn(id)) return;

    const next = checked
      ? Array.from(new Set([...visibleColumns, id]))
      : visibleColumns.filter(c => c !== id);

    onChange(next);
  };

  const reset = () => {
    onChange(getDefaultVisiblePersonnelPdfColumns());
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Columns className="w-4 h-4 mr-2" />
          Colunas do PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Personalizar PDF</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PERSONNEL_PDF_COLUMNS.map(col => (
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
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            reset();
          }}
          disabled={disabled}
        >
          Restaurar padrão
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setOpen(false)}>Fechar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

