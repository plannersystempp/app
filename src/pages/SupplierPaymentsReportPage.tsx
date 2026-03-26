import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExportDropdown } from '@/components/shared/ExportDropdown';
import { useTeam } from '@/contexts/TeamContext';
import { formatCurrency } from '@/utils/formatters';
import { formatDateShort } from '@/utils/dateUtils';
import FilterChips from '@/components/dashboard/FilterChips';
import { useSupplierPaymentsReport } from '@/hooks/reports/useSupplierPaymentsReport';
import type { SupplierPaymentsStatusFilter } from '@/utils/supplierPaymentsReport';
import { FileText, Printer } from 'lucide-react';
import { useEventsQuery } from '@/hooks/queries/useEventsQuery';
import { useSuppliersQuery } from '@/hooks/queries/useSuppliersQuery';
import { useSupplierCostsQuery } from '@/hooks/queries/useSupplierCostsQuery';
import { safeLocalStorage } from '@/utils/safeStorage';
import { SupplierPaymentsReportColumnSelector } from '@/components/suppliers/SupplierPaymentsReportColumnSelector';
import { useSearchParams } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useReportBranding } from '@/hooks/useReportBranding';
import {
  getDefaultVisibleSupplierPaymentsReportColumns,
  getSupplierPaymentsReportColumnLabel,
  sanitizeSupplierPaymentsReportColumns,
  type SupplierPaymentsReportColumnId,
} from '@/components/suppliers/supplierPaymentsReportColumns';

const isoToday = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const isoMonthStart = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
};

