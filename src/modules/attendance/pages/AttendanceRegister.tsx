// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { 
  Save, 
  Search, 
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Download,
  Activity,
  ShieldCheck,
  Database,
  ArrowRight,
  Filter,
  X
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useEmployeeStore } from '@/stores/employeeStore';
import { useAttendanceStore } from '@/stores/attendanceStore';
import { useConnectivity } from '@/lib/ConnectivityContext';
import { EnterpriseTable, Column } from '@/core-ui/tables/EnterpriseTable';
import { StatusPopup } from '../components/StatusPopup';
import { cn } from '@/lib/utils';
import { categories } from '@/lib/hindiLabels';
import { masterAPI } from '@/services/api';

const STATUS_BADGE: Record<string, string> = {
  'P':   'badge-present',
  'A':   'badge-absent',
  'CL':  'badge-leave',
  'PL':  'badge-pl',
  'HCL': 'badge-leave',
  'OD':  'badge-halfday',
  'WO':  'badge-weekoff',
  'H':   'badge-holiday',
};

const AVATAR_COLORS = [
  'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 29%))',
  'linear-gradient(135deg, hsl(263 70% 50%), hsl(263 70% 40%))',
  'linear-gradient(135deg, hsl(0 84% 60%), hsl(0 84% 50%))',
  'linear-gradient(135deg, hsl(38 92% 50%), hsl(38 92% 40%))',
  'linear-gradient(135deg, hsl(210 92% 58%), hsl(210 92% 48%))',
  'linear-gradient(135deg, hsl(270 74% 64%), hsl(270 74% 54%))',
];

