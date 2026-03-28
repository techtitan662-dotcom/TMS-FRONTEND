import { PlusCircle, X } from 'lucide-react';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { TaskPriority, UserType } from '../../Types/Types';
import mdImpexAccessService from '../../Services/MdImpexAccess.services';
import { taskTypeService } from '../../Services/TaskType.service';

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
  onChange: (field: keyof NewTaskForm, value: string) => void;
  availableCompanies: string[];
  getAvailableBrandOptions: () => Array<{ value: string; label: string }>;
  availableTaskTypesForNewTask: string[];
  onSubmit: () => void;
  isSubmitting: boolean;
  currentUserEmail: string;
  currentUserRole?: string;
  canCreateBrand?: boolean;
  canBulkAddBrands?: boolean;
  onAddBrand?: () => void;
  canBulkAddTaskTypes?: boolean;
  onBulkAddTaskTypes?: () => void | Promise<void>;
};

const normalizeEmail = (value: unknown): string => {
  const raw = (value == null ? "" : String(value)).trim().toLowerCase();
  if (!raw) return "";
  const marker = ".deleted.";
  const idx = raw.indexOf(marker);
  const base = idx === -1 ? raw : raw.slice(0, idx).trim();
  return base;
};

const MdImpexAddTaskModal = ({
  open,
  onClose,
  newTask,
  formErrors,
  onChange,
  getAvailableBrandOptions,
  availableTaskTypesForNewTask,
  onSubmit,
  isSubmitting,
  currentUserEmail,
  currentUserRole,
  canBulkAddTaskTypes,
  onBulkAddTaskTypes,
}: Props) => {
  const [allowedUsers, setAllowedUsers] = useState<UserType[]>([]);
  const [allowedTaskTypes, setAllowedTaskTypes] = useState<string[]>([]);
  const [allowedBrands, setAllowedBrands] = useState<string[]>([]);
  const [hasSpecificAccess, setHasSpecificAccess] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [taskTypesFromApi, setTaskTypesFromApi] = useState<any[]>([]);
  const hasInitializedRef = useRef(false);
  const emailDropdownRef = useRef<HTMLDivElement | null>(null);
  const brandDropdownRef = useRef<HTMLDivElement | null>(null);

  // Local state for text inputs to prevent lag during typing
  const [localTitle, setLocalTitle] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSearch, setEmailSearch] = useState('');
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  const normalizedCurrentUserRole = (currentUserRole || '').toString().trim().toLowerCase();
  const isMdManager = normalizedCurrentUserRole === 'md_manager';
  const MD_IMPEX_COMPANY_NAME = 'MD Impex';
  const companyOptions = [MD_IMPEX_COMPANY_NAME];
  
  // Memoize brand options to show all brands for managers, but filtered for others
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const brandOptions = useMemo(() => {
    const allOptions = getAvailableBrandOptions();
    
    // If Admin or MD Manager, show all brands (old + new)
    const isAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin' || currentUserRole === 'troubleshoot_manager';
    if (isMdManager || isAdmin) return allOptions;
    
    // For others:
    // If we have NO specific 'myAccess' record for this user, they are an "old member"
    // or someone who hasn't been restricted yet. We show all brands.
    // We'll use a local state 'hasSpecificAccess' to track this.
    if (!hasSpecificAccess) return allOptions;

    // If we have a record but NO brands selected in it, show ALL (consistent with Task Types)
    if (allowedBrands.length === 0) return allOptions;
    
    // Filter based on allowedBrands (matching by label or value)
    const normalize = (v: unknown) => String(v || '').trim().toLowerCase();
    const normalizeAllowed = (v: unknown) => normalize(v).replace(/\s+/g, ' ');
    const cleanLabel = (label: unknown) => {
      const raw = normalizeAllowed(label);
      if (!raw) return '';
      const parts = raw.split(' - ');
      if (parts.length >= 2 && /^\d+$/.test(parts[0].trim())) {
        return parts.slice(1).join(' - ').trim();
      }
      return raw;
    };
    const allowedSet = new Set((allowedBrands || []).map((b) => normalizeAllowed(b)).filter(Boolean));
    return allOptions.filter((opt) => {
      const valueKey = normalizeAllowed(opt?.value);
      const labelKey = normalizeAllowed(opt?.label);
      const cleanedLabelKey = cleanLabel(opt?.label);
      return (
        (valueKey && allowedSet.has(valueKey)) ||
        (labelKey && allowedSet.has(labelKey)) ||
        (cleanedLabelKey && allowedSet.has(cleanedLabelKey))
      );
    });
  }, [newTask.companyName, allowedBrands, isMdManager, currentUserRole, hasSpecificAccess]);
  
  // Sync local title from prop when modal opens
  useEffect(() => {
    if (open) {
      setLocalTitle(newTask.title);
    }
  }, [open]); // Only sync when modal opens, not on every title change
  
  // Handle title input - updates local state only (no parent re-render)
  const handleTitleChange = useCallback((value: string) => {
    setLocalTitle(value);
  }, []);
  
  // Sync title to parent on blur
  const handleTitleBlur = useCallback(() => {
    onChange('title', localTitle);
  }, [localTitle, onChange]);

  // Separate effect for initialization - runs once when modal opens
  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false; // Reset when modal closes
      setAllowedUsers([]);
      setAllowedTaskTypes([]);
      setLocalTitle(''); // Reset local title
      return;
    }
    if (hasInitializedRef.current) return; // Already initialized
    
    hasInitializedRef.current = true;
    setLocalTitle(newTask.title); // Initialize local title
    
    // Auto-select Company for this modal (MD Impex)
    if (newTask.companyName !== MD_IMPEX_COMPANY_NAME) {
      onChange('companyName', MD_IMPEX_COMPANY_NAME);
    }
  }, [open]); // Only depend on 'open' to prevent loops

  // Separate effect for fetching access data
  useEffect(() => {
    const fetchAccessData = async () => {
      // ALWAYS fetch fresh data when modal opens to ensure real-time updates
      if (!open || !currentUserEmail) return;

      setLoadingUsers(true);
      try {
        console.log("[MdImpexAddTaskModal] Fetching real-time access and task types for:", currentUserEmail);
        const [membersRes, accessRes, taskTypesRes] = await Promise.all([
          mdImpexAccessService.getAllMembers(),
          mdImpexAccessService.getAllPersonAccess(),
          taskTypeService.getTaskTypes()
        ]);

        if (taskTypesRes.success && taskTypesRes.data) {
          setTaskTypesFromApi(taskTypesRes.data);
        }

        if (membersRes.success && membersRes.data) {
          const allMembers = (membersRes.data || []).map((m: any) => ({
            ...m,
            id: String(m.id || m._id || '')
          }));

          console.log("[MdImpexAddTaskModal] allMembers count:", allMembers.length);
          const currentNormalized = normalizeEmail(currentUserEmail);
          const isAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin' || currentUserRole === 'troubleshoot_manager';

          // Find my info to check role
          const myInfo = allMembers.find((m: any) => normalizeEmail(m.email) === currentNormalized);
          const myRoleNormalized = myInfo?.role?.toLowerCase()?.replace(/\s+/g, '_') || '';

          // Find my specific access config
          const myAccess = accessRes.success && accessRes.data
            ? accessRes.data.find((item: any) => normalizeEmail(item.assignedToEmail) === currentNormalized)
            : null;

          console.log("[MdImpexAddTaskModal] Context:", {
            email: currentUserEmail,
            role: currentUserRole,
            isAdmin,
            foundInMembers: !!myInfo,
            myAccess: !!myAccess,
            roleNormalized: myRoleNormalized
          });

          // MD Manager and Admin typically get full access, but we now respect 
          // specific restrictions if a record exists in MD Access
          if (myRoleNormalized === 'md_manager' || isAdmin) {
            setHasSpecificAccess(!!myAccess);
            let members = [];
            
            if (myAccess && myAccess.allowedAssignees && myAccess.allowedAssignees.length > 0) {
              // Respect specific allowed assignees if configured
              const allowedIds = new Set(myAccess.allowedAssignees.map((id: any) => String(id)));
              members = allMembers.filter((m: any) =>
                allowedIds.has(String(m.id)) || normalizeEmail(m.email) === currentNormalized
              ).map((m: any) => ({
                id: m.id,
                email: m.email,
                name: m.name
              }));
            } else {
              // Default to all members if no specific configuration
              members = allMembers.map((m: any) => ({
                id: m.id,
                email: m.email,
                name: m.name
              }));
            }
            
            setAllowedUsers(members);
            
            // Handle Task Types
            setAllowedTaskTypes(myAccess?.allowedTaskTypes || []);

            // Handle Brands
            if (myAccess?.allowedBrands && myAccess.allowedBrands.length > 0) {
              setAllowedBrands(myAccess.allowedBrands);
            } else {
              setAllowedBrands([]); // Empty means show all
            }
            
            // Auto-select the first user if none selected
            if (!newTask.assignedTo && members.length > 0) {
              onChange('assignedTo', members[0].email);
            }
          } else if (myAccess) {
            // Respect configured access for non-MD managers
            setHasSpecificAccess(true);
            // Map allowedAssignees (IDs) back to full user objects
            const allowedIds = new Set((myAccess.allowedAssignees || []).map((id: any) => String(id)));
            const filteredMembers = allMembers.filter((m: any) =>
              allowedIds.has(String(m.id)) || normalizeEmail(m.email) === currentNormalized
            );

            const members = filteredMembers.map((m: any) => ({
              id: m.id,
              email: m.email,
              name: m.name
            }));
            setAllowedUsers(members);
            setAllowedTaskTypes(myAccess.allowedTaskTypes || []);
            setAllowedBrands(myAccess.allowedBrands || []);

            // Auto-select the first user if none selected
            if (!newTask.assignedTo && members.length > 0) {
              onChange('assignedTo', members[0].email);
            }
          } else {
            // Fallback: Show only self if no configuration exists for non-admin/non-manager
            setHasSpecificAccess(false);
            const me = allMembers.filter((m: any) => normalizeEmail(m.email) === currentNormalized);
            const members = me.map((m: any) => ({
              id: m.id,
              email: m.email,
              name: m.name
            }));
            setAllowedUsers(members);
            setAllowedTaskTypes([]);

            // Auto-select self if none selected
            if (!newTask.assignedTo && members.length > 0) {
              onChange('assignedTo', members[0].email);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching access for MD Impex:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchAccessData();
  }, [open, currentUserEmail, currentUserRole]); // Removed onChange and newTask dependencies to prevent loop

  // Filter task types - show all for managers, but filtered for others
  const filteredTaskTypes = useMemo(() => {
    // Normalize and deduplicate available task types from props
    // We keep a map to preserve the preferred casing
    const normalizedToOriginal = new Map<string, string>();
    const uniqueAvailable: string[] = [];
    const seenAvailable = new Set<string>();

    // 1. First, populate map with names from official API task types for best casing (matches MD Access page)
    taskTypesFromApi.forEach((t) => {
      const name = String(t?.name || '').trim();
      if (!name) return;
      const norm = name.toLowerCase();
      if (!normalizedToOriginal.has(norm)) {
        normalizedToOriginal.set(norm, name);
      }
    });

    // 2. Then add names from availableTaskTypesForNewTask prop if not already mapped
    availableTaskTypesForNewTask.forEach((t) => {
      if (!t) return;
      const original = String(t).trim();
      const norm = original.toLowerCase();
      
      if (!normalizedToOriginal.has(norm)) {
        normalizedToOriginal.set(norm, original);
      }
      
      if (!seenAvailable.has(norm)) {
        seenAvailable.add(norm);
        uniqueAvailable.push(normalizedToOriginal.get(norm) || original);
      }
    });

    // If we have specific allowed task types assigned in MD Access, show ONLY those
    // This now applies to all users if they have a specific access record
    if (allowedTaskTypes.length > 0) {
      const result: string[] = [];
      const seenResult = new Set<string>();
      
      allowedTaskTypes.forEach((allowed) => {
        const norm = String(allowed).toLowerCase().trim();
        if (norm && !seenResult.has(norm)) {
          seenResult.add(norm);
          // Prefer original casing from provided map (official task types or props)
          const displayValue = normalizedToOriginal.get(norm) || String(allowed).trim();
          result.push(displayValue);
        }
      });
      return result;
    }

    // Default: Return deduplicated list of all available types
    return uniqueAvailable;
  }, [allowedTaskTypes, availableTaskTypesForNewTask, taskTypesFromApi]);

  // Auto-select Brand if only one is available (runs when brand options change)
  useEffect(() => {
    if (!open || !newTask.companyName) return;
    const brands = getAvailableBrandOptions();
    if (brands.length === 1 && !newTask.brand) {
      onChange('brand', brands[0].value);
    }
  }, [open, newTask.companyName]); // Removed newTask.brand, getAvailableBrandOptions, onChange

  const handleFormSubmit = () => {
    // Sync local title to parent before submit
    onChange('title', localTitle);
    onSubmit();
  };

  const filteredEmailUsers = useMemo(() => {
    const q = emailSearch.trim().toLowerCase();
    if (!q) return allowedUsers;
    return allowedUsers.filter((u) => {
      const name = String(u?.name || '').trim().toLowerCase();
      const email = String(u?.email || '').trim().toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [allowedUsers, emailSearch]);

  const filteredBrandOptions = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return brandOptions;
    return brandOptions.filter((opt) => {
      const value = String(opt?.value || '').trim().toLowerCase();
      const label = String(opt?.label || '').trim().toLowerCase();
      return value.includes(q) || label.includes(q);
    });
  }, [brandOptions, brandSearch]);

  useEffect(() => {
    if (!emailOpen && !brandOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (emailOpen && emailDropdownRef.current && target && !emailDropdownRef.current.contains(target)) {
        setEmailOpen(false);
      }
      if (brandOpen && brandDropdownRef.current && target && !brandDropdownRef.current.contains(target)) {
        setBrandOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [emailOpen, brandOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <PlusCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">MD Impex: Create New Task</h3>
                <p className="text-sm text-indigo-100 mt-0.5">Show MD Impex users and types based on access records</p>
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
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.title ? 'border-red-500' : 'border-gray-300'}`}
                value={localTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleTitleBlur}
              />
              {formErrors.title && <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Due Date *</label>
              <input
                type="date"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.dueDate ? 'border-red-500' : 'border-gray-300'}`}
                value={newTask.dueDate}
                onChange={(e) => onChange('dueDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              {formErrors.dueDate && <p className="mt-1 text-sm text-red-600">{formErrors.dueDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Email Address *</label>
              <div ref={emailDropdownRef} className="relative">
                <button
                  type="button"
                  disabled={loadingUsers}
                  onClick={() => setEmailOpen((v) => !v)}
                  className={`w-full px-4 py-3 text-sm border rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.assignedTo ? 'border-red-500' : 'border-gray-300'} ${loadingUsers ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
                >
                  {newTask.assignedTo
                    ? (() => {
                        const u = allowedUsers.find((x) => String(x?.email || '') === String(newTask.assignedTo || ''));
                        if (!u) return String(newTask.assignedTo || '').trim();
                        const name = String(u?.name || '').trim();
                        const email = String(u?.email || '').trim();
                        return name ? `${name} (${email})` : email;
                      })()
                    : (loadingUsers ? 'Loading members...' : 'Select email address')}
                </button>

                {emailOpen && !loadingUsers && (
                  <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={emailSearch}
                        onChange={(e) => {
                          setEmailSearch(e.target.value);
                          setEmailOpen(true);
                        }}
                        placeholder="Search email or name"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56">
                      {filteredEmailUsers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No results</div>
                      ) : (
                        <List
                          height={Math.min(filteredEmailUsers.length * 40, 224)}
                          itemCount={filteredEmailUsers.length}
                          itemSize={40}
                          width="100%"
                        >
                          {({ index, style }: { index: number; style: React.CSSProperties }) => {
                            const user = filteredEmailUsers[index];
                            if (!user) return null;
                            const name = String(user.name || '').trim();
                            const email = String(user.email || '').trim();
                            const label = name ? `${name} (${email})` : email;
                            
                            return (
                              <button
                                style={style}
                                type="button"
                                onClick={() => {
                                  onChange('assignedTo', email);
                                  setEmailOpen(false);
                                }}
                                className="w-full text-left px-4 text-sm hover:bg-indigo-50 flex items-center"
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
              {!loadingUsers && allowedUsers.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">No MD Impex members found.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Company *</label>
              <select
                value={newTask.companyName}
                onChange={(e) => onChange('companyName', e.target.value)}
                className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.companyName ? 'border-red-500' : 'border-gray-300'}`}
                disabled={true}
              >
                {companyOptions.length === 0 ? (
                  <option value="">No companies available</option>
                ) : (
                  <>
                    {companyOptions.map((company) => (
                      <option key={company} value={company}>{String(company || '').trim()}</option>
                    ))}
                  </>
                )}
              </select>
              {formErrors.companyName && <p className="mt-1 text-sm text-red-600">{formErrors.companyName}</p>}
            </div>

            {/* Brand Field */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Brand</label>
              <div ref={brandDropdownRef} className="relative">
                <button
                  type="button"
                  disabled={!newTask.companyName}
                  onClick={() => {
                    if (!newTask.companyName) return;
                    setBrandOpen((v) => !v);
                  }}
                  className={`w-full px-4 py-3 text-sm border rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${!newTask.companyName ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white'} border-gray-300`}
                >
                  {newTask.brand
                    ? (brandOptions.find((x) => String(x?.value || '') === String(newTask.brand || ''))?.label || String(newTask.brand || '').trim())
                    : 'Select a brand'}
                </button>

                {brandOpen && newTask.companyName && (
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
                    <div className="max-h-56">
                      {filteredBrandOptions.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No results</div>
                      ) : (
                        <List
                          height={Math.min(filteredBrandOptions.length * 40, 224)}
                          itemCount={filteredBrandOptions.length}
                          itemSize={40}
                          width="100%"
                        >
                          {({ index, style }: { index: number; style: React.CSSProperties }) => {
                            const opt = filteredBrandOptions[index];
                            if (!opt) return null;
                            
                            return (
                              <button
                                style={style}
                                type="button"
                                onClick={() => {
                                  onChange('brand', String(opt.value || '').trim());
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
              {!newTask.companyName && (
                <p className="mt-1 text-[10px] text-gray-500 italic">Select a company first</p>
              )}
            </div>

            {/* Task Type Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900">Task Type</label>
                {canBulkAddTaskTypes && (
                  <button
                    type="button"
                    onClick={onBulkAddTaskTypes}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg"
                  >
                    + Bulk Add
                  </button>
                )}
              </div>
              <select
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newTask.taskType}
                onChange={(e) => onChange('taskType', e.target.value)}
              >
                <option value="">Select a task type</option>
                {filteredTaskTypes.map((typeName) => (
                  <option key={String(typeName)} value={String(typeName || '').trim()}>
                    {String(typeName || '').trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">Priority</label>
            <div className="flex gap-4">
              {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange('priority', p)}
                  className={`flex-1 py-3 text-sm font-medium rounded-xl border transition-all ${
                    newTask.priority === p
                      ? p === 'high'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : p === 'medium'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                      : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            {formErrors.priority && <p className="mt-1 text-sm text-red-600">{formErrors.priority}</p>}
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
              onClick={handleFormSubmit}
              disabled={isSubmitting || allowedUsers.length === 0}
              className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl ${isSubmitting || allowedUsers.length === 0
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'}`}
            >
              {isSubmitting ? 'Creating Task...' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MdImpexAddTaskModal;
