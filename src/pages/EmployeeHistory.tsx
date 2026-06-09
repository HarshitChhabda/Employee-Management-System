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
  Info,
  Database,
  Zap,
  Filter,
  Calendar,
  Activity,
  FileSearch,
  CheckCircle2
} from 'lucide-react';
import { categories } from '../lib/hindiLabels';
import { cn } from "@/lib/utils";
import { useLanguage } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { historyAPI } from '../services/api';
import type { HistoryRecord } from '../types/hrms';

export default function EmployeeHistory() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    fetchHistory();
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
      const rows = result?.rows || [];
      setHistory(rows);
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionClass = (action: string) => {
    switch (action) {
      case 'CREATE': return 'status-present';
      case 'UPDATE': return 'status-cl';
      case 'CATEGORY_CHANGE': return 'status-pl';
      case 'DELETE': return 'status-absent';
      case 'STATUS_CHANGE': return 'status-od';
      default: return 'status-od';
    }
  };

  const formatFieldName = (field: string) => {
    if (!field) return '-';
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatValue = (field: string, value: string) => {
    if (!value) return <span className="opacity-30 italic">VOID</span>;
    if (field === 'category') {
      return categories.find(c => c.value === value)?.labelHi || value;
    }
    return value;
  };

  return (
    <div className="flex flex-col h-full bg-transparent font-sans relative z-10 select-none text-[var(--text-primary)]">
      {/* Premium Header */}
      <div className="px-8 py-5 backdrop-blur-2xl bg-[var(--bg-card)] border-b border-[var(--border-primary)] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-black tracking-tight uppercase m-0 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
            {t('audit.title')}
          </h1>
          <div className="flex items-center gap-3.5 text-[var(--text-secondary)] text-[9px] font-black uppercase tracking-[0.2em] opacity-80">
            <div className="flex items-center gap-1.5">
              <Activity size={12} className="text-[var(--accent-blue)]" />
              <span>Audit Engine Stream</span>
            </div>
            <span className="opacity-30">|</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-[var(--accent-green)]" />
              <span>{history.length} Immutable Logs Archived</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[9px] font-black uppercase tracking-widest text-[var(--accent-blue)] select-none">
            <Database size={14} />
            <span>Compliance Secure</span>
          </div>

          <Button 
            onClick={() => window.print()}
            className="rounded-xl px-5 h-10 bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] shadow-inner transition-premium cursor-pointer text-[10px] font-black uppercase tracking-widest"
          >
            <Download size={15} className="mr-1.5" />
            {t('audit.exportReport')}
          </Button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="px-8 py-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative group w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={15} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search target..."
              className="pl-12 h-10 rounded-xl bg-[var(--bg-card)] border-[var(--border-primary)] focus:bg-[var(--bg-tertiary)] text-xs font-bold text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
            />
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)]">
            <Filter size={13} className="text-[var(--accent-blue)]" />
            <select
              value={actionFilter || 'ALL'}
              onChange={(e) => setActionFilter(e.target.value)}
              aria-label="Filter by action type"
              className="border-0 bg-transparent text-[9px] font-black uppercase tracking-widest outline-none text-[var(--text-primary)] cursor-pointer"
            >
              <option value="ALL" className="bg-[var(--bg-card)] text-[var(--text-primary)]">All Actions</option>
              <option value="CREATE" className="bg-[var(--bg-card)] text-[var(--text-primary)]">CREATE</option>
              <option value="UPDATE" className="bg-[var(--bg-card)] text-[var(--text-primary)]">UPDATE</option>
              <option value="DELETE" className="bg-[var(--bg-card)] text-[var(--text-primary)]">DELETE</option>
              <option value="CATEGORY_CHANGE" className="bg-[var(--bg-card)] text-[var(--text-primary)]">CAT_CHANGE</option>
            </select>
          </div>

          <div className="flex items-center gap-2 select-none">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[150px] h-10 bg-[var(--bg-card)] border border-[var(--border-primary)] focus:bg-[var(--bg-tertiary)] text-[10px] text-[var(--text-primary)] rounded-xl px-3 outline-none cursor-pointer font-mono font-bold"
              />
              <ArrowRight size={13} className="text-[var(--text-secondary)] opacity-50" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[150px] h-10 bg-[var(--bg-card)] border border-[var(--border-primary)] focus:bg-[var(--bg-tertiary)] text-[10px] text-[var(--text-primary)] rounded-xl px-3 outline-none cursor-pointer font-mono font-bold"
              />
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/20 text-[var(--accent-green)] shadow-sm">
           <Zap size={14} className="animate-pulse" />
           <span className="text-[9px] font-black uppercase tracking-widest">Master Audit Sequence Active</span>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="flex-grow p-6 md:p-8 overflow-hidden bg-transparent">
        <div className="p-0 h-full overflow-hidden flex flex-col bg-[var(--bg-card)] shadow-2xl border border-[var(--border-primary)] rounded-2xl backdrop-blur-2xl">
          <div className="overflow-auto custom-scrollbar flex-grow">
            <table className="theme-table w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] select-none">
                  <th className="px-6 py-4 text-left w-[180px]">Timestamp</th>
                  <th className="px-6 py-4 text-left">Audit Target</th>
                  <th className="px-6 py-4 text-center w-[160px]">Operation</th>
                  <th className="px-6 py-4 text-center w-[160px]">Attribute</th>
                  <th className="px-6 py-4 text-right">Transition State</th>
                  <th className="px-6 py-4 text-center w-[140px]">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)] text-xs text-[var(--text-primary)]">
                   {loading ? (
                     <tr>
                       <td colSpan={6} className="py-24 text-center">
                        <div className="flex flex-col items-center gap-4 animate-pulse">
                          <Zap size={36} className="text-[var(--accent-blue)] animate-bounce" />
                          <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.25em]">Synchronizing History Vault...</span>
                        </div>
                      </td>
                    </tr>
                   ) : history.length === 0 ? (
                     <tr>
                       <td colSpan={6} className="py-32 text-center opacity-40">
                        <div className="flex flex-col items-center">
                           <FileSearch size={64} strokeWidth={1} className="mb-4 text-[var(--text-secondary)]" />
                           <p className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">Audit Registry Void</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    history.map((record, index) => (
                      <tr 
                        key={record.history_id}
                        className="group hover:bg-[var(--bg-tertiary)] transition-premium cursor-default"
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-mono font-black text-[var(--text-primary)] text-[10px]">
                               {new Date(record.changed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[var(--text-secondary)] font-bold flex items-center gap-1.5 mt-1 opacity-80 text-[8px] uppercase tracking-wider">
                               <Clock size={10} className="text-[var(--accent-blue)]" />
                               {new Date(record.changed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center text-[var(--text-secondary)] group-hover:border-[var(--accent-blue)] group-hover:text-[var(--text-primary)] transition-premium select-none">
                               <User size={13} />
                            </div>
                            <div className="flex flex-col min-w-0">
                               <span className="font-bold text-[var(--text-primary)] text-sm uppercase group-hover:text-[var(--accent-blue)] transition-colors truncate">{record.employee_name}</span>
                               <span className="text-[var(--text-secondary)] font-mono font-black text-[8px] uppercase tracking-widest opacity-80 truncate">{record.employee_code}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider select-none",
                            record.action_type === 'CREATE' && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                            record.action_type === 'UPDATE' && "bg-sky-500/10 text-sky-500 border border-sky-500/20",
                            record.action_type === 'CATEGORY_CHANGE' && "bg-violet-500/10 text-violet-500 border border-violet-500/20",
                            record.action_type === 'DELETE' && "bg-rose-500/10 text-rose-500 border border-rose-500/20",
                            record.action_type === 'STATUS_CHANGE' && "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          )}>
                            {record.action_type}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="text-[var(--text-secondary)] font-black text-[9px] uppercase tracking-widest opacity-90 select-none">
                            {formatFieldName(record.field_name)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-3 justify-end">
                              <span className="text-[var(--text-secondary)] font-bold italic text-[10px]">{formatValue(record.field_name, record.old_value)}</span>
                              <ArrowRight size={11} className="text-[var(--text-secondary)] opacity-50" />
                              <span className="font-mono font-black px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[10px] shadow-sm">
                                {formatValue(record.field_name, record.new_value)}
                              </span>
                            </div>
                            {record.change_reason && (
                               <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                  <AlertCircle size={10} className="text-amber-500" />
                                  <span className="text-amber-500 font-bold italic text-[8px] uppercase tracking-tighter opacity-90">{record.change_reason}</span>
                                </div>
                             )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-6 h-6 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center text-[var(--accent-blue)]">
                              <User size={11} />
                            </div>
                            <span className="text-[9px] font-black text-[var(--text-primary)] uppercase tracking-wider truncate max-w-[100px]" title={record.changed_by || 'Admin'}>
                              {record.changed_by || 'Admin'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Operational Metadata Footer */}
      <div className="px-8 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between select-none font-bold">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[9px] font-black uppercase tracking-widest opacity-75">
            <CheckCircle2 size={13} className="text-[var(--accent-green)]" />
            <span>Audit Protocol: ISO-27001 SECURE</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[9px] font-black uppercase tracking-widest opacity-75">
            <Zap size={13} className="text-[var(--accent-blue)]" />
            <span>Real-time Event Stream Active</span>
          </div>
        </div>

        <div className="text-[var(--text-secondary)] font-mono text-[9px] font-black tracking-widest opacity-60">
          PRMX-AUDIT-STREAM v6.0.4 • READ_ONLY_PERSISTENCE
        </div>
      </div>
    </div>
  );
}
