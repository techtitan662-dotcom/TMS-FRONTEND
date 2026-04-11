import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, Star, MessageSquare, User, Calendar, Award } from 'lucide-react';

import type { Task, UserType } from '../Types/Types';
import { taskService } from '../Services/Task.services';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

type ReviewStateByTaskId = Record<string, { stars: number; comment: string } | undefined>;

const normalizeEmail = (v: unknown) => String(v || '').trim().toLowerCase();
const normalizeText = (v: unknown) => String(v || '').trim().toLowerCase();

const OtherWorkPage = ({ currentUser, tasks, onRefreshTasks }: { currentUser: UserType; tasks: Task[]; onRefreshTasks: () => Promise<void> | void }) => {
    const myEmail = useMemo(() => normalizeEmail(currentUser?.email), [currentUser?.email]);
    const role = useMemo(() => String((currentUser as any)?.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_'), [currentUser]);

    const isManagerRole = role === 'manager' || role === 'marketer_manager' || role === 'md_manager' || role === 'admin' || role === 'super_admin';
    const isAssistantRole = role === 'assistant' || role === 'sub_assistance';
    const isObManagerRole = role === 'ob_manager';

    const otherWorkTasks = useMemo(() => {
        if (!myEmail) return [];
        return (tasks || []).filter((t: any) => {
            const assignedBy = normalizeEmail(t?.assignedByUser?.email || t?.assignedBy);
            const assignedTo = normalizeEmail(t?.assignedToUser?.email || t?.assignedTo);
            const assignedToRole = normalizeText(t?.assignedToUser?.role);
            const taskTypeKey = normalizeText(t?.taskType || t?.type);
            if (taskTypeKey !== 'other work') return false;

            if (isManagerRole) {
                // Admins and MD Managers see everything for "Other Work"
                if (role === 'super_admin' || role === 'admin' || role === 'md_manager') return true;
                
                // Other managers only see what they assigned
                if (assignedBy !== myEmail) return false;
                return true;
            }

            if (isObManagerRole) {
                return assignedToRole === 'assistant' || assignedToRole === 'assistance' || assignedToRole === 'sub_assistance';
            }

            if (isAssistantRole) {
                if (assignedTo !== myEmail) return false;
                return true;
            }

            return true;
        });
    }, [tasks, myEmail, isManagerRole, isObManagerRole, isAssistantRole]);

    const summary = useMemo(() => {
        const list = otherWorkTasks || [];
        const done = list.filter((t: any) => String(t?.status || '').toLowerCase() === 'completed').length;
        const reviewed = list.filter((t: any) => (t as any)?.reviewStars != null).length;
        return { total: list.length, done, reviewed };
    }, [otherWorkTasks]);

    const [saving, setSaving] = useState(false);
    const [reviewState, setReviewState] = useState<ReviewStateByTaskId>({});

    const setStars = (taskId: string, stars: number) => {
        setReviewState((prev) => ({
            ...prev,
            [taskId]: { stars, comment: prev[taskId]?.comment || '' }
        }));
    };

    const setComment = (taskId: string, comment: string) => {
        setReviewState((prev) => ({
            ...prev,
            [taskId]: { stars: prev[taskId]?.stars || 5, comment }
        }));
    };

    const submitReview = async (taskId: string) => {
        const state = reviewState[taskId];
        const stars = Number(state?.stars ?? 5);
        const comment = String(state?.comment ?? '').trim();

        if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
            toast.error('Stars must be between 1 and 5');
            return;
        }

        setSaving(true);
        try {
            const res = await taskService.submitTaskReview(taskId, { reviewStars: stars, reviewComment: comment });
            if (res.success) {
                toast.success('Review saved');
                await onRefreshTasks();
            } else {
                toast.error(res.message || 'Failed to save review');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save review');
        } finally {
            setSaving(false);
        }
    };

    if (!isManagerRole && !isAssistantRole && !isObManagerRole) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 p-5 shadow-sm`}>
                <h2 className="text-sm font-semibold text-gray-900">Other Work</h2>
                <p className="text-xs text-gray-500 mt-1">Access denied</p>
            </div>
        );
    }

    const StarRating = ({ value, onChange, disabled }: { value: number; onChange: (val: number) => void; disabled?: boolean }) => (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    disabled={disabled}
                    className={`p-0.5 transition-colors ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                    <Star
                        className={`h-3.5 w-3.5 ${star <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                    />
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header Card - Compact */}
            <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4`}>
                <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg bg-[${theme.primaryUltralight}]`}>
                        <ClipboardList className="h-4 w-4 text-[${theme.primary}]" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900">Other Work</h2>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                    {isManagerRole
                        ? 'Tasks assigned by you (Other Work). Add reviews after completion.'
                        : isObManagerRole
                            ? 'Other Work tasks assigned to assistance users.'
                            : 'Your Other Work tasks and the reviews given by managers.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border bg-[${theme.primaryUltralight}] border-[${theme.primaryLight}]/30 text-[${theme.primaryDark}]`}>
                        Total: {summary.total}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full border bg-green-50 border-green-200 text-green-700">
                        Done: {summary.done}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full border bg-blue-50 border-blue-200 text-blue-700">
                        Reviewed: {summary.reviewed}
                    </span>
                </div>
            </div>

            {/* Tasks Table - Compact */}
            <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className={`bg-[${theme.primaryUltralight}]`}>
                            <tr className="text-left text-[11px] font-semibold text-gray-700">
                                <th className="px-3 py-2">Task</th>
                                <th className="px-3 py-2">Assigned By</th>
                                {isObManagerRole && <th className="px-3 py-2">Assignee</th>}
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Review</th>
                                <th className="px-3 py-2 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {otherWorkTasks.map((t: any) => {
                                const taskId = String(t.id || t._id || '');
                                const assignedByEmail = String(t?.assignedByUser?.email || (typeof t.assignedBy === 'string' ? t.assignedBy : t.assignedBy?.email) || '').trim();
                                const status = String(t.status || '').toLowerCase();
                                const isCompleted = status === 'completed';

                                const existingStars = t.reviewStars;
                                const existingComment = t.reviewComment;
                                const reviewedBy = String(t.reviewedByUser?.email || t.reviewedBy || '').trim();
                                const reviewedAt = (t as any).reviewedAt;

                                const state = reviewState[taskId];
                                const stars = Number(state?.stars ?? (existingStars || 5));
                                const comment = String(state?.comment ?? (existingComment || ''));

                                const assigneeEmail = String(t?.assignedToUser?.email || (typeof t.assignedTo === 'string' ? t.assignedTo : t.assignedTo?.email) || '').trim();

                                return (
                                    <tr key={taskId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-3 py-2.5">
                                            <div className="font-semibold text-xs text-gray-900">{t.title}</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                                <Calendar className="h-2.5 w-2.5" />
                                                Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-[11px] text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <User className="h-2.5 w-2.5" />
                                                {assignedByEmail || '—'}
                                            </div>
                                        </td>
                                        {isObManagerRole && (
                                            <td className="px-3 py-2.5 text-[11px] text-gray-600">
                                                {assigneeEmail || '—'}
                                            </td>
                                        )}
                                        <td className="px-3 py-2.5">
                                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                                                isCompleted
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {isManagerRole ? (
                                                <div className="space-y-1.5">
                                                    <StarRating
                                                        value={stars}
                                                        onChange={(val) => setStars(taskId, val)}
                                                        disabled={saving || !isCompleted}
                                                    />
                                                    <div className="relative">
                                                        <MessageSquare className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                                        <input
                                                            value={comment}
                                                            onChange={(e) => setComment(taskId, e.target.value)}
                                                            className="w-full pl-7 pr-2 py-1 border border-gray-200 rounded-lg text-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            placeholder="Comment"
                                                            disabled={saving || !isCompleted}
                                                        />
                                                    </div>
                                                    {!isCompleted && (
                                                        <div className="text-[9px] text-gray-400 flex items-center gap-0.5">
                                                            <Award className="h-2.5 w-2.5" />
                                                            Review allowed after completion
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    {existingStars != null ? (
                                                        <div className="flex items-center gap-1">
                                                            <StarRating value={existingStars} onChange={() => {}} disabled={true} />
                                                            <span className="text-[10px] text-gray-500">({existingStars}/5)</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] text-gray-400">—</span>
                                                    )}
                                                    {existingComment && (
                                                        <div className="text-[10px] text-gray-500 mt-0.5 max-w-[200px] truncate">
                                                            "{existingComment}"
                                                        </div>
                                                    )}
                                                    {(reviewedBy || reviewedAt) && (
                                                        <div className="text-[9px] text-gray-400 mt-0.5">
                                                            {reviewedBy && <span>By: {reviewedBy}</span>}
                                                            {reviewedBy && reviewedAt && ' • '}
                                                            {reviewedAt && <span>{new Date(reviewedAt).toLocaleDateString()}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            {isManagerRole ? (
                                                <button
                                                    type="button"
                                                    className={`px-2.5 py-1 text-[10px] font-medium rounded-lg text-white transition-colors ${
                                                        saving || !isCompleted
                                                            ? 'bg-gray-400 cursor-not-allowed'
                                                            : `bg-[${theme.primary}] hover:bg-[${theme.primaryDark}]`
                                                    }`}
                                                    disabled={saving || !isCompleted}
                                                    onClick={() => submitReview(taskId)}
                                                >
                                                    {saving ? 'Saving...' : 'Save Review'}
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {otherWorkTasks.length === 0 && (
                                <tr>
                                    <td className="px-3 py-8 text-center text-[11px] text-gray-500" colSpan={isObManagerRole ? 6 : 5}>
                                        <div className="flex flex-col items-center gap-1">
                                            <ClipboardList className="h-8 w-8 text-gray-300" />
                                            <p>No tasks found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OtherWorkPage;