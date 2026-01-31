import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, ChevronRight, Clock, DollarSign, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';
import { formatDateBR } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatters';
import type { Event } from '@/contexts/DataContext';
import { useTeam } from '@/contexts/TeamContext';
import { getCachedEventStatus } from './eventStatusCache';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface EventSelectorProps {
  events: Event[];
  selectedEventId: string;
  onEventChange: (eventId: string) => void;
}

// Normaliza data para meio-dia local, evitando desvios por fuso/horário
const normalizeDate = (dateStr?: string) => {
  if (!dateStr) return null;
  return new Date(`${dateStr}T12:00:00`);
};

// Usa payment_due_date; se ausente, usa end_date como fallback
const getEffectiveDueDate = (event: Event): string | undefined => {
  return event.payment_due_date || event.end_date || undefined;
};

// Retorna true se o vencimento é hoje ou já passou (ignorando horário)
const isDueTodayOrPast = (dateStr?: string) => {
  const due = normalizeDate(dateStr);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueOnly = new Date(due);
  dueOnly.setHours(0, 0, 0, 0);
  return dueOnly.getTime() <= today.getTime();
};

const getStatusConfig = (status: string) => {
  if (status === 'em_andamento') {
    return {
      label: 'Em Andamento',
      className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200'
    };
  }
  if (status === 'concluido' || status === 'concluido_pagamento_pendente') {
    return {
      label: 'Concluído',
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200'
    };
  }
  return {
    label: 'Planejado',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200'
  };
};

export const EventSelector: React.FC<EventSelectorProps> = ({
  events,
  selectedEventId,
  onEventChange
}) => {
  const navigate = useNavigate();
  const { activeTeam } = useTeam();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('concluido_pagamento_pendente');
  
  // Usar função SQL otimizada para obter status de pagamento dos eventos
  const [eventsWithStatus, setEventsWithStatus] = useState<Array<{
    event_id: string;
    event_name: string;
    event_status: string;
    end_date: string;
    payment_due_date: string | null;
    allocated_count: number;
    paid_count: number;
    has_pending_payments: boolean;
  }>>([]);

  useEffect(() => {
    const fetchEventsStatus = async () => {
      if (!activeTeam) return;
      try {
        // Usar cache para reduzir queries redundantes
        const data = await getCachedEventStatus(activeTeam.id);
        setEventsWithStatus(data);
      } catch (e) {
        console.error('Erro ao carregar status de eventos:', e);
      }
    };
    fetchEventsStatus();
  }, [activeTeam]);

  // Criar map para lookup rápido
  const eventStatusMap = useMemo(() => {
    const map = new Map<string, typeof eventsWithStatus[0]>();
    eventsWithStatus.forEach(e => map.set(e.event_id, e));
    return map;
  }, [eventsWithStatus]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase());

      // Obter informações de status de pagamento do evento
      const statusInfo = eventStatusMap.get(event.id);
      const hasPending = statusInfo?.has_pending_payments ?? false;
      
      // Regra para filtro "Pagamento Pendente":
      // - Excluir cancelados e planejados
      // - Incluir eventos com pending payments reais (baseado em alocações vs pagamentos)
      const matchesPendingFilter = (
        event.status !== 'cancelado' && 
        event.status !== 'planejado' &&
        hasPending
      );

      const matchesStatus =
        statusFilter === 'all' ||
        event.status === statusFilter ||
        (statusFilter === 'concluido_pagamento_pendente' && matchesPendingFilter);

      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      const dateA = new Date(a.start_date || '');
      const dateB = new Date(b.start_date || '');
      return dateB.getTime() - dateA.getTime();
    });
  }, [events, searchTerm, statusFilter, eventStatusMap]);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="planejado">Planejado</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="concluido_pagamento_pendente">Pagamento Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Event Count */}
      <p className="text-sm text-muted-foreground">
        {filteredEvents.length} {filteredEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
      </p>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvents.map((event) => {
          const statusConfig = getStatusConfig(event.status);
          const statusInfo = eventStatusMap.get(event.id);
          const dueStr = getEffectiveDueDate(event);
          const isDue = isDueTodayOrPast(dueStr);
          
          const hasPendingPayments = statusInfo?.has_pending_payments ?? false;
          
          // Cálculo de progresso de pagamentos
          const totalAllocated = statusInfo?.allocated_count || 0;
          const totalPaid = statusInfo?.paid_count || 0;
          const progressPercent = totalAllocated > 0 ? (totalPaid / totalAllocated) * 100 : 0;
          
          const showDueWarning = (
            event.status === 'concluido_pagamento_pendente' ||
            hasPendingPayments ||
            (isDue && event.status !== 'concluido')
          );

          return (
            <Card 
              key={event.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg border-l-4 animate-in fade-in duration-300",
                selectedEventId === event.id ? 'ring-2 ring-primary border-primary' : '',
                hasPendingPayments ? 'border-l-amber-500' : 'border-l-green-500'
              )}
              onClick={() => navigate(`/app/folha/${event.id}`)}
            >
              <CardHeader className="p-4 pb-2">
                 <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h3 className="font-semibold text-base line-clamp-1" title={event.name}>
                            {event.name}
                        </h3>
                        {event.location && (
                            <div className="flex items-center text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 mr-1" />
                                <span className="line-clamp-1">{event.location}</span>
                            </div>
                        )}
                    </div>
                    <Badge variant="outline" className={cn("ml-2 whitespace-nowrap text-[10px]", statusConfig.className)}>
                        {statusConfig.label}
                    </Badge>
                 </div>
              </CardHeader>

              <CardContent className="p-4 py-2 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {event.start_date && formatDateBR(event.start_date)}
                    {event.end_date && event.start_date !== event.end_date && 
                      ` - ${formatDateBR(event.end_date)}`}
                  </span>
                </div>

                {/* Seção Financeira */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Pagamentos Realizados</span>
                        <span className="font-medium">
                            {totalPaid}/{totalAllocated}
                        </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" indicatorClassName={hasPendingPayments ? "bg-amber-500" : "bg-green-500"} />
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-2 border-t bg-muted/10 flex justify-between items-center">
                 {dueStr && (
                    <div className={cn("flex items-center gap-1.5 text-xs font-medium", showDueWarning ? "text-red-600" : "text-muted-foreground")}>
                       <Clock className="h-3.5 w-3.5" />
                       <span>Vence: {formatDateBR(dueStr)}</span>
                    </div>
                 )}
                 
                 <div className="text-xs text-primary font-medium flex items-center ml-auto">
                    Gerenciar Folha
                    <ChevronRight className="h-3 w-3 ml-1" />
                 </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum evento encontrado</p>
        </div>
      )}
    </div>
  );
};
