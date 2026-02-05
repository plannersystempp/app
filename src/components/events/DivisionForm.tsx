import React, { useState, useEffect } from 'react';
import { useUpdateDivisionMutation, useCreateDivisionMutation } from '@/hooks/queries/useDivisionsQuery';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { type Division } from '@/contexts/EnhancedDataContext';

interface DivisionFormProps {
  division: Division | null;
  eventId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const DivisionForm: React.FC<DivisionFormProps> = ({
  division,
  eventId,
  open,
  onOpenChange,
  onSuccess
}) => {
  const updateDivision = useUpdateDivisionMutation();
  const createDivision = useCreateDivisionMutation();
  const { refreshDivisions } = useEnhancedData();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    default_entry_time: '',
    default_exit_time: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (division) {
      setFormData({
        name: division.name || '',
        default_entry_time: division.default_entry_time || '',
        default_exit_time: division.default_exit_time || ''
      });
    }
  }, [division]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (division) {
        // Update mode
        await updateDivision.mutateAsync({
          id: division.id,
          name: formData.name.trim(),
          description: null, // Removed from form but keeping for API compatibility if needed
          default_entry_time: formData.default_entry_time || null,
          default_exit_time: formData.default_exit_time || null,
        });
      } else if (eventId) {
        // Create mode
        await createDivision.mutateAsync({
          event_id: eventId,
          name: formData.name.trim(),
          description: null,
          default_entry_time: formData.default_entry_time || null,
          default_exit_time: formData.default_exit_time || null,
          order_index: 0 // Default order index
        });
      }
      
      await refreshDivisions();
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving division:', error);
      toast({
        title: "Erro",
        description: division ? "Falha ao atualizar divisão" : "Falha ao criar divisão",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (loading) return;
    onOpenChange(newOpen);
    if (!newOpen) {
      setFormData({ 
        name: '', 
        default_entry_time: '',
        default_exit_time: ''
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{division ? 'Editar Divisão' : 'Nova Divisão'}</DialogTitle>
          <DialogDescription>
            {division 
              ? 'Altere as informações da divisão do evento.' 
              : 'Crie uma nova divisão para organizar as alocações do evento.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Digite o nome da divisão"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default_entry_time">Horário de Entrada</Label>
              <Input
                id="default_entry_time"
                type="time"
                value={formData.default_entry_time}
                onChange={(e) => setFormData(prev => ({ ...prev, default_entry_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_exit_time">Horário de Saída</Label>
              <Input
                id="default_exit_time"
                type="time"
                value={formData.default_exit_time}
                onChange={(e) => setFormData(prev => ({ ...prev, default_exit_time: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
