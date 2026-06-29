import { useEffect, useState } from 'react';
import { 
  UserX, 
  Search, 
  Calendar, 
  Briefcase,
  RotateCcw,
  AlertCircle,
  Edit2,
  X,
  Compass,
  FileText,
  Clock,
  Sparkles,
  Bookmark,
  CalendarDays
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { hindiLabels } from '../lib/hindiLabels';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { getCategoryLabel, getCategoryColor } from '../lib/categoryUtils';
import { cn } from "@/lib/utils";
import { resignedAPI } from '../services/api';
import EmployeeFilterBar from '../components/EmployeeFilterBar';

interface ResignedEmployee {
  id: string;
  name: string;
  employee_code: string;
  department: string;
  designation: string;
  category: string;
  joining_date: string;
  resign_date: string;
  reason: string;
  remarks?: string;
  tenure_end_date?: string;
}

export default function Resigned() {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [resignedEmployees, setResignedEmployees] = useState<ResignedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [editingResigned, setEditingResigned] = useState<ResignedEmployee | null>(null);
  const [editData, setEditData] = useState({
    tenure_end_date: '',
    reason: '',
    remarks: ''
  });
  const [rehireConfirm, setRehireConfirm] = useState<{open: boolean; id: string; name: string}>({open: false, id: '', name: ''});
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    fetchResignedEmployees();
  }, [searchQuery]);

  const fetchResignedEmployees = async () => {
    setLoading(true);
    try {
      const data = await resignedAPI.getAll({
        search: searchQuery || undefined,
        include_tenure_expired: true
      });
      setResignedEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Failed to load resigned employees', 'error');
      setResignedEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredResignedEmployees = resignedEmployees.filter(emp => {
    const matchCategory = !categoryFilter || emp.category === categoryFilter;
    const matchDepartment = !departmentFilter || emp.department === departmentFilter;
    const matchDesignation = !designationFilter || emp.designation === designationFilter;
    return matchCategory && matchDepartment && matchDesignation;
  });

  const handleRehire = async (id: string, name: string) => {
    setRehireConfirm({open: true, id, name});
  };

  const confirmRehire = async () => {
    try {
      await resignedAPI.delete(rehireConfirm.id);
      setRehireConfirm({open: false, id: '', name: ''});
      showToast('Employee successfully rehired! / कर्मचारी को सफलतापूर्वक पुनः नियुक्त किया गया!', 'success');
      fetchResignedEmployees();
      window.dispatchEvent(new CustomEvent('employeeStateChanged'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rehire employee';
      showToast(message, 'error');
    }
  };

  const openEditModal = (emp: ResignedEmployee) => {
    setEditingResigned(emp);
    setEditData({
      tenure_end_date: emp.tenure_end_date || emp.resign_date || '',
      reason: emp.reason || '',
      remarks: emp.remarks || ''
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResigned) return;
    try {
      await resignedAPI.update(editingResigned.id, {
        tenure_end_date: editData.tenure_end_date,
        reason: editData.reason,
        remarks: editData.remarks
      });
      showToast('Updated successfully / सफलतापूर्वक अपडेट किया गया', 'success');
      setEditingResigned(null);
      fetchResignedEmployees();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      showToast(message, 'error');
    }
  };

  // Dynamic Tenure calculation formula
  const calculateTenure = (joining: string, resignation: string) => {
    if (!joining || !resignation) return 'N/A';
    const jDate = new Date(joining);
    const rDate = new Date(resignation);
    if (isNaN(jDate.getTime()) || isNaN(rDate.getTime())) return 'N/A';
    
    let years = rDate.getFullYear() - jDate.getFullYear();
    let months = rDate.getMonth() - jDate.getMonth();
    let days = rDate.getDate() - jDate.getDate();
    
    if (days < 0) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    
    const parts = [];
    if (years > 0) parts.push(`${years} Yr${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} Mo${months > 1 ? 's' : ''}`);
    if (parts.length === 0) parts.push('Less than a month');
    
    return parts.join(', ');
  };

  return (
    <div className="flex flex-col h-full bg-transparent font-sans relative z-10 text-[var(--text-primary)]">
      
      {/* Premium Header */}
      <div className="px-8 py-6 backdrop-blur-2xl bg-[var(--bg-card)] border-b border-[var(--border-primary)] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-black tracking-tight uppercase m-0 bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-amber-500">
            {t('resigned.title') || 'Resigned personnel'}
          </h1>
          <div className="flex items-center gap-3.5 text-[var(--text-secondary)] text-[9px] font-black uppercase tracking-[0.2em] opacity-80">
            <div className="flex items-center gap-1.5">
              <Compass size={12} className="text-red-500" />
              <span>Service Exit Directory</span>
            </div>
            <span className="opacity-30">|</span>
            <div className="flex items-center gap-1.5">
              <UserX size={12} className="text-orange-500" />
              <span>Resigned Audit Logs</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6 flex-grow">
        
        {message && (
          <div className="p-4 rounded-xl text-xs font-black uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20 flex items-center justify-between animate-fade-in shadow-md">
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="hover:opacity-75 cursor-pointer"><X size={16} /></button>
          </div>
        )}

        {/* High-Fidelity Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                <UserX className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-black font-mono leading-none">{resignedEmployees.length}</p>
                <p className="text-[10px] font-black text-[var(--text-secondary)] mt-1.5 uppercase tracking-wider">कुल इस्तीफा (Total Resigned)</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
                <Calendar className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-black font-mono leading-none">
                  {resignedEmployees.filter(e => {
                    if (!e.resign_date) return false;
                    const resDate = new Date(e.resign_date);
                    const now = new Date();
                    return resDate.getMonth() === now.getMonth() && resDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
                <p className="text-[10px] font-black text-[var(--text-secondary)] mt-1.5 uppercase tracking-wider">इस महीने (Exit This Month)</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                <Sparkles className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-black font-mono leading-none">
                  {resignedEmployees.filter(e => e.category === 'probation').length}
                </p>
                <p className="text-[10px] font-black text-[var(--text-secondary)] mt-1.5 uppercase tracking-wider">परिवीक्षा काल (Exit Probation)</p>
              </div>
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
          searchPlaceholder="नाम, कोड या विभाग द्वारा खोजें... (Search name, code, department...)"
        />

        {/* High Density Cards Grid */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <span className="text-xs font-black uppercase text-[var(--text-secondary)] tracking-widest">Compiling Exit Records...</span>
          </div>
        ) : resignedEmployees.length === 0 ? (
          <div className="py-24 text-center text-xs font-black uppercase text-[var(--text-secondary)] tracking-widest border border-dashed border-[var(--border-primary)] rounded-2xl">
            {hindiLabels.noData || 'No exit records match search criteria'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResignedEmployees.map((emp) => {
              const isTenureExpiring = emp.reason === '' && emp.resign_date === 'Tenure Expiring Soon';
              const tenure = calculateTenure(emp.joining_date, emp.resign_date);
              return (
                <div 
                  key={emp.id} 
                  className={`bg-[var(--bg-card)] border rounded-2xl p-5 shadow-md flex flex-col justify-between transition-premium relative overflow-hidden group ${
                    isTenureExpiring 
                      ? 'border-amber-500/30 hover:border-amber-500/50 hover:shadow-amber-500/10' 
                      : 'border-[var(--border-primary)] hover:border-red-500/30 hover:shadow-lg'
                  }`}
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-xl group-hover:scale-125 transition-transform ${
                    isTenureExpiring ? 'bg-amber-500/10' : 'bg-red-500/2'
                  }`} />
                  
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-500 to-orange-500 text-white flex items-center justify-center font-black text-sm shadow-sm select-none">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-sm uppercase text-[var(--text-primary)] leading-tight">{emp.name}</span>
                          <span className="text-[10px] font-mono font-bold text-[var(--text-secondary)] mt-0.5">{emp.employee_code}</span>
                        </div>
                      </div>
                      
                      <span className={cn(
                        "px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md border",
                        isTenureExpiring 
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : getCategoryColor(emp.category)
                      )}>
                        {isTenureExpiring ? 'Tenure Expiring' : getCategoryLabel(emp.category)}
                      </span>
                    </div>

                    {/* Exit Tenure Badge Row */}
                    <div className="mt-4 flex items-center gap-2.5 px-3.5 py-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]">
                      <Clock size={13} className="text-red-500 flex-shrink-0" />
                      <div className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                        <span>Active Service Tenure:</span>
                        <span className="font-mono text-[var(--text-primary)] font-black">{tenure}</span>
                      </div>
                    </div>

                    {/* Body Details */}
                    <div className="mt-4 space-y-2.5 font-bold text-xs">
                      <div className="flex justify-between border-b border-[var(--border-primary)]/50 pb-2">
                        <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Briefcase size={12} className="text-purple-400" />
                          <span>Dept / Design:</span>
                        </span>
                        <span className="text-[var(--text-primary)] truncate max-w-[160px] text-right font-black uppercase text-[10px] tracking-wide">
                          {emp.department} • {emp.designation}
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-[var(--border-primary)]/50 pb-2 font-mono">
                        <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                          <CalendarDays size={12} className="text-blue-400" />
                          <span>Joined (प्रवेश):</span>
                        </span>
                        <span className="text-[var(--text-primary)]">{emp.joining_date}</span>
                      </div>

                      <div className="flex justify-between border-b border-[var(--border-primary)]/50 pb-2 font-mono">
                        <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                          <CalendarDays size={12} className="text-rose-400" />
                          <span>{isTenureExpiring ? 'Tenure End (समाप्ति):' : 'Exit Date (इस्तीफा):'}</span>
                        </span>
                        <span className={isTenureExpiring ? 'text-amber-500 font-bold' : 'text-rose-500 font-bold'}>{emp.tenure_end_date || emp.resign_date}</span>
                      </div>
                    </div>

                    {/* Exit Reason alert */}
                    {emp.reason && (
                      <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-start gap-2.5">
                        <AlertCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-red-500 tracking-wider">Reason for Exit / प्रस्थान का कारण</span>
                          <p className="text-[11px] font-bold text-[var(--text-primary)] m-0 mt-0.5 italic">"{emp.reason}"</p>
                        </div>
                      </div>
                    )}

                    {/* Remarks notes */}
                    {emp.remarks && (
                      <div className="mt-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl flex items-start gap-2.5">
                        <FileText size={13} className="text-purple-400 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-[var(--text-secondary)] tracking-wider">Remarks / विवरण</span>
                          <p className="text-[11px] font-bold text-[var(--text-primary)] m-0 mt-0.5 italic">"{emp.remarks}"</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Operational Controls */}
                  <div className="mt-6 pt-4 border-t border-[var(--border-primary)] flex gap-3.5 font-bold">
                    <button
                      onClick={() => openEditModal(emp)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer shadow-sm"
                    >
                      <Edit2 size={12} />
                      <span>{isTenureExpiring ? 'Edit Tenure' : 'Edit Remarks'}</span>
                    </button>
                    {!isTenureExpiring && (
                      <button
                        onClick={() => handleRehire(emp.id, emp.name)}
                        className="flex-shrink-0 px-4 h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black uppercase text-[10px] tracking-wider transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Rehire</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal remarks */}
      {editingResigned && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in font-sans">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl text-[var(--text-primary)] animate-scale-up">
            <div className="p-6 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between font-bold">
              <h2 className="text-lg font-black flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-red-500" />
                <span>Exit Details Update — {editingResigned.name}</span>
              </h2>
              <button onClick={() => setEditingResigned(null)} className="text-[var(--text-secondary)] hover:text-blue-500 p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 space-y-5 font-bold text-sm">
              <div>
                <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2">Tenure End Date / सेवा समाप्ति तिथि</label>
                <input
                  type="date"
                  value={editData.tenure_end_date}
                  onChange={(e) => setEditData({ ...editData, tenure_end_date: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-red-500 focus:outline-none shadow-sm font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2">Reason for Exit / प्रस्थान का कारण</label>
                <input
                  type="text"
                  value={editData.reason}
                  onChange={(e) => setEditData({ ...editData, reason: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-red-500 focus:outline-none shadow-sm font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2">Remarks / टिप्पणी</label>
                <textarea
                  value={editData.remarks}
                  onChange={(e) => setEditData({ ...editData, remarks: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-red-500 focus:outline-none shadow-sm font-bold text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-[var(--border-primary)] mt-6 font-bold">
                <button
                  type="button"
                  onClick={() => setEditingResigned(null)}
                  className="px-5 py-2.5 border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-all cursor-pointer font-black text-xs uppercase tracking-wider"
                >
                  {hindiLabels.cancel}
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-90 text-white rounded-xl transition-all shadow-lg shadow-red-500/20 font-black cursor-pointer text-xs uppercase tracking-wider"
                >
                  {hindiLabels.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation rehire modal */}
      <ConfirmModal
        isOpen={rehireConfirm.open}
        title="Rehire Employee? / कर्मचारी पुनः नियुक्त करें?"
        message={`क्या आप वास्तव में ${rehireConfirm.name} को पुनः नियुक्त करना चाहते हैं? / Are you sure you want to rehire ${rehireConfirm.name}? They will be restored back to the Active Employees register.`}
        onConfirm={confirmRehire}
        onCancel={() => setRehireConfirm({open: false, id: '', name: ''})}
        variant="info"
      />
    </div>
  );
}