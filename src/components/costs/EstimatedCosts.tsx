
import React, { useMemo } from 'react';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar, Users, Package } from 'lucide-react';
import { CostChart } from './CostChart';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export const EstimatedCosts: React.FC = () => {
  const { events, assignments, personnel, workLogs, eventSupplierCosts, loading } = useEnhancedData();

  if (loading) {
    return <LoadingSpinner />;
  }

  const costData = useMemo(() => {
    if (loading || !events.length) return [];

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

    const data = events.map(event => {
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
    
    return data.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()).slice(-10);
  }, [events, personnel, assignments, workLogs, eventSupplierCosts, loading]);

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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Custos Estimados</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Análise financeira dos eventos</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="min-h-[100px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="truncate">Total</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm sm:text-lg lg:text-2xl font-bold text-green-600 leading-tight">
              {formatCurrency(totalCost)}
            </p>
          </CardContent>
        </Card>

        <Card className="min-h-[100px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="truncate">Cachês</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm sm:text-lg lg:text-2xl font-bold text-blue-600 leading-tight">
              {formatCurrency(totalBaseCost)}
            </p>
          </CardContent>
        </Card>

        <Card className="min-h-[100px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="truncate">H. Extras</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm sm:text-lg lg:text-2xl font-bold text-orange-600 leading-tight">
              {formatCurrency(totalOvertimeCost)}
            </p>
          </CardContent>
        </Card>

        <Card className="min-h-[100px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-pink-500 flex-shrink-0" />
              <span className="truncate">Fornecedores</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm sm:text-lg lg:text-2xl font-bold text-pink-600 leading-tight">
              {formatCurrency(totalSupplierCost)}
            </p>
          </CardContent>
        </Card>

        <Card className="min-h-[100px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="truncate">Eventos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm sm:text-lg lg:text-2xl font-bold text-purple-600 leading-tight">
              {chartData.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Análise por Evento</CardTitle>
          <p className="text-sm text-muted-foreground">
            Últimos {chartData.length} eventos com decomposição de custos
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <CostChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Legenda</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded flex-shrink-0"></div>
              <span>Custo Base (Cachês por dia)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded flex-shrink-0"></div>
              <span>Custo de Horas Extras</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-pink-500 rounded flex-shrink-0"></div>
              <span>Custos de Fornecedores (incluídos no total)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
