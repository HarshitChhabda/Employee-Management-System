import { useEffect, useState } from 'react';
import {
  Users,
  CalendarCheck,
  FileText,
  UserX,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { hindiLabels, categories, attendanceStatuses } from '../lib/hindiLabels';
import { dashboardAPI } from '../services/api';
import type { DashboardStats } from '../types/hrms';

function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-xl animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[var(--bg-secondary)] rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[var(--bg-secondary)] rounded w-24" />
          <div className="h-8 bg-[var(--bg-secondary)] rounded w-16" />
        </div>
      </div>
    </div>
  );
}

function SkeletonSection() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-xl animate-pulse">
      <div className="h-6 bg-[var(--bg-secondary)] rounded w-48 mb-4" />
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-4 space-y-2">
            <div className="h-8 bg-[var(--bg-tertiary)] rounded w-12" />
            <div className="h-3 bg-[var(--bg-tertiary)] rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-xl animate-pulse">
      <div className="h-6 bg-[var(--bg-secondary)] rounded w-40 mb-4" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
            <div className="w-8 h-8 bg-[var(--bg-tertiary)] rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[var(--bg-tertiary)] rounded w-32" />
              <div className="h-2 bg-[var(--bg-tertiary)] rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const categoryIcons: Record<string, React.ElementType> = {
  permanent: ShieldCheck,
  samvida: Briefcase,
  probation: Clock,
  daily_wage: Users,
};

