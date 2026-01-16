
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, UserX, Trash2, Mail, UserCog, Shield, UserPlus, UserMinus, Menu, Bug, LayoutDashboard, Search, TrendingUp, Edit2, Loader2, Filter, Building2, DollarSign, Database, HardDriveDownload, Download, Copy } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useDebounce } from '@/hooks/use-debounce';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { ptBR } from 'date-fns/locale';
import { EnhancedAuditLogCard } from '@/components/admin/EnhancedAuditLogCard';
import { UserManagementDialog } from '@/components/admin/UserManagementDialog';
import { SuperAdminDashboard } from '@/components/admin/SuperAdminDashboard';
import { GlobalSearch } from '@/components/admin/GlobalSearch';
import { MobileBottomNav } from '@/components/admin/mobile/MobileBottomNav';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { triggerBackup, listBackups, restoreBackup } from '@/services/backupService';

// Lazy load das abas para otimizar performance (Fase 11)
const LazyMonitoringDashboard = lazy(() => import('@/components/admin/MonitoringDashboard').then(m => ({ default: m.MonitoringDashboard })));
const LazyOrphanUsersTab = lazy(() => import('@/components/admin/OrphanUsersTab').then(m => ({ default: m.OrphanUsersTab })));
const LazyTeamManagementTab = lazy(() => import('@/components/admin/TeamManagementTab').then(m => ({ default: m.TeamManagementTab })));
const LazyDeletionLogsTab = lazy(() => import('@/components/admin/DeletionLogsTab').then(m => ({ default: m.DeletionLogsTab })));
const LazySubscriptionManagementTab = lazy(() => import('@/components/subscriptions/SubscriptionManagementTab').then(m => ({ default: m.SubscriptionManagementTab })));
const LazyPlansManagement = lazy(() => import('@/components/subscriptions/PlansManagement').then(m => ({ default: m.PlansManagement })));
const LazyStripeSync = lazy(() => import('@/components/admin/StripeSync').then(m => ({ default: m.StripeSync })));
const LazySubscriptionMetrics = lazy(() => import('@/components/subscriptions/SubscriptionMetrics').then(m => ({ default: m.SubscriptionMetrics })));
const LazyErrorReportsManagement = lazy(() => import('@/components/admin/ErrorReportsManagement').then(m => ({ default: m.ErrorReportsManagement })));
const LazyAuditLog = lazy(() => import('@/components/admin/AuditLogInfinite').then(m => ({ default: m.AuditLogInfinite })));
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SuperAdminUser {
  user_id: string;
  email: string;
  name: string;
  role: string;
  is_approved: boolean;
  team_name: string | null;
  team_id: string | null;
  last_sign_in_at: string | null;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_name: string | null;
  user_email: string | null;
  team_name: string | null;
  action: string;
  table_name: string;
  entity_name: string | null;
  record_id: string | null;
  old_values: any;
  new_values: any;
  changed_fields: any;
  action_summary: string;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
}

