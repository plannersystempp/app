import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useSuperAdminDashboard } from '@/hooks/useSuperAdminDashboard';
import { UserGrowthChart } from './charts/UserGrowthChart';
import { MRRChart } from './charts/MRRChart';
import { ConversionFunnelChart } from './charts/ConversionFunnelChart';
import { ActivityHeatmap } from './charts/ActivityHeatmap';
import { AlertCards } from './AlertCards';
import { DemoAccountManager } from './DemoAccountManager';
import { Users, Building2, Calendar, DollarSign, TrendingUp, UserCheck, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { Bug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function SuperAdminDashboard() {
  const { data: dashboardData, isLoading, error, refetch } = useSuperAdminDashboard();
  const { data: reportTelemetry } = useQuery({
    queryKey: ['superadmin-report-telemetry'],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action, created_at, new_values')
        .in('action', ['ERROR_REPORT_OPENED','ERROR_REPORT_SUBMITTED'])
        .gte('created_at', since);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-12">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">Erro ao carregar dashboard</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        </div>
      </Card>
    );
  }

  if (!dashboardData) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          Nenhum dado disponível
        </div>
      </Card>
    );
  }

  const { stats, user_growth, mrr_history, top_teams } = dashboardData;
  let opened = 0, submitted = 0, high = 0;
  (reportTelemetry || []).forEach((row: any) => {
    if (row.action === 'ERROR_REPORT_OPENED') opened++;
    if (row.action === 'ERROR_REPORT_SUBMITTED') {
      submitted++;
      if (row.new_values?.urgency === 'high') high++;
    }
  });
  const conversion = opened > 0 ? Math.round((submitted / opened) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Demo Account Manager */}
      <DemoAccountManager />

      {/* Alertas Proativos */}
      {(stats.expiring_trials_7d > 0 || stats.orphan_users > 0 || stats.unassigned_errors > 0) && (
        <AlertCards
          expiringTrials={stats.expiring_trials_7d}
          orphanUsers={stats.orphan_users}
          unassignedErrors={stats.unassigned_errors}
        />
      )}

      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_users}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.active_users} aprovados
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Equipes</CardTitle>
            <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_teams}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.active_subscriptions} ativas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_events}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total_personnel} colaboradores
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {Number(stats.current_mrr).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.trial_conversion_rate}% conversão
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI de Reportes de Erro (14 dias) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aberturas de Reporte</CardTitle>
            <Bug className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opened}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Envios de Reporte</CardTitle>
            <Bug className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversion}%</div>
            <p className="text-xs text-muted-foreground mt-1">Críticos: {high}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Crescimento de Usuários
            </CardTitle>
            <CardDescription>Novos usuários nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {user_growth && user_growth.length > 0 ? (
              <UserGrowthChart data={user_growth} />
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Database className="h-12 w-12 mx-auto opacity-20" />
                  <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Receita Mensal (MRR)
            </CardTitle>
            <CardDescription>Histórico dos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {mrr_history && mrr_history.length > 0 ? (
              <MRRChart data={mrr_history} />
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center space-y-2">
                  <DollarSign className="h-12 w-12 mx-auto opacity-20" />
                  <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Conversão de Assinaturas
            </CardTitle>
            <CardDescription>Trial vs Ativo</CardDescription>
          </CardHeader>
          <CardContent>
            <ConversionFunnelChart
              trialCount={stats.trial_subscriptions}
              activeCount={stats.active_subscriptions}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Top 5 Equipes Mais Ativas
            </CardTitle>
            <CardDescription>Por número de eventos criados</CardDescription>
          </CardHeader>
          <CardContent>
            {top_teams && top_teams.length > 0 ? (
              <ActivityHeatmap topTeams={top_teams} />
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Building2 className="h-12 w-12 mx-auto opacity-20" />
                  <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
