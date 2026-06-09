import { useState } from 'react';
import { Download, FileText, Table, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExport } from '@/hooks/useExport';

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns?: string[];
  className?: string;
  headers?: string[];
  colWidths?: number[];
}

export default function ExportButton({ data, filename, columns, className, headers, colWidths }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { exportStyled, exportToCSV, exportToJSON } = useExport();

  if (!data.length) return null;

  const handleStyledExport = () => {
    const h = headers || columns || Object.keys(data[0]);
    const rows = data.map(row => h.map(key => {
      const v = row[key];
      return v !== null && v !== undefined ? String(v) : '';
    }));
    exportStyled({
      filename,
      sheetName: filename,
      headers: h,
      rows,
      colWidths,
    });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-300",
          "bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)]",
          "hover:border-[var(--border-secondary)] hover:shadow-md hover:-translate-y-0.5",
          className
        )}
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl shadow-2xl z-50 animate-scale-in overflow-hidden backdrop-blur-xl">
            <button
              onClick={handleStyledExport}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-500" />
              Export as Excel (Styled)
            </button>
            <button
              onClick={() => {
                exportToCSV(data, filename, columns);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors border-t border-[var(--border-primary)]"
            >
              <Table className="w-4 h-4 text-orange-500" />
              Export as CSV
            </button>
            <button
              onClick={() => {
                exportToJSON(data, filename);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors border-t border-[var(--border-primary)]"
            >
              <FileText className="w-4 h-4 text-blue-500" />
              Export as JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
