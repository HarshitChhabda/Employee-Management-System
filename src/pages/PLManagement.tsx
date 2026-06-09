import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileCheck, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  Calculator, 
  Clock, 
  Database,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  Calendar,
  Fingerprint,
  Activity,
  ArrowUpRight,
  DollarSign,
  History,
  AlertTriangle,
  Sliders,
  ArrowRightLeft,
  RefreshCw,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Download
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { useToast } from '../components/Toast';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import LeaveBalanceWidget from '../components/LeaveBalanceWidget';
import { plAPI, leaveBalanceAPI, attendanceAPI, employeeAPI } from '../services/api';
import type { Employee, PLRecord, AttendanceRecord, LeaveBalance } from '../types/hrms';
import { useExport } from '../hooks/useExport';

export default function PLManagement() {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const { exportStyled } = useExport();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [records, setRecords] = useState<PLRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ledger' | 'logs'>('ledger');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHistoryFilter, setShowHistoryFilter] = useState(false);
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');
  const [filteredHistory, setFilteredHistory] = useState<any[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; message: string; onConfirm: () => void }>({ show: false, message: '', onConfirm: () => {} });
  const surrenderRef = useRef<HTMLInputElement>(null);
  const surrenderDateRef = useRef<HTMLInputElement>(null);
  
  // Allowance states
  const [leaveBalance, setLeaveBalance] = useState<Partial<LeaveBalance>>({
    cl_total: 12,
    pl_total: 15,
    used_cl: 0,
    used_pl: 0
  });
  const [adjustmentSaving, setAdjustmentSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchEmployeeData(selectedEmployeeId);
      fetchLeaveBalance(selectedEmployeeId, selectedYear);
    }
  }, [selectedEmployeeId, selectedYear]);

  const fetchEmployees = async () => {
    try {
      const data = await employeeAPI.getAll({ is_active: true });
      setEmployees(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setEmployees([]);
    }
  };

  const fetchEmployeeData = async (employeeId: string) => {
    setLoading(true);
    try {
      const [plRes, attRes] = await Promise.all([
        plAPI.getAll(employeeId),
        attendanceAPI.getByEmployee(employeeId)
      ]);
      setRecords(Array.isArray(plRes) ? plRes : []);
      setAttendance(Array.isArray(attRes) ? attRes : []);
    } catch (err) {
      console.error('Failed to fetch employee data:', err);
      setRecords([]);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalance = async (employeeId: string, year: number) => {
    try {
      const data = await leaveBalanceAPI.getByEmployeeAndYear(employeeId, year);
      if (data) {
        setLeaveBalance({
          cl_total: data.cl_total ?? 12,
          pl_total: data.pl_total ?? 15,
          used_cl: data.used_cl ?? 0,
          used_pl: data.used_pl ?? 0
        });
      } else {
        setLeaveBalance({ cl_total: 12, pl_total: 15, used_cl: 0, used_pl: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch leave balance allowance:', err);
    }
  };

  const handleUpsertRecord = async (record: Partial<PLRecord>) => {
    setSaving(true);
    try {
      await plAPI.upsert({
        ...record,
        employee_id: selectedEmployeeId
      });
      fetchEmployeeData(selectedEmployeeId);
      fetchLeaveBalance(selectedEmployeeId, selectedYear);
      showToast('PL record saved successfully', 'success');
    } catch (err) {
      console.error('Failed to save record:', err);
      showToast('Failed to save PL record', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAllowance = async () => {
    setAdjustmentSaving(true);
    try {
      await leaveBalanceAPI.upsert({
        employee_id: selectedEmployeeId,
        year: selectedYear,
        cl_total: leaveBalance.cl_total,
        pl_total: leaveBalance.pl_total,
        used_cl: leaveBalance.used_cl,
        used_pl: leaveBalance.used_pl
      });
      window.dispatchEvent(new CustomEvent('leaveBalanceUpdated'));
      fetchLeaveBalance(selectedEmployeeId, selectedYear);
      showToast('Allowance settings synchronized successfully! / भत्ते सफलतापूर्वक सिंक किए गए!', 'success');
    } catch (err) {
      console.error('Failed to update leave balance:', err);
      showToast('Failed to sync allowance / भत्ता सिंक करने में विफल', 'error');
    } finally {
      setAdjustmentSaving(false);
    }
  };

  const currentCalendarYear = `${selectedYear}`;

  const months = useMemo(() => {
    const monthsList = [];
    for (let i = 0; i < 12; i++) {
        const monthIndex = i;
        const year = selectedYear;
        monthsList.push(`${year}-${String(monthIndex + 1).padStart(2, '0')}`);
    }
    return monthsList;
  }, [selectedYear]);

  const getPLTaken = (monthYear: string) => {
    return attendance.filter(a => {
      if (!a.date.startsWith(monthYear) || !a.status) return false;
      return a.status === 'PL';
    }).length;
  };

  const getAllLeaveAndAbsentSummary = (monthYear: string) => {
    const recordsMonth = attendance.filter(a => a.date.startsWith(monthYear) && a.status);
    
    const groups: Record<string, number[]> = {};
    recordsMonth.forEach(a => {
      const code = a.status;
      if (['PL', 'A'].includes(code)) {
        if (!groups[code]) groups[code] = [];
        const day = new Date(a.date).getDate();
        if (!isNaN(day)) groups[code].push(day);
      }
    });

    const formatDays = (days: number[]) => {
      days.sort((a, b) => a - b);
      const uniqueDays = Array.from(new Set(days));
      if (uniqueDays.length === 0) return '';
      const ranges = [];
      let start = uniqueDays[0];
      let prev = uniqueDays[0];
      for (let i = 1; i <= uniqueDays.length; i++) {
        if (i < uniqueDays.length && uniqueDays[i] === prev + 1) {
          prev = uniqueDays[i];
        } else {
          if (start === prev) ranges.push(`${start}`);
          else ranges.push(`${start}-${prev}`);
          if (i < uniqueDays.length) {
            start = uniqueDays[i];
            prev = uniqueDays[i];
          }
        }
      }
      return ranges.join(', ');
    };

    const summaries: string[] = [];
    ['PL', 'A'].forEach(code => {
      if (groups[code] && groups[code].length > 0) {
        summaries.push(`${code}: ${formatDays(groups[code])}`);
      }
    });

    if (summaries.length === 0) return ':: No PL / Absent ::';
    return summaries.join(' | ');
  };

  const hasSurrenderedRecently = () => {
    return records.some(r => r.is_surrendered && r.surrender_year === currentCalendarYear);
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const handleOpenHistoryFilter = () => {
    if (!selectedEmployee) return;
    const emp = employees.find(e => e.id === selectedEmployeeId);
    if (emp && emp.joining_date) {
      setHistoryFromDate(emp.joining_date);
    } else {
      setHistoryFromDate(`${selectedYear}-01-01`);
    }
    setHistoryToDate(new Date().toISOString().split('T')[0]);
    setShowHistoryFilter(true);
  };

  const handleApplyHistoryFilter = () => {
    const history: any[] = [];
    attendance.forEach(a => {
      if (a.status === 'PL' && a.date >= historyFromDate && a.date <= historyToDate) {
        history.push({
          date: a.date,
          type: 'PL Taken',
          description: `PL taken on ${a.date}`,
          value: 1
        });
      }
    });
    records.forEach(r => {
      if (r.month_year >= historyFromDate.slice(0, 7) && r.month_year <= historyToDate.slice(0, 7)) {
        if (r.added_pl > 0) {
          history.push({
            date: `${r.month_year}-01`,
            type: 'PL Added',
            description: `PL provision added for ${r.month_year}`,
            value: r.added_pl
          });
        }
        if (r.is_surrendered) {
          history.push({
            date: r.surrender_letter_date || `${r.month_year}-15`,
            type: 'PL Surrendered',
            description: `30 PL surrendered under Ref: ${r.surrender_letter_number || 'N/A'}`,
            value: -30
          });
        }
      }
    });
    history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setFilteredHistory(history);
  };

  const filteredEmployees = employees.filter(e => {
    const excludedCategories = ['दैनिक वेतन', 'मासिक पारिश्रम', 'अलाउन्स'];
    if (excludedCategories.includes(e.category)) return false;
    return e.name.toLowerCase().includes(employeeSearch.toLowerCase()) || 
           e.employee_code.toLowerCase().includes(employeeSearch.toLowerCase());
  });

  const currentYearRecords = records.filter(r => r.month_year.startsWith(String(selectedYear)));
  const yearlyAdded = currentYearRecords.reduce((acc, curr) => acc + curr.added_pl, 0);
  const yearlyTaken = months.reduce((acc, m) => acc + getPLTaken(m), 0);
  
  const surrenderRecord = currentYearRecords.find(r => r.is_surrendered && r.surrender_year === currentCalendarYear);
  const yearlySurrendered = surrenderRecord ? 30 : 0;

  const yearlyAbsent = attendance.filter(a => a.date.startsWith(String(selectedYear)) && (a.status === 'absent' || a.status === 'A')).length;
  
  const ledgerData = useMemo(() => {
    let runningClosing = 0;
    return months.map((m, idx) => {
      const record = records.find(r => r.month_year === m);
      const recordData = record || {
          id: '', month_year: m, opening_balance: 0, added_pl: 0,
          is_surrendered: 0, surrender_year: currentCalendarYear,
          surrender_letter_number: '', surrender_letter_date: '', closing_balance: 0
      };
      
      const plTaken = getPLTaken(m);
      const consumption = plTaken; // Surrender is calculated globally from the Dec or first found record, removed from monthly table calculation to avoid visual clutter
      
      let autoOpening = 0;
      if (idx === 0) {
          if (!recordData.id) {
              const prevYearDec = `${selectedYear - 1}-12`;
              const prevDecRecord = records.find(r => r.month_year === prevYearDec);
              autoOpening = prevDecRecord ? prevDecRecord.closing_balance : 0;
          } else {
              autoOpening = recordData.opening_balance;
          }
      } else {
          autoOpening = runningClosing;
      }
      
      const autoAddedPL = idx === 0 && !recordData.id ? leaveBalance.pl_total : recordData.added_pl;
      
      const isDec = idx === 11;
      // We apply surrender deduction visually on the last month for the yearly total, or we just keep runningClosing standard and subtract surrender from the final net closing.
      // Actually, running closing for each month shouldn't be affected by surrender unless surrender happened in that month.
      // We will deduct surrender only in the month it occurred.
      const monthConsumption = consumption + (recordData.is_surrendered ? 30 : 0);
      const closing = autoOpening + autoAddedPL - monthConsumption;
      runningClosing = closing;
      
      return { m, recordData, autoOpening, autoAddedPL, plTaken, monthConsumption, closing };
    });
  }, [months, records, attendance, selectedYear, leaveBalance.pl_total, currentCalendarYear]);

  const startingOpening = ledgerData[0]?.autoOpening || 0;
  const netClosing = ledgerData[11]?.closing || 0;

  // Carry Forward PL logic - December to January
  const handleCarryForward = async () => {
    if (!selectedEmployeeId) return;
    
    const nextJanuary = `${selectedYear + 1}-01`;
    const nextRecord = records.find(r => r.month_year === nextJanuary) || {
      id: '',
      month_year: nextJanuary,
      opening_balance: 0,
      added_pl: 0,
      is_surrendered: 0,
      surrender_year: `${selectedYear + 1}`,
      surrender_letter_number: '',
      surrender_letter_date: '',
      closing_balance: 0
    };

    setConfirmDialog({
      show: true,
      message: `Are you sure you want to carry forward the current year's closing PL balance (${netClosing.toFixed(1)}) to the next year (${selectedYear + 1})? This will initialize next year's January opening balance.`,
      onConfirm: async () => {
        setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
        setSaving(true);
        try {
          await plAPI.upsert({
            ...nextRecord,
            opening_balance: parseFloat(netClosing.toFixed(1)),
            closing_balance: parseFloat(netClosing.toFixed(1)) + nextRecord.added_pl,
            employee_id: selectedEmployeeId
          });
          showToast(`PL balance carried forward! January ${selectedYear + 1} opening: ${netClosing.toFixed(1)}`, 'success');
          fetchEmployeeData(selectedEmployeeId);
        } catch (err) {
          console.error('Carry forward failed:', err);
          showToast('Failed to carry forward PL balance', 'error');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // Build Leave History Logs dynamically
  const leaveLogs = useMemo(() => {
    const logs: any[] = [];
    attendance.forEach(a => {
      if (['PL', 'CL', 'HCL', 'LWP'].includes(a.status)) {
        logs.push({
          date: a.date,
          type: 'deduction',
          leaveType: a.status,
          description: `Leave consumed on ${a.date} (${a.status})`,
          icon: Clock,
          color: 'text-red-500 bg-red-500/10'
        });
      }
    });
    records.forEach(r => {
      if (r.added_pl > 0) {
        logs.push({
          date: `${r.month_year}-01`,
          type: 'credit',
          leaveType: 'PL',
          description: `Provision credited for cycle ${r.month_year} (+${r.added_pl} PL)`,
          icon: Plus,
          color: 'text-emerald-500 bg-emerald-500/10'
        });
      }
      if (r.is_surrendered) {
        logs.push({
          date: r.surrender_letter_date || `${r.month_year}-15`,
          type: 'surrender',
          leaveType: 'PL',
          description: `Surrendered 30 PL days under Dispatch Ref: ${r.surrender_letter_number || 'N/A'}`,
          icon: DollarSign,
          color: 'text-blue-500 bg-blue-500/10'
        });
      }
    });

    // Sort by date descending
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, records]);

  return (
    <div className="flex flex-col h-full bg-transparent font-sans relative z-10 select-none text-[var(--text-primary)]">
      {/* Premium Header */}
      <div className="px-8 py-5 backdrop-blur-2xl bg-[var(--bg-card)] border-b border-[var(--border-primary)] shadow-md flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-black tracking-tight uppercase m-0 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
            {t('pl.title')}
          </h1>
          <div className="flex items-center gap-3.5 text-[var(--text-secondary)] text-[9px] font-black uppercase tracking-[0.2em] opacity-80">
            <div className="flex items-center gap-1.5">
              <Calculator size={12} className="text-blue-500" />
              <span>{language === 'hi' ? 'कैलेंडर वर्ष छुट्टी लेज़र' : 'Calendar Year Leave Ledger'}</span>
            </div>
            <span className="opacity-30">|</span>
            <div className="flex items-center gap-1.5">
              <Fingerprint size={12} className="text-green-500" />
              <span>{language === 'hi' ? 'ऑडिट सुरक्षित श्रृंखला' : 'Audit Secure Chain'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-sm">
             <Calendar size={13} className="text-blue-500" />
             <select 
               value={selectedYear} 
               onChange={(e) => setSelectedYear(parseInt(e.target.value))}
               className="border-0 bg-transparent text-xs font-black uppercase tracking-widest w-[115px] outline-none text-[var(--text-primary)] cursor-pointer"
             >
                {Array.from({ length: 6 }, (_, i) => {
                  const yr = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={yr} value={yr} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{yr}</option>
                  );
                })}
             </select>
           </div>
          
          {selectedEmployee && (
            <div className="flex flex-wrap items-center gap-6 px-5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <TrendingUp size={15} />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Granted PL</span>
                    <span className="font-mono font-black text-[var(--text-primary)] text-base leading-none mt-0.5">{yearlyAdded}</span>
                 </div>
              </div>
              <div className="w-px h-6 bg-[var(--border-primary)]" />
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                    <Activity size={15} />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Consumed PL</span>
                    <span className="font-mono font-black text-[var(--text-primary)] text-base leading-none mt-0.5">{yearlyTaken + yearlySurrendered}</span>
                 </div>
              </div>
              <div className="w-px h-6 bg-[var(--border-primary)]" />
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <AlertTriangle size={15} />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Absent Days</span>
                    <span className="font-mono font-black text-[var(--text-primary)] text-base leading-none mt-0.5">{yearlyAbsent}</span>
                 </div>
              </div>
              <div className="w-px h-6 bg-[var(--border-primary)]" />
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                    <DollarSign size={15} />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Net Closing</span>
                    <span className={cn("font-mono font-black text-base leading-none mt-0.5", netClosing >= 0 ? "text-green-500" : "text-red-500")}>
                      {netClosing.toFixed(1)}
                    </span>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-grow overflow-hidden">
        {/* Registry Sidebar Explorer */}
        <div className={`flex flex-col border-r border-[var(--border-primary)] bg-[var(--bg-card)] backdrop-blur-md flex-shrink-0 transition-all duration-300 ${
          sidebarCollapsed ? 'hidden lg:hidden' : 'w-[300px] lg:w-[300px]'
        }`}>
          <div className="p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between gap-2">
            <div className="relative group flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={13} />
              <Input
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Find personnel..."
                className="pl-9 h-8 rounded-lg bg-[var(--bg-secondary)] border-[var(--border-primary)] focus:bg-[var(--bg-tertiary)] text-xs font-bold text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
              />
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
          <div className="overflow-y-auto flex-grow custom-scrollbar">
            {filteredEmployees.length === 0 && (
              <div className="p-4 text-center text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                No personnel found
              </div>
            )}
            {filteredEmployees.map(emp => (
              <button
                key={emp.id}
                onClick={() => setSelectedEmployeeId(emp.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 border-b border-[var(--border-primary)] transition-premium text-left relative group cursor-pointer",
                  selectedEmployeeId === emp.id ? "bg-blue-500/10" : "hover:bg-[var(--bg-tertiary)]"
                )}
              >
                {selectedEmployeeId === emp.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                )}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center font-black transition-premium shadow-md text-[10px] select-none flex-shrink-0",
                  selectedEmployeeId === emp.id ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                )}>
                  {emp.name.charAt(0)}
                </div>
                <div className="flex-grow min-w-0">
                  <p className={cn("m-0 font-bold text-[11px] uppercase truncate transition-colors", selectedEmployeeId === emp.id ? "text-blue-500" : "text-[var(--text-primary)]")}>{emp.name}</p>
                  <span className="text-[var(--text-secondary)] font-mono text-[8px] font-bold opacity-60">{emp.employee_code}</span>
                </div>
                <ChevronRight size={11} className={cn("transition-premium flex-shrink-0", selectedEmployeeId === emp.id ? "text-blue-500 translate-x-0.5" : "text-[var(--text-secondary)] opacity-0 group-hover:opacity-100")} />
              </button>
            ))}
          </div>
        </div>
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="fixed left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-12 rounded-r-xl bg-[var(--bg-card)] border border-[var(--border-primary)] border-l-0 flex items-center justify-center shadow-md hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer text-[var(--text-secondary)] hover:text-blue-500 lg:flex hidden"
            title="Open employee list"
            aria-label="Open sidebar"
          >
            <PanelLeftOpen size={14} />
          </button>
        )}

        {/* Central Workspace */}
        <div className="flex-grow flex flex-col p-6 md:p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-secondary)]/30" aria-live="polite">
          {selectedEmployee ? (
            <div key={selectedEmployee.id} className="flex flex-col space-y-6 animate-fade-in pb-12">
              
              {/* Profile Card & Allowance Controls Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Employee Profile & Carry Forward */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                      {selectedEmployee.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-base uppercase text-[var(--text-primary)]">{selectedEmployee.name}</h3>
                      <p className="text-xs font-mono font-bold text-[var(--text-secondary)] mt-0.5">{selectedEmployee.employee_code} • {selectedEmployee.designation}</p>
                      <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-[9px] font-black uppercase text-[var(--accent-blue)] tracking-wider">
                        {selectedEmployee.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-[var(--border-primary)] pt-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
                      <span>December Cycle Closing:</span>
                      <span className="font-mono text-[var(--text-primary)]">{netClosing.toFixed(1)} days</span>
                    </div>
                    <button 
                      onClick={handleCarryForward}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-black uppercase text-[10px] tracking-wider transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
                    >
                      <ArrowRightLeft size={13} />
                      <span>Forward PL to {selectedYear + 1}</span>
                    </button>
                  </div>
                </div>

                {/* Allowance synchronizer widget */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2 mb-4">
                      <Sliders size={13} className="text-indigo-500" />
                      <span>Yearly Allowance Settings — {selectedYear}</span>
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-[var(--text-secondary)]">CL Allowed</label>
                        <Input 
                          type="number" 
                          value={leaveBalance.cl_total}
                          onChange={(e) => setLeaveBalance({ ...leaveBalance, cl_total: parseInt(e.target.value) || 0 })}
                          className="font-mono font-bold text-center h-9 rounded-xl bg-[var(--bg-secondary)] border-[var(--border-primary)]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-[var(--text-secondary)]">PL Allowed</label>
                        <Input 
                          type="number" 
                          value={leaveBalance.pl_total}
                          onChange={(e) => setLeaveBalance({ ...leaveBalance, pl_total: parseInt(e.target.value) || 0 })}
                          className="font-mono font-bold text-center h-9 rounded-xl bg-[var(--bg-secondary)] border-[var(--border-primary)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[var(--border-primary)]">
                    <button
                      onClick={handleUpdateAllowance}
                      disabled={adjustmentSaving}
                      className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer"
                    >
                      <RefreshCw size={13} className={cn(adjustmentSaving && "animate-spin")} />
                      <span>Sync Yearly Allowed</span>
                    </button>
                  </div>
                </div>

                {/* Shared Balance Widget */}
                <div className="flex flex-col">
                  <LeaveBalanceWidget employeeId={selectedEmployeeId} year={selectedYear} />
                </div>

              </div>

              {/* Yearly Surrender Section */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign size={16} className="text-purple-500" />
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[var(--text-primary)]">
                    Yearly PL Surrender — {selectedYear}
                  </h4>
                </div>
                
                {surrenderRecord ? (
                  <div className="flex flex-col md:flex-row items-center justify-between bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">30 Days Surrendered</span>
                      <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-primary)]">
                        <span>Ref: {surrenderRecord.surrender_letter_number}</span>
                        <span>|</span>
                        <span>Date: {surrenderRecord.surrender_letter_date}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUpsertRecord({ ...surrenderRecord, is_surrendered: 0, surrender_year: null, surrender_letter_number: null, surrender_letter_date: null })}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Undo Surrender
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1 w-full space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Dispatch Ref #</label>
                      <input 
                        ref={surrenderRef}
                        placeholder="Required"
                        className="w-full px-3 py-2 rounded-xl font-mono font-bold h-9 bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="flex-1 w-full space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Surrender Date</label>
                      <input 
                        ref={surrenderDateRef}
                        type="date"
                        className="w-full px-3 py-2 rounded-xl font-mono font-bold h-9 bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const refEl = surrenderRef.current;
                        const dateEl = surrenderDateRef.current;
                        if (!refEl?.value) return showToast('Ref Number required', 'warning');
                        if (!dateEl?.value) return showToast('Date required', 'warning');
                        const decRecord = records.find(r => r.month_year === `${selectedYear}-12`) || {
                          month_year: `${selectedYear}-12`, opening_balance: 0, added_pl: 0, closing_balance: 0
                        };
                        handleUpsertRecord({ 
                          ...decRecord, 
                          is_surrendered: 1, 
                          surrender_year: currentCalendarYear,
                          surrender_letter_number: refEl.value,
                          surrender_letter_date: dateEl.value
                        });
                      }}
                      disabled={saving || hasSurrenderedRecently()}
                      className="h-9 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-black uppercase text-[10px] tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      Initiate Surrender
                    </button>
                  </div>
                )}
              </div>

              {/* Workspace workspace controls tabs */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-xl overflow-hidden backdrop-blur-2xl">
                
                {/* Navigation Tab Header */}
                <div className="flex items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 px-6 py-3">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setActiveTab('ledger')}
                      className={cn(
                        "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2",
                        activeTab === 'ledger' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                      role="tab"
                      aria-selected={activeTab === 'ledger'}
                    >
                      <Calculator size={13} />
                      <span>Month Cycle Ledger</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('logs')}
                      className={cn(
                        "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2",
                        activeTab === 'logs' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                      role="tab"
                      aria-selected={activeTab === 'logs'}
                    >
                      <History size={13} />
                      <span>Visual Leave & Audit Logs</span>
                    </button>
                    <button 
                      onClick={handleOpenHistoryFilter}
                      className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 text-[var(--text-secondary)] hover:text-blue-500 hover:bg-blue-500/5"
                    >
                      <Sliders size={13} />
                      <span>PL History Filter</span>
                    </button>
                  </div>

                  <div className="text-[9px] font-black uppercase tracking-wider text-[var(--text-secondary)] font-mono">
                    Calendar Year: {currentCalendarYear}
                  </div>
                </div>

                {/* Ledger Tab Content */}
                {activeTab === 'ledger' ? (
                  <div className="overflow-x-auto">
                    <table className="theme-table w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] select-none">
                          <th className="px-6 py-4 text-left w-[160px]">Accounting Cycle</th>
                          <th className="px-4 py-4 text-center w-[110px]">Opening Bal</th>
                          <th className="px-4 py-4 text-center text-blue-500 w-[110px]">Provision (+)</th>
                          <th className="px-4 py-4 text-center w-[90px]">Taken (-)</th>
                          <th className="px-6 py-4 text-left">Attendance Audit Logs</th>
                          <th className="px-6 py-4 text-center text-red-500 w-[130px]">Total Burn</th>
                          <th className="px-6 py-4 text-right w-[150px]">Closing Assets</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-primary)] text-xs text-[var(--text-primary)]">
                        {ledgerData.map(({ m, recordData, autoOpening, autoAddedPL, plTaken, monthConsumption, closing }) => {
                          return (
                            <tr key={m} className="group hover:bg-[var(--bg-secondary)]/40 transition-premium">
                              <td className="px-6 py-3.5">
                                <div className="flex flex-col">
                                  <span className="font-black uppercase text-[var(--text-primary)] text-[13px]">{new Date(m + '-01').toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', { month: 'short' })}</span>
                                  <span className="text-[var(--text-secondary)] font-mono font-black text-[9px] tracking-widest uppercase mt-0.5 opacity-80">{new Date(m + '-01').getFullYear()} CYCLE</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <Input
                                  type="number"
                                  value={autoOpening || ''}
                                  onChange={(e) => handleUpsertRecord({ ...recordData, month_year: m, opening_balance: parseFloat(e.target.value) || 0 })}
                                  className="text-center font-mono font-black bg-[var(--bg-tertiary)] border-[var(--border-primary)] h-9 rounded-xl focus:bg-[var(--bg-secondary)] focus:border-blue-500 text-[var(--text-primary)] shadow-sm"
                                  disabled={m !== `${selectedYear}-01`} // Only allow manual editing for January, others cascade
                                />
                              </td>
                              <td className="px-4 py-3.5">
                                <Input
                                  type="number"
                                  value={autoAddedPL || ''}
                                  onChange={(e) => handleUpsertRecord({ ...recordData, month_year: m, added_pl: parseFloat(e.target.value) || 0 })}
                                  className="text-center font-mono font-black bg-blue-500/10 border-blue-500/20 text-blue-500 h-9 rounded-xl focus:bg-[var(--bg-secondary)] focus:border-blue-500 text-[var(--text-primary)] shadow-sm"
                                />
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className="font-mono font-black text-[var(--text-secondary)] text-base opacity-90">{plTaken}</span>
                              </td>
                              <td className="px-6 py-3.5">
                                 <div className="flex items-center gap-2.5 text-[var(--text-primary)] font-mono text-[11px] font-bold opacity-95">
                                    <Clock size={12} className="text-blue-500 flex-shrink-0" />
                                    <span>{getAllLeaveAndAbsentSummary(m)}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-3.5 text-center">
                                <span className="px-2.5 py-1 rounded-xl bg-red-500/15 text-red-500 font-mono font-black text-[10px] border border-red-500/20">
                                  {monthConsumption}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-right">
                                <span className={cn("font-mono font-black text-base tracking-tight", closing >= 0 ? "text-green-500 font-bold" : "text-red-500 font-bold")}>
                                  {closing.toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Visual logs history list tab */
                  <div className="p-6 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">Historical Leave Deductions & Credits Log</h3>
                    
                    {leaveLogs.length === 0 ? (
                      <div className="py-12 text-center text-xs font-black uppercase text-[var(--text-secondary)] opacity-60">
                        No transactions or leave logs recorded for this year.
                      </div>
                    ) : (
                      <div className="relative border-l border-[var(--border-primary)] ml-3 pl-6 space-y-6">
                        {leaveLogs.map((log, lIdx) => {
                          const Icon = log.icon;
                          return (
                            <div key={lIdx} className="relative flex items-start gap-4 animate-fade-in">
                              {/* Timeline indicator node */}
                              <div className={cn("absolute -left-10 top-0.5 w-8 h-8 rounded-full border border-[var(--border-primary)] flex items-center justify-center shadow-md", log.color)}>
                                <Icon size={13} />
                              </div>

                              <div className="flex-grow bg-[var(--bg-secondary)]/50 border border-[var(--border-primary)] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-sm hover:shadow-md transition-all">
                                <div>
                                  <span className="inline-block px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[8px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                                    {log.leaveType}
                                  </span>
                                  <p className="text-xs font-bold text-[var(--text-primary)] mt-1.5">{log.description}</p>
                                </div>
                                <div className="text-right text-[10px] font-mono font-black text-[var(--text-secondary)] uppercase">
                                  {new Date(log.date).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center select-none py-24">
               <div className="w-24 h-24 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center mb-6 shadow-2xl relative text-[var(--accent-blue)] animate-pulse">
                  <div className="absolute inset-0 bg-[var(--accent-blue)]/5 blur-[20px] rounded-full pointer-events-none" />
                  <Calculator size={40} strokeWidth={1.5} className="relative z-10" />
               </div>
               <h2 className="text-sm font-black uppercase tracking-widest mb-1.5 text-[var(--text-primary)]">Personnel Ledger Standby</h2>
               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-60">Select an identity from the registry to sync financial assets</p>
            </div>
          )}
        </div>
      </div>

      {/* PL History Filter Modal */}
      {showHistoryFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl w-full max-w-3xl shadow-2xl text-[var(--text-primary)] max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/15">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wide">
                    PL History Filter
                  </h3>
                  <p className="text-[8px] font-bold text-[var(--text-secondary)] font-mono mt-0.5">
                    {selectedEmployee?.name || 'No employee selected'} • {filteredHistory.length} records
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryFilter(false)}
                className="w-8 h-8 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-[var(--text-secondary)] flex items-center justify-center transition-all cursor-pointer"
                aria-label="Close filter modal"
              >
                <X size={15} />
              </button>
            </div>

            {/* Filter Controls */}
            <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/30 shrink-0">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-[200px]">
                  <label className="text-[9px] font-black uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">From Date</label>
                  <input
                    type="date"
                    value={historyFromDate}
                    onChange={(e) => setHistoryFromDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] text-xs font-bold text-[var(--text-primary)] focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="w-[200px]">
                  <label className="text-[9px] font-black uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">To Date</label>
                  <input
                    type="date"
                    value={historyToDate}
                    onChange={(e) => setHistoryToDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] text-xs font-bold text-[var(--text-primary)] focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <button
                  onClick={handleApplyHistoryFilter}
                  className="h-9 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-black text-[10px] uppercase tracking-wider cursor-pointer shadow-md shadow-blue-500/15 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Zap size={13} /> Apply Filter
                </button>
                <button
                  onClick={() => {
                    setHistoryFromDate('');
                    setHistoryToDate('');
                    setFilteredHistory([]);
                  }}
                  className="h-9 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-black text-[10px] uppercase tracking-wider cursor-pointer shadow-sm transition-all"
                >
                  Reset
                </button>
                <button
                  onClick={() => exportStyled({
                    filename: 'pl-history',
                    sheetName: 'PL History',
                    title: `PL History — ${selectedEmployee?.name || 'All Employees'}`,
                    headers: ['Date', 'Type', 'Description', 'Value'],
                    rows: filteredHistory.map((h: any) => [
                      new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                      h.type,
                      h.description,
                      h.value > 0 ? `+${h.value}` : String(h.value)
                    ]),
                    colWidths: [18, 16, 40, 10],
                    summaryRows: [
                      { label: 'Total Records', value: String(filteredHistory.length) },
                    ],
                  })}
                  disabled={filteredHistory.length === 0}
                  className="h-9 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-black text-[10px] uppercase tracking-wider cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center mb-4 text-[var(--text-secondary)]">
                    <Sliders size={28} strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-wider">
                    No Records Found
                  </p>
                  <p className="text-[9px] font-bold text-[var(--text-secondary)] mt-1 opacity-60 font-mono">
                    Set date range and apply filter to view PL history
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[var(--bg-secondary)] z-10">
                    <tr className="border-b border-[var(--border-primary)] text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                      <th className="px-6 py-3.5 w-[140px]">Date</th>
                      <th className="px-6 py-3.5 w-[130px]">Type</th>
                      <th className="px-6 py-3.5">Description</th>
                      <th className="px-6 py-3.5 text-right w-[90px]">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-primary)] text-xs">
                    {filteredHistory.map((h, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bg-secondary)]/40 transition-colors">
                        <td className="px-6 py-3 font-mono font-bold text-[11px] text-[var(--text-primary)]">
                          {new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-3">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider",
                            h.type === 'PL Added' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                            h.type === 'PL Taken' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                            "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          )}>
                            {h.type === 'PL Added' && <Zap size={10} />}
                            {h.type === 'PL Taken' && <ArrowRight size={10} />}
                            {h.type === 'PL Surrendered' && <AlertTriangle size={10} />}
                            {h.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-bold text-[var(--text-primary)] text-[11px]">{h.description}</td>
                        <td className={cn(
                          "px-6 py-3 text-right font-mono font-black text-[13px]",
                          h.value > 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-lg",
                            h.value > 0 ? "bg-emerald-500/5" : "bg-red-500/5"
                          )}>
                            {h.value > 0 ? `+${h.value}` : h.value}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Summary */}
            {filteredHistory.length > 0 && (
              <div className="px-6 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 flex items-center justify-between shrink-0 text-[9px] font-black uppercase tracking-wider">
                <span className="text-[var(--text-secondary)]">
                  Total Records: <span className="text-[var(--text-primary)]">{filteredHistory.length}</span>
                </span>
                <span className="text-[var(--text-secondary)]">
                  Net PL: <span className={cn(
                    "font-mono",
                    filteredHistory.reduce((s: number, h: any) => s + h.value, 0) >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {filteredHistory.reduce((s: number, h: any) => s + h.value, 0) > 0 ? '+' : ''}
                    {filteredHistory.reduce((s: number, h: any) => s + h.value, 0)}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in" role="dialog" aria-modal="true" aria-label="Confirmation">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl text-[var(--text-primary)]">
            <p className="text-sm font-bold mb-6">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: () => {} })}
                className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-black text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Operational Metadata Footer */}
      <div className="px-8 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between select-none">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[9px] font-black uppercase tracking-widest opacity-75">
            <TrendingUp size={13} className="text-[var(--accent-green)]" />
            <span>Provision Analytics: Verified</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[9px] font-black uppercase tracking-widest opacity-75">
            <ShieldCheck size={13} className="text-[var(--accent-blue)]" />
            <span>Financial Audit Tunnel Active</span>
          </div>
        </div>

        <div className="text-[var(--text-secondary)] font-mono text-[9px] font-black tracking-widest opacity-55">
          PRMX-LEDGER-OS v5.0.2 • SECURE_RUNTIME
        </div>
      </div>
    </div>
  );
}
