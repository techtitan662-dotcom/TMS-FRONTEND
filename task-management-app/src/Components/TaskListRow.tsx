import React, { memo } from 'react';
import { 
    CheckCircle, 
    Edit, 
    Trash2, 
    Bell 
} from 'lucide-react';
import type { Task, UserType } from '../Types/Types';
import { stripDeletedEmailSuffix, isOverdueFn } from '../utils/dashboardUtils';

interface TaskListRowProps {
    task: Task;
    users: UserType[];
    onDelete: (id: string) => void;
    onEdit: (task: Task) => void;
    onSendReminder: (task: Task) => void;
    formatBrand: (task: Task) => string;
    formatDate: (date: string) => string;
    canEditTask: (task: Task) => boolean;
    canEditDeleteTask: (task: Task) => boolean;
    canSendReminderForTask: (task: Task) => boolean;
    sendingReminder: boolean;
}

const TaskListRow: React.FC<TaskListRowProps> = ({
    task,
    users,
    onDelete,
    onEdit,
    onSendReminder,
    formatBrand,
    formatDate,
    canEditTask,
    canEditDeleteTask,
    canSendReminderForTask,
    sendingReminder
}) => {
    const getAssignedUserInfo = () => {
        const assignedTo = task.assignedTo;
        const assignedToUser = task.assignedToUser;
        
        if (assignedToUser && typeof assignedToUser === 'object') {
            return assignedToUser;
        }
        
        const email = typeof assignedTo === 'string' ? assignedTo : assignedTo?.email;
        if (!email) return { email: '', name: '' };
        
        const found = users.find(u => u.email === email);
        return found || { email, name: '' };
    };

    const assignedInfo = getAssignedUserInfo();
    const displayAssignedTo = assignedInfo.name || (assignedInfo.email ? stripDeletedEmailSuffix(assignedInfo.email).split('@')[0] : '') || assignedInfo.email || '—';

    return (
        <>
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${task.status === 'completed' ? 'bg-emerald-500' : task.status === 'in-progress' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div>
                        <div className="text-sm font-medium text-black group-hover:text-[#3b82f6] transition-colors">
                            {task.title}
                        </div>
                        {task.completedApproval && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-[#3b82f6] mt-0.5">
                                <CheckCircle className="h-2 w-2" />
                                Approved by Admin
                            </span>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3">
                <span className={`text-xs font-medium ${task.status === 'completed' ? 'text-emerald-600' : task.status === 'in-progress' ? 'text-amber-600' : 'text-blue-600'}`}>
                    {task.status === 'completed' ? 'Done' : task.status === 'in-progress' ? 'In Progress' : 'Pending'}
                </span>
            </td>
            <td className="px-4 py-3">
                <span className={`text-xs font-medium ${task.priority === 'high' ? 'text-rose-600' : task.priority === 'medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {task.priority || 'medium'}
                </span>
            </td>
            <td className={`px-4 py-3 text-xs ${isOverdueFn(task.dueDate, task.status) ? 'text-rose-600 font-medium' : 'text-gray-600'}`}>
                {task.dueDate ? formatDate(task.dueDate) : '—'}
            </td>
            <td className="px-4 py-3 text-xs text-gray-600">
                {formatBrand(task) || '—'}
            </td>
            <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[150px]">
                {displayAssignedTo}
            </td>
            <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                    {canEditTask(task) && !task?.completedApproval && (
                        <button
                            type="button"
                            onClick={() => onEdit(task)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-all duration-200"
                            title="Edit"
                        >
                            <Edit className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {canEditDeleteTask(task) && (
                        <button
                            type="button"
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
                </div>
            </td>
        </>
    );
};

export default memo(TaskListRow);
