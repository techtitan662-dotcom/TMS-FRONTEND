import React, { memo, useMemo } from 'react';
import { 
    CheckCircle, 
    UserCheck, 
    User, 
    Layers, 
    CalendarDays, 
    Flag, 
    RotateCcw, 
    Trash2, 
    Bell, 
    MessageSquare 
} from 'lucide-react';
import type { Task, UserType, TaskStatus } from '../Types/Types';
import { stripDeletedEmailSuffix, isOverdueFn } from '../utils/dashboardUtils';

interface TaskGridItemProps {
    task: Task;
    users: UserType[];
    onToggleStatus: (id: string, status: TaskStatus) => Promise<void>;
    onDelete: (id: string) => void;
    onSendReminder: (task: Task) => void;
    onOpenComments: (task: Task) => void;
    formatBrand: (task: Task) => string;
    formatDate: (date: string) => string;
    canMarkTaskDone: (task: Task) => boolean;
    canEditDeleteTask: (task: Task) => boolean;
    canSendReminderForTask: (task: Task) => boolean;
    isSbmUser: boolean;
    sendingReminder: boolean;
}

const TaskGridItem: React.FC<TaskGridItemProps> = ({
    task,
    users,
    onToggleStatus,
    onDelete,
    onSendReminder,
    onOpenComments,
    formatBrand,
    formatDate,
    canMarkTaskDone,
    canEditDeleteTask,
    canSendReminderForTask,
    isSbmUser,
    sendingReminder
}) => {
    // Memoize expensive user lookups
    const assignedUserInfo = useMemo(() => {
        const assignedTo = task.assignedTo;
        const assignedToUser = task.assignedToUser;
        
        if (assignedToUser && typeof assignedToUser === 'object') {
            return assignedToUser;
        }
        
        const email = typeof assignedTo === 'string' ? assignedTo : assignedTo?.email;
        if (!email) return { email: '', name: '' };
        
        const found = users.find(u => u.email === email);
        return found || { email, name: '' };
    }, [task.assignedTo, task.assignedToUser, users]);

    const assignedByInfo = useMemo(() => {
        const assignedByUser = task.assignedByUser;
        const assignedBy = task.assignedBy;
        const rawEmail = (assignedByUser && typeof assignedByUser === 'object' ? assignedByUser?.email : '') ||
                       (typeof assignedBy === 'string' ? assignedBy : (assignedBy as any)?.email) || '';
        const rawName = (assignedByUser && typeof assignedByUser === 'object' ? assignedByUser?.name : '') ||
                      (typeof (assignedBy as any) === 'object' ? (assignedBy as any)?.name : '') || '';
        return { email: rawEmail, name: rawName };
    }, [task.assignedBy, task.assignedByUser]);

    const displayAssignedTo = useMemo(() => 
        assignedUserInfo.name || (assignedUserInfo.email ? stripDeletedEmailSuffix(assignedUserInfo.email).split('@')[0] : '') || assignedUserInfo.email || '—',
        [assignedUserInfo]
    );

    const displayAssignedBy = useMemo(() => 
        assignedByInfo.name || (assignedByInfo.email ? stripDeletedEmailSuffix(assignedByInfo.email).split('@')[0] : '') || assignedByInfo.email || '—',
        [assignedByInfo]
    );

    const isTaskOverdue = useMemo(() => isOverdueFn(task.dueDate, task.status), [task.dueDate, task.status]);

    return (
        <div className="group bg-white rounded-xl border border-gray-100 hover:border-[#3b82f6]/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="p-4">
                {/* Top Row - Status & Type */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-emerald-500' : task.status === 'in-progress' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                        <span className={`text-xs font-medium ${task.status === 'completed' ? 'text-emerald-600' : task.status === 'in-progress' ? 'text-amber-600' : 'text-blue-600'}`}>
                            {task.status === 'completed' ? 'Done' : task.status === 'in-progress' ? 'In Progress' : 'Pending'}
                        </span>
                    </div>
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        {task.taskType}
                    </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-black mb-3 group-hover:text-[#3b82f6] transition-colors line-clamp-2">
                    {task.title}
                    {task.completedApproval && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[9px] bg-[#3b82f6]/10 text-[#3b82f6] px-1.5 py-0.5 rounded-full">
                            <CheckCircle className="h-2.5 w-2.5" />
                            Approved
                        </span>
                    )}
                </h3>

                {/* Key Info */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Assigned to</span>
                        </div>
                        <span className="text-black font-medium truncate max-w-[60%]">
                            {displayAssignedTo}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <User className="h-3.5 w-3.5" />
                            <span>Assigned by</span>
                        </div>
                        <span className="text-black font-medium truncate max-w-[60%]">
                            {displayAssignedBy}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <Layers className="h-3.5 w-3.5" />
                            <span>Brand</span>
                        </div>
                        <span className="text-black font-medium truncate max-w-[60%]">
                            {formatBrand(task) || '—'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span>Due date</span>
                        </div>
                        <span className={`font-medium ${isTaskOverdue ? 'text-rose-600' : 'text-black'}`}>
                            {task.dueDate ? formatDate(task.dueDate) : '—'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <Flag className="h-3.5 w-3.5" />
                            <span>Priority</span>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${task.priority === 'high' ? 'text-rose-600' : task.priority === 'medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {task.priority || 'medium'}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-50">
                    <button
                        onClick={async () => await onToggleStatus(task.id, task.status)}
                        disabled={!canMarkTaskDone(task)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${canMarkTaskDone(task)
                            ? task.status === 'completed'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {task.status === 'completed' ? (
                            <>
                                <RotateCcw className="h-3 w-3" />
                                <span>Mark Pending</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-3 w-3" />
                                <span>Mark Done</span>
                            </>
                        )}
                    </button>

                    {canEditDeleteTask(task) && (
                        <button
                            onClick={() => onDelete(task.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200"
                            title="Delete"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}

                    {canSendReminderForTask(task) && (
                        <button
                            type="button"
                            onClick={() => onSendReminder(task)}
                            disabled={sendingReminder}
                            className={`p-1.5 rounded-lg transition-all duration-200 ${sendingReminder
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-400 hover:text-[#3b82f6] hover:bg-[#3b82f6]/5'
                                }`}
                            title="Send reminder"
                        >
                            <Bell className="h-3.5 w-3.5" />
                        </button>
                    )}

                    {isSbmUser && (
                        <button
                            type="button"
                            onClick={() => onOpenComments(task)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-all duration-200"
                            title="Comments"
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(TaskGridItem);
