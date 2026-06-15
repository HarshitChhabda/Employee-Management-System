import React, { useState, useEffect } from 'react';
import { Sparkles, Trash2, ShieldAlert, AlertCircle, Users, Building2, CheckCircle2, RotateCcw, ArrowRight, Languages } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { masterAPI, employeeAPI } from '../../services/api';
import { findNameVariants, type NameVariant, type NameVariantGroup } from '../../lib/hindiNormalize';
import type { Employee } from '../../types/hrms';

interface MasterItem {
  id: string;
  name: string;
}

interface MasterDuplicateGroup {
  name: string;
  items: MasterItem[];
  usageCount: number;
}

interface EmployeeDuplicateGroup {
  key: string;
  employees: Employee[];
}

export default function DataCleanup() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [deptDuplicates, setDeptDuplicates] = useState<MasterDuplicateGroup[]>([]);
  const [desigDuplicates, setDesigDuplicates] = useState<MasterDuplicateGroup[]>([]);
  const [empDuplicates, setEmpDuplicates] = useState<EmployeeDuplicateGroup[]>([]);

  const [cleanupTab, setCleanupTab] = useState<'masters' | 'employees' | 'names'>('masters');
  const [showAllMasters, setShowAllMasters] = useState(false);
  const [allDepartments, setAllDepartments] = useState<MasterItem[]>([]);
  const [allDesignations, setAllDesignations] = useState<MasterItem[]>([]);
  const [nameVariants, setNameVariants] = useState<NameVariantGroup[]>([]);
  const [selectedNames, setSelectedNames] = useState<Record<string, string>>({});
  const [renamingLoading, setRenamingLoading] = useState(false);
  const [skippedGroups, setSkippedGroups] = useState<Set<number>>(new Set());
  const [individualLoading, setIndividualLoading] = useState<Record<string, boolean>>({});

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mastersRes, employeesRes] = await Promise.all([
        masterAPI.getAll(),
        employeeAPI.getAll(),
      ]);

      const departments = mastersRes?.departments || [];
      const designations = mastersRes?.designations || [];
      const employees = Array.isArray(employeesRes) ? employeesRes : [];

      // Process Master Duplicates
      const normalizeMasterName = (name: string): string => {
        return name.trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
      };

      const processMasters = (items: MasterItem[], type: 'dept' | 'desig'): MasterDuplicateGroup[] => {
        const groups: Record<string, MasterItem[]> = {};
        items.forEach(item => {
          const key = normalizeMasterName(item.name);
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
        });

        return Object.values(groups)
          .filter(group => group.length > 1)
          .map(group => {
            const canonicalName = normalizeMasterName(group[0].name);
            const usageCount = employees.filter(e => {
              const val = type === 'dept' ? e.department : e.designation;
              return val && normalizeMasterName(val) === canonicalName;
            }).length;

            return {
              name: group[0].name.trim(),
              items: group,
              usageCount
            };
          });
      };

      setDeptDuplicates(processMasters(departments, 'dept'));
      setDesigDuplicates(processMasters(designations, 'desig'));
      setAllDepartments(departments);
      setAllDesignations(designations);

      // Detect Hindi name variants in employee names, departments AND designations
      const allNames = [
        ...employees.map(e => e.name).filter(Boolean),
        ...departments.map(d => d.name).filter(Boolean),
        ...designations.map(d => d.name).filter(Boolean),
      ];
      const variants = findNameVariants(allNames);
      setNameVariants(variants);

      // Auto-select canonical names
      const initialSelections: Record<string, string> = {};
      variants.forEach(group => {
        initialSelections[group.canonical] = group.canonical;
        group.variants.forEach(v => {
          if (v.original !== group.canonical) {
            initialSelections[v.original] = group.canonical;
          }
        });
      });
      setSelectedNames(initialSelections);

      // Process Employee Duplicates
      const empGroups: Record<string, Employee[]> = {};
      employees.forEach(emp => {
        if (!emp.name) return;
        
        let key = '';
        if (emp.aadhar_number && emp.aadhar_number.trim() !== '') {
          key = `AADHAR:${emp.aadhar_number.trim()}`;
        } else {
          key = `NAME:${emp.name.trim().toLowerCase()}_DEPT:${emp.department?.trim().toLowerCase() || 'none'}`;
        }

        if (!empGroups[key]) empGroups[key] = [];
        empGroups[key].push(emp);
      });

      const duplicateEmps = Object.entries(empGroups)
        .filter(([_, group]) => group.length > 1)
        .map(([key, group]) => ({ key, employees: group }));

      setEmpDuplicates(duplicateEmps);

    } catch (err) {
      console.error('Error fetching data for cleanup:', err);
      showMsg('Failed to load data for cleanup', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteMaster = async (id: string, type: 'dept' | 'desig') => {
    if (!confirm(language === 'hi' ? 'क्या आप वाकई इस अतिरिक्त मास्टर एंट्री को हटाना चाहते हैं?' : 'Are you sure you want to delete this extra master entry?')) return;
    
    try {
      if (type === 'dept') {
        await masterAPI.deleteDepartment(id);
      } else {
        await masterAPI.deleteDesignation(id);
      }
      showMsg(language === 'hi' ? 'अतिरिक्त एंट्री हटा दी गई' : 'Extra entry removed');
      fetchData();
      window.dispatchEvent(new Event('mastersUpdated'));
    } catch (err) {
      showMsg('Failed to delete master entry', 'error');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm(language === 'hi' 
      ? 'चेतावनी: क्या आप वाकई इस डुप्लिकेट कर्मचारी को स्थायी रूप से हटाना चाहते हैं? इसका पूरा डेटा मिट जाएगा।' 
      : 'WARNING: Are you sure you want to permanently delete this duplicate employee? All their data will be lost.')) return;
      
    try {
      await employeeAPI.hardDelete(id);
      showMsg(language === 'hi' ? 'कर्मचारी सफलतापूर्वक हटा दिया गया' : 'Employee successfully deleted');
      fetchData();
    } catch (err) {
      showMsg('Failed to delete employee', 'error');
    }
  };

  const handleBatchRename = async () => {
    const activeGroups = nameVariants.filter((_, i) => !skippedGroups.has(i));
    if (activeGroups.length === 0) {
      showMsg(language === 'hi' ? 'कोई समूह चयनित नहीं है' : 'No groups selected', 'error');
      return;
    }

    if (!confirm(language === 'hi'
      ? 'क्या आप इन सभी नामों को एकरूप देना चाहते हैं? डेटाबेस और मास्टर लिस्ट दोनों में बदलाव होगा।'
      : 'Standardize all selected names? This will update employees AND master lists in the database.')) return;

    setRenamingLoading(true);
    try {
      let totalUpdated = 0;
      const masterRenames: Array<{ oldName: string; newName: string; type: 'dept' | 'desig' }> = [];
      const nameRenames: Array<{ oldName: string; newName: string }> = [];

      for (const group of activeGroups) {
        const canonical = selectedNames[group.canonical] || group.canonical;
        for (const variant of group.variants) {
          const selectedTarget = selectedNames[variant.original] || canonical;
          if (variant.original !== selectedTarget) {
            // Check if this variant exists in departments
            if (allDepartments.some(d => d.name === variant.original)) {
              masterRenames.push({ oldName: variant.original, newName: selectedTarget, type: 'dept' });
            }
            // Check if this variant exists in designations
            if (allDesignations.some(d => d.name === variant.original)) {
              masterRenames.push({ oldName: variant.original, newName: selectedTarget, type: 'desig' });
            }

            // Collect employee name renames
            nameRenames.push({ oldName: variant.original, newName: selectedTarget });

            // Rename employees (department/designation fields)
            const res = await employeeAPI.batchRename([
              { oldName: variant.original, newName: selectedTarget, field: 'department' },
              { oldName: variant.original, newName: selectedTarget, field: 'designation' },
            ]);
            totalUpdated += res.updated || 0;
          }
        }
      }

      // Rename employee names
      if (nameRenames.length > 0) {
        const nameRes = await employeeAPI.batchRenameNames(nameRenames);
        totalUpdated += nameRes.updated || 0;
      }

      // Rename master entries
      if (masterRenames.length > 0) {
        await employeeAPI.batchRenameMasters(masterRenames);
        window.dispatchEvent(new Event('mastersUpdated'));
      }

      showMsg(language === 'hi'
        ? `${totalUpdated} कर्मचारी + ${masterRenames.length} मास्टर एंट्री एकरूप की गईं`
        : `${totalUpdated} employees + ${masterRenames.length} master entries standardized`);
      fetchData();
    } catch (err) {
      showMsg('Failed to standardize names', 'error');
    } finally {
      setRenamingLoading(false);
    }
  };

  const handleIndividualRename = async (variant: NameVariant, targetName: string) => {
    if (variant.original === targetName) return;

    const key = variant.original;
    setIndividualLoading(prev => ({ ...prev, [key]: true }));

    try {
      const res = await employeeAPI.batchRenameNames([{ oldName: variant.original, newName: targetName }]);
      const deptRes = await employeeAPI.batchRename([
        { oldName: variant.original, newName: targetName, field: 'department' },
        { oldName: variant.original, newName: targetName, field: 'designation' },
      ]);

      showMsg(language === 'hi'
        ? `"${variant.original}" → "${targetName}" (${res.updated + deptRes.updated} अपडेट)`
        : `"${variant.original}" → "${targetName}" (${res.updated + deptRes.updated} updates)`);
      fetchData();
    } catch (err) {
      showMsg('Failed to rename', 'error');
    } finally {
      setIndividualLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleKeepBoth = (groupIndex: number) => {
    setSkippedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupIndex)) {
        next.delete(groupIndex);
      } else {
        next.add(groupIndex);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)] font-bold">
        <RotateCcw className="w-8 h-8 animate-spin mb-4 text-blue-500" />
        <p>{language === 'hi' ? 'डेटाबेस स्कैन हो रहा है...' : 'Scanning database...'}</p>
      </div>
    );
  }

  const totalMasterDuplicates = deptDuplicates.length + desigDuplicates.length;

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-6xl mx-auto">
      
      {message && (
        <div className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all animate-fade-in shadow-md ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border border-red-500/30 text-red-500'
        }`}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-1 w-fit shadow-sm">
        <button
          onClick={() => setCleanupTab('masters')}
          className={`px-6 py-2.5 text-sm font-black rounded-lg transition-all flex items-center gap-2 ${
            cleanupTab === 'masters' ? 'bg-blue-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{language === 'hi' ? 'मास्टर सफाई (Master Cleanup)' : 'Master Cleanup'}</span>
          {totalMasterDuplicates > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{totalMasterDuplicates}</span>
          )}
        </button>
        <button
          onClick={() => setCleanupTab('employees')}
          className={`px-6 py-2.5 text-sm font-black rounded-lg transition-all flex items-center gap-2 ${
            cleanupTab === 'employees' ? 'bg-orange-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{language === 'hi' ? 'कर्मचारी सफाई (Employee Cleanup)' : 'Employee Cleanup'}</span>
          {empDuplicates.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{empDuplicates.length}</span>
          )}
        </button>
        <button
          onClick={() => setCleanupTab('names')}
          className={`px-6 py-2.5 text-sm font-black rounded-lg transition-all flex items-center gap-2 ${
            cleanupTab === 'names' ? 'bg-purple-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
          }`}
        >
          <Languages className="w-4 h-4" />
          <span>{language === 'hi' ? 'नाम एकरूपता (Name Standardize)' : 'Name Standardize'}</span>
          {nameVariants.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{nameVariants.length}</span>
          )}
        </button>
      </div>

      {/* Masters Cleanup */}
      {cleanupTab === 'masters' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-blue-500 rounded-xl text-white mt-0.5 shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-blue-600 dark:text-blue-400 text-sm mb-1 uppercase tracking-wide">
                {language === 'hi' ? 'सुरक्षित सफाई (Safe Cleanup)' : 'Safe Cleanup Mode'}
              </h3>
              <p className="text-xs font-bold text-[var(--text-secondary)] leading-relaxed">
                {language === 'hi' 
                  ? 'अतिरिक्त (Extra) विभागों या पदनामों को हटाने से किसी भी कर्मचारी का डेटा डिलीट नहीं होगा। यह प्रक्रिया 100% सुरक्षित है और केवल ड्रॉपडाउन लिस्ट को साफ़ करती है।' 
                  : 'Deleting extra departments or designations will NOT delete any employee data. This is 100% safe and only cleans up your dropdown lists.'}
              </p>
            </div>
          </div>

          {totalMasterDuplicates === 0 ? (
            <div className="text-center py-16 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                {language === 'hi' ? 'कोई मास्टर डुप्लिकेट नहीं!' : 'No Master Duplicates!'}
              </h3>
              <p className="text-sm font-bold text-[var(--text-secondary)]">
                {language === 'hi' ? 'आपकी मास्टर लिस्ट एकदम साफ है।' : 'Your master lists are clean and perfectly organized.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Departments */}
              <div className="space-y-4">
                <h4 className="font-black text-[var(--text-primary)] uppercase tracking-widest text-xs flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  {language === 'hi' ? 'डुप्लिकेट विभाग' : 'Duplicate Departments'}
                </h4>
                {deptDuplicates.length === 0 ? (
                  <p className="text-xs font-bold text-[var(--text-secondary)] italic">No duplicates found.</p>
                ) : (
                  deptDuplicates.map((group, i) => (
                    <div key={i} className="bg-[var(--bg-card)] border-2 border-amber-500/30 rounded-2xl p-5 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h5 className="font-black text-lg text-[var(--text-primary)]">{group.name}</h5>
                          <span className="inline-block mt-1 px-2.5 py-1 bg-[var(--bg-secondary)] text-[10px] uppercase font-black tracking-wider rounded-lg text-[var(--text-secondary)]">
                            {group.usageCount} {language === 'hi' ? 'कर्मचारियों में उपयोग' : 'Employees Using'}
                          </span>
                        </div>
                        <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">
                          {group.items.length} {language === 'hi' ? 'एंट्रीज' : 'Entries'}
                        </span>
                      </div>
                      <div className="space-y-2 mt-4">
                        {group.items.map((item, idx) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] group">
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-xs font-bold text-[var(--text-primary)] block truncate">"{item.name}"</span>
                              <span className="font-mono text-[10px] font-bold text-[var(--text-secondary)]">ID: {item.id.slice(0, 8)}... | Len: {item.name.length}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {idx === 0 && <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">{language === 'hi' ? 'इसे रखें' : 'Keep This'}</span>}
                              {idx > 0 && (
                                <button
                                  onClick={() => handleDeleteMaster(item.id, 'dept')}
                                  className="flex items-center gap-1.5 text-xs font-black bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{language === 'hi' ? 'हटाएं' : 'Delete'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Designations */}
              <div className="space-y-4">
                <h4 className="font-black text-[var(--text-primary)] uppercase tracking-widest text-xs flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-500" />
                  {language === 'hi' ? 'डुप्लिकेट पदनाम' : 'Duplicate Designations'}
                </h4>
                {desigDuplicates.length === 0 ? (
                  <p className="text-xs font-bold text-[var(--text-secondary)] italic">No duplicates found.</p>
                ) : (
                  desigDuplicates.map((group, i) => (
                    <div key={i} className="bg-[var(--bg-card)] border-2 border-amber-500/30 rounded-2xl p-5 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h5 className="font-black text-lg text-[var(--text-primary)]">{group.name}</h5>
                          <span className="inline-block mt-1 px-2.5 py-1 bg-[var(--bg-secondary)] text-[10px] uppercase font-black tracking-wider rounded-lg text-[var(--text-secondary)]">
                            {group.usageCount} {language === 'hi' ? 'कर्मचारियों में उपयोग' : 'Employees Using'}
                          </span>
                        </div>
                        <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">
                          {group.items.length} {language === 'hi' ? 'एंट्रीज' : 'Entries'}
                        </span>
                      </div>
                      <div className="space-y-2 mt-4">
                        {group.items.map((item, idx) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] group">
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-xs font-bold text-[var(--text-primary)] block truncate">"{item.name}"</span>
                              <span className="font-mono text-[10px] font-bold text-[var(--text-secondary)]">ID: {item.id.slice(0, 8)}... | Len: {item.name.length}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {idx === 0 && <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">{language === 'hi' ? 'इसे रखें' : 'Keep This'}</span>}
                              {idx > 0 && (
                                <button
                                  onClick={() => handleDeleteMaster(item.id, 'desig')}
                                  className="flex items-center gap-1.5 text-xs font-black bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{language === 'hi' ? 'हटाएं' : 'Delete'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Debug: Show All Masters */}
          <div className="mt-4">
            <button
              onClick={() => setShowAllMasters(!showAllMasters)}
              className="text-xs font-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline cursor-pointer"
            >
              {showAllMasters ? 'Hide' : 'Show All'} Masters ({allDepartments.length} depts, {allDesignations.length} desigs)
            </button>
            {showAllMasters && (
              <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4 max-h-60 overflow-y-auto">
                  <p className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-2 font-mono">All Departments ({allDepartments.length})</p>
                  {allDepartments.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border-primary)] last:border-0">
                      <span className="font-mono text-[11px] font-bold text-[var(--text-primary)]">"{d.name}"</span>
                      <span className="font-mono text-[9px] text-[var(--text-secondary)]">len:{d.name.length} id:{d.id.slice(0,6)}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4 max-h-60 overflow-y-auto">
                  <p className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-2 font-mono">All Designations ({allDesignations.length})</p>
                  {allDesignations.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border-primary)] last:border-0">
                      <span className="font-mono text-[11px] font-bold text-[var(--text-primary)]">"{d.name}"</span>
                      <span className="font-mono text-[9px] text-[var(--text-secondary)]">len:{d.name.length} id:{d.id.slice(0,6)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employees Cleanup */}
      {cleanupTab === 'employees' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-red-500 rounded-xl text-white mt-0.5 shadow-md">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-red-600 dark:text-red-400 text-sm mb-1 uppercase tracking-wide">
                {language === 'hi' ? 'खतरा क्षेत्र (Danger Zone)' : 'Danger Zone'}
              </h3>
              <p className="text-xs font-bold text-[var(--text-secondary)] leading-relaxed">
                {language === 'hi' 
                  ? 'कर्मचारी को यहाँ से हटाने पर उसका पूरा रिकॉर्ड (हाजिरी, छुट्टियां आदि) हमेशा के लिए डिलीट हो जाएगा। कृपया हटाने से पहले ध्यान से जाँच लें कि आप सही डुप्लिकेट हटा रहे हैं।' 
                  : 'Deleting an employee from here will permanently erase their entire record (attendance, leaves, etc.). Please verify carefully before deleting.'}
              </p>
            </div>
          </div>

          {empDuplicates.length === 0 ? (
            <div className="text-center py-16 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                {language === 'hi' ? 'कोई डुप्लिकेट कर्मचारी नहीं!' : 'No Duplicate Employees!'}
              </h3>
              <p className="text-sm font-bold text-[var(--text-secondary)]">
                {language === 'hi' ? 'आपका कर्मचारी डेटाबेस एकदम साफ है।' : 'Your employee database is perfectly deduplicated.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {empDuplicates.map((group, i) => (
                <div key={i} className="bg-[var(--bg-card)] border-2 border-red-500/30 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-5 border-b border-[var(--border-primary)] pb-4">
                    <div className="w-10 h-10 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center font-black text-lg text-[var(--text-primary)] border border-[var(--border-primary)]">
                      {group.employees[0].name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-[var(--text-primary)]">{group.employees[0].name}</h4>
                      <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">
                        {group.key.startsWith('AADHAR:') ? 'Matched by Aadhar Number' : 'Matched by Name & Department'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {group.employees.map((emp) => (
                      <div key={emp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] gap-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs font-bold flex-grow">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] block mb-0.5">Emp Code</span>
                            <span className="text-[var(--text-primary)]">{emp.employee_code || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] block mb-0.5">Department</span>
                            <span className="text-[var(--text-primary)]">{emp.department || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] block mb-0.5">Mobile</span>
                            <span className="text-[var(--text-primary)]">{emp.mobile_number || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] block mb-0.5">Aadhar</span>
                            <span className="text-[var(--text-primary)]">{emp.aadhar_number || '-'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="flex-shrink-0 flex items-center justify-center gap-2 text-xs font-black bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl shadow-md transition-all sm:w-auto w-full"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{language === 'hi' ? 'हटाएं' : 'Delete Record'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Names Standardization */}
      {cleanupTab === 'names' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-purple-500 rounded-xl text-white mt-0.5 shadow-md">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-purple-600 dark:text-purple-400 text-sm mb-1 uppercase tracking-wide">
                {language === 'hi' ? 'हिंदी नाम एकरूपता (Hindi Name Standardization)' : 'Hindi Name Standardization'}
              </h3>
              <p className="text-xs font-bold text-[var(--text-secondary)] leading-relaxed">
                {language === 'hi'
                  ? 'एक ही नाम के अलग-अलग हिंदी लिखावट (जैसे "हैल्पर" और "हेल्पर") को पहचानकर एकरूप करता है। प्रत्येक समूह के लिए अलग से या सभी एक साथ एकरूप करें। "दोनों रखें" से उस समूह को छोड़ सकते हैं।'
                  : 'Detects different Hindi spellings of the same name (e.g. "हैल्पर" vs "हेल्पर") and standardizes them. Standardize per-group or all at once. Use "Keep Both" to skip a group.'}
              </p>
            </div>
          </div>

          {nameVariants.length === 0 ? (
            <div className="text-center py-16 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                {language === 'hi' ? 'कोई नाम भिन्नता नहीं!' : 'No Name Variants Found!'}
              </h3>
              <p className="text-sm font-bold text-[var(--text-secondary)]">
                {language === 'hi' ? 'सभी कर्मचारी नाम एकरूप हैं।' : 'All employee names are consistent.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[var(--text-secondary)]">
                  {nameVariants.length} {language === 'hi' ? 'नाम समूह मिले' : 'name groups found'}
                  {skippedGroups.size > 0 && (
                    <span className="ml-2 text-amber-500">
                      • {skippedGroups.size} {language === 'hi' ? 'छोड़े गए' : 'skipped'}
                    </span>
                  )}
                </p>
                <button
                  onClick={handleBatchRename}
                  disabled={renamingLoading || nameVariants.filter((_, i) => !skippedGroups.has(i)).length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-purple-500/20 cursor-pointer disabled:opacity-50"
                >
                  {renamingLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {language === 'hi' ? 'चयनित सभी एकरूप करें' : 'Standardize Selected'}
                </button>
              </div>

              <div className="space-y-4">
                {nameVariants.map((group, i) => {
                  const isSkipped = skippedGroups.has(i);
                  return (
                    <div key={i} className={`bg-[var(--bg-card)] border-2 rounded-2xl p-5 shadow-sm transition-all ${
                      isSkipped ? 'border-amber-500/30 opacity-60' : 'border-purple-500/20'
                    }`}>
                      <div className="flex items-center gap-3 mb-4 border-b border-[var(--border-primary)] pb-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg border ${
                          isSkipped
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                        }`}>
                          {group.canonical.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-black text-lg text-[var(--text-primary)]">
                            {language === 'hi' ? 'मानक नाम:' : 'Canonical:'} <span className="text-purple-500">{group.canonical}</span>
                          </h4>
                          <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">
                            {group.totalCount} {language === 'hi' ? 'कर्मचारी प्रभावित' : 'employees affected'} • 
                            {language === 'hi' ? ' विश्वास स्तर:' : ' Confidence:'} {Math.round(group.confidence * 100)}%
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleKeepBoth(i)}
                            className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${
                              isSkipped
                                ? 'bg-amber-500 text-white'
                                : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30'
                            }`}
                          >
                            {isSkipped
                              ? (language === 'hi' ? 'दोनों रखे गए' : 'Both Kept')
                              : (language === 'hi' ? 'दोनों रखें' : 'Keep Both')}
                          </button>
                          {!isSkipped && (
                            <button
                              onClick={() => {
                                const canonical = selectedNames[group.canonical] || group.canonical;
                                const renames = group.variants
                                  .filter(v => v.original !== canonical)
                                  .map(v => ({ oldName: v.original, newName: canonical }));
                                if (renames.length > 0) {
                                  handleIndividualRename({ original: renames[0].oldName, normalized: renames[0].oldName, count: 0 }, renames[0].newName);
                                }
                              }}
                              disabled={renamingLoading}
                              className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-purple-500 text-white px-3 py-1.5 rounded-lg transition-all hover:opacity-90 shadow-sm"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {language === 'hi' ? 'इस समूह को एकरूप करें' : 'Standardize Group'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3">
                        {group.variants.map((variant) => (
                          <div key={variant.original} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border gap-3 ${
                            variant.original === group.canonical
                              ? 'bg-purple-500/5 border-purple-500/20'
                              : 'bg-[var(--bg-secondary)] border-[var(--border-primary)]'
                          }`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="font-black text-sm text-[var(--text-primary)] truncate">"{variant.original}"</span>
                              {variant.original !== group.canonical && (
                                <ArrowRight className="w-4 h-4 text-purple-500 flex-shrink-0" />
                              )}
                              {variant.original !== group.canonical ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={selectedNames[variant.original] || group.canonical}
                                    onChange={(e) => setSelectedNames(prev => ({ ...prev, [variant.original]: e.target.value }))}
                                    className="px-3 py-1.5 bg-[var(--bg-card)] border border-purple-500/30 rounded-lg text-xs font-bold text-purple-500 focus:outline-none focus:border-purple-500 cursor-pointer"
                                  >
                                    {group.variants.map(v => (
                                      <option key={v.original} value={v.original}>{v.original}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleIndividualRename(variant, selectedNames[variant.original] || group.canonical)}
                                    disabled={individualLoading[variant.original] || variant.original === (selectedNames[variant.original] || group.canonical)}
                                    className="flex items-center gap-1 text-[10px] font-black bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40 shadow-sm"
                                  >
                                    {individualLoading[variant.original] ? (
                                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3 h-3" />
                                    )}
                                    {language === 'hi' ? 'अपडेट' : 'Update'}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] font-black uppercase text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-lg">
                                  {language === 'hi' ? 'मानक' : 'Canonical'}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-[var(--text-secondary)] font-mono">
                              {variant.count} {language === 'hi' ? 'कर्मचारी' : 'employees'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