export default function SuperAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // States
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [restoringKey, setRestoringKey] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedUserSearch = useDebounce(userSearchQuery, 300);
  const itemsPerPage = 20;
  const [sortField, setSortField] = useState<'name'|'team'|'status'|'last_sign_in_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc');
  const [searchInputEl, setSearchInputEl] = useState<HTMLInputElement | null>(null);
  
  // Management dialog state
  const [managementDialog, setManagementDialog] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    currentRole: string;
    currentApproved: boolean;
    currentTeamId: string | null;
    currentTeamName: string | null;
    actionType: 'approve' | 'role' | 'assign' | 'remove' | 'delete';
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    currentRole: '',
    currentApproved: false,
    currentTeamId: null,
    currentTeamName: null,
    actionType: 'approve',
  });
  
  // Filters
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchText, setSearchText] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Check if user is superadmin
  if (!user || user.role !== 'superadmin') {
    return <Navigate to="/app" replace />;
  }

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_users_for_superadmin');
      
      if (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar usuários",
          variant: "destructive"
        });
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar usuários",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching teams:', error);
        return;
      }

      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_audit_logs_for_superadmin_enriched', {
        search_text: searchText || null,
        team_filter: teamFilter === 'all' ? null : teamFilter,
        action_filter: actionFilter === 'all' ? null : actionFilter,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate + 'T23:59:59').toISOString() : null
      });
      
      if (error) {
        console.error('Error fetching audit logs:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar logs de auditoria",
          variant: "destructive"
        });
        return;
      }

      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar logs de auditoria",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUsers = async () => {
    if (selectedUsers.length === 0) return;

    const confirmed = confirm(`Tem certeza que deseja excluir ${selectedUsers.length} usuário(s)? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-users-by-superadmin', {
        body: { userIds: selectedUsers }
      });

      if (error) {
        toast({
          title: "Erro",
          description: "Falha ao excluir usuários",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: data.message
      });

      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting users:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir usuários",
        variant: "destructive"
      });
    }
  };

  const handleNotifyUsers = () => {
    alert('Funcionalidade de notificação a ser implementada.');
  };

  const openManagementDialog = (
    user: SuperAdminUser,
    actionType: 'approve' | 'role' | 'assign' | 'remove' | 'delete'
  ) => {
    setManagementDialog({
      isOpen: true,
      userId: user.user_id,
      userName: user.name,
      currentRole: user.role,
      currentApproved: user.is_approved,
      currentTeamId: user.team_id,
      currentTeamName: user.team_name,
      actionType,
    });
  };

  const getInactiveDays = (lastSignIn: string | null) => {
    if (!lastSignIn) return null;
    return formatDistanceToNow(new Date(lastSignIn), { locale: ptBR });
  };

  const getFilteredUsers = () => {
    let filtered = users;

    if (userFilter === 'active') {
      filtered = filtered.filter(user => 
        !user.last_sign_in_at || 
        (new Date().getTime() - new Date(user.last_sign_in_at).getTime()) < 90 * 24 * 60 * 60 * 1000
      );
    } else if (userFilter === 'inactive') {
      filtered = filtered.filter(user => 
        user.last_sign_in_at && 
        (new Date().getTime() - new Date(user.last_sign_in_at).getTime()) >= 90 * 24 * 60 * 60 * 1000
      );
    }

    // Apply search filter
    if (debouncedUserSearch) {
      const searchLower = debouncedUserSearch.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          (user.team_name && user.team_name.toLowerCase().includes(searchLower))
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortField === 'team') return (a.team_name || '').localeCompare(b.team_name || '') * dir;
      if (sortField === 'status') return (Number(a.is_approved) - Number(b.is_approved)) * dir;
      if (sortField === 'last_sign_in_at') {
        const av = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
        const bv = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
        return (av - bv) * dir;
      }
      return 0;
    });
    return sorted;
  };

  const handleSort = (field: 'name'|'team'|'status'|'last_sign_in_at') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getUserStats = () => {
    const total = users.length;
    const active = users.filter(user => 
      !user.last_sign_in_at || 
      (new Date().getTime() - new Date(user.last_sign_in_at).getTime()) < 90 * 24 * 60 * 60 * 1000
    ).length;
    const inactive = total - active;

    return { total, active, inactive };
  };

  useEffect(() => {
    console.info('[SuperAdmin] Componente montado');
    fetchUsers();
    fetchTeams();
    fetchBackups();
  }, []);

  useEffect(() => {
    console.info('[SuperAdmin] Aba ativa:', activeTab);
    console.info('[SuperAdmin] Total de usuários:', users.length);
    console.info('[SuperAdmin] Total de equipes:', teams.length);
  }, [activeTab, users.length, teams.length]);

  useEffect(() => {
    fetchAuditLogs();
  }, [searchText, teamFilter, actionFilter, startDate, endDate]);

  const stats = getUserStats();
  const filteredUsers = getFilteredUsers();

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [userFilter, debouncedUserSearch]);

  // Atalho de teclado Cmd+K / Ctrl+K para busca global
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
      if (e.key === '/') {
        e.preventDefault();
        searchInputEl?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        setActiveTab('backups');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigateFromSearch = (tab: string, id?: string) => {
    setActiveTab(tab);
    // TODO: Scroll to item if id is provided
  };

  const handleExportCsv = () => {
    const rows = filteredUsers.map(u => ({
      nome: u.name,
      email: u.email,
      equipe: u.team_name || '',
      aprovado: u.is_approved ? 'sim' : 'não',
      ultimo_acesso: u.last_sign_in_at || '',
    }));
    const header = Object.keys(rows[0] || { nome: '', email: '', equipe: '', aprovado: '', ultimo_acesso: '' });
    const csv = [header.join(','), ...rows.map(r => header.map(h => String((r as any)[h]).replace(/"/g, '""')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyEmails = () => {
    const emails = filteredUsers.filter(u => selectedUsers.includes(u.user_id)).map(u => u.email).join(', ');
    if (!emails) return;
    navigator.clipboard.writeText(emails);
    toast({ title: 'Copiado', description: 'Emails copiados para a área de transferência' });
  };

  const fetchBackups = async () => {
    try {
      const data = await listBackups(100);
      setBackups(data);
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao listar backups', variant: 'destructive' });
    }
  };

  const handleBackupNow = async () => {
    setBackupLoading(true);
    try {
      const res = await triggerBackup({});
      toast({ title: 'Backup iniciado', description: 'Arquivo gerado', });
      await fetchBackups();
    } catch (e: any) {
      toast({ title: 'Erro no backup', description: e?.message || 'Falha ao executar backup', variant: 'destructive' });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (fileKey: string, format: 'json'|'sql') => {
    setRestoringKey(fileKey);
    try {
      await restoreBackup(fileKey, format);
      toast({ title: 'Restauração concluída', description: 'Dados restaurados com sucesso' });
    } catch (e: any) {
      toast({ title: 'Erro na restauração', description: e?.message || 'Falha ao restaurar backup', variant: 'destructive' });
    } finally {
      setRestoringKey(null);
    }
  };

  return (
    <div className="container mx-auto space-y-4 sm:space-y-6 relative min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">Super Administração</h1>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Gerenciamento global da plataforma PlannerSystem</p>
            <Badge variant="outline" className="text-[10px]">{activeTab}</Badge>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setGlobalSearchOpen(true)}
          className="gap-2 hidden md:flex"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Buscar</span>
          <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
        
        {/* Menu Hambúrguer Mobile */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen} modal={false}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden h-10 w-10 relative z-10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle>Menu de Navegação</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 mt-6">
              <Button 
                variant={activeTab === 'dashboard' ? 'default' : 'ghost'} 
                className="justify-start h-12 text-base"
                onClick={() => {
                  setActiveTab('dashboard');
                  setSheetOpen(false);
                }}
              >
                <LayoutDashboard className="mr-3 h-5 w-5" /> Dashboard
              </Button>
              <Button 
                variant={activeTab === 'users' ? 'default' : 'ghost'} 
                className="justify-start h-12 text-base"
                onClick={() => {
                  setActiveTab('users');
                  setSheetOpen(false);
                }}
              >
                <Users className="mr-3 h-5 w-5" /> Usuários
              </Button>
              <Button 
                variant={activeTab === 'teams' ? 'default' : 'ghost'}
                className="justify-start h-12 text-base"
                onClick={() => {
                  setActiveTab('teams');
                  setSheetOpen(false);
                }}
              >
                <Shield className="mr-3 h-5 w-5" /> Equipes
              </Button>
              <Button 
                variant={activeTab === 'subscriptions' ? 'default' : 'ghost'}
                className="justify-start h-12 text-base"
                onClick={() => {
                  setActiveTab('subscriptions');
                  setSheetOpen(false);
                }}
              >
                <UserPlus className="mr-3 h-5 w-5" /> Assinaturas
              </Button>
              <Button 
                variant={activeTab === 'plans' ? 'default' : 'ghost'}
                className="justify-start h-12 text-base"
                onClick={() => {
                  setActiveTab('plans');
                  setSheetOpen(false);
                }}
              >
                <Shield className="mr-3 h-5 w-5" /> Planos
              </Button>
              <Button 
                variant={activeTab === 'orphans' ? 'default' : 'ghost'}
                className="justify-start h-12 text-base"
                onClick={() => {
                  setActiveTab('orphans');
                  setSheetOpen(false);
                }}
              >
                <UserMinus className="mr-3 h-5 w-5" /> Órfãos
              </Button>
              <Button 
                variant={activeTab === 'deletion-logs' ? 'default' : 'ghost'}
                className="justify-start h-12 text-base"
                onClick={() => {
                  setActiveTab('deletion-logs');
                  setSheetOpen(false);
                }}
              >
                <Trash2 className="mr-3 h-5 w-5" /> Exclusões
              </Button>
              <Button 
                variant={activeTab === 'audit' ? 'default' : 'ghost'}
                className="justify-start h-12 text-base"
                onClick={() => {
                  setActiveTab('audit');
                  setSheetOpen(false);
                }}
              >
                <UserCog className="mr-3 h-5 w-5" /> Auditoria
              </Button>
              <Button 
                variant={activeTab === 'error-reports' ? 'default' : 'ghost'}
                className="justify-start h-12 text-base"
                onClick={() => {
                  setActiveTab('error-reports');
                  setSheetOpen(false);
                }}
              >
                <Bug className="mr-3 h-5 w-5" /> Reportes de Erro
              </Button>
              <Button 
                variant={activeTab === 'stripe-sync' ? 'default' : 'ghost'}
                className="justify-start h-12 text-base"
                onClick={() => {
                  setActiveTab('stripe-sync');
                  setSheetOpen(false);
                }}
              >
                <Shield className="mr-3 h-5 w-5" /> Stripe Sync
              </Button>
              <Button 
                variant={activeTab === 'metrics' ? 'default' : 'ghost'}
                className="justify-start h-12 text-base"
                onClick={() => {
                  setActiveTab('metrics');
                  setSheetOpen(false);
                }}
              >
                <TrendingUp className="mr-3 h-5 w-5" /> Métricas
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* FASE 4: Indicador de Aba Ativa no Mobile */}
      <div className="md:hidden bg-muted rounded-lg p-3">
        <p className="text-sm text-muted-foreground">Seção atual:</p>
        <p className="font-semibold">
          {activeTab === 'dashboard' && 'Dashboard'}
          {activeTab === 'users' && 'Usuários'}
          {activeTab === 'teams' && 'Equipes'}
          {activeTab === 'subscriptions' && 'Assinaturas'}
          {activeTab === 'plans' && 'Planos'}
          {activeTab === 'orphans' && 'Órfãos'}
          {activeTab === 'deletion-logs' && 'Exclusões'}
          {activeTab === 'audit' && 'Auditoria'}
          {activeTab === 'error-reports' && 'Reportes de Erro'}
          {activeTab === 'stripe-sync' && 'Stripe Sync'}
          {activeTab === 'metrics' && 'Métricas'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <Button variant={activeTab === 'users' ? 'default' : 'secondary'} className="flex flex-col items-center justify-center h-20" onClick={() => setActiveTab('users')}>
              <Users className="h-5 w-5 mb-1" />
              <span className="text-xs">Usuários</span>
            </Button>
            <Button variant={activeTab === 'teams' ? 'default' : 'secondary'} className="flex flex-col items-center justify-center h-20" onClick={() => setActiveTab('teams')}>
              <Building2 className="h-5 w-5 mb-1" />
              <span className="text-xs">Equipes</span>
            </Button>
            <Button variant={activeTab === 'subscriptions' ? 'default' : 'secondary'} className="flex flex-col items-center justify-center h-20" onClick={() => setActiveTab('subscriptions')}>
              <DollarSign className="h-5 w-5 mb-1" />
              <span className="text-xs">Assinaturas</span>
            </Button>
            <Button variant={activeTab === 'plans' ? 'default' : 'secondary'} className="flex flex-col items-center justify-center h-20" onClick={() => setActiveTab('plans')}>
              <LayoutDashboard className="h-5 w-5 mb-1" />
              <span className="text-xs">Planos</span>
            </Button>
            <Button variant={activeTab === 'audit' ? 'default' : 'secondary'} className="flex flex-col items-center justify-center h-20" onClick={() => setActiveTab('audit')}>
              <Database className="h-5 w-5 mb-1" />
              <span className="text-xs">Auditoria</span>
            </Button>
            <Button variant={activeTab === 'error-reports' ? 'default' : 'secondary'} className="flex flex-col items-center justify-center h-20" onClick={() => setActiveTab('error-reports')}>
              <Bug className="h-5 w-5 mb-1" />
              <span className="text-xs">Erros</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* FASE 2: Remover overflow-x-auto, manter tabs apenas em desktop */}
        <TabsList className="hidden md:flex md:flex-wrap md:gap-2 w-full h-auto">
          <TabsTrigger className="shrink-0" value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger className="shrink-0" value="users">Usuários</TabsTrigger>
          <TabsTrigger className="shrink-0" value="teams">Equipes</TabsTrigger>
          <TabsTrigger className="shrink-0" value="subscriptions">Assinaturas</TabsTrigger>
          <TabsTrigger className="shrink-0" value="plans">Planos</TabsTrigger>
          <TabsTrigger className="shrink-0" value="stripe-sync">Stripe Sync</TabsTrigger>
          <TabsTrigger className="shrink-0" value="metrics">Métricas</TabsTrigger>
          <TabsTrigger className="shrink-0" value="orphans">Órfãos</TabsTrigger>
          <TabsTrigger className="shrink-0" value="deletion-logs">Exclusões</TabsTrigger>
          <TabsTrigger className="shrink-0" value="audit">Auditoria</TabsTrigger>
          <TabsTrigger className="shrink-0" value="error-reports">Reportes</TabsTrigger>
          <TabsTrigger className="shrink-0" value="backups">Backups</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 animate-in fade-in duration-300">
          <SuperAdminDashboard />
        </TabsContent>

        <TabsContent value="users" className="space-y-6 animate-in fade-in duration-300">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários Inativos</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros e Busca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou equipe..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                    ref={setSearchInputEl}
                  />
                </div>
                <Select value={userFilter} onValueChange={(value: any) => setUserFilter(value)}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status do usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(debouncedUserSearch || userFilter !== "all") && (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filteredUsers.length} resultado(s) encontrado(s)
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUserSearchQuery("");
                      setUserFilter("all");
                    }}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sync Photos Tool */}
          <Card>
            <CardHeader>
              <CardTitle>Ferramentas de Manutenção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Sincronizar fotos órfãs no storage com os registros de pessoal
                </p>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.rpc('sync_personnel_photos');
                      if (error) throw error;

                      const updated = (data ?? 0) as number;
                      toast({
                        title: "✅ Sincronização concluída",
                        description: `${updated} registro(s) atualizado(s).`,
                      });
                    } catch (error: any) {
                      toast({
                        title: "Erro na sincronização",
                        description: error?.message || 'Falha ao sincronizar fotos',
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Sincronizar Fotos de Pessoal
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {selectedUsers.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCopyEmails}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar Emails ({selectedUsers.length})
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteUsers}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir Selecionados ({selectedUsers.length})
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleExportCsv}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Usuários</CardTitle>
              <p className="text-sm text-muted-foreground">
                {filteredUsers.length > 0 ? (
                  <>
                    Mostrando {Math.min(paginatedUsers.length, filteredUsers.length)} de {filteredUsers.length} usuário(s)
                    {debouncedUserSearch && ` (filtrado por "${debouncedUserSearch}")`}
                  </>
                ) : (
                  "Nenhum usuário encontrado"
                )}
              </p>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title={
                    debouncedUserSearch || userFilter !== "all"
                      ? "Nenhum usuário encontrado"
                      : "Nenhum usuário cadastrado"
                  }
                  description={
                    debouncedUserSearch || userFilter !== "all"
                      ? "Tente ajustar os filtros de busca para encontrar o que procura."
                      : "Ainda não há usuários cadastrados no sistema."
                  }
                  action={
                    (debouncedUserSearch || userFilter !== "all") ? {
                      label: "Limpar Filtros",
                      onClick: () => {
                        setUserSearchQuery("");
                        setUserFilter("all");
                      }
                    } : undefined
                  }
                />
              ) : (
                <>
                  <div className="overflow-x-auto -mx-4 px-4">
                    <Table className="min-w-[800px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsers(paginatedUsers.map(u => u.user_id));
                                } else {
                                  setSelectedUsers([]);
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>
                            <button className="flex items-center gap-1" onClick={() => handleSort('name')}>Usuário{sortField==='name' && (sortOrder==='asc'?' ▲':' ▼')}</button>
                          </TableHead>
                          <TableHead>
                            <button className="flex items-center gap-1" onClick={() => handleSort('team')}>Empresa{sortField==='team' && (sortOrder==='asc'?' ▲':' ▼')}</button>
                          </TableHead>
                          <TableHead>
                            <button className="flex items-center gap-1" onClick={() => handleSort('status')}>Status{sortField==='status' && (sortOrder==='asc'?' ▲':' ▼')}</button>
                          </TableHead>
                          <TableHead>
                            <button className="flex items-center gap-1" onClick={() => handleSort('last_sign_in_at')}>Último Acesso{sortField==='last_sign_in_at' && (sortOrder==='asc'?' ▲':' ▼')}</button>
                          </TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">Carregando usuários...</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedUsers.map((user) => {
                      const inactiveDays = getInactiveDays(user.last_sign_in_at);
                      const isLongInactive = user.last_sign_in_at && 
                        (new Date().getTime() - new Date(user.last_sign_in_at).getTime()) > 90 * 24 * 60 * 60 * 1000;

                      return (
                        <TableRow 
                          key={user.user_id}
                          className="transition-all duration-200 hover:bg-muted/50"
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.includes(user.user_id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsers([...selectedUsers, user.user_id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.user_id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                              <Badge variant={user.role === 'superadmin' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.team_name || 'Sem equipe'}
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant={user.is_approved ? 'default' : 'destructive'}
                                    className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 w-fit"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openManagementDialog(user, 'approve');
                                    }}
                                  >
                                    {user.is_approved ? 'Aprovado' : 'Pendente'}
                                    <Edit2 className="h-3 w-3" />
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Clique para alterar status</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            {user.last_sign_in_at ? (
                              <div className={isLongInactive ? 'text-red-600' : ''}>
                                há {inactiveDays}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Nunca</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-12 w-12 md:h-10 md:w-10 min-h-[44px] min-w-[44px] hover:bg-accent"
                                  aria-label="Ações do usuário"
                                >
                                  <UserCog className="h-5 w-5 md:h-4 md:w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="z-[9999] bg-popover border shadow-md">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={async () => {
                                    setLoadingAction(user.user_id);
                                    openManagementDialog(user, 'approve');
                                    // Reset after dialog opens
                                    setTimeout(() => setLoadingAction(null), 300);
                                  }}
                                  disabled={loadingAction === user.user_id}
                                >
                                  {loadingAction === user.user_id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Shield className="mr-2 h-4 w-4" />
                                  )}
                                  {user.is_approved ? 'Desaprovar' : 'Aprovar'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    setLoadingAction(user.user_id);
                                    openManagementDialog(user, 'role');
                                    setTimeout(() => setLoadingAction(null), 300);
                                  }}
                                  disabled={loadingAction === user.user_id}
                                >
                                  {loadingAction === user.user_id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserCog className="mr-2 h-4 w-4" />
                                  )}
                                  Alterar Função
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    setLoadingAction(user.user_id);
                                    openManagementDialog(user, 'assign');
                                    setTimeout(() => setLoadingAction(null), 300);
                                  }}
                                  disabled={loadingAction === user.user_id}
                                >
                                  {loadingAction === user.user_id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserPlus className="mr-2 h-4 w-4" />
                                  )}
                                  {user.team_id ? 'Trocar Equipe' : 'Associar à Equipe'}
                                </DropdownMenuItem>
                                {user.team_id && (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      setLoadingAction(user.user_id);
                                      openManagementDialog(user, 'remove');
                                      setTimeout(() => setLoadingAction(null), 300);
                                    }}
                                    disabled={loadingAction === user.user_id}
                                  >
                                    {loadingAction === user.user_id ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <UserMinus className="mr-2 h-4 w-4" />
                                    )}
                                    Remover da Equipe
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={async () => {
                                    setLoadingAction(user.user_id);
                                    openManagementDialog(user, 'delete');
                                    setTimeout(() => setLoadingAction(null), 300);
                                  }}
                                  disabled={loadingAction === user.user_id}
                                  className="text-red-600"
                                >
                                  {loadingAction === user.user_id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                  )}
                                  Excluir Usuário
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center border-t pt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        // Show first, last, current, and adjacent pages
                        return (
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1
                        );
                      })
                      .map((page, index, array) => {
                        // Add ellipsis if there's a gap
                        const showEllipsisBefore =
                          index > 0 && page - array[index - 1] > 1;

                        return (
                          <React.Fragment key={page}>
                            {showEllipsisBefore && (
                              <PaginationItem>
                                <span className="px-4 text-muted-foreground">...</span>
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </React.Fragment>
                        );
                      })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                        }
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orphans" className="space-y-6 animate-in fade-in duration-300">
          <Suspense fallback={<LoadingSpinner />}>
            <LazyOrphanUsersTab teams={teams} />
          </Suspense>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6 animate-in fade-in duration-300">
          <Suspense fallback={<LoadingSpinner />}>
            <LazyTeamManagementTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6 animate-in fade-in duration-300">
          <Suspense fallback={<LoadingSpinner />}>
            <LazySubscriptionManagementTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6 animate-in fade-in duration-300">
          <Suspense fallback={<LoadingSpinner />}>
            <LazyPlansManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="stripe-sync" className="space-y-6 animate-in fade-in duration-300">
          <Suspense fallback={<LoadingSpinner />}>
            <LazyStripeSync />
          </Suspense>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6 animate-in fade-in duration-300">
          <Suspense fallback={<LoadingSpinner />}>
            <LazySubscriptionMetrics />
          </Suspense>
        </TabsContent>

        <TabsContent value="deletion-logs" className="space-y-6 animate-in fade-in duration-300">
          <Suspense fallback={<LoadingSpinner />}>
            <LazyDeletionLogsTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6 animate-in fade-in duration-300">
          <Suspense fallback={<LoadingSpinner />}>
            <LazyAuditLog />
          </Suspense>
        </TabsContent>

        <TabsContent value="error-reports" className="space-y-6 animate-in fade-in duration-300">
          <Suspense fallback={<LoadingSpinner />}>
            <LazyErrorReportsManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="backups" className="space-y-6 animate-in fade-in duration-300">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><HardDriveDownload className="h-5 w-5" /> Backups do Banco de Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <Button onClick={handleBackupNow} disabled={backupLoading} className="gap-2">
                  {backupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDriveDownload className="h-4 w-4" />}
                  Fazer backup agora
                </Button>
                <Button variant="outline" onClick={fetchBackups}>Atualizar lista</Button>
              </div>
              <div className="overflow-x-auto -mx-4 px-4">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Formato</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Checksum</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum backup encontrado</TableCell>
                      </TableRow>
                    ) : (
                      backups.map((b) => (
                        <TableRow key={`${b.file_name}-${b.created_at}`}>
                          <TableCell className="break-all">{b.file_name}</TableCell>
                          <TableCell>{b.format?.toUpperCase?.() || 'JSON'}</TableCell>
                          <TableCell>{b.file_size ? `${Math.round(b.file_size/1024)} KB` : '-'}</TableCell>
                          <TableCell className="break-all text-xs">{b.checksum || '-'}</TableCell>
                          <TableCell>{format(new Date(b.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {b.signedUrl && (
                                <a href={b.signedUrl} target="_blank" rel="noreferrer">
                                  <Button variant="outline" size="sm">Download</Button>
                                </a>
                              )}
                              <Button size="sm" onClick={() => handleRestore(b.file_name, b.format || 'json')} disabled={restoringKey === b.file_name}>
                                {restoringKey === b.file_name ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Restaurar'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Management Dialog */}
      <UserManagementDialog
        isOpen={managementDialog.isOpen}
        onClose={() =>
          setManagementDialog((prev) => ({ ...prev, isOpen: false }))
        }
        onSuccess={() => {
          fetchUsers();
          setManagementDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        userId={managementDialog.userId}
        userName={managementDialog.userName}
        currentRole={managementDialog.currentRole}
        currentApproved={managementDialog.currentApproved}
        currentTeamId={managementDialog.currentTeamId}
        currentTeamName={managementDialog.currentTeamName}
        teams={teams}
        actionType={managementDialog.actionType}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      
      {/* Global Search */}
      <GlobalSearch
        open={globalSearchOpen}
        onOpenChange={setGlobalSearchOpen}
        onNavigate={handleNavigateFromSearch}
      />
    </div>
  );
}
