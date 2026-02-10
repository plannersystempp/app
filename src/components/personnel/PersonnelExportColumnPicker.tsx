import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  PERSONNEL_EXPORT_COLUMNS,
  type PersonnelExportColumnId,
  getDefaultVisiblePersonnelExportColumns,
  isLockedPersonnelExportColumn,
} from './personnelExportColumns';

type Props = {
  value: PersonnelExportColumnId[];
  onChange: (next: PersonnelExportColumnId[]) => void;
  disabled?: boolean;
};

const GROUPS: Array<{ title: string; ids: PersonnelExportColumnId[] }> = [
  {
    title: 'Básico',
    ids: ['name', 'type', 'functions', 'primaryFunction'],
  },
  {
    title: 'Contato',
    ids: ['email', 'phone', 'phoneSecondary'],
  },
  {
    title: 'Documentos',
    ids: ['cpf', 'rg', 'birthDate', 'mothersName', 'cnpj'],
  },
  {
    title: 'Financeiro',
    ids: ['monthlySalary', 'eventCache', 'overtimeRate'],
  },
  {
    title: 'Endereço',
    ids: ['addressZipCode', 'addressStreet', 'addressNumber', 'addressComplement', 'addressNeighborhood', 'addressCity', 'addressState'],
  },
  {
    title: 'Outros',
    ids: ['shirtSize', 'photoUrl', 'id'],
  },
];

export const PersonnelExportColumnPicker: React.FC<Props> = ({ value, onChange, disabled }) => {
  const selected = useMemo(() => new Set(value), [value]);

  const setChecked = (id: PersonnelExportColumnId, checked: boolean) => {
    if (disabled || isLockedPersonnelExportColumn(id)) return;
    if (checked) {
      onChange(Array.from(new Set([...value, id])));
      return;
    }
    onChange(value.filter(c => c !== id));
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(PERSONNEL_EXPORT_COLUMNS.map(c => c.id));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange(PERSONNEL_EXPORT_COLUMNS.filter(c => c.locked).map(c => c.id));
  };

  const reset = () => {
    if (disabled) return;
    onChange(getDefaultVisiblePersonnelExportColumns());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Selecione as colunas que devem aparecer no arquivo.
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={selectAll} disabled={disabled}>
            Selecionar tudo
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll} disabled={disabled}>
            Limpar
          </Button>
          <Button variant="outline" size="sm" onClick={reset} disabled={disabled}>
            Restaurar padrão
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GROUPS.map(group => (
          <div key={group.title} className="rounded-lg border bg-background p-4">
            <div className="text-sm font-semibold mb-3">{group.title}</div>
            <div className="space-y-2">
              {group.ids.map(id => {
                const def = PERSONNEL_EXPORT_COLUMNS.find(c => c.id === id);
                if (!def) return null;

                const isChecked = selected.has(id);
                const isLocked = isLockedPersonnelExportColumn(id);

                return (
                  <label key={id} className={cn('flex items-start gap-2 cursor-pointer', disabled && 'cursor-not-allowed opacity-60')}>
                    <Checkbox
                      checked={isChecked}
                      disabled={disabled || isLocked}
                      onCheckedChange={(v) => setChecked(id, !!v)}
                    />
                    <div className="leading-tight">
                      <div className="text-sm">{def.label}</div>
                      {isLocked && (
                        <div className="text-xs text-muted-foreground">Obrigatório</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

