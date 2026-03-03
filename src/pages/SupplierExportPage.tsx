import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, FileSpreadsheet, FileText, Info } from 'lucide-react';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import { safeLocalStorage } from '@/utils/safeStorage';
import { logger } from '@/utils/logger';
import { exportToCSV, exportToPDF } from '@/utils/exportUtils';
import { formatCNPJ, formatPhoneBrazil } from '@/utils/supplierUtils';
import { SupplierExportColumnPicker } from '@/components/suppliers/SupplierExportColumnPicker';
import {
  getDefaultVisibleSupplierReportColumns,
  getSupplierReportColumnLabel,
  sanitizeSupplierReportColumns,
  type SupplierReportColumnId,
} from '@/components/suppliers/supplierReportColumns';

type ExportScope = 'filtered' | 'all';

type ExportState = {
  filters?: {
    search?: string;
    city?: string;
    state?: string;
  };
  filteredCount?: number;
  isFilterActive?: boolean;
};

const buildSupplierExportRow = (supplier: any): Record<SupplierReportColumnId, unknown> => {
  return {
    nome_fantasia: supplier.name ?? '',
    razao_social: supplier.legal_name ?? '',
    cnpj: supplier.cnpj ? formatCNPJ(supplier.cnpj) : '',
    inscricao_estadual: supplier.state_registration ?? '',
    inscricao_municipal: supplier.municipal_registration ?? '',
    cep: supplier.address_zip_code ?? '',
    logradouro: supplier.address_street ?? '',
    numero: supplier.address_number ?? '',
    complemento: supplier.address_complement ?? '',
    bairro: supplier.address_neighborhood ?? '',
    cidade: supplier.address_city ?? '',
    estado: supplier.address_state ?? '',
    pessoa_contato: supplier.contact_person ?? '',
    telefone_1: supplier.phone ? formatPhoneBrazil(supplier.phone) : '',
    telefone_2: supplier.phone_secondary ? formatPhoneBrazil(supplier.phone_secondary) : '',
    email: supplier.email ?? '',
    avaliacao_media: typeof supplier.average_rating === 'number' ? supplier.average_rating.toFixed(1) : '0.0',
    total_avaliacoes: supplier.total_ratings ?? 0,
    observacoes: supplier.notes ?? '',
  };
};

const normalize = (v: unknown) => String(v ?? '').trim();

const filterSuppliers = (
  suppliers: any[],
  filters: {
    search?: string;
    city?: string;
    state?: string;
  }
) => {
  const search = normalize(filters.search);
  const selectedCity = normalize(filters.city);
  const selectedState = normalize(filters.state);

  const hasSearch = !!search;
  const hasCity = !!selectedCity && selectedCity !== 'all';
  const hasState = !!selectedState && selectedState !== 'all';

  if (!hasSearch && !hasCity && !hasState) return suppliers;

  const term = search.toLowerCase();
  const digits = search.replace(/\D/g, '');

  return suppliers.filter((supplier) => {
    if (hasCity && normalize(supplier.address_city) !== selectedCity) return false;
    if (hasState && normalize(supplier.address_state) !== selectedState) return false;

    if (!hasSearch) return true;

    const name = String(supplier.name || '').toLowerCase();
    const legal = String(supplier.legal_name || '').toLowerCase();
    const cnpj = String(supplier.cnpj || '');
    const contact = String(supplier.contact_person || '').toLowerCase();
    const email = String(supplier.email || '').toLowerCase();
    const city = String(supplier.address_city || '').toLowerCase();
    return (
      name.includes(term) ||
      legal.includes(term) ||
      (digits && cnpj.includes(digits)) ||
      contact.includes(term) ||
      email.includes(term) ||
      city.includes(term)
    );
  });
};

