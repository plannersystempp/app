import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeam } from '@/contexts/TeamContext';
import { usePersonnelQuery } from '@/hooks/queries/usePersonnelQuery';
import { personnelPaymentsService } from '@/services/personnelPaymentsService';
import { personnelPaymentsKeys } from '@/hooks/queries/usePersonnelPaymentsQuery';
import { toast } from '@/hooks/use-toast';
import type { PersonnelPayment } from '@/contexts/data/types';
import type { CreatePersonnelPaymentData } from '@/contexts/data/formTypes';

interface PersonnelPaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: PersonnelPayment;
  initialData?: Partial<CreatePersonnelPaymentData>;
}

export const PersonnelPaymentFormDialog = ({ open, onOpenChange, payment, initialData }: PersonnelPaymentFormDialogProps) => {
  const { activeTeam } = useTeam();
  const { data: personnel } = usePersonnelQuery();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CreatePersonnelPaymentData>({
    defaultValues: {
      team_id: activeTeam?.id || '',
      personnel_id: '',
      amount: 0,
      payment_due_date: '',
      description: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (payment) {
      form.reset({
        team_id: payment.team_id,
        personnel_id: payment.personnel_id,
        amount: Number(payment.amount),
        payment_due_date: payment.payment_due_date,
        description: payment.description,
        notes: payment.notes || '',
      });
    } else if (initialData) {
      form.reset({
        team_id: activeTeam?.id || '',
        personnel_id: initialData.personnel_id || '',
        amount: initialData.amount || 0,
        payment_due_date: initialData.payment_due_date || new Date().toISOString().split('T')[0],
        description: initialData.description || '',
        notes: initialData.notes || '',
        related_events: initialData.related_events || [],
      });
    } else if (activeTeam?.id) {
      form.reset({ // Reset to defaults if no payment or initialData
        team_id: activeTeam.id,
        personnel_id: '',
        amount: 0,
        payment_due_date: '',
        description: '',
        notes: '',
      });
    }
  }, [payment, initialData, activeTeam, form]);

  const onSubmit = async (data: CreatePersonnelPaymentData) => {
    try {
      setIsSubmitting(true);

      if (payment) {
        await personnelPaymentsService.update(payment.id, {
          amount: data.amount,
          payment_due_date: data.payment_due_date,
          description: data.description,
          notes: data.notes,
        });
        toast({
          title: 'Pagamento atualizado',
          description: 'O pagamento foi atualizado com sucesso.',
        });
      } else {
        await personnelPaymentsService.create(data);
        toast({
          title: 'Pagamento criado',
          description: 'O pagamento foi criado com sucesso.',
        });
      }

      queryClient.invalidateQueries({ queryKey: personnelPaymentsKeys.all });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o pagamento.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{payment ? 'Editar Pagamento' : 'Novo Pagamento Avulso'}</DialogTitle>
          <DialogDescription>
            {payment ? 'Atualize os dados do pagamento.' : 'Registre um pagamento avulso para um membro da equipe.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="personnel_id"
              rules={{ required: 'Selecione uma pessoa' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pessoa *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!payment}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma pessoa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {personnel?.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name} ({person.type === 'fixo' ? 'Fixo' : 'Freelancer'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              rules={{ required: 'A descrição é obrigatória' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Transporte de equipamentos - Eventos X e Y" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                rules={{ 
                  required: 'O valor é obrigatório',
                  min: { value: 0.01, message: 'O valor deve ser maior que zero' }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_due_date"
                rules={{ required: 'A data de vencimento é obrigatória' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Vencimento *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalhes adicionais sobre o pagamento..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : payment ? 'Atualizar' : 'Criar Pagamento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
