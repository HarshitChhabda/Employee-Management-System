import { useEffect, useState, Fragment, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  History,
  FileText,
  UserX,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Printer,
  Download,
  Upload,
} from 'lucide-react';
import { hindiLabels, categories } from '../lib/hindiLabels';
import { getCategoryLabel, getCategoryColor } from '../lib/categoryUtils';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { employeeAPI, masterAPI, tenureAPI, resignedAPI } from '../services/api';
import type { Employee as EmployeeType } from '../types/hrms';
import * as XLSX from 'xlsx';
import toUnicode from '@anthro-ai/krutidev-unicode';

interface Employee extends EmployeeType {
  category_history?: Array<{
    changed_at: string;
    old_category: string;
    category: string;
    reason?: string;
  }>;
  employment_status?: string;
}

type WeeklyOffDay = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

interface ImportBatch {
  id: string;
  fileName: string;
  date: string;
  count: number;
  employeeIds: string[];
}

const IMPORT_BATCHES_KEY = 'employee_import_batches';

const getImportBatches = (): ImportBatch[] => {
  try {
    const data = localStorage.getItem(IMPORT_BATCHES_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

const saveImportBatch = (batch: ImportBatch) => {
  const batches = getImportBatches();
  batches.unshift(batch);
  localStorage.setItem(IMPORT_BATCHES_KEY, JSON.stringify(batches));
};

const removeImportBatch = (id: string) => {
  const batches = getImportBatches().filter(b => b.id !== id);
  localStorage.setItem(IMPORT_BATCHES_KEY, JSON.stringify(batches));
};

export default function Employees() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isDevLys, setIsDevLys] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportHistory, setShowImportHistory] = useState(false);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>(getImportBatches());
  const [deletingBatch, setDeletingBatch] = useState<ImportBatch | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee> & { category_change_reason?: string }>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'gov' | 'bank'>('basic');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searching, setSearching] = useState(false);

  const [masterDepartments, setMasterDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [masterDesignations, setMasterDesignations] = useState<Array<{ id: string; name: string }>>([]);
  const [renewalEmployee, setRenewalEmployee] = useState<Employee | null>(null);
  const [renewalHistory, setRenewalHistory] = useState<any[]>([]);
  const [renewalData, setRenewalData] = useState({
    new_tenure_end_date: '',
    letter_number: '',
    letter_date: '',
    remarks: ''
  });
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [pendingWeeklyOffDay, setPendingWeeklyOffDay] = useState<string | null>(null);
  const [deleteConfirmEmployee, setDeleteConfirmEmployee] = useState<Employee | null>(null);
  const [resignEmployee, setResignEmployee] = useState<Employee | null>(null);
  const [resigning, setResigning] = useState(false);
  const [resignData, setResignData] = useState({ reason: '', resign_date: new Date().toISOString().split('T')[0] });
  const [showReportModal, setShowReportModal] = useState(false);
  const [empPage, setEmpPage] = useState(1);
  const [empShowAll, setEmpShowAll] = useState(false);
  const EMP_PAGE_SIZE = 25;

  const handleDeleteBatch = async () => {
    if (!deletingBatch) return;
    let deletedCount = 0;
    for (const empId of deletingBatch.employeeIds) {
      try {
        await employeeAPI.hardDelete(empId);
        deletedCount++;
      } catch {}
    }
    removeImportBatch(deletingBatch.id);
    setImportBatches(getImportBatches());
    setDeletingBatch(null);
    showToast(`${deletedCount} imported employees permanently deleted / ${deletedCount} आयात किए गए कर्मचारी स्थायी रूप से हटाए गए`, 'success');
    fetchEmployees();
  };

  const handleSelectPhoto = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    if (e && e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData((prev: any) => ({ ...prev, photo_url: event.target.result as string }));
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    if (window.electronAPI && window.electronAPI.selectPhoto) {
      try {
        const photoBase64 = await window.electronAPI.selectPhoto();
        if (photoBase64) {
          setFormData((prev: any) => ({ ...prev, photo_url: photoBase64 }));
        }
      } catch (err) {
        console.error('Error selecting photo via Electron:', err);
      }
    }
  };

  const handleWeeklyOffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (editingEmployee && val !== editingEmployee.weekly_off) {
      setPendingWeeklyOffDay(val);
    } else {
      setFormData((prev: any) => ({ ...prev, weekly_off: val }));
    }
  };

  const fetchMasters = async () => {
    try {
      const data = await masterAPI.getAll();
      setMasterDepartments(data?.departments || []);
      setMasterDesignations(data?.designations || []);
    } catch (err) {
      console.error('Error fetching masters:', err);
    }
  };

  useEffect(() => {
    fetchMasters();
    window.addEventListener('mastersUpdated', fetchMasters);
    return () => window.removeEventListener('mastersUpdated', fetchMasters);
  }, []);

  useEffect(() => {
    setEmpPage(1);
    setEmpShowAll(false);
    fetchEmployees();
  }, [searchQuery, categoryFilter, departmentFilter, designationFilter]);

  const openRenewalModal = async (employee: Employee) => {
    setRenewalEmployee(employee);
    setRenewalData({
      new_tenure_end_date: employee.tenure_end_date || '',
      letter_number: '',
      letter_date: new Date().toISOString().split('T')[0],
      remarks: ''
    });
    setRenewalLoading(true);
    try {
      const list = await tenureAPI.getAll(employee.id);
      setRenewalHistory(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setRenewalHistory([]);
    } finally {
      setRenewalLoading(false);
    }
  };

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewalEmployee) return;
    try {
      await tenureAPI.create({
        employee_id: renewalEmployee.id,
        renewal_date: new Date().toISOString().split('T')[0],
        new_tenure_end_date: renewalData.new_tenure_end_date,
        letter_number: renewalData.letter_number,
        letter_date: renewalData.letter_date,
        remarks: renewalData.remarks
      });
      showToast('Tenure renewed successfully / कार्यकाल सफलतापूर्वक नवीनीकृत', 'success');
      setRenewalEmployee(null);
      fetchEmployees();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to renew tenure';
      showToast(message, 'error');
    }
  };

  const fetchEmployees = async () => {
    setSearching(true);
    setLoading(true);
    try {
      const params: { search?: string; category?: string } = {};
      if (searchQuery) params.search = searchQuery;
      if (categoryFilter) params.category = categoryFilter;

      const data = await employeeAPI.getAll(params);
      let filtered = Array.isArray(data) ? data : [];

      if (departmentFilter) {
        filtered = filtered.filter(e => e.department === departmentFilter);
      }
      if (designationFilter) {
        filtered = filtered.filter(e => e.designation === designationFilter);
      }

      filtered.sort((a, b) => (a.employee_code || '').localeCompare(b.employee_code || '', undefined, { numeric: true }));

      setEmployees(filtered);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Failed to load employees / कर्मचारी लोड करने में विफल', 'error');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingEmployee) {
        const { category_change_reason, ...rest } = formData;
        await employeeAPI.update(editingEmployee.id, {
          ...rest,
          category_change_reason,
        });
        showToast('Employee updated successfully / कर्मचारी सफलतापूर्वक अपडेट किया गया', 'success');
      } else {
        await employeeAPI.create(formData);
        showToast('Employee added successfully / कर्मचारी सफलतापूर्वक जोड़ा गया', 'success');
      }
      setShowModal(false);
      setEditingEmployee(null);
      setFormData({});
      fetchEmployees();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save employee';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await employeeAPI.delete(id);
      showToast('Employee deleted / कर्मचारी हटाया गया', 'success');
      fetchEmployees();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete employee';
      showToast(message, 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmEmployee(null);
    }
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      ...employee,
      // Support backward compatible field names
      phone: employee.mobile_number || employee.phone || ''
    });
    setActiveTab('basic');
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    const nextNum = employees.length + 1;
    const autoCode = `Emp${String(nextNum).padStart(4, '0')}`;
    setFormData({
      employee_code: autoCode,
      is_active: 1,
      category: 'daily_wage',
      joining_date: new Date().toISOString().split('T')[0],
      title: 'Shri',
      weekly_off: 'None'
    });
    setActiveTab('basic');
    setShowModal(true);
  };

  const markAsResigned = async () => {
    if (!resignEmployee || !resignData.reason.trim()) {
      showToast('Please enter resignation reason / इस्तीफा का कारण दर्ज करें', 'warning');
      return;
    }

    setResigning(true);
    try {
      await resignedAPI.create({
        employee_id: resignEmployee.id,
        reason: resignData.reason,
        resign_date: resignData.resign_date,
      });
      showToast('Employee marked as resigned / कर्मचारी को सेवानिवृत् चिह्नित किया गया', 'success');
      setResignEmployee(null);
      setResignData({ reason: '', resign_date: new Date().toISOString().split('T')[0] });
      fetchEmployees();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark as resigned';
      showToast(message, 'error');
    } finally {
      setResigning(false);
    }
  };

  const viewHistory = async (employeeId: string) => {
    if (showHistory === employeeId) {
      setShowHistory(null);
      return;
    }
    try {
      const data = await employeeAPI.getById(employeeId);
      if (data) {
        setEmployees(prev => {
          const idx = prev.findIndex(e => e.id === employeeId);
          if (idx < 0) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], category_history: (data as any).category_history };
          return updated;
        });
      }
      setShowHistory(employeeId);
    } catch (err) {
      console.error('History error:', err);
    }
  };

  const selectedCategoryObj = categories.find(c => c.value === categoryFilter);
  const categoryTextHi = selectedCategoryObj ? `${selectedCategoryObj.labelHi} ` : '';
  const dynamicReportTitle = `सूची : मैनेजर कार्यालय एवं अन्य इकाइयों में कार्यरत ${categoryTextHi}कर्मचारी`;

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const headers = [
      'क्र.सं.',
      'नाम',
      'पिता का नाम',
      'आधार नम्बर',
      'मोबाइल नंबर',
      'जन्म दिनांक',
      'नियुक्ति दिनांक',
      'सेवा अवधि दिनांक',
      'पद',
      'कार्यरत स्थान',
      'वर्तमान वेतन'
    ];

    const wsData: any[][] = [];
    wsData.push(['दिगम्बर जैन अतिशय क्षेत्र , श्री महावीर जी']);
    wsData.push([dynamicReportTitle]);
    wsData.push(headers);

    employees.forEach((emp, index) => {
      wsData.push([
        (index + 1).toString(),
        emp.name || '-',
        emp.fathers_name || '-',
        emp.aadhar_number || '-',
        emp.mobile_number || emp.phone || '-',
        emp.dob ? new Date(emp.dob).toLocaleDateString('en-IN') : '-',
        emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-IN') : '-',
        emp.tenure_end_date ? new Date(emp.tenure_end_date).toLocaleDateString('en-IN') : '-',
        emp.designation || '-',
        emp.department || '-',
        emp.basic_salary || '-'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colCount = headers.length;

    ws['!cols'] = [8, 25, 25, 20, 15, 15, 15, 15, 20, 20, 15].map(w => ({ wch: w }));
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } }
    ];

    const ref = ws['!ref'] || 'A1';
    const range = XLSX.utils.decode_range(ref);

    const kokilaStyle = {
      font: { name: 'Kokila', sz: 16, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      }
    };

    const headerStyle = {
      ...kokilaStyle,
      font: { name: 'Kokila', sz: 16, bold: true, color: { rgb: '000000' } },
      fill: { fgColor: { rgb: 'E2E8F0' } }
    };

    const titleStyle1 = {
      font: { name: 'Kokila', sz: 20, bold: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const titleStyle2 = {
      font: { name: 'Kokila', sz: 16, bold: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    for (let R = 0; R <= range.e.r; R++) {
      for (let C = 0; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };

        if (R === 0) {
          ws[addr].s = titleStyle1;
        } else if (R === 1) {
          ws[addr].s = titleStyle2;
        } else if (R === 2) {
          ws[addr].s = headerStyle;
        } else {
          ws[addr].s = kokilaStyle;
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Employee_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDateDisplay = (isoDate: string): string => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 1 && parts[0].length === 4) return parts[0];
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const parseDateInput = (displayDate: string): string => {
    if (!displayDate) return '';
    const parts = displayDate.split('/');
    if (parts.length === 1 && parts[0].length === 4) return parts[0];
    if (parts.length !== 3) return '';
    const [dd, mm, yyyy] = parts;
    if (!dd || !mm || !yyyy || yyyy.length !== 4) return '';
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  };

  const DateInput = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) => {
    const [display, setDisplay] = useState(formatDateDisplay(value));
    const [focused, setFocused] = useState(false);

    useEffect(() => {
      if (!focused) setDisplay(formatDateDisplay(value));
    }, [value, focused]);

    return (
      <input
        type="text"
        placeholder="dd/mm/yyyy or yyyy"
        value={display}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          const parsed = parseDateInput(display);
          if (parsed || !display) onChange(parsed);
        }}
        onChange={(e) => {
          let val = e.target.value.replace(/[^\d/]/g, '');
          
          // Only auto-format slashes if the user types more than 4 digits (so they can just type a year)
          if (val.length > 4 && !val.includes('/')) {
              val = val.slice(0, 2) + '/' + val.slice(2);
          }
          if (val.length > 5 && val.indexOf('/') === 2 && val.lastIndexOf('/') === 2) {
              val = val.slice(0, 5) + '/' + val.slice(5, 9);
          }
          if (val.length > 10) val = val.slice(0, 10);
          setDisplay(val);
        }}
        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer font-mono"
      />
    );
  };

  const hindiToFieldMap: Record<string, keyof Employee> = {
    // Hindi mappings
    'नाम': 'name',
    'पिता का नाम': 'fathers_name',
    'पति का नाम': 'husband_name',
    'मोबाइल नंबर': 'mobile_number',
    'फोन': 'mobile_number',
    'ईमेल': 'email',
    'पता': 'address',
    'आधार नंबर': 'aadhar_number',
    'आधार': 'aadhar_number',
    'आधार नम्बर': 'aadhar_number',
    'पैन नंबर': 'pan_number',
    'पैन': 'pan_number',
    'पीएफ नंबर': 'pf_number',
    'ईपीएफ यूएएन': 'epf_uan_number',
    'बैंक का नाम': 'bank_name',
    'बैंक': 'bank_name',
    'खाता संख्या': 'account_number',
    'आईएफएससी कोड': 'ifsc_code',
    'श्रेणी': 'category',
    'विभाग': 'department',
    'कार्यरत स्थान': 'department',
    'पदनाम': 'designation',
    'पद': 'designation',
    'कर्मचारी कोड': 'employee_code',
    'मूल वेतन': 'basic_salary',
    'वेतन': 'basic_salary',
    'वर्तमान वेतन': 'basic_salary',
    'शीर्षक': 'title',
    'रक्त समूह': 'blood_group',
    'योग्यता': 'qualification',
    'साप्ताहिक अवकाश': 'weekly_off',
    'सेवा अवधि': 'service_duration',
    'नियुक्ति आदेश संख्या': 'appointment_order_number',
    'जन्म दिनांक': 'dob',
    'नियुक्ति दिनांक': 'joining_date',
    
    // English mappings
    'name': 'name',
    'first name': 'name',
    'fathers name': 'fathers_name',
    'father name': 'fathers_name',
    'husband name': 'husband_name',
    'mobile': 'mobile_number',
    'mobile number': 'mobile_number',
    'phone': 'mobile_number',
    'email': 'email',
    'address': 'address',
    'aadhar': 'aadhar_number',
    'aadhar number': 'aadhar_number',
    'pan': 'pan_number',
    'pan number': 'pan_number',
    'pf number': 'pf_number',
    'epf uan': 'epf_uan_number',
    'bank name': 'bank_name',
    'account number': 'account_number',
    'ifsc': 'ifsc_code',
    'ifsc code': 'ifsc_code',
    'category': 'category',
    'department': 'department',
    'designation': 'designation',
    'employee code': 'employee_code',
    'emp code': 'employee_code',
    'basic salary': 'basic_salary',
    'salary': 'basic_salary',
    'title': 'title',
    'blood group': 'blood_group',
    'qualification': 'qualification',
    'weekly off': 'weekly_off',
    'joining date': 'joining_date',
    'dob': 'dob',
    'date of birth': 'dob',
    'tenure end date': 'tenure_end_date',
  };

  const parseExcelDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
      if (val >= 1900 && val <= 2100) return String(val);
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(excelEpoch.getTime() + Math.round(val * 86400000));
      return d.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    if (/^\d{4}$/.test(str)) return str;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (ddmmyyyy) {
      return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
    }
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch {}
    return '';
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

      if (rows.length === 0) {
        setImportResult({ success: 0, errors: ['Excel file is empty / Excel फ़ाइल खाली है'] });
        return;
      }

      const headerRow = rows[0];
      const headers = Object.keys(headerRow);

      const fieldMapping: Record<string, keyof Employee> = {};
      headers.forEach(h => {
        let trimmed = h.trim();
        if (isDevLys) {
          try {
            trimmed = toUnicode(trimmed).trim();
          } catch (e) {
            // fallback if toUnicode fails
          }
        }
        const lowerTrimmed = trimmed.toLowerCase();
        if (hindiToFieldMap[trimmed]) {
          fieldMapping[h] = hindiToFieldMap[trimmed];
        } else if (hindiToFieldMap[lowerTrimmed]) {
          fieldMapping[h] = hindiToFieldMap[lowerTrimmed];
        } else if (lowerTrimmed === 'category') {
          fieldMapping[h] = 'category';
        }
      });

      let successCount = 0;
      const errors: string[] = [];
      const importedIds: string[] = [];
      const importedDepartments = new Set<string>();
      const importedDesignations = new Set<string>();

      let allExistingEmployees: Employee[] = [];
      try {
        const res = await employeeAPI.getAll();
        allExistingEmployees = Array.isArray(res) ? res : [];
      } catch (e) {
        console.warn('Could not fetch existing employees for deduplication', e);
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const empData: Record<string, any> = {};

        Object.entries(fieldMapping).forEach(([excelHeader, field]) => {
          let val = row[excelHeader];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            const hindiFields = ['name', 'fathers_name', 'husband_name', 'address', 'bank_name', 'department', 'designation', 'title', 'category', 'dob', 'joining_date', 'tenure_end_date', 'appointment_date', 'basic_salary'];
            if (isDevLys && typeof val === 'string' && hindiFields.includes(field) && field !== 'category') {
              const hasHindiUnicode = /[\u0900-\u097F]/.test(val);
              if (!hasHindiUnicode) {
                try {
                  val = toUnicode(val);
                } catch (e) {
                  // Ignore conversion errors
                }
              }
            }
            if (field === 'dob' || field === 'joining_date' || field === 'tenure_end_date' || field === 'appointment_date') {
              val = parseExcelDate(val);
            }
            empData[field] = String(val).trim();
          }
        });

        if (!empData.name) {
          errors.push(`Row ${i + 2}: नाम (Name) आवश्यक है`);
          continue;
        }

        // Duplicate Check
        const isDuplicate = allExistingEmployees.some(existing => {
          if (empData.aadhar_number && existing.aadhar_number && String(empData.aadhar_number).trim() === String(existing.aadhar_number).trim()) {
            return true;
          }
          const nameMatch = existing.name?.trim().toLowerCase() === empData.name?.trim().toLowerCase();
          const deptMatch = existing.department?.trim().toLowerCase() === empData.department?.trim().toLowerCase();
          
          if (nameMatch && deptMatch) {
            if (empData.dob && existing.dob && empData.dob === existing.dob) return true;
            if (!empData.dob) return true;
          }
          return false;
        });

        if (isDuplicate) {
          errors.push(`Row ${i + 2}: ${empData.name} (Duplicate Skipped / डुप्लीकेट एंट्री)`);
          continue;
        }

        empData.employee_code = empData.employee_code || `Emp${String(successCount + employees.length + 1).padStart(4, '0')}`;
        
        // Normalize category from Excel input
        if (empData.category && typeof empData.category === 'string') {
          const catLower = empData.category.toLowerCase().trim();
          const categoryMap: Record<string, string> = {
            'permanent': 'permanent', 'स्थायी': 'permanent',
            'daily_wage': 'daily_wage', 'दैनिक वेतन': 'daily_wage',
            'samvida': 'samvida', 'संविदा': 'samvida',
            'probation': 'probation', 'परिवीक्षा': 'probation',
            'masik_parishram': 'masik_parishram', 'मासिक पारिश्रम': 'masik_parishram',
            'allowance': 'allowance', 'अलाउन्स': 'allowance',
            'mandey': 'mandey', 'मानदेय': 'mandey',
          };
          empData.category = categoryMap[catLower] || 'daily_wage';
        } else {
          empData.category = 'daily_wage';
        }

        empData.is_active = 1;

        try {
          const created = await employeeAPI.create(empData);
          if (created && (created as any).id) importedIds.push((created as any).id);
          successCount++;

          if (empData.department) importedDepartments.add(empData.department);
          if (empData.designation) importedDesignations.add(empData.designation);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Row ${i + 2} (${empData.name}): ${msg}`);
        }
      }

      setImportResult({ success: successCount, errors });
      if (successCount > 0) {
        // Sync with masters
        let latestDepts = masterDepartments;
        let latestDesigs = masterDesignations;
        try {
          const mData = await masterAPI.getAll();
          latestDepts = mData?.departments || masterDepartments;
          latestDesigs = mData?.designations || masterDesignations;
        } catch (e) {}

        const existingDepts = new Set(latestDepts.map(d => d.name.toLowerCase().trim()));
        const existingDesigs = new Set(latestDesigs.map(d => d.name.toLowerCase().trim()));
        let mastersAdded = false;

        for (const dept of importedDepartments) {
          const cleanDept = dept.trim();
          if (cleanDept && !existingDepts.has(cleanDept.toLowerCase())) {
            try { 
              await masterAPI.createDepartment(cleanDept); 
              existingDepts.add(cleanDept.toLowerCase());
              mastersAdded = true; 
            } catch(e) {}
          }
        }
        for (const desig of importedDesignations) {
          const cleanDesig = desig.trim();
          if (cleanDesig && !existingDesigs.has(cleanDesig.toLowerCase())) {
            try { 
              await masterAPI.createDesignation(cleanDesig); 
              existingDesigs.add(cleanDesig.toLowerCase());
              mastersAdded = true; 
            } catch(e) {}
          }
        }

        if (mastersAdded) {
          fetchMasters();
          window.dispatchEvent(new Event('mastersUpdated'));
        }
        const batch: ImportBatch = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          fileName: file.name,
          date: new Date().toISOString(),
          count: successCount,
          employeeIds: importedIds,
        };
        saveImportBatch(batch);
        setImportBatches(getImportBatches());
        showToast(`${successCount} employees imported / ${successCount} कर्मचारी आयात किए गए`, 'success');
        fetchEmployees();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to read Excel file';
      setImportResult({ success: 0, errors: [msg] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-lg">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{hindiLabels.employees}</h1>
          <p className="text-xs font-bold text-[var(--text-secondary)] mt-1 uppercase tracking-widest font-mono">Employee Management / कर्मचारी प्रबंधन</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white rounded-xl transition-all font-black shadow-lg shadow-emerald-500/20 cursor-pointer text-sm"
          >
            <Eye className="w-5 h-5 flex-shrink-0" />
            <span>View Report</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90 text-white rounded-xl transition-all font-black shadow-lg shadow-amber-500/20 cursor-pointer text-sm disabled:opacity-50"
          >
            {importing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-5 h-5 flex-shrink-0" />}
            <span>{importing ? 'Importing...' : 'Import Excel'}</span>
          </button>
          <button
            onClick={() => { setImportBatches(getImportBatches()); setShowImportHistory(true); }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:opacity-90 text-white rounded-xl transition-all font-black shadow-lg shadow-red-500/20 cursor-pointer text-sm"
          >
            <Trash2 className="w-5 h-5 flex-shrink-0" />
            <span>Import History</span>
          </button>
          <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-2.5 rounded-xl border border-[var(--border-primary)]">
            <input
              type="checkbox"
              id="devlysCheck"
              checked={isDevLys}
              onChange={(e) => setIsDevLys(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-[var(--bg-card)] border-[var(--border-primary)]"
            />
            <label htmlFor="devlysCheck" className="text-xs font-bold text-[var(--text-secondary)] whitespace-nowrap cursor-pointer select-none">
              DevLys 010 Font
            </label>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportExcel}
            className="hidden"
          />
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white rounded-xl transition-all font-black shadow-lg shadow-blue-500/20 cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span>{hindiLabels.addNew}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border-primary)] shadow-lg">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="कर्मचारी खोजें (Name, Code, Joining Date)"
            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-blue-500 focus:outline-none font-bold text-xs shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pl-12 pr-10 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-blue-500 focus:outline-none appearance-none cursor-pointer min-w-[200px] font-bold text-xs shadow-sm"
          >
            <option value="">सभी श्रेणियां (All Categories)</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.labelHi}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="pl-12 pr-10 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-blue-500 focus:outline-none appearance-none cursor-pointer min-w-[200px] font-bold text-xs shadow-sm"
          >
            <option value="">सभी विभाग (All Departments)</option>
            {masterDepartments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="pl-12 pr-10 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-blue-500 focus:outline-none appearance-none cursor-pointer min-w-[200px] font-bold text-xs shadow-sm"
          >
            <option value="">सभी पदनाम (All Designations)</option>
            {masterDesignations.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Searching Indicator */}
      {searching && !loading && (
        <div className="flex items-center justify-center gap-3 py-3 px-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4">
          <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-blue-500 font-bold text-sm">Searching... / खोज रहे हैं...</span>
        </div>
      )}

      {/* Employee Table */}
      {(() => {
        const empTotal = employees.length;
        const empTotalPages = Math.max(1, Math.ceil(empTotal / EMP_PAGE_SIZE));
        const safeEmpPage = empShowAll ? 1 : Math.min(empPage, empTotalPages);
        const empStart = empShowAll ? 0 : (safeEmpPage - 1) * EMP_PAGE_SIZE;
        const pagedEmployees = empShowAll ? employees : employees.slice(empStart, empStart + EMP_PAGE_SIZE);
        return (
          <>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">{hindiLabels.name}</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">{hindiLabels.employeeCode}</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">{hindiLabels.department}</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">{hindiLabels.category}</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">{hindiLabels.joiningDate}</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">{hindiLabels.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-primary)] text-[var(--text-primary)] font-medium">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="h-4 bg-[var(--bg-secondary)] rounded w-32" />
                            <div className="h-3 bg-[var(--bg-secondary)] rounded w-24" />
                          </div>
                        </td>
                        <td className="px-6 py-4"><div className="h-4 bg-[var(--bg-secondary)] rounded w-16" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-[var(--bg-secondary)] rounded w-20" /></td>
                        <td className="px-6 py-4"><div className="h-6 bg-[var(--bg-secondary)] rounded-full w-24" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-[var(--bg-secondary)] rounded w-20" /></td>
                        <td className="px-6 py-4"><div className="flex gap-2">{[...Array(5)].map((_, j) => <div key={j} className="w-8 h-8 bg-[var(--bg-secondary)] rounded-xl" />)}</div></td>
                      </tr>
                    ))
                  ) : pagedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Users className="w-12 h-12 text-[var(--text-secondary)] opacity-30" />
                          <p className="text-[var(--text-secondary)] font-bold text-sm">{hindiLabels.noData}</p>
                          <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-xs font-black hover:opacity-90 transition-opacity"
                          >
                            <Plus className="w-4 h-4" />
                            Add First Employee
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedEmployees.map((emp) => (
                  <Fragment key={emp.id}>
                    <tr className="hover:bg-[var(--bg-tertiary)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col min-w-0">
                          <p className="text-[var(--text-primary)] font-black text-sm tracking-tight truncate">{emp.name}</p>
                          <p className="text-xs font-bold text-[var(--text-secondary)] opacity-85 truncate mt-0.5">{emp.designation}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[var(--text-primary)] font-mono font-bold text-xs">{emp.employee_code}</td>
                      <td className="px-6 py-4 text-[var(--text-primary)] font-bold text-xs">{emp.department}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-black rounded-full border uppercase tracking-wider font-mono shadow-sm inline-block ${getCategoryColor(emp.category)}`}>
                          {getCategoryLabel(emp.category)}
                        </span>
                        {emp.tenure_end_date && (
                          <div className={`text-[10px] mt-2 flex items-center gap-1.5 font-bold font-mono px-2 py-0.5 rounded-md border w-fit ${emp.category === 'permanent'
                            ? 'text-blue-500 bg-blue-500/10 border-blue-500/20'
                            : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                            }`}>
                            <span>⏳ Exp:</span>
                            <span>{new Date(emp.tenure_end_date).toLocaleDateString('en-IN')}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[var(--text-primary)] font-mono font-bold text-xs">{emp.joining_date ? formatDateDisplay(emp.joining_date) : '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-2 text-blue-500 hover:bg-blue-500/15 rounded-xl transition-all cursor-pointer border border-transparent hover:border-blue-500/30"
                            title={hindiLabels.edit}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openRenewalModal(emp)}
                            className="p-2 text-emerald-500 hover:bg-emerald-500/15 rounded-xl transition-all cursor-pointer border border-transparent hover:border-emerald-500/30"
                            title="Tenure Renewal / कार्यकाल नवीनीकरण"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => viewHistory(emp.id)}
                            className="p-2 text-purple-500 hover:bg-purple-500/15 rounded-xl transition-all cursor-pointer border border-transparent hover:border-purple-500/30"
                            title="Category History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setResignEmployee(emp); setResignData({ reason: '', resign_date: new Date().toISOString().split('T')[0] }); }}
                            className="p-2 text-orange-500 hover:bg-orange-500/15 rounded-xl transition-all cursor-pointer border border-transparent hover:border-orange-500/30"
                            title="Mark as Resigned"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmEmployee(emp)}
                            className="p-2 text-red-500 hover:bg-red-500/15 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-500/30"
                            title={hindiLabels.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {showHistory === emp.id && (
                      <tr className="animate-fade-in bg-[var(--bg-secondary)] shadow-inner">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="pl-5 border-l-4 border-purple-500 bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-primary)]">
                            <h4 className="text-xs font-black uppercase tracking-widest text-purple-500 mb-3 font-mono">Category Change History / श्रेणी परिवर्तन इतिहास</h4>
                            <div className="space-y-2.5 font-bold text-xs">
                              {emp.category_history?.map((hist: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-4 text-[var(--text-primary)] font-mono bg-[var(--bg-secondary)] px-3 py-2 rounded-lg border border-[var(--border-primary)] shadow-sm">
                                  <span className="text-[var(--text-secondary)]">{new Date(hist.changed_at).toLocaleDateString('en-IN')}</span>
                                  <span className="text-[var(--text-primary)]">
                                    {hist.old_category ? `${getCategoryLabel(hist.old_category)} → ` : ''}
                                    <span className="font-black text-purple-500">{getCategoryLabel(hist.category)}</span>
                                  </span>
                                  <span className="text-[var(--text-secondary)] text-[10px] opacity-75 font-sans">({hist.reason})</span>
                                </div>
                              ))}
                              {!emp.category_history?.length && (
                                <p className="text-[var(--text-secondary)] text-xs font-black italic">No category changes recorded / कोई परिवर्तन दर्ज नहीं</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Footer */}
        {empTotalPages > 1 && (
          <div className="px-6 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
            <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest font-mono">
              {empShowAll ? `Showing all ${empTotal}` : `Showing ${empStart + 1}–${Math.min(empStart + EMP_PAGE_SIZE, empTotal)} of ${empTotal}`}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setEmpShowAll(false); setEmpPage(p => Math.max(1, p - 1)); }} disabled={empShowAll || safeEmpPage === 1}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">
                Prev
              </button>
              {!empShowAll && Array.from({ length: empTotalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === empTotalPages || Math.abs(p - safeEmpPage) <= 1)
                .reduce<(number | string)[]>((acc, p, i, arr) => {
                  if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  typeof p === 'string' ? (
                    <span key={`e${i}`} className="px-1 text-[var(--text-secondary)]">…</span>
                  ) : (
                    <button key={p} onClick={() => { setEmpShowAll(false); setEmpPage(p); }}
                      className={`w-8 h-8 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                        p === safeEmpPage
                          ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)] shadow-md'
                          : 'border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                      }`}>
                      {p}
                    </button>
                  )
                )}
              <button onClick={() => setEmpShowAll(!empShowAll)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${
                  empShowAll
                    ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)] shadow-md'
                    : 'border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                }`}>
                All
              </button>
              <button onClick={() => { setEmpShowAll(false); setEmpPage(p => Math.min(empTotalPages, p + 1)); }} disabled={empShowAll || safeEmpPage === empTotalPages}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
          </>
        );
      })()}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div
            className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[var(--text-primary)] font-sans"
          >
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] backdrop-blur-xl flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                  <span>
                    {editingEmployee
                      ? `संपादित करें: ${editingEmployee.name} (${editingEmployee.employee_code})`
                      : 'नया कर्मचारी (Add New Employee)'}
                  </span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1 font-bold font-mono">Complete standard personnel profile • Only Name and Category are strictly required</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                type="button"
                className="text-[var(--text-secondary)] hover:text-red-500 p-2 hover:bg-[var(--bg-tertiary)] rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-500/30"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex flex-wrap border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] p-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`flex-1 min-w-[120px] text-center py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm uppercase tracking-wider font-mono ${activeTab === 'basic'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] bg-[var(--bg-card)] border border-[var(--border-primary)]'
                  }`}
              >
                {hindiLabels.tabBasicInfo}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('contact')}
                className={`flex-1 min-w-[120px] text-center py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm uppercase tracking-wider font-mono ${activeTab === 'contact'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] bg-[var(--bg-card)] border border-[var(--border-primary)]'
                  }`}
              >
                {hindiLabels.tabContact}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('gov')}
                className={`flex-1 min-w-[120px] text-center py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm uppercase tracking-wider font-mono ${activeTab === 'gov'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] bg-[var(--bg-card)] border border-[var(--border-primary)]'
                  }`}
              >
                {hindiLabels.tabGovernmentIds}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bank')}
                className={`flex-1 min-w-[120px] text-center py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm uppercase tracking-wider font-mono ${activeTab === 'bank'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] bg-[var(--bg-card)] border border-[var(--border-primary)]'
                  }`}
              >
                {hindiLabels.tabBankService}
              </button>
            </div>

            {/* Form Content */}
            <form id="employee-modal-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-7 space-y-6 bg-[var(--bg-card)]">

              {/* TAB 1: BASIC INFO */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  {/* Photo upload zone */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] shadow-sm">
                    <div className="relative group w-28 h-28 rounded-2xl overflow-hidden border-2 border-[var(--border-primary)] bg-[var(--bg-tertiary)] flex-shrink-0 flex items-center justify-center shadow-inner">
                      {formData.photo_url ? (
                        <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-12 h-12 text-[var(--text-secondary)] opacity-50" />
                      )}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer backdrop-blur-sm">
                        <span className="text-xs text-white font-black uppercase tracking-wider text-center px-2">Upload Photo</span>
                      </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <h4 className="text-base font-black text-[var(--text-primary)] tracking-tight">Employee Photo / कर्मचारी की फोटो</h4>
                      <p className="text-xs font-bold text-[var(--text-secondary)]">Select standard professional image (JPG, PNG, WEBP)</p>
                      <div className="flex justify-center sm:justify-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelectPhoto()}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                        >
                          Browse Files
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSelectPhoto}
                          className="hidden"
                          id="modal-file-upload"
                        />
                        <label
                          htmlFor="modal-file-upload"
                          className="px-4 py-2 bg-[var(--bg-tertiary)] hover:opacity-85 text-[var(--text-primary)] text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-[var(--border-primary)] shadow-sm flex items-center justify-center"
                        >
                          Upload Local
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 font-bold">
                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.title} / शीर्षक</label>
                      <select
                        value={formData.title || 'Shri'}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer"
                      >
                        <option value="Shri">Shri / श्री</option>
                        <option value="Smt">Smt / श्रीमती</option>
                        <option value="Kumari">Kumari / कुमारी</option>
                        <option value="Dr">Dr / डॉ</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-primary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.name} * / नाम (अनिवार्य)</label>
                      <input
                        required
                        type="text"
                        placeholder="Full Name"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.fathersName} / पिता का नाम</label>
                      <input
                        type="text"
                        placeholder="Father's Name"
                        value={formData.fathers_name || ''}
                        onChange={(e) => setFormData({ ...formData, fathers_name: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.husbandName} / पति का नाम</label>
                      <input
                        type="text"
                        placeholder="Husband's Name"
                        value={formData.husband_name || ''}
                        onChange={(e) => setFormData({ ...formData, husband_name: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.dob} / जन्म तिथि</label>
                      <DateInput
                        value={formData.dob || ''}
                        onChange={(v) => setFormData({ ...formData, dob: v })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.bloodGroup} / रक्त समूह</label>
                      <select
                        value={formData.blood_group || ''}
                        onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer font-mono"
                      >
                        <option value="">-- चुनें --</option>
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.qualification} / योग्यता</label>
                      <input
                        type="text"
                        placeholder="Highest Qualification"
                        value={formData.qualification || ''}
                        onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-primary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.category} * / श्रेणी (अनिवार्य)</label>
                      <select
                        required
                        value={formData.category || 'daily_wage'}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.department} / विभाग</label>
                      <select
                        value={formData.department || ''}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer"
                      >
                        <option value="">-- चुनें (Select) --</option>
                        {masterDepartments.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                        {formData.department && !masterDepartments.some(d => d.name === formData.department) && (
                          <option value={formData.department}>{formData.department} (Custom)</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.designation} / पदनाम</label>
                      <select
                        value={formData.designation || ''}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer"
                      >
                        <option value="">-- चुनें (Select) --</option>
                        {masterDesignations.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                        {formData.designation && !masterDesignations.some(d => d.name === formData.designation) && (
                          <option value={formData.designation}>{formData.designation} (Custom)</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.employeeCode} / कर्मचारी कोड</label>
                      <input
                        type="text"
                        placeholder="EMP001"
                        value={formData.employee_code || ''}
                        onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold font-mono focus:border-blue-500 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.joiningDate} / ज्वाइनिंग तिथि</label>
                      <DateInput
                        value={formData.joining_date || ''}
                        onChange={(v) => setFormData({ ...formData, joining_date: v })}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-black uppercase tracking-wider mb-2 font-mono ${formData.category === 'permanent' ? 'text-blue-500' : 'text-amber-500'
                        }`}>कार्यकाल समाप्ति तिथि (Tenure Expiry)</label>
                      <DateInput
                        value={formData.tenure_end_date || ''}
                        onChange={(v) => setFormData({ ...formData, tenure_end_date: v })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTACT & COMMUNICATIONS */}
              {activeTab === 'contact' && (
                <div className="space-y-6 font-bold">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.mobileNumber} / फोन</label>
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={formData.phone || formData.mobile_number || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value, mobile_number: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.email} / ईमेल</label>
                      <input
                        type="email"
                        placeholder="user@example.com"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.address} / पता</label>
                    <textarea
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Complete residential address"
                      rows={4}
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm resize-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: GOVERNMENT ID VERIFICATION */}
              {activeTab === 'gov' && (
                <div className="space-y-6 font-bold">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.panNumber} / पैन नंबर</label>
                      <input
                        type="text"
                        maxLength={10}
                        placeholder="ABCDE1234F"
                        value={formData.pan_number || ''}
                        onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none uppercase font-mono shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.aadharNumber} / आधार नंबर</label>
                      <input
                        type="text"
                        maxLength={12}
                        placeholder="0000 0000 0000"
                        value={formData.aadhar_number || ''}
                        onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none font-mono shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.pfNumber} / पीएफ नंबर</label>
                      <input
                        type="text"
                        placeholder="PF Account Number"
                        value={formData.pf_number || ''}
                        onChange={(e) => setFormData({ ...formData, pf_number: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none font-mono shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.epfUan} / ईपीएफ यूएएन</label>
                      <input
                        type="text"
                        placeholder="UAN Number"
                        value={formData.epf_uan_number || ''}
                        onChange={(e) => setFormData({ ...formData, epf_uan_number: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none font-mono shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: BANK ACCOUNT & SERVICE CONTRACT DETAILS */}
              {activeTab === 'bank' && (
                <div className="space-y-6 font-bold">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.bankName} / बैंक का नाम</label>
                      <input
                        type="text"
                        placeholder="Bank Name"
                        value={formData.bank_name || ''}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.accountNumber} / खाता संख्या</label>
                      <input
                        type="text"
                        placeholder="Account Number"
                        value={formData.account_number || ''}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none font-mono shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.ifscCode} / आईएफएससी कोड</label>
                      <input
                        type="text"
                        placeholder="IFSC Code"
                        value={formData.ifsc_code || ''}
                        onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none font-mono uppercase shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.basicSalary} / मूल वेतन</label>
                      <input
                        type="text"
                        placeholder="e.g. 10000 or 160/- प्रतिदिन"
                        value={formData.basic_salary || ''}
                        onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none font-mono shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.weeklyOff} / साप्ताहिक अवकाश</label>
                      <select
                        value={formData.weekly_off || 'None'}
                        onChange={handleWeeklyOffChange}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer"
                      >
                        {['None', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                          <option key={day} value={day}>{day === 'None' ? 'None (कोई नहीं)' : day}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.serviceDuration} / सेवा अवधि</label>
                      <input
                        type="text"
                        placeholder="e.g., 2 Years"
                        value={formData.service_duration || ''}
                        onChange={(e) => setFormData({ ...formData, service_duration: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.appointmentOrderNumber} / नियुक्ति आदेश संख्या</label>
                      <input
                        type="text"
                        placeholder="Order No."
                        value={formData.appointment_order_number || ''}
                        onChange={(e) => setFormData({ ...formData, appointment_order_number: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-blue-500 focus:outline-none font-mono shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-mono">{hindiLabels.appointmentDate} / नियुक्ति तिथि</label>
                      <DateInput
                        value={formData.appointment_date || ''}
                        onChange={(v) => setFormData({ ...formData, appointment_date: v })}
                      />
                    </div>

                  </div>

                  {editingEmployee && formData.category !== editingEmployee.category && (
                    <div className="p-5 bg-orange-500/10 border border-orange-500/30 rounded-2xl space-y-2.5 mt-5 shadow-sm">
                      <label className="block text-xs font-black text-orange-500 uppercase tracking-wider font-mono">Category Change Reason * (अनिवार्य)</label>
                      <input
                        required
                        type="text"
                        value={formData.category_change_reason || ''}
                        onChange={(e) => setFormData({ ...formData, category_change_reason: e.target.value })}
                        placeholder="शारीरिक कारण, पदोन्नति आदि..."
                        className="w-full px-4 py-3 bg-[var(--bg-card)] border border-orange-500/30 rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-orange-500 focus:outline-none shadow-inner"
                      />
                    </div>
                  )}
                </div>
              )}

            </form>

            {/* Footer */}
            <div className="p-5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-end gap-3.5 font-bold">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="px-5 py-2.5 border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {hindiLabels.cancel}
              </button>
              <button
                type="submit"
                form="employee-modal-form"
                disabled={submitting}
                className="px-7 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {editingEmployee ? hindiLabels.save : hindiLabels.submit}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Renewal Modal */}
      {renewalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[var(--text-primary)] font-sans">
            <div className="p-6 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm shadow-emerald-500/10">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
                    कार्यकाल नवीनीकरण / Tenure Renewal
                  </h2>
                  <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5 font-mono">
                    {renewalEmployee.name} ({renewalEmployee.employee_code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRenewalEmployee(null)}
                className="text-[var(--text-secondary)] hover:text-red-500 p-2 hover:bg-[var(--bg-tertiary)] rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <form id="renewal-form" onSubmit={handleRenewalSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-[var(--text-primary)] uppercase tracking-wider mb-1.5 font-mono">
                      नवीनीकरण आदेश संख्या / Renewal Letter No. *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. LET/2026/089"
                      value={renewalData.letter_number}
                      onChange={(e) => setRenewalData({ ...renewalData, letter_number: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl font-mono text-xs font-bold text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[var(--text-primary)] uppercase tracking-wider mb-1.5 font-mono">
                      आदेश दिनांक / Letter Date *
                    </label>
                    <input
                      required
                      type="date"
                      value={renewalData.letter_date}
                      onChange={(e) => setRenewalData({ ...renewalData, letter_date: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl font-mono text-xs font-bold text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none shadow-sm cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-[var(--text-primary)] uppercase tracking-wider mb-1.5 font-mono">
                    नया कार्यकाल समाप्ति दिनांक / New Tenure End Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={renewalData.new_tenure_end_date}
                    onChange={(e) => setRenewalData({ ...renewalData, new_tenure_end_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-emerald-500/[0.05] border border-emerald-500/30 rounded-xl font-mono text-xs font-black text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none shadow-sm cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 font-mono">
                    विशेष विवरण / Remarks
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter any additional terms or remarks..."
                    value={renewalData.remarks}
                    onChange={(e) => setRenewalData({ ...renewalData, remarks: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs font-bold text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none shadow-sm resize-none"
                  />
                </div>
              </form>

              <div className="border-t border-[var(--border-primary)] pt-6">
                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] mb-3 font-mono">
                  नवीनीकरण इतिहास / Renewal History ({renewalHistory.length})
                </h4>
                {renewalLoading ? (
                  <p className="text-xs text-[var(--text-secondary)] font-bold italic">Loading history...</p>
                ) : renewalHistory.length === 0 ? (
                  <p className="text-xs text-[var(--text-secondary)] font-bold italic">No previous renewal records found.</p>
                ) : (
                  <div className="space-y-2">
                    {renewalHistory.map((item) => (
                      <div key={item.id} className="p-3.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-mono text-xs shadow-sm">
                        <div>
                          <p className="font-black text-emerald-500">Letter: {item.letter_number || 'N/A'}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] font-bold mt-0.5">Date: {new Date(item.letter_date || item.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-bold text-[var(--text-primary)]">Extended to: {new Date(item.new_tenure_end_date).toLocaleDateString('en-IN')}</p>
                          {item.remarks && <p className="text-[10px] text-[var(--text-secondary)] italic mt-0.5 font-sans">{item.remarks}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-end gap-3 font-bold">
              <button
                type="button"
                onClick={() => setRenewalEmployee(null)}
                className="px-5 py-2.5 border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                {hindiLabels.cancel}
              </button>
              <button
                type="submit"
                form="renewal-form"
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
              >
                Confirm Renewal / पुष्टि करें
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={pendingWeeklyOffDay !== null}
        title="Change Weekly Off? / साप्ताहिक अवकाश बदलें?"
        message="साप्ताहिक अवकाश बदलने से पुराने महीनों की उपस्थिति प्रभावित हो सकती है। क्या आप इस कर्मचारी का साप्ताहिक अवकाश बदलना चाहते हैं? / Changing the weekly off will register a historical change that takes effect immediately. Past attendance sheets will continue to honor their respective weekly offs."
        onConfirm={() => {
          if (pendingWeeklyOffDay) {
            setFormData((prev) => ({ ...prev, weekly_off: pendingWeeklyOffDay }));
            setPendingWeeklyOffDay(null);
          }
        }}
        onCancel={() => setPendingWeeklyOffDay(null)}
      />

      <ConfirmModal
        isOpen={deleteConfirmEmployee !== null}
        title="Delete Employee / कर्मचारी हटाएं"
        message={`Are you sure you want to delete ${deleteConfirmEmployee?.name}? This action cannot be undone.`}
        onConfirm={() => deleteConfirmEmployee && handleDelete(deleteConfirmEmployee.id)}
        onCancel={() => !deleting && setDeleteConfirmEmployee(null)}
        variant="danger"
        loading={deleting}
        confirmLabel={deleting ? 'Deleting...' : 'Delete / हटाएं'}
      />
      />

      {/* Resign Modal */}
      {resignEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-[var(--text-primary)]">
            <div className="p-6 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black">Mark as Resigned / सेवानिवृत् चिह्नित करें</h2>
                  <p className="text-xs font-bold text-[var(--text-secondary)] font-mono">{resignEmployee.name} ({resignEmployee.employee_code})</p>
                </div>
              </div>
              <button onClick={() => setResignEmployee(null)} className="text-[var(--text-secondary)] hover:text-red-500 p-2 rounded-xl transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-[var(--text-primary)] uppercase tracking-wider mb-2 font-mono">
                  Resignation Date / इस्तीफा तिथि *
                </label>
                <input
                  type="date"
                  value={resignData.resign_date}
                  onChange={(e) => setResignData({ ...resignData, resign_date: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-orange-500 focus:outline-none shadow-sm font-mono cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[var(--text-primary)] uppercase tracking-wider mb-2 font-mono">
                  Reason for Resignation / इस्तीफा का कारण *
                </label>
                <textarea
                  value={resignData.reason}
                  onChange={(e) => setResignData({ ...resignData, reason: e.target.value })}
                  placeholder="Enter reason for resignation..."
                  rows={4}
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-xs font-bold focus:border-orange-500 focus:outline-none shadow-sm resize-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setResignEmployee(null)}
                disabled={resigning}
                className="px-5 py-2.5 border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {hindiLabels.cancel}
              </button>
              <button
                type="button"
                onClick={markAsResigned}
                disabled={!resignData.reason.trim() || resigning}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:opacity-90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-orange-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {resigning && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {resigning ? 'Processing...' : 'Confirm Resign / पुष्टि करें'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Result Modal */}
      {importResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-[var(--text-primary)]">
            <div className="p-6 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${importResult.success > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {importResult.success > 0 ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-black">Import Result / आयात परिणाम</h2>
                  <p className="text-xs font-bold text-[var(--text-secondary)] font-mono">
                    {importResult.success > 0 ? `${importResult.success} employees imported` : 'Import failed'}
                  </p>
                </div>
              </div>
              <button onClick={() => setImportResult(null)} className="text-[var(--text-secondary)] hover:text-red-500 p-2 rounded-xl transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
              {importResult.success > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-sm font-black text-emerald-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {importResult.success} कर्मचारी सफलतापूर्वक आयात किए गए
                  </p>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-red-500 uppercase tracking-wider font-mono">Errors / त्रुटियां:</p>
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-400 font-bold bg-red-500/5 p-2 rounded-lg border border-red-500/10">{err}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex justify-end">
              <button
                onClick={() => setImportResult(null)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0 print:z-[9999] print:block">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden font-sans print:shadow-none print:border-none print:w-full print:max-w-none print:h-auto print:max-h-none print:rounded-none">

            {/* Modal Header - Hidden in Print */}
            <div className="p-6 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] backdrop-blur-xl flex items-center justify-between print:hidden">
              <div>
                <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                  <FileText className="w-6 h-6 text-emerald-500" />
                  <span>Employee Report / कर्मचारी रिपोर्ट</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1 font-bold font-mono">Print or export the employee list</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Export Excel
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-[var(--text-secondary)] hover:text-red-500 p-2 hover:bg-[var(--bg-tertiary)] rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-500/30 ml-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content to Print */}
            <div className="flex-1 overflow-y-auto p-8 bg-white text-black print:overflow-visible print:p-0 print:block">
              <style>
                {`
                  @media print {
                    body * { visibility: hidden !important; }
                    .print-container, .print-container * { visibility: visible !important; }
                    .print-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                    @page { size: landscape; margin: 10mm; }
                  }
                  .report-table th, .report-table td {
                    border: 1px solid #000;
                    padding: 8px 4px;
                    text-align: center;
                    font-size: 11px;
                    color: #000;
                  }
                  .report-table th {
                    font-weight: bold;
                    background-color: #f3f4f6 !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                `}
              </style>

              <div className="print-container w-full h-full bg-white">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold mb-2 text-black">दिगम्बर जैन अतिशय क्षेत्र , श्री महावीर जी</h1>
                  <h2 className="text-lg font-semibold text-black">{dynamicReportTitle}</h2>
                </div>

                <table className="w-full border-collapse report-table text-black">
                  <thead>
                    <tr>
                      <th>क्र.सं.</th>
                      <th>नाम</th>
                      <th>पिता का नाम</th>
                      <th>आधार नम्बर</th>
                      <th>मोबाइल नंबर</th>
                      <th>जन्म दिनांक</th>
                      <th>नियुक्ति दिनांक</th>
                      <th>सेवा अवधि दिनांक</th>
                      <th>पद</th>
                      <th>कार्यरत स्थान</th>
                      <th>वर्तमान वेतन</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, idx) => (
                      <tr key={emp.id}>
                        <td>{idx + 1}</td>
                        <td className="text-left font-semibold">{emp.name}</td>
                        <td>{emp.fathers_name || '-'}</td>
                        <td>{emp.aadhar_number || '-'}</td>
                        <td>{emp.mobile_number || emp.phone || '-'}</td>
                        <td>{emp.dob ? new Date(emp.dob).toLocaleDateString('en-IN') : '-'}</td>
                        <td>{emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-IN') : '-'}</td>
                        <td>{emp.tenure_end_date ? new Date(emp.tenure_end_date).toLocaleDateString('en-IN') : '-'}</td>
                        <td>{emp.designation || '-'}</td>
                        <td>{emp.department || '-'}</td>
                        <td>{emp.basic_salary || '-'}</td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-8 text-gray-500 font-medium text-center">No employees found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Import History Modal */}
      {showImportHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[var(--text-primary)]">
            <div className="p-6 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Import History / आयात इतिहास</h2>
                  <p className="text-xs font-bold text-[var(--text-secondary)] font-mono">Delete any previous Excel import</p>
                </div>
              </div>
              <button onClick={() => setShowImportHistory(false)} className="text-[var(--text-secondary)] hover:text-red-500 p-2 rounded-xl transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {importBatches.length === 0 ? (
                <div className="text-center py-12">
                  <Upload className="w-12 h-12 text-[var(--text-secondary)] opacity-30 mx-auto mb-3" />
                  <p className="text-sm font-bold text-[var(--text-secondary)]">No imports yet / अभी तक कोई आयात नहीं</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {importBatches.map((batch) => (
                    <div key={batch.id} className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-amber-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-black text-[var(--text-primary)] truncate">{batch.fileName}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-mono font-bold text-[var(--text-secondary)]">
                                {new Date(batch.date).toLocaleDateString('en-IN')} {new Date(batch.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                {batch.count} employees
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setDeletingBatch(batch)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex justify-end">
              <button
                onClick={() => setShowImportHistory(false)}
                className="px-5 py-2.5 border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Close / बंद करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Import Batch Confirmation */}
      {deletingBatch && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-[var(--text-primary)]">
            <div className="p-6 border-b border-[var(--border-primary)] bg-red-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-red-500">Delete Import / आयात हटाएं</h2>
                  <p className="text-xs font-bold text-[var(--text-secondary)] font-mono">{deletingBatch.fileName}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                This will permanently delete <span className="font-black text-red-500">{deletingBatch.count} employees</span> imported from this Excel file.
              </p>
              <p className="text-xs font-bold text-[var(--text-secondary)]">
                यह <span className="font-black text-red-500">{deletingBatch.count} कर्मचारियों</span> को स्थायी रूप से हटा देगा जो इस Excel फ़ाइल से आयात किए गए थे।
              </p>
              <p className="text-[10px] font-bold text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                ⚠ This action cannot be undone / यह क्रिया पूर्ववत नहीं की जा सकती
              </p>
            </div>
            <div className="p-5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingBatch(null)}
                className="px-5 py-2.5 border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBatch}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-500/20 cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete {deletingBatch.count} Employees
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}