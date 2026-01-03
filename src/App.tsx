
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
import PersonnelPaymentsPage from './pages/PersonnelPayments';
import PersonnelPaymentsReportPage from './pages/PersonnelPaymentsReportPage';
import PaymentForecastReportPage from './pages/PaymentForecastReportPage';
import ReportarErroPage from './pages/ReportarErro';
import { Settings } from './components/admin/Settings';
import { SettingsPage } from './components/SettingsPage';
import { TeamManagement } from './components/teams/TeamManagement';
import { ManageSuppliers } from './components/suppliers/ManageSuppliers';
import { Card, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary';
import { DashboardErrorBoundary } from '@/components/shared/DashboardErrorBoundary';
import { FormErrorBoundary } from '@/components/shared/FormErrorBoundary';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';
import { TermsAcceptanceModal } from './components/shared/TermsAcceptanceModal';
import { supabase } from './integrations/supabase/client';
import './App.css';
import { EnhancedAdminSettings } from './components/admin/EnhancedAdminSettings';
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
import { canShowSuppliersModule } from './lib/permissions';



// Removed Lovable badge remover hook to avoid unintended DOM side effects that hid the UI


// Componente para salvar a rota atual
const RouteTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Salva a rota atual no sessionStorage sempre que ela mudar
    if (location.pathname !== '/auth' && location.pathname !== '/') {
      sessionStorage.setItem('lastRoute', location.pathname);
    }
  }, [location.pathname]);
  
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

const SuppliersGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userRole, activeTeam, memberCaps } = useTeam();
  const allowed = canShowSuppliersModule(userRole, activeTeam?.allow_coordinators_suppliers, memberCaps);
  return allowed ? <>{children}</> : <Navigate to="/app" replace />;
};

const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userRole } = useTeam();
  return userRole === 'admin' ? <>{children}</> : <Navigate to="/app" replace />;
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

      try {
        // Verificar se o usuário é owner de alguma equipe
        const { data: ownedTeams, error: ownedError } = await supabase
          .from('teams')
          .select('name')
          .eq('owner_id', user.id);

        if (ownedError) throw ownedError;

        if (ownedTeams && ownedTeams.length > 0) {
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

  if (isLoading || (user && teamApprovalStatus.loading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img
          src="/icons/logo_plannersystem.png"
          alt="PlannerSystem"
          className="h-12 w-auto sm:h-16 md:h-20 object-contain mb-8 animate-pulse"
        />
        <div className="animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 border-b-2 border-primary"></div>
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
        <EnhancedDataProvider>
          <RouteTracker />
          <RouteRestorer />
          <TermsAcceptanceModal />
          <Layout>
            <Routes>
              <Route path="/" element={
                <RouteErrorBoundary routeName="Dashboard" fallbackRoute="/app/eventos">
                  <DashboardErrorBoundary sectionName="Principal">
                    <Dashboard />
                  </DashboardErrorBoundary>
                </RouteErrorBoundary>
              } />
              <Route path="/pessoal" element={
                <RouteErrorBoundary routeName="Pessoal">
                  <ManagePersonnel />
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
                  <SuppliersGuard>
                    <ManageSuppliers />
                  </SuppliersGuard>
                </RouteErrorBoundary>
              } />
              <Route path="/upgrade" element={
                <RouteErrorBoundary routeName="Upgrade">
                  <AdminGuard>
                    <UpgradePlan />
                  </AdminGuard>
                </RouteErrorBoundary>
              } />
              <Route path="/plans" element={
                <RouteErrorBoundary routeName="Planos">
                  <AdminGuard>
                    <PlansPage />
                  </AdminGuard>
                </RouteErrorBoundary>
              } />
              <Route path="/subscription" element={
                <RouteErrorBoundary routeName="Assinatura">
                  <AdminGuard>
                    <ManageSubscription />
                  </AdminGuard>
                </RouteErrorBoundary>
              } />
              <Route path="/custos" element={
                <RouteErrorBoundary routeName="Custos">
                  <EstimatedCosts />
                </RouteErrorBoundary>
              } />
              <Route path="/folha" element={
                <RouteErrorBoundary routeName="Folha de Pagamento">
                  <PayrollManager />
                </RouteErrorBoundary>
              } />
              <Route path="/folha/:eventId" element={
                <RouteErrorBoundary routeName="Visualização da Folha">
                  <PayrollEventView />
                </RouteErrorBoundary>
              } />
              <Route path="/folha/mensal" element={
                <RouteErrorBoundary routeName="Folha Mensal">
                  <MonthlyPayrollPage />
                </RouteErrorBoundary>
              } />
              <Route path="/pagamentos-avulsos" element={
                <RouteErrorBoundary routeName="Pagamentos Avulsos">
                  <PersonnelPaymentsPage />
                </RouteErrorBoundary>
              } />
              <Route path="/pagamentos-avulsos/relatorio" element={
                <RouteErrorBoundary routeName="Relatório de Pagamentos Avulsos">
                  <PersonnelPaymentsReportPage />
                </RouteErrorBoundary>
              } />
              <Route path="/previsao-pagamentos" element={
                <RouteErrorBoundary routeName="Previsão de Pagamentos">
                  <PaymentForecastPage />
                </RouteErrorBoundary>
              } />
              <Route path="/previsao-pagamentos/relatorio" element={
                <RouteErrorBoundary routeName="Relatório de Previsão de Pagamentos">
                  <PaymentForecastReportPage />
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
              
              {user.role === 'admin' && (
                <Route path="/admin/configuracoes" element={
                  <RouteErrorBoundary routeName="Admin - Configurações">
                    <FormErrorBoundary formName="AdminConfiguracoes">
                      <Settings />
                    </FormErrorBoundary>
                  </RouteErrorBoundary>
                } />
              )}
              {user.role === 'admin' && (
                <Route path="/admin/telemetria-erros" element={
                  <RouteErrorBoundary routeName="Admin - Telemetria de Erros">
                    <AdminGuard>
                      <ErrorReportingTelemetry />
                    </AdminGuard>
                  </RouteErrorBoundary>
                } />
              )}
              {user.role === 'superadmin' && (
                <Route path="/superadmin" element={
                  <RouteErrorBoundary routeName="Super Admin">
                    <SuperAdmin />
                  </RouteErrorBoundary>
                } />
              )}
              {/* Utilitário: atualizar papel da conta demo para admin */}
              <Route path="/debug/set-role-admin" element={
                <RouteErrorBoundary routeName="Debug - Set Role Admin">
                  <SetDemoRoleAdmin />
                </RouteErrorBoundary>
              } />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </Layout>
        </EnhancedDataProvider>
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
            {/* Redirecionar rota raiz para /app se logado ou /auth se não */}
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/auth" element={<LoginScreen />} />
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
                  <EnhancedDataProvider>
                    <PayrollReportPage />
                  </EnhancedDataProvider>
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
