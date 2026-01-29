import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, User, FileText, Search, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { formatDate, formatDateTime } from '@/utils/formatters';
import { PaginationControl } from '@/components/shared/PaginationControl';

interface AbsenceHistoryDetail {
  id: string;
  work_date: string;
  notes?: string;
  created_at: string;
  logged_by_id?: string;
  logged_by_name?: string;
  personnel_name: string;
  division_name: string;
  function_name: string;
}

interface AbsenceHistoryProps {
  eventId: string;
}

const ITEMS_PER_PAGE = 10;

const fetchEventAbsenceHistory = async (eventId: string, teamId: string): Promise<AbsenceHistoryDetail[]> => {
  const { data, error } = await supabase
    .from('absences')
    .select(`
      id,
      work_date,
      notes,
      created_at,
      logged_by_id,
      personnel_allocations!inner(
        personnel_id,
        function_name,
        event_divisions!inner(
          name
        ),
        personnel!inner(
          name
        )
      ),
      user_profiles(
        name
      )
    `)
    .eq('team_id', teamId)
    .eq('personnel_allocations.event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching absence history:', error);
    throw error;
  }

  return (data || []).map(absence => ({
    id: absence.id,
    work_date: absence.work_date,
    notes: absence.notes,
    created_at: absence.created_at,
    logged_by_id: absence.logged_by_id,
    logged_by_name: absence.user_profiles?.name || 'Sistema',
    personnel_name: absence.personnel_allocations.personnel.name,
    division_name: absence.personnel_allocations.event_divisions.name,
    function_name: absence.personnel_allocations.function_name,
  }));
};

export const AbsenceHistory: React.FC<AbsenceHistoryProps> = ({ eventId }) => {
  const { user } = useAuth();
  const { activeTeam } = useTeam();
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: absenceHistory = [], isLoading } = useQuery({
    queryKey: ['absence-history', eventId, activeTeam?.id],
    queryFn: () => fetchEventAbsenceHistory(eventId, activeTeam!.id),
    enabled: !!eventId && !!activeTeam?.id,
  });

  // Get unique divisions for filter
  const divisions = Array.from(new Set(absenceHistory.map(a => a.division_name)));

  // Filter absences based on search and division
  const filteredAbsences = absenceHistory.filter(absence => {
    const matchesSearch = searchTerm === '' || 
      absence.personnel_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      absence.function_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (absence.notes && absence.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDivision = divisionFilter === 'all' || absence.division_name === divisionFilter;
    
    return matchesSearch && matchesDivision;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredAbsences.length / ITEMS_PER_PAGE);
  const paginatedAbsences = filteredAbsences.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, divisionFilter]);

  if (user?.role !== 'admin') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Apenas administradores podem visualizar o histórico de faltas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <Clock className="w-4 md:w-5 h-4 md:h-5" />
            Histórico de Faltas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por nome, função ou observações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={divisionFilter} onValueChange={setDivisionFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por divisão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as divisões</SelectItem>
                {divisions.map(division => (
                  <SelectItem key={division} value={division}>
                    {division}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {filteredAbsences.length} falta{filteredAbsences.length !== 1 ? 's' : ''} encontrada{filteredAbsences.length !== 1 ? 's' : ''}
            {absenceHistory.length !== filteredAbsences.length && ` de ${absenceHistory.length} total`}
          </div>
        </CardContent>
      </Card>

      {/* Absence List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando histórico de faltas...</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredAbsences.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || divisionFilter !== 'all' 
                ? 'Nenhuma falta encontrada com os filtros aplicados.'
                : 'Nenhuma falta foi registrada para este evento.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {paginatedAbsences.map((absence) => (
              <Card key={absence.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{absence.personnel_name}</h4>
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {absence.division_name}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Função: {absence.function_name}
                      </p>
                    </div>
                    <div className="text-right text-xs ml-2">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(absence.work_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>Por: {absence.logged_by_name}</span>
                      <span className="text-xs">
                        • {formatDateTime(absence.created_at)}
                      </span>
                    </div>

                    {absence.notes && (
                      <div className="flex items-start gap-2 text-xs">
                        <FileText className="w-3 h-3 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-muted-foreground">Obs: </span>
                          <span>{absence.notes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <PaginationControl
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={filteredAbsences.length}
          />
        </div>
      )}
    </div>
  );
};