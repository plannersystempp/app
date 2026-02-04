import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PersonnelFormActionsProps {
  loading: boolean;
  onCancel: () => void;
  hasUnsavedPhoto?: boolean;
  disabled?: boolean;
  saveLabel?: string;
}

export const PersonnelFormActions: React.FC<PersonnelFormActionsProps> = ({
  loading,
  onCancel,
  hasUnsavedPhoto = false,
  disabled = false,
  saveLabel
}) => {
  return (
    <div className="flex gap-2 pt-4">
      <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
        Cancelar
      </Button>
      <Button 
        type="submit" 
        disabled={disabled} 
        className={cn(
          "flex-1",
          hasUnsavedPhoto && "animate-pulse ring-2 ring-primary ring-offset-2"
        )}
      >
        {loading ? 'Salvando...' : (saveLabel ?? 'Salvar')}
      </Button>
    </div>
  );
};
