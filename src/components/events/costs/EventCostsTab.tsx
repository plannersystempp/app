import React, { useState } from 'react';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { AddSupplierCostDialog } from './AddSupplierCostDialog';
import { SupplierCostCard } from './SupplierCostCard';
import { SupplierCostSummary } from './SupplierCostSummary';

interface EventCostsTabProps {
  eventId: string;
}

export const EventCostsTab: React.FC<EventCostsTabProps> = ({ eventId }) => {
  const { eventSupplierCosts, events, deleteEventSupplierCost } = useEnhancedData();
  const { user } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCost, setEditingCost] = useState<any>(null);

  const isAdmin = user?.role === 'admin';
  const costs = eventSupplierCosts.filter(cost => cost.event_id === eventId);
  const event = events.find(e => e.id === eventId);
  const eventName = event?.name || 'Evento';

  const handleEdit = (cost: any) => {
    setEditingCost(cost);
    setShowAddDialog(true);
  };

  const handleDelete = async (cost: any) => {
    if (window.confirm('Tem certeza que deseja excluir este custo?')) {
      await deleteEventSupplierCost(cost.id);
    }
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingCost(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Custos de Fornecedores</h3>
        {isAdmin && (
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Custo
          </Button>
        )}
      </div>

      {costs.length === 0 ? (
        <EmptyState
          icon={<DollarSign className="h-12 w-12" />}
          title="Nenhum custo registrado"
          description="Adicione custos de fornecedores para este evento"
        >
          {isAdmin && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Custo
            </Button>
          )}
        </EmptyState>
      ) : (
        <>
          <SupplierCostSummary costs={costs} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {costs.map((cost) => (
              <SupplierCostCard
                key={cost.id}
                cost={cost}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {showAddDialog && (
        <AddSupplierCostDialog
          eventId={eventId}
          eventName={eventName}
          cost={editingCost}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  );
};
