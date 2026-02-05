import React from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useEventsQuery } from '@/hooks/queries/useEventsQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

// Configurar localizador com moment em português
moment.locale('pt-br');
const localizer = momentLocalizer(moment);

// Mensagens em português
const messages = {
  allDay: 'Dia inteiro',
  previous: 'Anterior',
  next: 'Próximo',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Não há eventos neste período.',
};

export const EventsCalendarView = () => {
  const navigate = useNavigate();
  const { data: events, isLoading } = useEventsQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendário de Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[500px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transformar eventos para o formato do BigCalendar
  const calendarEvents = events?.map(event => ({
    id: event.id,
    title: event.name,
    start: new Date(event.start_date),
    end: new Date(event.end_date),
    allDay: false, // Pode ajustar se necessário
    resource: event
  })) || [];

  const handleEventClick = (event: any) => {
    // Navegar para a gestão do evento
    navigate(`/events/${event.id}/manage`);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Calendário de Eventos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[600px] bg-white p-2 rounded-md">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            messages={messages}
            culture="pt-br"
            onSelectEvent={handleEventClick}
            views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
            defaultView={Views.MONTH}
            eventPropGetter={(event) => {
              // Estilização condicional baseada no status (opcional)
              const status = (event.resource as any).status;
              let backgroundColor = '#3b82f6'; // blue-500 default
              
              if (status === 'confirmado') backgroundColor = '#22c55e'; // green-500
              if (status === 'cancelado') backgroundColor = '#ef4444'; // red-500
              if (status === 'planejado') backgroundColor = '#eab308'; // yellow-500

              return {
                style: {
                  backgroundColor,
                  borderRadius: '4px',
                }
              };
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
