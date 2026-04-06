import { useState, useEffect, memo, useMemo, useRef } from 'react';
import { PlusCircle, X, ChevronDown, Search } from 'lucide-react';
import type { TaskPriority, UserType } from '../../Types/Types';

interface NewTaskForm {
  title: string;
  assignedTo: string;
  dueDate: string;
  priority: TaskPriority;
  taskType: string;
  companyName: string;
  brand: string;
}

type FormErrors = Record<string, string>;

type Props = {
  open: boolean;
  onClose: () => void;
  newTask: NewTaskForm;
  formErrors: FormErrors;
  users: UserType[];
  availableCompanies: string[];
  canBulkAddCompanies: boolean;
  onBulkAddCompanies: () => void | Promise<void>;
  canCreateBrand: boolean;
  canBulkAddBrands: boolean;
  onAddBrand: () => void;
  availableBrandOptions: Array<{ value: string; label: string }>;
  canBulkAddTaskTypes: boolean;
  onBulkAddTaskTypes: () => void | Promise<void>;
  availableTaskTypesForNewTask: string[];
  onSubmit: (data: NewTaskForm) => void;
  isSubmitting: boolean;
  isSbmUser?: boolean;
  showCompanyDropdownIcon?: boolean;
  onFieldChange?: (field: keyof NewTaskForm, value: string) => void;
};

