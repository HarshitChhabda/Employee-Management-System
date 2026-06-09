import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/Toast';
import { useLanguage } from '@/lib/LanguageContext';
import {
  ShieldCheck,
  Eye,
  Edit3,
  Save,
  X,
  UserCog,
  Check,
  Sliders
} from 'lucide-react';

interface PagePermission {
  page_path: string;
  can_read: number;
  can_write: number;
  can_update: number;
}

interface UserPermission {
  user_id: string;
  display_name: string;
  username: string;
  role: string;
  permissions: PagePermission[];
}

const ALL_PAGES = [
  { path: '/', label: 'Dashboard', labelHi: 'डैशबोर्ड' },
  { path: '/employees', label: 'Employees', labelHi: 'कर्मचारी' },
  { path: '/attendance-excel', label: 'Attendance Register', labelHi: 'उपस्थिति रजिस्टर' },
  { path: '/attendance-report', label: 'Attendance Report', labelHi: 'उपस्थिति रिपोर्ट' },
  { path: '/pl-management', label: 'PL Management', labelHi: 'पीएल प्रबंधन' },
  { path: '/payroll', label: 'Payroll', labelHi: 'पेरोल' },
  { path: '/letters', label: 'Letters', labelHi: 'पत्र' },
  { path: '/resigned', label: 'Resigned', labelHi: 'इस्तीफा' },
  { path: '/audit-log', label: 'Audit Log', labelHi: 'ऑडिट लॉग' },
  { path: '/settings', label: 'Settings', labelHi: 'सेटिंग्स' },
];

