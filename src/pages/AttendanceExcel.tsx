import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  Table2, 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Download,
  CheckSquare,
  Square,
  X,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  Search
} from 'lucide-react';
import { hindiLabels } from '../lib/hindiLabels';
import { useToast } from '../components/Toast';
import { attendanceAPI, employeeAPI } from '../services/api';
import { useExport } from '../hooks/useExport';

interface Employee {
  id: string;
  employee_code: string;
  name: string;
  department: string;
  weekly_off?: string;
}

interface AttendanceRecord {
  employee_id: string;
  date: string;
  status: string;
  remarks?: string;
}

import { ATTENDANCE_CONFIG, normalizeStatusCode } from '../lib/attendanceConfig';

const STATUS_CONFIG: Record<string, { name: string; nameHi: string; bg: string; text: string }> = {};
Object.values(ATTENDANCE_CONFIG).forEach(cfg => {
  STATUS_CONFIG[cfg.code] = { name: cfg.label, nameHi: cfg.labelHi, bg: cfg.color, text: cfg.textColor };
});

const ROWS_PER_PAGE = 50;

export default function AttendanceExcel() {
  const { showToast } = useToast();
  const { exportStyled } = useExport();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [currentCell, setCurrentCell] = useState<{empId: string; day: number} | null>(null);
  const [bulkStatus, setBulkStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [currentMonth, currentYear]);

  const fetchEmployees = async () => {
    try {
      const data = await employeeAPI.getAll({ is_active: true });
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const data = await attendanceAPI.getByMonth(currentMonth + 1, currentYear);
      
      const mapped: Record<string, string> = {};
      const records = Array.isArray(data) ? data : [];
      records.forEach((record: AttendanceRecord) => {
        const key = `${record.employee_id}_${record.date}`;
        mapped[key] = record.status;
      });
      setAttendanceData(mapped);
    } catch (err) {
      console.error('Attendance fetch error:', err);
      showToast('Failed to load attendance data', 'error');
    }
  };

  const getDaysInMonth = () => new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const getDayName = (day: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const date = new Date(currentYear, currentMonth, day);
    return days[date.getDay()];
  };

  const getNormalizedStatus = (raw: string) => normalizeStatusCode(raw);

  const getStatus = (empId: string, day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${empId}_${dateStr}`;
    return getNormalizedStatus(attendanceData[key] || '');
  };

  const setStatus = (empId: string, day: number, status: string) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${empId}_${dateStr}`;
    setAttendanceData(prev => {
      const newData = { ...prev };
      if (status) newData[key] = status;
      else delete newData[key];
      return newData;
    });
  };

  const handleCellClick = (e: React.MouseEvent, empId: string, day: number) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = tableContainerRef.current?.getBoundingClientRect();
    if (containerRect) {
      // BUG 5 FIX: Clamp popup position to prevent overflow
      const popupW = 220, popupH = 320;
      let x = rect.left - containerRect.left + 100;
      let y = rect.top - containerRect.top + 30;
      if (x + popupW > containerRect.width) x = Math.max(10, containerRect.width - popupW - 10);
      if (y + popupH > containerRect.height) y = Math.max(10, rect.top - containerRect.top - popupH);
      setPopupPosition({ x, y });
    }
    setCurrentCell({ empId, day });
    setShowPopup(true);
  };

  const handleStatusSelect = useCallback((status: string) => {
    if (currentCell) {
      setStatus(currentCell.empId, currentCell.day, status);
    }
    setCurrentCell(null);
    setShowPopup(false);
  }, [currentCell]);

  const clearCell = useCallback(() => {
    if (currentCell) {
      setStatus(currentCell.empId, currentCell.day, '');
    }
    setCurrentCell(null);
    setShowPopup(false);
  }, [currentCell]);

  useEffect(() => {
    if (!showPopup) return;
    
    const statusCodes = Object.keys(STATUS_CONFIG);
    let focusIndex = -1;
    
    const shortcuts: Record<string, string> = {
      'p': 'P', 'a': 'A', 'c': 'CL', 'l': 'PL', 'h': 'HCL',
      'w': 'WO', 'o': 'OD', 'd': 'HD', 'x': 'LWP'
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPopup(false);
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && focusIndex >= 0) {
        e.preventDefault();
        handleStatusSelect(statusCodes[focusIndex]);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusIndex = Math.min(focusIndex + 1, statusCodes.length - 1);
        const buttons = document.querySelectorAll('[data-status-btn]');
        (buttons[focusIndex] as HTMLElement)?.focus();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusIndex = Math.max(focusIndex - 1, 0);
        const buttons = document.querySelectorAll('[data-status-btn]');
        (buttons[focusIndex] as HTMLElement)?.focus();
        return;
      }
      const shortcut = shortcuts[e.key.toLowerCase()];
      if (shortcut) {
        e.preventDefault();
        handleStatusSelect(shortcut);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        clearCell();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPopup, currentCell, handleStatusSelect, clearCell]);

  const toggleSelectAll = () => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = Math.min(start + ROWS_PER_PAGE, employees.length);
    const pageEmployeeIds = employees.slice(start, end).map(e => e.id);
    
    const allSelected = pageEmployeeIds.every(id => selectedRows.has(id));
    
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        pageEmployeeIds.forEach(id => newSet.delete(id));
      } else {
        pageEmployeeIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  const toggleRowSelect = (empId: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(empId)) newSet.delete(empId);
      else newSet.add(empId);
      return newSet;
    });
  };



  const fillSelected = () => {
    if (!bulkStatus) return;
    const daysInMonth = getDaysInMonth();
    setAttendanceData(prev => {
      const newData = { ...prev };
      selectedRows.forEach(empId => {
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const key = `${empId}_${dateStr}`;
          if (!prev[key]) newData[key] = bulkStatus;
        }
      });
      return newData;
    });
  };

  const fillCurrentPage = () => {
    if (!bulkStatus) return;
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = Math.min(start + ROWS_PER_PAGE, employees.length);
    const daysInMonth = getDaysInMonth();
    setAttendanceData(prev => {
      const newData = { ...prev };
      for (let i = start; i < end; i++) {
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const key = `${employees[i].id}_${dateStr}`;
          if (!prev[key]) newData[key] = bulkStatus;
        }
      }
      return newData;
    });
  };

  const fillAll = () => {
    if (!bulkStatus) return;
    const daysInMonth = getDaysInMonth();
    setAttendanceData(prev => {
      const newData = { ...prev };
      filteredEmployees.forEach(emp => {
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const key = `${emp.id}_${dateStr}`;
          if (!prev[key]) newData[key] = bulkStatus;
        }
      });
      return newData;
    });
  };

  const clearSelected = () => {
    const daysInMonth = getDaysInMonth();
    setAttendanceData(prev => {
      const newData = { ...prev };
      selectedRows.forEach(empId => {
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const key = `${empId}_${dateStr}`;
          if (prev[key]) delete newData[key];
        }
      });
      return newData;
    });
  };

  const clearAll = () => {
    setAttendanceData({});
  };

  const autoFillWeeklyOffs = () => {
    const daysInMonth = getDaysInMonth();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const toFill: Record<string, string> = {};

    filteredEmployees.forEach(emp => {
      const weeklyOff = emp.weekly_off || 'Sunday';
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dayName = dayNames[date.getDay()];
        if (dayName === weeklyOff) {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const key = `${emp.id}_${dateStr}`;
          if (!attendanceData[key]) toFill[key] = 'WO';
        }
      }
    });

    const count = Object.keys(toFill).length;
    if (count === 0) {
      showToast('All weekly off days already filled / सभी साप्ताहिक अवकाश पहले से भरे हुए हैं', 'info');
      return;
    }

    setAttendanceData(prev => {
      const newData = { ...prev };
      Object.entries(toFill).forEach(([key, val]) => {
        if (!prev[key]) newData[key] = val;
      });
      return newData;
    });

    showConfirmation(
      'Auto-Fill Complete / साप्ताहिक अवकाश भरे गए',
      `${count} weekly off entries filled successfully! / ${count} साप्ताहिक अवकाश सफलतापूर्वक भरे गए!`,
      () => {}
    );

    // Also sync with server (fire-and-forget)
    attendanceAPI.autoFillWeeklyOffs(currentMonth + 1, currentYear).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Auto-fill sync failed / ऑटो-फिल सिंक विफल रहा';
      showToast(message, 'warning');
    });
  };

  const handleExport = () => {
    const statusCodes = ['P', 'A', 'CL', 'PL', 'HCL', 'HD', 'WO', 'OD', 'LWP'];
    const headers = ['Employee Code', 'Name', ...daysArray.map(d => String(d)), ...statusCodes];
    const rows = employees.map(emp => {
      const dayStatuses = daysArray.map(d => getStatus(emp.id, d));
      const totals = statusCodes.map(code => dayStatuses.filter(s => s === code).length);
      return [
        emp.employee_code,
        emp.name,
        ...dayStatuses,
        ...totals.map(String),
      ];
    });

    exportStyled({
      filename: `attendance-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
      sheetName: 'Attendance',
      headers,
      rows,
      colWidths: [14, 24, ...daysArray.map(() => 6), ...statusCodes.map(() => 8)],
    });
  };

  const showConfirmation = (title: string, message: string, action: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const records: { employee_id: string; date: string; status: string; remarks?: string }[] = [];
      Object.entries(attendanceData).forEach(([key, status]) => {
        const date = key.slice(-10);
        const empId = key.slice(0, key.length - 11);
        if (empId && date && status) {
          records.push({ employee_id: empId, date, status });
        }
      });

      const result = await attendanceAPI.upsert(records);

      if (result) {
        showConfirmation(
          result.errors && result.errors.length > 0
            ? 'Partial Save — Balance Issues / आंशिक सेव'
            : 'Save Complete / सहेजा गया',
          result.errors && result.errors.length > 0
            ? `${result.savedCount} records saved.\n\nBlocked (insufficient balance):\n${
                result.errors.map((e: { date: string; error: string }) => `${e.date}: ${e.error}`).join('\n')
              }`
            : `${result.savedCount || records.length} attendance records saved successfully! / ${result.savedCount || records.length} उपस्थिति रिकॉर्ड सफलतापूर्वक सहेजे गए!`,
          () => {}
        );
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Failed to save attendance / उपस्थिति सहेजने में विफल', 'error');
    } finally {
      setSaving(false);
    }
  };


  const daysInMonth = getDaysInMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesHi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

  const departmentOptions = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return [...depts].sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const search = searchQuery.toLowerCase().trim();
      if (search && !emp.name.toLowerCase().includes(search) && !emp.department?.toLowerCase().includes(search)) return false;
      if (departmentFilter && emp.department !== departmentFilter) return false;
      return true;
    });
  }, [employees, searchQuery, departmentFilter]);

  const totalPages = Math.ceil(filteredEmployees.length / ROWS_PER_PAGE);
  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const end = Math.min(start + ROWS_PER_PAGE, filteredEmployees.length);
  const pageEmployees = filteredEmployees.slice(start, end);

  const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const getCachedStatus = useCallback((empId: string, day: number) => {
    return getStatus(empId, day);
  }, [attendanceData, currentYear, currentMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-lg">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            <Table2 className="w-8 h-8 text-blue-500 flex-shrink-0" />
            <span>Excel-Style Attendance / एक्सेल स्टाइल उपस्थिति</span>
          </h1>
          <p className="text-xs font-bold text-[var(--text-secondary)] mt-1 uppercase tracking-widest font-mono">Monthly Attendance Register / मासिक उपस्थिति रजिस्टर</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={autoFillWeeklyOffs}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white rounded-xl transition-all font-black shadow-lg shadow-indigo-500/20 cursor-pointer text-sm"
          >
            <CalendarDays className="w-5 h-5 flex-shrink-0" />
            <span>Auto Weekly Off / साप्ताहिक अवकाश भरें</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:opacity-90 text-white rounded-xl transition-all font-black shadow-lg shadow-orange-500/20 cursor-pointer text-sm"
          >
            <FileSpreadsheet className="w-5 h-5 flex-shrink-0" />
            <span>Export with Totals / एक्सपोर्ट करें</span>
          </button>
          <button
            onClick={saveAttendance}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl transition-all font-black shadow-lg shadow-emerald-500/20 cursor-pointer text-sm"
          >
            <Save className="w-5 h-5 flex-shrink-0" />
            <span>{saving ? 'Saving...' : 'Save / सहेजें'}</span>
          </button>
        </div>
      </div>

      {/* Month/Year Selector */}
      <div className="flex flex-wrap items-center gap-6 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg font-bold">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-blue-500" />
          <span className="text-[var(--text-secondary)] text-xs font-black uppercase tracking-wider font-mono">Month / महीना:</span>
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
            className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-xs font-black focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer"
          >
            {monthNames.map((name, i) => (
              <option key={i} value={i}>{name} / {monthNamesHi[i]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[var(--text-secondary)] text-xs font-black uppercase tracking-wider font-mono">Year / वर्ष:</span>
          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-xs font-black focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer font-mono"
          >
            {[2023, 2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>



      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg font-bold">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name / department... नाम या विभाग से खोजें"
            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm placeholder-[var(--text-secondary)] min-w-0"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1.5 text-[var(--text-secondary)] hover:text-red-500 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
          className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-xs font-black focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer"
        >
          <option value="">All Departments / सभी विभाग</option>
          {departmentOptions.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg font-bold">
        <select
          value={bulkStatus}
          onChange={(e) => setBulkStatus(e.target.value)}
          className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-xs font-black focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer"
        >
          <option value="">-- Select Status / स्थिति चुनें --</option>
          {Object.entries(STATUS_CONFIG).map(([code, config]) => (
            <option key={code} value={code}>{code} - {config.nameHi} ({config.name})</option>
          ))}
        </select>
        <button
          onClick={fillSelected}
          disabled={!bulkStatus || selectedRows.size === 0}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/20 cursor-pointer"
        >
          Fill Selected / चुने भरें ({selectedRows.size})
        </button>
        <button
          onClick={fillCurrentPage}
          disabled={!bulkStatus}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-purple-500/20 cursor-pointer"
        >
          Fill This Page / यह पेज भरें
        </button>
        <button
          onClick={() => showConfirmation(
            'Fill All Employees / सभी कर्मचारी भरें',
            `This will fill ALL ${filteredEmployees.length} employees for ALL days. Continue? / यह सभी ${filteredEmployees.length} कर्मचारियों को भरेगा। जारी रखें?`,
            fillAll
          )}
          disabled={!bulkStatus || filteredEmployees.length === 0}
          className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-orange-500/20 cursor-pointer"
        >
          Fill All / सभी भरें
        </button>
        <div className="flex-1" />
        <button
          onClick={clearSelected}
          disabled={selectedRows.size === 0}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-red-500/20 cursor-pointer"
        >
          Clear Selected / चुने हटाएं
        </button>
        <button
          onClick={() => showConfirmation(
            'Clear All / सभी हटाएं',
            'This will clear ALL attendance data. Continue? / यह सभी डेटा हटा देगा। जारी रखें?',
            clearAll
          )}
          className="px-5 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-red-500/20 cursor-pointer"
        >
          Clear All / सभी हटाएं
        </button>
      </div>

      {/* Table */}
      <div 
        ref={tableContainerRef}
        className="flex-1 overflow-auto bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl relative shadow-xl backdrop-blur-md"
      >
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border-b border-[var(--border-primary)]">
              <th className="sticky left-0 z-30 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] p-2.5 w-12 text-center shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                <button onClick={toggleSelectAll} className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg cursor-pointer transition-colors">
                  {pageEmployees.every(e => selectedRows.has(e.id)) ? (
                    <CheckSquare className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Square className="w-5 h-5 text-[var(--text-secondary)]" />
                  )}
                </button>
              </th>
              <th className="sticky left-12 z-30 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] p-2.5 text-left text-[var(--text-primary)] text-xs font-black w-48 uppercase tracking-wider shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                Name / नाम
              </th>
              <th className="sticky left-[15rem] z-30 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] p-2.5 text-left text-[var(--text-primary)] text-xs font-black w-36 uppercase tracking-wider shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                Department / विभाग
              </th>
              {daysArray.map(day => (
                <th key={day} className="bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] p-1.5 text-center w-11 min-w-[44px]">
                  <div className="text-[var(--text-primary)] text-xs font-black font-mono">{day}</div>
                  <div className="text-[var(--text-secondary)] text-[9px] font-black uppercase tracking-tighter opacity-75">{getDayName(day)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-primary)] text-[var(--text-primary)] font-medium">
            {pageEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                <td className="sticky left-0 z-10 bg-[var(--bg-card)] border-r border-[var(--border-primary)] p-1.5 text-center shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  <button 
                    onClick={() => toggleRowSelect(emp.id)}
                    className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg cursor-pointer transition-colors"
                  >
                    {selectedRows.has(emp.id) ? (
                      <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Square className="w-4 h-4 text-[var(--text-secondary)]" />
                    )}
                  </button>
                </td>
                <td className="sticky left-12 z-10 bg-[var(--bg-card)] border-r border-[var(--border-primary)] p-2.5 text-[var(--text-primary)] text-xs font-bold truncate shadow-[2px_0_5px_rgba(0,0,0,0.05)]" title={emp.name}>
                  {emp.name}
                </td>
                <td className="sticky left-[15rem] z-10 bg-[var(--bg-card)] border-r border-[var(--border-primary)] p-2.5 text-[var(--text-primary)] text-xs font-semibold truncate shadow-[2px_0_5px_rgba(0,0,0,0.05)]" title={emp.department}>
                  {emp.department}
                </td>
                {daysArray.map(day => {
                  const status = getCachedStatus(emp.id, day);
                  const config = status ? STATUS_CONFIG[status] : null;
                  return (
                    <td
                      key={day}
                      onClick={(e) => handleCellClick(e, emp.id, day)}
                      className="border-r border-[var(--border-primary)] p-0 text-center cursor-pointer hover:opacity-85 transition-all font-mono font-black"
                      style={config ? { background: config.bg, color: config.text } : {}}
                      title={config ? `${status} - ${config.nameHi} (${config.name})` : 'Click to add status'}
                    >
                      <div className="w-full h-9 flex items-center justify-center text-xs font-black shadow-sm">
                        {status}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Status Popup */}
        {showPopup && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowPopup(false)}
            />
            <div
              className="absolute z-50 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-2xl overflow-hidden min-w-[220px] backdrop-blur-2xl animate-fade-in"
              style={{ 
                left: Math.min(popupPosition.x, (tableContainerRef.current?.clientWidth || 800) - 240),
                top: popupPosition.y 
              }}
            >
              <div className="bg-[var(--bg-secondary)] px-4 py-3 text-xs font-black text-[var(--text-primary)] border-b border-[var(--border-primary)] tracking-wide flex items-center justify-between">
                <div className="flex flex-col">
                  <span>Select Status / स्थिति चुनें</span>
                  <span className="text-[9px] font-bold text-[var(--text-secondary)] opacity-70 mt-0.5">
                    P=Present A=Absent C=CL L=PL H=HCL W=WO ↑↓ Enter Esc
                  </span>
                </div>
                <button onClick={() => setShowPopup(false)} className="text-[var(--text-secondary)] hover:text-red-500 p-0.5 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar divide-y divide-[var(--border-primary)]">
                {Object.entries(STATUS_CONFIG).map(([code, config]) => {
                  const shortcutMap: Record<string, string> = {
                    P:'P', A:'A', CL:'C', PL:'L', HCL:'H', WO:'W', OD:'O', HD:'D', LWP:'X'
                  };
                  return (
                    <button
                      key={code}
                      data-status-btn
                      onClick={() => handleStatusSelect(code)}
                      className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[var(--bg-secondary)] focus:bg-[var(--bg-tertiary)] focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer text-left font-bold"
                    >
                      <div 
                        className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black flex-shrink-0 shadow-sm font-mono"
                        style={{ background: config.bg, borderColor: config.text, color: config.text }}
                      >
                        {code}
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="text-[var(--text-primary)] text-xs font-black">{config.nameHi}</div>
                        <div className="text-[var(--text-secondary)] text-[10px] font-black opacity-80 uppercase tracking-tight font-mono">{config.name}</div>
                      </div>
                      {shortcutMap[code] && (
                        <span className="text-[9px] font-black font-mono px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded-md text-[var(--text-secondary)] border border-[var(--border-primary)] ml-auto">
                          {shortcutMap[code]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={clearCell}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors border-t border-[var(--border-primary)] font-black text-xs uppercase tracking-widest cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Clear / हटाएं</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg backdrop-blur-md font-bold">
        <div className="text-[var(--text-secondary)] text-sm">
          Showing <span className="text-[var(--text-primary)] font-black font-mono">{filteredEmployees.length === 0 ? 0 : start + 1}</span>–<span className="text-[var(--text-primary)] font-black font-mono">{end}</span> of{' '}
          <span className="text-[var(--text-primary)] font-black font-mono">{filteredEmployees.length}</span> employees
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] disabled:opacity-40 text-[var(--text-primary)] rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 font-mono">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = currentPage - 2 + i;
              if (pageNum < 1) pageNum = i + 1;
              if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              if (pageNum < 1) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-xl font-black transition-all cursor-pointer shadow-sm text-sm ${
                    currentPage === pageNum 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' 
                      : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] disabled:opacity-40 text-[var(--text-primary)] rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
          <div
            className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-7 max-w-md w-full mx-4 shadow-2xl text-[var(--text-primary)]"
          >
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-black text-[var(--text-primary)]">{confirmTitle}</h3>
            </div>
            <p className="text-[var(--text-secondary)] font-bold mb-7 text-sm">{confirmMessage}</p>
            <div className="flex justify-end gap-3.5 font-bold">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-all cursor-pointer text-sm font-black"
              >
                Cancel / रद्द करें
              </button>
              <button
                onClick={() => {
                  confirmAction();
                  setShowConfirmModal(false);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer text-sm font-black"
              >
                Confirm / पुष्टि करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
