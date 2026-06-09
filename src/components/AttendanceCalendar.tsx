import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Edit3, Check, X } from 'lucide-react';
import { attendanceStatuses } from '../lib/hindiLabels';

interface AttendanceCalendarProps {
  employeeId: number;
  employeeName: string;
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
  onDayClick?: (date: string, currentStatus: string) => void;
  readOnly?: boolean;
}

export default function AttendanceCalendar({ 
  employeeId, 
  employeeName, 
  month, 
  year, 
  onMonthChange,
  onDayClick,
  readOnly = false 
}: AttendanceCalendarProps) {
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendanceData();
  }, [employeeId, month, year]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?employee_id=${employeeId}&month=${String(month).padStart(2, '0')}&year=${year}`);
      const data = await res.json();
      
      const mapped: Record<string, string> = {};
      data.forEach((record: any) => {
        mapped[record.date] = record.status;
      });
      setAttendanceData(mapped);
    } catch (err) {
      console.error('Calendar fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const getStatusColor = (status: string) => {
    const statusObj = attendanceStatuses.find(s => s.value === status);
    return statusObj ? statusObj.color : 'bg-[var(--bg-tertiary)]';
  };

  const getStatusLabel = (status: string) => {
    const statusObj = attendanceStatuses.find(s => s.value === status);
    return statusObj ? statusObj.labelHi : status;
  };

  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const monthNames = [
    'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
    'जुलाई', 'अगस्त', 'सितम्बर', 'अक्तूबर', 'नवंबर', 'दिसंबर'
  ];

  const weekDays = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

  const handleDayClick = (day: number) => {
    if (readOnly) return;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currentStatus = attendanceData[dateStr] || '';
    onDayClick?.(dateStr, currentStatus);
  };

  const calculateStats = () => {
    const stats: Record<string, number> = {};
    attendanceStatuses.forEach(s => stats[s.value] = 0);
    Object.values(attendanceData).forEach(status => {
      if (stats[status] !== undefined) stats[status]++;
    });
    return stats;
  };

  const stats = calculateStats();

  return (
    <div
      className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl overflow-hidden shadow-xl animate-fade-in font-sans"
    >
      {/* Header */}
      <div className="p-5 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between mb-5 font-bold">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] font-black text-base tracking-tight">{employeeName}</h3>
              <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5 tracking-wide uppercase font-mono">उपस्थिति / Attendance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (month === 1) {
                  onMonthChange(12, year - 1);
                } else {
                  onMonthChange(month - 1, year);
                }
              }}
              className="p-2.5 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl transition-all cursor-pointer border border-transparent hover:border-[var(--border-primary)] shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center min-w-[120px]">
              <p className="text-[var(--text-primary)] font-black font-mono text-sm tracking-wide">{monthNames[month - 1]} {year}</p>
            </div>
            <button
              onClick={() => {
                if (month === 12) {
                  onMonthChange(1, year + 1);
                } else {
                  onMonthChange(month + 1, year);
                }
              }}
              className="p-2.5 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl transition-all cursor-pointer border border-transparent hover:border-[var(--border-primary)] shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="grid grid-cols-6 gap-2">
          {attendanceStatuses.map(status => (
            <div key={status.value} className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-2.5 text-center shadow-sm">
              <p className="text-lg font-black text-[var(--text-primary)] font-mono">{stats[status.value] || 0}</p>
              <p className="text-[10px] font-black text-[var(--text-secondary)] tracking-tight uppercase mt-0.5">{status.labelHi}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-5 font-bold">
        {loading ? (
          <div className="flex items-center justify-center h-64 font-bold">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Week Days Header */}
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {weekDays.map((day, idx) => (
                <div key={idx} className="text-center py-2 text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {emptyDays.map((_, idx) => (
                <div key={`empty-${idx}`} className="aspect-square bg-transparent" />
              ))}
              {days.map(day => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const status = attendanceData[dateStr];
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                const isHovered = hoveredDay === dateStr;

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => setHoveredDay(dateStr)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`
                      aspect-square rounded-xl relative flex flex-col items-center justify-center
                      transition-transform duration-200 hover:scale-105 active:scale-95 shadow-sm
                      ${status 
                        ? `${getStatusColor(status)} text-white font-black shadow-md` 
                        : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                      }
                      ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[var(--bg-card)]' : ''}
                      ${!readOnly ? 'cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <span className="text-sm font-black font-mono">{day}</span>
                    {status && (
                      <span className="text-[9px] font-black mt-0.5 tracking-tight font-mono uppercase opacity-90">
                        {attendanceStatuses.find(s => s.value === status)?.label}
                      </span>
                    )}
                    {isHovered && !readOnly && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] rounded-xl text-white">
                        <Edit3 className="w-5 h-5 animate-pulse stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="px-5 pb-5 pt-2 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]/50">
        <div className="flex flex-wrap gap-4 justify-center font-bold">
          {attendanceStatuses.map(status => (
            <div key={status.value} className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-md shadow-sm ${status.color}`} />
              <span className="text-xs font-black text-[var(--text-secondary)] uppercase font-mono">{status.labelHi}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}