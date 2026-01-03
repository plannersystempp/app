import React, { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Settings, 
  Users, 
  Calendar, 
  DollarSign, 
  Calculator,
  Command,
  LogOut,
  User,
  ChevronUp,
  ChevronDown,
  Briefcase,
  Bug,
  ShieldCheck,
  Package,
  CalendarClock,
  CalendarRange
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/providers/ThemeProvider';
import { ErrorReportDialog } from '@/components/shared/ErrorReportDialog';

const menuItems = [
  { title: 'Dashboard', url: '/app', icon: Home },
  { title: 'Eventos', url: '/app/eventos', icon: Calendar },
  { title: 'Pessoal', url: '/app/pessoal', icon: Users },
  { title: 'Fornecedores', url: '/app/fornecedores', icon: Package },
];

const financialItems = [
  { title: 'Custos', url: '/app/custos', icon: DollarSign },
  { 
    title: 'Folha de Pagamento', 
    icon: Calculator,
    submenu: [
      { title: 'Por Evento (Freelancers)', url: '/app/folha', icon: Calendar },
      { title: 'Mensal (Fixos)', url: '/app/folha/mensal', icon: CalendarRange },
    ]
  },
  { title: 'Pagamentos Avulsos', url: '/app/pagamentos-avulsos', icon: CalendarClock },
  { title: 'Previsão de Pagamentos', url: '/app/previsao-pagamentos', icon: CalendarClock },
];

const adminItems = [
  { title: 'Gerenciar Equipe', url: '/app/equipe', icon: Users },
  { title: 'Funções', url: '/app/funcoes', icon: Briefcase },
];

const platformItems = [
  { title: 'Super Admin', url: '/app/superadmin', icon: ShieldCheck },
];

export const AppSidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { userRole, activeTeam, memberCaps } = useTeam();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showErrorReportDialog, setShowErrorReportDialog] = useState(false);
  const [payrollMenuOpen, setPayrollMenuOpen] = useState(
    location.pathname.startsWith('/app/folha')
  );
  const reportButtonRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();
  const { setTheme } = useTheme();
  const { setOpenMobile } = useSidebar();

  // Mapeia papéis para rótulos em pt-br
  const getRoleLabel = (role?: string) => {
    if (!role) return '';
    const map: Record<string, string> = {
      coordinator: 'Coordenador',
      admin: 'Administrador',
      superadmin: 'Superadministrador',
      financeiro: 'Financeiro',
      user: 'Usuário',
    };
    return map[role] ?? role;
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/';
    }
    if (path === '/app/folha') {
      return location.pathname === '/app/folha' || location.pathname === '/app/folha/';
    }
    return location.pathname === path;
  };

  // Função para fechar o sidebar no mobile ao clicar em um link
  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar aria-label="Barra lateral de navegação">
      <SidebarHeader className="p-4">
        <Link to="/app" className="block">
          <div className="flex items-center gap-2">
            <img 
              src="/icons/plannersystem-logo.svg" 
              alt="PlannerSystem Logo" 
              className="w-8 h-8 object-contain"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">PlannerSystem</span>
              <span className="truncate text-xs">Sistema de Gestão</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Navegação principal">
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter(item => {
                  if (userRole === 'superadmin') {
                    return item.title !== 'Pessoal' && item.title !== 'Eventos' && item.title !== 'Funções' && item.title !== 'Fornecedores';
                  }
                  if (userRole === 'coordinator') {
                    // Coordenadores não veem Funções
                    if (item.title === 'Funções') return false;
                    // Fornecedores: equipe permite ou coordenador específico autorizado
                    if (item.title === 'Fornecedores') {
                      return canShowSuppliersModule(userRole, activeTeam?.allow_coordinators_suppliers, memberCaps);
                    }
                  }
                  return true;
                })
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url} className="flex items-center gap-2" onClick={handleLinkClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(userRole === 'admin' || userRole === 'financeiro') && (
          <SidebarGroup>
            <SidebarGroupLabel>Financeiro</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {financialItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.submenu ? (
                      <Collapsible
                        open={payrollMenuOpen}
                        onOpenChange={setPayrollMenuOpen}
                        className="group/collapsible"
                      >
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="w-full">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.submenu.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                                  <Link to={subItem.url} onClick={handleLinkClick}>
                                    <subItem.icon className="h-4 w-4" />
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <SidebarMenuButton asChild isActive={isActive(item.url!)}>
                        <Link to={item.url!} className="flex items-center gap-2" onClick={handleLinkClick}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {userRole === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url} className="flex items-center gap-2" onClick={handleLinkClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {userRole === 'superadmin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {platformItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url} className="flex items-center gap-2" onClick={handleLinkClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        </nav>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowErrorReportDialog(true)}
          className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
          ref={reportButtonRef}
        >
          <Bug className="mr-2 h-3 w-3" />
          Reportar Erro
        </Button>
        
        <div className="flex justify-between text-xs">
          <a
            href="/termos-de-uso"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sidebar-foreground underline hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded px-1 transition-colors"
          >
            Termos de Uso
          </a>
          <a
            href="/politica-de-privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sidebar-foreground underline hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded px-1 transition-colors"
          >
            Política de Privacidade
          </a>
        </div>
        
            {isMobile ? (
              <>
                <SidebarMenuButton
                  size="lg"
                  onClick={() => setShowUserMenu((v) => !v)}
                  className={cn(
                    "w-full justify-between h-14 md:h-12 relative z-10",
                    showUserMenu && "bg-sidebar-accent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                      <span className="text-sm font-medium whitespace-normal break-words leading-tight">{user?.name}</span>
                      <span className="text-xs text-sidebar-foreground/80">{getRoleLabel(userRole)}</span>
                    </div>
                  </div>
                  <ChevronUp className="h-4 w-4" />
                </SidebarMenuButton>
                {showUserMenu && (
                  <div className="mt-2 rounded-md border bg-popover text-popover-foreground shadow-md">
                    <Link to="/app/configuracoes" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Configurações
                    </Link>
                    <div className="h-px my-1 bg-muted" />
                    <div className="px-2 py-1.5 text-sm space-y-2">
                      <div className="font-medium">Tema</div>
                      <div className="grid grid-cols-1 gap-2">
                        <Button variant="outline" size="sm" onClick={() => setTheme('light')}>Claro</Button>
                        <Button variant="outline" size="sm" onClick={() => setTheme('dark')}>Escuro</Button>
                        <Button variant="outline" size="sm" onClick={() => setTheme('system')}>Sistema</Button>
                      </div>
                    </div>
                    <div className="h-px my-1 bg-muted" />
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </button>
                  </div>
                )}
              </>
            ) : (
              <DropdownMenu open={showUserMenu} onOpenChange={(open) => { console.log('UserMenu open:', open); setShowUserMenu(open); }} modal={false}>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton 
                    size="lg" 
                    className={cn(
                      "w-full justify-between h-14 md:h-12 relative z-10",
                      showUserMenu && "bg-sidebar-accent"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <div className="flex flex-col min-w-0 flex-1 text-left">
                        <span className="text-sm font-medium whitespace-normal break-words leading-tight">{user?.name}</span>
                        <span className="text-xs text-sidebar-foreground/80">{getRoleLabel(userRole)}</span>
                      </div>
                    </div>
                    <ChevronUp className="h-4 w-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  side="top" 
                  align="center" 
                  className="w-[--radix-popper-anchor-width] z-[1000]"
                  sideOffset={12}
                  collisionPadding={16}
                >
                  <DropdownMenuItem asChild>
                    <Link to="/app/configuracoes">
                      <Settings className="mr-2 h-4 w-4" />
                      Configurações
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-sm">
                    <div className="font-medium mb-2">Tema</div>
                    <div className="grid grid-cols-1 gap-2">
                      <Button variant="outline" size="sm" onClick={() => setTheme('light')}>Claro</Button>
                      <Button variant="outline" size="sm" onClick={() => setTheme('dark')}>Escuro</Button>
                      <Button variant="outline" size="sm" onClick={() => setTheme('system')}>Sistema</Button>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        
        <ErrorReportDialog 
          isOpen={showErrorReportDialog} 
          onClose={() => setShowErrorReportDialog(false)} 
          returnFocusTo={reportButtonRef}
        />
      </SidebarFooter>
    </Sidebar>
  );
};
import { canShowSuppliersModule } from '@/lib/permissions';
