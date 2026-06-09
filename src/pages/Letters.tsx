import React, { useEffect, useState } from 'react';
import { 
  FileText, Plus, Search, Edit2, Trash2, X, Building2, Calendar, Clock, ArrowRight,
  ArrowRightLeft, User, Compass, FileCheck, FileClock, ExternalLink, ChevronRight, Bookmark,
  CheckCircle, AlertCircle, ArrowUpRight, ArrowDownLeft, Upload, File as FileIcon, XCircle, Pin, Eye, Archive, Download, Send, RefreshCw, Paperclip, Loader2
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { useConnectivity } from '../lib/ConnectivityContext';
import { hindiLabels, letterTypes, offices, letterStatuses, letterPriorities, confidentialLevels, letterDirections } from '../lib/hindiLabels';
import { getLetterStatusConfig, getLetterPriorityConfig } from '../lib/letterUtils';
import { cn } from "@/lib/utils";
import { useAuthStore } from '../stores/authStore';
import { letterAPI, employeeAPI } from '../services/api';
import type { Letter, Employee } from '../types/hrms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import StatCard from '@/components/StatCard';
import Timeline, { TimelineEvent } from '@/components/Timeline';
import { useToast } from '@/components/Toast';
import { useExport } from '@/hooks/useExport';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBoundary from '@/components/ErrorBoundary';
import { format } from 'date-fns';

export default function Letters() {
  const { t, language } = useLanguage();
  const { session } = useAuthStore();
  const { showToast } = useToast();
  const { exportStyled, exportToCSV, exportToJSON } = useExport();
  const handleExport = (type: 'csv' | 'json') => {
    if (type === 'csv') {
      exportStyled({
        filename: 'letters',
        sheetName: 'Letters',
        title: 'Letter Registry',
        headers: ['Letter #', 'Subject', 'Employee', 'Date', 'Status', 'Type'],
        rows: letters.map(l => [
          l.letter_number || '',
          l.subject || '',
          l.employee?.name || '',
          l.dispatch_date || '',
          l.status || '',
          l.letter_type || '',
        ]),
        colWidths: [18, 40, 22, 16, 14, 14],
      });
    } else {
      exportToJSON(letters, 'letters');
    }
  };
  const { isOnline } = useConnectivity();

  const [activeTab, setActiveTab] = useState<'all'|'notice'|'audit'>('all');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [noticeLetters, setNoticeLetters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [formData, setFormData] = useState<any>({ status: 'dispatched', priority: 'normal', confidential_level: 'public', is_notice_board: 0, notice_pinned: 0 });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileUploadStatus, setFileUploadStatus] = useState<'idle' | 'uploading' | 'local_only' | 'synced' | 'error'>('idle');
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showComposeSheet, setShowComposeSheet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [composeStep, setComposeStep] = useState<'basic' | 'details' | 'attachment'>('basic');

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { fetchLetters(); fetchStats(); }, [searchQuery, typeFilter, statusFilter, priorityFilter, directionFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (isOnline) {
      letterAPI.retryPendingUploads().then((result: any) => {
        if (result?.retried > 0) {
          showToast(`${result.retried} files cloud sync हुईं`, 'success');
          fetchLetters();
        }
      }).catch(() => {});
    }
  }, [isOnline]);

  useEffect(() => { if (activeTab === 'notice') fetchNoticeBoard(); }, [activeTab]);

  useEffect(() => {
    if (selectedLetter?.file_local_path || selectedLetter?.file_url) {
      setPreviewLoading(true);
      letterAPI.readFile(selectedLetter.file_url, selectedLetter.file_local_path)
        .then((res: any) => setPreviewData(res.file_data))
        .catch(() => setPreviewData(null))
        .finally(() => setPreviewLoading(false));
    } else { setPreviewData(null); }
  }, [selectedLetter?.id]);

  useEffect(() => {
    if (activeTab === 'audit' && selectedLetter) fetchAuditLog(selectedLetter.id);
  }, [activeTab, selectedLetter]);

  const fetchEmployees = async () => {
    try {
      const data = await employeeAPI.getAll({ is_active: true });
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Fetch employees error:', err); }
  };

  const fetchLetters = async () => {
    setLoading(true);
    try {
      const data = await letterAPI.getAllFiltered({
        search: searchQuery, type: typeFilter, status: statusFilter,
        priority: priorityFilter, direction: directionFilter,
        date_from: dateFrom, date_to: dateTo
      });
      setLetters(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Fetch letters error:', err); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try { setStats(await letterAPI.getStats()); } catch (err) { console.error('Fetch stats error:', err); }
  };

  const fetchNoticeBoard = async () => {
    try {
      const data = await letterAPI.getNoticeBoard();
      setNoticeLetters(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Fetch notices error:', err); }
  };

  const fetchAuditLog = async (letterId: string) => {
    setAuditLoading(true);
    try {
      const data = await letterAPI.getAuditLog(letterId);
      setAuditLog(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Fetch audit log error:', err); }
    finally { setAuditLoading(false); }
  };

  const openCompose = (letter?: Letter) => {
    if (letter) {
      setFormData({ ...letter });
    } else {
      setFormData({ status: 'dispatched', priority: 'normal', confidential_level: 'public', is_notice_board: 0, notice_pinned: 0 });
    }
    setSelectedFile(null);
    setFilePreview(null);
    setFileUploadStatus('idle');
    setComposeStep('basic');
    setShowComposeSheet(true);
  };

  const openEdit = (letter: Letter) => {
    openCompose(letter);
    setShowDetailSheet(false);
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { showToast('फ़ाइल बहुत बड़ी है (Max 10MB)', 'error'); return; }
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) { showToast('Only PDF, JPG, PNG allowed', 'error'); return; }
    setSelectedFile(file);
    setFormData({ ...formData, file_name: file.name });
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else { setFilePreview(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let letterId = '';
      if (formData.id) {
        await letterAPI.update(String(formData.id), formData);
        letterId = formData.id;
        showToast('Letter Updated', 'success');
      } else {
        const payload = { ...formData };
        if (payload.is_notice_board) payload.letter_type = 'notice';
        const created = await letterAPI.create(payload);
        letterId = created.id;
        showToast('Letter Dispatched', 'success');
      }

      if (selectedFile && letterId) {
        setFileUploadStatus('uploading');
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
            const result = await letterAPI.saveFile(letterId, base64, selectedFile.name, selectedFile.type);
            setFileUploadStatus(result.storage === 'both' ? 'synced' : 'local_only');
            if (result.storage === 'local_only') showToast('File saved locally. Will sync when online', 'warning');
            else showToast('File uploaded successfully', 'success');
          } catch (fileErr: any) { setFileUploadStatus('error'); showToast(fileErr.message || 'Upload failed', 'error'); }
        };
      }

      setShowComposeSheet(false);
      setFormData({ status: 'dispatched', priority: 'normal', confidential_level: 'public', is_notice_board: 0, notice_pinned: 0 });
      setSelectedFile(null);
      fetchLetters();
      fetchStats();
    } catch (err: any) { showToast(err.message || 'Failed to save', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await letterAPI.updateStatus(id, newStatus);
      showToast('Status Updated', 'success');
      fetchLetters(); fetchStats();
      if (selectedLetter && selectedLetter.id === id) setSelectedLetter({ ...selectedLetter, status: newStatus });
    } catch (err: any) { showToast(err.message || 'Failed', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await letterAPI.delete(id);
      showToast('Deleted successfully', 'success');
      fetchLetters(); fetchStats();
      if (selectedLetter?.id === id) { setShowDetailSheet(false); setSelectedLetter(null); }
    } catch (err: any) { showToast(err.message || 'Failed to delete', 'error'); }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      const res = await letterAPI.acknowledge(id);
      showToast('Acknowledged', 'success');
      fetchLetters(); fetchStats();
      if (selectedLetter && selectedLetter.id === id) setSelectedLetter({ ...selectedLetter, acknowledged: 1, acknowledged_at: res.acknowledged_at });
    } catch (err: any) { showToast(err.message || 'Failed', 'error'); }
  };

  const canWrite = (letter: Letter) => {
    if (session?.role === 'ROLE_SUPER') return false;
    return letter.source_entity === (session?.entity || 'BRANCH');
  };

  const exportData = () => {
    handleExport('csv');
  };

  const resetFilters = () => {
    setSearchQuery(''); setTypeFilter(''); setStatusFilter(''); setPriorityFilter('');
    setDirectionFilter(''); setDateFrom(''); setDateTo('');
  };

  const renderStats = () => {
    if (!stats) return <div className="h-[88px] animate-pulse bg-[var(--bg-secondary)] rounded-2xl mb-6"></div>;
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard title="Total Letters" titleHi="कुल पत्र" value={stats.total} icon={FileText} color="blue" />
        <StatCard title="Pending" titleHi="कार्रवाई लंबित" value={stats.pending} icon={Clock} color="orange" />
        <StatCard title="Dispatched Today" titleHi="आज प्रेषित" value={stats.dispatched_today} icon={Send} color="green" />
        <StatCard title="Received" titleHi="प्राप्त" value={stats.received} icon={CheckCircle} color="teal" />
        <StatCard title="Confidential" titleHi="गोपनीय" value={stats.confidential} icon={Eye} color="purple" />
        <StatCard title="Notice Board" titleHi="सूचना पट्ट" value={stats.notice_board} icon={Pin} color="red" />
      </div>
    );
  };

  const renderAllLetters = () => (
    <div className="space-y-4 fade-in">
      {renderStats()}
      
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between mb-4">
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => setTypeFilter('')} className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-all border", !typeFilter ? "bg-blue-500/10 border-blue-500/30 text-blue-500" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--border-secondary)]")}>
              {hindiLabels.allLetters}
            </button>
            {letterTypes.slice(0,4).map(t => (
              <button key={t.value} onClick={() => setTypeFilter(t.value)} className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-all border", typeFilter === t.value ? "bg-blue-500/10 border-blue-500/30 text-blue-500" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--border-secondary)]")}>
                {language==='hi' ? t.labelHi : t.label.split('/')[0].trim()}
              </button>
            ))}
          </div>
          <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--border-secondary)] hover:shadow-md transition-all">
            <Download size={16} /> Export
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-[var(--text-secondary)]" size={16} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by subject, letter no, sender..." className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl pl-9 pr-3 py-2 text-sm focus:border-blue-500 outline-none" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm focus:border-blue-500 outline-none">
            <option value="">{hindiLabels.filterByStatus || 'All Statuses'}</option>
            {letterStatuses.map(s => <option key={s.value} value={s.value}>{language==='hi'?s.labelHi:s.label}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm focus:border-blue-500 outline-none">
            <option value="">{hindiLabels.filterByPriority || 'All Priorities'}</option>
            {letterPriorities.map(p => <option key={p.value} value={p.value}>{language==='hi'?p.labelHi:p.label}</option>)}
          </select>
          <select value={directionFilter} onChange={e => setDirectionFilter(e.target.value)} className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm focus:border-blue-500 outline-none">
            <option value="">All Directions</option>
            {letterDirections.map(d => <option key={d.value} value={d.value}>{language==='hi'?d.labelHi:d.label}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm focus:border-blue-500 outline-none text-[var(--text-secondary)]" title="Date From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm focus:border-blue-500 outline-none text-[var(--text-secondary)]" title="Date To" />
          <button onClick={resetFilters} className="p-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors" title="Reset Filters"><RefreshCw size={18} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-4 font-semibold">Letter Details</th>
                  <th className="text-left py-3 px-4 font-semibold">Type & Direction</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {letters.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-[var(--text-secondary)]">No letters found</td></tr>
                ) : (
                  letters.map((row) => (
                    <tr key={row.id} onClick={() => { setSelectedLetter(row); setShowDetailSheet(true); }} className="border-b border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            {row.priority && getLetterPriorityConfig(row.priority).color === 'text-rose-500' && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                            <span className="font-bold text-[var(--text-primary)]">{row.subject}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-1 font-mono">
                            <span>{row.letter_number || 'N/A'}</span>
                            {row.file_url && <Paperclip size={12} className="text-blue-500" />}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-xs bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-md border border-[var(--border-primary)]">{letterTypes.find(t=>t.value===row.letter_type)?.label.split('/')[0].trim() || row.letter_type}</span>
                          {row.direction && (<span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1"><ArrowRightLeft size={10} /> {letterDirections.find(d=>d.value===row.direction)?.label.split('/')[0] || row.direction}</span>)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {(() => { const config = getLetterStatusConfig(row.status || 'draft'); return (<Badge variant="outline" className={cn("px-2 py-0.5 border text-[11px] font-semibold gap-1", config.color, config.bgColor)}>{config.label}</Badge>); })()}
                      </td>
                      <td className="py-3 px-4"><div className="text-sm font-medium">{row.dispatch_date ? format(new Date(row.dispatch_date), 'dd MMM yyyy') : '-'}</div></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedLetter(row); setShowDetailSheet(true); }} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors"><ChevronRight size={18} /></button>
                          {canWrite(row) && (<button onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={18} /></button>)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderNoticeBoard = () => (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-primary)] shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Digital Notice Board</h2>
          <p className="text-sm text-[var(--text-secondary)]">Important announcements and public notices.</p>
        </div>
        <button onClick={() => openCompose()} className="px-4 py-2 bg-rose-500/10 text-rose-500 font-bold rounded-xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2">
          <Plus size={18} /> Post Notice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {noticeLetters.length === 0 && <div className="col-span-full py-12 text-center text-[var(--text-secondary)]">No active notices found.</div>}
        {noticeLetters.map(notice => {
          const config = getLetterPriorityConfig(notice.priority || 'normal');
          const isExpiringSoon = notice.notice_expiry_date && (new Date(notice.notice_expiry_date).getTime() - new Date().getTime() < 7*24*60*60*1000);
          return (
            <div key={notice.id} onClick={() => { setSelectedLetter(notice); setShowDetailSheet(true); }} className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative group">
              <div className={cn("h-1.5 w-full", config.bgColor.replace('/10', '/80'))} />
              {notice.notice_pinned === 1 && (<div className="absolute top-4 right-4 text-rose-500"><Pin size={18} className="fill-current" /></div>)}
              <div className="p-5">
                <Badge variant="outline" className={cn("mb-3 text-[10px]", config.color, config.bgColor)}>{config.labelHi}</Badge>
                <h3 className="font-black text-lg text-[var(--text-primary)] mb-2 line-clamp-2 uppercase tracking-tight">{notice.subject}</h3>
                {notice.department && <div className="text-xs font-semibold text-[var(--text-secondary)] mb-4">{notice.department}</div>}
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] border-t border-[var(--border-primary)] pt-4 mt-auto">
                  <div className="flex items-center gap-1.5"><Calendar size={14}/> {format(new Date(notice.dispatch_date || notice.created_at), 'dd MMM yyyy')}</div>
                  {notice.notice_expiry_date && (<div className={cn("flex items-center gap-1.5", isExpiringSoon && "text-rose-500 font-medium")}><Clock size={14}/> Exp: {format(new Date(notice.notice_expiry_date), 'dd MMM')}</div>)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderAuditLog = () => (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] fade-in">
      <div className="w-full lg:w-1/3 flex flex-col bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-sm overflow-hidden h-full">
        <div className="p-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/50">
          <h3 className="font-bold text-[var(--text-primary)] mb-3">Select Document</h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-[var(--text-secondary)]" size={16} />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl pl-9 pr-3 py-2 text-sm focus:border-blue-500 outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {letters.map(l => (
            <div key={l.id} onClick={() => setSelectedLetter(l)} className={cn("p-3 rounded-xl cursor-pointer transition-colors border", selectedLetter?.id === l.id ? "bg-blue-500/10 border-blue-500/30" : "border-transparent hover:bg-[var(--bg-secondary)]")}>
              <div className="font-semibold text-sm text-[var(--text-primary)] line-clamp-1">{l.subject}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1 font-mono">{l.letter_number || l.id.slice(0,8)}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="w-full lg:w-2/3 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
        {selectedLetter ? (
          <>
            <div className="p-5 border-b border-[var(--border-primary)] bg-gradient-to-r from-[var(--bg-secondary)] to-transparent flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{selectedLetter.subject}</h2>
                <p className="text-sm text-[var(--text-secondary)] font-mono">{selectedLetter.letter_number}</p>
              </div>
              <Badge variant="outline">{selectedLetter.status}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {auditLoading ? (
                <div className="space-y-6">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
              ) : auditLog.length > 0 ? (
                <Timeline>
                  {auditLog.map((log) => {
                    let color = 'bg-blue-500';
                    let icon = <FileText size={14} className="text-white"/>;
                    if (log.action.includes('UPDATED')) { color = 'bg-amber-500'; icon = <Edit2 size={14} className="text-white"/>; }
                    else if (log.action.includes('STATUS')) { color = 'bg-purple-500'; icon = <RefreshCw size={14} className="text-white"/>; }
                    else if (log.action.includes('ACK')) { color = 'bg-green-500'; icon = <CheckCircle size={14} className="text-white"/>; }
                    else if (log.action.includes('FILE')) { color = 'bg-sky-500'; icon = <Paperclip size={14} className="text-white"/>; }
                    else if (log.action.includes('DEL')) { color = 'bg-red-500'; icon = <Trash2 size={14} className="text-white"/>; }
                    return (
                      <TimelineEvent key={log.id} icon={icon} iconColor={color} title={log.action} date={format(new Date(log.performed_at), 'dd MMM yyyy, hh:mm a')}>
                        <div className="text-sm text-[var(--text-primary)]">By: <span className="font-semibold">{log.performed_by}</span></div>
                        {log.notes && <div className="text-xs text-[var(--text-secondary)] mt-1 italic">Note: {log.notes}</div>}
                      </TimelineEvent>
                    );
                  })}
                </Timeline>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
                  <AlertCircle size={48} className="mb-4 opacity-20" />
                  <p>No audit trail found for this document.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] opacity-50">
            <Compass size={64} className="mb-4" />
            <p className="text-lg font-medium">Select a document to view its history</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderComposeForm = () => (
    <div className="flex flex-col flex-1 min-h-0 bg-[var(--bg-card)]">
      {/* Header Info */}
      <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/30 flex items-center justify-between shadow-sm">
        <div className="flex flex-col gap-0.5">
           <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Letter Data Capture</span>
           <span className="text-xs font-bold text-[var(--text-secondary)]">Complete all necessary sections below</span>
        </div>
        {formData.id && <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 text-[9px] uppercase tracking-wider font-black">Edit Mode</Badge>}
      </div>

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {/* Section 1: General Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs">1</span>
            General Information
          </h3>
          
          <div className="space-y-4 bg-[var(--bg-secondary)]/30 p-4 rounded-xl border border-[var(--border-primary)]/50">
            <div>
              <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Subject / विषय *</label>
              <input type="text" required value={formData.subject || ''} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none shadow-sm transition-colors" placeholder="Enter subject..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Letter Number</label>
                <input type="text" value={formData.letter_number || ''} onChange={e => setFormData({...formData, letter_number: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none font-mono shadow-sm transition-colors" placeholder="Auto-generated" />
              </div>
              <div>
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Letter Type *</label>
                <select required value={formData.letter_type || ''} onChange={e => setFormData({...formData, letter_type: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none shadow-sm transition-colors">
                  <option value="">Select type...</option>
                  {letterTypes.map(t => <option key={t.value} value={t.value}>{language==='hi'?t.labelHi:t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Dispatch Date</label>
                <input type="date" value={formData.dispatch_date || ''} onChange={e => setFormData({...formData, dispatch_date: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none shadow-sm transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Received Date</label>
                <input type="date" value={formData.received_date || ''} onChange={e => setFormData({...formData, received_date: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none shadow-sm transition-colors" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Description / Remarks</label>
              <textarea value={formData.remarks || ''} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none resize-none h-20 shadow-sm transition-colors" placeholder="Write details here..." />
            </div>
          </div>
        </div>

        {/* Section 2: Dispatch Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-2 flex items-center gap-2">
             <span className="w-6 h-6 rounded-md bg-purple-500/10 text-purple-500 flex items-center justify-center text-xs">2</span>
             Dispatch Details
          </h3>
          
          <div className="space-y-4 bg-[var(--bg-secondary)]/30 p-4 rounded-xl border border-[var(--border-primary)]/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Status</label>
                <select value={formData.status || 'dispatched'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-purple-500 outline-none shadow-sm transition-colors">
                  {letterStatuses.map(s => <option key={s.value} value={s.value}>{language==='hi'?s.labelHi:s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Priority</label>
                <select value={formData.priority || 'normal'} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-purple-500 outline-none shadow-sm transition-colors">
                  {letterPriorities.map(p => <option key={p.value} value={p.value}>{language==='hi'?p.labelHi:p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Confidentiality</label>
                <select value={formData.confidential_level || 'public'} onChange={e => setFormData({...formData, confidential_level: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-purple-500 outline-none shadow-sm transition-colors">
                  {confidentialLevels.map(c => <option key={c.value} value={c.value}>{language==='hi'?c.labelHi:c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Direction</label>
                <select value={formData.direction || ''} onChange={e => setFormData({...formData, direction: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-purple-500 outline-none shadow-sm transition-colors">
                  <option value="">Auto Detect</option>
                  {letterDirections.map(d => <option key={d.value} value={d.value}>{language==='hi'?d.labelHi:d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Department</label>
                <input type="text" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-purple-500 outline-none shadow-sm transition-colors" placeholder="Department..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Sender</label>
                <input type="text" value={formData.sender || ''} onChange={e => setFormData({...formData, sender: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-purple-500 outline-none shadow-sm transition-colors" placeholder="Sender name..." />
              </div>
              <div>
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Receiver</label>
                <input type="text" value={formData.receiver || ''} onChange={e => setFormData({...formData, receiver: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-purple-500 outline-none shadow-sm transition-colors" placeholder="Receiver name..." />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Related Employee Link (Optional)</label>
              <select value={formData.employee_id || ''} onChange={e => setFormData({...formData, employee_id: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-purple-500 outline-none shadow-sm transition-colors">
                <option value="">Select Employee...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Notice Board & Attachments */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-2 flex items-center gap-2">
             <span className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-500 flex items-center justify-center text-xs">3</span>
             Publishing & Files
          </h3>

          <div className="space-y-5">
            {/* Notice Board Toggle */}
            <div className={cn("p-4 border rounded-xl relative overflow-hidden transition-all duration-300", formData.is_notice_board === 1 ? "bg-rose-500/5 border-rose-500/20 shadow-inner" : "bg-[var(--bg-secondary)]/30 border-[var(--border-primary)]/50 hover:bg-[var(--bg-secondary)]/50")}>
              <div className={cn("absolute top-0 left-0 w-1 h-full transition-colors", formData.is_notice_board === 1 ? "bg-rose-500" : "bg-[var(--border-primary)]")}></div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.is_notice_board === 1} onChange={e => setFormData({...formData, is_notice_board: e.target.checked ? 1 : 0})} className="w-5 h-5 rounded border-[var(--border-primary)] text-rose-500 focus:ring-rose-500 bg-[var(--bg-card)] cursor-pointer" />
                <span className={cn("font-bold text-sm", formData.is_notice_board === 1 ? "text-rose-600" : "text-[var(--text-primary)]")}>Publish to Notice Board</span>
              </label>
              {formData.is_notice_board === 1 && (
                <div className="mt-4 pl-8 space-y-4 animate-in slide-in-from-top-2">
                  <div>
                    <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Notice Expiry Date</label>
                    <input type="date" value={formData.notice_expiry_date || ''} onChange={e => setFormData({...formData, notice_expiry_date: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-rose-500 outline-none shadow-sm transition-colors" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-[var(--bg-card)] px-3 py-2 rounded-lg border border-[var(--border-primary)] w-max">
                    <input type="checkbox" checked={formData.notice_pinned === 1} onChange={e => setFormData({...formData, notice_pinned: e.target.checked ? 1 : 0})} className="rounded text-rose-500 focus:ring-rose-500 bg-[var(--bg-card)] cursor-pointer" />
                    <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5"><Pin size={14} className="text-rose-500" /> Pin to top of Notice Board</span>
                  </label>
                </div>
              )}
            </div>

            {/* File Attachment Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileSelect(file); }}
              className={cn("border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative group", selectedFile ? "border-green-500/40 bg-green-500/5 shadow-inner" : "border-[var(--border-primary)] hover:border-blue-500/40 hover:bg-blue-500/5 bg-[var(--bg-secondary)]/20")}
              onClick={() => document.getElementById('compose-file-input')?.click()}
            >
              <input id="compose-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }} />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-3">
                  {filePreview && selectedFile.type.startsWith('image/') ? (<img src={filePreview} className="max-h-32 rounded-lg object-contain shadow-md border border-[var(--border-primary)]" />) : (<div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20"><FileIcon className="w-7 h-7 text-green-500" /></div>)}
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)] truncate max-w-xs">{selectedFile.name}</p>
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setFilePreview(null); }} className="px-3 py-1.5 mt-2 rounded-lg bg-red-500/10 text-xs font-black uppercase tracking-wider text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-1.5"><X size={12} /> Remove File</button>
                </div>
              ) : formData.file_name ? (
                <div className="flex flex-col items-center gap-3">
                   <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20"><FileIcon size={24} className="text-blue-500" /></div>
                   <div>
                     <span className="font-black text-sm text-[var(--text-primary)] break-all">{formData.file_name}</span>
                     <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-0.5">Existing File</p>
                   </div>
                   <button type="button" onClick={(e) => { e.stopPropagation(); setFormData({...formData, file_name: '', file_local_path: '', file_url: ''}) }} className="px-3 py-1.5 mt-2 rounded-lg bg-red-500/10 text-xs font-black uppercase tracking-wider text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-1.5"><X size={12} /> Replace File</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-[var(--text-secondary)]">
                  <div className="w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform group-hover:text-blue-500 group-hover:border-blue-500/30">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)]">Drag & drop file here or click to browse</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mt-1">PDF, JPG, PNG — Max 10MB</p>
                  </div>
                </div>
              )}
            </div>
            
            {fileUploadStatus !== 'idle' && (
              <div className={cn("flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm", fileUploadStatus === 'uploading' && "bg-blue-500/10 border border-blue-500/20 text-blue-500", fileUploadStatus === 'synced' && "bg-green-500/10 border border-green-500/20 text-green-500", fileUploadStatus === 'local_only' && "bg-amber-500/10 border border-amber-500/20 text-amber-500", fileUploadStatus === 'error' && "bg-red-500/10 border border-red-500/20 text-red-500")}>
                {fileUploadStatus === 'uploading' && <Loader2 size={14} className="animate-spin" />}
                {fileUploadStatus === 'uploading' && 'Uploading Document...'}
                {fileUploadStatus === 'synced' && 'Document Synced (Local + Cloud)'}
                {fileUploadStatus === 'local_only' && 'Saved Locally (Pending Cloud Sync)'}
                {fileUploadStatus === 'error' && 'Upload Failed'}
              </div>
            )}
          </div>
        </div>
        
      </form>

      {/* Sticky Footer Actions */}
      <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-[0_-4px_15px_rgba(0,0,0,0.05)] flex items-center justify-between z-10 shrink-0">
        <button type="button" onClick={() => setShowComposeSheet(false)} className="px-5 py-2.5 rounded-xl font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors text-xs uppercase tracking-wider">
          Cancel
        </button>
        <button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 text-xs uppercase tracking-wider">
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {formData.id ? 'Save Document Changes' : 'Dispatch Document'}
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="max-w-[1600px] mx-auto pb-24 lg:pb-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">{hindiLabels.letters || 'Document Center'}</h1>
            <p className="text-[var(--text-secondary)] mt-1 text-sm font-medium">Digital Office Letter Management System (DOLMS)</p>
          </div>
          <button onClick={() => openCompose()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2">
            <Plus size={18} /> {hindiLabels.composeNew || 'New Document'}
          </button>
        </div>

        {/* Tabs - Only 3: All, Notice, Audit */}
        <Tabs value={activeTab} onValueChange={(v:any) => { setActiveTab(v); if(v!=='audit') setSelectedLetter(null); }} className="w-full">
          <TabsList className="mb-6 bg-[var(--bg-card)] border border-[var(--border-primary)] p-1 rounded-xl shadow-sm">
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md px-5 py-2 transition-all font-semibold text-sm">
              <FileText size={15} className="mr-2 inline" /> All Documents
            </TabsTrigger>
            <TabsTrigger value="notice" className="rounded-lg data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-md px-5 py-2 transition-all font-semibold text-sm">
              <Pin size={15} className="mr-2 inline" /> Notice Board
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-lg data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md px-5 py-2 transition-all font-semibold text-sm">
              <FileClock size={15} className="mr-2 inline" /> Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0 outline-none">{renderAllLetters()}</TabsContent>
          <TabsContent value="notice" className="mt-0 outline-none">{renderNoticeBoard()}</TabsContent>
          <TabsContent value="audit" className="mt-0 outline-none">{renderAuditLog()}</TabsContent>
        </Tabs>

        {/* Detail Sheet */}
        <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
          <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-[var(--bg-card)] border-l border-[var(--border-primary)] flex flex-col h-full z-[100]">
            {selectedLetter && (
              <>
                <SheetHeader className="p-6 pb-4 border-b border-[var(--border-primary)] bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-card)] shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className={cn("px-2.5 py-0.5", getLetterStatusConfig(selectedLetter.status || 'draft').color, getLetterStatusConfig(selectedLetter.status || 'draft').borderColor)}>
                      {getLetterStatusConfig(selectedLetter.status || 'draft').labelHi}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {canWrite(selectedLetter) && (<button onClick={() => { openEdit(selectedLetter); setShowDetailSheet(false); }} className="p-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-blue-500 hover:bg-blue-500/10 transition-colors" title="Edit"><Edit2 size={16} /></button>)}
                      {selectedLetter.file_url && (<button onClick={async () => { try { const res = await letterAPI.readFile(selectedLetter.file_url!); const type = selectedLetter.file_name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'; const url = `data:${type};base64,${res.file_data}`; const a = document.createElement('a'); a.href = url; a.download = selectedLetter.file_name || 'download'; a.click(); } catch(e:any) { showToast('File read error', 'error'); } }} className="p-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-green-500 hover:bg-green-500/10 transition-colors" title="Download"><Download size={16} /></button>)}
                    </div>
                  </div>
                  <SheetTitle className="text-xl font-black text-[var(--text-primary)] leading-tight">{selectedLetter.subject}</SheetTitle>
                  <p className="text-sm font-mono text-[var(--text-secondary)] mt-2 bg-[var(--bg-secondary)] px-3 py-1 rounded-lg inline-block border border-[var(--border-primary)]">{selectedLetter.letter_number || 'N/A'}</p>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {canWrite(selectedLetter) && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                      <label className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-2 block">Update Status</label>
                      <select className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-[var(--text-primary)]" value={selectedLetter.status || 'draft'} onChange={(e) => handleStatusUpdate(selectedLetter.id, e.target.value)}>
                        {letterStatuses.map(s => <option key={s.value} value={s.value}>{language==='hi'?s.labelHi:s.label}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[var(--bg-secondary)]/50 p-3 rounded-xl border border-[var(--border-primary)]">
                      <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">Direction</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{letterDirections.find(d=>d.value===selectedLetter.direction)?.label.split('/')[0] || selectedLetter.direction || '-'}</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)]/50 p-3 rounded-xl border border-[var(--border-primary)]">
                      <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">Priority</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{letterPriorities.find(p=>p.value===selectedLetter.priority)?.label || selectedLetter.priority || '-'}</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)]/50 p-3 rounded-xl border border-[var(--border-primary)] col-span-2">
                      <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">Confidentiality</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{confidentialLevels.find(c=>c.value===selectedLetter.confidential_level)?.label || selectedLetter.confidential_level || '-'}</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[var(--border-primary)]">
                    <div><p className="text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Sender</p><p className="text-sm font-medium text-[var(--text-primary)]">{selectedLetter.sender || '-'}</p></div>
                    <div><p className="text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Receiver</p><p className="text-sm font-medium text-[var(--text-primary)]">{selectedLetter.receiver || '-'}</p></div>
                    {selectedLetter.employee && selectedLetter.employee.name && (
                      <div><p className="text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Related Employee</p><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-xs font-bold uppercase">{selectedLetter.employee.name.charAt(0)}</div><p className="text-sm font-medium text-[var(--text-primary)]">{selectedLetter.employee.name}</p></div></div>
                    )}
                  </div>

                  {selectedLetter.remarks && (<div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mt-6"><h4 className="text-xs font-bold uppercase text-amber-600 mb-2">Remarks</h4><p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{selectedLetter.remarks}</p></div>)}

                  {(selectedLetter?.file_name || selectedLetter?.file_url || selectedLetter?.file_local_path) && (
                    <div className="border-t border-[var(--border-primary)] pt-5 mt-6 space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Attached File</span>
                      {previewLoading ? (<div className="h-32 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />) : previewData ? (
                        <div className="space-y-2">
                          {selectedLetter.file_name?.match(/\.(jpg|jpeg|png)$/i) ? (<img src={`data:image/*;base64,${previewData}`} className="w-full max-h-48 object-contain rounded-xl border border-[var(--border-primary)]" />) : (
                            <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]">
                              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20 shrink-0"><FileIcon className="w-5 h-5 text-red-400" /></div>
                              <div className="flex-grow min-w-0"><p className="text-xs font-black text-[var(--text-primary)] truncate">{selectedLetter.file_name}</p></div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button onClick={() => { const link = document.createElement('a'); const type = selectedLetter.file_name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'; link.href = `data:${type};base64,${previewData}`; link.download = selectedLetter.file_name || 'letter-file'; link.click(); }} className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-black uppercase tracking-wider hover:bg-green-500/20 transition-colors"><Download size={10} /> Download</button>
                          </div>
                        </div>
                      ) : (<p className="text-[10px] text-[var(--text-secondary)] font-bold italic">No file attached</p>)}
                    </div>
                  )}

                  <div className="mt-8 flex flex-col gap-3">
                    {selectedLetter.acknowledged === 1 ? (
                      <div className="bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl p-4 text-center text-sm font-bold flex flex-col items-center gap-2"><CheckCircle size={24} /> Acknowledged on {format(new Date(selectedLetter.acknowledged_at!), 'dd MMM yyyy, hh:mm a')}</div>
                    ) : (
                      <button onClick={() => handleAcknowledge(selectedLetter.id)} className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 active:scale-95 transition-all flex justify-center items-center gap-2"><FileCheck size={18} /> Acknowledge Document</button>
                    )}
                    <button onClick={() => { setShowDetailSheet(false); setActiveTab('audit'); setSelectedLetter(selectedLetter); }} className="w-full py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold rounded-xl border border-[var(--border-primary)] transition-all flex justify-center items-center gap-2"><FileClock size={16} /> View Full Audit Trail</button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Compose Dialog (centered popup) */}
        <Dialog open={showComposeSheet} onOpenChange={(open) => { if (!open) setShowComposeSheet(false); }}>
          <DialogContent size="xl" className="p-0 bg-[var(--bg-card)] border border-[var(--border-primary)] flex flex-col max-h-[90vh] overflow-y-auto" showCloseButton={false}>
            <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between shrink-0">
              <div>
                <DialogTitle className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                  <Edit2 size={20} className="text-blue-500" />
                  {formData.id ? 'Edit Letter' : 'Compose New Letter'}
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--text-secondary)] mt-0.5">Fill out the details to dispatch or record a letter.</DialogDescription>
              </div>
              <button onClick={() => setShowComposeSheet(false)} className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"><X size={18} className="text-[var(--text-secondary)]" /></button>
            </div>
            {renderComposeForm()}
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
}