const categoryColors: Record<string, string> = {
  permanent: 'text-emerald-500',
  samvida: 'text-blue-500',
  probation: 'text-amber-500',
  daily_wage: 'text-purple-500',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardAPI.getStats();
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 lg:p-8 shadow-xl animate-pulse">
          <div className="h-8 bg-white/20 rounded w-48 mb-2" />
          <div className="h-4 bg-white/10 rounded w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonSection />
          <SkeletonSection />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ActivitySkeleton />
          <ActivitySkeleton />
          <ActivitySkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertTriangle className="w-16 h-16 text-red-500" />
        <p className="text-lg font-black text-[var(--text-primary)]">Failed to load dashboard</p>
        <p className="text-sm text-[var(--text-secondary)]">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
        >
          Retry / पुनः प्रयास करें
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      {/* Welcome & Search */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 lg:p-8 shadow-2xl text-white group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.3),transparent_50%)]" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="animate-slide-in-left">
            <h1 className="text-2xl lg:text-3xl font-black mb-2">
              नमस्ते, Admin!
            </h1>
            <p className="text-blue-100 font-medium">
              Welcome to Employee Management System • {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          titleHi={hindiLabels.totalEmployees}
          value={stats?.counts?.totalEmployees || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Today's Attendance"
          titleHi={hindiLabels.todayAttendance}
          value={stats?.attendanceToday?.P || 0}
          icon={CalendarCheck}
          color="green"
          trend={`${stats?.attendanceRate || 0}% marked this month`}
        />
        <StatCard
          title="Total Letters"
          titleHi="कुल पत्र"
          value={stats?.recentLetters?.length || 0}
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="Resigned"
          titleHi={hindiLabels.resignedEmployees}
          value={stats?.counts?.resigned || 0}
          icon={UserX}
          color="orange"
        />
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-xl animate-fade-in hover:border-[var(--border-secondary)] transition-all duration-300 hover:shadow-2xl">
          <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-[var(--text-primary)]">
            <Users className="w-5 h-5 text-blue-500" />
            Employee Categories / कर्मचारी श्रेणियां
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {categories.map((cat) => {
              const Icon = categoryIcons[cat.value] || Users;
              const color = categoryColors[cat.value] || 'text-gray-500';
              const count = stats?.counts?.[cat.value] || 0;
              const total = stats?.counts?.totalEmployees || 1;
              const percentage = Math.round((count / total) * 100);

              return (
                <div
                  key={cat.value}
                  className="group bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4 shadow-sm hover:border-[var(--border-secondary)] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`w-5 h-5 ${color} group-hover:scale-110 transition-transform duration-300`} />
                      <span className="text-xs font-mono text-[var(--text-secondary)]">{percentage}%</span>
                    </div>
                    <p className="text-2xl font-black text-[var(--text-primary)] group-hover:scale-105 transition-transform duration-300">
                      {count}
                    </p>
                    <p className="text-sm font-bold text-[var(--text-secondary)]">{cat.labelHi}</p>
                    <p className="text-xs text-[var(--text-secondary)] opacity-75">{cat.label}</p>
                    <div className="mt-2 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${color.replace('text-', 'bg-')}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Attendance Summary */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-xl animate-fade-in hover:border-[var(--border-secondary)] transition-all duration-300 hover:shadow-2xl">
          <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-[var(--text-primary)]">
            <CalendarCheck className="w-5 h-5 text-green-500" />
            Today's Attendance / आज की उपस्थिति
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {attendanceStatuses.map((status) => {
              const count = stats?.attendanceToday?.[status.value] || 0;
              const total = stats?.counts?.totalEmployees || 1;
              const percentage = Math.round((count / total) * 100);

              return (
                <div
                  key={status.value}
                  className="group bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-3 shadow-sm hover:border-[var(--border-secondary)] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent group-hover:from-green-500/5 group-hover:to-blue-500/5 transition-all duration-300" />
                  <div className="relative z-10">
                    <p className="text-xl font-black text-[var(--text-primary)] group-hover:scale-105 transition-transform duration-300">
                      {count}
                    </p>
                    <p className="text-xs font-bold text-[var(--text-secondary)]">{status.labelHi}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] opacity-75">{status.label}</p>
                    <div className="mt-1.5 h-0.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${status.color.replace('text-', 'bg-')}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity & Expiring Tenure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Letters */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-xl animate-fade-in hover:border-[var(--border-secondary)] transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black flex items-center gap-2 text-[var(--text-primary)]">
              <FileText className="w-5 h-5 text-purple-500" />
              Recent Letters / हाल के पत्र
            </h3>
            <a href="/letters" className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 font-bold transition-colors hover:gap-2">
              View All <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="space-y-3">
            {stats?.recentLetters?.slice(0, 4).map((letter) => (
              <div
                key={letter.id}
                className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-sm hover:border-purple-500/30 transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer group"
              >
                <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0 text-purple-500 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all duration-300">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-bold line-clamp-1 group-hover:text-purple-500 transition-colors">{letter.subject}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{letter.letter_number} • {letter.dispatch_date}</p>
                </div>
              </div>
            ))}
            {!stats?.recentLetters?.length && (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                <p className="text-[var(--text-secondary)] text-sm font-semibold">No recent letters / कोई हालिया पत्र नहीं</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Category Changes */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-xl animate-fade-in hover:border-[var(--border-secondary)] transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black flex items-center gap-2 text-[var(--text-primary)]">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Category Changes / श्रेणी परिवर्तन
            </h3>
          </div>
          <div className="space-y-3">
            {stats?.recentCategoryChanges?.slice(0, 4).map((change) => (
              <div
                key={change.history_id}
                className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-sm hover:border-orange-500/30 transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer group"
              >
                <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0 text-orange-500 group-hover:bg-orange-500/20 group-hover:scale-110 transition-all duration-300">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-bold group-hover:text-orange-500 transition-colors">{change.employee?.name}</p>
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">
                    {change.old_category ? `${change.old_category} → ` : ''}{change.category}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] opacity-75">{new Date(change.changed_at).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            ))}
            {!stats?.recentCategoryChanges?.length && (
              <div className="text-center py-8">
                <TrendingUp className="w-10 h-10 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                <p className="text-[var(--text-secondary)] text-sm font-semibold">No recent changes / कोई हालिया परिवर्तन नहीं</p>
              </div>
            )}
          </div>
        </div>

        {/* Expiring Tenure */}
        <div className="bg-[var(--bg-card)] border-amber-500/30 rounded-2xl p-6 shadow-xl animate-fade-in hover:border-amber-500/50 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black flex items-center gap-2 text-[var(--text-primary)]">
              <Clock className="w-5 h-5 text-amber-500" />
              Tenure Expiring / कार्यकाल समाप्ति
            </h3>
            <a href="/employees" className="text-sm text-amber-500 hover:text-amber-600 flex items-center gap-1 font-bold transition-colors hover:gap-2">
              View All <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="space-y-3">
            {stats?.expiringTenure?.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer group"
              >
                <div>
                  <p className="font-black text-sm text-[var(--text-primary)] group-hover:text-amber-500 transition-colors">
                    {emp.name}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] font-mono">
                    {emp.employee_code} • {emp.department}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-amber-500 font-black text-xs font-mono group-hover:scale-110 transition-transform">
                    {new Date(emp.tenure_end_date).toLocaleDateString('en-IN')}
                  </p>
                  <p className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">समाप्ति तिथि</p>
                </div>
              </div>
            ))}
            {!stats?.expiringTenure?.length && (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                <p className="text-[var(--text-secondary)] text-sm font-semibold">No expiring tenure / कोई समाप्ति नहीं</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
