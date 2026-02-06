import React from 'react';
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

interface ExportDropdownProps {
  data: Array<Record<string, unknown>>;
  headers?: string[];
  filename: string;
  title: string;
  disabled?: boolean;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  data,
  headers,
  filename,
  title,
  disabled = false
}) => {
  const { toast } = useToast();

  const handleExportCSV = () => {
    try {
      const csvHeaders = headers || (data.length > 0 ? Object.keys(data[0]) : []);
      exportToCSV(data, filename, csvHeaders);
      toast({
        title: "Sucesso",
        description: "Dados exportados para CSV com sucesso",
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
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
      console.error('Error exporting PDF:', error);
      toast({
        title: "Erro",
        description: "Falha ao exportar dados para PDF",
        variant: "destructive"
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || data.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Exportar para CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Exportar para PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
