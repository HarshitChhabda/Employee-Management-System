import { useState, useEffect } from 'react';
import { CalendarDays, List, Search, Grid3X3, Users } from 'lucide-react';
import AttendanceCalendar from '../components/AttendanceCalendar';
import DayEditModal from '../components/DayEditModal';
import EmployeeFilterBar from '../components/EmployeeFilterBar';
import { hindiLabels } from '../lib/hindiLabels';
import { getCategoryColor, getCategoryLabel } from '../lib/categoryUtils';

export default function AttendanceCalendarView() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = !categoryFilter || emp.category === categoryFilter;
      const matchDepartment = !departmentFilter || emp.department === departmentFilter;
      const matchDesignation = !designationFilter || emp.designation === designationFilter;
      return matchSearch && matchCategory && matchDepartment && matchDesignation;
    });
    setFilteredEmployees(filtered);
  }, [searchQuery, categoryFilter, departmentFilter, designationFilter, employees]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setEmployees(list);
      setFilteredEmployees(list);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = (employee: any, date: string, status: string) => {
    setSelectedEmployee(employee);
    setSelectedDate(date);
    setCurrentStatus(status);
    setEditModalOpen(true);
  };

  const handleSaveDayAttendance = async (data: { employee_id: number; date: string; status: string; remarks: string }) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([data])
      });

      if (res.ok) {
        // Refresh data - the calendar component will refetch
        setEditModalOpen(false);
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  };


  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-lg">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-blue-500 flex-shrink-0" />
            <span>{hindiLabels.attendance} Calendar</span>
          </h1>
          <p className="text-xs font-bold text-[var(--text-secondary)] mt-1 uppercase tracking-widest font-mono">Monthly Attendance View / मासिक उपस्थिति दृश्य</p>
        </div>
        
        <div className="flex items-center gap-3 font-bold">
          {/* View Toggle */}
          <div className="flex bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer text-xs font-black uppercase tracking-wide ${
                viewMode === 'calendar' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer text-xs font-black uppercase tracking-wide ${
                viewMode === 'list' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <EmployeeFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        departmentFilter={departmentFilter}
        onDepartmentChange={setDepartmentFilter}
        designationFilter={designationFilter}
        onDesignationChange={setDesignationFilter}
      />

      {/* Month/Year Selector */}
      <div className="flex items-center gap-3 font-bold">
        <select
          value={currentMonth}
          onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
          className="px-4 py-3.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-blue-500 focus:outline-none shadow-sm text-sm cursor-pointer font-bold font-mono"
        >
          {[
            'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
            'जुलाई', 'अगस्त', 'सितम्बर', 'अक्तूबर', 'नवंबर', 'दिसंबर'
          ].map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={currentYear}
          onChange={(e) => setCurrentYear(parseInt(e.target.value))}
          className="px-4 py-3.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-blue-500 focus:outline-none shadow-sm text-sm cursor-pointer font-bold font-mono"
        >
          {[2023, 2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Stats Summary */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-5"
      >
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20 flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-[var(--text-primary)] font-mono">{filteredEmployees.length}</p>
              <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5 tracking-wide uppercase">कुल कर्मचारी</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20 flex-shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-[var(--text-primary)] font-mono">{new Date(currentYear, currentMonth, 0).getDate()}</p>
              <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5 tracking-wide uppercase">दिन (Days)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-bold">
          {filteredEmployees.map((employee) => (
            <AttendanceCalendar
              key={employee.id}
              employeeId={employee.id}
              employeeName={employee.name}
              month={currentMonth}
              year={currentYear}
              onMonthChange={(m, y) => {
                setCurrentMonth(m);
                setCurrentYear(y);
              }}
              onDayClick={(date, status) => handleDayClick(employee, date, status)}
            />
          ))}
        </div>
      ) : (
        // List View
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">{hindiLabels.name}</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">{hindiLabels.employeeCode}</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">{hindiLabels.category}</th>
                  <th className="px-6 py-4 text-center text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)] text-sm font-semibold">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-[var(--text-primary)] font-black">{emp.name}</p>
                        <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">{emp.department}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-primary)] font-black font-mono">{emp.employee_code}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs rounded-lg font-black tracking-wide font-mono ${getCategoryColor(emp.category)}`}>
                        {getCategoryLabel(emp.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedEmployee(emp)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer uppercase tracking-wider"
                      >
                        View Calendar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Day Edit Modal */}
      <DayEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        date={selectedDate}
        employeeId={selectedEmployee?.id || 0}
        employeeName={selectedEmployee?.name || ''}
        currentStatus={currentStatus}
        onSave={handleSaveDayAttendance}
      />
    </div>
  );
}