export default function AttendanceRegister() {
  const { t, language } = useLanguage();
  const { isOnline } = useConnectivity();
  const { employees, fetchEmployees } = useEmployeeStore();
  const { attendanceData, fetchAttendance, upsertAttendance, setLocalStatus } = useAttendanceStore();
  
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [masterDepartments, setMasterDepartments] = useState([]);
  const [masterDesignations, setMasterDesignations] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [currentCell, setCurrentCell] = useState<{ empId: string | number; day: number; rowIndex: number } | null>(null);
  const [tableHeight, setTableHeight] = useState(window.innerHeight - 240);

  useEffect(() => {
    const handleResize = () => setTableHeight(window.innerHeight - 240);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { fetchAttendance(currentMonth + 1, currentYear); }, [currentMonth, currentYear, fetchAttendance]);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const data = await masterAPI.getAll();
        setMasterDepartments(data?.departments || []);
        setMasterDesignations(data?.designations || []);
      } catch (err) {
        console.error('Error fetching masters:', err);
      }
    };
    fetchMasters();
    window.addEventListener('mastersUpdated', fetchMasters);
    return () => window.removeEventListener('mastersUpdated', fetchMasters);
  }, []);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const getDayName = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getStatus = (empId: string | number, day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dbStatus = attendanceData[`${empId}_${dateStr}`] || '';
    
    // Map database long-form to UI shorthand for display
    const dbToUi: Record<string, string> = {
      'present': 'P',
      'absent': 'A',
      'pl': 'PL',
      'cl': 'CL',
      'half_cl': 'HCL',
      'weekly_off': 'WO'
    };
    return dbToUi[dbStatus] || dbStatus;
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = !categoryFilter || emp.category === categoryFilter;
      const matchDepartment = !departmentFilter || emp.department === departmentFilter;
      const matchDesignation = !designationFilter || emp.designation === designationFilter;
      return matchSearch && matchCategory && matchDepartment && matchDesignation;
    });
  }, [employees, searchQuery, categoryFilter, departmentFilter, designationFilter]);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  // Keyboard Hotkeys
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showPopup || !currentCell) return;
      
      const hotkeys: Record<string, string> = { 
        '1': 'P', '2': 'A', '3': 'PL', '4': 'CL', '5': 'HCL', '6': 'WO', '7': 'OD', '8': 'H', '0': '' 
      };
      
      if (hotkeys[e.key] !== undefined) {
        const uiStatus = hotkeys[e.key];
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentCell.day).padStart(2, '0')}`;
        
        // Map UI status shorthand to database long-form status for saving
        const uiToDb: Record<string, string> = {
          'P': 'present',
          'A': 'absent',
          'PL': 'pl',
          'CL': 'cl',
          'HCL': 'half_cl',
          'WO': 'weekly_off',
          'OD': 'present',
          'H': 'weekly_off',
          '': ''
        };
        const dbStatus = uiToDb[uiStatus] || uiStatus;

        setLocalStatus(currentCell.empId as any, dateStr, dbStatus);
        upsertAttendance([{ employee_id: currentCell.empId as any, date: dateStr, status: dbStatus }]);
        
        if (currentCell.day < daysInMonth) {
          setCurrentCell(prev => prev ? { ...prev, day: prev.day + 1 } : null);
        } else if (currentCell.rowIndex < filteredEmployees.length - 1) {
          const nextEmp = filteredEmployees[currentCell.rowIndex + 1];
          setCurrentCell({ empId: nextEmp.id, day: 1, rowIndex: currentCell.rowIndex + 1 });
        }
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        setCurrentCell(prev => {
          if (!prev) return { empId: filteredEmployees[0].id, day: 1, rowIndex: 0 };
          let { day, rowIndex } = prev;
          if (e.key === 'ArrowUp' && rowIndex > 0) rowIndex--;
          if (e.key === 'ArrowDown' && rowIndex < filteredEmployees.length - 1) rowIndex++;
          if (e.key === 'ArrowLeft' && day > 1) day--;
          if (e.key === 'ArrowRight' && day < daysInMonth) day++;
          return { empId: filteredEmployees[rowIndex].id, day, rowIndex };
        });
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentCell, showPopup, daysInMonth, filteredEmployees, currentMonth, currentYear, setLocalStatus, upsertAttendance]);

  const handleCellClick = (e: React.MouseEvent, empId: string | number, day: number, rowIndex: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopupPosition({ x: rect.left, y: rect.bottom + 4 });
    setCurrentCell({ empId, day, rowIndex });
    setShowPopup(true);
  };

  const handleStatusSelect = async (uiStatus: string) => {
    if (currentCell) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentCell.day).padStart(2, '0')}`;
      
      // Map UI status shorthand to database long-form status for saving
      const uiToDb: Record<string, string> = {
        'P': 'present',
        'A': 'absent',
        'PL': 'pl',
        'CL': 'cl',
        'HCL': 'half_cl',
        'WO': 'weekly_off',
        'OD': 'present',
        'H': 'weekly_off',
        '': ''
      };
      const dbStatus = uiToDb[uiStatus] || uiStatus;

      setLocalStatus(currentCell.empId as any, dateStr, dbStatus);
      upsertAttendance([{ employee_id: currentCell.empId as any, date: dateStr, status: dbStatus }]);
    }
    setShowPopup(false);
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', { month: 'long' });

  const columns = useMemo(() => {
    const cols: Column[] = [
      {
        key: 'employee',
        header: 'Personnel Identity',
        width: 240,
        sticky: 'left' as const,
        render: (emp: any) => (
          <div className="d-flex align-items-center gap-2.5 py-1">
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0"
              style={{ 
                width: '28px', height: '28px',
                background: AVATAR_COLORS[emp.id % AVATAR_COLORS.length],
                fontSize: '0.6rem', fontWeight: 800,
              }}
            >
              {getInitials(emp.name)}
            </div>
            <div className="min-w-0">
              <div className="text-truncate fw-bold tracking-tight" style={{ fontSize: '0.8rem', color: 'var(--foreground)' }}>
                {emp.name}
              </div>
              <div className="text-truncate text-dim font-tabular" style={{ fontSize: '0.65rem' }}>
                {emp.employee_code} • {emp.designation || 'Specialist'}
              </div>
            </div>
          </div>
        )
      }
    ];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayName = getDayName(day);
      const isSunday = dayName === 'Sun';
      cols.push({
        key: `day_${day}`,
        header: (
          <div className={cn("text-center w-100", isSunday && "text-destructive")}>
            {day}
          </div>
        ),
        width: 38,
        render: (emp: any, rowIndex: number) => {
          const status = getStatus(emp.id, day);
          const badgeClass = STATUS_BADGE[status] || '';
          const isFocused = currentCell?.empId === emp.id && currentCell?.day === day;

          return (
            <div 
              className={cn(
                "w-100 h-100 d-flex align-items-center justify-content-center cursor-pointer transition-smooth",
                isFocused && "bg-primary-glow"
              )}
              style={{ border: isFocused ? '1.5px solid var(--primary)' : 'none' }}
              onClick={(e) => handleCellClick(e, emp.id, day, rowIndex)}
            >
              {status && (
                <span className={cn(badgeClass)} style={{ fontSize: '0.6rem' }}>
                  {status}
                </span>
              )}
            </div>
          );
        }
      });
    }

    return cols;
  }, [daysInMonth, currentMonth, currentYear, attendanceData, currentCell, language]);

  return (
    <div className="d-flex flex-column h-100 bg-background font-sans">
      {/* Premium Header */}
      <div className="px-6 py-4 glass-panel border-bottom">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h1 className="h4 m-0 fw-bold tracking-tight text-foreground">
              {t('attendance.registerTitle')}
            </h1>
            <div className="d-flex align-items-center gap-2 mt-1 text-dim" style={{ fontSize: '0.8rem' }}>
              <Activity size={14} className="text-primary" />
              <span>Real-time Operational Registry</span>
              <span className="opacity-25">|</span>
              <ShieldCheck size={14} className="text-success" />
              <span>Audit Verified System</span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-4">
            <div className="d-flex align-items-center gap-1.5 p-1 rounded-full bg-subtle border-subtle">
              <button 
                onClick={() => {
                  if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
                  else setCurrentMonth(m => m - 1);
                }}
                className="btn btn-sm btn-icon rounded-circle hover-bg-surface transition-smooth"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-3 text-nowrap fw-bold tracking-widest text-uppercase text-foreground" style={{ fontSize: '0.7rem' }}>
                {monthName} {currentYear}
              </div>
              <button 
                onClick={() => {
                  if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
                  else setCurrentMonth(m => m + 1);
                }}
                className="btn btn-sm btn-icon rounded-circle hover-bg-surface transition-smooth"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button 
              onClick={() => {
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const monthStr = String(currentMonth + 1).padStart(2, '0');
                
                const headers = ['Emp ID', 'Name', 'Department', 'Designation'];
                for (let day = 1; day <= daysInMonth; day++) {
                  headers.push(`${day}`);
                }
                headers.push('Total P', 'Total A', 'Total PL', 'Total CL', 'Total HCL', 'Total WO', 'Total OD', 'Total HD', 'Total LWP');

                const rows: string[][] = [];
                
                filteredEmployees.forEach(emp => {
                  const row: string[] = [emp.employee_code || '', emp.name || '', emp.department || '', emp.designation || ''];
                  
                  let totalP = 0, totalA = 0, totalPL = 0, totalCL = 0, totalHCL = 0, totalWO = 0, totalOD = 0, totalHD = 0, totalLWP = 0;
                  
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${currentYear}-${monthStr}-${String(day).padStart(2, '0')}`;
                    const dbStatus = attendanceData[`${emp.id}_${dateStr}`] || '';
                    const uiToDb: Record<string, string> = {
                      'P': 'present', 'A': 'absent', 'PL': 'pl', 'CL': 'cl', 'HCL': 'half_cl', 'WO': 'weekly_off', 'OD': 'present', 'H': 'weekly_off'
                    };
                    const status = Object.entries(uiToDb).find(([_, v]) => v === dbStatus)?.[0] || dbStatus;
                    row.push(status);
                    
                    switch (status) {
                      case 'P': totalP++; break;
                      case 'A': totalA++; break;
                      case 'PL': totalPL++; break;
                      case 'CL': totalCL++; break;
                      case 'HCL': totalHCL++; break;
                      case 'WO': totalWO++; break;
                      case 'OD': totalOD++; break;
                      case 'HD': totalHD++; break;
                      case 'LWP': totalLWP++; break;
                    }
                  }
                  
                  row.push(String(totalP), String(totalA), String(totalPL), String(totalCL), String(totalHCL), String(totalWO), String(totalOD), String(totalHD), String(totalLWP));
                  rows.push(row);
                });

                const csvContent = [
                  headers.join(','),
                  ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                ].join('\n');

                const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `attendance-register-${currentYear}-${monthStr}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="btn btn-sm px-4 d-flex align-items-center gap-2 bg-primary text-white rounded-pill shadow-premium transition-smooth hover-scale"
            >
              <Download size={14} strokeWidth={2.5} />
              <span className="fw-bold tracking-wider" style={{ fontSize: '0.7rem' }}>EXPORT ARCHIVE</span>
            </button>
          </div>
        </div>
      </div>

      {/* High-Density Action Bar */}
      <div className="px-6 py-3 d-flex align-items-center justify-content-between bg-surface/40 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3 flex-wrap flex-grow-1">
          <div className="position-relative" style={{ width: '320px' }}>
            <Search className="position-absolute translate-middle-y top-50 start-0 ms-3 text-dim" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Personnel Database..."
              className="form-control form-control-sm ps-10 bg-subtle border-subtle text-foreground font-sans"
              style={{ fontSize: '0.8rem', height: '36px', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <Filter size={14} className="text-dim" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-select form-select-sm bg-subtle border-subtle text-foreground font-sans"
              style={{ fontSize: '0.75rem', height: '36px', borderRadius: 'var(--radius-md)', minWidth: '150px' }}
            >
              <option value="">All Categories / सभी श्रेणी</option>
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.labelHi}</option>
              ))}
            </select>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Filter size={14} className="text-dim" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="form-select form-select-sm bg-subtle border-subtle text-foreground font-sans"
              style={{ fontSize: '0.75rem', height: '36px', borderRadius: 'var(--radius-md)', minWidth: '150px' }}
            >
              <option value="">All Departments / सभी विभाग</option>
              {masterDepartments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Filter size={14} className="text-dim" />
            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="form-select form-select-sm bg-subtle border-subtle text-foreground font-sans"
              style={{ fontSize: '0.75rem', height: '36px', borderRadius: 'var(--radius-md)', minWidth: '150px' }}
            >
              <option value="">All Designations / सभी पदनाम</option>
              {masterDesignations.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {(searchQuery || categoryFilter || departmentFilter || designationFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
                setDepartmentFilter('');
                setDesignationFilter('');
              }}
              className="btn btn-sm px-3 d-flex align-items-center gap-1.5 bg-danger/10 text-danger border-danger/20 rounded-pill"
              style={{ fontSize: '0.7rem' }}
            >
              <X size={12} />
              Clear All
            </button>
          )}
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="px-3 py-1.5 rounded-md border-subtle bg-subtle text-dim d-flex align-items-center gap-2" style={{ fontSize: '0.7rem' }}>
            <span className="fw-bold text-primary font-mono">CMD+K</span>
            <span className="fw-medium">Quick Command</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="flex-grow-1 px-6 pb-4 overflow-hidden">
        <EnterpriseTable 
          columns={columns}
          data={filteredEmployees}
          containerHeight={tableHeight}
          rowHeight={42}
          headerHeight={36}
        />
      </div>

      <StatusPopup 
        show={showPopup}
        position={popupPosition}
        onClose={() => setShowPopup(false)}
        onSelect={handleStatusSelect}
        onClear={() => handleStatusSelect('')}
      />

      {/* Premium Footer Status Bar */}
      <div className="px-6 py-2 border-top border-subtle bg-surface d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-4">
          <div className="d-flex align-items-center gap-2 text-dim" style={{ fontSize: '0.7rem' }}>
            <Keyboard size={14} className="text-primary" />
            <span className="fw-bold tracking-widest text-uppercase">Audit Hotkeys:</span>
          </div>
          <div className="d-flex gap-2">
            {['1:P','2:A','3:PL','4:CL','5:WO','0:CLR'].map(k => (
              <span key={k} className="px-2 py-0.5 rounded border border-subtle bg-subtle text-dim font-mono fw-bold" style={{ fontSize: '0.65rem' }}>
                {k}
              </span>
            ))}
          </div>
        </div>

        <div className="d-flex align-items-center gap-4 text-dim font-tabular" style={{ fontSize: '0.7rem' }}>
          <div className="d-flex align-items-center gap-2">
            <Database size={14} />
            <span className="fw-bold">STORAGE STABLE</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="fw-medium">VER 3.0.4 - PRMX</span>
          </div>
        </div>
      </div>
    </div>
  );
}
