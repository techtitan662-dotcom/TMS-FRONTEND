import { Edit, X } from 'lucide-react';
import * as React from 'react';
import mdImpexAccessService from '../../Services/MdImpexAccess.services';
import { taskTypeService } from '../../Services/TaskType.service';
import type { Task, TaskPriority, TaskStatus, UserType } from '../../Types/Types';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

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

const normalizeMdEmail = (value: unknown): string => {
    const raw = (value == null ? "" : String(value)).trim().toLowerCase();
    if (!raw) return "";
    const marker = ".deleted.";
    const idx = raw.indexOf(marker);
    const base = idx === -1 ? raw : raw.slice(0, idx).trim();
    return base;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeRoleKey = (v: unknown) => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
const normalizeCompanyKey = (v: unknown) => String(v || '').trim().toLowerCase().replace(/\s+/g, '');

const MdImpexEditTaskModal = ({
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
    const [mdMembers, setMdMembers] = React.useState<UserType[]>([]);
    const [mdAllowedTaskTypes, setMdAllowedTaskTypes] = React.useState<string[]>([]);
    const [mdAllowedBrands, setMdAllowedBrands] = React.useState<string[]>([]);
    const [loadingAccess, setLoadingAccess] = React.useState(false);
    const [taskTypesFromApi, setTaskTypesFromApi] = React.useState<any[]>([]);

    const myRoleKey = React.useMemo(() => normalizeRoleKey((currentUser as any)?.role || ''), [currentUser]);
    const myId = React.useMemo(() => String((currentUser as any)?.id || (currentUser as any)?._id || '').trim(), [currentUser]);
    const myManagerId = React.useMemo(() => String((currentUser as any)?.managerId || '').trim(), [currentUser]);

    const filteredBrands = React.useMemo(() => {
        const allOptions = getEditFormBrandOptions();
        if (!open) return allOptions;
        if (mdAllowedBrands.length === 0) return allOptions;

        return allOptions.filter(opt =>
            mdAllowedBrands.some(allowed =>
                allowed.toLowerCase().trim() === opt.label.toLowerCase().trim()
            )
        );
    }, [open, mdAllowedBrands, getEditFormBrandOptions]);

    const filteredTaskTypes = React.useMemo(() => {
        if (!open) return [];
        const allTypes = availableTaskTypesForEditTask || [];

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

        allTypes.forEach((t) => {
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

        if (mdAllowedTaskTypes.length > 0) {
            const result: string[] = [];
            const seenResult = new Set<string>();

            mdAllowedTaskTypes.forEach((allowed) => {
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
    }, [open, mdAllowedTaskTypes, availableTaskTypesForEditTask, taskTypesFromApi]);

    const filteredUsers = React.useMemo(() => {
        if (!open || !editingTask) return [];
        if (mdMembers.length > 0) return mdMembers;

        const list = Array.isArray(users) ? users : [];
        const taskCompanyKey = normalizeCompanyKey(editingTask?.companyName || (editingTask as any)?.company);
        const myIdStr = myId;
        const myMgrId = myManagerId;

        const allowedPairIds = (() => {
            const ids = new Set<string>();
            if (myIdStr) ids.add(myIdStr);
            if (myRoleKey === 'rm') {
                list.forEach((u: any) => {
                    const uid = String(u?.id || u?._id || '').trim();
                    const urole = normalizeRoleKey(u?.role);
                    const mgr = String(u?.managerId || '').trim();
                    if (uid && urole === 'am' && mgr && myIdStr && mgr === myIdStr) ids.add(uid);
                });
            }
            if (myRoleKey === 'am' && myMgrId) {
                ids.add(myMgrId);
            }
            return ids;
        })();

        if (myRoleKey === 'sbm' && taskCompanyKey === 'speedecom') {
            return list.filter((u: any) => normalizeCompanyKey(u?.companyName || u?.company) === 'speedecom');
        }

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
    }, [open, editingTask, mdMembers, users, myRoleKey, myId, myManagerId]);

    React.useEffect(() => {
        const fetchAccessData = async () => {
            if (!open || !currentUserEmail) return;

            setLoadingAccess(true);
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

                    const currentNormalized = normalizeMdEmail(currentUserEmail);
                    const myInfo = allMembers.find((m: any) => normalizeMdEmail(m.email) === currentNormalized);
                    const myRoleNormalized = myInfo?.role?.toLowerCase()?.replace(/\s+/g, '_') || '';

                    const myAccess = accessRes.success && accessRes.data
                        ? accessRes.data.find((item: any) => normalizeMdEmail(item.assignedToEmail) === currentNormalized)
                        : null;

                    if (myAccess && myAccess.allowedAssignees && myAccess.allowedAssignees.length > 0) {
                        const allowedIds = new Set((myAccess.allowedAssignees || []).map((id: any) => String(id)));
                        const filteredMembers = allMembers.filter((m: any) =>
                            allowedIds.has(String(m.id)) || normalizeMdEmail(m.email) === currentNormalized
                        );

                        setMdMembers(filteredMembers.map((m: any) => ({
                            id: m.id,
                            email: m.email,
                            name: m.name
                        })));

                        setMdAllowedTaskTypes(myAccess.allowedTaskTypes || []);
                        setMdAllowedBrands(myAccess.allowedBrands || []);
                    } else if (['md_manager', 'admin', 'super_admin', 'troubleshoot_manager', 'manager', 'ob_manager', 'all_manager', 'marketer_manager'].includes(myRoleNormalized)) {
                        setMdMembers(allMembers.map((m: any) => ({
                            id: m.id,
                            email: m.email,
                            name: m.name
                        })));
                        setMdAllowedTaskTypes(myAccess?.allowedTaskTypes || []);
                        setMdAllowedBrands(myAccess?.allowedBrands || []);
                    } else {
                        const me = allMembers.filter((m: any) => normalizeMdEmail(m.email) === currentNormalized);
                        setMdMembers(me.map((m: any) => ({
                            id: m.id,
                            email: m.email,
                            name: m.name
                        })));
                        setMdAllowedTaskTypes([]);
                        setMdAllowedBrands([]);
                    }
                }
            } catch (error) {
                console.error("Error fetching access for MD Impex Edit:", error);
            } finally {
                setLoadingAccess(false);
            }
        };

        fetchAccessData();
    }, [open, currentUserEmail]);

    if (!open || !editingTask) return null;

    const taskAssigner = normalizeEmail(editingTask.assignedBy || (editingTask as any).assignedByUser?.email || '');
    const taskAssignee = normalizeEmail(editingTask.assignedTo || (editingTask as any).assignedToUser?.email || '');
    const currentEmail = normalizeEmail(currentUserEmail);
    const isAssigner = currentEmail === taskAssigner;
    const isAssignee = currentEmail === taskAssignee;
    const isSpeedEcom = normalizeCompanyKey(editingTask?.companyName || (editingTask as any)?.company) === 'speedecom';
    const shouldDisableAllForSpeedEcom = isSpeedEcom && isAssignee && !isAssigner;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header - Compact */}
                <div className={`px-4 py-3 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 bg-[${theme.primary}] rounded-lg`}>
                                <Edit className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Edit Task</h3>
                                <p className="text-[10px] text-gray-500 mt-0.5">Update task details below</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Form Content - Compact */}
                <div className="px-4 py-4 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Task Title *</label>
                                <input
                                    type="text"
                                    placeholder="What needs to be done?"
                                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.title ? 'border-red-500' : 'border-gray-200'}`}
                                    value={editFormData.title}
                                    onChange={(e) => onChange('title', e.target.value)}
                                    disabled={shouldDisableAllForSpeedEcom}
                                />
                                {editFormErrors.title && <p className="mt-1 text-[10px] text-red-600">{editFormErrors.title}</p>}
                            </div>

                            {/* Assigned To */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Assigned To *</label>
                                <select
                                    value={editFormData.assignedTo}
                                    onChange={(e) => onChange('assignedTo', e.target.value)}
                                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.assignedTo ? 'border-red-500' : 'border-gray-200'}`}
                                    disabled={shouldDisableAllForSpeedEcom || loadingAccess}
                                >
                                    <option value="">{loadingAccess ? 'Loading...' : 'Select user'}</option>
                                    {filteredUsers.map((user) => (
                                        <option key={String(user.id || user.email)} value={String(user.email || '')}>
                                            {user.name?.trim() ? `${user.name.trim()} (${user.email.trim()})` : (user.email || '').trim()}
                                        </option>
                                    ))}
                                </select>
                                {editFormErrors.assignedTo && <p className="mt-1 text-[10px] text-red-600">{editFormErrors.assignedTo}</p>}
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={editFormData.status}
                                    onChange={(e) => onChange('status', e.target.value as TaskStatus)}
                                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={shouldDisableAllForSpeedEcom}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            {/* Brand */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Brand</label>
                                <select
                                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={editFormData?.brand}
                                    onChange={(e) => onChange('brand', e.target.value)}
                                    disabled={!editFormData.companyName || shouldDisableAllForSpeedEcom || filteredBrands.length === 0}
                                >
                                    <option value="">Select brand</option>
                                    {filteredBrands.map((opt) => (
                                        <option key={opt?.value} value={opt?.value}>
                                            {opt?.label}
                                        </option>
                                    ))}
                                </select>
                                {!editFormData.companyName && (
                                    <p className="mt-0.5 text-[9px] text-gray-400">Select a company first to see brands</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Due Date */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Due Date *</label>
                                <input
                                    type="date"
                                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.dueDate ? 'border-red-500' : 'border-gray-200'}`}
                                    value={editFormData.dueDate}
                                    onChange={(e) => onChange('dueDate', e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    disabled={shouldDisableAllForSpeedEcom || Boolean(disableDueDate)}
                                />
                                {editFormErrors.dueDate && <p className="mt-1 text-[10px] text-red-600">{editFormErrors.dueDate}</p>}
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Priority</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {['low', 'medium', 'high'].map((priority) => (
                                        <button
                                            key={priority}
                                            type="button"
                                            onClick={() => onChange('priority', priority)}
                                            disabled={shouldDisableAllForSpeedEcom}
                                            className={`py-1.5 text-[10px] font-medium rounded-lg border transition-all ${editFormData.priority === (priority as TaskPriority)
                                                ? priority === 'high'
                                                    ? 'bg-rose-100 text-rose-700 border-rose-200'
                                                    : priority === 'medium'
                                                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                        : 'bg-blue-100 text-blue-700 border-blue-200'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                                } ${shouldDisableAllForSpeedEcom ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Task Type */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Task Type</label>
                                <select
                                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={editFormData.taskType}
                                    onChange={(e) => onChange('taskType', e.target.value)}
                                    disabled={shouldDisableAllForSpeedEcom || filteredTaskTypes.length === 0}
                                >
                                    <option value="">Select task type</option>
                                    {filteredTaskTypes.map((typeName) => (
                                        <option key={String(typeName)} value={String(typeName || '').trim()}>
                                            {String(typeName || '').trim()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Company */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Company</label>
                                <select
                                    value={editFormData.companyName}
                                    onChange={(e) => onChange('companyName', e.target.value)}
                                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.companyName ? 'border-red-500' : 'border-gray-200'}`}
                                    disabled={availableCompanies.length === 1 || shouldDisableAllForSpeedEcom}
                                >
                                    <option value="">Select company</option>
                                    {availableCompanies.map((company) => (
                                        <option key={company} value={company}>
                                            {String(company || '').trim()}
                                        </option>
                                    ))}
                                </select>
                            </div>


                        </div>
                    </div>
                </div>

                {/* Footer - Compact */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={isSubmitting || shouldDisableAllForSpeedEcom}
                            className={`px-3 py-1.5 text-[11px] font-medium text-white rounded-lg transition-colors ${isSubmitting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : `bg-[${theme.primary}] hover:bg-[${theme.primaryDark}]`
                                }`}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-1.5">
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                                    Updating...
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <Edit className="h-3 w-3" />
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

export default MdImpexEditTaskModal;