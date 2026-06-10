import { useEffect, useState } from 'react';
import { 
  History, 
  Search, 
  Clock, 
  User, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Download,
  Filter,
  Calendar,
  CheckCircle2,
  FileSearch,
  Loader2
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { cn } from "@/lib/utils";
import { historyAPI } from '../services/api';
import type { HistoryRecord } from '../types/hrms';

export default function EmployeeHistory() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { t, language } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => fetchHistory(), 300);
    return () => clearTimeout(timer);
  }, [search, actionFilter, dateFrom, dateTo]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const result = await historyAPI.getAll({
        search: search || undefined,
        action_type: actionFilter !== 'ALL' ? actionFilter : undefined,
        from_date: dateFrom || undefined,
        to_date: dateTo || undefined
      });
      setHistory(result?.rows || []);
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      CREATE: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
      UPDATE: 'bg-sky-500/10 text-sky-500 border border-sky-500/20',
      CATEGORY_CHANGE: 'bg-violet-500/10 text-violet-500 border border-violet-500/20',
      DELETE: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
      STATUS_CHANGE: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    };
    return styles[action] || 'bg-gray-500/10 text-gray-500 border border-gray-500/20';
  };

  const formatFieldName = (field: string) => {
    if (!field) return '-';
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatValue = (value: string) => {
    if (!value) return <span className="text-[var(--text-secondary)] italic opacity-50">—</span>;
    return value;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="px-6 py-4 bg-[var(--bg-card)] border-b border-[var(--border-primary)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <History size={18} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] m-0">
              {language === 'hi' ? 'ऑडिट लॉग' : 'Audit Log'}
            </h1>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium flex items-center gap-2 mt-0.5">
              <ShieldCheck size={11} className="text-emerald-500" />
              {history.length} {language === 'hi' ? 'रिकॉर्ड' : 'records'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
              {language === 'hi' ? 'सुरक्षित' : 'Secure'}
            </span>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-all cursor-pointer text-[10px] font-bold uppercase tracking-wider"
          >
            <Download size={12} />
            {language === 'hi' ? 'एक्सपोर्ट' : 'Export'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'hi' ? 'खोजें...' : 'Search...'}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] text-xs font-medium outline-none focus:border-[var(--accent-blue)] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)]">
          <Filter size={12} className="text-[var(--accent-blue)]" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border-0 bg-transparent text-xs font-bold text-[var(--text-primary)] outline-none cursor-pointer"
          >
            <option value="ALL">{language === 'hi' ? 'सभी' : 'All'}</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="CATEGORY_CHANGE">CATEGORY</option>
            <option value="STATUS_CHANGE">STATUS</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={12} className="text-[var(--text-secondary)]" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[130px] py-2 px-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[10px] font-medium outline-none focus:border-[var(--accent-blue)] cursor-pointer"
          />
          <ArrowRight size={12} className="text-[var(--text-secondary)] opacity-50" />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[130px] py-2 px-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[10px] font-medium outline-none focus:border-[var(--accent-blue)] cursor-pointer"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full overflow-hidden flex flex-col bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] w-[150px]">
                    {language === 'hi' ? 'समय' : 'Time'}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    {language === 'hi' ? 'कर्मचारी' : 'Employee'}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] text-center w-[120px]">
                    {language === 'hi' ? 'क्रिया' : 'Action'}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] text-center w-[140px]">
                    {language === 'hi' ? 'फ़ील्ड' : 'Field'}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    {language === 'hi' ? 'बदलाव' : 'Change'}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] text-center w-[120px]">
                    {language === 'hi' ? 'द्वारा' : 'By'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 size={24} className="text-[var(--accent-blue)] animate-spin" />
                        <span className="text-xs text-[var(--text-secondary)] font-medium">
                          {language === 'hi' ? 'लोड हो रहा है...' : 'Loading...'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <FileSearch size={40} strokeWidth={1} className="text-[var(--text-secondary)] opacity-40" />
                        <p className="text-xs text-[var(--text-secondary)] font-medium">
                          {language === 'hi' ? 'कोई रिकॉर्ड नहीं मिला' : 'No records found'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  history.map((record) => {
                    const dt = formatDate(record.changed_at);
                    return (
                      <tr
                        key={record.history_id}
                        className="hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                              {dt.date}
                            </span>
                            <span className="text-[9px] text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                              <Clock size={9} />
                              {dt.time}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center flex-shrink-0">
                              <User size={12} className="text-[var(--text-secondary)]" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-[var(--text-primary)] block truncate max-w-[160px]">
                                {record.employee_name}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                            getActionBadge(record.action_type)
                          )}>
                            {record.action_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                            {formatFieldName(record.field_name)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[var(--text-secondary)] italic max-w-[100px] truncate">
                              {formatValue(record.old_value)}
                            </span>
                            <ArrowRight size={10} className="text-[var(--text-secondary)] opacity-40 flex-shrink-0" />
                            <span className="text-[10px] font-semibold text-[var(--text-primary)] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)] max-w-[120px] truncate">
                              {formatValue(record.new_value)}
                            </span>
                          </div>
                          {record.change_reason && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertCircle size={9} className="text-amber-500" />
                              <span className="text-[8px] text-amber-500 font-medium truncate max-w-[200px]">
                                {record.change_reason}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] font-bold text-[var(--text-primary)] truncate max-w-[80px] inline-block" title={record.changed_by || 'Admin'}>
                            {record.changed_by || 'Admin'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-2 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[9px] text-[var(--text-secondary)] font-medium">
          <CheckCircle2 size={11} className="text-emerald-500" />
          <span>{language === 'hi' ? 'ऑडिट सुरक्षित' : 'Audit Secure'}</span>
        </div>
        <span className="text-[9px] text-[var(--text-secondary)] font-mono opacity-50">
          v{localStorage.getItem('app_version') || '1.0.1'}
        </span>
      </div>
    </div>
  );
}
