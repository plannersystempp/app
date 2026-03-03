import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  SUPPLIER_REPORT_COLUMNS,
  getDefaultVisibleSupplierReportColumns,
  isLockedSupplierReportColumn,
  type SupplierReportColumnId,
} from './supplierReportColumns';

type Props = {
  value: SupplierReportColumnId[];
  onChange: (next: SupplierReportColumnId[]) => void;
  disabled?: boolean;
};

const GROUPS: Array<{ title: string; ids: SupplierReportColumnId[] }> = [
  {
    title: 'Básico',
    ids: ['nome_fantasia', 'razao_social', 'cnpj'],
  },
  {
    title: 'Contato',
    ids: ['pessoa_contato', 'telefone_1', 'telefone_2', 'email'],
  },
  {
    title: 'Endereço',
    ids: ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado'],
  },
  {
    title: 'Cadastros',
    ids: ['inscricao_estadual', 'inscricao_municipal'],
  },
  {
    title: 'Avaliações e notas',
    ids: ['avaliacao_media', 'total_avaliacoes', 'observacoes'],
  },
];

export const SupplierExportColumnPicker: React.FC<Props> = ({ value, onChange, disabled }) => {
  const selected = useMemo(() => new Set(value), [value]);

  const setChecked = (id: SupplierReportColumnId, checked: boolean) => {
    if (disabled || isLockedSupplierReportColumn(id)) return;
    if (checked) {
      onChange(Array.from(new Set([...value, id])));
      return;
    }
    onChange(value.filter((c) => c !== id));
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(SUPPLIER_REPORT_COLUMNS.map((c) => c.id));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange(SUPPLIER_REPORT_COLUMNS.filter((c) => c.locked).map((c) => c.id));
  };

  const reset = () => {
    if (disabled) return;
    onChange(getDefaultVisibleSupplierReportColumns());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">Selecione as colunas que devem aparecer no arquivo.</div>
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
        {GROUPS.map((group) => (
          <div key={group.title} className="rounded-lg border bg-background p-4">
            <div className="text-sm font-semibold mb-3">{group.title}</div>
            <div className="space-y-2">
              {group.ids.map((id) => {
                const def = SUPPLIER_REPORT_COLUMNS.find((c) => c.id === id);
                if (!def) return null;

                const isChecked = selected.has(id);
                const isLocked = isLockedSupplierReportColumn(id);

                return (
                  <label key={id} className={cn('flex items-start gap-2 cursor-pointer', disabled && 'cursor-not-allowed opacity-60')}>
                    <Checkbox checked={isChecked} disabled={disabled || isLocked} onCheckedChange={(v) => setChecked(id, !!v)} />
                    <div className="leading-tight">
                      <div className="text-sm">{def.label}</div>
                      {isLocked && <div className="text-xs text-muted-foreground">Obrigatório</div>}
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

