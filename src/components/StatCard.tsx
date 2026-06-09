import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  titleHi: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  trend?: string;
}

export default function StatCard({ title, titleHi, value, icon: Icon, color, trend }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/25',
    green: 'from-green-500 to-green-600 shadow-green-500/25',
    purple: 'from-purple-500 to-purple-600 shadow-purple-500/25',
    orange: 'from-orange-500 to-orange-600 shadow-orange-500/25',
    red: 'from-red-500 to-red-600 shadow-red-500/25',
    teal: 'from-teal-500 to-teal-600 shadow-teal-500/25',
  };

  const hoverColors: Record<string, string> = {
    blue: 'hover:border-blue-500/50',
    green: 'hover:border-green-500/50',
    purple: 'hover:border-purple-500/50',
    orange: 'hover:border-orange-500/50',
    red: 'hover:border-red-500/50',
    teal: 'hover:border-teal-500/50',
  };

  return (
    <div
      className={`bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 ${hoverColors[color]} hover:shadow-2xl transition-all duration-300 animate-fade-in hover:-translate-y-1 group cursor-pointer`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[var(--text-secondary)] text-sm font-bold">{titleHi}</p>
          <p className="text-[var(--text-secondary)] text-xs opacity-75">{title}</p>
          <h3 className="text-3xl font-black text-[var(--text-primary)] mt-2 group-hover:scale-105 transition-transform duration-300">{value}</h3>
          {trend && (
            <p className="text-xs text-green-500 font-bold mt-1 flex items-center gap-1">
              <span>↑</span> {trend}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}