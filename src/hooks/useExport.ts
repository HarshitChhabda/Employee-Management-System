import { useCallback } from 'react';
import * as XLSX from 'xlsx';

const STYLES = {
  header: {
    fill: { fgColor: { rgb: '1E40AF' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '1E3A8A' } },
      bottom: { style: 'thin', color: { rgb: '1E3A8A' } },
      left: { style: 'thin', color: { rgb: '1E3A8A' } },
      right: { style: 'thin', color: { rgb: '1E3A8A' } },
    },
  },
  cell: (value: string) => ({
    font: {
      name: 'Calibri', sz: 10,
      color: { rgb: value.startsWith('-') ? 'DC2626' : value.startsWith('+') ? '16A34A' : '1E293B' },
      bold: /^[+-]?\d+(\.\d+)?$/.test(value) || false,
    },
    alignment: { horizontal: /^[+-]?\d+(\.\d+)?$/.test(value) ? 'right' : 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  }),
  title: {
    font: { bold: true, sz: 14, color: { rgb: '1E40AF' }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  summary: {
    font: { bold: true, sz: 10, color: { rgb: '475569' }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  },
};

function s(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function isNumeric(v: string) {
  return /^-?\d+(\.\d+)?$/.test(v);
}

export function useExport() {
  const exportStyled = useCallback((config: {
    filename: string;
    sheetName?: string;
    headers: string[];
    rows: string[][];
    colWidths?: number[];
    title?: string;
    summaryRows?: { label: string; value: string }[];
  }) => {
    if (!config.rows.length) return;

    const wsData: (string | number)[][] = [];
    if (config.title) wsData.push([config.title]);
    wsData.push(config.headers);
    config.rows.forEach(r => wsData.push(r.map(cell => isNumeric(cell) ? Number(cell) : cell)));
    if (config.summaryRows?.length) {
      wsData.push([]);
      config.summaryRows.forEach(sr => wsData.push([sr.label, sr.value]));
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colCount = config.headers.length;
    ws['!cols'] = (config.colWidths || Array(colCount).fill(22)).map(w => ({ wch: typeof w === 'number' ? w : 22 }));

    const ref = ws['!ref'] || 'A1';
    const range = XLSX.utils.decode_range(ref);

    // Apply header styling
    const headerRow = config.title ? 1 : 0;
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: headerRow, c: C });
      if (ws[addr]) ws[addr].s = { ...STYLES.header };
    }

    // Apply data cell styling
    for (let R = headerRow + 1; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[addr]) continue;
        const val = s(ws[addr].v);
        ws[addr].s = { ...STYLES.cell(val) };
      }
    }

    // Apply title styling
    if (config.title) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: 0 });
      if (ws[addr]) {
        ws[addr].s = { ...STYLES.title };
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
      }
    }

    // Apply summary styling
    if (config.summaryRows?.length) {
      const summaryStart = range.e.r - config.summaryRows.length + 1;
      for (let i = 0; i < config.summaryRows.length; i++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: summaryStart + i, c: C });
          if (!ws[addr]) continue;
          ws[addr].s = { ...STYLES.summary };
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.sheetName || config.filename);

    // Manual download (works in browser + Electron renderer)
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const exportToCSV = useCallback((rawData: any[], filename: string, columns?: string[]) => {
    if (!rawData.length) return;
    const headers = columns || Object.keys(rawData[0]);
    const rows = rawData.map(row => headers.map(h => s(row[h])));
    exportStyled({ filename, sheetName: filename, headers, rows });
  }, [exportStyled]);

  const exportToJSON = useCallback((rawData: any[], filename: string) => {
    if (!rawData.length) return;
    const jsonContent = JSON.stringify(rawData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return { exportStyled, exportToCSV, exportToJSON };
}
