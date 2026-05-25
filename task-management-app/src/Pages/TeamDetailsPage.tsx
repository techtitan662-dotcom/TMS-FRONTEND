import React, { useCallback, useMemo, useState } from 'react';
import {
    Search,
    ArrowLeft,
    Calendar,
    History,
    Shield,
    Mail,
    UserCog,
    User,
    Briefcase,
    Activity,
    Edit,
    CheckCircle,
    FileText,
    MessageSquare,
    Tag,
    UserCheck,
} from 'lucide-react';

import type { Task, TaskHistory, UserType } from '../Types/Types';
import toast from 'react-hot-toast';
import { userAvatarUrl } from '../utils/avatar';

// Theme colors matching TeamPage
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

interface TeamDetailsPageProps {
    user: UserType;
    tasks: Task[];
    users: UserType[];
    onBack: () => void;
    onEditUser?: (user: UserType) => void;
    onDeleteUser?: (userId: string) => void;
    onFetchTaskHistory?: (taskId: string) => Promise<TaskHistory[]>;
    isOverdue?: (dueDate: string, status: string) => boolean;
    currentUser?: UserType;
}

const TeamDetailsPage: React.FC<TeamDetailsPageProps> = ({
    user,
    tasks = [],
    users = [],
    onBack,
    onFetchTaskHistory,
    isOverdue = () => false,
}) => {
    const [activeTab, setActiveTab] = useState<'tasks' | 'history'>('tasks');
    const [detailsTab, setDetailsTab] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
    const [taskSearch, setTaskSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [historyByTaskId, setHistoryByTaskId] = useState<Record<string, TaskHistory[]>>({});
    const [historyLoadingByTaskId, setHistoryLoadingByTaskId] = useState<Record<string, boolean>>({});
    const [, setEmailHistory] = useState<any[]>([]);
    const [, setLoadingEmailHistory] = useState(false);
    const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<string | null>(null);

    const normalizeEmailForMatch = useCallback((value: any): string => {
        const raw = (value || '').toString().trim().toLowerCase();
        const idx = raw.indexOf('.deleted.');
        return (idx >= 0 ? raw.slice(0, idx) : raw).trim();
    }, []);

    const emailsMatch = useCallback((a: any, b: any): boolean => {
        const aa = normalizeEmailForMatch(a);
        const bb = normalizeEmailForMatch(b);
        if (!aa || !bb) return false;
        return aa === bb;
    }, [normalizeEmailForMatch]);

    const getTasksForUser = useMemo(() => {
        return (userId: string, userEmail: string) => {
            const targetEmail = normalizeEmailForMatch(userEmail);
            return tasks.filter(task => {
                const assignedTo = (task as any)?.assignedTo;
                if (typeof assignedTo === 'string') {
                    if (assignedTo === userId) return true;
                    if (emailsMatch(assignedTo, targetEmail)) return true;
                }

                if (assignedTo && typeof assignedTo === 'object') {
                    const assignedToId = (assignedTo.id || assignedTo._id || '').toString();
                    const assignedToEmail = (assignedTo.email || '').toString();
                    if (assignedToId && assignedToId === userId) return true;
                    if (assignedToEmail && emailsMatch(assignedToEmail, targetEmail)) return true;
                }

                const assignedToUser = (task as any)?.assignedToUser;
                if (assignedToUser) {
                    const assignedToUserId = (assignedToUser.id || assignedToUser._id || '').toString();
                    const assignedToUserEmail = (assignedToUser.email || '').toString();
                    if (assignedToUserId && assignedToUserId === userId) return true;
                    if (assignedToUserEmail && emailsMatch(assignedToUserEmail, targetEmail)) return true;
                }

                return false;
            });
        };
    }, [emailsMatch, normalizeEmailForMatch, tasks]);

    const getTasksCreatedByUser = useMemo(() => {
        return (userId: string, userEmail: string) => {
            const targetEmail = normalizeEmailForMatch(userEmail);
            return tasks.filter(task => {
                const assignedBy = (task as any)?.assignedBy;
                if (typeof assignedBy === 'string') {
                    if (assignedBy === userId) return true;
                    if (emailsMatch(assignedBy, targetEmail)) return true;
                }

                if (assignedBy && typeof assignedBy === 'object') {
                    const assignedById = (assignedBy.id || assignedBy._id || '').toString();
                    const assignedByEmail = (assignedBy.email || '').toString();
                    if (assignedById && assignedById === userId) return true;
                    if (assignedByEmail && emailsMatch(assignedByEmail, targetEmail)) return true;
                }

                return false;
            });
        };
    }, [tasks]);

    const allTasks = useMemo(() => {
        return getTasksForUser(user.id, user.email);
    }, [getTasksForUser, user]);

    const getUserStats = useMemo(() => {
        const monthFilteredTasks = selectedMonth
            ? allTasks.filter(t => {
                const taskDate = new Date(t.dueDate || t.createdAt || '');
                const [year, month] = selectedMonth.split('-').map(Number);
                return taskDate.getFullYear() === year && taskDate.getMonth() === month - 1;
            })
            : allTasks;
        const assignedTasks = monthFilteredTasks;
        const createdTasks = getTasksCreatedByUser(user.id, user.email);

        const totalAssigned = assignedTasks.length;
        const completed = assignedTasks.filter(t => ((t as any).status || '').toString().toLowerCase() === 'completed').length;
        const overdue = assignedTasks.filter(t => {
            const s = ((t as any).status || '').toString().toLowerCase();
            return s !== 'completed' && isOverdue(t.dueDate, s);
        }).length;
        const pending = assignedTasks.filter(t => {
            const s = ((t as any).status || '').toString().toLowerCase();
            return s !== 'completed' && !isOverdue(t.dueDate, s);
        }).length;

        return {
            totalAssigned,
            completed,
            pending,
            overdue,
            completionRate: totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0,
            tasksCreated: createdTasks.length
        };
    }, [allTasks, getTasksCreatedByUser, user, isOverdue, selectedMonth]);

    const selectedTaskHistory = useMemo(() => {
        if (!selectedTaskForHistory) return [];

        const task = allTasks.find(t => t.id === selectedTaskForHistory);
        if (!task) return [];

        const taskHistory: any[] = [];

        try {
            const due = new Date(task.dueDate);
            const now = new Date();
            const isOverdueStatus = task.status !== 'completed' && !Number.isNaN(due.getTime()) && due < now;
            if (isOverdueStatus) {
                const overdueDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
                const msg = (task.message || task.description || '').toString().trim();
                taskHistory.push({
                    id: `task-overdue-${task.id}`,
                    action: 'overdue',
                    description: `Task overdue (Due: ${due.toLocaleDateString()} • ${overdueDays} day${overdueDays === 1 ? '' : 's'} late)${msg ? ` • ${msg}` : ''}`,
                    taskId: task.id,
                    taskTitle: task.title,
                    taskStatus: task.status,
                    userName: 'System',
                    timestamp: task.dueDate,
                });
            }
        } catch {
            // ignore
        }

        const rawExistingHistory = historyByTaskId[selectedTaskForHistory] || (task as any).history || [];
        const existingHistory = Array.isArray(rawExistingHistory) ? rawExistingHistory : [];

        taskHistory.push(
            ...existingHistory
                .map((hist: any, idx: number) => {
                    const timestamp = hist?.timestamp || hist?.createdAt || hist?.updatedAt;
                    const action = (hist?.action || '').toString().trim();
                    const message = (hist?.message || hist?.description || '').toString().trim();

                    const userName =
                        (hist?.userName || hist?.user?.userName || hist?.user?.name || '').toString().trim();
                    const userEmail =
                        (hist?.userEmail || hist?.user?.userEmail || hist?.user?.email || '').toString().trim();
                    const userRole =
                        (hist?.userRole || hist?.user?.userRole || hist?.user?.role || '').toString().trim();

                    return {
                        ...hist,
                        id: (hist?.id || hist?._id || `history-${task.id}-${idx}`).toString(),
                        action,
                        description: message,
                        userName,
                        userEmail,
                        userRole,
                        timestamp,
                        taskId: task.id,
                        taskTitle: task.title,
                        taskStatus: task.status,
                    };
                })
                .filter((x: any) => {
                    if (!x?.action) return false;
                    if (!x?.timestamp) return false;
                    if (!x?.description) return false;
                    const d = new Date(x.timestamp);
                    if (Number.isNaN(d.getTime())) return false;
                    return true;
                })
        );

        return taskHistory.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }, [selectedTaskForHistory, allTasks, historyByTaskId]);

    const loadTaskHistory = useCallback(async (taskId: string) => {
        if (!onFetchTaskHistory) {
            toast.error('History is not available');
            return;
        }

        if (historyByTaskId[taskId]) {
            setSelectedTaskForHistory(taskId);
            setActiveTab('history');
            return;
        }

        if (historyLoadingByTaskId[taskId]) return;

        setHistoryLoadingByTaskId(prev => ({ ...prev, [taskId]: true }));
        try {
            const history = await onFetchTaskHistory(taskId);
            setHistoryByTaskId(prev => ({ ...prev, [taskId]: history }));
            setSelectedTaskForHistory(taskId);
            setActiveTab('history');
        } catch (error) {
            console.error('Error fetching task history:', error);
            toast.error('Failed to load task history');
        } finally {
            setHistoryLoadingByTaskId(prev => ({ ...prev, [taskId]: false }));
        }
    }, [historyByTaskId, historyLoadingByTaskId, onFetchTaskHistory]);

    const loadEmailHistory = useCallback(async () => {
        setLoadingEmailHistory(true);
        try {
            const mockEmailHistory = [
                {
                    id: '1',
                    type: 'task_assignment',
                    subject: 'New Task Assigned: Website Redesign',
                    recipient: user.email,
                    sender: 'system@company.com',
                    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'delivered',
                    preview: 'You have been assigned a new task...'
                },
                {
                    id: '2',
                    type: 'task_reminder',
                    subject: 'Reminder: Task Due Tomorrow',
                    recipient: user.email,
                    sender: 'system@company.com',
                    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'delivered',
                    preview: 'Your task is due tomorrow...'
                }
            ];
            setEmailHistory(mockEmailHistory);
        } catch (error) {
            console.error('Error fetching email history:', error);
            toast.error('Failed to load email history');
        } finally {
            setLoadingEmailHistory(false);
        }
    }, [user.email]);

    React.useEffect(() => {
        loadEmailHistory();
    }, [loadEmailHistory]);

    const filteredTasks = allTasks
        .filter(t => {
            if (selectedMonth) {
                const taskDate = new Date(t.dueDate || t.createdAt || '');
                const [year, month] = selectedMonth.split('-').map(Number);
                if (taskDate.getFullYear() !== year || taskDate.getMonth() !== month - 1) {
                    return false;
                }
            }
            const term = taskSearch.trim().toLowerCase();
            if (!term) return true;
            const title = (t.title || '').toString().toLowerCase();
            const msg = ((t as any).message || (t as any).description || '').toString().toLowerCase();
            const company = ((t as any).company || (t as any).companyName || '').toString().toLowerCase();
            const brand = ((t as any).brand || '').toString().toLowerCase();
            const type = ((t as any).taskType || (t as any).type || '').toString().toLowerCase();
            return title.includes(term) || msg.includes(term) || company.includes(term) || brand.includes(term) || type.includes(term);
        })
        .filter(t => {
            const status = (t.status || '').toString().toLowerCase();
            const overdue = isOverdue(t.dueDate, status);
            if (detailsTab === 'all') return true;
            if (detailsTab === 'completed') return status === 'completed';
            if (detailsTab === 'overdue') return status !== 'completed' && overdue;
            // pending tab: any non-completed, non-overdue task
            return status !== 'completed' && !overdue;
        })
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const getRoleBadgeColor = (role: string) => {
        const r = (role || '').toLowerCase();
        switch (r) {
            case 'admin':
            case 'super_admin':
                return 'bg-purple-100 text-purple-800 border border-purple-200';
            case 'md_manager':
            case 'ob_manager':
            case 'manager':
                return `bg-[${theme.primaryUltralight}] text-[${theme.primaryDark}] border border-[${theme.primaryLight}]/30`;
            case 'sbm':
            case 'rm':
            case 'am':
                return 'bg-amber-100 text-amber-800 border border-amber-200';
            case 'assistant':
            case 'sub_assistance':
                return 'bg-green-100 text-green-800 border border-green-200';
            case 'sales_manager':
            case 'sales_man':
                return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
            default:
                return 'bg-gray-100 text-gray-800 border border-gray-200';
        }
    };

    const getRoleIcon = (role: string) => {
        const r = (role || '').toLowerCase();
        if (r === 'admin' || r === 'super_admin') return <Shield className="h-3 w-3" />;
        if (r === 'md_manager' || r === 'ob_manager' || r === 'manager') return <UserCog className="h-3 w-3" />;
        if (r === 'sbm' || r === 'rm' || r === 'am') return <Briefcase className="h-3 w-3" />;
        if (r === 'assistant' || r === 'sub_assistance') return <User className="h-3 w-3" />;
        if (r === 'sales_manager' || r === 'sales_man') return <Briefcase className="h-3 w-3" />;
        return <User className="h-3 w-3" />;
    };

    const getActionIcon = useCallback((action: string) => {
        switch (action) {
            case 'task_created': return <FileText className="h-3 w-3" />;
            case 'task_completed': return <CheckCircle className="h-3 w-3" />;
            case 'task_updated': return <Edit className="h-3 w-3" />;
            case 'status_changed': return <Activity className="h-3 w-3" />;
            case 'comment_added': return <MessageSquare className="h-3 w-3" />;
            default: return <Activity className="h-3 w-3" />;
        }
    }, []);

    const formatDateTimeSafe = useCallback((value: any): string => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
    }, []);

    const getActorLabel = useCallback((item: any): string => {
        const name = (item?.userName || '').toString().trim();
        if (name) return name;
        const email = (item?.userEmail || '').toString().trim();
        if (email) return email;
        const nestedName = (item?.user?.userName || item?.user?.name || '').toString().trim();
        if (nestedName) return nestedName;
        const nestedEmail = (item?.user?.userEmail || item?.user?.email || '').toString().trim();
        if (nestedEmail) return nestedEmail;
        return 'System';
    }, []);

    const getActionLabel = useCallback((action: any): string => {
        const a = (action || '').toString().trim();
        if (!a) return '';
        return a.replace(/_/g, ' ');
    }, []);

    const formatDateDMY = useCallback((value: any): string => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-GB');
    }, []);

    const getStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }, []);

    const getPriorityColor = useCallback((priority: string | undefined) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }, []);

    const getAssignedToName = useCallback((task: Task): string => {
        if (task.assignedToUser?.name) return task.assignedToUser.name;
        if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
            return (task.assignedTo as any).name || 'Unknown';
        }
        if (typeof task.assignedTo === 'string') {
            const userMatch = users.find(u => u.email === task.assignedTo || u.id === task.assignedTo);
            if (userMatch) return userMatch.name;
            return task.assignedTo?.split('@')[0] || 'Unknown';
        }
        return 'Unknown';
    }, [users]);

    const getAssignedByName = useCallback((task: Task): string => {
        if ((task as any).assignedByName) return (task as any).assignedByName;
        if (typeof task.assignedBy === 'object' && task.assignedBy !== null) {
            return (task.assignedBy as any).name || 'Unknown';
        }
        if (typeof task.assignedBy === 'string') {
            const userMatch = users.find(u => u.email === task.assignedBy || u.id === task.assignedBy);
            if (userMatch) return userMatch.name;
            return task.assignedBy?.split('@')[0] || 'Unknown';
        }
        return 'Unknown';
    }, [users]);

    const getUserInitials = (name: string | undefined): string => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    };

    const getUserAvatar = (user: UserType, size: 'sm' | 'md' | 'lg' = 'md') => {
        const initials = getUserInitials(user.name);
        const avatarUrl = userAvatarUrl(user);
        const role = (user.role || '').toLowerCase();
        
        let gradient = 'from-gray-600 to-gray-800';
        switch (role) {
            case 'admin':
            case 'super_admin':
                gradient = 'from-purple-600 to-purple-800';
                break;
            case 'md_manager':
            case 'ob_manager':
            case 'manager':
                gradient = `from-[${theme.primaryDark}] to-[${theme.primary}]`;
                break;
            case 'assistant':
            case 'sub_assistance':
                gradient = 'from-green-600 to-green-800';
                break;
            case 'sbm':
            case 'rm':
            case 'am':
                gradient = 'from-amber-600 to-amber-800';
                break;
        }

        const sizeClasses = {
            sm: 'h-8 w-8 text-xs',
            md: 'h-10 w-10 text-sm',
            lg: 'h-12 w-12 text-base'
        };

        return (
            <div className="flex-shrink-0">
                <div className={`rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold ${sizeClasses[size]} overflow-hidden`}>
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={user?.name || 'User'}
                            className="h-full w-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        initials
                    )}
                </div>
            </div>
        );
    };

    const stats = getUserStats;
    const reportingToName =
        user.role?.toLowerCase() === 'assistant'
            ? user.managerId
                ? (users.find(m => m.id === user.managerId || (m as any)._id === user.managerId)?.name || 'Unknown Manager')
                : 'Unassigned'
            : '';

    const getCurrentMonthValue = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    return (
        <div className="space-y-4">
            {/* Back Button */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    Back
                </button>
            </div>

            {/* User Profile Header - Compact */}
            <div className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        {getUserAvatar(user, 'lg')}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-base font-bold text-gray-900 truncate">{user.name}</h2>
                                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-lg flex items-center gap-1 ${getRoleBadgeColor(user.role)}`}>
                                    {getRoleIcon(user.role)}
                                    {user.role || 'User'}
                                </span>
                            </div>
                            <div className="mt-0.5 text-xs text-gray-600 flex items-center gap-1.5 min-w-0">
                                <Mail className="h-3 w-3 text-gray-400" />
                                <span className="truncate">{user.email}</span>
                            </div>
                            {reportingToName && (
                                <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="text-[10px] text-blue-600 mb-0.5">Reporting to:</div>
                                    <div className="text-xs font-medium text-gray-900">{reportingToName}</div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <input
                            type="month"
                            value={selectedMonth || getCurrentMonthValue()}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-2 py-1 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
                        />
                        <div className="text-right">
                            <div className="text-[10px] text-gray-600">Tasks Created</div>
                            <div className="text-sm font-bold text-gray-900">{stats.tasksCreated}</div>
                        </div>
                    </div>
                </div>

                {/* Task Stats Cards - Compact Clickable */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                    <button
                        onClick={() => setDetailsTab('all')}
                        className={`p-2 rounded-lg border text-left transition-all ${detailsTab === 'all' ? `bg-[${theme.primaryUltralight}] border-[${theme.primaryLight}] shadow-sm` : 'bg-blue-50 border-blue-100 hover:border-blue-200'}`}
                    >
                        <div className="text-[10px] font-medium text-blue-700">Total</div>
                        <div className="text-base font-bold text-gray-900 mt-0.5">{stats.totalAssigned}</div>
                    </button>
                    <button
                        onClick={() => setDetailsTab('completed')}
                        className={`p-2 rounded-lg border text-left transition-all ${detailsTab === 'completed' ? 'bg-green-100 border-green-300 shadow-sm' : 'bg-green-50 border-green-100 hover:border-green-200'}`}
                    >
                        <div className="text-[10px] font-medium text-green-700">Done</div>
                        <div className="text-base font-bold text-gray-900 mt-0.5">{stats.completed}</div>
                    </button>
                    <button
                        onClick={() => setDetailsTab('pending')}
                        className={`p-2 rounded-lg border text-left transition-all ${detailsTab === 'pending' ? 'bg-amber-100 border-amber-300 shadow-sm' : 'bg-amber-50 border-amber-100 hover:border-amber-200'}`}
                    >
                        <div className="text-[10px] font-medium text-amber-700">Pend</div>
                        <div className="text-base font-bold text-gray-900 mt-0.5">{stats.pending}</div>
                    </button>
                    <button
                        onClick={() => setDetailsTab('overdue')}
                        className={`p-2 rounded-lg border text-left transition-all ${detailsTab === 'overdue' ? 'bg-red-100 border-red-300 shadow-sm' : 'bg-red-50 border-red-100 hover:border-red-200'}`}
                    >
                        <div className="text-[10px] font-medium text-red-700">Over</div>
                        <div className="text-base font-bold text-gray-900 mt-0.5">{stats.overdue}</div>
                    </button>
                </div>
            </div>

            {/* Tasks/History Section */}
            <div className={`bg-white rounded-lg border border-gray-200 shadow-sm`}>
                <div className="p-4">
                    {activeTab === 'tasks' ? (
                        <div className="w-full">
                            {/* Search Bar */}
                            <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search tasks..."
                                        value={taskSearch}
                                        onChange={(e) => setTaskSearch(e.target.value)}
                                        className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full"
                                    />
                                </div>
                            </div>

                            {/* Tasks Grid - Compact */}
                            {filteredTasks.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {filteredTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-semibold text-sm text-gray-900 line-clamp-1 flex-1">{task.title}</h3>
                                                <button
                                                    onClick={() => loadTaskHistory(task.id)}
                                                    className="text-gray-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded transition-colors"
                                                    title="View History"
                                                >
                                                    <History className="h-3.5 w-3.5" />
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(task.status)}`}>
                                                    {task.status}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getPriorityColor(task.priority || 'low')}`}>
                                                    {task.priority}
                                                </span>
                                                {task.taskType && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 flex items-center gap-0.5">
                                                        <Tag className="h-2.5 w-2.5" />
                                                        {task.taskType}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-auto pt-2 border-t border-gray-100">
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-1 text-gray-600">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>{formatDateDMY(task.dueDate)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-gray-600">
                                                        <UserCheck className="h-3 w-3" />
                                                        <span className="font-medium text-xs truncate max-w-[80px]">{getAssignedToName(task)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg border border-gray-200 py-12 text-center">
                                    <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                    <h3 className="text-sm font-medium text-gray-900 mb-1">No tasks found</h3>
                                    <p className="text-xs text-gray-500 mb-4">Try adjusting your filters</p>
                                    <button
                                        onClick={() => {
                                            setTaskSearch('');
                                            setDetailsTab('all');
                                        }}
                                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // History Tab - Compact
                        <div>
                            <div className="border-b border-gray-200 pb-3 mb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">Task History</h3>
                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                            {selectedTaskForHistory
                                                ? `History for "${allTasks.find(t => t.id === selectedTaskForHistory)?.title || 'selected task'}"`
                                                : 'Select a task to view its history'
                                            }
                                        </p>
                                    </div>
                                    {selectedTaskForHistory && (
                                        <button
                                            onClick={() => setActiveTab('tasks')}
                                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                                        >
                                            <ArrowLeft className="h-3 w-3" />
                                            Back
                                        </button>
                                    )}
                                </div>
                            </div>

                            {selectedTaskForHistory ? (
                                <>
                                    {/* Task Details - Compact Grid */}
                                    {(() => {
                                        const task = allTasks.find(t => t.id === selectedTaskForHistory);
                                        if (!task) return null;

                                        const now = new Date();
                                        const dueDate = new Date(task.dueDate);
                                        const isOverdueStatus = task.status !== 'completed' && dueDate < now;

                                        return (
                                            <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div className={`bg-[${theme.primaryUltralight}] p-3 rounded-lg border border-[${theme.primaryLight}]/30`}>
                                                    <h4 className="font-semibold text-xs text-gray-900 mb-2 flex items-center gap-1.5">
                                                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                                                        Task Info
                                                    </h4>
                                                    <div className="space-y-1.5 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Title:</span>
                                                            <span className="font-medium text-gray-900 truncate max-w-[150px]">{task.title}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Type:</span>
                                                            <span className="font-medium text-gray-900">{task.taskType || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Brand:</span>
                                                            <span className="font-medium text-gray-900">{(task as any).brand || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                                    <h4 className="font-semibold text-xs text-gray-900 mb-2 flex items-center gap-1.5">
                                                        <Calendar className="h-3.5 w-3.5 text-green-600" />
                                                        Status
                                                    </h4>
                                                    <div className="space-y-1.5 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Status:</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(task.status)}`}>
                                                                {task.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Priority:</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getPriorityColor(task.priority)}`}>
                                                                {task.priority}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Due:</span>
                                                            <span className={`font-medium ${isOverdueStatus ? 'text-red-600' : 'text-gray-900'}`}>
                                                                {formatDateDMY(task.dueDate)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                                    <h4 className="font-semibold text-xs text-gray-900 mb-2 flex items-center gap-1.5">
                                                        <UserCheck className="h-3.5 w-3.5 text-purple-600" />
                                                        People
                                                    </h4>
                                                    <div className="space-y-1.5 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">By:</span>
                                                            <span className="font-medium text-gray-900 truncate max-w-[120px]">{getAssignedByName(task)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">To:</span>
                                                            <span className="font-medium text-gray-900 truncate max-w-[120px]">{getAssignedToName(task)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Activity Timeline */}
                                    <div className="mb-3 flex items-center justify-between">
                                        <h4 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                            <History className="h-3.5 w-3.5" />
                                            Activity Timeline
                                        </h4>
                                        <div className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                            {selectedTaskHistory.length} {selectedTaskHistory.length === 1 ? 'activity' : 'activities'}
                                        </div>
                                    </div>

                                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                                        {selectedTaskHistory.length > 0 ? (
                                            selectedTaskHistory.map((item, index) => (
                                                <div key={`${item.id}-${index}`} className="relative pl-7">
                                                    <div className="absolute left-0 top-1.5 h-5 w-5 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
                                                        {getActionIcon(item.action)}
                                                    </div>
                                                    {index < selectedTaskHistory.length - 1 && (
                                                        <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-gray-200"></div>
                                                    )}

                                                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-medium text-gray-900">{getActorLabel(item)}</span>
                                                                {getActionLabel(item?.action) && (
                                                                    <>
                                                                        <span className="text-[10px] text-gray-500">•</span>
                                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                                                            item.action === 'task_created' ? 'bg-green-100 text-green-600' : 
                                                                            item.action === 'task_completed' ? 'bg-blue-100 text-blue-600' : 
                                                                            item.action === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                                                                        }`}>
                                                                            {getActionLabel(item?.action)}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {formatDateTimeSafe(item?.timestamp) && (
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar className="h-2.5 w-2.5 text-gray-400" />
                                                                    <span className="text-[10px] text-gray-500">
                                                                        {formatDateTimeSafe(item?.timestamp)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {item.description && (
                                                            <p className="text-[11px] text-gray-700">{item.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8">
                                                <History className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                                <h4 className="text-xs font-medium text-gray-900 mb-1">No activity</h4>
                                                <p className="text-[10px] text-gray-500">No recorded activity yet</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12">
                                    <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <h4 className="text-sm font-medium text-gray-900 mb-1">No Task Selected</h4>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Click "View History" on any task to see its timeline
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('tasks')}
                                        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-1.5 mx-auto transition-colors"
                                    >
                                        <ArrowLeft className="h-3 w-3" />
                                        Back to Tasks
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamDetailsPage;