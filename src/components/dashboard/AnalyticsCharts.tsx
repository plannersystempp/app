import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { Event, Personnel, EventSupplierCost } from '@/contexts/data/types';
import { getEventsByStatus, getMonthlyEvents, getCostsByCategory } from '@/utils/analyticsData';
import { PieChart as PieChartIcon, BarChart3, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { subMonths, isAfter, parseISO } from 'date-fns';
import { usePersistentFilter } from '@/hooks/usePersistentFilter';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';

interface AnalyticsChartsProps {
  events: Event[];
  personnel: Personnel[];
  costs: EventSupplierCost[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ events, personnel, costs }) => {
  const { user } = useAuth();
  const { activeTeam } = useTeam();

  const { value: eventsPeriod, setValue: setEventsPeriod } = usePersistentFilter<string>({
    filterName: 'analyticsEventsPeriod',
    defaultValue: '6',
    userId: user?.id,
    teamId: activeTeam?.id,
  });

  const { value: costsPeriod, setValue: setCostsPeriod } = usePersistentFilter<string>({
    filterName: 'analyticsCostsPeriod',
    defaultValue: '6',
    userId: user?.id,
    teamId: activeTeam?.id,
  });

  const eventsByStatus = useMemo(() => getEventsByStatus(events), [events]);
  const monthlyEvents = useMemo(() => getMonthlyEvents(events, parseInt(eventsPeriod)), [events, eventsPeriod]);

  const filteredCosts = useMemo(() => {
    const months = parseInt(costsPeriod);
    const cutoffDate = subMonths(new Date(), months);
    
    // Create a map of event dates for faster lookup
    const eventDateMap = new Map<string, Date>();
    events.forEach(e => {
      if (e.start_date) {
        eventDateMap.set(e.id, parseISO(e.start_date));
      }
    });

    return costs.filter(cost => {
      // Prioritize event date, fallback to cost creation date
      const dateToCheck = eventDateMap.get(cost.event_id) || (cost.created_at ? parseISO(cost.created_at) : new Date());
      return isAfter(dateToCheck, cutoffDate);
    });
  }, [costs, events, costsPeriod]);

  const costsByCategory = useMemo(() => getCostsByCategory(filteredCosts), [filteredCosts]);

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
      {/* Gráfico de Status (Pizza) */}
      <Card className="col-span-1 bg-muted/30 dark:bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Status
          </CardTitle>
          <CardDescription className="text-xs">Distribuição atual</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={eventsByStatus}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {eventsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#000' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico Mensal (Area/Barra) */}
      <Card className="col-span-1 lg:col-span-2 bg-muted/30 dark:bg-muted/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Evolução de Eventos
              </CardTitle>
              <CardDescription className="text-xs">Últimos {eventsPeriod} meses</CardDescription>
            </div>
            <Select value={eventsPeriod} onValueChange={setEventsPeriod}>
              <SelectTrigger className="w-[85px] h-8 text-xs">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 m</SelectItem>
                <SelectItem value="6">6 m</SelectItem>
                <SelectItem value="12">12 m</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyEvents}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: '#888888' }} 
                axisLine={false} 
                tickLine={false} 
                dy={10}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#888888' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="events" 
                name="Eventos"
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorEvents)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Custos por Categoria (Barra Vertical) - Top 5 */}
      <Card className="col-span-1 bg-muted/30 dark:bg-muted/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Custos com Fornecedores (Top 5)
              </CardTitle>
              <CardDescription className="text-xs">Últimos {costsPeriod} meses</CardDescription>
            </div>
            <Select value={costsPeriod} onValueChange={setCostsPeriod}>
              <SelectTrigger className="w-[85px] h-8 text-xs">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 m</SelectItem>
                <SelectItem value="6">6 m</SelectItem>
                <SelectItem value="12">12 m</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={costsByCategory}
              margin={{ top: 5, right: 5, left: -10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: '#888888' }} 
                axisLine={false} 
                tickLine={false}
                interval={0}
                dy={10}
              />
              <YAxis 
                domain={[0, 'auto']}
                tickFormatter={(val) => {
                  if (val >= 1000000) return `R$${(val/1000000).toFixed(1)}M`;
                  if (val >= 1000) return `R$${(val/1000).toFixed(0)}k`;
                  return `R$${val}`;
                }}
                tick={{ fontSize: 10, fill: '#888888' }}
                width={40}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Bar 
                dataKey="value" 
                name="Custo"
                radius={[4, 4, 0, 0]} 
              >
                {costsByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
