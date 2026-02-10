import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const encodeUtf16LEWithBom = (text: string): Uint8Array => {
  const buffer = new Uint8Array(2 + text.length * 2);
  buffer[0] = 0xff;
  buffer[1] = 0xfe;
  for (let i = 0; i < text.length; i++) {
    const codeUnit = text.charCodeAt(i);
    buffer[2 + i * 2] = codeUnit & 0xff;
    buffer[2 + i * 2 + 1] = (codeUnit >> 8) & 0xff;
  }
  return buffer;
};

type ExportColumn = string | { key: string; label: string };

const normalizeColumns = (cols?: ExportColumn[]) => {
  const columns = cols && cols.length > 0 ? cols : undefined;
  if (!columns) return { keys: undefined as string[] | undefined, labels: undefined as string[] | undefined };

  if (typeof columns[0] === 'string') {
    const keys = columns as string[];
    return { keys, labels: keys };
  }

  const typed = columns as Array<{ key: string; label: string }>;
  return {
    keys: typed.map(c => c.key),
    labels: typed.map(c => c.label),
  };
};

export const exportToCSV = (data: Array<Record<string, unknown>>, filename: string, headers?: ExportColumn[]) => {
  if (!data || data.length === 0) {
    throw new Error('Nenhum dado para exportar');
  }

  const normalized = normalizeColumns(headers);
  const csvKeys = normalized.keys && normalized.keys.length > 0 ? normalized.keys : Object.keys(data[0]);
  const csvLabels = normalized.labels && normalized.labels.length > 0 ? normalized.labels : csvKeys;
  const delimiter = ';';
  const eol = '\r\n';
  const headerLine = csvLabels.join(delimiter);
  
  // Converter dados para CSV
  const csvContent = data.map(row => 
    csvKeys.map(key => {
      const value = row?.[key];
      // Tratar valores nulos ou indefinidos
      if (value === null || value === undefined) return '';
      
      // Escapar aspas duplas e envolver strings em aspas se necessário
      const stringValue = String(value);
      const normalized = stringValue.replace(/\r\n|\n|\r/g, ' ');
      if (
        normalized.includes(delimiter) ||
        normalized.includes('"')
      ) {
        return `"${normalized.replace(/"/g, '""')}"`;
      }
      return normalized;
    }).join(delimiter)
  ).join(eol);

  const csv = `sep=${delimiter}${eol}${headerLine}${eol}${csvContent}`;
  
  // Criar e baixar arquivo
  const csvBytes = encodeUtf16LEWithBom(csv);
  const blob = new Blob([csvBytes], { type: 'text/csv;charset=utf-16le;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToPDF = (data: Array<Record<string, unknown>>, headers: ExportColumn[], title: string, filename: string) => {
  if (!data || data.length === 0) {
    throw new Error('Nenhum dado para exportar');
  }

  const normalized = normalizeColumns(headers);
  const pdfKeys = normalized.keys && normalized.keys.length > 0 ? normalized.keys : Object.keys(data[0]);
  const pdfLabels = normalized.labels && normalized.labels.length > 0 ? normalized.labels : pdfKeys;

  const orientation = pdfLabels.length > 7 ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation });
  
  // Adicionar título
  pdf.setFontSize(16);
  pdf.text(title, 20, 20);
  
  // Adicionar data de geração
  pdf.setFontSize(10);
  pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
  
  // Preparar dados para a tabela
  const tableData = data.map(row => 
    pdfKeys.map(key => {
      const value = row[key];
      return value === null || value === undefined ? '' : String(value);
    })
  );
  
  // Gerar tabela
  autoTable(pdf, {
    head: [pdfLabels],
    body: tableData,
    startY: 40,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });
  
  // Salvar arquivo
  pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};
