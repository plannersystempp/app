
import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useTeam } from '@/contexts/TeamContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { NoTeamSelected } from '@/components/shared/NoTeamSelected';
import { EventSelector } from './EventSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const PayrollManager: React.FC = () => {
  const { events } = useEnhancedData();
  const { activeTeam, userRole } = useTeam();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Redirecionar se eventId estiver na URL (manter compatibilidade)
  useEffect(() => {
    const eventIdParam = searchParams.get('eventId');
    if (eventIdParam && events.some(e => e.id === eventIdParam)) {
      navigate(`/app/folha/${eventIdParam}`, { replace: true });
    }
  }, [searchParams, events, navigate]);

  const canManagePayroll = userRole === 'admin';

  if (!activeTeam) {
    return (
      <NoTeamSelected
        title="Gestão de Folha de Pagamento"
        description="Selecione uma equipe para gerenciar a folha de pagamento."
      />
    );
  }

  if (!canManagePayroll) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Apenas administradores podem gerenciar a folha de pagamento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-3 sm:space-y-4 md:space-y-6 overflow-x-hidden">
      {/* Cabeçalho */}
      <div className="space-y-1">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight">
          Gestão de Folha de Pagamento
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Selecione um evento para visualizar e gerenciar a folha de pagamento
        </p>
      </div>

      <EventSelector
        events={events as any}
        selectedEventId=""
        onEventChange={() => {}}
      />
    </div>
  );
};
