import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency } from '@/utils/formatters';
import { Input } from '@/components/ui/input';
import { createSupplierPayment, fetchSupplierPayments, deleteSupplierPayment } from '@/services/supplierService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type SupplierPaymentRow = {
  id: string;
  supplier_cost_id?: string;
  amount: number | string;
  payment_date: string;
  payment_type?: 'partial' | 'full';
  created_by?: { email?: string };
  notes?: string | null;
  created_by_id?: string | null;
};

interface SupplierPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cost: {
    id: string;
    description: string;
    supplier_name: string;
    total_amount: number;
    paid_amount: number;
  };
  onSuccess: () => void;
}

export const SupplierPaymentDialog: React.FC<SupplierPaymentDialogProps> = ({
  open,
  onOpenChange,
  cost,
  onSuccess
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { patchEventSupplierCostPayments } = useEnhancedData();
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SupplierPaymentRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const toAmount = React.useCallback((v: unknown): number => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }, []);

  const paidFromHistory = history.reduce((sum, p) => sum + toAmount(p.amount), 0);
  const effectivePaidAmount = historyLoaded ? paidFromHistory : (cost.paid_amount || 0);
  const remainingAmount = Math.max(0, (cost.total_amount || 0) - effectivePaidAmount);
  const isValidAmount = amount > 0 && amount <= remainingAmount + 0.01; // tolerance for rounding

  const loadHistory = React.useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = (await fetchSupplierPayments(cost.id)) as SupplierPaymentRow[];
      setHistory(data);
      setHistoryLoaded(true);

      const totalPaid = (data || []).reduce((sum, p) => sum + toAmount(p.amount), 0);
      patchEventSupplierCostPayments(cost.id, totalPaid);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Falha ao carregar histórico de pagamentos",
        variant: "destructive"
      });
    } finally {
      setLoadingHistory(false);
    }
  }, [cost.id, patchEventSupplierCostPayments, toast, toAmount]);

  useEffect(() => {
    if (open) {
      setAmount(0);
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setHistory([]);
      setHistoryLoaded(false);
      loadHistory();
    }
  }, [open, loadHistory]);

  const handleFullPayment = () => {
    setAmount(remainingAmount);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await createSupplierPayment({
        supplier_cost_id: cost.id,
        amount,
        payment_date: date,
        payment_type: amount >= remainingAmount - 0.01 ? 'full' : 'partial',
        notes
      }, user.id);

      toast({
        title: "Sucesso",
        description: "Pagamento registrado com sucesso"
      });
      
      setAmount(0);
      setNotes('');
      onSuccess();
      loadHistory();
      // Keep dialog open to show history or close? Usually close for action completion.
      // But if user wants to see history, they might want it open. 
      // Requirement says "Botões de ação... com interface idêntica à folha".
      // In payroll, it closes. But here we have history in the same place?
      // Let's keep it open to show the updated history/status, or close if it was full payment.
      if (amount >= remainingAmount - 0.01) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Falha ao registrar pagamento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSupplierPayment(deleteId);
      toast({
        title: "Sucesso",
        description: "Pagamento excluído com sucesso"
      });
      setDeleteId(null);
      onSuccess(); // Update parent
      loadHistory(); // Update local history
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Falha ao excluir pagamento",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Pagamentos</DialogTitle>
            <div className="text-sm text-muted-foreground">
              {cost.description} - {cost.supplier_name}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total do Custo:</span>
                <span className="font-semibold">{formatCurrency(cost.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Já Pago:</span>
                <span className="text-green-600">{formatCurrency(effectivePaidAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-sm font-medium">Restante:</span>
                <span className="font-bold text-primary">{formatCurrency(remainingAmount)}</span>
              </div>
            </div>

            {/* New Payment Form */}
            {remainingAmount > 0 && (
              <div className="space-y-4 border-b pb-6">
                <div className="flex gap-2 mb-4">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => setAmount(remainingAmount / 2)}
                    disabled={remainingAmount <= 0}
                  >
                    50%
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={handleFullPayment}
                    disabled={remainingAmount <= 0}
                  >
                    Integral
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Data do Pagamento</Label>
                  <div className="relative">
                    <Input 
                      type="date" 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)}
                      className="dark:text-white dark:[color-scheme:dark]" // Fix for dark mode calendar icon visibility
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Valor</Label>
                  <CurrencyInput
                    value={amount}
                    onChange={(val) => setAmount(Number(val))}
                    max={remainingAmount}
                    className={amount > remainingAmount ? "border-red-500" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalhes do pagamento..."
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSubmit} 
                  disabled={!isValidAmount || loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar Pagamento
                </Button>
              </div>
            )}

            {/* History */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                Histórico de Pagamentos
                {loadingHistory && <Loader2 className="h-3 w-3 animate-spin" />}
              </h4>
              
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum pagamento registrado
                  </p>
                ) : (
                  history.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-start p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                      <div>
                        <div className="font-medium">{formatCurrency(payment.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(payment.payment_date), "dd/MM/yyyy")}
                          {payment.notes && ` • ${payment.notes}`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Por: {payment.created_by?.email || 'Sistema'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => setDeleteId(payment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pagamento? O valor será estornado ao saldo devedor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
