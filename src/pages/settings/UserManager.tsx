import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/Toast';
import { useLanguage } from '@/lib/LanguageContext';
import { 
  Users, 
  Key, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Lock, 
  Eye, 
  EyeOff, 
  X,
  FileText,
  Edit3,
  Save,
  UserPlus,
  Plus
} from 'lucide-react';

interface AppUser {
  id: string;
  username: string;
  display_name: string;
  role: string;
  entity: string;
  is_active: number;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

const validatePassword = (password: string, lang: string): string | null => {
  const isHi = lang === 'hi';
  if (!password || !/^\d{4}$/.test(password)) return isHi ? 'पासवर्ड बिल्कुल 4 अंकों का पिन होना चाहिए।' : 'Password must be exactly a 4-digit PIN.';
  return null;
};

export default function UserManager() {
  const { session } = useAuthStore();
  const { showToast } = useToast();
  const { language } = useLanguage();
  
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states for self-service
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Super admin modal / reset state
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [superNewPassword, setSuperNewPassword] = useState('');
  const [superConfirmPassword, setSuperConfirmPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Create user state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    display_name: '',
    password: '',
    confirmPassword: '',
    role: 'ROLE_BRANCH'
  });
  
  // Password visibility triggers
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showSuperNewPass, setShowSuperNewPass] = useState(false);
  
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');

  const isSuperAdmin = session?.role === 'ROLE_SUPER';

  const fetchUsers = async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.invoke('api:users', 'get', null, session) as AppUser[];
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to fetch users', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [session]);

  const handleSelfPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI || !session) return;

    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast(language === 'hi' ? 'कृपया सभी फ़ील्ड भरें।' : 'Please fill out all fields.', 'warning');
      return;
    }

    const pwError = validatePassword(newPassword, language);
    if (pwError) { showToast(pwError, 'warning'); return; }

    if (newPassword !== confirmPassword) {
      showToast(language === 'hi' ? 'पासवर्ड मेल नहीं खाते।' : 'Passwords do not match.', 'warning');
      return;
    }

    try {
      const res = await window.electronAPI.invoke('api:users', 'change-password', {
        target_username: session.username,
        old_password: oldPassword,
        new_password: newPassword
      }, session) as { success: boolean; error?: string };

      if (res.success) {
        showToast(
          language === 'hi' 
            ? 'पासवर्ड सफलतापूर्वक बदल दिया गया है!' 
            : 'Password updated successfully!', 
          'success'
        );
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(res.error || 'Password update failed', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Password update exception', 'error');
    }
  };

  const handleDisplayNameChange = async () => {
    if (!window.electronAPI || !session || !newDisplayName.trim()) return;
    try {
      const res = await window.electronAPI.invoke('api:users', 'update-display-name', {
        new_display_name: newDisplayName.trim()
      }, session) as { success: boolean; error?: string; display_name?: string };

      if (res.success) {
        showToast(
          language === 'hi' ? 'नाम सफलतापूर्वक अपडेट हो गया!' : 'Display name updated successfully!',
          'success'
        );
        setEditingName(false);
        setNewDisplayName('');
        const storage = localStorage.getItem('auth-storage');
        if (storage) {
          const parsed = JSON.parse(storage);
          if (parsed?.state?.session) {
            parsed.state.session.display_name = res.display_name;
            localStorage.setItem('auth-storage', JSON.stringify(parsed));
          }
        }
        window.location.reload();
      } else {
        showToast(res.error || 'Failed to update display name', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Display name update exception', 'error');
    }
  };

  const handleSuperPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI || !selectedUser) return;

    if (!superNewPassword || !superConfirmPassword) {
      showToast(language === 'hi' ? 'कृपया सभी पासवर्ड फ़ील्ड भरें।' : 'Please fill out all password fields.', 'warning');
      return;
    }

    const pwError = validatePassword(superNewPassword, language);
    if (pwError) { showToast(pwError, 'warning'); return; }

    if (superNewPassword !== superConfirmPassword) {
      showToast(language === 'hi' ? 'पासवर्ड मेल नहीं खाते।' : 'Passwords do not match.', 'warning');
      return;
    }

    try {
      const res = await window.electronAPI.invoke('api:users', 'change-password', {
        target_username: selectedUser.username,
        new_password: superNewPassword
      }, session) as { success: boolean; error?: string };

      if (res.success) {
        showToast(
          language === 'hi' 
            ? `${selectedUser.display_name} का पासवर्ड सफलतापूर्वक रीसेट कर दिया गया है!` 
            : `Password reset successfully for ${selectedUser.display_name}!`, 
          'success'
        );
        setSuperNewPassword('');
        setSuperConfirmPassword('');
        setShowPasswordModal(false);
        setSelectedUser(null);
      } else {
        showToast(res.error || 'Password reset failed', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Password reset exception', 'error');
    }
  };

  const handleToggleUserStatus = async (user: AppUser) => {
    if (!window.electronAPI || !isSuperAdmin) return;
    
    try {
      const newActive = user.is_active === 1 ? 0 : 1;
      const res = await window.electronAPI.invoke('api:users', 'update', {
        id: user.id,
        is_active: newActive
      }, session) as { success: boolean; error?: string };

      if (res.success) {
        showToast(
          language === 'hi' 
            ? `उपयोगकर्ता स्थिति सफलतापूर्वक अपडेट की गई!` 
            : `User status updated successfully!`, 
          'success'
        );
        fetchUsers();
      } else {
        showToast(res.error || 'Failed to update user', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error updating user status', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI || !isSuperAdmin) return;

    const { username, display_name, password, confirmPassword, role } = newUser;

    if (!username.trim() || !display_name.trim() || !password || !confirmPassword) {
      showToast(language === 'hi' ? 'कृपया सभी फ़ील्ड भरें।' : 'Please fill out all fields.', 'warning');
      return;
    }

    const pwError = validatePassword(password, language);
    if (pwError) { showToast(pwError, 'warning'); return; }

    if (password !== confirmPassword) {
      showToast(language === 'hi' ? 'पासवर्ड मेल नहीं खाते।' : 'Passwords do not match.', 'warning');
      return;
    }

    try {
      const res = await window.electronAPI.invoke('api:users', 'create', {
        username: username.trim(),
        display_name: display_name.trim(),
        password,
        role
      }, session) as { success: boolean; error?: string };

      if (res.success) {
        showToast(
          language === 'hi' 
            ? `उपयोगकर्ता ${display_name} सफलतापूर्वक बनाया गया!` 
            : `User ${display_name} created successfully!`, 
          'success'
        );
        setShowCreateModal(false);
        setNewUser({ username: '', display_name: '', password: '', confirmPassword: '', role: 'ROLE_BRANCH' });
        fetchUsers();
      } else {
        showToast(res.error || 'Failed to create user', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error creating user', 'error');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ROLE_SUPER':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest bg-purple-500/10 border border-purple-500/25 text-purple-400 font-mono">SUPER ADMIN</span>;
      case 'ROLE_HO':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest bg-blue-500/10 border border-blue-500/25 text-blue-400 font-mono">HO ADMIN</span>;
      case 'ROLE_BRANCH':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono">BRANCH ADMIN</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-slate-500/10 border border-slate-500/25 text-slate-400 font-mono">{role}</span>;
    }
  };

  const getEntityBadge = (entity: string) => {
    switch (entity) {
      case 'ALL':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-violet-500/15 text-violet-400 border border-violet-500/20 font-mono">ALL SCOPES</span>;
      case 'HO':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 font-mono">HO REGION</span>;
      case 'BRANCH':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-teal-500/15 text-teal-400 border border-teal-500/20 font-mono">BRANCH REGION</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-slate-500/15 text-slate-400 border border-slate-500/20 font-mono">{entity}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Dynamic Title Header Block */}
      <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-xl relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-[180px] h-[180px] bg-gradient-to-br from-blue-500/10 to-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">
              {language === 'hi' ? 'उपयोगकर्ता क्रेडेंशियल' : 'User Credentials & Access'}
            </h2>
            <p className="text-[10px] font-black text-[var(--text-secondary)] font-mono uppercase tracking-widest mt-1">
              {language === 'hi' 
                ? 'सिस्टम उपयोगकर्ताओं और पासवर्ड सुरक्षा सेटिंग्स का प्रबंधन करें।' 
                : 'Manage system operator credentials and session password security settings.'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side / Super Admin Users Matrix */}
        {isSuperAdmin ? (
          <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[480px]">
            <div className="p-5 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-500" />
                <span className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider">
                  {language === 'hi' ? 'सक्रिय सिस्टम उपयोगकर्ता' : 'Active System Operators'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  <UserPlus size={12} />
                  <span>{language === 'hi' ? 'नया उपयोगकर्ता' : 'Create User'}</span>
                </button>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono font-bold text-[9px]">
                  Active: {users.filter(u => u.is_active === 1).length}
                </span>
              </div>
            </div>

            <div className="flex-grow overflow-x-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-[350px] text-[var(--text-secondary)] font-bold">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <span>Loading operators...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="flex items-center justify-center h-[350px] text-[var(--text-secondary)] font-bold">
                  No Users Registered
                </div>
              ) : (
                <table className="w-full text-left border-collapse select-none">
                  <thead>
                    <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/50">
                      <th className="p-4 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Display Name</th>
                      <th className="p-4 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Role & Scope</th>
                      <th className="p-4 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Last Login</th>
                      <th className="p-4 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                      <th className="p-4 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-[var(--border-primary)] hover:bg-[var(--bg-secondary)]/30 transition-all">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-black text-xs text-[var(--text-primary)]">{user.display_name}</span>
                            <span className="text-[9px] font-mono text-[var(--text-secondary)] mt-0.5">@{user.username}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            {getRoleBadge(user.role)}
                            {getEntityBadge(user.entity)}
                          </div>
                        </td>
                        <td className="p-4 text-[10px] font-mono text-[var(--text-secondary)]">
                          {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            user.is_active === 1 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.is_active === 1 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            {user.is_active === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPasswordModal(true);
                              }}
                              className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider border border-blue-500/25 transition-all cursor-pointer"
                              title="Reset Password"
                            >
                              Reset Pass
                            </button>
                            
                            {user.username !== 'super_admin' && (
                              <button
                                onClick={() => handleToggleUserStatus(user)}
                                className={`p-1 rounded-lg border transition-all cursor-pointer ${
                                  user.is_active === 1
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-white'
                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                                }`}
                                title={user.is_active === 1 ? 'Deactivate User' : 'Activate User'}
                                aria-label={user.is_active === 1 ? 'Deactivate user' : 'Activate user'}
                              >
                                {user.is_active === 1 ? <UserX size={14} /> : <UserCheck size={14} />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          /* Non-super admin User Profile Details View */
          <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-[-30px] left-[-30px] w-[150px] h-[150px] bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-primary)]">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[var(--text-primary)] uppercase tracking-wide">
                    {language === 'hi' ? 'आपका ऑपरेटर प्रोफ़ाइल' : 'Your Operator Profile'}
                  </h3>
                  <p className="text-[8px] font-black text-[var(--text-secondary)] font-mono uppercase tracking-widest mt-0.5">
                    {language === 'hi' ? 'वर्तमान सत्र क्रेडेंशियल्स' : 'Current session identification detail'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[var(--bg-secondary)]/50 p-4 border border-[var(--border-primary)] rounded-xl">
                  <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">Display Name</span>
                  {editingName ? (
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="text"
                        value={newDisplayName || session?.display_name || session?.username}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        className="flex-1 px-2 py-1 bg-[var(--bg-card)] border border-blue-500/50 rounded-lg text-sm font-black text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleDisplayNameChange(); if (e.key === 'Escape') setEditingName(false); }}
                      />
                      <button onClick={handleDisplayNameChange} className="p-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer" title="Save" aria-label="Save display name">
                        <Save size={14} />
                      </button>
                      <button onClick={() => setEditingName(false)} className="p-1 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:text-[var(--text-primary)] cursor-pointer" title="Cancel" aria-label="Cancel">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-sm font-black text-[var(--text-primary)]">{session?.display_name || session?.username}</span>
                      <button onClick={() => { setEditingName(true); setNewDisplayName(session?.display_name || ''); }} className="p-1 text-[var(--text-secondary)] hover:text-blue-500 cursor-pointer" title="Edit name" aria-label="Edit display name">
                        <Edit3 size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-[var(--bg-secondary)]/50 p-4 border border-[var(--border-primary)] rounded-xl">
                  <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">Username</span>
                  <span className="text-sm font-black text-blue-400 mt-1.5 block">@{session?.username}</span>
                </div>

                <div className="bg-[var(--bg-secondary)]/50 p-4 border border-[var(--border-primary)] rounded-xl">
                  <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">Access Level / Role</span>
                  <div className="mt-2.5">
                    {session && getRoleBadge(session.role)}
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)]/50 p-4 border border-[var(--border-primary)] rounded-xl">
                  <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">Operational Scope</span>
                  <div className="mt-2.5">
                    {session && getEntityBadge(session.entity)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[var(--border-primary)] flex items-center gap-3">
              <FileText size={16} className="text-amber-500/70" />
              <span className="text-[8.5px] font-bold text-[var(--text-secondary)] leading-relaxed">
                {language === 'hi'
                  ? 'सुरक्षा नोट: पासवर्ड 4 अंकों का पिन होना चाहिए।'
                  : 'Security Notice: Password must be exactly a 4-digit PIN.'
                }
              </span>
            </div>
          </div>
        )}

        {/* Right Side / Password Management Panel */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute bottom-[-40px] right-[-40px] w-[140px] h-[140px] bg-gradient-to-tr from-amber-500/5 to-orange-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-primary)] relative z-10">
            <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500">
              <Key size={18} />
            </div>
            <div>
              <h3 className="font-black text-sm text-[var(--text-primary)] uppercase tracking-wide">
                {language === 'hi' ? 'पासवर्ड बदलें' : 'Change Password'}
              </h3>
              <p className="text-[8px] font-black text-[var(--text-secondary)] font-mono uppercase tracking-widest mt-0.5">
                {language === 'hi' ? 'लॉगिन सुरक्षा अपडेट करें' : 'Update credentials security'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSelfPasswordChange} className="mt-6 space-y-4 relative z-10">
            {/* Old Password (not needed for super reset, but needed for self-service) */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">
                {language === 'hi' ? 'वर्तमान पासवर्ड' : 'Current Password'}
              </label>
              <div className="relative">
                <input
                  type={showOldPass ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:border-amber-500 focus:outline-none pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute inset-y-0 right-3 flex items-center text-[var(--text-secondary)] hover:text-amber-500 cursor-pointer"
                  aria-label={showOldPass ? 'Hide password' : 'Show password'}
                >
                  {showOldPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">
                {language === 'hi' ? 'नया पासवर्ड' : 'New Password'}
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:border-amber-500 focus:outline-none pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute inset-y-0 right-3 flex items-center text-[var(--text-secondary)] hover:text-amber-500 cursor-pointer"
                  aria-label={showNewPass ? 'Hide password' : 'Show password'}
                >
                  {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">
                {language === 'hi' ? 'पासवर्ड की पुष्टि करें' : 'Confirm New Password'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:border-amber-500 focus:outline-none pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute inset-y-0 right-3 flex items-center text-[var(--text-secondary)] hover:text-amber-500 cursor-pointer"
                  aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 mt-4"
            >
              <Lock size={12} />
              <span>{language === 'hi' ? 'सुरक्षित करें' : 'Update Security'}</span>
            </button>
          </form>
        </div>

      </div>

      {/* Super Admin Modal for password overrides */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in select-none">
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-2xl p-6 relative animate-scale-in">
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setSelectedUser(null);
              }}
              className="absolute top-4 right-4 p-1 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-primary)]">
              <div className="w-9 h-9 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                <Lock size={16} />
              </div>
              <div>
                <h3 className="font-black text-sm text-[var(--text-primary)] uppercase tracking-wide">
                  Reset Password Override
                </h3>
                <p className="text-[8px] font-black text-[var(--text-secondary)] font-mono uppercase tracking-widest mt-0.5">
                  Overriding password for @{selectedUser.username}
                </p>
              </div>
            </div>

            <form onSubmit={handleSuperPasswordReset} className="mt-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">User Targeted</span>
                <span className="text-xs font-black text-[var(--text-primary)]">{selectedUser.display_name}</span>
              </div>

              {/* Super New Password */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">
                  New Plain-text Password
                </label>
                <div className="relative">
                  <input
                    type={showSuperNewPass ? "text" : "password"}
                    value={superNewPassword}
                    onChange={(e) => setSuperNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:border-purple-500 focus:outline-none pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSuperNewPass(!showSuperNewPass)}
                    className="absolute inset-y-0 right-3 flex items-center text-[var(--text-secondary)] hover:text-purple-500 cursor-pointer"
                    aria-label={showSuperNewPass ? 'Hide password' : 'Show password'}
                  >
                    {showSuperNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Super Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">
                  Confirm Password Override
                </label>
                <div className="relative">
                  <input
                    type={showSuperNewPass ? "text" : "password"}
                    value={superConfirmPassword}
                    onChange={(e) => setSuperConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:border-purple-500 focus:outline-none pr-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 py-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-500/15 cursor-pointer active:scale-95"
                >
                  Apply Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && isSuperAdmin && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in select-none">
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-2xl p-6 relative animate-scale-in">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setNewUser({ username: '', display_name: '', password: '', confirmPassword: '', role: 'ROLE_BRANCH' });
              }}
              className="absolute top-4 right-4 p-1 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-primary)]">
              <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                <UserPlus size={16} />
              </div>
              <div>
                <h3 className="font-black text-sm text-[var(--text-primary)] uppercase tracking-wide">
                  {language === 'hi' ? 'नया उपयोगकर्ता बनाएं' : 'Create New User'}
                </h3>
                <p className="text-[8px] font-black text-[var(--text-secondary)] font-mono uppercase tracking-widest mt-0.5">
                  {language === 'hi' ? 'सिस्टम ऑपरेटर क्रेडेंशियल्स' : 'System operator credentials'}
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">
                    {language === 'hi' ? 'यूज़रनेम' : 'Username'}
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:border-emerald-500 focus:outline-none"
                    placeholder="username"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">
                    {language === 'hi' ? 'प्रदर्शन नाम' : 'Display Name'}
                  </label>
                  <input
                    type="text"
                    value={newUser.display_name}
                    onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:border-emerald-500 focus:outline-none"
                    placeholder="Display Name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">
                  {language === 'hi' ? 'भूमिका' : 'Role'}
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="ROLE_BRANCH">Branch Admin</option>
                  <option value="ROLE_HO">HO Admin</option>
                  <option value="ROLE_SUPER">Super Admin</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">
                  {language === 'hi' ? 'पासवर्ड' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:border-emerald-500 focus:outline-none pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-3 flex items-center text-[var(--text-secondary)] hover:text-emerald-500 cursor-pointer"
                    aria-label={showNewPass ? 'Hide password' : 'Show password'}
                  >
                    {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block font-mono">
                  {language === 'hi' ? 'पासवर्ड की पुष्टि' : 'Confirm Password'}
                </label>
                <input
                  type="password"
                  value={newUser.confirmPassword}
                  onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] font-bold focus:border-emerald-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[9px] font-bold text-amber-400">
                <Lock size={12} />
                <span>{language === 'hi' ? '8+ अक्षर, बड़ा/छोटा, संख्या, विशेष चिह्न आवश्यक' : '8+ chars, uppercase, lowercase, number & special character required'}</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewUser({ username: '', display_name: '', password: '', confirmPassword: '', role: 'ROLE_BRANCH' });
                  }}
                  className="flex-1 py-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/15 cursor-pointer active:scale-95"
                >
                  <Plus size={12} className="inline mr-1" />
                  {language === 'hi' ? 'उपयोगकर्ता बनाएं' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
