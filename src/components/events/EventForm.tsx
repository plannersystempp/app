
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { useCreateEventMutation, useUpdateEventMutation } from '@/hooks/queries/useEventsQuery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCheckSubscriptionLimits } from '@/hooks/useCheckSubscriptionLimits';
import { UpgradePrompt } from '@/components/subscriptions/UpgradePrompt';
import type { Event } from '@/contexts/EnhancedDataContext';

interface EventFormProps {
  event?: Event;
  onClose: () => void;
  onSuccess: () => void;
}

interface EventFormData {
  name: string;
  description: string;
  location: string;
  client_contact_phone: string;
  start_date: string;
  end_date: string;
  setup_start_date: string;
  setup_end_date: string;
  payment_due_date: string;
  status: 'planejado' | 'em_andamento' | 'concluido' | 'cancelado' | 'concluido_pagamento_pendente';
}

export const EventForm: React.FC<EventFormProps> = ({ event, onClose, onSuccess }) => {
  const createEvent = useCreateEventMutation();
  const updateEvent = useUpdateEventMutation();
  const { user } = useAuth();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const checkLimits = useCheckSubscriptionLimits();
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const [limitCheckResult, setLimitCheckResult] = useState<any>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<EventFormData>({
    defaultValues: event || {
      name: '',
      description: '',
      location: '',
      client_contact_phone: '',
      start_date: '',
      end_date: '',
      setup_start_date: '',
      setup_end_date: '',
      payment_due_date: '',
      status: 'planejado'
    }
  });

  const watchedStatus = watch('status');
  const watchedStartDate = watch('start_date');
  const watchedEndDate = watch('end_date');

  const handleStartDateChange = (date: string) => {
    setValue('start_date', date);
    // Se a data de fim já estiver definida e for anterior à nova data de início, limpe-a
    if (watchedEndDate && new Date(watchedEndDate) < new Date(date)) {
      setValue('end_date', '');
      toast({
        title: "Aviso",
        description: "A data de fim foi reiniciada pois era anterior à nova data de início.",
      });
    }
  };

  const handleEndDateChange = (date: string) => {
    // Validação: Não permite selecionar uma data de fim anterior à data de início
    if (watchedStartDate && new Date(date) < new Date(watchedStartDate)) {
      toast({
        title: "Data Inválida",
        description: "A data de fim não pode ser anterior à data de início.",
        variant: "destructive",
      });
      return; // Impede a atualização do estado
    }
    setValue('end_date', date);
  };

  const onSubmit = async (data: EventFormData) => {
    try {
      // Validação de campos obrigatórios
      if (!data.name.trim() || !data.start_date || !data.end_date) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios",
          variant: "destructive"
        });
        return;
      }

      // Verificar limites apenas ao criar novo evento
      if (!event && activeTeam) {
        const result = await checkLimits.mutateAsync({
          teamId: activeTeam.id,
          action: 'create_event'
        });

        if (!result.can_proceed) {
          setLimitCheckResult(result);
          setUpgradePromptOpen(true);
          return;
        }
      }

      console.log('Submitting event form with data:', data);
      
      // Convert empty strings to null for optional fields
      const cleanData = {
        ...data,
        location: data.location?.trim() || null,
        client_contact_phone: data.client_contact_phone?.trim() || null,
        payment_due_date: data.payment_due_date || null,
        setup_start_date: data.setup_start_date || null,
        setup_end_date: data.setup_end_date || null
      };
      
      if (event) {
        console.log('Updating existing event:', event.id);
        await updateEvent.mutateAsync({ ...event, ...cleanData });
        onSuccess();
        onClose();
      } else {
        console.log('Creating new event');
        await createEvent.mutateAsync(cleanData);
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error submitting event form:', error);
      toast({
        title: "Erro",
        description: event ? "Falha ao atualizar evento" : "Falha ao criar evento",
        variant: "destructive"
      });
    }
  };

  return (
  <Dialog open onOpenChange={onClose}>
    <DialogContent className="w-[95vw] max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{event ? 'Editar Evento' : 'Criar Novo Evento'}</DialogTitle>
        <DialogDescription className="sr-only">
          Formulário para {event ? 'editar evento existente' : 'criar novo evento'}
        </DialogDescription>
      </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Evento <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              {...register('name', { required: 'Nome é obrigatório' })}
              placeholder="Digite o nome do evento"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descrição opcional do evento"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Local do Evento</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="Ex: Teatro Municipal, Centro de Convenções..."
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_contact_phone">Telefone de Contato do Cliente</Label>
            <Input
              id="client_contact_phone"
              {...register('client_contact_phone')}
              placeholder="Ex: (11) 99999-9999"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data de Início <span className="text-red-500">*</span></Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date', { required: 'Data de início é obrigatória' })}
                onChange={(e) => handleStartDateChange(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.start_date && (
                <p className="text-sm text-destructive">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Data de Fim <span className="text-red-500">*</span></Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date', { required: 'Data de fim é obrigatória' })}
                onChange={(e) => handleEndDateChange(e.target.value)}
                min={watchedStartDate}
                disabled={isSubmitting}
              />
              {errors.end_date && (
                <p className="text-sm text-destructive">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="setup_start_date">Início da Montagem</Label>
              <Input
                id="setup_start_date"
                type="date"
                {...register('setup_start_date')}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="setup_end_date">Fim da Montagem</Label>
              <Input
                id="setup_end_date"
                type="date"
                {...register('setup_end_date')}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_due_date">Data de Vencimento do Pagamento</Label>
            <Input
              id="payment_due_date"
              type="date"
              {...register('payment_due_date')}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={watchedStatus} 
              onValueChange={(value) => setValue('status', value as any)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planejado">Planejado</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="min-h-[44px]">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-h-[44px]">
              {isSubmitting ? 'Salvando...' : (event ? 'Salvar Alterações' : 'Criar Evento')}
            </Button>
          </div>
        </form>
      </DialogContent>
      <UpgradePrompt
        open={upgradePromptOpen}
        onOpenChange={setUpgradePromptOpen}
        reason={limitCheckResult?.reason || ''}
        currentPlan={limitCheckResult?.current_plan}
        limit={limitCheckResult?.limit}
        currentCount={limitCheckResult?.current_count}
      />
    </Dialog>
  );
};
