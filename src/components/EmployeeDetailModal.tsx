import { X, User, Phone, Mail, MapPin, Briefcase, Calendar, CreditCard, Landmark, Clock, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { hindiLabels, categories } from '../lib/hindiLabels';
import { cn } from '@/lib/utils';
import { Modal } from '../core-ui/overlays/Modal';

interface EmployeeDetailModalProps {
  employee: any;
  onClose: () => void;
}

export default function EmployeeDetailModal({ employee, onClose }: EmployeeDetailModalProps) {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await fetch(`/api/attendance?employee_id=${employee.id}`);
        const data = await res.json();
        setAttendance(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch attendance error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [employee.id]);

  const stats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    pl: attendance.filter(a => a.status === 'pl').length,
    cl: attendance.filter(a => a.status === 'cl').length,
    half_cl: attendance.filter(a => a.status === 'half_cl').length,
    weekly_off: attendance.filter(a => a.status === 'weekly_off').length,
  };

  const getCategoryLabel = (value: string) => {
    return categories.find(c => c.value === value)?.labelHi || value;
  };

  const renderInfoRow = (icon: any, label: string, value: string | number | undefined, sublabel?: string) => (
    <div className="d-flex align-items-start gap-3 p-3 bg-light border border-light-subtle rounded-3 transition-all hover-scale">
      <div className="bg-primary-soft p-2 rounded-2 text-primary shadow-sm">
        {icon}
      </div>
      <div className="flex-grow-1 min-w-0">
        <p className="m-0 text-muted fw-bold text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>
          {label} {sublabel && <span className="opacity-50">/ {sublabel}</span>}
        </p>
        <p className="m-0 small fw-black text-dark text-uppercase mt-1 truncate" title={String(value)}>{value || '-'}</p>
      </div>
    </div>
  );

  return (
    <Modal 
      show={!!employee} 
      onClose={onClose} 
      title={`Personnel Profile: ${employee.name}`}
      size="xl"
    >
      <div className="d-flex flex-column h-100">
        {/* Profile Header Card */}
        <div className="p-4 bg-primary text-white position-relative overflow-hidden mb-4 rounded-4 shadow-sm mx-4 mt-2">
           <div className="position-absolute top-0 end-0 p-5 opacity-10">
              <User size={120} />
           </div>
           <div className="d-flex align-items-center gap-4 position-relative z-1">
              <div className="bg-white p-1 rounded-4 shadow-sm" style={{ width: '100px', height: '100px' }}>
                 <div className="w-100 h-100 bg-light rounded-3 d-flex align-items-center justify-content-center overflow-hidden">
                    {employee.photo_url ? (
                      <img src={employee.photo_url} alt={employee.name} className="w-100 h-100 object-fit-cover" />
                    ) : (
                      <User size={48} className="text-muted opacity-25" />
                    )}
                 </div>
              </div>
              <div>
                 <h2 className="m-0 fw-black text-uppercase tracking-tight">{employee.name}</h2>
                 <div className="d-flex align-items-center gap-2 mt-2">
                    <span className="badge bg-white/20 text-white font-mono fw-black px-2 py-1" style={{ fontSize: '0.65rem' }}>{employee.employee_code}</span>
                    <span className="badge bg-white text-primary fw-black text-uppercase px-2 py-1" style={{ fontSize: '0.65rem' }}>{employee.designation || 'Staff'}</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="row g-4 px-4 pb-4 overflow-auto custom-scrollbar flex-grow-1">
          {/* Main Context */}
          <div className="col-lg-8">
            <div className="d-flex flex-column gap-5">
              {/* Stats Bar */}
              <div className="row g-3">
                {[
                  { label: hindiLabels.totalPresent, val: stats.present, color: 'text-success' },
                  { label: hindiLabels.totalCL, val: stats.cl + stats.half_cl * 0.5, color: 'text-warning' },
                  { label: hindiLabels.totalPL, val: stats.pl, color: 'text-primary' },
                ].map((s, i) => (
                  <div key={i} className="col-4">
                    <div className="card-enterprise p-3 text-center bg-white border border-light-subtle shadow-sm hover-scale">
                      <p className="m-0 text-muted fw-bold text-uppercase tracking-widest mb-1" style={{ fontSize: '0.55rem' }}>{s.label}</p>
                      <p className={cn("m-0 h3 fw-black", s.color)}>{s.val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sections */}
              <div className="d-flex flex-column gap-4">
                <section>
                   <p className="small fw-black text-uppercase text-muted tracking-widest ms-1 mb-3 d-flex align-items-center gap-2">
                      <User size={14} /> Personal Identity
                      <hr className="flex-grow-1 m-0 ms-2 opacity-10" />
                   </p>
                   <div className="row g-3">
                      <div className="col-md-6">{renderInfoRow(<User size={16} />, hindiLabels.fathersName, employee.fathers_name, "Pita का नाम")}</div>
                      <div className="col-md-6">{renderInfoRow(<Calendar size={16} />, hindiLabels.dob, employee.dob, "जन्म तिथि")}</div>
                      <div className="col-md-6">{renderInfoRow(<Phone size={16} />, "Mobile", employee.mobile_number)}</div>
                      <div className="col-md-6">{renderInfoRow(<Mail size={16} />, "Email", employee.email)}</div>
                      <div className="col-12">{renderInfoRow(<MapPin size={16} />, hindiLabels.address, employee.address, "पता")}</div>
                   </div>
                </section>

                <section>
                   <p className="small fw-black text-uppercase text-muted tracking-widest ms-1 mb-3 d-flex align-items-center gap-2">
                      <Briefcase size={14} /> Professional Deployment
                      <hr className="flex-grow-1 m-0 ms-2 opacity-10" />
                   </p>
                   <div className="row g-3">
                      <div className="col-md-6">{renderInfoRow(<Briefcase size={16} />, hindiLabels.department, employee.department, "विभाग")}</div>
                      <div className="col-md-6">{renderInfoRow(<Clock size={16} />, hindiLabels.category, getCategoryLabel(employee.category), "श्रेणी")}</div>
                      <div className="col-md-6">{renderInfoRow(<Calendar size={16} />, hindiLabels.joiningDate, employee.joining_date)}</div>
                      <div className="col-md-6">{renderInfoRow(<CreditCard size={16} />, "Basic Pay", employee.basic_salary)}</div>
                      <div className="col-12">{renderInfoRow(<Clock size={16} />, "Weekly Off", employee.weekly_off)}</div>
                   </div>
                </section>

                <section>
                   <p className="small fw-black text-uppercase text-muted tracking-widest ms-1 mb-3 d-flex align-items-center gap-2">
                      <Landmark size={14} /> Statutory & Financial
                      <hr className="flex-grow-1 m-0 ms-2 opacity-10" />
                   </p>
                   <div className="row g-3">
                      <div className="col-md-6">{renderInfoRow(<FileText size={16} />, "Aadhar", employee.aadhar_number)}</div>
                      <div className="col-md-6">{renderInfoRow(<Landmark size={16} />, "Bank Name", employee.bank_name)}</div>
                      <div className="col-md-6">{renderInfoRow(<CreditCard size={16} />, "A/C Number", employee.account_number)}</div>
                      <div className="col-md-6">{renderInfoRow(<FileText size={16} />, "IFSC Code", employee.ifsc_code)}</div>
                      <div className="col-md-6">{renderInfoRow(<FileText size={16} />, "PAN Number", employee.pan_number)}</div>
                      <div className="col-md-6">{renderInfoRow(<FileText size={16} />, "PF / UAN", `${employee.pf_number || '-'} / ${employee.epf_uan_number || '-'}`)}</div>
                   </div>
                </section>
              </div>
            </div>
          </div>

          {/* Right Panel: Attendance Log */}
          <div className="col-lg-4">
            <div className="card-enterprise h-100 bg-white border border-light-subtle shadow-sm d-flex flex-column overflow-hidden">
              <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-gray-50/50">
                 <p className="m-0 small fw-black text-uppercase text-muted tracking-widest d-flex align-items-center gap-2">
                    <Calendar size={14} className="text-primary" /> Activity Log
                 </p>
                 <span className="badge bg-primary-soft text-primary fw-black text-uppercase" style={{ fontSize: '0.6rem' }}>Recent 30 Days</span>
              </div>
              <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2 custom-scrollbar" style={{ maxHeight: '600px' }}>
                {loading ? (
                   <div className="py-5 text-center opacity-50">
                     <div className="spinner-border spinner-border-sm text-primary mb-2" />
                     <p className="m-0 fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Synchronizing Records...</p>
                   </div>
                ) : attendance.length === 0 ? (
                  <div className="py-5 text-center opacity-25 border border-dashed rounded-3">
                     <FileText size={32} className="mb-2" />
                     <p className="m-0 fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>No data captured</p>
                  </div>
                ) : (
                  attendance.slice(0, 30).map((record, i) => (
                    <div key={i} className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3 border border-light-subtle hover-scale">
                      <div className="d-flex flex-column">
                        <span className="small fw-black text-dark font-mono">{record.date}</span>
                        <span className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.55rem' }}>
                          {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'long' })}
                        </span>
                      </div>
                      <span className={cn(
                        "badge rounded-pill fw-black text-uppercase px-3 py-1.5 shadow-sm",
                        record.status === 'present' ? 'bg-green-500/10 text-green-500' :
                        record.status === 'absent' ? 'bg-red-500/10 text-red-500' :
                        'bg-primary-soft text-primary'
                      )} style={{ fontSize: '0.6rem' }}>
                        {record.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-top bg-gray-50/30">
                 <p className="m-0 text-muted fw-bold text-uppercase text-center" style={{ fontSize: '0.6rem' }}>Total Enrolled Records: {attendance.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-top bg-gray-50/50 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
           <div className="d-flex align-items-center gap-2">
             <div className="bg-success rounded-circle animate-pulse" style={{ width: '8px', height: '8px' }} />
             <span className="text-muted fw-bold small text-uppercase tracking-wider">
               Profile Sync: {new Date(employee.updated_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
             </span>
           </div>
           <button
             onClick={onClose}
             className="btn btn-dark px-5 py-2.5 rounded-3 fw-black text-uppercase tracking-widest shadow-lg"
             style={{ fontSize: '0.75rem' }}
           >
             {hindiLabels.close}
           </button>
        </div>
      </div>
    </Modal>
  );
}
