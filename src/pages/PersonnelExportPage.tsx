import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Download, FileSpreadsheet, FileText, Info } from 'lucide-react';
import { useTeam } from '@/contexts/TeamContext';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import type { Personnel, Func } from '@/contexts/EnhancedDataContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { safeLocalStorage } from '@/utils/safeStorage';
import { fetchPersonnelForExport } from '@/hooks/queries/usePersonnelQuery';
import { exportToCSV, exportToPDF } from '@/utils/exportUtils';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PersonnelExportColumnPicker } from '@/components/personnel/PersonnelExportColumnPicker';
import {
  getDefaultVisiblePersonnelExportColumns,
  getPersonnelExportColumnLabel,
  sanitizePersonnelExportColumns,
  type PersonnelExportColumnId,
} from '@/components/personnel/personnelExportColumns';

type ExportScope = 'filtered' | 'all';

type ExportState = {
  filters?: {
    search?: string;
    type?: 'all' | 'fixo' | 'freelancer';
    functionId?: string;
    sortBy?: 'name_asc' | 'name_desc' | 'rating_desc' | 'rating_asc';
  };
  filteredCount?: number;
  isFilterActive?: boolean;
};

export const PersonnelExportPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { activeTeam } = useTeam();
  const { functions } = useEnhancedData();

  const state = (location.state || {}) as ExportState;
  const filters = state.filters || {};

  const defaultScope: ExportScope = state.isFilterActive ? 'filtered' : 'all';
  const [scope, setScope] = useState<ExportScope>(defaultScope);
  const [isExporting, setIsExporting] = useState(false);

  const columnsStorageKey = activeTeam?.id ? `personnel_export_columns:${activeTeam.id}` : 'personnel_export_columns';
  const [visibleColumns, setVisibleColumns] = useState<PersonnelExportColumnId[]>(() => {
    const raw = safeLocalStorage.getItem(columnsStorageKey);
    if (!raw) return getDefaultVisiblePersonnelExportColumns();
    try {
      return sanitizePersonnelExportColumns(JSON.parse(raw));
    } catch {
      return getDefaultVisiblePersonnelExportColumns();
    }
  });

  useEffect(() => {
    const raw = safeLocalStorage.getItem(columnsStorageKey);
    if (!raw) {
      setVisibleColumns(getDefaultVisiblePersonnelExportColumns());
      return;
    }
    try {
      setVisibleColumns(sanitizePersonnelExportColumns(JSON.parse(raw)));
    } catch {
      setVisibleColumns(getDefaultVisiblePersonnelExportColumns());
    }
  }, [columnsStorageKey]);

  useEffect(() => {
    safeLocalStorage.setItem(columnsStorageKey, JSON.stringify(visibleColumns));
  }, [columnsStorageKey, visibleColumns]);

  const functionLabel = useMemo(() => {
    if (!filters.functionId || filters.functionId === 'all') return 'Todas';
    return functions.find(f => f.id === filters.functionId)?.name || '—';
  }, [filters.functionId, functions]);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.search) parts.push(`Busca: “${filters.search}”`);
    if (filters.type && filters.type !== 'all') parts.push(`Tipo: ${filters.type}`);
    if (filters.functionId && filters.functionId !== 'all') parts.push(`Função: ${functionLabel}`);
    if (filters.sortBy) parts.push(`Ordenação: ${filters.sortBy}`);
    return parts.length ? parts.join(' · ') : 'Sem filtros';
  }, [filters.functionId, filters.search, filters.sortBy, filters.type, functionLabel]);

  const headers = useMemo(() => visibleColumns.map(getPersonnelExportColumnLabel), [visibleColumns]);

  const buildRow = (person: Personnel): Record<string, unknown> => {
    const row: Record<string, unknown> = {};

    const getValue = (col: PersonnelExportColumnId): unknown => {
      switch (col) {
        case 'id':
          return person.id || '';
        case 'name':
          return person.name || '';
        case 'type':
          return person.type || '';
        case 'functions':
          return person.functions?.map((f: Func) => f.name).join(', ') || '';
        case 'primaryFunction':
          return person.primaryFunctionId
            ? (person.functions?.find((f: Func) => f.id === person.primaryFunctionId)?.name || '')
            : '';
        case 'email':
          return person.email || person.email_masked || '';
        case 'phone':
          return person.phone || person.phone_masked || '';
        case 'phoneSecondary':
          return person.phone_secondary || '';
        case 'cpf':
          return person.cpf || person.cpf_masked || '';
        case 'rg':
          return person.rg || '';
        case 'birthDate':
          return person.birth_date ? formatDate(person.birth_date) : '';
        case 'mothersName':
          return person.mothers_name || '';
        case 'cnpj':
          return person.cnpj || person.cnpj_masked || '';
        case 'monthlySalary':
          return formatCurrency(person.monthly_salary || 0);
        case 'eventCache':
          return formatCurrency(person.event_cache || 0);
        case 'overtimeRate':
          return formatCurrency(person.overtime_rate || 0);
        case 'shirtSize':
          return person.shirt_size || '';
        case 'photoUrl':
          return person.photo_url || '';
        case 'addressZipCode':
          return person.address_zip_code || '';
        case 'addressStreet':
          return person.address_street || '';
        case 'addressNumber':
          return person.address_number || '';
        case 'addressComplement':
          return person.address_complement || '';
        case 'addressNeighborhood':
          return person.address_neighborhood || '';
        case 'addressCity':
          return person.address_city || '';
        case 'addressState':
          return person.address_state || '';
      }
    };

    visibleColumns.forEach(col => {
      row[getPersonnelExportColumnLabel(col)] = getValue(col);
    });

    return row;
  };

  const buildOptions = () => {
    const sortBy = filters.sortBy || 'name_asc';

    if (scope === 'all') {
      return { sortBy } as const;
    }

    return {
      search: filters.search || undefined,
      type: filters.type || 'all',
      functionId: filters.functionId || 'all',
      sortBy,
    } as const;
  };

  const handleExport = async (kind: 'csv' | 'pdf') => {
    if (!activeTeam?.id) {
      toast({
        title: 'Erro',
        description: 'Nenhuma equipe ativa selecionada.',
        variant: 'destructive',
      });
      return;
    }

    if (!visibleColumns.length) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos uma coluna.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      toast({
        title: 'Exportando',
        description: 'Gerando arquivo, aguarde…',
      });

      const options = buildOptions();
      const result = await fetchPersonnelForExport(activeTeam.id, options);
      const data = result.data.map(buildRow);

      const baseName = scope === 'all' ? 'pessoal_todos' : 'pessoal_filtrado';
      if (kind === 'csv') {
        exportToCSV(data, baseName, headers);
        toast({
          title: 'Sucesso',
          description: 'CSV gerado com sucesso. Você pode abrir no Excel/Google Sheets.',
        });
        return;
      }

      const title = scope === 'all' ? 'Relatório de Pessoal (Todos)' : 'Relatório de Pessoal (Filtrado)';
      exportToPDF(data, headers, title, baseName);
      toast({
        title: 'Sucesso',
        description: 'PDF gerado com sucesso.',
      });
    } catch (error) {
      logger.query.error('personnel_export_page', error);
      toast({
        title: 'Erro',
        description: 'Falha ao exportar. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const isFilterActive = !!state.isFilterActive;
  const filteredCount = state.filteredCount;

  return (
    <div className="min-h-screen bg-muted/10 p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/app/pessoal')} disabled={isExporting}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="space-y-0.5">
            <div className="text-lg font-bold">Exportar Pessoal</div>
            <div className="text-xs text-muted-foreground">Escolha escopo, colunas e formato do arquivo.</div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Button onClick={() => handleExport('csv')} disabled={isExporting} variant="outline">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={() => handleExport('pdf')} disabled={isExporting}>
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Como funciona</AlertTitle>
        <AlertDescription>
          1) Selecione o escopo (filtrado ou todos). 2) Marque as colunas desejadas. 3) Gere PDF ou CSV.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Escopo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2">
              <Button
                variant={scope === 'filtered' ? 'default' : 'outline'}
                onClick={() => setScope('filtered')}
                disabled={isExporting}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Filtrado
              </Button>
              <Button
                variant={scope === 'all' ? 'default' : 'outline'}
                onClick={() => setScope('all')}
                disabled={isExporting}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Todos
              </Button>
            </div>

            <Separator />

            <div className="text-sm">
              <div className="font-semibold mb-1">Resumo dos filtros</div>
              <div className="text-muted-foreground break-words">{filterSummary}</div>
              {scope === 'filtered' && !isFilterActive && (
                <div className="text-xs text-muted-foreground mt-2">
                  Nenhum filtro veio da tela anterior. “Filtrado” e “Todos” terão o mesmo resultado.
                </div>
              )}
              {scope === 'filtered' && typeof filteredCount === 'number' && (
                <div className="text-xs text-muted-foreground mt-2">Itens no filtro atual: {filteredCount}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Colunas</CardTitle>
          </CardHeader>
          <CardContent>
            <PersonnelExportColumnPicker value={visibleColumns} onChange={setVisibleColumns} disabled={isExporting} />
          </CardContent>
        </Card>
      </div>

      <div className="sm:hidden flex flex-col gap-2">
        <Button onClick={() => handleExport('csv')} disabled={isExporting} variant="outline" className="w-full">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
        <Button onClick={() => handleExport('pdf')} disabled={isExporting} className="w-full">
          <FileText className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>
    </div>
  );
};

export default PersonnelExportPage;
