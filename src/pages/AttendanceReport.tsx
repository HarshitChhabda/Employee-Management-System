import { useState, useEffect, useMemo, useCallback } from 'react';
import { employeeAPI, attendanceAPI, masterAPI } from '../services/api';
import { 
  Users, 
  Search, 
  Calendar, 
  Download,
  FileSpreadsheet,
  PieChart,
  TrendingUp,
  FileText,
  Clock,
  Filter,
  Zap,
  ShieldCheck,
  Database,
  ArrowRight,
  ChevronDown,
  X,
  CalendarDays
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../lib/LanguageContext';
import { useConnectivity } from '../lib/ConnectivityContext';
import { useAuthStore } from '../stores/authStore';
import { useExport } from '../hooks/useExport';
import { cn } from "@/lib/utils";
import { categories, attendanceStatuses } from '../lib/hindiLabels';
import { ATTENDANCE_CONFIG } from '../lib/attendanceConfig';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface AttendanceRecord {
  employee_id: string;
  date: string;
  status: string;
}

interface Employee {
  id: string;
  name: string;
  employee_code: string;
  designation: string;
  category: string;
  department: string;
}

export default function AttendanceReport() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { isOnline } = useConnectivity();
  const { session } = useAuthStore();
  const isHO = session?.role === 'ROLE_HO';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [viewType, setViewType] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportPage, setReportPage] = useState(1);
  const [rptShowAll, setRptShowAll] = useState(false);
  const REPORT_PAGE_SIZE = 20;
  const [masterDepartments, setMasterDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [masterDesignations, setMasterDesignations] = useState<Array<{ id: string; name: string }>>([]);

  const [leaveDatesModal, setLeaveDatesModal] = useState<{
    isOpen: boolean;
    employeeName: string;
    leaveType: string;
    leaveTypeHi: string;
    dates: string[];
    payrollImpact: number;
  }>({
    isOpen: false,
    employeeName: '',
    leaveType: '',
    leaveTypeHi: '',
    dates: [],
    payrollImpact: 0
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, viewType, selectedDate]);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const empParams = isHO ? { include_branch: true } : undefined;
      const empData = await employeeAPI.getAll(empParams);
      setEmployees(Array.isArray(empData) ? empData : []);

      const branchParam = isHO ? { include_branch: true } : undefined;
      let attData: AttendanceRecord[];
      if (viewType === 'monthly') {
        attData = await attendanceAPI.getByMonth(selectedMonth, selectedYear, branchParam);
      } else if (viewType === 'daily') {
        attData = await attendanceAPI.getByDate(selectedDate, branchParam);
      } else {
        const promises = [];
        for (let m = 1; m <= 12; m++) {
          promises.push(attendanceAPI.getByMonth(m, selectedYear, branchParam));
        }
        const results = await Promise.all(promises);
        attData = results.flat();
      }
      setAttendance(Array.isArray(attData) ? attData : []);
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = (emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           emp.designation?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = !categoryFilter || categoryFilter === 'ALL' || emp.category === categoryFilter;
      const matchDepartment = !departmentFilter || departmentFilter === 'ALL' || emp.department === departmentFilter;
      const matchDesignation = !designationFilter || designationFilter === 'ALL' || emp.designation === designationFilter;
      return matchSearch && matchCategory && matchDepartment && matchDesignation;
    });
  }, [employees, searchTerm, categoryFilter, departmentFilter, designationFilter]);

  useEffect(() => { setReportPage(1); setRptShowAll(false); }, [searchTerm, categoryFilter, departmentFilter, designationFilter]);

  const getEmployeeStats = useCallback((employeeId: string) => {
    const empAtt = attendance.filter(a => {
      const date = new Date(a.date);
      const inEmployee = String(a.employee_id) === String(employeeId);
      if (!inEmployee) return false;

      if (viewType === 'monthly') {
        return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
      } else if (viewType === 'yearly') {
        return date.getFullYear() === selectedYear;
      } else if (viewType === 'daily') {
        return a.date === selectedDate;
      }
      return true;
    });

    const stats: Record<string, number> = {};
    attendanceStatuses.forEach(s => { stats[s.value] = 0; });
    empAtt.forEach(a => {
      if (stats[a.status] !== undefined) stats[a.status]++;
      else stats[a.status] = 1;
    });

    return stats;
  }, [attendance, viewType, selectedMonth, selectedYear, selectedDate]);

  const getEmployeeLeaveDates = useCallback((
    employeeId: string, 
    statusCode: string
  ): string[] => {
    return attendance
      .filter(a => {
        const date = new Date(a.date);
        const inEmployee = String(a.employee_id) === String(employeeId);
        if (!inEmployee || a.status !== statusCode) return false;
        if (viewType === 'monthly') {
          return date.getMonth() + 1 === selectedMonth && 
                 date.getFullYear() === selectedYear;
        } else if (viewType === 'yearly') {
          return date.getFullYear() === selectedYear;
        } else if (viewType === 'daily') {
          return a.date === selectedDate;
        }
        return true;
      })
      .map(a => a.date)
      .sort();
  }, [attendance, viewType, selectedMonth, selectedYear, selectedDate]);

  const openLeaveDatesModal = useCallback((
    emp: Employee,
    statusCode: string,
    count: number
  ) => {
    if (count === 0) return;
    const config = ATTENDANCE_CONFIG[statusCode as keyof typeof ATTENDANCE_CONFIG];
    if (!config) return;
    const dates = getEmployeeLeaveDates(emp.id, statusCode);
    setLeaveDatesModal({
      isOpen: true,
      employeeName: emp.name,
      leaveType: config.label,
      leaveTypeHi: config.labelHi,
      dates,
      payrollImpact: count * (config.payrollValue ?? 1)
    });
  }, [getEmployeeLeaveDates]);

  const { exportStyled } = useExport();

  const handleExport = () => {
    const period = viewType === 'monthly' 
      ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
      : viewType === 'yearly' 
      ? String(selectedYear)
      : selectedDate;

    const rows = filteredEmployees.map(emp => {
      const stats = getEmployeeStats(emp.id);
      const payable = (stats['P'] || 0) + (stats['CL'] || 0) + (stats['PL'] || 0) + (stats['WO'] || 0) + (stats['OD'] || 0) + (stats['HCL'] || 0) * 0.5 + (stats['HD'] || 0) * 0.5;
      const unpaid = (stats['A'] || 0) + (stats['LWP'] || 0);
      return [
        emp.employee_code,
        emp.name,
        emp.department,
        emp.designation,
        String(stats['P'] || 0),
        String(stats['A'] || 0),
        String(stats['CL'] || 0),
        String(stats['PL'] || 0),
        String(stats['HCL'] || 0),
        String(stats['HD'] || 0),
        String(stats['WO'] || 0),
        String(stats['OD'] || 0),
        String(stats['LWP'] || 0),
        payable.toFixed(1),
        String(unpaid)
      ];
    });

    exportStyled({
      filename: `attendance-report-${period}`,
      sheetName: 'Attendance Report',
      headers: ['Employee Code', 'Name', 'Department', 'Designation', 'P', 'A', 'CL', 'PL', 'HCL', 'HD', 'WO', 'OD', 'LWP', 'Payable Days', 'Unpaid Days'],
      rows,
      colWidths: [14, 24, 18, 20, 8, 8, 8, 8, 8, 8, 8, 8, 8, 14, 14],
    });
  };

  const totalStats = useMemo(() => {
    return filteredEmployees.reduce((acc, emp) => {
      const stats = getEmployeeStats(emp.id);
      Object.keys(stats).forEach(k => acc[k] = (acc[k] || 0) + stats[k]);
      return acc;
    }, {} as Record<string, number>);
  }, [filteredEmployees, attendance, viewType, selectedMonth, selectedYear, selectedDate]);

  return (
    <div className="flex flex-col h-full bg-transparent font-sans relative z-10 select-none text-[var(--text-primary)]">
      {/* Page Header */}
      <div className="px-8 py-6 backdrop-blur-2xl bg-[var(--bg-card)] border-b border-[var(--border-primary)] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-black tracking-tight uppercase m-0 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
            {t('attendance.reportTitle')}
          </h1>
          <div className="flex items-center gap-3.5 text-[var(--text-secondary)] text-[9px] font-black uppercase tracking-[0.2em] opacity-80">
            <div className="flex items-center gap-1.5">
              <PieChart size={12} className="text-[var(--accent-blue)]" />
              <span>Analytical Engine Active</span>
            </div>
            <span className="opacity-30">|</span>
            <div className="flex items-center gap-1.5">
              <Users size={12} className="text-[var(--accent-green)]" />
              <span>{filteredEmployees.length} Units Analyzed</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] backdrop-blur-xl p-1 rounded-2xl border border-[var(--border-primary)] shadow-sm">
            {(['daily', 'monthly', 'yearly'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-premium cursor-pointer",
                  viewType === type 
                    ? "bg-[var(--accent-blue)] text-white shadow-lg shadow-[var(--accent-blue)]/15 border border-white/10" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                )}
              >
                {t(`attendance.${type}`)}
              </button>
            ))}
          </div>
          
          <Button onClick={handleExport} className="rounded-xl px-5 h-10 bg-gradient-to-r from-[var(--accent-green)] to-emerald-600 text-white hover:opacity-90 border border-white/10 shadow-lg shadow-[var(--accent-green)]/15 hover:scale-[1.02] transition-premium cursor-pointer text-[10px] font-black uppercase tracking-widest">
            <FileSpreadsheet size={16} className="mr-1.5" />
            EXPORT REPORT
          </Button>
        </div>
      </div>

      {/* Control Matrix Bar */}
      <div className="px-8 py-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex flex-wrap items-center gap-4 backdrop-blur-md">
        <div className="relative group w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={15} />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter Personnel Matrix..."
            className="pl-12 h-10 rounded-xl bg-[var(--bg-card)] border-[var(--border-primary)] focus:bg-[var(--bg-tertiary)] text-xs font-bold text-[var(--text-primary)] placeholder-[var(--text-secondary)] shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] shadow-sm">
          <Filter size={13} className="text-[var(--accent-blue)]" />
          <select
            value={categoryFilter || 'ALL'}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="border-0 bg-transparent text-[9px] font-black uppercase tracking-widest outline-none text-[var(--text-primary)] cursor-pointer"
          >
            <option value="ALL" className="bg-[var(--bg-card)] text-[var(--text-primary)]">{t('attendance.allCategories')}</option>
            {categories.map(c => <option key={c.value} value={c.value} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{language === 'hi' ? c.labelHi : c.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] shadow-sm">
          <Filter size={13} className="text-[var(--accent-blue)]" />
          <select
            value={departmentFilter || 'ALL'}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
            className="border-0 bg-transparent text-[9px] font-black uppercase tracking-widest outline-none text-[var(--text-primary)] cursor-pointer"
          >
            <option value="ALL" className="bg-[var(--bg-card)] text-[var(--text-primary)]">All Departments / सभी विभाग</option>
            {masterDepartments.map(d => <option key={d.id} value={d.name} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{d.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] shadow-sm">
          <Filter size={13} className="text-[var(--accent-blue)]" />
          <select
            value={designationFilter || 'ALL'}
            onChange={(e) => setDesignationFilter(e.target.value)}
            aria-label="Filter by designation"
            className="border-0 bg-transparent text-[9px] font-black uppercase tracking-widest outline-none text-[var(--text-primary)] cursor-pointer"
          >
            <option value="ALL" className="bg-[var(--bg-card)] text-[var(--text-primary)]">All Designations / सभी पदनाम</option>
            {masterDesignations.map(d => <option key={d.id} value={d.name} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{d.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
            {viewType === 'daily' && (
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[160px] h-10 rounded-xl bg-[var(--bg-card)] border-[var(--border-primary)] text-xs font-bold text-[var(--text-primary)] font-mono shadow-sm"
              />
            )}
            {viewType === 'monthly' && (
              <div className="flex gap-2">
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  aria-label="Select month"
                  className="w-[110px] h-10 px-3 bg-[var(--bg-card)] text-[var(--text-primary)] text-[9px] font-black uppercase tracking-widest border border-[var(--border-primary)] rounded-xl outline-none shadow-sm cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{new Date(2000, i).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', { month: 'short' })}</option>
                  ))}
                </select>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  aria-label="Select year"
                  className="w-[90px] h-10 px-3 bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-bold font-mono border border-[var(--border-primary)] rounded-xl outline-none shadow-sm cursor-pointer"
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{y}</option>)}
                </select>
              </div>
            )}
            {viewType === 'yearly' && (
               <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                aria-label="Select year"
                className="w-[110px] h-10 px-3 bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-bold font-mono border border-[var(--border-primary)] rounded-xl outline-none shadow-sm cursor-pointer"
              >
                 {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{y}</option>)}
              </select>
            )}
        </div>

        <div className="ml-auto flex items-center gap-5 px-5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] shadow-md backdrop-blur-xl">
            <div className="flex flex-col items-center">
              <span className="font-mono font-black text-[var(--accent-green)] text-sm leading-none">{totalStats['P'] || 0}</span>
              <span className="text-[7px] font-black uppercase tracking-widest text-[var(--text-secondary)] mt-1 opacity-80">Present</span>
            </div>
            <div className="w-px h-5 bg-[var(--border-primary)]" />
            <div className="flex flex-col items-center">
              <span className="font-mono font-black text-[var(--accent-red)] text-sm leading-none">{totalStats['A'] || 0}</span>
              <span className="text-[7px] font-black uppercase tracking-widest text-[var(--text-secondary)] mt-1 opacity-80">Absent</span>
            </div>
            <div className="w-px h-5 bg-[var(--border-primary)]" />
            <div className="flex flex-col items-center">
              <span className="font-mono font-black text-[var(--accent-blue)] text-sm leading-none">{totalStats['PL'] || 0}</span>
              <span className="text-[7px] font-black uppercase tracking-widest text-[var(--text-secondary)] mt-1 opacity-80">PL</span>
            </div>
            <div className="w-px h-5 bg-[var(--border-primary)]" />
            <div className="flex flex-col items-center">
              <span className="font-mono font-black text-[var(--accent-orange)] text-sm leading-none">{totalStats['CL'] || 0}</span>
              <span className="text-[7px] font-black uppercase tracking-widest text-[var(--text-secondary)] mt-1 opacity-80">CL</span>
            </div>
            <div className="w-px h-5 bg-[var(--border-primary)]" />
            <div className="flex flex-col items-center">
              <span className="font-mono font-black text-[var(--accent-purple)] text-sm leading-none">{totalStats['WO'] || 0}</span>
              <span className="text-[7px] font-black uppercase tracking-widest text-[var(--text-secondary)] mt-1 opacity-80">WO</span>
            </div>
        </div>
      </div>

              {/* Main Grid Workspace */}
      <div className="flex-grow p-6 md:p-8 overflow-hidden bg-transparent">
        <div className="p-0 h-full overflow-hidden flex flex-col bg-[var(--bg-card)] shadow-2xl border border-[var(--border-primary)] rounded-2xl backdrop-blur-2xl">
          {(() => {
            const rptTotal = filteredEmployees.length;
            const rptTotalPages = Math.max(1, Math.ceil(rptTotal / REPORT_PAGE_SIZE));
            const safeRptPage = rptShowAll ? 1 : Math.min(reportPage, rptTotalPages);
            const rptStart = rptShowAll ? 0 : (safeRptPage - 1) * REPORT_PAGE_SIZE;
            const pagedRpt = rptShowAll ? filteredEmployees : filteredEmployees.slice(rptStart, rptStart + REPORT_PAGE_SIZE);
            return (
          <>
          <div className="overflow-auto custom-scrollbar flex-grow">
            <table className="theme-table w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] select-none">
                  <th className="px-6 py-4 text-left">Personnel Identity</th>
                  <th className="px-6 py-4 text-center">Employment Context</th>
                  <th className="px-6 py-4 text-center text-[var(--accent-green)]">Present</th>
                  <th className="px-6 py-4 text-center text-[var(--accent-red)]">Absent</th>
                  <th className="px-6 py-4 text-center text-[var(--accent-blue)]">PL</th>
                  <th className="px-6 py-4 text-center text-[var(--accent-orange)]">CL</th>
                  <th className="px-6 py-4 text-center text-[var(--accent-purple)]">Week Off</th>
                  <th className="px-6 py-4 text-right">Operational Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)] text-xs text-[var(--text-primary)] font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4 animate-pulse">
                        <Zap size={36} className="text-[var(--accent-blue)] animate-bounce" />
                        <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.25em]">Running Analytical Matrix...</span>
                      </div>
                    </td>
                  </tr>
                  ) : pagedRpt.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-32 text-center opacity-40 select-none">
                      <div className="flex flex-col items-center">
                         <PieChart size={64} strokeWidth={1} className="mb-4 text-[var(--text-secondary)]" />
                         <p className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">No Intelligence Assets Found</p>
                      </div>
                    </td>
                  </tr>
                  ) : (
                    pagedRpt.map((emp, index) => {
                    const stats = getEmployeeStats(emp.id);
                    const clTotal = (stats['CL'] || 0) + (stats['HCL'] || 0) * 0.5;
                    const payable = (stats['P'] || 0) + (stats['CL'] || 0) + (stats['PL'] || 0) + (stats['WO'] || 0) + (stats['OD'] || 0) + (stats['HD'] || 0) * 0.5 + (stats['HCL'] || 0) * 0.5;
                    
                    return (
                      <tr 
                        key={emp.id} 
                        className="group hover:bg-[var(--bg-tertiary)] transition-premium cursor-default"
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-2xl bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-white font-black flex items-center justify-center shadow-md group-hover:scale-105 transition-premium select-none text-xs">
                               {emp.name.charAt(0)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-black text-[var(--text-primary)] text-sm uppercase tracking-tight group-hover:text-[var(--accent-blue)] transition-colors truncate">{emp.name}</span>
                              <span className="text-[var(--text-secondary)] font-mono text-[9px] font-bold mt-0.5 opacity-80">UUID-{emp.employee_code}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <div className="flex flex-col gap-0.5 font-bold">
                            <span className="font-black text-[var(--text-primary)] text-[11px] uppercase tracking-wide truncate">{emp.designation}</span>
                            <span className="text-[var(--text-secondary)] font-black text-[8px] uppercase tracking-widest opacity-80 truncate">{emp.department}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => openLeaveDatesModal(emp, 'P', stats['P'] || 0)}
                            disabled={(stats['P'] || 0) === 0}
                            className={cn(
                              "font-mono font-black text-sm transition-all rounded-lg px-2 py-1",
                              (stats['P'] || 0) > 0 
                                ? "text-[var(--accent-green)] hover:bg-emerald-500/10 cursor-pointer" 
                                : "text-[var(--text-secondary)] opacity-40 cursor-default"
                            )}
                          >
                            {stats['P'] || 0}
                          </button>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => openLeaveDatesModal(emp, 'A', stats['A'] || 0)}
                            disabled={(stats['A'] || 0) === 0}
                            className={cn(
                              "font-mono font-black text-sm transition-all rounded-lg px-2 py-1",
                              (stats['A'] || 0) > 0 
                                ? "text-[var(--accent-red)] hover:bg-red-500/10 cursor-pointer" 
                                : "text-[var(--text-secondary)] opacity-40 cursor-default"
                            )}
                          >
                            {stats['A'] || 0}
                          </button>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => openLeaveDatesModal(emp, 'PL', stats['PL'] || 0)}
                            disabled={(stats['PL'] || 0) === 0}
                            className={cn(
                              "font-mono font-black text-sm transition-all rounded-lg px-2 py-1",
                              (stats['PL'] || 0) > 0 
                                ? "text-[var(--accent-blue)] hover:bg-blue-500/10 cursor-pointer" 
                                : "text-[var(--text-secondary)] opacity-40 cursor-default"
                            )}
                          >
                            {stats['PL'] || 0}
                          </button>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => openLeaveDatesModal(emp, 'CL', clTotal)}
                            disabled={clTotal === 0}
                            className={cn(
                              "font-mono font-black text-sm transition-all rounded-lg px-2 py-1",
                              clTotal > 0 
                                ? "text-[var(--accent-orange)] hover:bg-orange-500/10 cursor-pointer" 
                                : "text-[var(--text-secondary)] opacity-40 cursor-default"
                            )}
                          >
                            {clTotal}
                          </button>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => openLeaveDatesModal(emp, 'WO', stats['WO'] || 0)}
                            disabled={(stats['WO'] || 0) === 0}
                            className={cn(
                              "font-mono font-black text-sm transition-all rounded-lg px-2 py-1",
                              (stats['WO'] || 0) > 0 
                                ? "text-[var(--accent-purple)] hover:bg-purple-500/10 cursor-pointer" 
                                : "text-[var(--text-secondary)] opacity-40 cursor-default"
                            )}
                          >
                            {stats['WO'] || 0}
                          </button>
                        </td>
                        <td className="px-6 py-3.5 text-right space-x-2">
                          <button
                            onClick={() => navigate(`/attendance-calendar?emp=${emp.id}`)}
                            title="View Calendar"
                            aria-label="View calendar"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-xl hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] cursor-pointer transition-premium text-[var(--text-secondary)]"
                          >
                            <CalendarDays size={14} />
                          </button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            aria-label="Generate report"
                            className="w-8 h-8 p-0 rounded-xl hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] cursor-pointer transition-premium text-[var(--text-secondary)]"
                          >
                            <FileText size={15} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Report Pagination */}
          {rptTotalPages > 1 && (
            <div className="px-6 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
              <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest font-mono">
                {rptShowAll ? `Showing all ${rptTotal}` : `Showing ${rptStart + 1}–${Math.min(rptStart + REPORT_PAGE_SIZE, rptTotal)} of ${rptTotal}`}
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setRptShowAll(false); setReportPage(p => Math.max(1, p - 1)); }} disabled={rptShowAll || safeRptPage === 1}
                  className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">
                  Prev
                </button>
                {!rptShowAll && Array.from({ length: rptTotalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === rptTotalPages || Math.abs(p - safeRptPage) <= 1)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    typeof p === 'string' ? (
                      <span key={`e${i}`} className="px-1 text-[var(--text-secondary)]">…</span>
                    ) : (
                      <button key={p} onClick={() => { setRptShowAll(false); setReportPage(p); }}
                        className={`w-8 h-8 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                          p === safeRptPage
                            ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)] shadow-md'
                            : 'border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                        }`}>
                        {p}
                      </button>
                    )
                  )}
                <button onClick={() => setRptShowAll(!rptShowAll)}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${
                    rptShowAll
                      ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)] shadow-md'
                      : 'border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }`}>
                  All
                </button>
                <button onClick={() => { setRptShowAll(false); setReportPage(p => Math.min(rptTotalPages, p + 1)); }} disabled={rptShowAll || safeRptPage === rptTotalPages}
                  className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">
                  Next
                </button>
              </div>
            </div>
          )}
          </>
            );
          })()}
        </div>
      </div>

      {/* Operational Metadata Footer */}
      <div className="px-8 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between select-none font-bold">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[9px] font-black uppercase tracking-widest opacity-75">
            <TrendingUp size={13} className="text-[var(--accent-green)]" />
            <span>Analysis Accurate</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[9px] font-black uppercase tracking-widest opacity-75">
            <ShieldCheck size={13} className="text-[var(--accent-blue)]" />
            <span>Report Verified</span>
          </div>
        </div>

        <div className="text-[var(--text-secondary)] font-mono text-[9px] font-black tracking-widest opacity-60">
          PRMX-REPORTING v2.0.1 • COMPLIANCE_LOCKED
        </div>
      </div>

      {leaveDatesModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center 
          bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] 
            rounded-2xl w-full max-w-md mx-4 shadow-2xl text-[var(--text-primary)] 
            overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border-primary)] 
              bg-[var(--bg-secondary)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[var(--text-primary)] 
                  tracking-tight">
                  {leaveDatesModal.leaveTypeHi} — {leaveDatesModal.leaveType}
                </h3>
                <p className="text-xs font-bold text-[var(--text-secondary)] 
                  mt-0.5 font-mono">
                  {leaveDatesModal.employeeName}
                </p>
              </div>
              <button
                onClick={() => setLeaveDatesModal(prev => 
                  ({ ...prev, isOpen: false }))}
                aria-label="Close modal"
                className="p-2 hover:bg-[var(--bg-tertiary)] rounded-xl 
                  text-[var(--text-secondary)] hover:text-red-500 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-6 px-5 py-3 
              bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
              <div className="text-center">
                <p className="text-xl font-black font-mono 
                  text-[var(--text-primary)]">
                  {leaveDatesModal.dates.length}
                </p>
                <p className="text-[9px] font-black uppercase tracking-wider 
                  text-[var(--text-secondary)]">Total Days</p>
              </div>
              <div className="w-px h-8 bg-[var(--border-primary)]" />
              <div className="text-center">
                <p className="text-xl font-black font-mono text-emerald-500">
                  {leaveDatesModal.payrollImpact.toFixed(1)}
                </p>
                <p className="text-[9px] font-black uppercase tracking-wider 
                  text-[var(--text-secondary)]">Payroll Days</p>
              </div>
            </div>

            {/* Dates List */}
            <div className="p-4 max-h-64 overflow-y-auto custom-scrollbar">
              {leaveDatesModal.dates.length === 0 ? (
                <p className="text-center text-[var(--text-secondary)] 
                  text-xs font-bold py-4">No dates found</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {leaveDatesModal.dates.map((date) => (
                    <div
                      key={date}
                      className="px-3 py-2 bg-[var(--bg-secondary)] 
                        border border-[var(--border-primary)] rounded-xl 
                        text-center font-mono font-black text-xs 
                        text-[var(--text-primary)]"
                    >
                      {new Date(date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-primary)] 
              flex justify-end">
              <button
                onClick={() => setLeaveDatesModal(prev => 
                  ({ ...prev, isOpen: false }))}
                className="px-5 py-2 bg-[var(--bg-secondary)] 
                  border border-[var(--border-primary)] rounded-xl 
                  text-xs font-black text-[var(--text-primary)] 
                  hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer"
              >
                बंद करें / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
