import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, List, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { mdImpexStrikeService } from '../Services/MdImpexStrike.service';
import type { MdImpexStrike } from '../Services/MdImpexStrike.service';
import type { UserType } from '../Types/Types';

const normalizeRole = (role: string | undefined) => String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

interface NewMdImpexStrikePageProps {
  currentUser: UserType;
  users: UserType[];
}

export default function NewMdImpexStrikePage({ currentUser, users }: NewMdImpexStrikePageProps) {
  const role = normalizeRole(currentUser?.role);
  // Allowed roles to Add/Edit
  const canManage = ['md_manager', 'ob_manager', 'admin', 'super_admin'].includes(role);
  
  // Date states
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  
  // Data states
  const [strikes, setStrikes] = useState<MdImpexStrike[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    pocEmail: '',
    brandName: '',
    strikeType: 'small',
    strikeTitle: '',
    company: 'MD-Impex',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStrikes = async () => {
    setIsLoading(true);
    const res = await mdImpexStrikeService.getStrikes(selectedMonth);
    if (res.success && Array.isArray(res.data)) {
      setStrikes(res.data);
    } else {
      toast.error(res.message || 'Failed to fetch strikes');
      setStrikes([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStrikes();
  }, [selectedMonth]);

  const handleOpenModal = (strike?: MdImpexStrike) => {
    if (strike) {
      setIsEditMode(true);
      setEditingId(strike._id);
      setFormData({
        date: new Date(strike.date).toISOString().split('T')[0],
        time: strike.time,
        pocEmail: strike.poc.email,
        brandName: strike.brandName || '',
        strikeType: (String((strike as any).strikeType || '').trim().toLowerCase() === 'big') ? 'big' : 'small',
        strikeTitle: strike.strikeTitle,
        company: strike.company || 'MD-Impex',
        reason: strike.reason
      });
    } else {
      setIsEditMode(false);
      setEditingId(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        pocEmail: '',
        brandName: '',
        strikeType: 'small',
        strikeTitle: '',
        company: 'MD-Impex',
        reason: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const strikeTypeNormalized = String((formData as any).strikeType || '').trim().toLowerCase() === 'big' ? 'big' : 'small';
    const payload = {
      ...formData,
      strikeType: strikeTypeNormalized,
    };
    
    let res;
    if (isEditMode && editingId) {
      res = await mdImpexStrikeService.updateStrike(editingId, payload);
    } else {
      res = await mdImpexStrikeService.createStrike(payload);
    }
    
    setIsSubmitting(false);
    
    if (res.success) {
      toast.success(`Strike ${isEditMode ? 'updated' : 'added'} successfully!`);
      handleCloseModal();
      fetchStrikes();
    } else {
      toast.error(res.message || 'Error saving strike');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this strike?')) return;
    
    const res = await mdImpexStrikeService.deleteStrike(id);
    if (res.success) {
      toast.success('Strike deleted');
      fetchStrikes();
    } else {
      toast.error(res.message || 'Failed to delete');
    }
  };

  const prevMonth = () => {
    const [y, m] = selectedMonth.split('-');
    const dt = new Date(Number(y), Number(m) - 2, 1);
    setSelectedMonth(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const [y, m] = selectedMonth.split('-');
    const dt = new Date(Number(y), Number(m), 1);
    setSelectedMonth(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
  };

  // Build Calendar Data
  const calendarDays = useMemo(() => {
    if (viewMode !== 'calendar') return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    let firstDayOfWeek = firstDay.getDay() || 7; // make Sunday=7 or Mon=1? standard is Sun=0
    firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Start on Monday

    const days = [];
    // Previous month padding
    for (let i = 0; i < firstDayOfWeek; i++) {
        days.push({ day: null, date: null });
    }
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const currentDate = new Date(year, month - 1, i);
        days.push({ day: i, date: currentDate });
    }
    return days;
  }, [selectedMonth, viewMode]);

  const getStrikesForDate = (date: Date) => {
    return strikes.filter(s => {
      const sDate = new Date(s.date);
      return sDate.getFullYear() === date.getFullYear() && 
             sDate.getMonth() === date.getMonth() && 
             sDate.getDate() === date.getDate();
    });
  };

  // Format month name
  const monthName = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    const dt = new Date(Number(y), Number(m) - 1, 1);
    return dt.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const userStrikeStats = useMemo(() => {
    const byUser: Record<
      string,
      {
        email: string;
        name: string;
        smallStrikeCount: number;
        bigStrikeCount: number;
        smallPenalty: number;
        bigPenalty: number;
        totalPenalty: number;
      }
    > = {};

    const calcSmallPenalty = (smallCount: number) => {
      if (smallCount <= 3) return 0;
      if (smallCount === 4) return 250;
      if (smallCount === 5) return 500;
      return 500 + (smallCount - 5) * 100;
    };

    strikes.forEach((s: any) => {
      const email = String(s?.poc?.email || '').trim().toLowerCase();
      if (!email) return;

      if (!byUser[email]) {
        byUser[email] = {
          email,
          name: String(s?.poc?.name || s?.poc?.email || '').trim() || email,
          smallStrikeCount: 0,
          bigStrikeCount: 0,
          smallPenalty: 0,
          bigPenalty: 0,
          totalPenalty: 0,
        };
      }

      const t = String(s?.strikeType || '').trim().toLowerCase();
      const type = t === 'big' ? 'big' : 'small';
      if (type === 'big') byUser[email].bigStrikeCount += 1;
      else byUser[email].smallStrikeCount += 1;
    });

    const out = Object.values(byUser).map((u) => {
      const smallPenalty = calcSmallPenalty(u.smallStrikeCount);
      const bigPenalty = u.bigStrikeCount * 500;
      return {
        ...u,
        smallPenalty,
        bigPenalty,
        totalPenalty: smallPenalty + bigPenalty,
      };
    });

    out.sort((a, b) => (b.totalPenalty - a.totalPenalty) || (b.smallStrikeCount + b.bigStrikeCount) - (a.smallStrikeCount + a.bigStrikeCount));
    return out;
  }, [strikes]);

  const totalPenaltyAllUsers = useMemo(() => {
    return (userStrikeStats || []).reduce((sum, u) => sum + (u.totalPenalty || 0), 0);
  }, [userStrikeStats]);

return (
    <div className="flex flex-col h-full bg-gray-50/50 min-h-[calc(100vh-80px)] p-3 md:p-4 space-y-4 max-w-5xl mx-auto w-full">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
      <div>
  <h1 className="text-lg font-bold text-[#0f2a6e]">
    MD-Impex Manual Strikes
  </h1>
  <p className="text-xs font-medium text-gray-500 mt-0.5">
    Manage and track manual employee strikes
  </p>
</div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center bg-gray-100/80 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-[var(--color-primary-main)]' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <List className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-[var(--color-primary-main)]' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>
          
          {canManage && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-1.5 bg-[var(--color-primary-main)] hover:bg-[var(--color-primary-dark)] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Strike
            </button>
          )}
        </div>
      </div>

      {/* Controls panel */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors border border-gray-200">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[120px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors border border-gray-200">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div>
           <span className="text-xs font-semibold bg-[var(--color-primary-ultralight)] text-[var(--color-primary-dark)] px-2 py-1 rounded-md border border-[var(--color-primary-lighter)]">
             Total: {strikes.length}
           </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[var(--color-primary-main)] animate-spin" />
          </div>
        )}
        
        {viewMode === 'table' ? (
          // TABLE VIEW
          <div className="overflow-x-auto w-full h-full p-1.5">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                   <th className="px-3 py-2.5 min-w-[100px]">Date/Time</th>
                   <th className="px-3 py-2.5 min-w-[150px]">POC</th>
                   <th className="px-3 py-2.5 min-w-[100px]">Brand</th>
                   <th className="px-3 py-2.5 min-w-[90px]">Type</th>
                   <th className="px-3 py-2.5 min-w-[130px]">Title</th>
                   <th className="px-3 py-2.5 min-w-[160px]">Reason</th>
                   <th className="px-3 py-2.5 min-w-[120px]">Assigned By</th>
                   {canManage && <th className="px-3 py-2.5 text-right">Actions</th>}
              </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {strikes.map((strike) => (
                  <tr key={strike._id} className="hover:bg-[var(--color-primary-ultralight)] transition-colors group">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-900 text-xs">{new Date(strike.date).toLocaleDateString()}</div>
                      <div className="text-[10px] text-brand-600 font-medium">{strike.time}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-900 text-xs">{strike.poc.name}</div>
                      <div className="text-[9px] text-gray-500 truncate max-w-[140px]">{strike.poc.email}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                        {strike.brandName || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${String((strike as any)?.strikeType || '').trim().toLowerCase() === 'big' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {String((strike as any)?.strikeType || '').trim().toLowerCase() === 'big' ? 'Big' : 'Small'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-900 text-xs">
                      {strike.strikeTitle}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-600 max-w-[160px] whitespace-normal break-words leading-snug">
                      {strike.reason}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-900 text-[10px]">{strike.assignBy.name}</div>
                      <div className="text-[9px] text-gray-400">{strike.assignBy.email}</div>
                    </td>
                    {canManage && (
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleOpenModal(strike)} className="p-1 text-[var(--color-primary-main)] hover:bg-[var(--color-primary-ultralight)] rounded-md" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(strike._id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {strikes.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={canManage ? 8 : 7} className="px-3 py-10 text-center">
                       <div className="flex flex-col items-center justify-center">
                         <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                            <AlertCircle className="w-5 h-5 text-gray-400" />
                         </div>
                         <p className="text-xs font-medium text-gray-600">No strikes found for this month.</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          // CALENDAR VIEW - Compact
          <div className="p-2 overflow-x-auto">
             <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200 w-full">
                {/* Week headers */}
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="bg-gray-50 p-1 text-center text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                    {day}
                  </div>
                ))}
                
                {/* Days */}
                {calendarDays.map((cell, idx) => {
                  if (!cell.day || !cell.date) {
                    return <div key={`empty-${idx}`} className="bg-gray-50/50 min-h-[80px] p-1" />;
                  }
                  
                  const dayStrikes = getStrikesForDate(cell.date);
                  const isToday = new Date().toDateString() === cell.date.toDateString();
                  
                  return (
                    <div key={idx} className={`bg-white min-h-[80px] p-1 transition-colors hover:bg-[var(--color-primary-ultralight)] ${isToday ? 'bg-[var(--color-primary-ultralight)]/50 border border-[var(--color-primary-lighter)]' : ''}`}>
                       <div className="flex justify-between items-start mb-1">
                         <span className={`text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full ${isToday ? 'bg-[var(--color-primary-main)] text-white shadow-sm' : 'text-gray-700'}`}>
                           {cell.day}
                         </span>
                         {dayStrikes.length > 0 && (
                           <span className="text-[8px] font-bold bg-red-100 text-red-700 px-1 py-0.5 rounded-full">
                             {dayStrikes.length}
                           </span>
                         )}
                       </div>
                       
                       <div className="space-y-0.5 overflow-y-auto max-h-[60px] pr-0.5 custom-scrollbar">
                         {dayStrikes.map(s => (
                           <div key={s._id} className="text-[8px] p-0.5 rounded border border-red-100 bg-red-50 text-red-800 leading-tight">
                             <span className="font-bold">{s.time}</span>
                             <span className="text-[7px] block truncate">{s.poc.name.split(' ')[0]}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}
      </div>

      {/* User Wise Strike Count */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between gap-2 mb-2 border-b border-gray-100 pb-2">
          <h2 className="text-sm font-bold text-gray-800">User-Wise Strike & Penalty</h2>
          <div className="text-xs font-semibold bg-[var(--color-primary-ultralight)] text-[var(--color-primary-dark)] px-2 py-1 rounded-md border border-[var(--color-primary-lighter)]">
            Total Cut: {totalPenaltyAllUsers}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {userStrikeStats.map(u => (
            <div key={u.email} className="p-2 rounded-lg bg-gray-50 border border-gray-100 hover:border-[var(--color-primary-lighter)] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-gray-900 truncate" title={u.name}>{u.name}</div>
                  <div className="text-[9px] text-gray-500 truncate" title={u.email}>{u.email}</div>
                </div>
                <div className="bg-red-50 text-red-700 px-2 py-0.5 rounded-md text-xs font-bold shadow-sm border border-red-100">
                  {u.totalPenalty}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1">
                <div className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1">
                  <div className="text-[9px] font-bold text-blue-800 uppercase">Small</div>
                  <div className="text-[10px] font-semibold text-blue-900">{u.smallStrikeCount} / {u.smallPenalty}</div>
                </div>
                <div className="rounded-md border border-purple-100 bg-purple-50 px-2 py-1">
                  <div className="text-[9px] font-bold text-purple-800 uppercase">Big</div>
                  <div className="text-[10px] font-semibold text-purple-900">{u.bigStrikeCount} / {u.bigPenalty}</div>
                </div>
              </div>
            </div>
          ))}
          {userStrikeStats.length === 0 && !isLoading && (
            <div className="col-span-full text-xs text-gray-500 py-2 text-center">No strikes found for this month.</div>
          )}
        </div>
      </div>

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-0">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={handleCloseModal} />
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
             
             {/* Header */}
             <div className="bg-[var(--color-primary-main)] px-4 py-3 flex items-center justify-between border-b border-[var(--color-primary-dark)]">
               <h2 className="text-base font-bold text-white flex items-center gap-2">
                 {isEditMode ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                 {isEditMode ? 'Edit Strike' : 'Add New Strike'}
               </h2>
               <button onClick={handleCloseModal} className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-md transition-colors">
                 <X className="w-4 h-4" />
               </button>
             </div>

             {/* Form */}
             <form onSubmit={handleSubmit} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {/* Date */}
                   <div className="space-y-1">
                     <label className="text-[10px] font-semibold text-gray-700">Date <span className="text-red-500">*</span></label>
                     <input 
                       type="date" 
                       name="date" 
                       required
                       value={formData.date}
                       onChange={handleInputChange}
                       className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary-light)] focus:border-[var(--color-primary-main)] outline-none transition-all"
                     />
                   </div>

                   {/* Time */}
                   <div className="space-y-1">
                     <label className="text-[10px] font-semibold text-gray-700">Time <span className="text-red-500">*</span></label>
                     <input 
                       type="time" 
                       name="time" 
                       required
                       value={formData.time}
                       onChange={handleInputChange}
                       className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary-light)] focus:border-[var(--color-primary-main)] outline-none transition-all"
                     />
                   </div>

                   {/* POC User */}
                   <div className="space-y-1 md:col-span-2">
                     <label className="text-[10px] font-semibold text-gray-700">Point of Contact <span className="text-red-500">*</span></label>
                     <select 
                       name="pocEmail"
                       required
                       value={formData.pocEmail}
                       onChange={handleInputChange}
                       className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[var(--color-primary-light)] focus:border-[var(--color-primary-main)] outline-none transition-all"
                     >
                       <option value="" disabled>Select Employee</option>
                       {(users || []).map((u: any) => (
                         <option key={u.email} value={u.email}>
                           {u.name || u.email} ({u.email})
                         </option>
                       ))}
                     </select>
                   </div>

                   {/* Strike Title */}
                   <div className="space-y-1 md:col-span-2">
                     <label className="text-[10px] font-semibold text-gray-700">Strike Title <span className="text-red-500">*</span></label>
                     <input 
                       type="text" 
                       name="strikeTitle"
                       required
                       placeholder="e.g. Late Meeting Arrival"
                       value={formData.strikeTitle}
                       onChange={handleInputChange}
                       className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary-light)] focus:border-[var(--color-primary-main)] outline-none transition-all"
                     />
                   </div>

                   {/* Strike Type */}
                   <div className="space-y-1">
                     <label className="text-[10px] font-semibold text-gray-700">Strike Type <span className="text-red-500">*</span></label>
                     <select
                       name="strikeType"
                       required
                       value={(formData as any).strikeType}
                       onChange={handleInputChange}
                       className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[var(--color-primary-light)] focus:border-[var(--color-primary-main)] outline-none transition-all"
                     >
                       <option value="small">Small</option>
                       <option value="big">Big</option>
                     </select>
                   </div>

                   {/* Brand Name */}
                   <div className="space-y-1">
                     <label className="text-[10px] font-semibold text-gray-700">Brand Name</label>
                     <input 
                       type="text" 
                       name="brandName"
                       placeholder="Optional brand"
                       value={formData.brandName}
                       onChange={handleInputChange}
                       className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary-light)] focus:border-[var(--color-primary-main)] outline-none transition-all"
                     />
                   </div>

                   {/* Company */}
                   <div className="space-y-1">
                     <label className="text-[10px] font-semibold text-gray-700">Company</label>
                     <input 
                       type="text" 
                       name="company"
                       readOnly
                       value={formData.company}
                       className="w-full px-2.5 py-1.5 text-xs border border-gray-200 bg-gray-50 rounded-lg text-gray-500 outline-none cursor-not-allowed"
                     />
                   </div>

                   {/* Reason */}
                   <div className="space-y-1 md:col-span-2">
                     <label className="text-[10px] font-semibold text-gray-700">Detailed Reason <span className="text-red-500">*</span></label>
                     <textarea 
                       name="reason"
                       required
                       placeholder="Explain the reason for the strike..."
                       rows={3}
                       value={formData.reason}
                       onChange={handleInputChange}
                       className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary-light)] focus:border-[var(--color-primary-main)] outline-none transition-all resize-none"
                     />
                   </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 bg-[var(--color-primary-main)] hover:bg-[var(--color-primary-dark)] text-white px-4 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-70"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isEditMode ? 'Update' : 'Save'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
