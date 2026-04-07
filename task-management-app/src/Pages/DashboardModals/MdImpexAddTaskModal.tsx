import { PlusCircle, X, ChevronDown, Search } from 'lucide-react';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
  getAvailableBrandOptions: () => Array<{ value: string; label: string; ownerId?: string; createdBy?: string }>;
  availableTaskTypesForNewTask: string[];
  onSubmit: () => void;
  isSubmitting: boolean;
  currentUserEmail: string;
  currentUserRole?: string;
  currentUserId?: string;
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
  currentUserId,
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

  const [localTitle, setLocalTitle] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSearch, setEmailSearch] = useState('');
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  const normalizedCurrentUserRole = (currentUserRole || '').toString().trim().toLowerCase();
  const isMdManager = normalizedCurrentUserRole === 'md_manager';
  const MD_IMPEX_COMPANY_NAME = 'MD Impex';
  const companyOptions = [MD_IMPEX_COMPANY_NAME];

  const brandOptions = useMemo(() => {
    const allOptions = getAvailableBrandOptions();

    const isAdmin =
      currentUserRole === 'admin' ||
      currentUserRole === 'super_admin' ||
      currentUserRole === 'troubleshoot_manager';

    // Admin and MD Manager get all brands
    if (isMdManager || isAdmin) return allOptions;

    // No specific access means show all brands
    if (!hasSpecificAccess) return allOptions;

    // Helper functions
    const normalize = (v: unknown) =>
      String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');

    const extractBrandName = (label: unknown) => {
      const raw = String(label || '').trim();
      if (!raw) return '';
      const match = raw.match(/^\d+\s*-\s*(.+)$/);
      return match ? match[1].trim() : raw;
    };

    // ✅ Build brand options from allowedBrands (md_manager sent brands)
    const allowedBrandOptions: Array<{ value: string; label: string }> =
      allowedBrands
        .filter(Boolean)
        .map((brand) => ({ value: brand.trim(), label: brand.trim() }));

    // ✅ Filter allOptions to user's own added brands
    const userOwnBrandOptions = allOptions.filter((opt) => {
      if (opt.ownerId && currentUserId && String(opt.ownerId) === String(currentUserId)) return true;
      if (opt.createdBy && currentUserId && String(opt.createdBy) === String(currentUserId)) return true;
      if (opt.createdBy && currentUserEmail && String(opt.createdBy) === String(currentUserEmail)) return true;
      return false;
    });

    // ✅ Also filter allOptions that match allowedBrands (md_manager sent)
    const allowedNormalizedSet = new Set(
      allowedBrands.map((b) => normalize(b)).filter(Boolean)
    );
    const allowedExtractedSet = new Set(
      allowedBrands.map((b) => normalize(extractBrandName(b))).filter(Boolean)
    );

    const matchedFromAll = allOptions.filter((opt) => {
      const valueNorm = normalize(opt?.value);
      const labelNorm = normalize(opt?.label);
      const extractedValue = normalize(extractBrandName(opt?.value));
      const extractedLabel = normalize(extractBrandName(opt?.label));

      return (
        (valueNorm && allowedNormalizedSet.has(valueNorm)) ||
        (labelNorm && allowedNormalizedSet.has(labelNorm)) ||
        (extractedValue && allowedNormalizedSet.has(extractedValue)) ||
        (extractedLabel && allowedNormalizedSet.has(extractedLabel)) ||
        (extractedValue && allowedExtractedSet.has(extractedValue)) ||
        (extractedLabel && allowedExtractedSet.has(extractedLabel))
      );
    });

    // ✅ Merge all three sources: user's own brands + matched from allOptions + md_manager sent brands
    // Deduplicate by normalized value
    const merged = [...userOwnBrandOptions, ...matchedFromAll, ...allowedBrandOptions];
    const seen = new Set<string>();
    return merged.filter((opt) => {
      const key = normalize(opt.value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [getAvailableBrandOptions, allowedBrands, isMdManager, currentUserRole, hasSpecificAccess, currentUserId, currentUserEmail]);

  useEffect(() => {
    if (open) {
      setLocalTitle(newTask.title);
    }
  }, [open, newTask.title]);

  const handleTitleChange = useCallback((value: string) => {
    setLocalTitle(value);
  }, []);

  const handleTitleBlur = useCallback(() => {
    onChange('title', localTitle);
  }, [localTitle, onChange]);

  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      setAllowedUsers([]);
      setAllowedTaskTypes([]);
      setAllowedBrands([]);
      setLocalTitle('');
      return;
    }
    if (hasInitializedRef.current) return;

    hasInitializedRef.current = true;
    setLocalTitle(newTask.title);

    if (newTask.companyName !== MD_IMPEX_COMPANY_NAME) {
      onChange('companyName', MD_IMPEX_COMPANY_NAME);
    }
  }, [open, MD_IMPEX_COMPANY_NAME, newTask.companyName, newTask.title, onChange]);

  useEffect(() => {
    const fetchAccessData = async () => {
      if (!open || !currentUserEmail) return;

      setLoadingUsers(true);
      try {
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

          const currentNormalized = normalizeEmail(currentUserEmail);
          const isAdmin =
            currentUserRole === 'admin' ||
            currentUserRole === 'super_admin' ||
            currentUserRole === 'troubleshoot_manager';

          const myInfo = allMembers.find((m: any) => normalizeEmail(m.email) === currentNormalized);
          const myRoleNormalized = myInfo?.role?.toLowerCase()?.replace(/\s+/g, '_') || '';

          const myAccess = accessRes.success && accessRes.data
            ? accessRes.data.find((item: any) => normalizeEmail(item.assignedToEmail) === currentNormalized)
            : null;

          if (myRoleNormalized === 'md_manager' || isAdmin) {
            setHasSpecificAccess(!!myAccess);
            let members = [];

            if (myAccess && myAccess.allowedAssignees && myAccess.allowedAssignees.length > 0) {
              const allowedIds = new Set(myAccess.allowedAssignees.map((id: any) => String(id)));
              members = allMembers.filter((m: any) =>
                allowedIds.has(String(m.id)) || normalizeEmail(m.email) === currentNormalized
              ).map((m: any) => ({ id: m.id, email: m.email, name: m.name }));
            } else {
              members = allMembers.map((m: any) => ({ id: m.id, email: m.email, name: m.name }));
            }

            setAllowedUsers(members);
            setAllowedTaskTypes(myAccess?.allowedTaskTypes || []);
            setAllowedBrands(myAccess?.allowedBrands || []);

            if (!newTask.assignedTo && members.length > 0) {
              onChange('assignedTo', members[0].email);
            }
          } else if (myAccess) {
            setHasSpecificAccess(true);
            const allowedIds = new Set((myAccess.allowedAssignees || []).map((id: any) => String(id)));
            const filteredMembers = allMembers.filter((m: any) =>
              allowedIds.has(String(m.id)) || normalizeEmail(m.email) === currentNormalized
            );

            const members = filteredMembers.map((m: any) => ({ id: m.id, email: m.email, name: m.name }));
            setAllowedUsers(members);
            setAllowedTaskTypes(myAccess.allowedTaskTypes || []);
            setAllowedBrands(myAccess.allowedBrands || []);

            if (!newTask.assignedTo && members.length > 0) {
              onChange('assignedTo', members[0].email);
            }
          } else {
            setHasSpecificAccess(false);
            const me = allMembers.filter((m: any) => normalizeEmail(m.email) === currentNormalized);
            const members = me.map((m: any) => ({ id: m.id, email: m.email, name: m.name }));
            setAllowedUsers(members);
            setAllowedTaskTypes([]);
            setAllowedBrands([]);

            if (!newTask.assignedTo && members.length > 0) {
              onChange('assignedTo', members[0].email);
            }
          }
        }
      } catch (error) {
        console.error("❌ [fetchAccessData] Error fetching access for MD Impex:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchAccessData();
  }, [open, currentUserEmail, currentUserRole, newTask.assignedTo, onChange]);

  const filteredTaskTypes = useMemo(() => {
    const normalizedToOriginal = new Map<string, string>();
    const uniqueAvailable: string[] = [];
    const seenAvailable = new Set<string>();

    taskTypesFromApi.forEach((t) => {
      const name = String(t?.name || '').trim();
      if (!name) return;
      const norm = name.toLowerCase();
      if (!normalizedToOriginal.has(norm)) {
        normalizedToOriginal.set(norm, name);
      }
    });

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

    if (allowedTaskTypes.length > 0) {
      const result: string[] = [];
      const seenResult = new Set<string>();

      allowedTaskTypes.forEach((allowed) => {
        const norm = String(allowed).toLowerCase().trim();
        if (norm && !seenResult.has(norm)) {
          seenResult.add(norm);
          const displayValue = normalizedToOriginal.get(norm) || String(allowed).trim();
          result.push(displayValue);
        }
      });
      return result;
    }

    return uniqueAvailable;
  }, [allowedTaskTypes, availableTaskTypesForNewTask, taskTypesFromApi]);

  useEffect(() => {
    if (!open || !newTask.companyName) return;
    const brands = brandOptions;
    if (brands.length === 1 && !newTask.brand) {
      onChange('brand', brands[0].value);
    }
  }, [open, newTask.companyName, brandOptions, newTask.brand, onChange]);

  const handleFormSubmit = () => {
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
                  <h3 className="text-lg font-bold text-white">MD Impex: Create New Task</h3>
                  <p className="text-xs text-white/80 mt-0.5">Show MD Impex users and types based on access records</p>
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
                value={localTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleTitleBlur}
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
                value={newTask.dueDate}
                onChange={(e) => onChange('dueDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              {formErrors.dueDate && <p className="mt-1 text-xs text-red-600">{formErrors.dueDate}</p>}
            </div>

            {/* Assigned To */}
            <div>
              <label className="block text-xs font-medium text-gray-700 no-dark:text-gray-300 mb-1.5">Assign To *</label>
              <div ref={emailDropdownRef} className="relative">
                <button
                  type="button"
                  disabled={loadingUsers}
                  onClick={() => setEmailOpen((v) => !v)}
                  className={`w-full px-3 py-2 text-sm border rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 flex items-center justify-between ${formErrors.assignedTo
                    ? 'border-red-500 bg-red-50 no-dark:bg-red-900/10'
                    : 'border-gray-200 no-dark:border-gray-700 bg-gray-50 no-dark:bg-gray-800/50'
                    } ${loadingUsers ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                >
                  <span className="truncate text-sm">
                    {newTask.assignedTo
                      ? (() => {
                        const u = allowedUsers.find((x) => String(x?.email || '') === String(newTask.assignedTo || ''));
                        if (!u) return String(newTask.assignedTo || '').trim();
                        const name = String(u?.name || '').trim();
                        const email = String(u?.email || '').trim();
                        return name ? `${name} (${email})` : email;
                      })()
                      : (loadingUsers ? 'Loading members...' : 'Select email address')}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${emailOpen ? 'rotate-180' : ''}`} />
                </button>

                {emailOpen && !loadingUsers && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 no-dark:border-gray-700 bg-white no-dark:bg-gray-800 shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100 no-dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={emailSearch}
                          onChange={(e) => {
                            setEmailSearch(e.target.value);
                            setEmailOpen(true);
                          }}
                          placeholder="Search email or name"
                          className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 no-dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white no-dark:bg-gray-800"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-auto">
                      {filteredEmailUsers.length === 0 ? (
                        <div className="px-3 py-2 text-center text-xs text-gray-500">No results</div>
                      ) : (
                        filteredEmailUsers.map((user) => {
                          const name = String(user?.name || '').trim();
                          const email = String(user?.email || '').trim();
                          const label = name ? `${name} (${email})` : email;
                          return (
                            <button
                              key={String(user.id || user.email)}
                              type="button"
                              onClick={() => {
                                onChange('assignedTo', email);
                                setEmailOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-primary-ultralight dark:hover:bg-gray-700 transition-colors"
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
              <label className="block text-xs font-medium text-gray-700 no-dark:text-gray-300 mb-1.5">Company *</label>
              <select
                value={newTask.companyName}
                className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 border-gray-200 no-dark:border-gray-700 bg-gray-50 no-dark:bg-gray-800/50 text-gray-600 cursor-not-allowed"
                disabled={true}
              >
                {companyOptions.map((company) => (
                  <option key={company} value={company}>{String(company || '').trim()}</option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-700 no-dark:text-gray-300">Brand</label>
              </div>
              <div ref={brandDropdownRef} className="relative">
                <button
                  type="button"
                  disabled={!newTask.companyName}
                  onClick={() => {
                    if (!newTask.companyName) return;
                    setBrandOpen((v) => !v);
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 flex items-center justify-between ${formErrors.brand
                    ? 'border-red-500 bg-red-50 no-dark:bg-red-900/10'
                    : 'border-gray-200 no-dark:border-gray-700 bg-gray-50 no-dark:bg-gray-800/50'
                    } ${!newTask.companyName ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className="truncate text-sm">
                    {newTask.brand
                      ? (brandOptions.find((x) => String(x?.value || '') === String(newTask.brand || ''))?.label || String(newTask.brand || '').trim())
                      : 'Select a brand'}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${brandOpen ? 'rotate-180' : ''}`} />
                </button>

                {brandOpen && newTask.companyName && (
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
                      {filteredBrandOptions.length === 0 ? (
                        <div className="px-3 py-2 text-center text-xs text-gray-500">
                          No brands available
                        </div>
                      ) : (
                        filteredBrandOptions.map((opt) => (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onClick={() => {
                              onChange('brand', String(opt.value || '').trim());
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
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 ${filteredTaskTypes.length === 0
                  ? 'border-gray-200 no-dark:border-gray-700 bg-gray-50 no-dark:bg-gray-800/50 text-gray-400'
                  : 'border-gray-200 no-dark:border-gray-700 bg-gray-50 no-dark:bg-gray-800/50'
                  }`}
                value={newTask.taskType}
                onChange={(e) => onChange('taskType', e.target.value)}
                disabled={filteredTaskTypes.length === 0}
              >
                {filteredTaskTypes.length === 0 ? (
                  <option value="">No task types available</option>
                ) : (
                  <>
                    <option value="" disabled>Select task type</option>
                    {filteredTaskTypes.map((typeName) => (
                      <option key={typeName} value={typeName.toLowerCase()}>
                        {typeName}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {filteredTaskTypes.length === 0 && canBulkAddTaskTypes && (
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
                    onClick={() => onChange('priority', priority as TaskPriority)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all duration-200 ${newTask.priority === (priority as TaskPriority)
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
              onClick={handleFormSubmit}
              disabled={isSubmitting || allowedUsers.length === 0}
              className={`px-4 py-2 text-xs font-medium text-white rounded-xl transition-all duration-200 ${isSubmitting || allowedUsers.length === 0
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

export default MdImpexAddTaskModal;