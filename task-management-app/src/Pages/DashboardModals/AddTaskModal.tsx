import { useState, useEffect, memo, useMemo, useRef } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';



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



  // Initialize localTask only when the modal opens
  useEffect(() => {
    if (open) {
      setLocalTask(newTask);
      setAssignOpen(false);
      setBrandOpen(false);
      setAssignSearch('');
      setBrandSearch('');
    }
  }, [open]);

  // Synchronize parent-managed fields back to local state
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
      // When company changes, reset brand and assignedTo
      if (field === 'companyName' && value !== prev.companyName) {
        next.brand = '';
        next.assignedTo = '';
        next.taskType = '';
      }
      return next;
    });

    // Propagate key field changes to parent so dependent dropdowns re-filter
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



      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="p-2 bg-white/20 rounded-xl">

                <PlusCircle className="h-6 w-6 text-white" />

              </div>

              <div>

                <h3 className="text-xl font-semibold text-white">Create New Task</h3>

                <p className="text-sm text-blue-100 mt-0.5">Fill in the details below to create a new task</p>

              </div>

            </div>

            <button onClick={onClose} className="p-1.5 text-white hover:bg-white/20 rounded-lg">

              <X className="h-5 w-5" />

            </button>

          </div>

        </div>



        <div className="px-6 py-6 overflow-y-auto flex-1">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>

              <label className="block text-sm font-medium text-gray-900 mb-2">Task Title *</label>

              <input

                type="text"

                placeholder="What needs to be done?"

                className={`w-full px-4 py-3 md:py-3.5 text-sm md:text-base border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.title ? 'border-red-500' : 'border-gray-300'}`}

                value={localTask.title}

                onChange={(e) => handleInternalChange('title', e.target.value)}

              />

              {formErrors.title && <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>}

            </div>



            <div>

              <label className="block text-sm font-medium text-gray-900 mb-2">Due Date *</label>

              <input

                type="date"

                className={`w-full px-4 py-3 md:py-3.5 text-sm md:text-base border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.dueDate ? 'border-red-500' : 'border-gray-300'}`}

                value={localTask.dueDate}

                onChange={(e) => handleInternalChange('dueDate', e.target.value)}

                min={new Date().toISOString().split('T')[0]}

              />

              {formErrors.dueDate && <p className="mt-1 text-sm text-red-600">{formErrors.dueDate}</p>}

            </div>



            <div>

              <label className="block text-sm font-medium text-gray-900 mb-2">Assign To *</label>

              <div ref={assignDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAssignOpen((v) => !v)}
                  className={`w-full px-4 py-3 text-sm border rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.assignedTo ? 'border-red-500' : 'border-gray-300'} bg-white`}
                >
                  {localTask.assignedTo
                    ? (() => {
                        const u = users.find((x) => String(x?.email || '') === String(localTask.assignedTo || ''));
                        if (!u) return String(localTask.assignedTo || '').trim();
                        const name = String(u?.name || '').trim();
                        const email = String(u?.email || '').trim();
                        return name ? `${name} (${email})` : email;
                      })()
                    : 'Select team member'}
                </button>

                {assignOpen && (
                  <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={assignSearch}
                        onChange={(e) => {
                          setAssignSearch(e.target.value);
                          setAssignOpen(true);
                        }}
                        placeholder="Search email or name"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56 overflow-auto">
                      {filteredAssignUsers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No results</div>
                      ) : (
                        <List
                          height={Math.min(filteredAssignUsers.length * 40, 224)}
                          itemCount={filteredAssignUsers.length}
                          itemSize={40}
                          width="100%"
                        >
                          {({ index, style }: { index: number; style: React.CSSProperties }) => {
                            const user = filteredAssignUsers[index];
                            if (!user) return null;
                            const name = String(user.name || '').trim();
                            const email = String(user.email || '').trim();
                            const label = name ? `${name} (${email})` : email;
                            
                            return (
                              <button
                                style={style}
                                type="button"
                                onClick={() => {
                                  handleInternalChange('assignedTo', email);
                                  setAssignOpen(false);
                                }}
                                className="w-full text-left px-4 text-sm hover:bg-blue-50 flex items-center"
                              >
                                {label}
                              </button>
                            );
                          }}
                        </List>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {formErrors.assignedTo && <p className="mt-1 text-sm text-red-600">{formErrors.assignedTo}</p>}

            </div>



            <div>

              <div className="flex items-center justify-between mb-2">

                <label className="block text-sm font-medium text-gray-900">Company *</label>

                <div className="flex items-center gap-2">

                  {canBulkAddCompanies && (

                    <button

                      type="button"

                      onClick={onBulkAddCompanies}

                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"

                    >

                      Bulk add

                    </button>

                  )}

                </div>

              </div>

              {/** Hide company dropdown arrow for all non-admin roles. Keep previous SBM behavior by OR-ing with isSbmUser. */}

              {(() => {

                const hideIcon = isSbmUser || !showCompanyDropdownIcon;

                const selectClass = `w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.companyName ? 'border-red-500' : 'border-gray-300'} ${hideIcon ? 'appearance-none' : ''}`;

                const selectStyle = hideIcon ? { backgroundImage: 'none' as const } : undefined;

                return (

                  <select

                    value={localTask.companyName}

                    onChange={(e) => handleInternalChange('companyName', e.target.value)}

                    className={selectClass}

                    style={selectStyle}

                    disabled={availableCompanies.length === 1}

                  >

                    <option value="">Select a company</option>

                    {availableCompanies.map((company) => (

                      <option key={company} value={company}>

                        {company}

                      </option>

                    ))}

                  </select>

                );

              })()}

              {formErrors.companyName && <p className="mt-1 text-sm text-red-600">{formErrors.companyName}</p>}

            </div>



            <div>

              <div className="flex items-center justify-between mb-2">

                <label className="block text-sm font-medium text-gray-900">Brand *</label>

                {canCreateBrand && (

                  <button

                    type="button"

                    onClick={onAddBrand}

                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"

                  >

                    <PlusCircle className="h-3 w-3" />

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
                  className={`w-full px-4 py-3 text-sm border rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.brand ? 'border-red-500' : 'border-gray-300'} ${!localTask.companyName ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
                >
                  {localTask.brand
                    ? (availableBrandOptions.find((x) => String(x?.value || '') === String(localTask.brand || ''))?.label || String(localTask.brand || '').trim())
                    : 'Select a brand'}
                </button>

                {brandOpen && localTask.companyName && (
                  <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={brandSearch}
                        onChange={(e) => {
                          setBrandSearch(e.target.value);
                          setBrandOpen(true);
                        }}
                        placeholder="Search brand"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56 overflow-auto">
                      {filteredBrands.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No results</div>
                      ) : (
                        <List
                          height={Math.min(filteredBrands.length * 40, 224)}
                          itemCount={filteredBrands.length}
                          itemSize={40}
                          width="100%"
                        >
                          {({ index, style }: { index: number; style: React.CSSProperties }) => {
                            const opt = filteredBrands[index];
                            if (!opt) return null;
                            
                            return (
                              <button
                                style={style}
                                type="button"
                                onClick={() => {
                                  handleInternalChange('brand', String(opt.value || '').trim());
                                  setBrandOpen(false);
                                }}
                                className="w-full text-left px-4 text-sm hover:bg-blue-50 flex items-center"
                              >
                                {opt.label}
                              </button>
                            );
                          }}
                        </List>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {formErrors.brand && <p className="mt-1 text-sm text-red-600">{formErrors.brand}</p>}

            </div>



            <div>

              <div className="flex items-center justify-between mb-2">

                <label className="block text-sm font-medium text-gray-900">Task Type</label>

                {canBulkAddTaskTypes && (

                  <button

                    type="button"

                    onClick={onBulkAddTaskTypes}

                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"

                  >

                    Bulk add

                  </button>

                )}

              </div>

              <select

                className={`w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${availableTaskTypesForNewTask.length === 0

                  ? 'border-gray-200 bg-gray-50 text-gray-400'

                  : 'border-gray-300 hover:border-gray-400'}`}

                value={localTask.taskType}

                onChange={(e) => handleInternalChange('taskType', e.target.value)}

                disabled={availableTaskTypesForNewTask.length === 0}

              >

                {availableTaskTypesForNewTask.length === 0 ? (

                  <option value="">No task types available</option>

                ) : (

                  <>

                    <option value="" disabled>

                      Select task type

                    </option>

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



            <div className="md:col-span-2">

              <div className="flex items-center justify-between mb-2">

                <label className="block text-sm font-medium text-gray-900">Priority</label>

              </div>

              <div className="grid grid-cols-3 gap-2">

                {['low', 'medium', 'high'].map((priority) => (

                  <button

                    key={priority}

                    type="button"

                    onClick={() => handleInternalChange('priority', priority as TaskPriority)}

                    className={`py-2.5 text-xs font-medium rounded-lg border transition-all ${localTask.priority === (priority as TaskPriority)

                      ? priority === 'high'

                        ? 'bg-rose-100 text-rose-700 border-rose-300 shadow-sm'

                        : priority === 'medium'

                          ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm'

                          : 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm'

                      : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-50'}`}

                  >

                    {priority.charAt(0).toUpperCase() + priority.slice(1)}

                  </button>

                ))}

              </div>

            </div>

          </div>

        </div>



        <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">

          <div className="flex justify-end gap-3">

            <button

              type="button"

              onClick={onClose}

              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"

            >

              Cancel

            </button>

            <button

              type="button"

              onClick={handleSubmit}

              disabled={isSubmitting}

              className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl ${isSubmitting

                ? 'bg-blue-400 cursor-not-allowed'

                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}`}

            >

              {isSubmitting ? (

                <span className="flex items-center gap-2">

                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />

                  Creating Task...

                </span>

              ) : (

                <span className="flex items-center gap-2">

                  <PlusCircle className="h-4 w-4" />

                  Create Task

                </span>

              )}

            </button>

          </div>

        </div>

      </div>

    </div>

  );

};



export default memo(AddTaskModal);