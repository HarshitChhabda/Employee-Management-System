import React from 'react';
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
  ShieldCheck,
  CheckCircle2,
  Banknote,
  AlertTriangle,
  Fingerprint
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { hindiLabels, categories as categoryOptions } from '@/lib/hindiLabels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmployeeFormProps {
  formData: any;
  setFormData: (data: any) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  editingEmployee: any;
  error: string | null;
}

export const EmployeeForm = ({
  formData,
  setFormData,
  activeTab,
  setActiveTab,
  onSubmit,
  submitting,
  editingEmployee,
  error
}: EmployeeFormProps) => {
  const { t } = useLanguage();

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const tabs = [
    { id: 'personal', label: t('employees.personalDetails'), icon: User },
    { id: 'employment', label: t('employees.officialDetails'), icon: Briefcase },
    { id: 'financial', label: 'Financial Portfolio', icon: Landmark },
    { id: 'identity', label: 'Identity/Auth', icon: ShieldCheck }
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] rounded-3xl overflow-hidden">
      {/* Premium Header */}
      <div className="p-8 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-blue)] text-white flex items-center justify-center shadow-lg shadow-[var(--accent-blue)]/20">
            {editingEmployee ? <Fingerprint size={32} /> : <User size={32} />}
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight m-0">
              {editingEmployee ? 'Commit Profile Update' : 'Initialize Personnel Profile'}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">
              <span className="opacity-60">{editingEmployee ? `Editing: ${editingEmployee.name}` : 'Establishing new registry entry'}</span>
              <span className="opacity-20">•</span>
              <span className="text-[var(--accent-blue)]">Operational Protocol v4.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Matrix */}
      <div className="px-8 bg-[var(--bg-secondary)]/50 border-b border-[var(--border-primary)] flex gap-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2.5 py-5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all outline-none",
              activeTab === tab.id 
                ? "border-[var(--accent-blue)] text-[var(--accent-blue)]" 
                : "border-transparent text-[var(--text-muted)] opacity-40 hover:opacity-100"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form Context Workspace */}
      <div className="flex-grow p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 flex items-center gap-4">
            <AlertTriangle size={20} className="text-[var(--accent-red)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-red)]">{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} id="employee-form" className="grid grid-cols-2 gap-8">
          {activeTab === 'personal' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Legal Name</label>
                <Input 
                  value={formData.name || ''}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="Enter full name"
                  required
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{hindiLabels.fathersName}</label>
                <Input 
                  value={formData.fathers_name || ''}
                  onChange={e => handleChange('fathers_name', e.target.value)}
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{hindiLabels.dob}</label>
                <Input 
                  type="date"
                  value={formData.dob || ''}
                  onChange={e => handleChange('dob', e.target.value)}
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Mobile Network</label>
                <Input 
                  type="tel"
                  value={formData.mobile_number || ''}
                  onChange={e => handleChange('mobile_number', e.target.value)}
                  required
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl font-mono"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{hindiLabels.address}</label>
                <Input 
                  value={formData.address || ''}
                  onChange={e => handleChange('address', e.target.value)}
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl"
                />
              </div>
            </>
          )}

          {activeTab === 'employment' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Operational Classification</label>
                <Select 
                  value={formData.category || 'daily_wage'}
                  onChange={e => handleChange('category', e.target.value)}
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl"
                >
                  {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.labelHi || c.value}</option>)}
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Onboarding Cycle</label>
                <Input 
                  type="date"
                  value={formData.joining_date || ''}
                  onChange={e => handleChange('joining_date', e.target.value)}
                  required
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Department Cluster</label>
                <Input 
                  value={formData.department || ''}
                  onChange={e => handleChange('department', e.target.value)}
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Role Designation</label>
                <Input 
                  value={formData.designation || ''}
                  onChange={e => handleChange('designation', e.target.value)}
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl"
                />
              </div>
              {editingEmployee && formData.category !== editingEmployee.category && (
                <div className="col-span-2 p-4 rounded-2xl bg-[var(--accent-orange)]/5 border border-[var(--accent-orange)]/20">
                    <p className="text-[var(--accent-orange)] font-black text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <AlertTriangle size={14} />
                      Classification Shift Authorization Required
                    </p>
                    <textarea 
                      className="w-full bg-[var(--bg-tertiary)]/50 border border-[var(--border-primary)] rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--accent-blue)]/30 text-[var(--text-primary)]"
                      placeholder="Specify reason for re-classification..."
                      value={formData.category_change_reason || ''}
                      onChange={e => handleChange('category_change_reason', e.target.value)}
                      required
                      rows={2}
                    />
                </div>
              )}
            </>
          )}

          {activeTab === 'financial' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Remuneration Logic</label>
                <Input 
                  type="number"
                  value={formData.basic_salary || ''}
                  onChange={e => handleChange('basic_salary', e.target.value)}
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Banking Institution</label>
                <Input 
                  value={formData.bank_name || ''}
                  onChange={e => handleChange('bank_name', e.target.value)}
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Account Matrix</label>
                <Input 
                  value={formData.account_number || ''}
                  onChange={e => handleChange('account_number', e.target.value)}
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Clearing Code (IFSC)</label>
                <Input 
                  value={formData.ifsc_code || ''}
                  onChange={e => handleChange('ifsc_code', e.target.value)}
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl font-mono uppercase"
                />
              </div>
            </>
          )}

          {activeTab === 'identity' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">AADHAR Matrix</label>
                <Input 
                  value={formData.aadhar_number || ''}
                  onChange={e => handleChange('aadhar_number', e.target.value)}
                  required
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">PAN Hash</label>
                <Input 
                  value={formData.pan_number || ''}
                  onChange={e => handleChange('pan_number', e.target.value)}
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl font-mono uppercase"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">EPF UAN Reference</label>
                <Input 
                  value={formData.epf_uan_number || ''}
                  onChange={e => handleChange('epf_uan_number', e.target.value)}
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Provident Fund Code</label>
                <Input 
                  value={formData.pf_number || ''}
                  onChange={e => handleChange('pf_number', e.target.value)}
                  className="h-12 bg-[var(--bg-tertiary)]/50 rounded-xl font-mono"
                />
              </div>
            </>
          )}
        </form>
      </div>

      {/* Action Footer */}
      <div className="p-8 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
        <div className="flex items-center gap-3 text-[var(--text-muted)] opacity-40">
          <ShieldCheck size={16} />
          <span className="text-[9px] font-black uppercase tracking-widest">Audit Secure Transaction Mode</span>
        </div>
        <div className="flex gap-4">
          <Button 
            variant="primary"
            size="lg"
            form="employee-form"
            type="submit"
            disabled={submitting}
            className="rounded-2xl px-10 h-14 shadow-lg shadow-[var(--accent-blue)]/20"
          >
            {submitting ? <Clock className="animate-spin" /> : <CheckCircle2 />}
            <span className="font-black text-[11px] uppercase tracking-widest">{editingEmployee ? 'Commit Changes' : 'Establish Profile'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
