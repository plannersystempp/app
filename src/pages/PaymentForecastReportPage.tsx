import React, { useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTeam } from '@/contexts/TeamContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { usePaymentForecastQuery } from '@/hooks/queries/usePaymentForecastQuery';
import { PaymentForecastPrintTable } from '@/components/payment-forecast/PaymentForecastPrintTable';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useReportBranding } from '@/hooks/useReportBranding';

export default function PaymentForecastReportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeTeam } = useTeam();
  const { branding, setLogoDataUrl, setPaperLetterhead, setShowLogo, setShowTeamName } = useReportBranding(activeTeam?.id);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  
  const weeksParam = searchParams.get('weeks');
  const weeksAhead = weeksParam ? parseInt(weeksParam, 10) : 3;
  
  const { data: weeks = [], isLoading } = usePaymentForecastQuery({ weeksAhead });

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

  const handleBack = () => {
    navigate('/app/previsao-pagamentos');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Estilos para tela e impressão */}
      <style>{`
        @media screen {
          .payroll-report-page .payroll-table-container {
            background: transparent;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin: 0.5rem 0;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          }
          
          .payroll-report-page .payroll-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 2px solid #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
            table-layout: fixed;
          }
          
          .payroll-report-page .payroll-th {
            background-color: #f8fafc;
            border-bottom: 2px solid #cbd5e1;
            border-right: 1px solid #cbd5e1;
            padding: 12px 10px;
            font-weight: 600;
            font-size: 13px;
            line-height: 1.5;
            color: #1e293b;
          }
          
          .payroll-report-page .payroll-th:last-child {
            border-right: none;
          }
          
          .payroll-report-page .payroll-td {
            border-bottom: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
            padding: 10px 10px;
            font-size: 12px;
            line-height: 1.6;
            white-space: nowrap;
            color: #1e293b;
          }
          
          .payroll-report-page .payroll-td:first-child {
            white-space: normal;
            width: 25%;
          }
          
          .payroll-report-page .payroll-td:last-child {
            border-right: none;
          }
          
          .payroll-report-page .payroll-row-even {
            background-color: #ffffff;
          }
          
          .payroll-report-page .payroll-row-odd {
            background-color: #f8fafc;
          }
          
          .payroll-report-page .payroll-person-name {
            font-weight: 500;
            word-wrap: break-word;
            line-height: 1.4;
          }
          
          .payroll-report-page .payroll-value {
            font-weight: 500;
            color: #0f766e;
          }
          
          .payroll-report-page .payroll-report-info {
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 16px;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 1rem;
          }
          
          .payroll-report-page .payroll-report-subtitle {
            font-size: 28px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 16px;
          }
        }

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
          
          .payroll-report-page .payroll-table-container {
            background: white;
            border: 1px solid #000;
            border-radius: 0;
            padding: 0;
            margin: 0.5rem 0;
            box-shadow: none;
            page-break-inside: avoid;
          }
          
          .payroll-report-page .payroll-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
            font-size: 9pt;
          }
          
          .payroll-report-page .payroll-th {
            background-color: #e0e0e0 !important;
            border: 1px solid #000;
            padding: 6px 4px;
            font-weight: bold;
            font-size: 9pt;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .payroll-report-page .payroll-td {
            border: 1px solid #000;
            padding: 5px 4px;
            font-size: 8pt;
            color: #000;
          }
          
          .payroll-report-page .payroll-row-even {
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .payroll-report-page .payroll-row-odd {
            background-color: #f5f5f5 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .payroll-report-page .payroll-person-name {
            font-weight: bold;
          }
          
          .payroll-report-page .payroll-value {
            font-weight: bold;
            color: #000;
          }
          
          .payroll-report-page .payroll-report-info {
            background-color: #f0f0f0 !important;
            border: 1px solid #000;
            padding: 12px;
            border-radius: 0;
            font-size: 10pt;
            margin-bottom: 1rem;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .payroll-report-page .payroll-report-subtitle {
            font-size: 18pt;
            font-weight: bold;
            color: #000;
            margin-bottom: 12px;
          }
          
          .payroll-summary {
            border: 2px solid #000 !important;
            padding: 12px !important;
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .break-inside-avoid {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Barra de ações - apenas na tela */}
      <div className="no-print sticky top-0 z-10 bg-background border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-xl font-semibold">Relatório de Previsão de Pagamentos</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 mr-2">
            <div className="flex items-center gap-2">
              <Switch checked={branding.paperLetterhead} onCheckedChange={setPaperLetterhead} />
              <Label className="text-sm">Papel timbrado</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={branding.showLogo} onCheckedChange={setShowLogo} />
              <Label className="text-sm">Logomarca</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={branding.showTeamName} onCheckedChange={setShowTeamName} />
              <Label className="text-sm">Nome da equipe</Label>
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
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Conteúdo para impressão */}
      <div className="container mx-auto py-6">
        <PaymentForecastPrintTable
          teamName={activeTeam?.name}
          weeks={weeks}
          weeksAhead={weeksAhead}
          branding={branding}
        />
      </div>
    </div>
  );
}
