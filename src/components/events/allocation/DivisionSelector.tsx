import React from 'react';
import { Label } from '@/components/ui/label';
import { CreatableCombobox } from '@/components/ui/creatable-combobox';
import { type Division } from '@/contexts/EnhancedDataContext';

interface DivisionSelectorProps {
  eventDivisions: Division[];
  selectedDivisionId: string;
  onSelectedDivisionChange: (divisionId: string) => void;
  // Callback for when a new division is created inline
  onNewDivisionCreate: (name: string) => void; 
  // Mantemos para compatibilidade, mas não usamos na UI nova
  divisionMode?: 'existing' | 'new';
  newDivisionName?: string;
  onDivisionModeChange?: (mode: 'existing' | 'new') => void;
  onNewDivisionNameChange?: (name: string) => void;
}

export const DivisionSelector: React.FC<DivisionSelectorProps> = ({
  eventDivisions,
  selectedDivisionId,
  onSelectedDivisionChange,
  onNewDivisionCreate,
  divisionMode,
  newDivisionName
}) => {
  
  const options = eventDivisions.map(d => ({
    value: d.id,
    label: d.name
  }));

  const handleChange = (value: string) => {
    if (options.some(opt => opt.value === value)) {
      onSelectedDivisionChange(value);
    } else {
      onNewDivisionCreate(value);
    }
  };

  return (
    <div className="space-y-3">
      <Label>Divisão <span className="text-red-500">*</span></Label>
      
      <CreatableCombobox
        options={options}
        value={divisionMode === 'new' ? newDivisionName : selectedDivisionId}
        onChange={handleChange}
        onCreate={onNewDivisionCreate}
        placeholder="Selecione ou crie uma divisão..."
        emptyText="Nenhuma divisão encontrada."
        createText="Criar nova divisão"
      />
      
      <p className="text-[0.8rem] text-muted-foreground">
        Digite para buscar. Se não existir, clique em "Criar" para adicionar.
      </p>
    </div>
  );
};
