import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Activity, AlertTriangle } from 'lucide-react';

const formatDate = (d: string) => new Date(d).toISOString().slice(0,10);

export const ErrorReportingTelemetry: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['error-telemetry'],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action, created_at, new_values')
        .in('action', ['ERROR_REPORT_OPENED','ERROR_REPORT_SUBMITTED'])
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const daily: Record<string, { opened: number; submitted: number }> = {};
  let opened = 0, submitted = 0;
  const urgencyCount: Record<string, number> = { low: 0, medium: 0, high: 0 };
  (data || []).forEach((row: any) => {
    const day = formatDate(row.created_at);
    daily[day] = daily[day] || { opened: 0, submitted: 0 };
    if (row.action === 'ERROR_REPORT_OPENED') {
      daily[day].opened++; opened++;
    } else if (row.action === 'ERROR_REPORT_SUBMITTED') {
      daily[day].submitted++; submitted++;
      const u = row.new_values?.urgency;
      if (u && urgencyCount[u] !== undefined) urgencyCount[u]++;
    }
  });
  const conversion = opened > 0 ? Math.round((submitted / opened) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-4 h-4"/>Aberturas (14d)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{opened}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4"/>Envios (14d)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{submitted}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>Conversão</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{conversion}%</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Por Dia</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(daily).map(([day, v]) => (
              <div key={day} className="flex items-center justify-between p-2 border rounded">
                <div className="text-sm font-medium">{day}</div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">Aberturas: {v.opened}</Badge>
                  <Badge variant="outline">Envios: {v.submitted}</Badge>
                </div>
              </div>
            ))}
            {Object.keys(daily).length === 0 && (<div className="text-sm text-muted-foreground">Sem dados</div>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Urgência (Envios)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Baixo: {urgencyCount.low}</Badge>
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Médio: {urgencyCount.medium}</Badge>
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Alto: {urgencyCount.high}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorReportingTelemetry;
