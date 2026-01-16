
import React, { useMemo, useState } from 'react';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Calendar, Users, Package, Filter } from 'lucide-react';
import { CostChart } from './CostChart';
import { getDailyCacheRate } from '@/components/payroll/payrollCalculations';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { startOfMonth, subMonths, startOfYear, parseISO, isAfter, isBefore } from 'date-fns';

export const EstimatedCosts: React.FC = () => {
  const { events, assignments, personnel, workLogs, eventSupplierCosts, loading } = useEnhancedData();
  const [period, setPeriod] = useState('current_month');

  const costData = useMemo(() => {
    if (loading || !events.length) return [];

    // Filter events based on selected period
    const now = new Date();
    const filteredEvents = events.filter(event => {
      if (period === 'all') return true;
      if (!event.start_date) return false;
      
      const date = parseISO(event.start_date);
      
      if (period === 'current_month') {
        return isAfter(date, startOfMonth(now)) || date.getTime() === startOfMonth(now).getTime();
      }
      if (period === 'last_month') {
        const start = startOfMonth(subMonths(now, 1));
        const end = startOfMonth(now);
        return (isAfter(date, start) || date.getTime() === start.getTime()) && isBefore(date, end);
      }
      if (period === 'last_3_months') {
        const start = startOfMonth(subMonths(now, 3));
        return isAfter(date, start) || date.getTime() === start.getTime();
      }
      if (period === 'current_year') {
        const start = startOfYear(now);
        return isAfter(date, start) || date.getTime() === start.getTime();
      }
      return true;
    });

    // Create maps for faster lookups
    const personnelMap = new Map(personnel.map(p => [p.id, p]));
    const workLogsMap = new Map();
    
    // Group work logs by employee
    workLogs.forEach(log => {
      if (!workLogsMap.has(log.employee_id)) {
        workLogsMap.set(log.employee_id, []);
      }
      workLogsMap.get(log.employee_id).push(log);
    });

    const data = filteredEvents.map(event => {
      let baseCost = 0;
      let overtimeCost = 0;
      let supplierCost = 0;

      const eventAssignments = assignments.filter(a => a.event_id === event.id);

      eventAssignments.forEach(assignment => {
        const person = personnelMap.get(assignment.personnel_id);
        if (!person) return;

        // Calculate base cost (cachê per work day)
        const workDays = assignment.work_days?.length || 0;
        const dailyRate = getDailyCacheRate([assignment], person);
        baseCost += workDays * dailyRate;

        // Calculate overtime cost using work records
        const logsForPerson = workLogsMap.get(person.id) || [];
        const eventLogs = logsForPerson.filter(log => log.event_id === event.id);
        
        eventLogs.forEach(log => {
          // Use the overtime_hours directly from work_records table
          overtimeCost += (log.overtime_hours || 0) * (person.overtime_rate || 0);
        });
      });

      const supplierItems = eventSupplierCosts.filter(c => c.event_id === event.id);
      supplierItems.forEach(item => {
        supplierCost += item.total_amount || 0;
      });

      return {
        name: event.name,
        start_date: event.start_date,
        baseCost,
        overtimeCost,
        supplierCost,
        totalCost: baseCost + overtimeCost + supplierCost,
      };
    });
    
    const sortedData = data.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    
    // Only slice if viewing "all" to avoid performance issues, otherwise show all filtered
    return period === 'all' ? sortedData.slice(-12) : sortedData;
  }, [events, personnel, assignments, workLogs, eventSupplierCosts, loading, period]);

  const chartData = costData.map(event => ({
    name: event.name,
    baseCost: event.baseCost,
    overtimeCost: event.overtimeCost,
    supplierCost: (event as any).supplierCost || 0,
    totalCost: event.totalCost,
    date: event.start_date
  }));

  const totalCost = useMemo(() => costData.reduce((sum, d) => sum + d.totalCost, 0), [costData]);
  const totalBaseCost = useMemo(() => costData.reduce((sum, d) => sum + d.baseCost, 0), [costData]);
  const totalOvertimeCost = useMemo(() => costData.reduce((sum, d) => sum + d.overtimeCost, 0), [costData]);
  const totalSupplierCost = useMemo(() => costData.reduce((sum, d: any) => sum + (d.supplierCost || 0), 0), [costData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Custos Estimados</h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Análise financeira dos eventos</p>
        </div>
        <div className="w-full sm:w-auto">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-[180px] h-8 sm:h-9 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <SelectValue placeholder="Selecione o período" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Mês Atual</SelectItem>
              <SelectItem value="last_month">Mês Passado</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
              <SelectItem value="current_year">Ano Atual</SelectItem>
              <SelectItem value="all">Todos (Últimos 12)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
        <Card className="min-h-[72px] sm:min-h-[90px]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
              <span className="truncate">Total</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-base sm:text-lg lg:text-xl font-bold text-green-600 leading-tight">
              {formatCurrency(totalCost)}
            </p>
          </CardContent>
        </Card>

        <Card className="min-h-[72px] sm:min-h-[90px]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
              <span className="truncate">Cachês</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-base sm:text-lg lg:text-xl font-bold text-blue-600 leading-tight">
              {formatCurrency(totalBaseCost)}
            </p>
          </CardContent>
        </Card>

        <Card className="min-h-[72px] sm:min-h-[90px]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
              <span className="truncate">H. Extras</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-base sm:text-lg lg:text-xl font-bold text-orange-600 leading-tight">
              {formatCurrency(totalOvertimeCost)}
            </p>
          </CardContent>
        </Card>

        <Card className="min-h-[72px] sm:min-h-[90px]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-500 flex-shrink-0" />
              <span className="truncate">Fornecedores</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-base sm:text-lg lg:text-xl font-bold text-pink-600 leading-tight">
              {formatCurrency(totalSupplierCost)}
            </p>
          </CardContent>
        </Card>

        <Card className="min-h-[72px] sm:min-h-[90px]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500 flex-shrink-0" />
              <span className="truncate">Eventos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-base sm:text-lg lg:text-xl font-bold text-purple-600 leading-tight">
              {chartData.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base">Análise por Evento</CardTitle>
          <p className="text-xs text-muted-foreground">
            {period === 'all' 
              ? `Últimos ${chartData.length} eventos com decomposição de custos`
              : `Visualizando ${chartData.length} eventos no período selecionado`
            }
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <CostChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base">Legenda</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-blue-500 rounded flex-shrink-0"></div>
              <span>Custo Base (Cachês por dia)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-orange-500 rounded flex-shrink-0"></div>
              <span>Custo de Horas Extras</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-pink-500 rounded flex-shrink-0"></div>
              <span>Custos de Fornecedores (incluídos no total)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