export const SupplierExportPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { activeTeam } = useTeam();
  const { suppliers } = useEnhancedData();

  const state = (location.state || {}) as ExportState;
  const incomingFilters = state.filters || {};
  const incomingIsFilterActive = !!state.isFilterActive;
  const incomingFilteredCount = state.filteredCount;

  const [filters, setFilters] = useState<{ search: string; city: string; state: string }>(() => ({
    search: incomingFilters.search ? String(incomingFilters.search) : '',
    city: incomingFilters.city ? String(incomingFilters.city) : 'all',
    state: incomingFilters.state ? String(incomingFilters.state) : 'all',
  }));

  const isFilterActive = useMemo(() => {
    const hasSearch = !!filters.search.trim();
    const hasCity = filters.city !== 'all';
    const hasState = filters.state !== 'all';
    return hasSearch || hasCity || hasState;
  }, [filters.city, filters.search, filters.state]);

  const defaultScope: ExportScope = incomingIsFilterActive ? 'filtered' : 'all';
  const [scope, setScope] = useState<ExportScope>(defaultScope);
  const [isExporting, setIsExporting] = useState(false);

  const columnsStorageKey = activeTeam?.id ? `suppliers_report_columns:${activeTeam.id}` : 'suppliers_report_columns';
  const [visibleColumns, setVisibleColumns] = useState<SupplierReportColumnId[]>(() => {
    const raw = safeLocalStorage.getItem(columnsStorageKey);
    if (!raw) return getDefaultVisibleSupplierReportColumns();
    try {
      return sanitizeSupplierReportColumns(JSON.parse(raw));
    } catch {
      return getDefaultVisibleSupplierReportColumns();
    }
  });

  useEffect(() => {
    const raw = safeLocalStorage.getItem(columnsStorageKey);
    if (!raw) {
      setVisibleColumns(getDefaultVisibleSupplierReportColumns());
      return;
    }
    try {
      setVisibleColumns(sanitizeSupplierReportColumns(JSON.parse(raw)));
    } catch {
      setVisibleColumns(getDefaultVisibleSupplierReportColumns());
    }
  }, [columnsStorageKey]);

  useEffect(() => {
    safeLocalStorage.setItem(columnsStorageKey, JSON.stringify(visibleColumns));
  }, [columnsStorageKey, visibleColumns]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    for (const s of suppliers || []) {
      const c = normalize(s.address_city);
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [suppliers]);

  const availableStates = useMemo(() => {
    const set = new Set<string>();
    for (const s of suppliers || []) {
      const st = normalize(s.address_state);
      if (st) set.add(st);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [suppliers]);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.search.trim()) parts.push(`Busca: “${filters.search.trim()}”`);
    if (filters.city !== 'all') parts.push(`Cidade: ${filters.city}`);
    if (filters.state !== 'all') parts.push(`Estado: ${filters.state}`);
    return parts.length ? parts.join(' · ') : 'Sem filtros';
  }, [filters.city, filters.search, filters.state]);

  const filteredSuppliers = useMemo(() => filterSuppliers(suppliers || [], filters), [filters, suppliers]);

  const scopedSuppliers = useMemo(() => {
    if (scope === 'filtered') return filteredSuppliers;
    return suppliers || [];
  }, [filteredSuppliers, scope, suppliers]);

  const exportHeaders = useMemo(
    () => visibleColumns.map((id) => ({ key: id, label: getSupplierReportColumnLabel(id) })),
    [visibleColumns]
  );

  const exportData = useMemo(() => scopedSuppliers.map(buildSupplierExportRow), [scopedSuppliers]);

  const previewRows = useMemo(() => exportData.slice(0, 10), [exportData]);

  const handleExport = async (kind: 'csv' | 'pdf') => {
    if (exportData.length === 0) {
      toast({
        title: 'Sem dados',
        description: 'Nenhum fornecedor para exportar com o escopo atual.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      const baseName = scope === 'all' ? 'fornecedores_todos' : 'fornecedores_filtrado';
      const title = scope === 'all' ? 'Relatório de Fornecedores (Todos)' : 'Relatório de Fornecedores (Filtrado)';
      const titleWithTeam = activeTeam?.name ? `${title} — ${activeTeam.name}` : title;

      if (kind === 'csv') {
        exportToCSV(exportData, baseName, exportHeaders);
        toast({ title: 'Sucesso', description: 'CSV exportado com sucesso' });
        return;
      }

      exportToPDF(exportData, exportHeaders, titleWithTeam, baseName);
      toast({ title: 'Sucesso', description: 'PDF exportado com sucesso' });
    } catch (error) {
      logger.query.error('suppliers_export', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao exportar',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/10 p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/app/fornecedores')} disabled={isExporting}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="space-y-0.5">
            <div className="text-lg font-bold">Exportar Fornecedores</div>
            <div className="text-xs text-muted-foreground">Escolha escopo, colunas e visualize antes de exportar.</div>
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
        <AlertDescription>1) Selecione o escopo. 2) Marque as colunas. 3) Confira a prévia. 4) Exporte em PDF ou CSV.</AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Escopo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2">
              <Button variant={scope === 'filtered' ? 'default' : 'outline'} onClick={() => setScope('filtered')} disabled={isExporting}>
                <Download className="w-4 h-4 mr-2" />
                Exportar Filtrado
              </Button>
              <Button variant={scope === 'all' ? 'default' : 'outline'} onClick={() => setScope('all')} disabled={isExporting}>
                <Download className="w-4 h-4 mr-2" />
                Exportar Todos
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="text-sm font-semibold">Filtros</div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Busca</div>
                <Input
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="Nome, razão social, CNPJ, contato, email ou cidade…"
                  disabled={isExporting}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Cidade</div>
                <Select value={filters.city} onValueChange={(v) => setFilters((prev) => ({ ...prev, city: v }))} disabled={isExporting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {availableCities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Estado</div>
                <Select value={filters.state} onValueChange={(v) => setFilters((prev) => ({ ...prev, state: v }))} disabled={isExporting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {availableStates.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({ search: '', city: 'all', state: 'all' })}
                  disabled={isExporting || !isFilterActive}
                >
                  Limpar filtros
                </Button>
              </div>
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
              {scope === 'filtered' && typeof incomingFilteredCount === 'number' && incomingIsFilterActive && (
                <div className="text-xs text-muted-foreground mt-2">Itens no filtro na tela anterior: {incomingFilteredCount}</div>
              )}
              {scope === 'filtered' && isFilterActive && <div className="text-xs text-muted-foreground mt-2">Itens no filtro atual: {filteredSuppliers.length}</div>}
              <div className="text-xs text-muted-foreground mt-2">Total no escopo atual: {exportData.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Colunas</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierExportColumnPicker value={visibleColumns} onChange={setVisibleColumns} disabled={isExporting} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pré-visualização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Mostrando {Math.min(previewRows.length, 10)} de {exportData.length} linhas.
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  {exportHeaders.map((h) => (
                    <TableHead key={h.key}>{h.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, idx) => (
                  <TableRow key={idx}>
                    {exportHeaders.map((h) => (
                      <TableCell key={h.key} className="max-w-[260px] whitespace-normal">
                        {String((row as any)[h.key] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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

export default SupplierExportPage;