export default function PagePermissionManager() {
  const { session } = useAuthStore();
  const { showToast } = useToast();
  const { language } = useLanguage();

  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<Record<string, { can_read: boolean; can_write: boolean; can_update: boolean }>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const isSuperAdmin = session?.role === 'ROLE_SUPER';

  const fetchPermissions = async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.invoke('api:permissions', 'get', null, session) as UserPermission[];
      if (Array.isArray(data)) {
        setUserPermissions(data);
      } else {
        setUserPermissions([]);
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to fetch permissions', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPermissions();
  }, [session]);

  const handleEditUser = (userId: string) => {
    const user = userPermissions.find(u => u.user_id === userId);
    const perms: Record<string, { can_read: boolean; can_write: boolean; can_update: boolean }> = {};
    for (const page of ALL_PAGES) {
      const existing = user?.permissions.find(p => p.page_path === page.path);
      perms[page.path] = {
        can_read: existing ? existing.can_read === 1 : true,
        can_write: existing ? existing.can_write === 1 : true,
        can_update: existing ? existing.can_update === 1 : true,
      };
    }
    setEditPermissions(perms);
    setSelectedUser(userId);
    setHasChanges(false);
  };

  const togglePermission = (pagePath: string, field: 'can_read' | 'can_write' | 'can_update') => {
    setEditPermissions(prev => ({
      ...prev,
      [pagePath]: {
        ...prev[pagePath],
        [field]: !prev[pagePath][field],
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!window.electronAPI || !selectedUser) return;
    setSaving(true);
    try {
      const permissions = ALL_PAGES.map(page => ({
        page_path: page.path,
        can_read: editPermissions[page.path]?.can_read ?? true,
        can_write: editPermissions[page.path]?.can_write ?? true,
        can_update: editPermissions[page.path]?.can_update ?? true,
      }));

      const res = await window.electronAPI.invoke('api:permissions', 'set', {
        user_id: selectedUser,
        permissions
      }, session) as { success: boolean; error?: string };

      if (res.success) {
        showToast(
          language === 'hi' ? 'अनुमतियां सफलतापूर्वक सहेजी गईं!' : 'Permissions saved successfully!',
          'success'
        );
        setHasChanges(false);
        setSelectedUser(null);
        fetchPermissions();
      } else {
        showToast(res.error || 'Failed to save permissions', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error saving permissions', 'error');
    }
    setSaving(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ROLE_SUPER':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest bg-purple-500/10 border border-purple-500/25 text-purple-400 font-mono">SUPER</span>;
      case 'ROLE_HO':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest bg-blue-500/10 border border-blue-500/25 text-blue-400 font-mono">HO</span>;
      case 'ROLE_BRANCH':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono">BRANCH</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-slate-500/10 border border-slate-500/25 text-slate-400 font-mono">{role}</span>;
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wide">
                {language === 'hi' ? 'पेज अनुमतियां' : 'Page Permissions'}
              </h2>
              <p className="text-[9px] font-bold text-[var(--text-secondary)] font-mono">
                {language === 'hi'
                  ? 'प्रत्येक उपयोगकर्ता के लिए पेज-स्तरीय पहुंच (पढ़ना/लिखना/अपडेट) प्रबंधित करें'
                  : 'Fine-grained page-level Read / Write / Update access for each user'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)] font-bold">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
              <span>Loading permissions...</span>
            </div>
          ) : userPermissions.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="w-12 h-12 mx-auto text-[var(--text-secondary)]/30 mb-3" />
              <p className="text-sm font-black text-[var(--text-secondary)]">
                {language === 'hi'
                  ? 'अभी तक कोई अनुमति कॉन्फ़िगर नहीं की गई है। नीचे किसी उपयोगकर्ता पर क्लिक करके अनुमतियां सेट करें।'
                  : 'No permissions configured yet. Click a user below to set their page access.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {userPermissions.filter(u => u.role !== 'ROLE_SUPER').map((user) => (
                <div
                  key={user.user_id}
                  onClick={() => handleEditUser(user.user_id)}
                  className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl flex items-center justify-between group hover:border-purple-500/30 hover:bg-purple-500/5 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black text-xs">
                      {user.display_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-[var(--text-primary)]">{user.display_name}</span>
                        {getRoleBadge(user.role)}
                      </div>
                      <span className="text-[9px] font-mono text-[var(--text-secondary)]">@{user.username}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-[var(--text-secondary)]">
                      {user.permissions.length}/{ALL_PAGES.length} pages configured
                    </span>
                    <button className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider border border-purple-500/25 transition-all cursor-pointer">
                      {language === 'hi' ? 'संपादित करें' : 'Edit'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Permissions Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in select-none">
          <div className="w-full max-w-4xl bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-2xl relative animate-scale-in max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-[var(--border-primary)] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[var(--text-primary)] uppercase tracking-wide">
                    {language === 'hi' ? 'पेज अनुमतियां संपादित करें' : 'Edit Page Permissions'}
                  </h3>
                  <p className="text-[8px] font-black text-[var(--text-secondary)] font-mono uppercase tracking-widest mt-0.5">
                    {userPermissions.find(u => u.user_id === selectedUser)?.display_name || ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedUser(null); setHasChanges(false); }}
                className="p-1 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-auto flex-grow p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-primary)]">
                    <th className="p-3 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider w-48">Page</th>
                    <th className="p-3 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <Eye size={11} />
                        <span>Read</span>
                      </div>
                    </th>
                    <th className="p-3 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <Edit3 size={11} />
                        <span>Write</span>
                      </div>
                    </th>
                    <th className="p-3 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <Save size={11} />
                        <span>Update</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_PAGES.map((page) => {
                    const perm = editPermissions[page.path] || { can_read: true, can_write: true, can_update: true };
                    return (
                      <tr key={page.path} className="border-b border-[var(--border-primary)] hover:bg-[var(--bg-secondary)]/30 transition-all">
                        <td className="p-3 font-black text-xs text-[var(--text-primary)]">
                          {language === 'hi' ? page.labelHi : page.label}
                          <span className="ml-2 text-[8px] font-mono text-[var(--text-secondary)]">{page.path}</span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => togglePermission(page.path, 'can_read')}
                            className={`w-8 h-8 rounded-lg border transition-all cursor-pointer flex items-center justify-center mx-auto ${
                              perm.can_read
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                            }`}
                          >
                            {perm.can_read ? <Check size={14} /> : <X size={14} />}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => togglePermission(page.path, 'can_write')}
                            className={`w-8 h-8 rounded-lg border transition-all cursor-pointer flex items-center justify-center mx-auto ${
                              perm.can_write
                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20'
                                : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                            }`}
                          >
                            {perm.can_write ? <Check size={14} /> : <X size={14} />}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => togglePermission(page.path, 'can_update')}
                            className={`w-8 h-8 rounded-lg border transition-all cursor-pointer flex items-center justify-center mx-auto ${
                              perm.can_update
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20'
                                : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                            }`}
                          >
                            {perm.can_update ? <Check size={14} /> : <X size={14} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-[var(--border-primary)] flex items-center justify-between flex-shrink-0 bg-[var(--bg-secondary)]/50">
              <div className="flex items-center gap-2 text-[9px] font-mono text-[var(--text-secondary)]">
                <ShieldCheck size={12} className="text-purple-400" />
                <span>
                  {language === 'hi'
                    ? 'सुपर एडमिन के पास सभी पेजों तक पूर्ण पहुंच है'
                    : 'Super Admin has full access to all pages'}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setSelectedUser(null); setHasChanges(false); }}
                  className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-500/15 flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Save size={12} />
                  {saving
                    ? (language === 'hi' ? 'सहेज रहा है...' : 'Saving...')
                    : (language === 'hi' ? 'सहेजें' : 'Save')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
