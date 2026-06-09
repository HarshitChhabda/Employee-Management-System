import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLanguage } from '../lib/LanguageContext';
import { Shield, Lock, User, Sparkles, Languages, RefreshCw, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function Login() {
  const { login, isLoading, error, isLocked, lockRemainingMinutes } = useAuthStore();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoTip, setShowDemoTip] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    const result = await login(username.trim(), password.trim());
    if (result && result.success) {
      navigate('/', { replace: true });
    }
  };

  const fillCredentials = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#090d16] text-white relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-gradient-to-tr from-emerald-600/10 to-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />

      <div className="w-full max-w-[480px] p-4 relative z-10">
        <div className="absolute top-[-50px] right-4">
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
            aria-label={language === 'en' ? 'Switch to Hindi' : 'Switch to English'}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'हिन्दी (Hindi)' : 'English'}</span>
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/20 border border-white/10 relative group">
            <Shield className="w-8 h-8 text-white animate-pulse" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#090d16] flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            HRMS Pro Max
          </h1>
          <p className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase mt-1">
            {language === 'hi' ? 'सुरक्षित प्रमाणीकरण प्रणाली' : 'Secure Authentication System'}
          </p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isLocked && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-2" aria-live="polite">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  {language === 'hi' 
                    ? `खाता लॉक है। ${lockRemainingMinutes} मिनट बाद पुनः प्रयास करें।`
                    : `Account locked. Try again in ${lockRemainingMinutes} minutes.`}
                </span>
              </div>
            )}

            {error && !isLocked && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold animate-fade-in flex items-center gap-2" aria-live="polite">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                {language === 'hi' ? 'यूज़रनेम (Username)' : 'Username'}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={language === 'hi' ? 'यूज़रनेम दर्ज करें' : 'Enter username'}
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-sm font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-white/[0.07] transition-all text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                {language === 'hi' ? 'पासवर्ड (Password)' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === 'hi' ? 'पासवर्ड दर्ज करें' : 'Enter password'}
                  className="w-full pl-11 pr-12 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-sm font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-white/[0.07] transition-all text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.98] text-white font-black text-sm rounded-2xl transition-all shadow-xl shadow-blue-600/10 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{language === 'hi' ? 'प्रमाणित किया जा रहा है...' : 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span>{language === 'hi' ? 'लॉगिन करें' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          {showDemoTip && (
            <div className="mt-8 pt-6 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  {language === 'hi' ? 'डेमो क्रेडेंशियल्स' : 'Demo Credentials'}
                </span>
                <button
                  onClick={() => setShowDemoTip(false)}
                  className="text-[9px] font-mono text-slate-500 hover:text-slate-300 font-bold"
                >
                  [ {language === 'hi' ? 'छिपाएं' : 'Hide'} ]
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => fillCredentials('branch_admin', 'branch123')}
                  className="px-2.5 py-2 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] rounded-xl text-[10px] text-slate-300 transition-all font-bold text-left cursor-pointer"
                >
                  <div className="text-blue-400 text-[9px] uppercase font-mono tracking-tighter">Branch Admin</div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">Mahaveer Ji</div>
                </button>

                <button
                  onClick={() => fillCredentials('ho_admin', 'ho123')}
                  className="px-2.5 py-2 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] rounded-xl text-[10px] text-slate-300 transition-all font-bold text-left cursor-pointer"
                >
                  <div className="text-indigo-400 text-[9px] uppercase font-mono tracking-tighter">HO Admin</div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">HO Manager</div>
                </button>

                <button
                  onClick={() => fillCredentials('super_admin', 'super123')}
                  className="px-2.5 py-2 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] rounded-xl text-[10px] text-slate-300 transition-all font-bold text-left cursor-pointer"
                >
                  <div className="text-purple-400 text-[9px] uppercase font-mono tracking-tighter">Super Admin</div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">ReadOnly View</div>
                </button>
              </div>
            </div>
          )}

          {!showDemoTip && (
            <button
              onClick={() => setShowDemoTip(true)}
              className="mt-6 w-full text-[9px] font-mono text-slate-500 hover:text-slate-300 font-bold transition-colors cursor-pointer"
            >
              [ {language === 'hi' ? 'डेमो क्रेडेंशियल्स दिखाएं' : 'Show Demo Credentials'} ]
            </button>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-[9px] font-mono text-slate-600">
            {language === 'hi' ? 'सुरक्षित सत्र एन्क्रिप्शन सक्रिय' : 'Secure session encryption active'}
          </p>
        </div>
      </div>
    </div>
  );
}