export default function SupplierPaymentsReportPage() {
  const { activeTeam } = useTeam();
  const eventsQuery = useEventsQuery();
  const suppliersQuery = useSuppliersQuery();
  const [searchParams] = useSearchParams();
  const { branding, setLogoDataUrl, setPaperLetterhead, setShowLogo } = useReportBranding(activeTeam?.id);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const eventIdFromUrl = searchParams.get('eventId')?.trim() ?? '';

  const [startDate, setStartDate] = useState<string>(() => (eventIdFromUrl ? '' : isoMonthStart()));
  const [endDate, setEndDate] = useState<string>(() => (eventIdFromUrl ? '' : isoToday()));
  const [status, setStatus] = useState<SupplierPaymentsStatusFilter>('todos');
  const [supplierId, setSupplierId] = useState<string>('all');
  const [eventId, setEventId] = useState<string>(() => (eventIdFromUrl ? eventIdFromUrl : 'all'));

  useEffect(() => {
    if (!eventIdFromUrl) return;
    setEventId(eventIdFromUrl);
    setStartDate('');
    setEndDate('');
  }, [eventIdFromUrl]);

  const filters = useMemo(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status,
      supplierId: supplierId === 'all' ? undefined : supplierId,
      eventId: eventId === 'all' ? undefined : eventId,
    }),
    [endDate, eventId, startDate, status, supplierId]
  );

  const costsQuery = useSupplierCostsQuery(filters);

  const isLoading = eventsQuery.isLoading || suppliersQuery.isLoading || costsQuery.isLoading;
  const loadError = eventsQuery.error || suppliersQuery.error || costsQuery.error;

  const columnsStorageKey = activeTeam?.id
    ? `supplier_payments_report_columns:${activeTeam.id}`
    : 'supplier_payments_report_columns';
  const [visibleColumns, setVisibleColumns] = useState<SupplierPaymentsReportColumnId[]>(() => {
    const raw = safeLocalStorage.getItem(columnsStorageKey);
    if (!raw) return getDefaultVisibleSupplierPaymentsReportColumns();
    try {
      return sanitizeSupplierPaymentsReportColumns(JSON.parse(raw));
    } catch {
      return getDefaultVisibleSupplierPaymentsReportColumns();
    }
  });

  useEffect(() => {
    const raw = safeLocalStorage.getItem(columnsStorageKey);
    if (!raw) {
      setVisibleColumns(getDefaultVisibleSupplierPaymentsReportColumns());
      return;
    }
    try {
      setVisibleColumns(sanitizeSupplierPaymentsReportColumns(JSON.parse(raw)));
    } catch {
      setVisibleColumns(getDefaultVisibleSupplierPaymentsReportColumns());
    }
  }, [columnsStorageKey]);

  useEffect(() => {
    safeLocalStorage.setItem(columnsStorageKey, JSON.stringify(visibleColumns));
  }, [columnsStorageKey, visibleColumns]);

  const exportHeaders = useMemo(
    () => visibleColumns.map((id) => ({ key: id, label: getSupplierPaymentsReportColumnLabel(id) })),
    [visibleColumns]
  );

  const { rows, totals } = useSupplierPaymentsReport({
    costs: costsQuery.data || [],
    events: (eventsQuery.data || []).map((e) => ({ id: e.id, name: e.name })),
    suppliers: (suppliersQuery.data || []).map((s) => ({ id: s.id, name: s.name })),
    filters,
  });

  const exportItems = useMemo(() => {
    const baseFilename = 'relatorio_pagamentos_fornecedores';
    const baseTitle = 'Relatório de Pagamentos de Fornecedores';
    const periodLabel = `${startDate || '-'}_a_${endDate || '-'}`;

    const selectedHeaders = exportHeaders;

    return [
      {
        kind: 'csv' as const,
        label: 'Exportar CSV',
        getPayload: async () => {
          const data = rows.map((r) => ({
            fornecedor: r.supplierName,
            evento: r.eventName,
            descricao: r.description,
            quantidade: r.quantity,
            valor_unitario: r.unitPrice,
            valor_total: r.totalAmount,
            valor_pago: r.paidAmount,
            valor_pendente: r.pendingAmount,
            status: r.statusLabel,
            data_pagamento: r.paymentDate || '',
          }));

          return {
            data,
            headers: selectedHeaders,
            filename: `${baseFilename}_${periodLabel}`,
            title: baseTitle,
          };
        },
      },
      {
        kind: 'pdf' as const,
        label: 'Exportar PDF',
        getPayload: async () => {
          const data = rows.map((r) => ({
            fornecedor: r.supplierName,
            evento: r.eventName,
            descricao: r.description,
            quantidade: r.quantity,
            valor_unitario: formatCurrency(r.unitPrice),
            valor_total: formatCurrency(r.totalAmount),
            valor_pago: formatCurrency(r.paidAmount),
            valor_pendente: formatCurrency(r.pendingAmount),
            status: r.statusLabel,
            data_pagamento: r.paymentDate ? formatDateShort(r.paymentDate) : '-',
          }));

          const titleWithTeam = activeTeam?.name ? `${baseTitle} — ${activeTeam.name}` : baseTitle;
          return {
            data,
            headers: selectedHeaders,
            filename: `${baseFilename}_${periodLabel}`,
            title: titleWithTeam,
          };
        },
      },
    ];
  }, [activeTeam?.name, endDate, exportHeaders, rows, startDate]);

  const selectedEventLabel = useMemo(() => {
    if (eventId === 'all') return 'Todos';
    const found = (eventsQuery.data || []).find((e) => e.id === eventId);
    return found?.name || '—';
  }, [eventId, eventsQuery.data]);

  const handlePrint = () => {
    window.print();
  };

  const handlePickLogo = () => {
    logoInputRef.current?.click();
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) return;

    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.readAsDataURL(file);
    });

    if (!dataUrl) return;
    setLogoDataUrl(dataUrl);
    setShowLogo(true);
  };

  const clearFilters = () => {
    setStartDate(isoMonthStart());
    setEndDate(isoToday());
    setStatus('todos');
    setSupplierId('all');
    setEventId('all');
  };

  return (
    <div className="min-h-screen space-y-4">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          .print-section, .print-section * {
            visibility: visible;
          }

          .print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20mm;
          }

          .print-section.letterhead {
            padding-top: 40mm;
          }

          @page {
            size: A4;
            margin: 10mm;
          }

          .supplier-report-page .report-info {
            background-color: #f0f0f0 !important;
            border: 1px solid #000;
            padding: 12px;
            border-radius: 0;
            font-size: 10pt;
            margin-bottom: 1rem;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .supplier-report-page .report-title {
            font-size: 18pt;
            font-weight: bold;
            color: #000;
            margin-bottom: 12px;
          }

          .supplier-report-page .report-table-container {
            background: white;
            border: 1px solid #000;
            border-radius: 0;
            padding: 0;
            margin: 1rem 0;
            box-shadow: none;
            page-break-inside: avoid;
          }

          .supplier-report-page .report-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
            font-size: 10pt;
          }

          .supplier-report-page .report-th {
            background-color: #e0e0e0 !important;
            border: 1px solid #000;
            padding: 8px 6px;
            font-weight: bold;
            font-size: 10pt;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .supplier-report-page .report-td {
            border: 1px solid #000;
            padding: 6px 6px;
            font-size: 9pt;
            color: #000;
            vertical-align: top;
          }

          .supplier-report-page .report-row-even {
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .supplier-report-page .report-row-odd {
            background-color: #f5f5f5 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .supplier-report-page .report-summary {
            border: 2px solid #000 !important;
            padding: 12px !important;
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">Relatório de Pagamentos de Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Filtre por período, status, fornecedor e evento, e exporte CSV/PDF.</p>
        </div>
        <div className="flex items-center gap-2">
          <SupplierPaymentsReportColumnSelector visibleColumns={visibleColumns} onChange={setVisibleColumns} disabled={isLoading || rows.length === 0} />
          <ExportDropdown
            data={[]}
            filename="relatorio_pagamentos_fornecedores"
            title="Relatório de Pagamentos de Fornecedores"
            items={exportItems}
            disabled={isLoading || rows.length === 0}
          />
          <div className="flex flex-wrap items-center gap-2 ml-2">
            <div className="flex items-center gap-2">
              <Switch checked={branding.paperLetterhead} onCheckedChange={setPaperLetterhead} />
              <Label className="text-sm">Papel timbrado</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={branding.showLogo} onCheckedChange={setShowLogo} />
              <Label className="text-sm">Logomarca</Label>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoFileChange}
            />
            <Button variant="outline" onClick={handlePickLogo}>
              Escolher logo
            </Button>
            {branding.logoDataUrl && (
              <Button variant="outline" onClick={() => setLogoDataUrl(null)}>
                Remover logo
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={clearFilters} disabled={isLoading}>
            Limpar filtros
          </Button>
          <Button onClick={handlePrint} disabled={isLoading || rows.length === 0}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {loadError ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Falha ao carregar relatório: {loadError instanceof Error ? loadError.message : 'erro desconhecido'}</p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  eventsQuery.refetch();
                  suppliersQuery.refetch();
                  costsQuery.refetch();
                }}
              >
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="startDate">Data inicial</label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="endDate">Data final</label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Fornecedor</label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(suppliersQuery.data || []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Evento</label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(eventsQuery.data || []).map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <FilterChips
            label="Status"
            options={['todos', 'pendente', 'pago'] as const}
            value={status}
            onChange={setStatus}
            showCounts
            counts={{
              todos: totals.countTotal,
              pendente: totals.countPending,
              pago: totals.countPaid,
            }}
            activeVariant="filled"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(totals.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">Valor total ({totals.countTotal})</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totals.paidAmount)}</div>
            <p className="text-xs text-muted-foreground">Valor pago ({totals.countPaid})</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(totals.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">Valor pendente ({totals.countPending})</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Resultados</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Período: {startDate || '—'} — {endDate || '—'}
            </span>
          </div>

          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-muted-foreground">Carregando dados…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground">Nenhum resultado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Descrição/Item</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">V. Unit.</TableHead>
                    <TableHead className="text-right">V. Total</TableHead>
                    <TableHead className="text-right">V. Pago</TableHead>
                    <TableHead className="text-right">V. Pendente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.supplierName}</TableCell>
                      <TableCell>{r.eventName}</TableCell>
                      <TableCell className="max-w-[360px] whitespace-normal">{r.description}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(r.unitPrice)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(r.totalAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600">{formatCurrency(r.paidAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">{formatCurrency(r.pendingAmount)}</TableCell>
                      <TableCell>
                        <span className={
                          r.statusLabel === 'Pago'
                            ? 'inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
                            : 'inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
                        }>
                          {r.statusLabel}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{r.paymentDate ? formatDateShort(r.paymentDate) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className={`supplier-report-page print-section hidden print:block ${branding.paperLetterhead ? 'letterhead' : ''}`}>
        <div className="mb-6">
          {branding.showLogo && branding.logoDataUrl ? (
            <div className="flex justify-center mb-2">
              <img src={branding.logoDataUrl} alt="Logomarca" className="h-10 w-auto opacity-90" />
            </div>
          ) : null}
          <div className="report-title text-center">Relatório de Pagamentos de Fornecedores</div>
          <div className="report-info">
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000', marginBottom: '8px', textAlign: 'center' }}>
              {activeTeam?.name || '—'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <div><strong>Evento:</strong> {selectedEventLabel}</div>
              <div><strong>Fornecedor:</strong> {supplierId === 'all' ? 'Todos' : ((suppliersQuery.data || []).find((s) => s.id === supplierId)?.name || '—')}</div>
              <div><strong>Status:</strong> {status}</div>
              <div><strong>Período:</strong> {startDate || '—'} — {endDate || '—'}</div>
              <div><strong>Total de itens:</strong> {totals.countTotal}</div>
              <div><strong>Gerado em:</strong> {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>

        <div className="report-summary mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><strong>Valor total:</strong> {formatCurrency(totals.totalAmount)} ({totals.countTotal})</div>
            <div><strong>Valor pago:</strong> {formatCurrency(totals.paidAmount)} ({totals.countPaid})</div>
            <div><strong>Valor pendente:</strong> {formatCurrency(totals.pendingAmount)} ({totals.countPending})</div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-center text-muted-foreground">Nenhum resultado para os filtros selecionados.</div>
        ) : (
          <div className="report-table-container">
            <table className="report-table">
              <thead>
                <tr>
                  <th className="report-th">Fornecedor</th>
                  <th className="report-th">Evento</th>
                  <th className="report-th">Descrição/Item</th>
                  <th className="report-th" style={{ textAlign: 'right' }}>Qtd.</th>
                  <th className="report-th" style={{ textAlign: 'right' }}>V. Unit.</th>
                  <th className="report-th" style={{ textAlign: 'right' }}>V. Total</th>
                  <th className="report-th" style={{ textAlign: 'right' }}>V. Pago</th>
                  <th className="report-th" style={{ textAlign: 'right' }}>V. Pendente</th>
                  <th className="report-th">Status</th>
                  <th className="report-th">Data</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id} className={idx % 2 === 0 ? 'report-row-even' : 'report-row-odd'}>
                    <td className="report-td"><strong>{r.supplierName}</strong></td>
                    <td className="report-td">{r.eventName}</td>
                    <td className="report-td">{r.description}</td>
                    <td className="report-td" style={{ textAlign: 'right' }}>{r.quantity}</td>
                    <td className="report-td" style={{ textAlign: 'right' }}>{formatCurrency(r.unitPrice)}</td>
                    <td className="report-td" style={{ textAlign: 'right' }}><strong>{formatCurrency(r.totalAmount)}</strong></td>
                    <td className="report-td" style={{ textAlign: 'right' }}>{formatCurrency(r.paidAmount)}</td>
                    <td className="report-td" style={{ textAlign: 'right' }}>{formatCurrency(r.pendingAmount)}</td>
                    <td className="report-td">{r.statusLabel}</td>
                    <td className="report-td">{r.paymentDate ? formatDateShort(r.paymentDate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
