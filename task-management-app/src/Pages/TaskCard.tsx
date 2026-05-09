import React, { useState } from 'react';
import {
    Edit,
    Trash2,
    AlertTriangle,
    CheckCircle,
    Clock,
    User,
    Building,
    Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Task, UserType } from '../Types/Types';

interface TaskCardProps {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    getUserById: (userId: string | number | Partial<UserType> | { id: string }) => UserType | undefined;
    formatDate: (dateString: string) => string;
    getTaskBorderColor: (task: Task) => string;
    isOverdue: (dueDate: string, status: string) => boolean;
    currentUser: UserType;
}

const TaskCard: React.FC<TaskCardProps> = ({
    task,
    onEdit,
    onDelete,
    getUserById,
    formatDate,
    getTaskBorderColor,
    isOverdue,
    currentUser
}) => {
    const [isDeleting, setIsDeleting] = useState(false);
    
    // ✅ FIXED: Add null checks for currentUser
    const safeCurrentUser = currentUser || {
        id: 'unknown',
        name: 'User',
        email: 'unknown@example.com',
        role: 'user',
    };

    const assignedUser = task.assignedToUser || getUserById(task.assignedTo);


    const assignedToName = assignedUser?.name ||
        (typeof task.assignedTo === 'string' ? task.assignedTo.split('@')[0] || 'User' : 'Unknown User');

    // Get Assigned By Name (assignedBy can be string | UserType | undefined)
    let assignedByName = 'Unknown';
    let assignedByEmail = 'Unknown';

    if (task.assignedBy) {
        if (typeof task.assignedBy === 'object') {
            assignedByName = task.assignedBy.name || 'User';
            assignedByEmail = task.assignedBy.email;
        } else {
            const user = getUserById(task.assignedBy);
            if (user) {
                assignedByName = user.name || user.email.split('@')[0] || 'User';
                assignedByEmail = user.email;
            } else {
                assignedByName = task.assignedBy.split('@')[0] || 'User';
                assignedByEmail = task.assignedBy;
            }
        }
    }

    // ✅ FIXED: Check permissions with null checks
    const normalizeEmailSafe = (v: any): string => {
        if (!v) return '';
        if (typeof v === 'string') return v.trim().toLowerCase();
        if (typeof v === 'object' && v !== null) {
            const email = (v as any).email;
            if (typeof email === 'string') return email.trim().toLowerCase();
        }
        return String(v).trim().toLowerCase();
    };

    const myEmail = normalizeEmailSafe(safeCurrentUser.email);
    const assignedByEmailForCheck = normalizeEmailSafe((task as any)?.assignedBy) || normalizeEmailSafe((task as any)?.assignedByUser?.email);
    const isCreator = Boolean(myEmail && assignedByEmailForCheck && myEmail === assignedByEmailForCheck);

    const role = String((safeCurrentUser as any)?.role || '').trim().toLowerCase();
    const isAdmin = role === 'admin' || role === 'super_admin';
    const isManagerOrMd = role === 'manager' || role === 'md_manager';
    const canDeleteByRole = isManagerOrMd || isAdmin;

    // Delete Task
    const handleDeleteTask = async () => {
        if (!task.id) {
            toast.error('Cannot delete: Task ID is missing');
            return;
        }

        if (!canDeleteByRole) {
            toast.error('Only MD/Manager can delete tasks');
            return;
        }

        if (!isCreator && !isAdmin) {
            toast.error('Only the task creator can delete this task');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this task?')) {
            return;
        }

        setIsDeleting(true);

        try {
            await onDelete(task.id);
        } catch (error) {
            console.error('Error in handleDeleteTask:', error);
            toast.error('Failed to delete task. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div
            className={`bg-white p-4 shadow rounded-lg border-l-4 ${getTaskBorderColor(
                task
            )} hover:shadow-md transition-shadow duration-200 relative ${isDeleting ? 'opacity-50' : ''
                }`}
        >
            {isDeleting && (
                <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}

            <div className="flex justify-between items-start relative">
                <div className="flex-1">
                    {/* Title + Status + Priority */}
                    <div className="flex items-center gap-2 mb-2">
                        {task.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : task.status === 'in-progress' ? (
                            <Clock className="h-4 w-4 text-blue-500" />
                        ) : task.status === 'overdue' ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}

                        <h3 className="text-lg font-semibold text-gray-900">
                            {task.title || 'Untitled Task'}
                        </h3>

                        <span
                            className={`text-xs px-2 py-1 rounded-full ${task.priority === 'high'
                                ? 'text-red-600 bg-red-100'
                                : task.priority === 'medium'
                                    ? 'text-yellow-600 bg-yellow-100'
                                    : 'text-green-600 bg-green-100'
                                }`}
                        >
                            {task.priority}
                        </span>
                    </div>

                    {/* Task Type and Company */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {task.taskType && (
                            <span className="inline-flex items-center text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                <Tag className="h-3 w-3 mr-1" />
                                {task.taskType}
                            </span>
                        )}

                        {task.companyName && task.companyName !== 'company name' && (
                            <span className="inline-flex items-center text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                <Building className="h-3 w-3 mr-1" />
                                {task.companyName}
                            </span>
                        )}

                        {task.brand && (
                            <span className="inline-flex items-center text-xs px-2 py-1 bg-indigo-100 text-indigo-800 rounded">
                                <Tag className="h-3 w-3 mr-1" />
                                {task.brand}
                            </span>
                        )}
                    </div>

                    {/* Assigned To & Assigned By */}
                    <div className="flex flex-col gap-1 mb-3">
                        {/* Assigned To */}
                        <div className="text-xs text-blue-600 flex items-center">
                            <User className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">
                                Assigned To: {assignedToName}
                            </span>
                        </div>

                        {/* Assigned By */}
                        <div className="text-xs text-gray-500 flex items-center">
                            <User className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">
                                Assigned By: {assignedByName} ({assignedByEmail})
                            </span>
                        </div>
                    </div>

                    {/* Due Date + Status */}
                    <div className="flex items-center justify-between">
                        <p
                            className={`text-xs ${isOverdue(task.dueDate, task.status)
                                ? 'text-red-600 font-medium'
                                : 'text-gray-500'
                                }`}
                        >
                            Due: {formatDate(task.dueDate)}
                            {isOverdue(task.dueDate, task.status) && ' (Overdue)'}
                        </p>

                        <span
                            className={`text-xs px-2 py-1 rounded-full ${task.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : task.status === 'in-progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : task.status === 'overdue'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                }`}
                        >
                            {task.status.replace('-', ' ')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isCreator && (
                        <button
                            onClick={() => onEdit(task)}
                            className="p-1 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors duration-200"
                            title="Edit Task"
                            disabled={isDeleting}
                        >
                            <Edit className="h-4 w-4" />
                        </button>
                    )}

                    {canDeleteByRole && (isCreator || isAdmin) && (
                        <button
                            onClick={handleDeleteTask}
                            className="p-1 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors duration-200"
                            title="Delete Task"
                            disabled={isDeleting}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskCard;