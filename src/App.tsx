
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './providers/ThemeProvider';
import { SessionTimeout } from './components/shared/SessionTimeout';
import { PWAManager } from './components/shared/PWAManager';
import { EnhancedDataProvider } from './contexts/EnhancedDataContext';
import { TeamProvider } from './contexts/TeamContext';
import { LoginScreen } from './components/LoginScreen';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { Layout } from './components/Layout';
import { Toaster } from './components/ui/toaster';
import Dashboard from './components/Dashboard';
import { ManagePersonnel } from './components/personnel/ManagePersonnel';
import { ManageFunctions } from './components/functions/ManageFunctions';
import { ManageEvents } from './components/events/ManageEvents';
import { EventDetail } from './components/events/EventDetail';
import { EventFreelancersRatingPage } from './pages/EventFreelancersRatingPage';
import { EstimatedCosts } from './components/costs/EstimatedCosts';
import { PayrollManager } from './components/payroll/PayrollManager';
import { PayrollEventView } from './components/payroll/PayrollEventView';
import { PayrollReportPage } from './pages/PayrollReportPage';
import PersonnelExportPage from './pages/PersonnelExportPage';
import PersonnelPaymentsPage from './pages/PersonnelPayments';
import PersonnelPaymentsReportPage from './pages/PersonnelPaymentsReportPage';
import PaymentForecastReportPage from './pages/PaymentForecastReportPage';
import SupplierPaymentsReportPage from './pages/SupplierPaymentsReportPage';
import ReportarErroPage from './pages/ReportarErro';
import { Settings } from './components/admin/Settings';
import { SettingsPage } from './components/SettingsPage';
import { TeamManagement } from './components/teams/TeamManagement';
import { ManageSuppliers } from './components/suppliers/ManageSuppliers';
import { Card, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary';
import { DashboardErrorBoundary } from '@/components/shared/DashboardErrorBoundary';
import { FormErrorBoundary } from '@/components/shared/FormErrorBoundary';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';
import { TermsAcceptanceModal } from './components/shared/TermsAcceptanceModal';
import { supabase } from './integrations/supabase/client';
import './App.css';
import { EnhancedAdminSettings } from './components/admin/EnhancedAdminSettings';
import { useStripeCheckoutEnhanced } from './hooks/useStripeCheckoutEnhanced';
import SuperAdmin from './pages/SuperAdmin';
import UpgradePlan from './pages/UpgradePlan';
import PlansPage from './pages/PlansPage';
import PaymentSuccess from './pages/PaymentSuccess';
import ManageSubscription from './pages/ManageSubscription';
import ErrorReportingTelemetry from './components/admin/ErrorReportingTelemetry';
import MonthlyPayrollPage from './pages/MonthlyPayrollPage';
import PaymentForecastPage from './pages/PaymentForecastPage';
import { useRealtimeSync } from './hooks/queries/useRealtimeSync';
import { SetDemoRoleAdmin } from './pages/SetDemoRoleAdmin';
import { useTeam } from './contexts/TeamContext';
import { getUserPermissions, hasAllPermissions } from './lib/accessControl';
import { findRouteAccessRule } from './lib/routeAccess';
import { AccessControlProvider } from './contexts/AccessControlContext';
import { PermissionGuard } from './components/shared/PermissionGuard';






// Componente para salvar a rota atual
const RouteTracker = () => {
  const location = useLocation();
  const { userRole, memberCaps } = useTeam();
  const state = location.state as { skipRouteSave?: boolean } | null;
  
  useEffect(() => {
    // Salva a rota atual no sessionStorage sempre que ela mudar
    if (state?.skipRouteSave) return;
    if (location.pathname === '/auth' || location.pathname === '/') return;

    const rule = findRouteAccessRule(location.pathname);
    if (rule) {
      const userPermissions = getUserPermissions({ userRole, memberCaps });
      const allowed = hasAllPermissions({ userPermissions, required: rule.required });
      if (!allowed) return;
    }

    sessionStorage.setItem('lastRoute', location.pathname);
  }, [location.pathname, state, memberCaps, userRole]);
  
  return null;
};

// Componente para restaurar a rota após login
const RouteRestorer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Restaura a última rota salva apenas se estivermos na rota raiz do app
    if (location.pathname === '/app' || location.pathname === '/app/') {
      const lastRoute = sessionStorage.getItem('lastRoute');
      if (lastRoute && lastRoute !== '/app' && lastRoute !== '/app/') {
        navigate(lastRoute.replace('/app', ''), { replace: true });
      }
    }
  }, [navigate, location.pathname]);
  
  return null;
};

const PendingApprovalMessage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleBackToLogin = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Aguardando Aprovação</h2>
          <p className="text-muted-foreground mb-6">
            Sua conta está aguardando aprovação do administrador. 
            Você receberá acesso assim que for aprovado.
          </p>
          <Button 
            onClick={handleBackToLogin}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente interno que ativa realtime DENTRO do TeamProvider
const RealtimeSyncInitializer = () => {
  useRealtimeSync();
  return null;
};

const AppContent = () => {
  const { user, isLoading } = useAuth();
  const { createCheckout } = useStripeCheckoutEnhanced();
  const [attemptedAutoCheckout, setAttemptedAutoCheckout] = useState(false);
  const [autoCheckoutStarting, setAutoCheckoutStarting] = useState(false);
  const [teamApprovalStatus, setTeamApprovalStatus] = useState<{
    loading: boolean;
    status: 'approved' | 'pending' | 'rejected' | null;
    teamName: string;
  }>({ loading: true, status: null, teamName: '' });


  useEffect(() => {
    const checkTeamApprovalStatus = async () => {
      if (!user) return;

      // Se é admin, sempre aprovado
      if (user.role === 'admin' || user.isApproved) {
        setTeamApprovalStatus({
          loading: false,
          status: 'approved',
          teamName: 'Admin'
        });
        return;
      }

      // Timeout de segurança para evitar travamento no loading
      const safetyTimeout = setTimeout(() => {
        console.warn('Team approval check timed out');
        setTeamApprovalStatus(prev => {
          if (prev.loading) {
            return {
              loading: false,
              status: null,
              teamName: ''
            };
          }
          return prev;
        });
      }, 8000);

      try {
        // Verificar se o usuário é owner de alguma equipe
        const { data: ownedTeams, error: ownedError } = await supabase
          .from('teams')
          .select('name')
          .eq('owner_id', user.id);

        if (ownedError) throw ownedError;

        if (ownedTeams && ownedTeams.length > 0) {
          clearTimeout(safetyTimeout);
          setTeamApprovalStatus({
            loading: false,
            status: 'approved',
            teamName: ownedTeams[0].name
          });
          return;
        }

        // Verificar se o usuário tem alguma membership em equipes
        const { data: memberships, error } = await supabase
          .from('team_members')
          .select(`
            status,
            teams!inner(name)
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        clearTimeout(safetyTimeout);

        if (memberships && memberships.length > 0) {
          // Procurar por uma membership aprovada
          const approvedMembership = memberships.find(m => m.status === 'approved');
          
          if (approvedMembership) {
            setTeamApprovalStatus({
              loading: false,
              status: 'approved',
              teamName: approvedMembership.teams.name
            });
          } else {
            // Se não tem aprovada, pegar a primeira pendente
            const pendingMembership = memberships.find(m => m.status === 'pending');
            if (pendingMembership) {
              setTeamApprovalStatus({
                loading: false,
                status: 'pending',
                teamName: pendingMembership.teams.name
              });
            } else {
              setTeamApprovalStatus({
                loading: false,
                status: 'rejected',
                teamName: ''
              });
            }
          }
        } else {
          setTeamApprovalStatus({
            loading: false,
            status: null,
            teamName: ''
          });
        }
      } catch (error) {
        clearTimeout(safetyTimeout);
        console.error('Error checking team approval status:', error);
        setTeamApprovalStatus({
          loading: false,
          status: null,
          teamName: ''
        });
      }
    };

    checkTeamApprovalStatus();
  }, [user]);

  useEffect(() => {
    const runAutoCheckout = async () => {
      if (!user || attemptedAutoCheckout) return;

      if (user.role === 'superadmin') {
        try {
          localStorage.removeItem('pendingSignupPlan');
        } catch {
          return;
        } finally {
          setAttemptedAutoCheckout(true);
          setAutoCheckoutStarting(false);
        }
        return;
      }

      let pendingPlan: string | null = null;
      try {
        pendingPlan = localStorage.getItem('pendingSignupPlan');
      } catch (e) {
        console.warn('[AutoCheckout] Falha ao ler pendingSignupPlan do localStorage', e);
      }
      if (!pendingPlan) return;

      try {
        localStorage.removeItem('pendingSignupPlan');
      } catch (e) {
        console.warn('[AutoCheckout] Falha ao remover pendingSignupPlan do localStorage', e);
      }

      try {
        setAutoCheckoutStarting(true);
        const { data: ownedTeams, error } = await supabase
          .from('teams')
          .select('id, name')
          .eq('owner_id', user.id)
          .limit(1);
        if (error || !ownedTeams || ownedTeams.length === 0) {
          setAttemptedAutoCheckout(true);
          setAutoCheckoutStarting(false);
          return;
        }
        const teamId = ownedTeams[0].id as string;
        await createCheckout({ planId: pendingPlan, teamId });
      } catch (err) {
        setAttemptedAutoCheckout(true);
        setAutoCheckoutStarting(false);
      }
    };
    runAutoCheckout();
  }, [user, attemptedAutoCheckout, createCheckout]);

  if (isLoading || (user && teamApprovalStatus.loading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img
          src="/icons/logo_plannersystempng.png"
          alt="PlannerSystem"
          className="h-12 w-auto sm:h-16 md:h-20 object-contain mb-8 animate-pulse brightness-0 invert dark:invert-0"
        />
        <div className="animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground animate-pulse">Carregando sistema...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Mostrar tela de aprovação pendente se necessário
  if (teamApprovalStatus.status === 'pending') {
    return <PendingApprovalScreen teamName={teamApprovalStatus.teamName} />;
  }

  // Verificar se o usuário foi aprovado (fallback para o sistema antigo)
  if (!user.isApproved && user.role !== 'admin' && teamApprovalStatus.status !== 'approved') {
    return <PendingApprovalMessage />;
  }

  return (
    <ErrorBoundary>
      <TeamProvider>
        <RealtimeSyncInitializer />
        <AccessControlProvider>
          <EnhancedDataProvider>
            <RouteTracker />
            <RouteRestorer />
            <TermsAcceptanceModal />
            <Layout>
              {autoCheckoutStarting && (
                <div className="fixed bottom-4 right-4 z-50">
                  <Card>
                    <CardContent className="p-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Iniciando checkout…</span>
                    </CardContent>
                  </Card>
                </div>
              )}
              <Routes>
                <Route path="/" element={
                  user.role === 'superadmin' ? (
                    <Navigate to="/app/superadmin" replace />
                  ) : (
                    <RouteErrorBoundary routeName="Dashboard" fallbackRoute="/app/eventos">
                      <DashboardErrorBoundary sectionName="Principal">
                        <Dashboard />
                      </DashboardErrorBoundary>
                    </RouteErrorBoundary>
                  )
                } />
                <Route path="/pessoal" element={
                  <RouteErrorBoundary routeName="Pessoal">
                    <ManagePersonnel />
                  </RouteErrorBoundary>
                } />
                <Route path="/pessoal/exportar" element={
                  <RouteErrorBoundary routeName="Exportar Pessoal">
                    <PersonnelExportPage />
                  </RouteErrorBoundary>
                } />
                <Route path="/funcoes" element={
                  <RouteErrorBoundary routeName="Funções">
                    <ManageFunctions />
                  </RouteErrorBoundary>
                } />
                <Route path="/eventos" element={
                  <RouteErrorBoundary routeName="Eventos">
                    <ManageEvents />
                  </RouteErrorBoundary>
                } />
                <Route path="/eventos/:id" element={
                  <RouteErrorBoundary routeName="Detalhes do Evento">
                    <EventDetail />
                  </RouteErrorBoundary>
                } />
                <Route path="/eventos/:id/avaliar-freelancers" element={
                  <RouteErrorBoundary routeName="Avaliar Freelancers">
                    <EventFreelancersRatingPage />
                  </RouteErrorBoundary>
                } />
                <Route path="/fornecedores" element={
                  <RouteErrorBoundary routeName="Fornecedores">
                    <PermissionGuard pageLabel="Fornecedores" required="suppliers">
                      <ManageSuppliers />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/upgrade" element={
                  <RouteErrorBoundary routeName="Upgrade">
                    <PermissionGuard pageLabel="Upgrade" required="billing">
                      <UpgradePlan />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/plans" element={
                  <RouteErrorBoundary routeName="Planos">
                    <PermissionGuard pageLabel="Planos" required="billing">
                      <PlansPage />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/subscription" element={
                  <RouteErrorBoundary routeName="Assinatura">
                    <PermissionGuard pageLabel="Assinatura" required="billing">
                      <ManageSubscription />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/custos" element={
                  <RouteErrorBoundary routeName="Custos">
                    <PermissionGuard pageLabel="Custos" required="finance">
                      <EstimatedCosts />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/folha" element={
                  <RouteErrorBoundary routeName="Folha de Pagamento">
                    <PermissionGuard pageLabel="Folha de Pagamento" required="finance">
                      <PayrollManager />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/folha/:eventId" element={
                  <RouteErrorBoundary routeName="Visualização da Folha">
                    <PermissionGuard pageLabel="Visualização da Folha" required="finance">
                      <PayrollEventView />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/folha/mensal" element={
                  <RouteErrorBoundary routeName="Folha Mensal">
                    <PermissionGuard pageLabel="Folha Mensal" required="finance">
                      <MonthlyPayrollPage />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/pagamentos-avulsos" element={
                  <RouteErrorBoundary routeName="Pagamentos Avulsos">
                    <PermissionGuard pageLabel="Pagamentos Avulsos" required="finance">
                      <PersonnelPaymentsPage />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/pagamentos-avulsos/relatorio" element={
                  <RouteErrorBoundary routeName="Relatório de Pagamentos Avulsos">
                    <PermissionGuard pageLabel="Relatório de Pagamentos Avulsos" required="finance">
                      <PersonnelPaymentsReportPage />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/previsao-pagamentos" element={
                  <RouteErrorBoundary routeName="Previsão de Pagamentos">
                    <PermissionGuard pageLabel="Previsão de Pagamentos" required="finance">
                      <PaymentForecastPage />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/previsao-pagamentos/relatorio" element={
                  <RouteErrorBoundary routeName="Relatório de Previsão de Pagamentos">
                    <PermissionGuard pageLabel="Relatório de Previsão de Pagamentos" required="finance">
                      <PaymentForecastReportPage />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/relatorios/pagamentos-fornecedores" element={
                  <RouteErrorBoundary routeName="Relatório de Pagamentos de Fornecedores">
                    <PermissionGuard pageLabel="Relatório de Pagamentos de Fornecedores" required="finance">
                      <SupplierPaymentsReportPage />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/reportar-erro" element={
                  <RouteErrorBoundary routeName="Reportar Erro">
                    <ReportarErroPage />
                  </RouteErrorBoundary>
                } />
                <Route path="/equipe" element={
                  <RouteErrorBoundary routeName="Equipe">
                    <TeamManagement />
                  </RouteErrorBoundary>
                } />
                <Route path="/configuracoes" element={
                  <RouteErrorBoundary routeName="Configurações">
                    <FormErrorBoundary formName="Configuracoes">
                      <SettingsPage />
                    </FormErrorBoundary>
                  </RouteErrorBoundary>
                } />

                <Route path="/admin/configuracoes" element={
                  <RouteErrorBoundary routeName="Admin - Configurações">
                    <PermissionGuard pageLabel="Admin - Configurações" required="admin">
                      <FormErrorBoundary formName="AdminConfiguracoes">
                        <Settings />
                      </FormErrorBoundary>
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/admin/telemetria-erros" element={
                  <RouteErrorBoundary routeName="Admin - Telemetria de Erros">
                    <PermissionGuard pageLabel="Admin - Telemetria de Erros" required="admin">
                      <ErrorReportingTelemetry />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/superadmin" element={
                  <RouteErrorBoundary routeName="Super Admin">
                    <PermissionGuard pageLabel="Super Admin" required="superadmin">
                      <SuperAdmin />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="/debug/set-role-admin" element={
                  <RouteErrorBoundary routeName="Debug - Set Role Admin">
                    <PermissionGuard pageLabel="Debug - Set Role Admin" required="admin">
                      <SetDemoRoleAdmin />
                    </PermissionGuard>
                  </RouteErrorBoundary>
                } />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
            </Layout>
          </EnhancedDataProvider>
        </AccessControlProvider>
      </TeamProvider>
    </ErrorBoundary>
  );
};
function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="plannersystem-theme">
      <AuthProvider>
        <Router>
          <Routes>
            {/* Redirecionar rota raiz diretamente para /auth (Login) ao invés de /app */}
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<LoginScreen />} />
            <Route path="/auth/signup" element={<LoginScreen />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/app/*" element={
              <RouteErrorBoundary routeName="App Principal">
                <AppContent />
              </RouteErrorBoundary>
            } />
            {/* Rota de impressão fora do Layout */}
            <Route path="/app/folha/relatorio/:eventId" element={
              <RouteErrorBoundary routeName="Relatório de Folha">
                <TeamProvider>
                  <AccessControlProvider>
                    <EnhancedDataProvider>
                      <PermissionGuard pageLabel="Relatório de Folha" required="finance">
                        <PayrollReportPage />
                      </PermissionGuard>
                    </EnhancedDataProvider>
                  </AccessControlProvider>
                </TeamProvider>
              </RouteErrorBoundary>
            } />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
          <SessionTimeout />
          <PWAManager />
        </Router>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
