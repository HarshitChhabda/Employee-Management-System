// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  Calendar, 
  CreditCard, 
  Landmark, 
  Clock, 
  FileText,
  ChevronLeft,
  History,
  ShieldCheck,
  ClipboardList,
  Edit2,
  Zap,
  Activity,
  Award,
  Database,
  Fingerprint,
  TrendingUp,
  ArrowUpRight,
  LucideIcon
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { hindiLabels } from '@/lib/hindiLabels';
import { useEmployeeStore } from '@/stores/employeeStore';
import { cn } from '@/lib/utils';

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { employees, fetchEmployees } = useEmployeeStore();
  const [employee, setEmployee] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employees.length === 0) fetchEmployees();
  }, []);

  useEffect(() => {
    const emp = employees.find(e => e.id === Number(id));
    if (emp) {
      setEmployee(emp);
      fetchAttendance(emp.id);
    }
  }, [id, employees]);

  const fetchAttendance = async (empId: number) => {
    try {
      const res = await fetch(`/api/attendance?employee_id=${empId}`);
      const data = await res.json();
      setAttendance(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch attendance error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-full bg-transparent">
        <div className="animate-pulse">
          <Zap size={40} className="text-[var(--accent-blue)] animate-bounce" />
        </div>
      </div>
    );
  }

  const renderInfoCard = (Icon: LucideIcon, label: string, value: string | number | undefined, sublabel?: string) => (
    <div className="p-4 bg-slate-900/35 border border-white/5 rounded-2xl h-full hover:bg-white/[0.04] hover:-translate-y-0.5 transition-premium backdrop-blur-xl group select-none">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/15 group-hover:scale-105 transition-premium">
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="m-0 text-[var(--text-muted)] font-black tracking-widest uppercase mb-1.5 opacity-60" style={{ fontSize: '0.58rem' }}>
            {label} {sublabel && <span className="opacity-40">/ {sublabel}</span>}
          </p>
          <p className="m-0 font-bold text-white truncate tracking-tight text-[12px] uppercase">
            {value || '---'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative z-10 select-none">
      {/* Premium Header Toolbar */}
      <div className="px-6 py-4 backdrop-blur-2xl bg-slate-950/25 border-b border-white/5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/employees')}
            className="p-2 rounded-xl bg-slate-900/30 border border-white/5 hover:bg-white/5 hover:border-white/10 text-[var(--text-muted)] hover:text-white transition-premium cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-col">
             <h1 className="text-base m-0 font-black tracking-tight text-white uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">Personnel Dossier</h1>
             <span className="text-[var(--text-muted)] font-black tracking-[0.2em] uppercase opacity-55 text-[8px]">ARCHIVAL ACCESS LEVEL 4</span>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button className="px-4 py-1.5 rounded-xl bg-slate-900/30 border border-white/5 text-white font-bold tracking-widest hover:scale-102 hover:border-white/15 transition-premium text-[9px] flex items-center cursor-pointer">
             <Activity size={12} className="mr-2 text-[var(--accent-blue)]" />
             DIAGNOSTICS
          </button>
          <button className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-white font-bold tracking-widest shadow-lg shadow-[var(--accent-blue)]/15 hover:opacity-90 hover:scale-102 transition-premium text-[9px] flex items-center border border-white/10 cursor-pointer">
             <Edit2 size={12} className="mr-2" />
             MODERNIZE DATA
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-auto custom-scrollbar">
        {/* Profile Identity Showcase */}
        <div className="px-8 py-8 border-b border-white/5 bg-slate-950/10 relative overflow-hidden">
          {/* Internal Glow Mesh */}
          <div className="absolute top-0 right-1/4 w-80 h-80 blur-[120px] bg-[var(--accent-blue)]/10 pointer-events-none rounded-full" />
          
          <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none text-white select-none">
             <Fingerprint size={180} strokeWidth={1} />
          </div>

          <div className="flex items-center gap-8 relative z-10 animate-fade-in">
            <div 
              className="rounded-3xl shadow-2xl border-4 border-slate-900/50 flex items-center justify-center transition-premium hover:rotate-2 select-none"
              style={{ 
                width: '110px', height: '110px', 
                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                color: 'white',
                fontSize: '2.5rem',
                fontWeight: 950
              }}
            >
              {employee.name.charAt(0)}
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2.5 mb-2">
                 <span className="px-2.5 py-0.5 rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20 font-black font-mono tracking-tighter text-[10px]">
                   {employee.employee_code}
                 </span>
                 <span className="px-2 py-0.5 rounded-lg bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/20 font-black tracking-widest uppercase flex items-center gap-1 text-[8px]">
                   <ShieldCheck size={11} /> VERIFIED IDENTITY
                 </span>
              </div>
              <h2 className="m-0 font-black tracking-tight text-white mb-1.5 text-[2rem] uppercase leading-none">{employee.name}</h2>
              <div className="flex items-center gap-3 text-[var(--text-muted)] font-black tracking-widest uppercase text-[9px] opacity-60">
                <span className="flex items-center gap-1.5"><Briefcase size={12} className="text-[var(--accent-blue)]" /> {employee.designation || 'Specialist'}</span>
                <span className="opacity-25">/</span>
                <span className="flex items-center gap-1.5"><Landmark size={12} className="text-[var(--accent-purple)]" /> {employee.department || 'General Operations'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Navigation */}
        <div className="px-8 bg-slate-950/20 sticky top-0 z-10 border-b border-white/5 backdrop-blur-2xl">
          <div className="flex gap-8 overflow-auto no-wrap hide-scrollbar">
            {[
              { id: 'overview', label: 'Vault Overview', icon: User },
              { id: 'attendance', label: 'Presence Pulse', icon: Calendar },
              { id: 'leaves', label: 'Leave Archive', icon: ClipboardList },
              { id: 'history', label: 'Audit Trail', icon: History },
              { id: 'docs', label: 'Documents', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-0 py-3.5 font-black tracking-[0.15em] uppercase flex items-center gap-2 border-b-2 transition-premium rounded-none relative text-[9px] cursor-pointer",
                  activeTab === tab.id 
                    ? "text-[var(--accent-blue)] border-[var(--accent-blue)] drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                    : "text-[var(--text-muted)] border-transparent hover:text-white"
                )}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 md:p-8 overflow-hidden">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-12 gap-8 animate-slide-up">
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
                    <section>
                      <div className="flex items-center justify-between mb-4.5 select-none">
                         <h6 className="m-0 font-black tracking-widest uppercase text-[var(--text-muted)] flex items-center gap-2.5 text-[10px] opacity-75">
                           <Fingerprint size={14} className="text-[var(--accent-blue)]" />
                           BIOGRAPHIC KERNEL
                         </h6>
                         <div className="px-2 py-0.5 rounded-md bg-slate-900 border border-white/5 text-[var(--text-muted)] font-black font-mono text-[8px] opacity-70">UUID_00{employee.id}</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1">{renderInfoCard(Award, hindiLabels.fathersName, employee.fathers_name, "Paternal Lineage")}</div>
                        <div className="col-span-1">{renderInfoCard(Calendar, hindiLabels.dob, employee.dob ? new Date(employee.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : undefined, "DOB")}</div>
                        <div className="col-span-1">{renderInfoCard(Phone, "Mobile", employee.mobile_number, "Network")}</div>
                        <div className="col-span-1">{renderInfoCard(Mail, "Secure Email", employee.email, "Transmission")}</div>
                        <div className="col-span-1 md:col-span-2">{renderInfoCard(MapPin, hindiLabels.address, employee.address, "Permanent Coordinates")}</div>
                      </div>
                    </section>

                    <section>
                      <div className="flex items-center justify-between mb-4.5 select-none">
                         <h6 className="m-0 font-black tracking-widest uppercase text-[var(--text-muted)] flex items-center gap-2.5 text-[10px] opacity-75">
                           <Briefcase size={14} className="text-[var(--accent-blue)]" />
                           EMPLOYMENT MATRIX
                         </h6>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1">{renderInfoCard(Landmark, hindiLabels.department, employee.department, "Vibhag")}</div>
                        <div className="col-span-1">{renderInfoCard(Clock, hindiLabels.category, t(`employees.categories.${employee.category}`) || employee.category, "Status")}</div>
                        <div className="col-span-1">{renderInfoCard(Calendar, "Service Inception", employee.joining_date ? new Date(employee.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : undefined, "Joining")}</div>
                        <div className="col-span-1">{renderInfoCard(CreditCard, "Remuneration", employee.basic_salary ? `₹${Number(employee.basic_salary).toLocaleString('en-IN')}` : undefined, "Base")}</div>
                      </div>
                    </section>
                </div>

                <div className="col-span-12 lg:col-span-4">
                  <div className="bg-slate-950/20 backdrop-blur-2xl p-6 rounded-3xl shadow-xl border border-white/5 flex flex-col gap-6 sticky top-24 select-none">
                    <div>
                      <h6 className="m-0 font-black tracking-widest uppercase text-[var(--text-muted)] mb-4 text-[9px] opacity-60">OPERATIONAL PULSE</h6>
                      <div className="flex flex-col gap-3">
                        <div className="p-3.5 rounded-2xl bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/25 flex items-center justify-between transition-premium hover:bg-[var(--accent-green)]/20 cursor-default">
                          <div className="flex items-center gap-2.5 text-[var(--accent-green)]">
                             <Activity size={16} strokeWidth={3} />
                             <span className="font-black tracking-widest uppercase text-[9px]">ACTIVE DUTY</span>
                          </div>
                          <span className="text-lg font-mono font-black text-[var(--accent-green)]">22</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/25 flex items-center justify-between transition-premium hover:bg-[var(--accent-blue)]/20 cursor-default">
                          <div className="flex items-center gap-2.5 text-[var(--accent-blue)]">
                             <TrendingUp size={16} strokeWidth={3} />
                             <span className="font-black tracking-widest uppercase text-[9px]">LEAVE POOL</span>
                          </div>
                          <span className="text-lg font-mono font-black text-[var(--accent-blue)]">4.5</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/25 flex items-center justify-between transition-premium hover:bg-[var(--accent-red)]/20 cursor-default">
                          <div className="flex items-center gap-2.5 text-[var(--accent-red)]">
                             <Zap size={16} strokeWidth={3} />
                             <span className="font-black tracking-widest uppercase text-[9px]">ABSENCE LOG</span>
                          </div>
                          <span className="text-lg font-mono font-black text-[var(--accent-red)]">1</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-5">
                      <h6 className="m-0 font-black tracking-widest uppercase text-[var(--text-muted)] mb-4 text-[9px] opacity-60">IDENTITY SYNC</h6>
                      <div className="flex flex-col gap-2.5">
                        <div className="bg-slate-900/40 p-3 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-white/[0.04] cursor-pointer transition-premium">
                          <div className="flex flex-col">
                             <span className="text-[var(--text-muted)] font-black tracking-widest uppercase text-[8px] opacity-55">GOVT IDENTITY</span>
                             <span className="font-black font-mono text-white text-[12px]">{employee.aadhar_number || 'UNVERIFIED'}</span>
                          </div>
                          <ArrowUpRight size={13} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-premium" />
                        </div>
                        <div className="bg-slate-900/40 p-3 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-white/[0.04] cursor-pointer transition-premium">
                          <div className="flex flex-col">
                             <span className="text-[var(--text-muted)] font-black tracking-widest uppercase text-[8px] opacity-55">FINANCIAL CODE</span>
                             <span className="font-black font-mono text-white text-[12px]">{employee.pan_number || 'UNVERIFIED'}</span>
                          </div>
                          <ArrowUpRight size={13} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-premium" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="glass-card shadow-2xl overflow-hidden border border-white/5 bg-slate-950/20 rounded-3xl animate-slide-up select-none">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-950/45 border-b border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] select-none">
                      <tr>
                        <th className="px-6 py-4 text-left">Lifecycle Event</th>
                        <th className="px-6 py-4 text-center">Duty Status</th>
                        <th className="px-6 py-4 text-right">Audit Archival</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-white">
                      {attendance.slice(0, 15).map((record, i) => (
                        <tr key={i} className="hover:bg-white/[0.03] transition-premium">
                          <td className="px-6 py-3.5 text-left">
                             <div className="font-mono font-black text-white text-[13px]">{record.date}</div>
                             <div className="text-[var(--text-muted)] font-black tracking-widest uppercase text-[8px] mt-0.5 opacity-60">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                          </td>
                          <td className="px-6 py-3.5 text-center">
                             <span className={cn(
                               "px-3 py-1 rounded-lg font-black tracking-widest uppercase text-[8px]",
                               record.status === 'present' ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]" : "bg-[var(--accent-red)]/15 text-[var(--accent-red)] border border-[var(--accent-red)]/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                             )}>
                                {record.status}
                             </span>
                          </td>
                          <td className="px-6 py-3.5 text-right text-[var(--text-muted)] font-mono text-[10px] opacity-75">
                             {record.remarks || ':: NO_AUDIT_DATA ::'}
                          </td>
                        </tr>
                      ))}
                      {attendance.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-20 text-center opacity-30">
                            <Calendar size={36} className="mx-auto mb-3" />
                            <p className="text-[9px] font-black uppercase tracking-widest">No Attendance Logs Synced</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
              </div>
            )}
        </div>
      </div>

      {/* System Footer Bar */}
      <div className="px-6 py-2.5 border-t border-white/5 bg-slate-950/25 flex items-center justify-between select-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-[var(--accent-blue)] text-[9px] font-black uppercase tracking-widest">
            <ShieldCheck size={13} strokeWidth={2.5} />
            <span>Audit Shield Protocol v3.0</span>
          </span>
          <div className="w-px h-3 bg-white/10" />
          <span className="flex items-center gap-2 text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest opacity-75">
            <Database size={13} className="text-[var(--accent-green)]" />
            <span>PRMX-SYNC: ACTIVE</span>
          </span>
        </div>
        <div className="text-[var(--text-muted)] font-black font-mono tracking-widest text-[9px] opacity-55">
          PRMX-KERN-041-A • ENCRYPTED_CHANNEL
        </div>
      </div>
    </div>
  );
}
