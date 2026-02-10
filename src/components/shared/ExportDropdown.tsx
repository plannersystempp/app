import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { exportToCSV, exportToPDF } from '@/utils/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

type ExportColumn = string | { key: string; label: string };

interface ExportDropdownItem {
  kind: 'csv' | 'pdf';
  label: string;
  getPayload: () => Promise<{
    data: Array<Record<string, unknown>>;
    headers?: ExportColumn[];
    filename?: string;
    title?: string;
  }>;
  disabled?: boolean;
}

interface ExportDropdownProps {
  data: Array<Record<string, unknown>>;
  headers?: ExportColumn[];
  filename: string;
  title: string;
  disabled?: boolean;
  items?: ExportDropdownItem[];
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  data,
  headers,
  filename,
  title,
  disabled = false,
  items
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = () => {
    try {
      const csvHeaders = headers || (data.length > 0 ? Object.keys(data[0]) : []);
      exportToCSV(data, filename, csvHeaders);
      toast({
        title: "Sucesso",
        description: "Dados exportados para CSV com sucesso",
      });
    } catch (error) {
      logger.query.error('export_csv', error);
      toast({
        title: "Erro",
        description: "Falha ao exportar dados para CSV",
        variant: "destructive"
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const pdfHeaders = headers || (data.length > 0 ? Object.keys(data[0]) : []);
      exportToPDF(data, pdfHeaders, title, filename);
      toast({
        title: "Sucesso",
        description: "Dados exportados para PDF com sucesso",
      });
    } catch (error) {
      logger.query.error('export_pdf', error);
      toast({
        title: "Erro",
        description: "Falha ao exportar dados para PDF",
        variant: "destructive"
      });
    }
  };

  const handleCustomItem = async (item: ExportDropdownItem) => {
    setIsExporting(true);
    try {
      toast({
        title: 'Exportando',
        description: 'Gerando arquivo, aguarde…',
      });

      const payload = await item.getPayload();
      const payloadHeaders = payload.headers || (payload.data.length > 0 ? Object.keys(payload.data[0]) : []);
      const payloadFilename = payload.filename || filename;
      const payloadTitle = payload.title || title;

      if (item.kind === 'csv') {
        exportToCSV(payload.data, payloadFilename, payloadHeaders);
        toast({
          title: 'Sucesso',
          description: 'Dados exportados para CSV com sucesso',
        });
        return;
      }

      exportToPDF(payload.data, payloadHeaders, payloadTitle, payloadFilename);
      toast({
        title: 'Sucesso',
        description: 'Dados exportados para PDF com sucesso',
      });
    } catch (error) {
      logger.query.error('export_custom', error);
      toast({
        title: 'Erro',
        description: 'Falha ao exportar dados',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || isExporting || (items ? items.length === 0 : data.length === 0)}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {items?.length ? (
          items.map((item, idx) => (
            <DropdownMenuItem
              key={`${item.kind}_${idx}`}
              onClick={() => handleCustomItem(item)}
              disabled={disabled || isExporting || item.disabled}
            >
              {item.kind === 'csv' ? (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {item.label}
            </DropdownMenuItem>
          ))
        ) : (
          <>
            <DropdownMenuItem onClick={handleExportCSV} disabled={disabled || isExporting}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar para CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} disabled={disabled || isExporting}>
              <FileText className="w-4 h-4 mr-2" />
              Exportar para PDF
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