const AddTaskModal = ({
  open,
  onClose,
  newTask,
  formErrors,
  users,
  availableCompanies,
  canBulkAddCompanies,
  onBulkAddCompanies,
  canCreateBrand,
  canBulkAddBrands,
  onAddBrand,
  availableBrandOptions,
  canBulkAddTaskTypes,
  onBulkAddTaskTypes,
  availableTaskTypesForNewTask,
  onSubmit,
  isSubmitting,
  isSbmUser,
  showCompanyDropdownIcon = false,
  onFieldChange,
}: Props) => {
  const [localTask, setLocalTask] = useState<NewTaskForm>(newTask);
  const assignDropdownRef = useRef<HTMLDivElement | null>(null);
  const brandDropdownRef = useRef<HTMLDivElement | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  useEffect(() => {
    if (open) {
      setLocalTask(newTask);
      setAssignOpen(false);
      setBrandOpen(false);
      setAssignSearch('');
      setBrandSearch('');
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setLocalTask((prev) => ({
        ...prev,
        assignedTo: newTask.assignedTo,
        companyName: newTask.companyName,
        brand: newTask.brand,
        taskType: newTask.taskType,
        priority: newTask.priority,
      }));
    }
  }, [open, newTask.assignedTo, newTask.companyName, newTask.brand, newTask.taskType, newTask.priority]);

  const filteredAssignUsers = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = String(u?.name || '').trim().toLowerCase();
      const email = String(u?.email || '').trim().toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, assignSearch]);

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return availableBrandOptions;
    return availableBrandOptions.filter((opt) => {
      const value = String(opt?.value || '').trim().toLowerCase();
      const label = String(opt?.label || '').trim().toLowerCase();
      return value.includes(q) || label.includes(q);
    });
  }, [availableBrandOptions, brandSearch]);

  useEffect(() => {
    if (!assignOpen && !brandOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (assignOpen && assignDropdownRef.current && target && !assignDropdownRef.current.contains(target)) {
        setAssignOpen(false);
      }
      if (brandOpen && brandDropdownRef.current && target && !brandDropdownRef.current.contains(target)) {
        setBrandOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [assignOpen, brandOpen]);

  const handleInternalChange = (field: keyof NewTaskForm, value: string) => {
    setLocalTask((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'companyName' && value !== prev.companyName) {
        next.brand = '';
        next.assignedTo = '';
        next.taskType = '';
      }
      return next;
    });

    if (onFieldChange && (field === 'companyName' || field === 'brand' || field === 'assignedTo')) {
      onFieldChange(field, value);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSubmit(localTask);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white no-dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 gradient-primary" />
          <div className="relative px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <PlusCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create New Task</h3>
                  <p className="text-xs text-white/80 mt-0.5">Fill in the details below to create a new task</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Task Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 no-dark:text-gray-300 mb-1.5">Task Title *</label>
              <input
                type="text"
                placeholder="What needs to be done?"
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 ${formErrors.title
                  ? 'border-red-500 bg-red-50 no-dark:bg-red-900/10'
                  : 'border-gray-200 no-dark:border-gray-700 bg-gray-50 no-dark:bg-gray-800/50'
                  }`}
                value={localTask.title}
                onChange={(e) => handleInternalChange('title', e.target.value)}
              />
              {formErrors.title && <p className="mt-1 text-xs text-red-600">{formErrors.title}</p>}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-gray-700 no-dark:text-gray-300 mb-1.5">Due Date *</label>
              <input
                type="date"
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 ${formErrors.dueDate
                  ? 'border-red-500 bg-red-50 no-dark:bg-red-900/10'
                  : 'border-gray-200 no-dark:border-gray-700 bg-gray-50 no-dark:bg-gray-800/50'
                  }`}
                value={localTask.dueDate}
                onChange={(e) => handleInternalChange('dueDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              {formErrors.dueDate && <p className="mt-1 text-xs text-red-600">{formErrors.dueDate}</p>}
            </div>

            {/* Assign To */}
            <div>
              <label className="block text-xs font-medium text-gray-700 no-dark:text-gray-300 mb-1.5">Assign To *</label>
              <div ref={assignDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAssignOpen((v) => !v)}
                  className={`w-full px-3 py-2 text-sm border rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 flex items-center justify-between ${formErrors.assignedTo
                    ? 'border-red-500 bg-red-50 no-dark:bg-red-900/10'
                    : 'border-gray-200 no-dark:border-gray-700 bg-gray-50 no-dark:bg-gray-800/50'
                    }`}
                >
                  <span className="truncate text-sm">
                    {localTask.assignedTo
                      ? (() => {
                        const u = users.find((x) => String(x?.email || '') === String(localTask.assignedTo || ''));
                        if (!u) return String(localTask.assignedTo || '').trim();
                        const name = String(u?.name || '').trim();
                        const email = String(u?.email || '').trim();
                        return name ? `${name} (${email})` : email;
                      })()
                      : 'Select team member'}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${assignOpen ? 'rotate-180' : ''}`} />
                </button>

                {assignOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 no-dark:border-gray-700 bg-white no-dark:bg-gray-800 shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100 no-dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={assignSearch}
                          onChange={(e) => {
                            setAssignSearch(e.target.value);
                            setAssignOpen(true);
                          }}
                          placeholder="Search email or name"
                          className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 no-dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white no-dark:bg-gray-800"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-auto">
                      {filteredAssignUsers.length === 0 ? (
                        <div className="px-3 py-2 text-center text-xs text-gray-500">No results</div>
                      ) : (
                        filteredAssignUsers.map((user) => {
                          const name = String(user?.name || '').trim();
                          const email = String(user?.email || '').trim();
                          const label = name ? `${name} (${email})` : email;
                          return (
                            <button
                              key={String(user.id || user.email)}
                              type="button"
                              onClick={() => {
                                handleInternalChange('assignedTo', email);
                                setAssignOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-primary-ultralight no-dark:hover:bg-gray-700 transition-colors"
                            >
                              {label}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
              {formErrors.assignedTo && <p className="mt-1 text-xs text-red-600">{formErrors.assignedTo}</p>}
            </div>

            {/* Company */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-700 no-dark:text-gray-300">Company *</label>
                {canBulkAddCompanies && (
                  <button
                    type="button"
                    onClick={onBulkAddCompanies}
                    className="text-[10px] text-primary hover:text-primary-light font-medium"
                  >
                    Bulk add
                  </button>
                )}
              </div>
              {(() => {
                const hideIcon = isSbmUser || !showCompanyDropdownIcon;
                return (
                  <select
                    value={localTask.companyName}
                    onChange={(e) => handleInternalChange('companyName', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 ${formErrors.companyName
                      ? 'border-red-500 bg-red-50 no-dark:bg-red-900/10'
                      : 'border-gray-200 no-dark:border-gray-700 bg-gray-50 no-dark:bg-gray-800/50'
                      } ${hideIcon ? 'appearance-none' : ''}`}
                    style={hideIcon ? { backgroundImage: 'none' } : undefined}
                    disabled={availableCompanies.length === 1}
                  >
                    <option value="">Select a company</option>
                    {availableCompanies.map((company) => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>
                );
              })()}
              {formErrors.companyName && <p className="mt-1 text-xs text-red-600">{formErrors.companyName}</p>}
            </div>

            {/* Brand */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-700 no-dark:text-gray-300">Brand *</label>
                {canCreateBrand && (
                  <button
                    type="button"
                    onClick={onAddBrand}
                    className="text-[10px] text-primary hover:text-primary-light font-medium flex items-center gap-0.5"
                  >
                    <PlusCircle className="h-2.5 w-2.5" />
                    {canBulkAddBrands ? 'Bulk Add Brands' : 'Add Brand'}
                  </button>
                )}
              </div>
              <div ref={brandDropdownRef} className="relative">
                <button
                  type="button"
                  disabled={!localTask.companyName}
                  onClick={() => {
                    if (!localTask.companyName) return;
                    setBrandOpen((v) => !v);
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 flex items-center justify-between ${formErrors.brand
                    ? 'border-red-500 bg-red-50 no-dark:bg-red-900/10'
                    : 'border-gray-200 no-dark:border-gray-700 bg-gray-50 no-dark:bg-gray-800/50'
                    } ${!localTask.companyName ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className="truncate text-sm">
                    {localTask.brand
                      ? (availableBrandOptions.find((x) => String(x?.value || '') === String(localTask.brand || ''))?.label || String(localTask.brand || '').trim())
                      : 'Select a brand'}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${brandOpen ? 'rotate-180' : ''}`} />
                </button>

                {brandOpen && localTask.companyName && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 no-dark:border-gray-700 bg-white no-dark:bg-gray-800 shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100 no-dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={brandSearch}
                          onChange={(e) => {
                            setBrandSearch(e.target.value);
                            setBrandOpen(true);
                          }}
                          placeholder="Search brand"
                          className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 no-dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white no-dark:bg-gray-800"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-auto">
                      {filteredBrands.length === 0 ? (
                        <div className="px-3 py-2 text-center text-xs text-gray-500">No results</div>
                      ) : (
                        filteredBrands.map((opt) => (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onClick={() => {
                              handleInternalChange('brand', String(opt.value || '').trim());
                              setBrandOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-primary-ultralight dark:hover:bg-gray-700 transition-colors"
                          >
                            {opt.label}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {formErrors.brand && <p className="mt-1 text-xs text-red-600">{formErrors.brand}</p>}
            </div>

            {/* Task Type */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-700 no-dark:text-gray-300">Task Type</label>
                {canBulkAddTaskTypes && (
                  <button
                    type="button"
                    onClick={onBulkAddTaskTypes}
                    className="text-[10px] text-primary hover:text-primary-light font-medium"
                  >
                    Bulk add
                  </button>
                )}
              </div>
              <select
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 ${availableTaskTypesForNewTask.length === 0
                  ? 'border-gray-200 no-dark:border-gray-700 bg-gray-50 no-dark:bg-gray-800/50 text-gray-400'
                  : 'border-gray-200 no-dark:border-gray-700 bg-gray-50 no-dark:bg-gray-800/50'
                  }`}
                value={localTask.taskType}
                onChange={(e) => handleInternalChange('taskType', e.target.value)}
                disabled={availableTaskTypesForNewTask.length === 0}
              >
                {availableTaskTypesForNewTask.length === 0 ? (
                  <option value="">No task types available</option>
                ) : (
                  <>
                    <option value="" disabled>Select task type</option>
                    {availableTaskTypesForNewTask.map((typeName) => (
                      <option key={typeName} value={typeName.toLowerCase()}>
                        {(() => {
                          const raw = (typeName || '').toString().trim();
                          const key = raw.toLowerCase().replace(/[\s-]+/g, ' ').trim();
                          if (key === 'troubleshoot' || key === 'trouble shoot' || key === 'trubbleshot' || key === 'trubble shoot') return 'Troubleshoot';
                          return raw;
                        })()}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {availableTaskTypesForNewTask.length === 0 && canBulkAddTaskTypes && (
                <p className="mt-1 text-xs text-amber-600">Add task types to continue</p>
              )}
            </div>

            {/* Priority */}
            <div className="md:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-700 no-dark:text-gray-300">Priority</label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['low', 'medium', 'high'].map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => handleInternalChange('priority', priority as TaskPriority)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all duration-200 ${localTask.priority === (priority as TaskPriority)
                      ? priority === 'high'
                        ? 'bg-rose-100 text-rose-700 border-rose-300'
                        : priority === 'medium'
                          ? 'bg-amber-100 text-amber-700 border-amber-300'
                          : 'bg-primary-ultralight text-primary border-primary-light'
                      : 'border-gray-200 no-dark:border-gray-700 bg-gray-50 no-dark:bg-gray-800/50 text-gray-600 no-dark:text-gray-400'
                      }`}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 no-dark:bg-gray-800/50 border-t border-gray-200 no-dark:border-gray-700 flex-shrink-0">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 no-dark:text-gray-400 bg-white no-dark:bg-gray-800 border border-gray-200 no-dark:border-gray-700 rounded-xl hover:bg-gray-50 no-dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-4 py-2 text-xs font-medium text-white rounded-xl transition-all duration-200 ${isSubmitting
                ? 'bg-primary/60 cursor-not-allowed'
                : 'gradient-primary hover:shadow-md'
                }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                  Creating Task...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Create Task
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-primary-main);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default memo(AddTaskModal);