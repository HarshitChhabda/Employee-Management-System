import { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X, Users, FileText, CalendarCheck, Lightbulb } from 'lucide-react';

interface SearchResult {
  employees?: any[];
  letters?: any[];
  attendance?: any[];
  insights?: any[];
  suggestions?: string[];
}

interface AISearchProps {
  onResultSelect?: (type: string, item: any) => void;
}

export default function AISearch({ onResultSelect }: AISearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      } else {
        setResults(null);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasResults = results && (
    (results.employees?.length || 0) > 0 ||
    (results.letters?.length || 0) > 0 ||
    (results.attendance?.length || 0) > 0
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl font-sans">
      <div className={`
        flex items-center gap-3 bg-[var(--bg-secondary)] border rounded-xl px-4 py-3 transition-all duration-300 shadow-sm
        ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'}
      `}>
        <Sparkles className="w-5 h-5 text-blue-500 animate-pulse flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="AI Search: नाम, कोड, तिथि, विभाग... (Name, Code, Date, Dept)"
          className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none text-xs font-bold tracking-tight"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults(null); }} className="cursor-pointer p-1 hover:bg-[var(--bg-tertiary)] rounded-lg">
            <X className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" />
          </button>
        )}
        <div className="flex items-center gap-2 px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg font-mono">
          <Search className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <span className="text-[10px] font-black text-[var(--text-secondary)] hidden sm:inline uppercase">Ctrl+K</span>
        </div>
      </div>

      {isOpen && (query.length >= 2 || results) && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto backdrop-blur-2xl animate-fade-in text-[var(--text-primary)]"
        >
          {loading ? (
            <div className="p-8 text-center font-bold">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[var(--text-secondary)] text-sm">AI Neural Querying...</p>
            </div>
          ) : hasResults ? (
            <div className="p-4 space-y-4 font-bold">
              {/* Employees */}
              {results?.employees && results.employees.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">
                    <Users className="w-4 h-4 text-blue-500" />
                    Employees ({results.employees.length})
                  </div>
                  <div className="space-y-1.5">
                    {results.employees.slice(0, 5).map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => { onResultSelect?.('employee', emp); setIsOpen(false); }}
                        className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-primary)] transition-all cursor-pointer text-left shadow-sm"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-md">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-primary)] font-black text-sm truncate">{emp.name}</p>
                          <p className="text-xs font-semibold text-[var(--text-secondary)] truncate font-mono mt-0.5">{emp.employee_code} • {emp.department} • {emp.category}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Letters */}
              {results?.letters && results.letters.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">
                    <FileText className="w-4 h-4 text-purple-500" />
                    Letters ({results.letters.length})
                  </div>
                  <div className="space-y-1.5">
                    {results.letters.slice(0, 3).map((letter) => (
                      <button
                        key={letter.id}
                        onClick={() => { onResultSelect?.('letter', letter); setIsOpen(false); }}
                        className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-primary)] transition-all cursor-pointer text-left shadow-sm"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-md">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-primary)] font-black text-sm truncate">{letter.subject}</p>
                          <p className="text-xs font-semibold text-[var(--text-secondary)] truncate font-mono mt-0.5">{letter.letter_number} • {letter.dispatch_date}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {results?.insights && results.insights.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3.5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-xs font-black text-blue-500 tracking-tight">
                    <Lightbulb className="w-4 h-4 animate-bounce" />
                    AI Neural Insights
                  </div>
                  {results.insights.map((insight, idx) => (
                    <p key={idx} className="text-sm font-semibold text-[var(--text-primary)] leading-relaxed">{insight.message}</p>
                  ))}
                </div>
              )}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-8 text-center font-bold">
              <p className="text-[var(--text-secondary)] text-sm">No results found / कोई परिणाम नहीं</p>
              <div className="mt-4 space-y-2">
                {results?.suggestions?.map((suggestion, idx) => (
                  <p key={idx} className="text-xs text-[var(--text-secondary)] font-mono">• {suggestion}</p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}