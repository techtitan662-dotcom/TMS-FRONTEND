import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserCheck, Calendar, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import type { Task, UserType } from '../Types/Types';
import { routepath } from '../Routes/route';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

type Props = {
    task: Task | null;
    currentUser: UserType;
    users: UserType[];
    onSubmit: (payload: { assignedTo: string; dueDate: string }) => Promise<boolean>;
    isSubmitting: boolean;
};

export default function SpeedEcomReassignPage({ task, currentUser, users, onSubmit, isSubmitting }: Props) {
    const navigate = useNavigate();

    const normalizeText = useCallback((v: unknown) => String(v || '').trim().toLowerCase(), []);
    const normalizeRoleKey = useCallback((v: unknown) => normalizeText(v).replace(/[\s-]+/g, '_'), [normalizeText]);
    const normalizeCompanyKey = useCallback((v: unknown) => normalizeText(v).replace(/\s+/g, ''), [normalizeText]);

    const currentAssigneeEmail = useMemo(() => {
        const assignedTo: any = (task as any)?.assignedToUser || (task as any)?.assignedTo;
        const email =
            (typeof assignedTo === 'string' && assignedTo.includes('@') ? assignedTo : assignedTo?.email) ||
            '';
        return String(email || '').trim().toLowerCase();
    }, [task]);

    const assignedByEmail = useMemo(() => {
        const assignedBy: any = (task as any)?.assignedByUser || (task as any)?.assignedBy;
        const email =
            (typeof assignedBy === 'string' && assignedBy.includes('@') ? assignedBy : assignedBy?.email) ||
            '';
        return normalizeText(email);
    }, [normalizeText, task]);

    const myEmail = useMemo(() => normalizeText((currentUser as any)?.email), [currentUser, normalizeText]);
    const myRoleKey = useMemo(() => normalizeRoleKey((currentUser as any)?.role), [currentUser, normalizeRoleKey]);
    const myId = useMemo(() => String((currentUser as any)?.id || (currentUser as any)?._id || '').trim(), [currentUser]);
    const myManagerId = useMemo(() => String((currentUser as any)?.managerId || '').trim(), [currentUser]);

    const allowedPairIds = useMemo(() => {
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
    }, [myId, myManagerId, myRoleKey, normalizeRoleKey, users]);

    const canReassign = useMemo(() => {
        if (!task) return false;
        const taskStatusKey = String((task as any)?.status || '').trim().toLowerCase();
        const isTaskCompleted = taskStatusKey === 'completed';
        if (!isTaskCompleted) return false;

        const isCreator = Boolean(myEmail && assignedByEmail && myEmail === assignedByEmail);
        if (isCreator) return true;

        if (myRoleKey !== 'rm' && myRoleKey !== 'am') return false;

        const assignedById = String((task as any)?.assignedByUser?.id || (task as any)?.assignedByUser?._id || '').trim();
        if (assignedById && allowedPairIds.has(assignedById)) return true;

        if (!assignedByEmail) return false;
        const found = (users || []).find((u: any) => normalizeText(u?.email) === assignedByEmail);
        const foundId = String((found as any)?.id || (found as any)?._id || '').trim();
        return Boolean(foundId && allowedPairIds.has(foundId));
    }, [allowedPairIds, assignedByEmail, myEmail, myRoleKey, normalizeText, task, users]);

    const availableUsers = useMemo(() => {
        const SPEED_ECOM_KEY = 'speedecom';
        const list = Array.isArray(users) ? users : [];
        const filtered = list.filter((u: any) => normalizeCompanyKey(u?.companyName || u?.company) === SPEED_ECOM_KEY);
        const restricted = filtered.filter((u: any) => {
            const uid = String(u?.id || u?._id || '').trim();
            const urole = normalizeRoleKey(u?.role);
            if (myRoleKey === 'sbm') return true;
            if (myRoleKey === 'rm' || myRoleKey === 'am') {
                if (urole === 'sbm' || urole === 'admin' || urole === 'super_admin') return true;
                return Boolean(uid && allowedPairIds.has(uid));
            }
            return false;
        });

        const withAssignee = (() => {
            if (!currentAssigneeEmail) return restricted;
            const found = filtered.find((u: any) => normalizeText(u?.email) === currentAssigneeEmail);
            if (!found) return restricted;
            const already = restricted.some((u: any) => normalizeText(u?.email) === currentAssigneeEmail);
            return already ? restricted : [...restricted, found];
        })();

        return withAssignee.sort((a: any, b: any) => String(a?.email || '').localeCompare(String(b?.email || '')));
    }, [allowedPairIds, currentAssigneeEmail, myRoleKey, normalizeCompanyKey, normalizeRoleKey, normalizeText, users]);

    const initialDueDate = useMemo(() => {
        const raw = (task as any)?.dueDate;
        if (!raw) return '';
        try {
            return new Date(raw).toISOString().split('T')[0] || '';
        } catch {
            return '';
        }
    }, [task]);
    const [dueDate, setDueDate] = useState<string>(initialDueDate);
    const [newAssigneeEmail, setNewAssigneeEmail] = useState<string>(() => {
        const current = currentAssigneeEmail;
        if (current) return current;
        const first = (availableUsers || [])[0] as any;
        return normalizeText(first?.email);
    });

    const handleBack = useCallback(() => {
        navigate(routepath.tasks);
    }, [navigate]);

    const handleSubmit = useCallback(async () => {
        if (!task?.id) {
            toast.error('Task not found');
            return;
        }

        if (!canReassign) {
            toast.error('You do not have permission to reassign this task');
            return;
        }

        if (!currentAssigneeEmail) {
            toast.error('Current assignee email not found');
            return;
        }

        if (!newAssigneeEmail) {
            toast.error('Please select a new assignee');
            return;
        }

        if (!dueDate) {
            toast.error('Due date is required');
            return;
        }

        const ok = await onSubmit({ assignedTo: newAssigneeEmail, dueDate });
        if (ok) {
            toast.success('Task reassigned successfully');
            navigate(routepath.tasks);
        }
    }, [canReassign, currentAssigneeEmail, dueDate, navigate, newAssigneeEmail, onSubmit, task?.id]);

    if (!task) {
        return (
            <div className="p-4">
                <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
                        >
                            <ArrowLeft className="h-3 w-3" />
                            Back
                        </button>
                    </div>
                    <div className="text-[11px] text-gray-600">Task not found.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden`}>
                {/* Header - Compact */}
                <div className={`px-4 py-3 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 bg-[${theme.primary}] rounded-lg`}>
                                <UserPlus className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Speed E Com Reassign</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[10px] text-gray-500">Reassign with due date change</p>
                                    {task.status === 'reassigned' && (
                                        <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase bg-blue-100 text-blue-700 rounded-full">
                                            Reassigned
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleBack}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-3 w-3" />
                            Back
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    {/* Task Info Card - Compact */}
                    <div className={`bg-[${theme.primaryUltralight}] rounded-lg p-3 mb-4 border border-[${theme.primaryLight}]/30`}>
                        <div className="text-[11px] font-semibold text-gray-800 mb-0.5">{task.title}</div>
                        <div className="text-[9px] text-gray-500">Task ID: {task.id}</div>
                    </div>

                    {/* Form Fields - Compact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">Current Assignee</label>
                            <div className="relative">
                                <UserCheck className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <select
                                    value={currentAssigneeEmail}
                                    disabled
                                    className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-[11px] text-gray-500"
                                >
                                    <option value={currentAssigneeEmail}>{currentAssigneeEmail || '—'}</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">Reassign To</label>
                            <div className="relative">
                                <UserPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <select
                                    value={newAssigneeEmail}
                                    onChange={(e) => setNewAssigneeEmail(e.target.value)}
                                    disabled={isSubmitting || !canReassign}
                                    className={`w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${!canReassign ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-700'}`}
                                >
                                    <option value="">Select team member</option>
                                    {availableUsers.map((u: any) => (
                                        <option key={String(u?.id || u?._id || u?.email)} value={normalizeText(u?.email)}>
                                            {String(u?.email || '').trim()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {!canReassign && (
                                <p className="mt-1 text-[9px] text-red-500 flex items-center gap-0.5">
                                    <AlertCircle className="h-2.5 w-2.5" />
                                    Only task creator can reassign
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">Due Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    disabled={isSubmitting || !canReassign}
                                    className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-end">
                            <div className={`text-[9px] text-gray-400 flex items-center gap-1 ${!dueDate ? 'text-amber-500' : ''}`}>
                                <Clock className="h-2.5 w-2.5" />
                                {dueDate ? 'New due date selected' : 'Please select a due date'}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons - Compact */}
                    <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="px-3 py-1.5 text-[10px] border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !dueDate || !canReassign}
                            className={`px-3 py-1.5 text-[10px] font-medium rounded-lg text-white transition-colors ${
                                isSubmitting || !dueDate || !canReassign
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : `bg-[${theme.primary}] hover:bg-[${theme.primaryDark}]`
                            }`}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-1.5">
                                    <div className="animate-spin rounded-full h-2.5 w-2.5 border-2 border-white border-t-transparent" />
                                    Saving...
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <UserPlus className="h-3 w-3" />
                                    Reassign & Update
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}