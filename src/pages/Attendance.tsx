import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  UserSearch,
  Hash,
  Check,
  X
} from 'lucide-react';
import { hindiLabels, attendanceStatuses } from '../lib/hindiLabels';
import { Link } from 'react-router-dom';
import LeaveBalanceWidget from '../components/LeaveBalanceWidget';
import EmployeeFilterBar from '../components/EmployeeFilterBar';

interface AttendanceRecord {
  id?: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  category?: string;
  date: string;
  status: string;
  remarks: string;
}

export default function Attendance() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<number, AttendanceRecord>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [employeeIdSearch, setEmployeeIdSearch] = useState('');
  const [foundEmployee, setFoundEmployee] = useState<any>(null);
  const [showBalanceFor, setShowBalanceFor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [quickEntryMode, setQuickEntryMode] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${selectedDate}`);
      const data = await res.json();

      const attendanceMap: Record<number, AttendanceRecord> = {};
      const records = Array.isArray(data) ? data : [];
      records.forEach((record: AttendanceRecord) => {
        attendanceMap[record.employee_id] = record;
      });
      setAttendance(attendanceMap);
    } catch (err) {
      console.error('Attendance fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (employeeId: number, status: string) => {
    setAttendance(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        employee_id: employeeId,
        date: selectedDate,
        status,
        remarks: prev[employeeId]?.remarks || ''
      }
    }));
  };

  const handleRemarksChange = (employeeId: number, remarks: string) => {
    setAttendance(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        employee_id: employeeId,
        date: selectedDate,
        status: prev[employeeId]?.status || '',
        remarks
      }
    }));
  };

  // Search employee by ID
  const searchByEmployeeId = () => {
    const emp = employees.find(e =>
      e.employee_code.toLowerCase() === employeeIdSearch.toLowerCase() ||
      e.id.toString() === employeeIdSearch
    );
    setFoundEmployee(emp || null);
    if (!emp) {
      setMessage({ type: 'error', text: 'Employee not found / कर्मचारी नहीं मिला' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Quick save for ID search
  const quickSaveAttendance = async () => {
    if (!foundEmployee || !attendance[foundEmployee.id]?.status) return;

    setSaving(true);
    try {
      const record = attendance[foundEmployee.id];
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([record])
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Attendance saved! / उपस्थिति सहेजी!' });
        setEmployeeIdSearch('');
        setFoundEmployee(null);
        fetchAttendance();
      } else {
        setMessage({ type: 'error', text: 'Failed to save' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error saving attendance' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const records = Object.values(attendance).filter(r => r.status);

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Attendance saved successfully! / उपस्थिति सहेजी!' });
        fetchAttendance();
      } else {
        setMessage({ type: 'error', text: 'Failed to save attendance' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error saving attendance' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = !categoryFilter || emp.category === categoryFilter;
    const matchDepartment = !departmentFilter || emp.department === departmentFilter;
    const matchDesignation = !designationFilter || emp.designation === designationFilter;
    return matchSearch && matchCategory && matchDepartment && matchDesignation;
  });

  const getStatusStats = () => {
    const stats: Record<string, number> = {};
    attendanceStatuses.forEach(s => stats[s.value] = 0);
    Object.values(attendance).forEach(record => {
      if (record.status) stats[record.status] = (stats[record.status] || 0) + 1;
    });
    return stats;
  };

  const stats = getStatusStats();

  const getStatusColor = (status: string) => {
    const statusObj = attendanceStatuses.find(s => s.value === status);
    return statusObj ? statusObj.color : 'bg-[var(--bg-tertiary)]';
  };

  const getStatusLabel = (status: string) => {
    const statusObj = attendanceStatuses.find(s => s.value === status);
    return statusObj ? `${statusObj.labelHi} (${statusObj.label})` : status;
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-lg">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{hindiLabels.attendance}</h1>
          <p className="text-xs font-bold text-[var(--text-secondary)] mt-1 uppercase tracking-widest font-mono">Daily Attendance Register / दैनिक उपस्थिति रेजिस्टर</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap font-bold text-sm">
          {message && (
            <div
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl animate-fade-in shadow-md font-black ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'
                }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}
          <button
            onClick={() => setQuickEntryMode(!quickEntryMode)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-black cursor-pointer shadow-md ${quickEntryMode ? 'bg-orange-600 hover:opacity-90 text-white shadow-orange-500/20' : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)]'
              }`}
          >
            <UserSearch className="w-5 h-5" />
            <span>ID Search</span>
          </button>
          <Link
            to="/attendance-calendar"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white rounded-xl transition-all shadow-lg shadow-purple-500/20 font-black"
          >
            <CalendarDays className="w-5 h-5" />
            <span>Calendar View</span>
          </Link>
          <button
            onClick={saveAttendance}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 font-black cursor-pointer"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : hindiLabels.save}</span>
          </button>
        </div>
      </div>

      {/* Quick Entry Mode - Search by Employee ID */}
      {quickEntryMode && (
        <div
          className="bg-[var(--bg-card)] border-2 border-orange-500/30 rounded-2xl p-6 shadow-xl animate-fade-in font-bold relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <h3 className="text-lg font-black text-[var(--text-primary)] mb-4 flex items-center gap-2.5">
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 border border-orange-500/20">
              <Hash className="w-5 h-5" />
            </div>
            <span>Quick Entry by Employee ID / कर्मचारी ID से त्वरित Entry</span>
          </h3>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative font-mono">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={employeeIdSearch}
                onChange={(e) => setEmployeeIdSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchByEmployeeId()}
                placeholder="Employee Code / ID दर्ज करें (e.g., EMP001)"
                className="w-full pl-12 pr-4 py-3.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-orange-500 focus:outline-none shadow-inner font-bold text-sm"
              />
            </div>
            <button
              onClick={searchByEmployeeId}
              className="px-7 py-3.5 bg-gradient-to-r from-orange-600 to-red-600 hover:opacity-90 text-white rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20 font-black cursor-pointer text-sm"
            >
              <Search className="w-5 h-5 stroke-[3]" />
              <span>Search / खोजें</span>
            </button>
          </div>

          {/* Found Employee */}
          {foundEmployee && (
            <div
              className="mt-5 bg-[var(--bg-secondary)] rounded-2xl p-5 border border-[var(--border-primary)] shadow-md animate-fade-in"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] font-black text-xl truncate">{foundEmployee.name}</p>
                  <p className="text-[var(--text-secondary)] font-semibold text-xs mt-1 font-mono tracking-wide truncate">{foundEmployee.employee_code} • {foundEmployee.department} • {foundEmployee.designation}</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap font-bold">
                  {/* Status Dropdown */}
                  <select
                    value={attendance[foundEmployee.id]?.status || ''}
                    onChange={(e) => handleStatusChange(foundEmployee.id, e.target.value)}
                    className="px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-blue-500 focus:outline-none min-w-[180px] shadow-sm cursor-pointer font-bold font-mono text-xs"
                  >
                    <option value="">-- Status चुनें --</option>
                    {attendanceStatuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.labelHi} ({status.label})
                      </option>
                    ))}
                  </select>

                  {/* Remarks */}
                  <input
                    type="text"
                    value={attendance[foundEmployee.id]?.remarks || ''}
                    onChange={(e) => handleRemarksChange(foundEmployee.id, e.target.value)}
                    placeholder="Remarks"
                    className="px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-blue-500 focus:outline-none shadow-sm text-xs"
                  />

                  {/* Save Button */}
                  <button
                    onClick={quickSaveAttendance}
                    disabled={!attendance[foundEmployee.id]?.status || saving}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md font-black flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Save</span>
                  </button>

                  {/* Clear Button */}
                  <button
                    onClick={() => {
                      setFoundEmployee(null);
                      setEmployeeIdSearch('');
                    }}
                    className="p-3 bg-[var(--bg-card)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-red-500 rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Date Selector & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 font-bold">
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
              className="p-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl transition-all cursor-pointer shadow-sm text-[var(--text-primary)]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center flex-1 mx-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl px-5 py-2.5 text-[var(--text-primary)] font-black text-center focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer font-mono"
              />
              <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1.5 uppercase tracking-wider">
                {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
              className="p-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl transition-all cursor-pointer shadow-sm text-[var(--text-primary)]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg">
          <h3 className="text-xs font-black text-[var(--text-secondary)] mb-3 uppercase tracking-wider font-mono">Today's Summary / आज का सारांश</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {attendanceStatuses.map(status => (
              <div key={status.value} className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-3 text-center shadow-sm">
                <p className="text-xl font-black text-[var(--text-primary)] font-mono">{stats[status.value] || 0}</p>
                <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-tight mt-0.5">{status.labelHi}</p>
              </div>
            ))}
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

      {/* Attendance Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">{hindiLabels.name}</th>
                <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">{hindiLabels.employeeCode}</th>
                <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">{hindiLabels.category}</th>
                <th className="px-6 py-4 text-center text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">Status</th>
                <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)] text-sm font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center font-bold">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <span className="text-[var(--text-secondary)] text-sm">Loading Attendance Records...</span>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-secondary)] font-bold">{hindiLabels.noData}</td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-[var(--text-primary)] font-black">{emp.name}</p>
                        <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">{emp.department}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-primary)] font-black font-mono">{emp.employee_code}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs rounded-lg font-black bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-mono tracking-wide">{emp.category}</span>
                    </td>
                    <td className="px-6 py-4 text-center relative">
                      <select
                        value={attendance[emp.id]?.status || ''}
                        onChange={(e) => {
                          handleStatusChange(emp.id, e.target.value);
                          if (['CL', 'PL', 'HCL'].includes(e.target.value)) {
                            setShowBalanceFor(emp.id);
                            setTimeout(() => setShowBalanceFor(null), 4000);
                          }
                        }}
                        className="px-3.5 py-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold font-mono focus:border-blue-500 focus:outline-none min-w-[160px] shadow-sm cursor-pointer"
                      >
                        <option value="">-- चुनें --</option>
                        {attendanceStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.labelHi} ({status.label})
                          </option>
                        ))}
                      </select>
                      {showBalanceFor === emp.id && (
                        <div className="mt-2 absolute z-50 shadow-2xl">
                          <LeaveBalanceWidget
                            employeeId={String(emp.id)}
                            year={new Date(selectedDate).getFullYear()}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={attendance[emp.id]?.remarks || ''}
                        onChange={(e) => handleRemarksChange(emp.id, e.target.value)}
                        placeholder="Remarks..."
                        className="w-full px-3.5 py-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl text-xs font-bold text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-blue-500 focus:outline-none shadow-sm"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
