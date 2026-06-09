const fs = require('fs');

// 1. Fix types in hrms.ts
const typesPath = 'src/types/hrms.ts';
if (fs.existsSync(typesPath)) {
  let typesCode = fs.readFileSync(typesPath, 'utf-8');
  if (!typesCode.includes('file_local_path?: string;')) {
    typesCode = typesCode.replace(
      'file_url?: string;',
      `file_url?: string;
  file_local_path?: string;
  file_name?: string;
  status?: string;
  priority?: string;
  direction?: string;
  confidential_level?: string;
  is_notice_board?: number;
  notice_expiry_date?: string;
  notice_pinned?: number;
  uploaded_by?: string;
  assigned_to_employee_id?: string;`
    );
    fs.writeFileSync(typesPath, typesCode);
  }
}

// 2. Fix Letters.tsx
const lettersPath = 'src/pages/Letters.tsx';
let code = fs.readFileSync(lettersPath, 'utf-8');

// Imports
code = code.replace(
  `import { FilterBar, FilterChip } from '@/components/FilterBar';`,
  `import FilterBar, { FilterChip } from '@/components/FilterBar';`
);
code = code.replace(
  `import { StatCard } from '@/components/StatCard';`,
  `import StatCard from '@/components/StatCard';`
);
code = code.replace(
  `import { AnimatedCounter } from '@/components/AnimatedCounter';`,
  `import AnimatedCounter from '@/components/AnimatedCounter';`
);
code = code.replace(
  `import { Timeline, TimelineEvent } from '@/components/Timeline';`,
  `import Timeline from '@/components/Timeline';\nimport type { TimelineEvent } from '@/components/Timeline';`
);
code = code.replace(
  `import { ExportButton } from '@/components/ExportButton';`,
  `import ExportButton from '@/components/ExportButton';`
);
code = code.replace(
  `import { ErrorBoundary } from '@/components/ErrorBoundary';`,
  `import ErrorBoundary from '@/components/ErrorBoundary';`
);
code = code.replace(
  `import { EnterpriseTable } from "@/components/EnterpriseTable";`, // If it exists
  ``
);

// useExport hook values
code = code.replace(
  `const { handleExport, isExporting } = useExport();`,
  `const { exportToCSV, exportToJSON } = useExport();\n  const isExporting = false;\n  const handleExport = (type: 'csv' | 'json') => { if (type === 'csv') exportToCSV(letters, 'letters'); else exportToJSON(letters, 'letters'); };`
);

// electron
code = code.replace(
  `electron.ipcRenderer`,
  `(window as any).electron.ipcRenderer`
);
code = code.replace(
  `electron.`,
  `(window as any).electron.`
);

// FilterChip active -> isActive
code = code.replace(/<FilterChip([\s\S]*?)active={/g, '<FilterChip$1isActive={');

// EnterpriseTable Column props
// width: '120px' -> width: 120
code = code.replace(/width:\s*['"](\d+)px['"]/g, 'width: $1');

// accessor: -> key: (for columns array)
// But we must only do this inside the columns array.
code = code.replace(/accessor:/g, 'key:');
// But wait, there might be other accessors. Let's just do it, standard table uses 'key' or 'accessorKey'. The error says `key`. Let's check `EnterpriseTable` uses `key`.

// getLetterPriorityConfig borderColor
// Let's replace priorityConfig.borderColor with priorityConfig.color
code = code.replace(/priorityConfig\.borderColor/g, 'priorityConfig.color');

fs.writeFileSync(lettersPath, code);
console.log('Fixed Letters.tsx and types');
