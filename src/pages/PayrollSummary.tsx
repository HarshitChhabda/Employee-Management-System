import { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Search,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  Users,
  FileSpreadsheet,
  ChevronDown,
  IndianRupee,
  Printer,
  Compass,
  Sparkles
} from 'lucide-react';
import { categories } from '../lib/hindiLabels';
import { cn } from "@/lib/utils";
import { useLanguage } from '../lib/LanguageContext';
import { useToast } from '../components/Toast';
import { useExport } from '../hooks/useExport';
import { employeeAPI, attendanceAPI, masterAPI } from '../services/api';
import type { Employee as EmployeeType, AttendanceRecord } from '../types/hrms';

interface Employee extends EmployeeType {}

interface PayrollRow {
  employee: Employee;
  P: number;
  A: number;
  CL: number;
  PL: number;
  HCL: number;
  HD: number;
  WO: number;
  OD: number;
  LWP: number;
  payable_days: number;
  unpaid_days: number;
  total_days: number;
  salary_deduction: number;
  net_payable: number;
  attendance_rate: number;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const monthNamesHi = [
  'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
];

export default function PayrollSummary() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [masterDepartments, setMasterDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [masterDesignations, setMasterDesignations] = useState<Array<{ id: string; name: string }>>([]);

  const { exportStyled } = useExport();

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

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
      const [empData, attData] = await Promise.all([
        employeeAPI.getAll({ is_active: true }),
        attendanceAPI.getByMonth(selectedMonth, selectedYear)
      ]);
      setEmployees(Array.isArray(empData) ? empData : []);
      setAttendance(Array.isArray(attData) ? attData : []);
    } catch (err) {
      console.error('Payroll fetch error:', err);
      showToast('Failed to load payroll data', 'error');
      setEmployees([]);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const calculatePayroll = (emp: Employee): PayrollRow => {
    const empAtt = attendance.filter(
      a => a.employee_id === emp.id
    );
    
    const counts: Record<string, number> = {
      P: 0, A: 0, CL: 0, PL: 0, HCL: 0, 
      HD: 0, WO: 0, OD: 0, LWP: 0
    };
    
    empAtt.forEach(a => {
      if (counts[a.status] !== undefined) counts[a.status]++;
    });

    // Payroll formulas
    const payable_days = counts.P + counts.CL + counts.PL 
      + counts.WO + counts.OD 
      + (counts.HCL * 0.5) + (counts.HD * 0.5);
    const unpaid_days = counts.A + counts.LWP;
    const total_days = empAtt.length;
    
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    
    const salaryStr = String(emp.basic_salary || '').toLowerCase();
    const isDailyWage = emp.category === 'daily_wage' || salaryStr.includes('प्रतिदिन') || salaryStr.includes('daily') || salaryStr.includes('day');
    const salaryNum = parseFloat(salaryStr.replace(/[^\d.]/g, '')) || 0;

    let net_payable = 0;
    let salary_deduction = 0;

    if (isDailyWage) {
      net_payable = payable_days * salaryNum;
      salary_deduction = unpaid_days * salaryNum;
    } else {
      const perDaySalary = salaryNum / daysInMonth;
      salary_deduction = unpaid_days * perDaySalary;
      net_payable = Math.max(0, salaryNum - salary_deduction);
    }

    // Dynamic Attendance Rate formula
    const attendance_rate = total_days > 0 
      ? (payable_days / total_days) * 100 
      : 0;

    return {
      employee: emp,
      ...counts,
      payable_days,
      unpaid_days,
      total_days,
      salary_deduction,
      net_payable,
      attendance_rate
    } as PayrollRow;
  };

  const payrollData = useMemo(() => {
    return employees
      .filter(emp => {
        const matchSearch = emp.name.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
          emp.employee_code.toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchCat = !categoryFilter || 
          categoryFilter === 'ALL' || 
          emp.category === categoryFilter;
        const matchDept = !departmentFilter || 
          departmentFilter === 'ALL' || 
          emp.department === departmentFilter;
        const matchDesig = !designationFilter || 
          designationFilter === 'ALL' || 
          emp.designation === designationFilter;
        return matchSearch && matchCat && matchDept && matchDesig;
      })
      .map(calculatePayroll);
  }, [employees, attendance, searchTerm, categoryFilter, departmentFilter, designationFilter]);

  const totals = useMemo(() => {
    return payrollData.reduce((acc, row) => ({
      P: acc.P + row.P,
      A: acc.A + row.A,
      CL: acc.CL + row.CL,
      PL: acc.PL + row.PL,
      payable_days: acc.payable_days + row.payable_days,
      unpaid_days: acc.unpaid_days + row.unpaid_days,
      salary_deduction: acc.salary_deduction + row.salary_deduction,
      net_payable: acc.net_payable + row.net_payable,
      attendance_rate: acc.attendance_rate + row.attendance_rate
    }), { 
      P: 0, A: 0, CL: 0, PL: 0, 
      payable_days: 0, unpaid_days: 0,
      salary_deduction: 0, net_payable: 0,
      attendance_rate: 0
    });
  }, [payrollData]);

  const averageAttendanceRate = useMemo(() => {
    if (payrollData.length === 0) return 0;
    return payrollData.reduce((sum, row) => sum + row.attendance_rate, 0) / payrollData.length;
  }, [payrollData]);

  const handleExport = () => {
    const headers = ['Employee Code', 'Name', 'Designation', 'Category', 'Present', 'Absent', 'CL', 'PL', 'HCL', 'HD', 'WO', 'OD', 'LWP', 'Payable Days', 'Unpaid Days', 'Net Payable'];
    const rows = payrollData.map(row => [
      row.employee?.employee_code || '',
      row.employee?.name || '',
      row.employee?.designation || '',
      row.employee?.category || '',
      String(row.P ?? 0),
      String(row.A ?? 0),
      String(row.CL ?? 0),
      String(row.PL ?? 0),
      String(row.HCL ?? 0),
      String(row.HD ?? 0),
      String(row.WO ?? 0),
      String(row.OD ?? 0),
      String(row.LWP ?? 0),
      (row.payable_days ?? 0).toFixed(1),
      String(row.unpaid_days ?? 0),
      `₹${(row.net_payable ?? 0).toFixed(2)}`,
    ]);

    exportStyled({
      filename: `payroll-${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
      sheetName: 'Payroll Summary',
      headers,
      rows,
      colWidths: [14, 22, 20, 14, 8, 8, 8, 8, 8, 8, 8, 8, 8, 14, 12, 14],
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-transparent font-sans relative z-10 text-[var(--text-primary)]">
      
      {/* Dynamic Print CSS Overrides */}
      <style>{`
        @media print {
          body, html, #root {
            background: white !important;
            color: black !important;
            height: auto !important;
            overflow: visible !important;
          }
          .no-print, 
          header, 
          nav, 
          aside, 
          .sidebar, 
          button, 
          select, 
          input, 
          .filters-row,
          .stats-row,
          .non-printable-element {
            display: none !important;
          }
          .print-container {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }
          .printable-sheet {
            border: 2px solid #111827 !important;
            border-radius: 12px !important;
            overflow: hidden !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          th, td {
            border: 1px solid #d1d5db !important;
            padding: 8px 12px !important;
            font-size: 10px !important;
            color: black !important;
            background: transparent !important;
          }
          th {
            background-color: #f3f4f6 !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
          }
          .totals-row-print {
            background-color: #e5e7eb !important;
            font-weight: bold !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Modern Header */}
      <div className="px-8 py-6 backdrop-blur-2xl bg-[var(--bg-card)] border-b border-[var(--border-primary)] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-20 no-print">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-black tracking-tight uppercase m-0 bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <span>{t('payroll.title') || 'Payroll statement'}</span>
          </h1>
          <div className="flex items-center gap-3.5 text-[var(--text-secondary)] text-[9px] font-black uppercase tracking-[0.2em] opacity-80">
            <div className="flex items-center gap-1.5">
              <Compass size={12} className="text-emerald-500" />
              <span>Compliant Compensation</span>
            </div>
            <span className="opacity-30">|</span>
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-cyan-500" />
              <span>Audit Ready Ledger</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white rounded-xl shadow-lg shadow-blue-500/20 font-black cursor-pointer text-xs uppercase tracking-wider transition-all"
          >
            <Printer size={15} />
            <span>Print Ledger / प्रिंट</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white rounded-xl shadow-lg shadow-emerald-500/20 font-black cursor-pointer text-xs uppercase tracking-wider transition-all"
          >
            <FileSpreadsheet size={15} />
            <span>Export CSV / निर्यात</span>
          </button>
        </div>
      </div>

      {/* Main Workspace content */}
      <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6 flex-grow print-container">
        
        {/* Printable corporate header (visible ONLY during window.print()) */}
        <div className="hidden print:block mb-8 text-center border-b-2 border-slate-800 pb-5">
          <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900">Employee Management System</h1>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mt-1">
            Monthly Payroll Ledger Summary Statement — {monthNames[selectedMonth - 1]} {selectedYear}
          </h2>
          <div className="flex items-center justify-center gap-8 text-[10px] font-mono mt-3 text-slate-600">
            <span>Generated Date: {new Date().toLocaleDateString()}</span>
            <span>Total Personnel Count: {payrollData.length}</span>
            <span>Avg Attendance Rate: {averageAttendanceRate.toFixed(1)}%</span>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-4 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg font-bold no-print">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl px-3 py-2 text-xs font-black text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              {monthNames.map((m, i) => (
                <option key={i+1} value={i+1}>
                  {m} / {monthNamesHi[i]}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl px-3 py-2 text-xs font-black font-mono text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const yr = new Date().getFullYear() - 2 + i;
                return <option key={yr} value={yr}>{yr}</option>;
              })}
            </select>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="खोजें... (Search name, code...)"
              className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
            <select
              value={categoryFilter || 'ALL'}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl px-3 py-2 text-xs font-black text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="ALL">सभी श्रेणी / All</option>
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.labelHi}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
            <select
              value={departmentFilter || 'ALL'}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl px-3 py-2 text-xs font-black text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="ALL">सभी विभाग / All Depts</option>
              {masterDepartments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Designation Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
            <select
              value={designationFilter || 'ALL'}
              onChange={e => setDesignationFilter(e.target.value)}
              className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl px-3 py-2 text-xs font-black text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="ALL">सभी पदनाम / All Desig</option>
              {masterDesignations.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* High-Fidelity Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stats-row no-print">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-4 shadow-lg flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black font-mono leading-none">{payrollData.length}</p>
              <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase mt-1 tracking-wider">Employees (कर्मचारी)</p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-4 shadow-lg flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black font-mono text-emerald-500 leading-none">{averageAttendanceRate.toFixed(1)}%</p>
              <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase mt-1 tracking-wider">Avg Attendance Rate</p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-4 shadow-lg flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black font-mono text-red-500 leading-none">{totals.unpaid_days}</p>
              <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase mt-1 tracking-wider">Unpaid Days (अवैतनिक)</p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-4 shadow-lg flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black font-mono text-purple-500 leading-none">
                ₹{totals.net_payable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase mt-1 tracking-wider">Net Amount (कुल देय)</p>
            </div>
          </div>
        </div>

        {/* High Density Ledger sheet */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl overflow-hidden shadow-xl printable-sheet">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] select-none">
                <tr>
                  <th className="px-4 py-4">Employee Ledger Details</th>
                  <th className="px-3 py-4 text-center text-emerald-500">P</th>
                  <th className="px-3 py-4 text-center text-red-500">A</th>
                  <th className="px-3 py-4 text-center text-yellow-500">CL</th>
                  <th className="px-3 py-4 text-center text-blue-500">PL</th>
                  <th className="px-3 py-4 text-center text-orange-500">HCL</th>
                  <th className="px-3 py-4 text-center text-slate-500">WO</th>
                  <th className="px-3 py-4 text-center text-gray-500">LWP</th>
                  <th className="px-3 py-4 text-center font-mono">Pay Days</th>
                  <th className="px-3 py-4 text-center font-mono">Unpaid</th>
                  <th className="px-4 py-4 text-center">Attendance Rate</th>
                  <th className="px-4 py-4 text-right text-purple-500">Net Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)] text-xs text-[var(--text-primary)]">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-24 text-center">
                      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-[var(--text-secondary)] font-bold">Compiling ledger balances...</p>
                    </td>
                  </tr>
                ) : payrollData.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-24 text-center text-[var(--text-secondary)] font-black uppercase tracking-wider">No ledger data matches filters</td>
                  </tr>
                ) : (
                  <>
                    {payrollData.map(row => (
                      <tr
                        key={row.employee.id}
                        onClick={() => setExpandedRow(expandedRow === row.employee.id ? null : row.employee.id)}
                        className="hover:bg-[var(--bg-secondary)]/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-black text-[13px] uppercase text-[var(--text-primary)]">{row.employee.name}</p>
                            <p className="text-[10px] font-bold font-mono text-[var(--text-secondary)] mt-0.5">
                              {row.employee.employee_code} • {row.employee.department} • {row.employee.designation}
                            </p>
                            
                            {/* Expanded compliance metadata */}
                            {expandedRow === row.employee.id && (
                              <div className="mt-2.5 p-3.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl grid grid-cols-3 gap-3 text-[10px] font-black uppercase tracking-wider animate-fade-in no-print">
                                <div className="flex flex-col">
                                  <span className="text-[var(--text-secondary)]">Basic Salary (₹):</span>
                                  <span className="font-mono text-[var(--text-primary)] font-black mt-0.5">
                                    ₹{Number(row.employee.basic_salary || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-red-500">Salary Deduction (₹):</span>
                                  <span className="font-mono text-red-500 font-black mt-0.5">
                                    ₹{row.salary_deduction.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-emerald-500">Calculated Net (₹):</span>
                                  <span className="font-mono text-emerald-500 font-black mt-0.5">
                                    ₹{row.net_payable.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-black text-emerald-500 text-[13px]">{row.P || '—'}</td>
                        <td className="px-3 py-3 text-center font-mono font-black text-red-500 text-[13px]">{row.A || '—'}</td>
                        <td className="px-3 py-3 text-center font-mono font-black text-yellow-500 text-[13px]">{row.CL || '—'}</td>
                        <td className="px-3 py-3 text-center font-mono font-black text-blue-500 text-[13px]">{row.PL || '—'}</td>
                        <td className="px-3 py-3 text-center font-mono font-black text-orange-500 text-[13px]">{row.HCL || '—'}</td>
                        <td className="px-3 py-3 text-center font-mono font-black text-slate-500 text-[13px]">{row.WO || '—'}</td>
                        <td className="px-3 py-3 text-center font-mono font-black text-gray-500 text-[13px]">{row.LWP || '—'}</td>
                        <td className="px-3 py-3 text-center font-mono font-black text-[var(--text-primary)] text-[13px]">
                          {row.payable_days.toFixed(1)}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-black text-[13px]">
                          <span className={cn(row.unpaid_days > 0 ? "text-red-500" : "text-[var(--text-secondary)] opacity-40")}>
                            {row.unpaid_days || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "px-2.5 py-1 text-[10px] rounded-lg font-black font-mono border",
                            row.attendance_rate >= 90 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : row.attendance_rate >= 75 
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                          )}>
                            {row.attendance_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-purple-500 text-[13px]">
                          ₹{row.net_payable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Grand totals row */}
                    <tr className="bg-[var(--bg-secondary)] border-t-2 border-[var(--border-primary)] font-black totals-row-print">
                      <td className="px-4 py-4 text-sm uppercase tracking-wide text-[var(--text-primary)]">
                        Grand Total / कुल ({payrollData.length})
                      </td>
                      <td className="px-3 py-4 text-center font-mono text-emerald-500 text-[13px]">{totals.P}</td>
                      <td className="px-3 py-4 text-center font-mono text-red-500 text-[13px]">{totals.A}</td>
                      <td className="px-3 py-4 text-center font-mono text-yellow-500 text-[13px]">{totals.CL}</td>
                      <td className="px-3 py-4 text-center font-mono text-blue-500 text-[13px]">{totals.PL}</td>
                      <td colSpan={3} />
                      <td className="px-3 py-4 text-center font-mono text-[var(--text-primary)] text-[13px]">
                        {totals.payable_days.toFixed(0)}
                      </td>
                      <td className="px-3 py-4 text-center font-mono text-red-500 text-[13px]">{totals.unpaid_days}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-2.5 py-1 text-[10px] rounded-lg font-black font-mono bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          {averageAttendanceRate.toFixed(1)}% Avg
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-purple-500 text-[13px]">
                        ₹{totals.net_payable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
