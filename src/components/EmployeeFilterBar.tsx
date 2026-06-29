import { useEffect, useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { categories } from '../lib/hindiLabels';
import { masterAPI } from '../services/api';

interface EmployeeFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentChange: (value: string) => void;
  designationFilter: string;
  onDesignationChange: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
}

export default function EmployeeFilterBar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  departmentFilter,
  onDepartmentChange,
  designationFilter,
  onDesignationChange,
  searchPlaceholder = 'कर्मचारी खोजें (Search employees...)',
  showSearch = true,
}: EmployeeFilterBarProps) {
  const [masterDepartments, setMasterDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [masterDesignations, setMasterDesignations] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const data = await masterAPI.getAll();
        setMasterDepartments(data?.departments || []);
        setMasterDesignations(data?.designations || []);
      } catch (err) {
        console.error('Error fetching masters:', err);
      }
    };
    fetchMasters();
    window.addEventListener('mastersUpdated', fetchMasters);
    return () => window.removeEventListener('mastersUpdated', fetchMasters);
  }, []);

  const hasActiveFilters = categoryFilter || departmentFilter || designationFilter;

  const clearAllFilters = () => {
    onSearchChange('');
    onCategoryChange('');
    onDepartmentChange('');
    onDesignationChange('');
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border-primary)] shadow-lg">
      {showSearch && (
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-blue-500 focus:outline-none font-bold text-xs shadow-sm"
          />
        </div>
      )}

      {/* Category Filter */}
      <div className="relative">
        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="pl-12 pr-10 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-blue-500 focus:outline-none appearance-none cursor-pointer min-w-[200px] font-bold text-xs shadow-sm"
        >
          <option value="">सभी श्रेणियां (All Categories)</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.labelHi}</option>
          ))}
        </select>
      </div>

      {/* Department Filter */}
      <div className="relative">
        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
        <select
          value={departmentFilter}
          onChange={(e) => onDepartmentChange(e.target.value)}
          className="pl-12 pr-10 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-blue-500 focus:outline-none appearance-none cursor-pointer min-w-[200px] font-bold text-xs shadow-sm"
        >
          <option value="">सभी विभाग (All Departments)</option>
          {masterDepartments.map(d => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Designation Filter */}
      <div className="relative">
        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
        <select
          value={designationFilter}
          onChange={(e) => onDesignationChange(e.target.value)}
          className="pl-12 pr-10 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-blue-500 focus:outline-none appearance-none cursor-pointer min-w-[200px] font-bold text-xs shadow-sm"
        >
          <option value="">सभी पदनाम (All Designations)</option>
          {masterDesignations.map(d => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Clear All Button */}
      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="flex items-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all font-bold text-xs cursor-pointer whitespace-nowrap"
        >
          <X className="w-4 h-4" />
          <span>Clear All</span>
        </button>
      )}
    </div>
  );
}
