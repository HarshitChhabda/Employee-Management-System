export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    daily_wage: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
    samvida: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
    probation: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    permanent: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    masik_parishram: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
    allowance: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20',
    mandey: 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
  };
  return colors[category] || 
    'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-primary)]';
};

export const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    daily_wage: 'दैनिक वेतन',
    samvida: 'संविदा',
    probation: 'परिवीक्षा',
    permanent: 'स्थायी',
    masik_parishram: 'मासिक पारिश्रम',
    allowance: 'अलाउन्स',
    mandey: 'मानदेय'
  };
  return labels[category] || category;
};
