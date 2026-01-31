import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEnhancedData, type EventSupplierCost } from '@/contexts/EnhancedDataContext';
import { useTeam } from '@/contexts/TeamContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { notificationService } from '@/services/notificationService';

/**
 * Normaliza categoria para um dos valores aceitos pelo banco de dados.
 * Mapeia sinônimos e variações para os valores válidos.
 */
function sanitizeCategory(input?: string): 'som' | 'luz' | 'video' | 'catering' | 'transporte' | 'cenografia' | 'seguranca' | 'outro' {
  if (!input) return 'outro';
  
  const normalized = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();
  
  const categoryMap: Record<string, 'som' | 'luz' | 'video' | 'catering' | 'transporte' | 'cenografia' | 'seguranca' | 'outro'> = {
    'som': 'som',
    'audio': 'som',
    'áudio': 'som',
    'luz': 'luz',
    'iluminacao': 'luz',
    'iluminação': 'luz',
    'video': 'video',
    'vídeo': 'video',
    'catering': 'catering',
    'alimentacao': 'catering',
    'alimentação': 'catering',
    'transporte': 'transporte',
    'logistica': 'transporte',
    'logística': 'transporte',
    'cenografia': 'cenografia',
    'montagem': 'cenografia',
    'seguranca': 'seguranca',
    'segurança': 'seguranca',
    'outro': 'outro',
    'outros': 'outro'
  };
  
  return categoryMap[normalized] || 'outro';
}

interface AddSupplierCostDialogProps {
  eventId: string;
  eventName: string;
  cost?: EventSupplierCost | null;
  onClose: () => void;
}

export const AddSupplierCostDialog: React.FC<AddSupplierCostDialogProps> = ({
  eventId,
  eventName,
  cost,
  onClose
}) => {
  const { suppliers, supplierItems, addEventSupplierCost, updateEventSupplierCost, patchEventSupplierCostPayments } = useEnhancedData();
  const { activeTeam } = useTeam();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [formData, setFormData] = useState({
    supplier_name: '',
    description: '',
    category: 'outro' as 'som' | 'luz' | 'video' | 'catering' | 'transporte' | 'cenografia' | 'seguranca' | 'outro',
    unit_price: '',
    quantity: '1',
    payment_status: 'pending' as 'pending' | 'partially_paid' | 'paid',
    paid_amount: '0',
    payment_date: '',
    notes: ''
  });

  useEffect(() => {
    if (cost) {
      setFormData({
        supplier_name: cost.supplier_name,
        description: cost.description,
        category: sanitizeCategory(cost.category),
        unit_price: cost.unit_price.toString(),
        quantity: cost.quantity.toString(),
        payment_status: cost.payment_status,
        paid_amount: cost.paid_amount.toString(),
        payment_date: cost.payment_date || '',
        notes: cost.notes || ''
      });
      if (cost.supplier_id) {
        setSelectedSupplier(cost.supplier_id);
      }
    }
  }, [cost]);

  const availableItems = selectedSupplier
    ? supplierItems.filter(item => item.supplier_id === selectedSupplier)
    : [];

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplier(supplierId);
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setFormData(prev => ({ ...prev, supplier_name: supplier.name }));
    }
  };

  const handleItemChange = (itemId: string) => {
    setSelectedItem(itemId);
    const item = supplierItems.find(i => i.id === itemId);
    if (item) {
      setFormData(prev => ({
        ...prev,
        description: item.item_name,
        category: sanitizeCategory(item.category),
        unit_price: item.price?.toString() || ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.supplier_name.trim() || !formData.description.trim() || !formData.unit_price) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha fornecedor, descrição e preço unitário",
        variant: "destructive"
      });
      return;
    }

    const unitPrice = parseFloat(formData.unit_price);
    const quantity = parseFloat(formData.quantity);

    if (unitPrice <= 0 || quantity <= 0) {
      toast({
        title: "Valores inválidos",
        description: "Preço e quantidade devem ser maiores que zero",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const supplierIdSanitized = selectedSupplier && selectedSupplier !== 'none' ? selectedSupplier : undefined;
      const sanitizedCategory = sanitizeCategory(formData.category);
      const data = {
        event_id: eventId,
        supplier_id: supplierIdSanitized,
        supplier_name: formData.supplier_name,
        description: formData.description,
        category: sanitizedCategory,
        unit_price: unitPrice,
        quantity,
        notes: formData.notes || undefined
      };

      if (cost) {
        // Na edição, não atualizamos campos de pagamento aqui. Devem ser geridos pelo diálogo de pagamentos.
        await updateEventSupplierCost({
          ...cost,
          ...data,
        });
      } else {
        const newId = await addEventSupplierCost({
            ...data,
            // Inicialmente 0, será atualizado se houver pagamento inicial
            paid_amount: 0, 
            payment_status: 'pending'
        });
        
        if (!newId) return;

        // Se houver pagamento inicial, cria o registro de pagamento
        const initialPaidAmount = parseFloat(formData.paid_amount);
        if (initialPaidAmount > 0 && user?.id) {
            const { createSupplierPayment } = await import('@/services/supplierService');
            await createSupplierPayment({
                supplier_cost_id: newId,
                amount: initialPaidAmount,
                payment_date: formData.payment_date || new Date().toISOString().split('T')[0],
                payment_type: initialPaidAmount >= (unitPrice * quantity) ? 'full' : 'partial',
                notes: 'Pagamento inicial no cadastro'
            }, user.id);

            patchEventSupplierCostPayments(newId, initialPaidAmount);
        }
        
        if (activeTeam?.id) {
          notificationService
            .notifySupplierCostAdded(
              formData.supplier_name,
              eventName,
              unitPrice * quantity,
              activeTeam.id
            )
            .catch(() => {});
        }
      }
      onClose();
    } catch (error) {
      console.error('Error saving cost:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o custo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const total = parseFloat(formData.unit_price || '0') * parseFloat(formData.quantity || '1');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {cost ? 'Editar Custo' : 'Adicionar Custo de Fornecedor'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Select value={selectedSupplier} onValueChange={handleSupplierChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Fornecedor avulso</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSupplier && availableItems.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="item">Item</Label>
                <Select value={selectedItem} onValueChange={handleItemChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um item" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.item_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier_name">Nome do Fornecedor *</Label>
            <Input
              id="supplier_name"
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              placeholder="Nome do fornecedor"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Locação de equipamento de som"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="som">Som/Áudio</SelectItem>
                  <SelectItem value="luz">Luz/Iluminação</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="catering">Catering/Alimentação</SelectItem>
                  <SelectItem value="transporte">Transporte/Logística</SelectItem>
                  <SelectItem value="cenografia">Cenografia/Montagem</SelectItem>
                  <SelectItem value="seguranca">Segurança</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_price">Preço Unitário *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="1"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">
              Total: R$ {total.toFixed(2)}
            </p>
          </div>

          {!cost && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_status">Status do Pagamento</Label>
                  <Select
                    value={formData.payment_status}
                    onValueChange={(value: any) => setFormData({ ...formData, payment_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="partially_paid">Pago Parcialmente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paid_amount">Valor Pago</Label>
                  <Input
                    id="paid_amount"
                    type="number"
                    step="0.01"
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_date">Data do Pagamento</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="dark:text-white dark:[color-scheme:dark]"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cost ? 'Atualizar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
