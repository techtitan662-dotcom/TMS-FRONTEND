import { Edit, X } from 'lucide-react';

import * as React from 'react';
import { FixedSizeList as List } from 'react-window';

import type { Task, TaskPriority, TaskStatus, UserType } from '../../Types/Types';

interface EditTaskForm {
  id: string;
  title: string;
  assignedTo: string;
  dueDate: string;
  priority: TaskPriority;
  taskType: string;
  companyName: string;
  brand: string;
  status: TaskStatus;
}

type FormErrors = Record<string, string>;

type Props = {
  open: boolean;
  editingTask: Task | null;
  onClose: () => void;

  editFormData: EditTaskForm;
  editFormErrors: FormErrors;
  onChange: (field: keyof EditTaskForm, value: string) => void;

  users: UserType[];
  availableTaskTypesForEditTask: string[];
  availableCompanies: string[];
  getEditFormBrandOptions: () => Array<{ value: string; label: string }>;

  onSubmit: () => void;
  isSubmitting: boolean;

  disableDueDate?: boolean;
  currentUserEmail: string;
  currentUser?: UserType;
};

const EditTaskModal = ({
  open,
  editingTask,
  onClose,
  editFormData,
  editFormErrors,
  onChange,
  users,
  availableTaskTypesForEditTask,
  availableCompanies,
  getEditFormBrandOptions,
  onSubmit,
  isSubmitting,
  disableDueDate,
  currentUserEmail,
  currentUser,
}: Props) => {
  const assignDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const brandDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignSearch, setAssignSearch] = React.useState('');
  const [brandOpen, setBrandOpen] = React.useState(false);
  const [brandSearch, setBrandSearch] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setAssignOpen(false);
      setBrandOpen(false);
      setAssignSearch('');
      setBrandSearch('');
    }
  }, [open]);

  React.useEffect(() => {
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

  if (!open || !editingTask) return null;

  const normalizeEmail = (email: string) => email.trim().toLowerCase();
  const normalizeRoleKey = (v: unknown) => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const normalizeCompanyKey = (v: unknown) => String(v || '').trim().toLowerCase().replace(/\s+/g, '');
  const taskAssigner = normalizeEmail(editingTask.assignedBy || (editingTask as any).assignedByUser?.email || '');
  const taskAssignee = normalizeEmail(editingTask.assignedTo || (editingTask as any).assignedToUser?.email || '');
  const currentEmail = normalizeEmail(currentUserEmail);

  const isAssigner = currentEmail === taskAssigner;
  const isAssignee = currentEmail === taskAssignee;
  const isSpeedEcom = editingTask?.companyName?.toLowerCase().replace(/\s+/g, '') === 'speedecom';

  const myRoleKey = normalizeRoleKey((currentUser as any)?.role || '');
  const myId = String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();
  const myManagerId = String((currentUser as any)?.managerId || '').trim();

  const allowedPairIds = (() => {
    const ids = new Set<string>();
    if (myId) ids.add(myId);
    const list = Array.isArray(users) ? users : [];
    if (myRoleKey === 'rm') {
      list.forEach((u: any) => {
        const uid = String(u?.id || u?._id || '').trim();
        const urole = normalizeRoleKey(u?.role);
        const mgr = String(u?.managerId || '').trim();
        if (uid && urole === 'am' && mgr && myId && mgr === myId) ids.add(uid);
      });
    }
    if (myRoleKey === 'am') {
      if (myManagerId) ids.add(myManagerId);
    }
    return ids;
  })();

  const baseFilteredUsers = React.useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    const taskCompanyKey = normalizeCompanyKey(editingTask?.companyName || (editingTask as any)?.company);

    // SBM should see all Speed E Com users for Speed E Com tasks
    if (myRoleKey === 'sbm' && taskCompanyKey === 'speedecom') {
      return list.filter((u: any) => normalizeCompanyKey(u?.companyName || u?.company) === 'speedecom');
    }

    // RM/AM should see only pair + sbm/admin/super_admin for the same company as task
    if (myRoleKey === 'rm' || myRoleKey === 'am') {
      return list.filter((u: any) => {
        const uid = String(u?.id || u?._id || '').trim();
        const urole = normalizeRoleKey(u?.role);
        const uCompanyKey = normalizeCompanyKey(u?.companyName || u?.company);
        if (taskCompanyKey && (!uCompanyKey || uCompanyKey !== taskCompanyKey)) return false;
        if (urole === 'sbm' || urole === 'admin' || urole === 'super_admin') return true;
        return Boolean(uid && allowedPairIds.has(uid));
      });
    }

    return list;
  }, [allowedPairIds, editingTask, myRoleKey, normalizeCompanyKey, normalizeRoleKey, users]);

  const filteredUsers = React.useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return baseFilteredUsers;
    return baseFilteredUsers.filter((u) => {
      const name = String(u?.name || '').trim().toLowerCase();
      const email = String(u?.email || '').trim().toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [baseFilteredUsers, assignSearch]);

  const filteredBrands = React.useMemo(() => {
    const opts = getEditFormBrandOptions() || [];
    const q = brandSearch.trim().toLowerCase();
    if (!q) return opts;
    return opts.filter(opt => {
      const v = String(opt?.value || '').trim().toLowerCase();
      const l = String(opt?.label || '').trim().toLowerCase();
      return v.includes(q) || l.includes(q);
    });
  }, [getEditFormBrandOptions, brandSearch]);

  // Only disable all fields for Speed E Com tasks when the user is the ASSIGNEE (not the assigner)
  const shouldDisableAllForSpeedEcom = isSpeedEcom && isAssignee && !isAssigner;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Edit className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Edit Task</h3>
                <p className="text-sm text-blue-100 mt-0.5">Update task details below</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-white hover:bg-white/20 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Task Title *</label>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.title ? 'border-red-500' : 'border-gray-300'}`}
                  value={editFormData.title}
                  onChange={(e) => onChange('title', e.target.value)}
                  disabled={shouldDisableAllForSpeedEcom}
                />
                {editFormErrors.title && <p className="mt-1 text-sm text-red-600">{editFormErrors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Assign To *</label>
                <div ref={assignDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => !shouldDisableAllForSpeedEcom && setAssignOpen((v) => !v)}
                    disabled={shouldDisableAllForSpeedEcom}
                    className={`w-full px-4 py-3 text-sm border rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.assignedTo ? 'border-red-500' : 'border-gray-300'} ${shouldDisableAllForSpeedEcom ? 'bg-gray-50 opacity-50 cursor-not-allowed' : 'bg-white'}`}
                  >
                    {editFormData.assignedTo
                      ? (() => {
                          const u = baseFilteredUsers.find((x) => String(x?.email || '') === String(editFormData.assignedTo || ''));
                          if (!u) return String(editFormData.assignedTo || '').trim();
                          const name = String(u?.name || '').trim();
                          const email = String(u?.email || '').trim();
                          return name ? `${name} (${email})` : email;
                        })()
                      : 'Select team member'}
                  </button>

                  {assignOpen && !shouldDisableAllForSpeedEcom && (
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
                      <div className="max-h-56">
                        {filteredUsers.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">No results</div>
                        ) : (
                          <List
                            height={Math.min(filteredUsers.length * 40, 224)}
                            itemCount={filteredUsers.length}
                            itemSize={40}
                            width="100%"
                          >
                            {({ index, style }: { index: number; style: React.CSSProperties }) => {
                              const user = filteredUsers[index];
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
                {editFormErrors.assignedTo && <p className="mt-1 text-sm text-red-600">{editFormErrors.assignedTo}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => onChange('status', e.target.value as TaskStatus)}
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Due Date *</label>
                <input
                  type="date"
                  className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.dueDate ? 'border-red-500' : 'border-gray-300'}`}
                  value={editFormData.dueDate}
                  onChange={(e) => onChange('dueDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={shouldDisableAllForSpeedEcom || Boolean(disableDueDate)}
                />
                {editFormErrors.dueDate && <p className="mt-1 text-sm text-red-600">{editFormErrors.dueDate}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['low', 'medium', 'high'].map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => onChange('priority', priority)}
                        disabled={shouldDisableAllForSpeedEcom}
                        className={`py-2.5 text-xs font-medium rounded-lg border ${editFormData.priority === (priority as TaskPriority)
                          ? priority === 'high'
                            ? 'bg-rose-100 text-rose-700 border-rose-300'
                            : priority === 'medium'
                              ? 'bg-amber-100 text-amber-700 border-amber-300'
                              : 'bg-blue-100 text-blue-700 border-blue-300'
                          : 'bg-gray-100 text-gray-600 border-gray-300'} ${shouldDisableAllForSpeedEcom ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Task Type</label>
                  <select
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editFormData.taskType}
                    onChange={(e) => onChange('taskType', e.target.value)}
                    disabled={shouldDisableAllForSpeedEcom}
                  >
                    {availableTaskTypesForEditTask.map((typeName) => (
                      <option key={typeName} value={typeName.toLowerCase()}>
                        {typeName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Company</label>
                <select
                  value={editFormData.companyName}
                  onChange={(e) => onChange('companyName', e.target.value)}
                  className={`w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.companyName ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={availableCompanies.length === 1 || shouldDisableAllForSpeedEcom}
                >
                  <option value="">Select a company</option>
                  {availableCompanies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Brand</label>
                <div ref={brandDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (!editFormData.companyName || shouldDisableAllForSpeedEcom) return;
                      setBrandOpen((v) => !v);
                    }}
                    disabled={!editFormData.companyName || shouldDisableAllForSpeedEcom}
                    className={`w-full px-4 py-3 text-sm border rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 ${(!editFormData.companyName || shouldDisableAllForSpeedEcom) ? 'bg-gray-50 opacity-50 cursor-not-allowed text-gray-400' : 'bg-white'}`}
                  >
                    {editFormData.brand
                      ? (getEditFormBrandOptions().find((x) => String(x?.value || '') === String(editFormData.brand || ''))?.label || String(editFormData.brand || '').trim())
                      : 'Select a brand'}
                  </button>

                  {brandOpen && editFormData.companyName && !shouldDisableAllForSpeedEcom && (
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
                {!editFormData.companyName && (
                  <p className="mt-1 text-xs text-gray-500">Select a company first to see available brands</p>
                )}
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
              onClick={onSubmit}
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl ${isSubmitting
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Updating Task...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Update Task
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTaskModal;
