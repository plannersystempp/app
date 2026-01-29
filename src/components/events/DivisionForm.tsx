import React, { useState, useEffect } from 'react';
import { useUpdateDivisionMutation } from '@/hooks/queries/useDivisionsQuery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const DivisionForm: React.FC<DivisionFormProps> = ({
  division,
  open,
  onOpenChange,
  onSuccess
}) => {
  const updateDivision = useUpdateDivisionMutation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_entry_time: '',
    default_exit_time: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (division) {
      setFormData({
        name: division.name || '',
        description: division.description || '',
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

    if (!division) return;

    setLoading(true);
    try {
      await updateDivision.mutateAsync({
        ...division,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        default_entry_time: formData.default_entry_time || undefined,
        default_exit_time: formData.default_exit_time || undefined
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating division:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar divisão",
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
        description: '',
        default_entry_time: '',
        default_exit_time: ''
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Divisão</DialogTitle>
          <DialogDescription>
            Altere as informações da divisão do evento.
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

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Digite uma descrição opcional"
              rows={3}
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