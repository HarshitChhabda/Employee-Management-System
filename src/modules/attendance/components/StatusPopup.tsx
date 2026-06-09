import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

const STATUS_OPTIONS = [
  { code: 'P',   key: 'attendance.statPresent', badge: 'badge-present' },
  { code: 'A',   key: 'attendance.statAbsent',  badge: 'badge-absent' },
  { code: 'CL',  key: 'attendance.statCL',      badge: 'badge-leave' },
  { code: 'PL',  key: 'attendance.statPL',       badge: 'badge-pl' },
  { code: 'HCL', key: 'attendance.statHalfCL',   badge: 'badge-leave' },
  { code: 'OD',  key: 'attendance.statOD',       badge: 'badge-halfday' },
  { code: 'WO',  key: 'attendance.statWO',       badge: 'badge-weekoff' },
  { code: 'H',   key: 'attendance.statHoliday',  badge: 'badge-holiday' },
];

interface StatusPopupProps {
  show: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onSelect: (status: string) => void;
  onClear: () => void;
}

export const StatusPopup = ({ show, position, onClose, onSelect, onClear }: StatusPopupProps) => {
  const { t } = useLanguage();

  if (!show) return null;

  return (
    <>
      <div className="position-fixed inset-0" style={{ zIndex: 1060 }} onClick={onClose} />
      <div
        className="position-absolute glass-panel shadow-premium overflow-hidden animate-fade-in"
        style={{ 
          left: Math.min(position.x, window.innerWidth - 240), 
          top: Math.min(position.y, window.innerHeight - 400), 
          zIndex: 1070,
          minWidth: '220px',
          borderRadius: 'var(--radius-lg)',
          background: 'color-mix(in srgb, var(--surface), transparent 20%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div 
          className="px-3 py-2 d-flex align-items-center justify-content-between border-bottom"
          style={{ background: 'color-mix(in srgb, var(--surface-raised), transparent 50%)', borderColor: 'var(--border-subtle)' }}
        >
          <span className="fw-bold tracking-widest text-uppercase text-dim" style={{ fontSize: '0.6rem' }}>
            Quick Status
          </span>
          <button 
            onClick={onClose} 
            className="btn btn-sm p-0 border-0 text-dim hover-text-foreground transition-smooth"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-1.5 d-flex flex-column gap-0.5">
          {STATUS_OPTIONS.map(({ code, key, badge }) => (
            <button
              key={code}
              onClick={() => onSelect(code)}
              className="btn btn-sm w-100 text-start d-flex align-items-center gap-3 px-3 py-1.5 border-0 rounded-md transition-smooth hover-bg-subtle"
              style={{ background: 'transparent' }}
            >
              <span className={badge} style={{ minWidth: '36px', height: '22px' }}>
                {code}
              </span>
              <span className="fw-medium text-foreground" style={{ fontSize: '0.8rem' }}>
                {t(key)}
              </span>
            </button>
          ))}
          
          <div className="my-1 border-top border-subtle" />
          
          <button
            onClick={onClear}
            className="btn btn-sm w-100 d-flex align-items-center gap-3 px-3 py-2 border-0 rounded-md transition-smooth text-destructive hover-bg-destructive-dim"
            style={{ background: 'transparent' }}
          >
            <div className="d-flex align-items-center justify-content-center" style={{ width: '36px' }}>
              <Trash2 size={14} />
            </div>
            <span className="fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.7rem' }}>
              Clear Entry
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
