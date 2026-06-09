import { useState, useEffect } from 'react';
import { 
  Building2, Briefcase, Plus, Trash2, ShieldAlert, Sparkles, Layers,
  CloudLightning, Database, Eye, Check, AlertCircle, RefreshCcw,
  Package, HardDrive, Cloud, Download, Upload, FolderOpen,
  Sliders
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuthStore } from '@/stores/authStore';
import { masterAPI, updateAPI } from '../services/api';
  import UserManager from './settings/UserManager';
import PagePermissionManager from './settings/PagePermissionManager';

interface MasterItem {
  id: string;
  name: string;
  created_at?: string;
}

interface BackupItem {
  filename: string;
  absolutePath: string;
  sizeBytes: number;
  createdAt: string;
}

export default function MasterSettings() {
  const { t, language } = useLanguage();
  const { session } = useAuthStore();
  const isSuperAdmin = session?.role === 'ROLE_SUPER';
  const isHOAdmin = session?.role === 'ROLE_HO';
  const isReadOnly = false; // Super Admin has full write access now
  const isSyncConfigLocked = true;

  // Tab State: 'masters' | 'sync' | 'backups' | 'visibility' | 'users' | 'danger' | 'updates' | 'permissions'
  const [activeTab, setActiveTab] = useState<'masters' | 'sync' | 'backups' | 'visibility' | 'users' | 'danger' | 'updates' | 'permissions'>('masters');

  // Masters State
  const [departments, setDepartments] = useState<MasterItem[]>([]);
  const [designations, setDesignations] = useState<MasterItem[]>([]);
  const [newDept, setNewDept] = useState('');
  const [newDesig, setNewDesig] = useState('');
  const [loadingMasters, setLoadingMasters] = useState(true);

  // Sync State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Backups State
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);

  // Updates State
  const [updates, setUpdates] = useState<any[]>([]);
  const [pendrivePath, setPendrivePath] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<{ local: boolean; supabase: boolean } | null>(null);

  // General Notification Message
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchMasters();
    loadSyncConfig();
    fetchBackups();
    fetchUpdates();
  }, []);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  // ─── Masters Panel logic ───
  const fetchMasters = async () => {
    setLoadingMasters(true);
    try {
      const data = await masterAPI.getAll();
      setDepartments(Array.isArray(data.departments) ? data.departments : []);
      setDesignations(Array.isArray(data.designations) ? data.designations : []);
    } catch (err) {
      console.error('Error fetching masters:', err);
    } finally {
      setLoadingMasters(false);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      showMsg(language === 'hi' ? 'त्रुटि: केवल पढ़ने का अधिकार' : 'Error: Super Admin is Read-Only', 'error');
      return;
    }
    const name = newDept.trim();
    if (!name) return;

    if (departments.some(d => d.name.toLowerCase() === name.toLowerCase())) {
      showMsg('Department already exists / यह विभाग पहले से मौजूद है', 'error');
      return;
    }

    try {
      await masterAPI.createDepartment(name);
      showMsg('Department added successfully / विभाग सफलतापूर्वक जोड़ा गया');
      setNewDept('');
      fetchMasters();
      window.dispatchEvent(new Event('mastersUpdated'));
    } catch (err) {
      console.error(err);
      showMsg('Failed to add department / विभाग जोड़ने में विफल', 'error');
    }
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (isReadOnly) {
      showMsg(language === 'hi' ? 'त्रुटि: केवल पढ़ने का अधिकार' : 'Error: Super Admin is Read-Only', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to delete department: ${name}? / क्या आप वाकई इस विभाग को हटाना चाहते हैं?`)) return;
    try {
      await masterAPI.deleteDepartment(id);
      showMsg('Department deleted / विभाग हटा दिया गया');
      fetchMasters();
      window.dispatchEvent(new Event('mastersUpdated'));
    } catch (err) {
      console.error(err);
      showMsg('Error deleting department', 'error');
    }
  };

  const handleAddDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      showMsg(language === 'hi' ? 'त्रुटि: केवल पढ़ने का अधिकार' : 'Error: Super Admin is Read-Only', 'error');
      return;
    }
    const name = newDesig.trim();
    if (!name) return;

    if (designations.some(d => d.name.toLowerCase() === name.toLowerCase())) {
      showMsg('Designation already exists / यह पदनाम पहले से मौजूद है', 'error');
      return;
    }

    try {
      await masterAPI.createDesignation(name);
      showMsg('Designation added successfully / पदनाम सफलतापूर्वक जोड़ा गया');
      setNewDesig('');
      fetchMasters();
      window.dispatchEvent(new Event('mastersUpdated'));
    } catch (err) {
      console.error(err);
      showMsg('Failed to add designation / पदनाम जोड़ने में विफल', 'error');
    }
  };

  const handleDeleteDesignation = async (id: string, name: string) => {
    if (isReadOnly) {
      showMsg(language === 'hi' ? 'त्रुटि: केवल पढ़ने का अधिकार' : 'Error: Super Admin is Read-Only', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to delete designation: ${name}? / क्या आप वाकई इस पदनाम को हटाना चाहते हैं?`)) return;
    try {
      await masterAPI.deleteDesignation(id);
      showMsg('Designation deleted / पदनाम हटा दिया गया');
      fetchMasters();
      window.dispatchEvent(new Event('mastersUpdated'));
    } catch (err) {
      console.error(err);
      showMsg('Error deleting designation', 'error');
    }
  };

  // ─── Supabase Sync logic ───
  const loadSyncConfig = async () => {
    // @ts-ignore
    if (window.electronAPI) {
      // @ts-ignore
      const res = await window.electronAPI.invoke('api:sync:load-config') as any;
      if (res && res.success && res.config) {
        setSupabaseUrl(res.config.url || '');
        setSupabaseAnonKey(res.config.key || '');
      }
    }
  };

  const handleSaveSyncConfig = async () => {
    if (isReadOnly) {
      showMsg(language === 'hi' ? 'त्रुटि: केवल पढ़ने का अधिकार' : 'Error: Super Admin is Read-Only', 'error');
      return;
    }
    // @ts-ignore
    if (window.electronAPI) {
      // @ts-ignore
      const res = await window.electronAPI.invoke('api:sync:save-config', { url: supabaseUrl, anonKey: supabaseAnonKey }) as any;
      if (res && res.success) {
        showMsg('Supabase cloud config saved and encrypted / Supabase कॉन्फ़िगरेशन सुरक्षित रूप से सहेजा गया');
      } else {
        showMsg('Failed to save config / कॉन्फ़िगरेशन सहेजने में विफल', 'error');
      }
    }
  };

  const handleManualSync = async () => {
    if (isReadOnly || !session) {
      showMsg(language === 'hi' ? 'त्रुटि: केवल पढ़ने का अधिकार' : 'Error: Super Admin is Read-Only', 'error');
      return;
    }
    setSyncLoading(true);
    setSyncStatus(language === 'hi' ? 'सिंक इंजन शुरू हो रहा है...' : 'Triggering sync engine delta processing...');
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.invoke('api:sync:trigger', session) as any;
        if (res && res.success) {
          const pushMsg = res.pushCount ? `${res.pushCount} pushed` : '';
          const pullMsg = res.pullCount ? `${res.pullCount} pulled` : '';
          const detail = [pushMsg, pullMsg].filter(Boolean).join(', ');
          showMsg(language === 'hi' ? `सफलता: ${detail} रिकॉर्ड्स सिंक किए गए` : `Sync Success: ${detail} records processed`);
          setSyncStatus(language === 'hi' ? 'सिंक पूरा हुआ!' : 'Sync completed successfully.');
        } else {
          showMsg(res?.error || 'Sync failed', 'error');
          setSyncStatus(`Sync Error: ${res?.error || 'Unknown'}`);
        }
      }
    } catch (e: any) {
      showMsg('Sync process failed', 'error');
      setSyncStatus(`Exception: ${e.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // ─── Backup Panel logic ───
  const fetchBackups = async () => {
    // @ts-ignore
    if (window.electronAPI) {
      // @ts-ignore
      const list = await window.electronAPI.invoke('api:backup:list') as any;
      setBackups(Array.isArray(list) ? list : []);
    }
  };

  const handleCreateBackup = async () => {
    if (isReadOnly) {
      showMsg(language === 'hi' ? 'त्रुटि: केवल पढ़ने का अधिकार' : 'Error: Super Admin is Read-Only', 'error');
      return;
    }
    setBackupLoading(true);
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const res = await window.electronAPI.invoke('api:backup:create') as any;
        if (res && res.success) {
          showMsg(language === 'hi' ? 'रोलिंग डेटाबेस बैकअप सफलतापूर्वक बनाया गया' : 'Rotating database backup snapshot created successfully');
          fetchBackups();
        } else {
          showMsg('Backup failed to create', 'error');
        }
      }
    } catch (e) {
      showMsg('Backup creation failed', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (filename: string, absolutePath: string) => {
    if (isReadOnly) {
      showMsg(language === 'hi' ? 'त्रुटि: केवल पढ़ने का अधिकार' : 'Error: Super Admin is Read-Only', 'error');
      return;
    }
    if (!confirm(language === 'hi' 
      ? `चेतावनी: क्या आप वाकई ${filename} रीस्टोर करना चाहते हैं? इससे वर्तमान डेटा अधिलेखित हो जाएगा। रीस्टोर करने से पहले सुरक्षा बैकअप लिया जाएगा।`
      : `CAUTION: Are you sure you want to restore ${filename}? Current database state will be overwritten. A safety backup will be created first.`
    )) return;

    setBackupLoading(true);
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const res = await window.electronAPI.invoke('api:backup:restore', absolutePath) as any;
        if (res && res.success) {
          showMsg(language === 'hi' ? 'डेटाबेस सफलतापूर्वक रीस्टोर हुआ!' : 'Database successfully restored!');
          fetchBackups();
        } else {
          showMsg(res?.error || 'Restore failed', 'error');
        }
      }
    } catch (e: any) {
      showMsg('Restore failed', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  // ─── Update Panel Logic ───
  const fetchUpdates = async () => {
    try {
      const res = await updateAPI.list();
      if (res && res.success) {
        setUpdates(res.updates || []);
      }
    } catch (err) {
      console.error('Error fetching updates:', err);
    }
  };

  const handleCheckUpdates = async () => {
    setUpdateLoading(true);
    setCheckResult(null);
    try {
      const res = await updateAPI.check();
      if (res && res.success) {
        setCheckResult({ local: res.local, supabase: res.supabase });
        if (res.updates.length > 0) {
          setUpdates(prev => {
            const existingVersions = new Set(prev.map(u => u.version));
            const newOnes = res.updates.filter(u => !existingVersions.has(u.version));
            return [...newOnes, ...prev];
          });
        }
        if (!res.local && !res.supabase) {
          showMsg(language === 'hi' ? 'कोई अपडेट उपलब्ध नहीं' : 'No updates available', 'success');
        } else {
          showMsg(language === 'hi' ? `${res.updates.length} अपडेट मिले` : `${res.updates.length} update(s) found`, 'success');
        }
      }
    } catch (err) {
      showMsg('Failed to check updates', 'error');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleScanPendrive = async () => {
    if (!pendrivePath.trim()) {
      showMsg(language === 'hi' ? 'कृपया ड्राइव पथ दर्ज करें' : 'Please enter a drive path', 'error');
      return;
    }
    setUpdateLoading(true);
    try {
      const res = await updateAPI.scanPendrive(pendrivePath.trim());
      if (res && res.success) {
        if (res.updates.length > 0) {
          for (const mf of res.updates) {
            const regRes = await updateAPI.register({
              version: mf.version,
              title: mf.title,
              description: mf.description,
              source: 'pendrive',
              file_path: mf.file_path,
              file_size: mf.file_size || 0,
              checksum: mf.checksum || '',
              module_scope: mf.module_scope || 'all',
            });
            if (regRes && regRes.success) {
              showMsg(language === 'hi' ? `${mf.version} पंजीकृत हुआ` : `${mf.version} registered`, 'success');
            }
          }
          fetchUpdates();
        } else {
          showMsg(language === 'hi' ? 'कोई अपडेट मैनिफेस्ट नहीं मिला' : 'No update manifests found', 'error');
        }
      } else {
        showMsg(res?.error || 'Scan failed', 'error');
      }
    } catch (err) {
      showMsg('Failed to scan pendrive', 'error');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSyncSupabase = async () => {
    setUpdateLoading(true);
    try {
      const res = await updateAPI.syncFromSupabase();
      if (res && res.success) {
        showMsg(language === 'hi' ? `${res.count} अपडेट सिंक हुए` : `${res.count} update(s) synced from Supabase`, 'success');
        fetchUpdates();
      } else {
        showMsg(res?.error || 'Sync failed', 'error');
      }
    } catch (err) {
      showMsg('Failed to sync from Supabase', 'error');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleInstallUpdate = async (updateId: string) => {
    if (!confirm(language === 'hi'
      ? 'क्या आप इस अपडेट को इंस्टॉल करना चाहते हैं? एप्लिकेशन पुनः प्रारंभ हो सकता है।'
      : 'Are you sure you want to install this update? The application may restart.'
    )) return;

    setUpdateLoading(true);
    try {
      const res = await updateAPI.install(updateId);
      if (res && res.success) {
        showMsg(language === 'hi' ? 'अपडेट सफलतापूर्वक इंस्टॉल हुआ' : 'Update installed successfully', 'success');
        fetchUpdates();
      } else {
        showMsg(res?.error || 'Install failed', 'error');
      }
    } catch (err) {
      showMsg('Failed to install update', 'error');
    } finally {
      setUpdateLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      available: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      installing: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse',
      installed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return styles[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  // ─── Danger Zone Logic ───
  const [nukeLoading, setNukeLoading] = useState(false);
  
  const handleNukeDatabase = async () => {
    if (!isSuperAdmin) {
      showMsg('Access Denied', 'error');
      return;
    }
    
    const confirm1 = confirm('WARNING: Are you sure you want to DELETE ALL DATA from the database? This is for testing only!');
    if (!confirm1) return;
    
    const confirm2 = confirm('FINAL WARNING: This will clear SQLite and Supabase business data. Proceed?');
    if (!confirm2) return;
    
    setNukeLoading(true);
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const res = await window.electronAPI.invoke('api:nuke-database', session) as any;
        if (res && res.success) {
          showMsg('DATABASE NUKED SUCCESSFULLY!', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          showMsg(res?.error || 'Failed to nuke database', 'error');
        }
      }
    } catch (e: any) {
      showMsg('Error nuking database', 'error');
    } finally {
      setNukeLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      {/* Header card with glassmorphism */}
      <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-xl relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-[200px] h-[200px] bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                {language === 'hi' ? 'सिस्टम सेटिंग्स' : 'System Settings Hub'}
              </h1>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] mt-1 uppercase tracking-widest font-mono">
                {language === 'hi' ? 'संगठन मास्टर्स, सिंक एवं बैकअप प्रबंधन' : 'Configure Organization, Cloud Sync, and Rotating Backups'}
              </p>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('masters')}
              role="tab"
              aria-selected={activeTab === 'masters'}
              className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                activeTab === 'masters' ? 'bg-blue-500 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {language === 'hi' ? 'मास्टर्स' : 'Masters'}
            </button>
            <button
              onClick={() => setActiveTab('sync')}
              role="tab"
              aria-selected={activeTab === 'sync'}
              className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                activeTab === 'sync' ? 'bg-blue-500 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {language === 'hi' ? 'क्लाउड सिंक' : 'Cloud Sync'}
            </button>
            <button
              onClick={() => setActiveTab('backups')}
              role="tab"
              aria-selected={activeTab === 'backups'}
              className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                activeTab === 'backups' ? 'bg-blue-500 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {language === 'hi' ? 'बैकअप' : 'Backups'}
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('visibility')}
                role="tab"
                aria-selected={activeTab === 'visibility'}
                className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'visibility' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow' : 'text-purple-400 hover:text-purple-300'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>{language === 'hi' ? 'दृश्यता' : 'Visibility'}</span>
              </button>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('permissions')}
                role="tab"
                aria-selected={activeTab === 'permissions'}
                className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'permissions' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow' : 'text-purple-400 hover:text-purple-300'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>{language === 'hi' ? 'अनुमतियां' : 'Permissions'}</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('users')}
              role="tab"
              aria-selected={activeTab === 'users'}
              className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                activeTab === 'users' ? 'bg-blue-500 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {language === 'hi' ? 'उपयोगकर्ता' : 'Users'}
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              role="tab"
              aria-selected={activeTab === 'updates'}
              className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'updates' ? 'bg-emerald-500 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Package className="w-3 h-3" />
              <span>{language === 'hi' ? 'अपडेट' : 'Updates'}</span>
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('danger')}
                role="tab"
                aria-selected={activeTab === 'danger'}
                className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'danger' ? 'bg-red-600 text-white shadow' : 'text-red-400 hover:text-red-300'
                }`}
              >
                <AlertCircle className="w-3 h-3" />
                <span>{language === 'hi' ? 'खतरा क्षेत्र' : 'Danger Zone'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Read only Warning Banner */}
      {isReadOnly && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center gap-3 font-bold animate-fade-in shadow-sm">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 animate-bounce" />
          <span className="text-xs uppercase tracking-wider font-mono">
            {language === 'hi' 
              ? 'सुपर एडमिन मोड: केवल पढ़ने की अनुमति है। सभी संपादन क्रियाएं अक्षम हैं।' 
              : 'Super Admin Mode: Strictly Read-Only. All creation, deletion, sync and recovery edits are locked.'
            }
          </span>
        </div>
      )}

      {/* Notification Message */}
      {message && (
        <div className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all animate-fade-in shadow-md ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border border-red-500/30 text-red-500'
        }`}>
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Tab Contents */}
      <div className="transition-all duration-300">
        
        {/* MASTERS TAB */}
        {activeTab === 'masters' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Department Panel */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-xl overflow-hidden flex flex-col h-[520px]">
              <div className="p-5 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-500">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wide">
                      {language === 'hi' ? 'विभाग (Departments)' : 'Departments'}
                    </h2>
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] font-mono">Total: {departments.length}</p>
                  </div>
                </div>
              </div>

              {!isReadOnly && (
                <form onSubmit={handleAddDepartment} className="p-4 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)] flex gap-2">
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    placeholder={language === 'hi' ? 'नया विभाग दर्ज करें...' : 'Enter department...'}
                    className="flex-grow px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('common.addNew')}</span>
                  </button>
                </form>
              )}

              <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-2">
                {loadingMasters ? (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] font-bold">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <span>Loading...</span>
                  </div>
                ) : departments.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-bold">{t('common.noData')}</div>
                ) : (
                  departments.map((dept) => (
                    <div key={dept.id} className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl flex items-center justify-between group">
                      <span className="font-black text-xs text-[var(--text-primary)]">{dept.name}</span>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                          aria-label={`Delete ${dept.name}`}
                          className="w-7 h-7 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Designation Panel */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-xl overflow-hidden flex flex-col h-[520px]">
              <div className="p-5 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-500">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wide">
                      {language === 'hi' ? 'पदनाम (Designations)' : 'Designations'}
                    </h2>
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] font-mono">Total: {designations.length}</p>
                  </div>
                </div>
              </div>

              {!isReadOnly && (
                <form onSubmit={handleAddDesignation} className="p-4 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)] flex gap-2">
                  <input
                    type="text"
                    value={newDesig}
                    onChange={(e) => setNewDesig(e.target.value)}
                    placeholder={language === 'hi' ? 'नया पदनाम दर्ज करें...' : 'Enter designation...'}
                    className="flex-grow px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('common.addNew')}</span>
                  </button>
                </form>
              )}

              <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-2">
                {loadingMasters ? (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] font-bold">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <span>Loading...</span>
                  </div>
                ) : designations.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-bold">{t('common.noData')}</div>
                ) : (
                  designations.map((desig) => (
                    <div key={desig.id} className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl flex items-center justify-between group">
                      <span className="font-black text-xs text-[var(--text-primary)]">{desig.name}</span>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleDeleteDesignation(desig.id, desig.name)}
                          aria-label={`Delete ${desig.name}`}
                          className="w-7 h-7 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* CLOUD SYNC TAB */}
        {activeTab === 'sync' && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-xl p-6 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3.5 pb-4 border-b border-[var(--border-primary)]">
              <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-500">
                <CloudLightning className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h2 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wide">
                  {language === 'hi' ? 'Supabase क्लाउड सिंक सेटिंग्स' : 'Supabase Cloud Sync settings'}
                </h2>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] font-mono">Centralized Sync Config & Trigger Panel</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 max-w-2xl">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">Supabase Project URL</label>
                <input
                  type="text"
                  disabled={true}
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://yourprojectid.supabase.co"
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-blue-500 opacity-60 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">Supabase Anon Key</label>
                <input
                  type="password"
                  disabled={true}
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-blue-500 opacity-60 cursor-not-allowed"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 max-w-2xl">
                <div className="flex items-center gap-2 text-amber-500">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider">
                    {language === 'hi' ? 'सुरक्षा: Supabase कॉन्फ़िगरेशन लॉक है — संपादन अक्षम' : 'Security: Supabase configuration is locked — editing disabled'}
                  </span>
                </div>
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-3.5 pt-3">
                  <button
                    onClick={handleManualSync}
                    disabled={syncLoading}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/40 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                    <span>Sync Now</span>
                  </button>
                </div>
              )}
            </div>

            {isSuperAdmin && syncStatus && (
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] max-w-2xl font-mono text-[10px] text-slate-400 font-bold space-y-1">
                <div className="text-blue-500 uppercase tracking-widest text-[8px] font-mono font-black">Sync Engine Trace Logs</div>
                <div className="mt-1">{syncStatus}</div>
              </div>
            )}
          </div>
        )}

        {/* BACKUPS TAB */}
        {activeTab === 'backups' && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-xl p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-primary)] gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-500">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wide">
                    {language === 'hi' ? 'रोलिंग डेटाबेस बैकअप और रीस्टोर' : 'Rolling Database Snapshot backups'}
                  </h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] font-mono">Max 3 Rotating Backups. Safety Snapshot Saved Pre-Recovery.</p>
                </div>
              </div>

              {!isReadOnly && (
                <button
                  onClick={handleCreateBackup}
                  disabled={backupLoading}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Backup Now</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {backupLoading && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl text-xs font-bold animate-pulse">
                  Snapshot backup operations in progress... Please wait.
                </div>
              )}

              {backups.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-bold font-mono text-xs">NO LOCAL ROTATING BACKUPS FOUND / कोई बैकअप नहीं मिला</div>
              ) : (
                backups.map((bak, idx) => (
                  <div key={bak.filename} className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-blue-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-slate-400 font-black font-mono text-xs flex-shrink-0 shadow-sm border border-[var(--border-primary)]">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-[var(--text-primary)] truncate font-mono">{bak.filename}</div>
                        <div className="text-[9px] font-bold text-[var(--text-secondary)] font-mono mt-1">
                          Size: {(bak.sizeBytes / 1024).toFixed(1)} KB • Created: {new Date(bak.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {!isReadOnly && (
                      <button
                        onClick={() => handleRestoreBackup(bak.filename, bak.absolutePath)}
                        disabled={backupLoading}
                        className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-500 hover:shadow-lg disabled:opacity-40 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer flex-shrink-0"
                      >
                        Restore Snapshot
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VISIBILITY TAB */}
        {activeTab === 'visibility' && isSuperAdmin && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-xl p-6 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3.5 pb-4 border-b border-[var(--border-primary)]">
              <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-500">
                <Eye className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-black text-purple-400 uppercase tracking-wide">
                  {language === 'hi' ? 'सुपर एडमिन दृश्यता कॉन्फिगरेटर' : 'Super Admin Visibility Configurator'}
                </h2>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] font-mono">Configure custom dynamic tab visibilities across roles.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 max-w-2xl space-y-3">
              <div className="text-[11px] font-black text-purple-400 uppercase tracking-wide font-mono">Dynamic Settings Configuration Lock</div>
              <p className="text-[10.5px] font-bold text-slate-400 leading-relaxed font-sans">
                {language === 'hi'
                  ? 'दृश्यता कॉन्फ़िगरेशन लॉक है। शाखा व्यवस्थापक (माहवीर जी) केवल शाखा रिकॉर्ड और उपस्थिति देख सकते हैं। हेड ऑफिस व्यवस्थापक दोनों स्थानों के रिकॉर्ड देख सकते हैं।'
                  : 'Visibility settings are locked under default HRMS core. Branch Admin (Mahaveer Ji) only loads entity="BRANCH" scopes. Head Office loader reads both HO & BRANCH scopes.'
                }
              </p>
              <div className="flex items-center gap-1.5 text-[9px] font-black font-mono text-purple-400 uppercase pt-2">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Default secure matrices loaded & enforced.</span>
              </div>
            </div>
          </div>
        )}
        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="animate-fade-in">
            <UserManager />
          </div>
        )}

        {/* UPDATES TAB */}
        {activeTab === 'updates' && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-xl p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-primary)] gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wide">
                    {language === 'hi' ? 'ऐप अपडेट' : 'App Updates'}
                  </h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] font-mono">
                    {language === 'hi' ? 'पेनड्राइव या सुपरबेस से अपडेट प्रबंधित करें' : 'Manage updates from pendrive or Supabase'}
                  </p>
                </div>
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleCheckUpdates}
                    disabled={updateLoading}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/40 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${updateLoading ? 'animate-spin' : ''}`} />
                    <span>{language === 'hi' ? 'अपडेट जांचें' : 'Check Updates'}</span>
                  </button>
                  <button
                    onClick={handleSyncSupabase}
                    disabled={updateLoading}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/40 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>{language === 'hi' ? 'Supabase से सिंक' : 'Sync Supabase'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Pendrive Scan */}
            {!isReadOnly && (
              <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <HardDrive className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-wide">
                    {language === 'hi' ? 'पेनड्राइव / लोकल स्कैन' : 'Pendrive / Local Scan'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pendrivePath}
                    onChange={(e) => setPendrivePath(e.target.value)}
                    placeholder={language === 'hi' ? 'ड्राइव पथ दर्ज करें (जैसे D:\ या E:\hrms-update)' : 'Enter drive path (e.g. D:\ or E:\hrms-update)'}
                    className="flex-grow px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    onClick={handleScanPendrive}
                    disabled={updateLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/40 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer flex-shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{language === 'hi' ? 'स्कैन करें' : 'Scan'}</span>
                  </button>
                </div>
                <p className="text-[9px] font-mono text-[var(--text-secondary)] font-bold">
                  {language === 'hi'
                    ? 'पेनड्राइव की रूट डायरेक्टरी में .hrms-update.json फ़ाइल होनी चाहिए जिसमें अपडेट मैनिफेस्ट हो।'
                    : 'The drive root must contain a .hrms-update.json file with the update manifest.'}
                </p>
              </div>
            )}

            {/* Check Result Summary */}
            {checkResult && (
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-xl border ${
                  checkResult.local
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                    : 'bg-slate-500/5 border-slate-500/10 text-slate-400'
                }`}>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    <span className="text-xs font-black uppercase">
                      {language === 'hi' ? 'स्थानीय डीबी' : 'Local DB'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold font-mono mt-1 block">
                    {checkResult.local
                      ? (language === 'hi' ? 'अपडेट उपलब्ध' : 'Updates available')
                      : (language === 'hi' ? 'कोई अपडेट नहीं' : 'No updates')}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${
                  checkResult.supabase
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
                    : 'bg-slate-500/5 border-slate-500/10 text-slate-400'
                }`}>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4" />
                    <span className="text-xs font-black uppercase">
                      {language === 'hi' ? 'सुपरबेस' : 'Supabase'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold font-mono mt-1 block">
                    {checkResult.supabase
                      ? (language === 'hi' ? 'अपडेट उपलब्ध' : 'Updates available')
                      : (language === 'hi' ? 'कोई अपडेट नहीं' : 'No updates')}
                  </span>
                </div>
              </div>
            )}

            {/* Updates List */}
            <div className="space-y-3">
              {updates.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-bold font-mono text-xs">
                  {language === 'hi' ? 'कोई अपडेट उपलब्ध नहीं' : 'No updates available'}
                </div>
              ) : (
                updates.map((upd, idx) => (
                  <div key={upd.id || idx} className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-slate-400 font-black font-mono text-xs flex-shrink-0 shadow-sm border border-[var(--border-primary)]">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-[var(--text-primary)] truncate">{upd.title || upd.version}</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black font-mono border ${getStatusBadge(upd.status)}`}>
                            {language === 'hi'
                              ? (upd.status === 'available' ? 'उपलब्ध' : upd.status === 'installing' ? 'इंस्टॉल हो रहा' : upd.status === 'installed' ? 'इंस्टॉल' : 'विफल')
                              : upd.status}
                          </span>
                        </div>
                        <div className="text-[9px] font-bold text-[var(--text-secondary)] font-mono mt-1 flex items-center gap-3 flex-wrap">
                          <span>{language === 'hi' ? 'संस्करण' : 'Version'}: {upd.version}</span>
                          <span>{language === 'hi' ? 'स्रोत' : 'Source'}: {upd.source}</span>
                          {upd.file_size > 0 && (
                            <span>{(upd.file_size / 1024).toFixed(1)} KB</span>
                          )}
                          {upd.module_scope && upd.module_scope !== 'all' && (
                            <span>{language === 'hi' ? 'मॉड्यूल' : 'Module'}: {upd.module_scope}</span>
                          )}
                        </div>
                        {upd.description && (
                          <p className="text-[10px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">{upd.description}</p>
                        )}
                      </div>
                    </div>

                    {!isReadOnly && upd.status === 'available' && (
                      <button
                        onClick={() => handleInstallUpdate(upd.id)}
                        disabled={updateLoading}
                        className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-500 hover:shadow-lg disabled:opacity-40 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5"
                      >
                        <Download className="w-3 h-3" />
                        <span>{language === 'hi' ? 'इंस्टॉल करें' : 'Install'}</span>
                      </button>
                    )}
                    {upd.status === 'installed' && (
                      <span className="px-3.5 py-2 text-emerald-500 text-[10px] font-black uppercase flex items-center gap-1.5">
                        <Check className="w-3 h-3" />
                        <span>{language === 'hi' ? 'इंस्टॉल हो गया' : 'Installed'}</span>
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PERMISSIONS TAB */}
        {activeTab === 'permissions' && isSuperAdmin && (
          <div className="animate-fade-in">
            <PagePermissionManager />
          </div>
        )}

        {/* DANGER ZONE TAB */}
        {activeTab === 'danger' && isSuperAdmin && (
          <div className="bg-[var(--bg-card)] border border-red-500/30 rounded-2xl shadow-xl p-6 space-y-6 animate-fade-in relative overflow-hidden">
            <div className="absolute top-[-50px] right-[-50px] w-[200px] h-[200px] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3.5 pb-4 border-b border-red-500/20">
              <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-500">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-black text-red-500 uppercase tracking-wide">
                  Danger Zone
                </h2>
                <p className="text-[10px] font-bold text-red-400/80 font-mono">Temporary Testing Features</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 max-w-2xl space-y-4">
              <div>
                <h3 className="text-xs font-black text-red-500 uppercase tracking-wide">Nuke Database</h3>
                <p className="text-[10.5px] font-bold text-slate-400 leading-relaxed font-sans mt-1">
                  This action will permanently delete all business data from the local SQLite database and the remote Supabase PostgreSQL database. System configurations and user accounts will be preserved.
                </p>
              </div>
              
              <button
                onClick={handleNukeDatabase}
                disabled={nukeLoading}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800/40 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-md shadow-red-600/20 cursor-pointer transition-all"
              >
                <Trash2 className={`w-4 h-4 ${nukeLoading ? 'animate-spin' : ''}`} />
                <span>{nukeLoading ? 'NUKING DATA...' : 'NUKE EVERYTHING'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
