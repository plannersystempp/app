import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wallet,
  Settings as SettingsIcon,
  Package,
  Wrench,
  BadgeDollarSign,
  Calculator,
  Bug,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useTeam } from '@/contexts/TeamContext';
import { canShowSuppliersModule } from '@/lib/permissions';

// Menu inferior móvel com as principais rotas do app
export function AppMobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const { userRole, activeTeam, memberCaps } = useTeam();

  // Rotas principais (abas fixas)
  const tabs = useMemo(() => {
    // SuperAdmin tem navegação especial
    if (userRole === 'superadmin') {
      return [
        { path: '/superadmin', label: 'SuperAdmin', icon: LayoutDashboard },
      ];
    }

    const allTabs = [
      { path: '/app', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/app/eventos', label: 'Eventos', icon: CalendarDays },
      { path: '/app/pessoal', label: 'Pessoal', icon: Users },
      { path: '/app/fornecedores', label: 'Fornecedores', icon: Package },
    ];
    
    return allTabs.filter(tab => {
      // Coordenadores veem fornecedores se a equipe permitir ou se tiver acesso específico
      if (userRole === 'coordinator' && tab.path === '/app/fornecedores') {
        return canShowSuppliersModule(userRole, activeTeam?.allow_coordinators_suppliers, memberCaps);
      }
      return true;
    });
  }, [userRole, activeTeam, memberCaps]);

  // Mais opções (sheet)
  const moreTabs = useMemo(() => {
    // SuperAdmin não tem "mais opções"
    if (userRole === 'superadmin') {
      return [];
    }

    const allMoreTabs = [
      { path: '/app/configuracoes', label: 'Configurações', icon: SettingsIcon },
      { path: '/app/funcoes', label: 'Funções', icon: Wrench },
      { path: '/app/pagamentos-avulsos', label: 'Avulsos', icon: BadgeDollarSign },
      { path: '/app/custos', label: 'Custos', icon: Calculator },
      { path: '/app/folha', label: 'Folha', icon: Wallet },
      { path: '/app/equipe', label: 'Equipe', icon: Users },
      { path: '/app/reportar-erro', label: 'Reportar Erro', icon: Bug }
    ];
    
    return allMoreTabs.filter(tab => {
      // Coordenadores não veem módulos financeiros
      if (userRole === 'coordinator') {
        const financialPaths = ['/app/pagamentos-avulsos', '/app/custos', '/app/folha'];
        if (financialPaths.includes(tab.path)) return false;
        
        // Coordenadores não veem Funções e Equipe
        if (tab.path === '/app/funcoes' || tab.path === '/app/equipe') return false;
      }
      return true;
    });
  }, [userRole]);

  const currentPath = location.pathname;

  const isActive = (path: string) => {
    // Considera ativo se a rota atual inicia com o caminho da aba
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  // Verifica se alguma aba do "Mais" está ativa
  const isMoreActive = useMemo(() => 
    moreTabs.some(tab => isActive(tab.path)), 
    [moreTabs, currentPath]
  );

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleMoreTabSelect = (path: string) => {
    navigate(path);
    setMoreSheetOpen(false);
  };

  // SuperAdmin não precisa de navegação mobile (usa apenas desktop)
  if (userRole === 'superadmin') {
    return null;
  }

  const totalCols = moreTabs.length > 0 ? tabs.length + 1 : tabs.length;
  const colsClass = totalCols === 5
    ? 'grid-cols-5'
    : totalCols === 4
    ? 'grid-cols-4'
    : totalCols === 3
    ? 'grid-cols-3'
    : totalCols === 2
    ? 'grid-cols-2'
    : 'grid-cols-1';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 safe-area-inset-bottom" aria-label="Navegação principal móvel">
      <div className={`grid ${colsClass} h-14 px-2 max-w-screen-sm mx-auto`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => handleNavigate(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors relative min-w-0',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" />
              <span className="w-full text-center leading-tight text-[10px] sm:text-xs font-medium truncate">{tab.label}</span>
              {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 sm:w-12 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}

        {moreTabs.length > 0 && (
        <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors relative min-w-0',
                isMoreActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-haspopup="true"
              aria-expanded={moreSheetOpen}
              aria-label="Mais opções"
              id="mobile-more-trigger"
            >
              <div className="grid grid-cols-2 gap-px w-4 h-4">
                <div className="w-2 h-2 bg-current rounded-sm" />
                <div className="w-2 h-2 bg-current rounded-sm" />
                <div className="w-2 h-2 bg-current rounded-sm" />
                <div className="w-2 h-2 bg-current rounded-sm" />
              </div>
              <span className="w-full text-center leading-tight text-[10px] sm:text-xs font-medium truncate">Mais</span>
              {isMoreActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 sm:w-12 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto" aria-label="Menu de mais opções">
            <SheetHeader>
              <SheetTitle>Mais Opções</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3 mt-6 pb-4">
              {moreTabs.map((tab) => {
                const Icon = tab.icon;
                const active = isActive(tab.path);
                return (
                  <Button
                    key={tab.path}
                    onClick={() => handleMoreTabSelect(tab.path)}
                    variant={active ? 'default' : 'outline'}
                    className="h-auto flex flex-col items-center gap-3 p-4"
                    aria-label={tab.label}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </Button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
        )}
      </div>
    </nav>
  );
}
