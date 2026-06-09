import { useLanguage } from '../lib/LanguageContext';
import { cn } from '@/lib/utils';
import { Languages } from 'lucide-react';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const isEnglish = language === 'en';

  return (
    <div 
      onClick={() => setLanguage(isEnglish ? 'hi' : 'en')}
      className={cn(
        "relative w-[72px] h-8 rounded-full p-1 cursor-pointer transition-all duration-500 shadow-inner group overflow-hidden border",
        isEnglish 
          ? "bg-slate-100 border-slate-200" 
          : "bg-emerald-50 border-emerald-200"
      )}
    >
      {/* Switch Handle */}
      <div
        className={cn(
          "relative z-10 w-8 h-6 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 border",
          isEnglish 
            ? "bg-white border-slate-200 text-slate-600 translate-x-0" 
            : "bg-emerald-600 border-emerald-700 text-white translate-x-8"
        )}
      >
        <span className="text-[10px] font-black tracking-tighter uppercase">
          {language === 'en' ? 'EN' : 'HI'}
        </span>
      </div>

      {/* Side Label (Subtle) */}
      <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none transition-opacity">
        <span className={cn("text-[9px] font-bold", isEnglish ? "opacity-0" : "text-emerald-600 opacity-40")}>EN</span>
        <span className={cn("text-[8px] font-bold", isEnglish ? "text-slate-400 opacity-40" : "opacity-0")}>हि</span>
      </div>
    </div>
  );
}
