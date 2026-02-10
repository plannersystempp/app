import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedData, type Personnel, type Func } from '@/contexts/EnhancedDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePersonnelPaginatedQuery, useDeletePersonnelMutation, fetchPersonnelPaginated, personnelKeys } from '@/hooks/queries/usePersonnelQuery';
import { usePersonnelRealtime } from '@/hooks/queries/usePersonnelRealtime';
import { useDebounce } from '@/hooks/use-debounce';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Plus, Search, Users } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PersonnelForm } from './PersonnelForm';
import { PersonnelStats } from './PersonnelStats';
import { PersonnelFilters } from './PersonnelFilters';
import { supabase } from '@/integrations/supabase/client';
import { PersonnelList } from './PersonnelList';
import { PersonnelViewToggle } from './PersonnelViewToggle';
import { FreelancerRatingDialog } from './FreelancerRatingDialog';
import { useCheckSubscriptionLimits } from '@/hooks/useCheckSubscriptionLimits';
import { UpgradePrompt } from '@/components/subscriptions/UpgradePrompt';
import { useTeam } from '@/contexts/TeamContext';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ManagePersonnel: React.FC = () => {
  const navigate = useNavigate();
  const { functions } = useEnhancedData();
  const deletePersonnelMutation = useDeletePersonnelMutation();
  const queryClient = useQueryClient();

  type LimitCheckResult = {
    can_proceed?: boolean;
    reason?: string;
    current_plan?: unknown;
    limit?: number;
    current_count?: number;
  };
  
  // Hook de sincronização em tempo real
  usePersonnelRealtime();
  const { user } = useAuth();
  const { activeTeam, userRole } = useTeam();
  const isMobile = useIsMobile();
  const [showForm, setShowForm] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce de 500ms
  const [filterType, setFilterType] = useState<'all' | 'fixo' | 'freelancer'>('all');
  const [filterFunction, setFilterFunction] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'rating_desc' | 'rating_asc'>('name_asc');
  const [ratingsAvg, setRatingsAvg] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [ratingPersonnel, setRatingPersonnel] = useState<Personnel | null>(null);
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const [limitCheckResult, setLimitCheckResult] = useState<LimitCheckResult | null>(null);
  const checkLimits = useCheckSubscriptionLimits();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Fetch paginated data
  const { 
    data: paginatedResult, 
    isLoading, 
    isFetching 
  } = usePersonnelPaginatedQuery({
    page: currentPage,
    perPage: itemsPerPage,
    search: debouncedSearchTerm,
    type: filterType,
    functionId: filterFunction,
    sortBy: sortBy
  });

  const personnel = paginatedResult?.data || [];
  const totalCount = paginatedResult?.count || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Prefetching da próxima página
  const prefetchNextPage = () => {
    if (currentPage < totalPages && activeTeam?.id) {
      const nextPage = currentPage + 1;
      const options = {
        page: nextPage,
        perPage: itemsPerPage,
        search: debouncedSearchTerm,
        type: filterType,
        functionId: filterFunction,
        sortBy: sortBy
      };
      
      queryClient.prefetchQuery({
        queryKey: personnelKeys.paginated(activeTeam.id, options),
        queryFn: () => fetchPersonnelPaginated(activeTeam.id, options)
      });
    }
  };

  // Force grid view on mobile for better responsiveness
  const effectiveViewMode = isMobile ? 'grid' : viewMode;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterFunction, sortBy, itemsPerPage]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Atualização em tempo real das médias de avaliação
  useEffect(() => {
    const teamId = activeTeam?.id;
    if (!teamId) return;

    const refetchAverages = async () => {
      const { data, error } = await supabase
        .from('freelancer_ratings')
        .select('freelancer_id, rating')
        .eq('team_id', teamId);
      if (error) return;
      const acc: Record<string, { sum: number; count: number }> = {};
      for (const row of (data || []) as Array<{ freelancer_id: string; rating: number }>) {
        const id = row.freelancer_id;
        const rating = row.rating;
        if (!acc[id]) acc[id] = { sum: 0, count: 0 };
        acc[id].sum += rating || 0;
        acc[id].count += 1;
      }
      const avg: Record<string, number> = {};
      Object.keys(acc).forEach(id => {
        avg[id] = acc[id].count > 0 ? acc[id].sum / acc[id].count : 0;
      });
      setRatingsAvg(avg);
    };

    // Initial fetch
    refetchAverages();

    const channel = supabase
      .channel(`manage_personnel_ratings_${teamId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'freelancer_ratings',
        filter: `team_id=eq.${teamId}`
      }, () => {
        refetchAverages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTeam]);

  // Handle actions
  const handleEdit = (person: Personnel) => {
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || userRole === 'admin' || userRole === 'superadmin';
    if (!isAdmin) return;
    setEditingPersonnel(person);
    setShowForm(true);
  };
  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta pessoa?')) {
      await deletePersonnelMutation.mutateAsync(id);
    }
  };
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPersonnel(null);
  };
  const handleRating = (person: Personnel) => {
    if (person.type === 'freelancer') {
      setRatingPersonnel(person);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || userRole === 'admin' || userRole === 'superadmin';
  const isCoordinator = user?.role === 'coordinator' || userRole === 'coordinator';
  const canCreatePersonnel = isAdmin || isCoordinator;

  const handleAddPersonnel = async () => {
    if (!activeTeam) return;

    try {
      const result = await checkLimits.mutateAsync({
        teamId: activeTeam.id,
        action: 'add_personnel'
      });

      if (!result.can_proceed) {
        setLimitCheckResult(result);
        setUpgradePromptOpen(true);
        return;
      }

      setShowForm(true);
    } catch (error) {
      console.error('Error checking limits:', error);
      setShowForm(true); // Allow creation if check fails
    }
  };

  const exportTeamId = activeTeam?.id;
  const isFilterActive = !!searchTerm.trim() || filterType !== 'all' || filterFunction !== 'all';

  const handleOpenExport = () => {
    navigate('/app/pessoal/exportar', {
      state: {
        filters: {
          search: debouncedSearchTerm || undefined,
          type: filterType,
          functionId: filterFunction,
          sortBy,
        },
        filteredCount: totalCount,
        isFilterActive,
      },
    });
  };
  
  return <div className="min-h-screen w-full max-w-full p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 box-border py-[2px] px-[2px]">
      <div className="space-y-4">
        <div className="flex flex-col space-y-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Gestão de Pessoal</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie toda a equipe da organização</p>
        </div>
        
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
        <div className="order-2 sm:order-1 w-full sm:flex-1">
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleOpenExport} disabled={!exportTeamId || totalCount === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <div className="text-xs text-muted-foreground mt-2">
            Exportação abre uma tela dedicada para escolher colunas, escopo (filtrado/todos) e formato (PDF/CSV).
          </div>
        </div>
        {canCreatePersonnel && (
          <Button onClick={handleAddPersonnel} className="order-1 sm:order-2 w-full sm:w-auto" size="default">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar Pessoa
          </Button>
        )}
      </div>
      </div>

      <PersonnelStats personnel={personnel} />

      <PersonnelFilters searchTerm={searchTerm} onSearchChange={setSearchTerm} filterType={filterType} onTypeChange={setFilterType} filterFunction={filterFunction} onFunctionChange={setFilterFunction} functions={functions} sortBy={sortBy} onSortChange={setSortBy} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="text-sm text-muted-foreground order-2 sm:order-1 flex items-center gap-2">
          <span>{totalCount} pessoa(s) encontrada(s)</span>
          {isFetching && (
            <span className="text-xs text-primary animate-pulse">
              • Atualizando...
            </span>
          )}
        </div>
        <div className="order-1 sm:order-2 w-full sm:w-auto flex items-center gap-2">
          <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Itens" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 por página</SelectItem>
              <SelectItem value="24">24 por página</SelectItem>
              <SelectItem value="48">48 por página</SelectItem>
            </SelectContent>
          </Select>
          {!isMobile && (
            <PersonnelViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          )}
        </div>
      </div>

      {personnel.length === 0 && !isLoading ? <EmptyState icon={<Users className="w-12 h-12" />} title="Nenhuma pessoa encontrada" description={searchTerm || filterType !== 'all' || filterFunction !== 'all' ? "Tente ajustar os filtros de busca" : "Cadastre a primeira pessoa para começar"} action={canCreatePersonnel ? {
      label: "Cadastrar Primeira Pessoa",
      onClick: () => setShowForm(true)
    } : undefined} /> : <div className="w-full space-y-4">
          <PersonnelList 
            personnel={personnel} 
            functions={functions} 
            viewMode={effectiveViewMode} 
            isLoading={isLoading}
            onEdit={handleEdit} 
            onDelete={handleDelete} 
            canEdit={() => isAdmin}
            onRate={canCreatePersonnel ? handleRating : undefined}
          />

          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={currentPage === page}
                          onClick={() => setCurrentPage(page)}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    onMouseEnter={prefetchNextPage}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>}

      {showForm && <PersonnelForm personnel={editingPersonnel} onClose={handleCloseForm} onSuccess={handleCloseForm} />}

      {ratingPersonnel && (
        <FreelancerRatingDialog
          freelancerId={ratingPersonnel.id}
          freelancerName={ratingPersonnel.name}
          open={!!ratingPersonnel}
          onOpenChange={(open) => {
            if (!open) setRatingPersonnel(null);
          }}
          onRatingSubmitted={() => setRatingPersonnel(null)}
        />
      )}

      <UpgradePrompt
        open={upgradePromptOpen}
        onOpenChange={setUpgradePromptOpen}
        reason={limitCheckResult?.reason || ''}
        currentPlan={limitCheckResult?.current_plan}
        limit={limitCheckResult?.limit}
        currentCount={limitCheckResult?.current_count}
      />
    </div>;
};
