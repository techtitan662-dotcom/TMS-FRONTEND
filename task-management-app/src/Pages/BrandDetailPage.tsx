import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Building,
    Calendar,
    Activity,
    Edit,
    Search,
    UserCheck,
    CheckCircle,
    Loader2,
    Grid,
    List,
    Play,
    Tag,
    MessageSquare,
    History,
    FileText,
    Trash2,
    Clock,
    AlertCircle,
    BarChart3,
    Users,
    CalendarDays
} from 'lucide-react';
import toast from 'react-hot-toast';

import type { Brand, BrandInvite, UserType, Task } from '../Types/Types';
import { taskService } from '../Services/Task.services';
import { brandService } from '../Services/Brand.service';
import { BrandDetailSkeleton } from '../Components/LoadingSkeletons';
import { routepath } from '../Routes/route';

// Color theme
const colors = {
    primary: {
        main: '#1e3a8a',
        light: '#3b82f6',
        ultralight: '#dbeafe'
    }
};

interface BrandDetailPageProps {
    brands?: Brand[];
    currentUser?: UserType;
    isSidebarCollapsed?: boolean;
    brandId?: string;
    onBack?: () => void;
    availableUsers?: UserType[];
    onInviteCollaborator?: (invite: BrandInvite) => void;
    tasks?: Task[];
}

const BrandDetailPage: React.FC<BrandDetailPageProps> = ({
    brands = [],
    currentUser,
    isSidebarCollapsed: _isSidebarCollapsed = false,
    brandId: brandIdProp,
    onBack,
    availableUsers = [],
    tasks: globalTasks = [],
}) => {
    const navigate = useNavigate();
    const accessDeniedRef = React.useRef(false);
    const { brandId: brandIdFromParams } = useParams<{ brandId: string }>();
    const brandId = brandIdProp || brandIdFromParams;

    const [activeTab, setActiveTab] = useState<'tasks' | 'history'>('tasks');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [assigneeFilter] = useState<string>('all');
    const [taskTypeFilter, setTaskTypeFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(globalTasks.length === 0);
    const [brandLoading, setBrandLoading] = useState(true);
    const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<string | null>(null);

    const [historyByTaskId, setHistoryByTaskId] = useState<Record<string, any[]>>({});
    const [, setHistoryLoadingTaskId] = useState<string | null>(null);

    const [localBrand, setLocalBrand] = useState<Brand | null>(null);
    const [tasksFromAPI, setTasksFromAPI] = useState(false);

    const hasAccess = useCallback((moduleId: string) => {
        const perms = (currentUser as any)?.permissions;
        if (!perms || typeof perms !== 'object') return true;
        if (Object.keys(perms).length === 0) return true;
        if (typeof (perms as any)[moduleId] === 'undefined') return true;
        const perm = String((perms as any)[moduleId] || '').toLowerCase();
        return perm !== 'deny';
    }, [currentUser]);

    const canViewBrandPage = useMemo(() => hasAccess('brands_page'), [hasAccess]);

    useEffect(() => {
        if (!currentUser) return;

        if (!canViewBrandPage) {
            if (accessDeniedRef.current) return;
            accessDeniedRef.current = true;
            toast.error('Access denied');
            navigate(routepath.dashboard);
        }
    }, [canViewBrandPage, currentUser, navigate]);

    // Get brand from props or API using brandId
    useEffect(() => {
        setTasks([]);
        setTasksFromAPI(false);
        
        const needsLoading = brands.length === 0 || !brandId;
        setLoading(needsLoading);

        if (brands.length > 0 && brandId) {
            const foundBrand = brands.find(b => b.id === brandId);
            if (foundBrand) {
                setLocalBrand(foundBrand);
                setBrandLoading(false);
                setLoading(false);
            }
        }

        if (brandId) {
            const fetchBrandFromAPI = async () => {
                try {
                    setBrandLoading(true);
                    const res = await brandService.getBrandById(brandId);
                    if (res.success && res.data) {
                        setLocalBrand(res.data);
                        const apiTasks = Array.isArray((res.data as any)?.tasks) ? (res.data as any).tasks : [];
                        if (apiTasks.length > 0) {
                            setTasks(apiTasks);
                            setTasksFromAPI(true);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching brand from API:', error);
                    const backendMsg = (error as any)?.response?.data?.message || (error as any)?.response?.data?.msg;
                    const backendErr = (error as any)?.response?.data?.error;
                    toast.error(backendMsg || backendErr || 'Failed to load brand details');
                } finally {
                    setBrandLoading(false);
                }
            };

            fetchBrandFromAPI();
        } else {
            setBrandLoading(false);
        }
    }, [brands, brandId]);

    const getAssignedByName = useCallback((task: Task): string => {
        if ((task as any).assignedByName) {
            return (task as any).assignedByName;
        }

        if (typeof task.assignedBy === 'object' && task.assignedBy !== null) {
            return (task.assignedBy as any).name || 'Unknown';
        }

        if (typeof task.assignedBy === 'string') {
            const user = availableUsers.find(u => u.email === task.assignedBy || u.id === task.assignedBy);
            if (user) return user.name;
            return task.assignedBy?.split('@')[0] || 'Unknown';
        }

        return 'Unknown';
    }, [availableUsers]);

    const getAssignedToName = useCallback((task: Task): string => {
        if (task.assignedToUser?.name) {
            return task.assignedToUser.name;
        }

        if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
            return (task.assignedTo as any).name || 'Unknown';
        }

        if (typeof task.assignedTo === 'string') {
            const user = availableUsers.find(u => u.email === task.assignedTo || u.id === task.assignedTo);
            if (user) return user.name;
            return task.assignedTo?.split('@')[0] || 'Unknown';
        }

        return 'Unknown';
    }, [availableUsers]);

    const formatDateTimeSafe = useCallback((value: any): string => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        const datePart = d.toLocaleDateString();
        const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${datePart} at ${timePart}`;
    }, []);

    const brandHistory = useMemo(() => {
        const raw = (localBrand as any)?.history;
        const list = Array.isArray(raw) ? raw : [];
        return list
            .map((h: any, idx: number) => {
                const id = String(h?.id || h?._id || `${String(localBrand?.id || 'brand')}-${idx}`);
                const timestamp = h?.timestamp || h?.performedAt || h?.createdAt;
                return {
                    ...h,
                    id,
                    timestamp,
                };
            })
            .sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    }, [localBrand]);

    const getActorLabel = useCallback((item: any): string => {
        const name = (item?.userName || '').toString().trim();
        if (name) return name;
        const email = (item?.userEmail || '').toString().trim();
        if (email) return email;
        const userId = (item?.userId || '').toString().trim();
        if (userId) return userId;
        return 'System';
    }, []);

    const getActionLabel = useCallback((action: any): string => {
        const a = (action || '').toString().trim();
        if (!a) return '';
        return a.replace(/_/g, ' ');
    }, []);

    const getHistoryDescription = useCallback((item: any): string => {
        const desc = (item?.description || item?.message || '').toString().trim();
        const additional = item?.additionalData;
        if (!additional || typeof additional !== 'object') return desc;

        const parts: string[] = [];
        const field = additional?.field || additional?.changedField || additional?.key;
        const from = additional?.from ?? additional?.oldValue;
        const to = additional?.to ?? additional?.newValue;

        if (field && (from !== undefined || to !== undefined)) {
            parts.push(`${String(field)}: ${from ?? ''} → ${to ?? ''}`.trim());
        }
        if (additional?.comment) parts.push(`Comment: ${String(additional.comment)}`);
        if (additional?.reason) parts.push(`Reason: ${String(additional.reason)}`);

        const extra = parts.filter(Boolean).join(' | ');
        if (!extra) return desc;
        return desc ? `${desc} (${extra})` : extra;
    }, []);

    // Fetch brand tasks
    useEffect(() => {
        if (!localBrand) {
            setTasks([]);
            setLoading(false);
            return;
        }

        if (globalTasks.length > 0 && !tasksFromAPI) {
            const brandTasks = globalTasks.filter(task =>
                String(task.brandId) === String(localBrand.id) ||
                (task.brand === localBrand.name && (task.companyName || (task as any).company) === localBrand.company)
            );
            setTasks(brandTasks);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            if (!tasksFromAPI) {
                const brandTasks = globalTasks.filter(task =>
                    String(task.brandId) === String(localBrand.id) ||
                    (task.brand === localBrand.name && (task.companyName || (task as any).company) === localBrand.company)
                );
                setTasks(brandTasks);
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, [localBrand, globalTasks, tasksFromAPI]);

    // Fetch full task history on demand
    useEffect(() => {
        const taskId = selectedTaskForHistory;
        if (!taskId) return;

        if (Array.isArray(historyByTaskId[taskId]) && historyByTaskId[taskId].length > 0) {
            return;
        }

        let cancelled = false;
        const fetchHistory = async () => {
            try {
                setHistoryLoadingTaskId(taskId);
                const res = await taskService.getTaskHistory(taskId);
                if (cancelled) return;

                if (res.success) {
                    setHistoryByTaskId(prev => ({
                        ...prev,
                        [taskId]: Array.isArray(res.data) ? res.data : []
                    }));
                } else {
                    toast.error(res.message || 'Failed to fetch history');
                }
            } catch (err: any) {
                if (cancelled) return;
                toast.error(err?.response?.data?.message || err?.message || 'Failed to fetch history');
            } finally {
                if (!cancelled) setHistoryLoadingTaskId(null);
            }
        };

        fetchHistory();
        return () => {
            cancelled = true;
        };
    }, [selectedTaskForHistory, historyByTaskId]);

    // Calculate brand statistics
    const brandStats = useMemo(() => {
        if (!localBrand) {
            return {
                totalTasks: 0,
                completedTasks: 0,
                pendingTasks: 0,
                inProgressTasks: 0,
                overdueTasks: 0,
                highPriority: 0,
                mediumPriority: 0,
                lowPriority: 0,
            };
        }

        const brandTasks = tasks.filter(task =>
            String(task.brandId) === String(localBrand.id) ||
            (task.brand === localBrand.name && (task.companyName || task.company) === localBrand.company)
        );

        return {
            totalTasks: brandTasks.length,
            completedTasks: brandTasks.filter(t => t.status === 'completed').length,
            pendingTasks: brandTasks.filter(t => t.status === 'pending').length,
            inProgressTasks: brandTasks.filter(t => t.status === 'in-progress').length,
            overdueTasks: brandTasks.filter(t => {
                if (t.status === 'completed') return false;
                return new Date(t.dueDate) < new Date();
            }).length,
            highPriority: brandTasks.filter(t => t.priority === 'high').length,
            mediumPriority: brandTasks.filter(t => t.priority === 'medium').length,
            lowPriority: brandTasks.filter(t => t.priority === 'low').length,
        };
    }, [localBrand, tasks]);

    // Filter tasks
    const filteredTasks = useMemo(() => {
        if (!localBrand) return [];

        return tasks.filter(task => {
            if (String(task.brandId) !== String(localBrand.id) &&
                (task.brand !== localBrand.name || (task.companyName || task.company) !== localBrand.company)) {
                return false;
            }

            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const matchesTitle = task.title?.toLowerCase().includes(searchLower);
                const matchesAssignee = getAssignedToName(task).toLowerCase().includes(searchLower);
                if (!matchesTitle && !matchesAssignee) return false;
            }

            if (statusFilter !== 'all') {
                if (statusFilter === 'overdue') {
                    const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
                    if (!isOverdue) return false;
                } else {
                    if (task.status !== statusFilter) return false;
                }
            }

            if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
            if (assigneeFilter !== 'all' && task.assignedTo !== assigneeFilter) return false;
            if (taskTypeFilter !== 'all' && task.taskType !== taskTypeFilter) return false;

            return true;
        });
    }, [tasks, localBrand, searchTerm, statusFilter, priorityFilter, assigneeFilter, taskTypeFilter, getAssignedToName]);

    // Get ALL task history (for history tab)
    const allTaskHistory = useMemo(() => {
        const allHistory: any[] = [];

        tasks.forEach(task => {
            if (task.history) {
                allHistory.push(...task.history.map(hist => ({
                    ...hist,
                    taskId: task.id,
                    taskTitle: task.title,
                    taskStatus: task.status,
                    brandId: localBrand?.id,
                    brandName: localBrand?.name,
                })));
            }

            allHistory.push({
                id: `task-created-${task.id}`,
                action: 'task_created',
                description: `Task created: ${task.title}`,
                taskId: task.id,
                taskTitle: task.title,
                taskStatus: task.status,
                userName: getAssignedByName(task),
                timestamp: task.createdAt || new Date().toISOString(),
                brandId: localBrand?.id,
                brandName: localBrand?.name,
            });
        });

        return allHistory.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }, [tasks, getAssignedByName, localBrand]);

    // Get specific task history
    const selectedTaskHistory = useMemo(() => {
        if (!selectedTaskForHistory) return [];

        const task = tasks.find(t => t.id === selectedTaskForHistory);
        if (!task) return [];

        const taskHistory: any[] = [];

        try {
            const due = new Date(task.dueDate);
            const now = new Date();
            const isOverdue = task.status !== 'completed' && !Number.isNaN(due.getTime()) && due < now;
            if (isOverdue) {
                const overdueDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
                const msg = (task.message || task.description || '').toString().trim();
                taskHistory.push({
                    id: `task-overdue-${task.id}`,
                    action: 'overdue',
                    description: `Task is overdue (Due: ${due.toLocaleDateString()} • ${overdueDays} day${overdueDays === 1 ? '' : 's'} late)${msg ? ` • ${msg}` : ''}`,
                    taskId: task.id,
                    taskTitle: task.title,
                    taskStatus: task.status,
                    userName: getAssignedToName(task),
                    timestamp: task.dueDate,
                    brandId: localBrand?.id,
                    brandName: localBrand?.name,
                });
            }
        } catch {
            // ignore
        }

        const historyList = (historyByTaskId[selectedTaskForHistory] && Array.isArray(historyByTaskId[selectedTaskForHistory]))
            ? historyByTaskId[selectedTaskForHistory]
            : (Array.isArray((task as any).history) ? (task as any).history : []);

        if (historyList.length > 0) {
            taskHistory.push(...historyList.map((hist: any) => ({
                ...hist,
                id: hist?.id || hist?._id,
                timestamp: hist?.timestamp || hist?.createdAt || hist?.updatedAt,
                taskId: task.id,
                taskTitle: task.title,
                taskStatus: task.status,
                brandId: localBrand?.id,
                brandName: localBrand?.name,
            })));
        }

        taskHistory.push({
            id: `task-created-${task.id}`,
            action: 'task_created',
            description: `Task created: ${task.title}`,
            taskId: task.id,
            taskTitle: task.title,
            taskStatus: task.status,
            userName: getAssignedByName(task),
            timestamp: task.createdAt || new Date().toISOString(),
            brandId: localBrand?.id,
            brandName: localBrand?.name,
        });

        return taskHistory.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }, [selectedTaskForHistory, tasks, getAssignedByName, localBrand, historyByTaskId, getAssignedToName]);

    // Get displayed history
    const displayedHistory = useMemo(() => {
        return selectedTaskForHistory ? selectedTaskHistory : allTaskHistory;
    }, [selectedTaskForHistory, selectedTaskHistory, allTaskHistory]);

    const getStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'in-progress': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'overdue': return 'bg-rose-50 text-rose-700 border-rose-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    }, []);

    const getPriorityColor = useCallback((priority: string | undefined) => {
        switch (priority) {
            case 'high': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'medium': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'low': return 'bg-blue-50 text-blue-700 border-blue-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    }, []);

    const getActionIcon = useCallback((action: string) => {
        switch (action) {
            case 'task_created': return <FileText className="h-3.5 w-3.5" />;
            case 'task_completed': return <CheckCircle className="h-3.5 w-3.5" />;
            case 'task_updated': return <Edit className="h-3.5 w-3.5" />;
            case 'status_changed': return <Activity className="h-3.5 w-3.5" />;
            case 'comment_added': return <MessageSquare className="h-3.5 w-3.5" />;
            case 'brand_created':
            case 'created':
                return <Building className="h-3.5 w-3.5" />;
            case 'brand_updated':
            case 'updated':
                return <Edit className="h-3.5 w-3.5" />;
            case 'brand_deleted':
            case 'deleted':
                return <Trash2 className="h-3.5 w-3.5" />;
            case 'restored':
                return <Activity className="h-3.5 w-3.5" />;
            default: return <Activity className="h-3.5 w-3.5" />;
        }
    }, []);

    const handleBack = useCallback(() => {
        if (onBack) {
            onBack();
            return;
        }
        navigate('/brands');
    }, [navigate, onBack]);

    const handleViewTask = useCallback((taskId: string) => {
        navigate(`/task/${taskId}`);
    }, [navigate]);

    const handleTaskAction = useCallback(async (taskId: string, action: 'start' | 'pause' | 'complete') => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            let newStatus = task.status;
            switch (action) {
                case 'start':
                    newStatus = 'in-progress';
                    break;
                case 'pause':
                    newStatus = 'pending';
                    break;
                case 'complete':
                    newStatus = 'completed';
                    break;
            }

            const result = await taskService.updateTask(taskId, {
                ...task,
                status: newStatus
            });

            if (result.success) {
                toast.success(`Task ${action}ed successfully`);
                setTasks(prev => prev.map(t =>
                    t.id === taskId ? { ...t, status: newStatus } : t
                ));
            } else {
                toast.error(result.message || 'Failed to update task');
            }
        } catch (error) {
            console.error('Error updating task:', error);
            toast.error('Failed to update task');
        }
    }, [tasks]);

    const handleViewTaskHistory = useCallback((taskId: string) => {
        setSelectedTaskForHistory(taskId);
        setActiveTab('history');
    }, []);

    const containerClasses = useMemo(() => {
        return `max-w-6xl mx-auto px-4 sm:px-6 transition-all duration-300 ease-in-out`;
    }, []);

    if (brandLoading) {
        return <BrandDetailSkeleton containerClassName={containerClasses} />;
    }

    if (!localBrand) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-12">
                <div className="text-center">
                    <Building className="h-16 w-16 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Brand not found</h3>
                    <button onClick={handleBack} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition-colors" style={{ backgroundColor: colors.primary.ultralight, color: colors.primary.main }}>
                        <ArrowLeft className="h-4 w-4" /> Back to Brands
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-12">
            {/* Header with Gradient Border */}
            <div className="relative bg-white border-b sticky top-0 z-20 shadow-sm" style={{ borderColor: `${colors.primary.main}15` }}>
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${colors.primary.main}, ${colors.primary.light})` }}></div>
                <div className={containerClasses}>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-5 gap-4">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleBack} 
                                className="p-2 rounded-xl hover:bg-gray-100 transition-all duration-200"
                                style={{ color: colors.primary.main }}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div className="flex items-center gap-3">
                                {localBrand.logo ? (
                                    <img src={localBrand.logo} alt={localBrand.name} className="h-11 w-11 rounded-xl object-cover border" style={{ borderColor: `${colors.primary.main}20` }} />
                                ) : (
                                    <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colors.primary.main}, ${colors.primary.light})` }}>
                                        <Building className="h-5 w-5 text-white" />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">{localBrand.name}</h1>
                                    <p className="text-sm text-gray-500">{localBrand.company} • {brandStats.totalTasks} Tasks</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-6">
                        {['tasks', 'history'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab as any);
                                    if (tab === 'history') {
                                        setSelectedTaskForHistory(null);
                                    }
                                }}
                                className={`py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                style={activeTab === tab ? { borderColor: colors.primary.main, color: colors.primary.main } : {}}
                            >
                                {tab === 'tasks' ? <BarChart3 className="h-4 w-4" /> : <History className="h-4 w-4" />}
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                {tab === 'history' && (brandHistory.length > 0 || displayedHistory.length > 0) && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${colors.primary.main}10`, color: colors.primary.main }}>
                                        {brandHistory.length + displayedHistory.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className={containerClasses}>
                <div className="py-6">
                    {activeTab === 'tasks' ? (
                        <div className="w-full">
                            {/* Stats Row - Modern Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                {[
                                    { key: 'all', label: 'Total Tasks', value: brandStats.totalTasks, color: colors.primary.main, icon: BarChart3 },
                                    { key: 'completed', label: 'Completed', value: brandStats.completedTasks, color: '#10b981', icon: CheckCircle },
                                    { key: 'in-progress', label: 'In Progress', value: brandStats.inProgressTasks, color: '#3b82f6', icon: Activity },
                                    { key: 'overdue', label: 'Overdue', value: brandStats.overdueTasks, color: '#ef4444', icon: AlertCircle }
                                ].map((stat) => (
                                    <button
                                        key={stat.key}
                                        onClick={() => setStatusFilter(stat.key === 'all' ? 'all' : stat.key)}
                                        className={`group bg-white rounded-xl border p-3 text-left transition-all duration-200 hover:shadow-md ${statusFilter === stat.key ? 'ring-2' : 'hover:border-gray-300'}`}
                                        style={{ 
                                            borderColor: statusFilter === stat.key ? stat.color : '#e5e7eb'
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                                                <p className="text-xl font-bold mt-0.5" style={{ color: stat.color }}>{stat.value}</p>
                                            </div>
                                            <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${stat.color}10` }}>
                                                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Filters Section */}
                            <div className="bg-white rounded-xl border p-4 shadow-sm mb-6" style={{ borderColor: `${colors.primary.main}15` }}>
                                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <div className="relative flex-1 md:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search tasks..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                                                style={{ borderColor: `${colors.primary.main}20` }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1">
                                            <button
                                                onClick={() => setViewMode('grid')}
                                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                                                style={viewMode === 'grid' ? { color: colors.primary.main } : {}}
                                            >
                                                <Grid className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setViewMode('list')}
                                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                                                style={viewMode === 'list' ? { color: colors.primary.main } : {}}
                                            >
                                                <List className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={priorityFilter}
                                            onChange={(e) => setPriorityFilter(e.target.value)}
                                            className="px-3 py-1.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 transition-all"
                                            style={{ borderColor: `${colors.primary.main}20` }}
                                        >
                                            <option value="all">All Priority</option>
                                            <option value="high">High</option>
                                            <option value="medium">Medium</option>
                                            <option value="low">Low</option>
                                        </select>
                                        <select
                                            value={taskTypeFilter}
                                            onChange={(e) => setTaskTypeFilter(e.target.value)}
                                            className="px-3 py-1.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 transition-all"
                                            style={{ borderColor: `${colors.primary.main}20` }}
                                        >
                                            <option value="all">All Types</option>
                                            <option value="regular">Regular</option>
                                            <option value="troubleshoot">Troubleshoot</option>
                                            <option value="maintenance">Maintenance</option>
                                            <option value="development">Development</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Tasks Grid/List */}
                            {loading ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.primary.main }} />
                                </div>
                            ) : filteredTasks.length > 0 ? (
                                viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredTasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className="group bg-white rounded-xl border p-4 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col cursor-pointer"
                                                style={{ borderColor: `${colors.primary.main}15` }}
                                                onClick={() => handleViewTask(task.id)}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{task.title}</h3>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewTaskHistory(task.id);
                                                        }}
                                                        className="text-gray-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View History"
                                                    >
                                                        <History className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getStatusColor(task.status)}`}>
                                                        {task.status}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getPriorityColor(task.priority || 'low')}`}>
                                                        {task.priority}
                                                    </span>
                                                    {task.taskType && (
                                                        <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
                                                            <Tag className="h-2.5 w-2.5" />
                                                            {task.taskType}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-auto pt-3 border-t" style={{ borderColor: `${colors.primary.main}10` }}>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 text-gray-500">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-gray-500">
                                                            <UserCheck className="h-3 w-3" />
                                                            <span className="font-medium">{getAssignedToName(task)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: `${colors.primary.main}15` }}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="border-b" style={{ backgroundColor: `${colors.primary.main}05`, borderColor: `${colors.primary.main}10` }}>
                                                    <tr>
                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600">Task</th>
                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600">Status</th>
                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600">Priority</th>
                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600">Due Date</th>
                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600">Assignee</th>
                                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y" style={{ borderColor: `${colors.primary.main}10` }}>
                                                    {filteredTasks.map((task) => (
                                                        <tr key={task.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => handleViewTask(task.id)}>
                                                            <td className="py-3 px-4">
                                                                <div className="font-medium text-gray-900 text-sm">{task.title}</div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getStatusColor(task.status)}`}>
                                                                    {task.status}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getPriorityColor(task.priority || 'low')}`}>
                                                                    {task.priority}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                                {new Date(task.dueDate).toLocaleDateString()}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span className="text-sm text-gray-700">{getAssignedToName(task)}</span>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={() => handleViewTaskHistory(task.id)}
                                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                                        title="View History"
                                                                    >
                                                                        <History className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    {task.status === 'pending' && (
                                                                        <button
                                                                            onClick={() => handleTaskAction(task.id, 'start')}
                                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                                            title="Start Task"
                                                                        >
                                                                            <Play className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="bg-white rounded-xl border py-16 text-center" style={{ borderColor: `${colors.primary.main}15` }}>
                                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                                    <p className="text-sm text-gray-500 mb-5">Try adjusting your filters or search terms</p>
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setStatusFilter('all');
                                            setPriorityFilter('all');
                                            setTaskTypeFilter('all');
                                        }}
                                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                        style={{ backgroundColor: colors.primary.main, color: 'white' }}
                                    >
                                        Clear All Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // History Tab - Modern Design
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: `${colors.primary.main}15` }}>
                            <div className="p-5 border-b" style={{ borderColor: `${colors.primary.main}10`, backgroundColor: `${colors.primary.main}03` }}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            <History className="h-5 w-5" style={{ color: colors.primary.main }} />
                                            History
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-0.5">
                                            {selectedTaskForHistory
                                                ? `Complete history for "${tasks.find(t => t.id === selectedTaskForHistory)?.title || 'selected task'}"`
                                                : 'Brand activity timeline'
                                            }
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!selectedTaskForHistory && tasks.length > 0 && (
                                            <select
                                                value={selectedTaskForHistory || ''}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    if (v) {
                                                        setSelectedTaskForHistory(v);
                                                    }
                                                }}
                                                className="px-3 py-1.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 transition-all"
                                                style={{ borderColor: `${colors.primary.main}20` }}
                                            >
                                                <option value="">View a task history…</option>
                                                {tasks.map((t) => (
                                                    <option key={t.id} value={t.id}>{t.title}</option>
                                                ))}
                                            </select>
                                        )}
                                        {selectedTaskForHistory && (
                                            <button
                                                onClick={() => setActiveTab('tasks')}
                                                className="px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5"
                                                style={{ backgroundColor: `${colors.primary.main}10`, color: colors.primary.main }}
                                            >
                                                <ArrowLeft className="h-3.5 w-3.5" />
                                                Back to Tasks
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-5">
                                {selectedTaskForHistory ? (
                                    <>
                                        {/* Task Details Cards */}
                                        {(() => {
                                            const task = tasks.find(t => t.id === selectedTaskForHistory);
                                            if (!task) return null;

                                            const now = new Date();
                                            const dueDate = new Date(task.dueDate);
                                            const isOverdue = task.status !== 'completed' && dueDate < now;

                                            const createdTime = task.createdAt ? new Date(task.createdAt).getTime() : null;
                                            const completedTime = task.status === 'completed' && task.updatedAt && createdTime
                                                ? new Date(task.updatedAt).getTime() - createdTime
                                                : null;

                                            const formatTimeTaken = (ms: number) => {
                                                if (!ms) return 'Unknown';
                                                const days = Math.floor(ms / (1000 * 60 * 60 * 24));
                                                const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                                const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                                                if (days > 0) return `${days}d ${hours}h`;
                                                if (hours > 0) return `${hours}h ${minutes}m`;
                                                return `${minutes}m`;
                                            };

                                            return (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                    <div className="rounded-xl p-4" style={{ backgroundColor: `${colors.primary.main}05`, borderColor: `${colors.primary.main}15` }}>
                                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                                                            <FileText className="h-4 w-4" style={{ color: colors.primary.main }} />
                                                            Task Information
                                                        </h4>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between"><span className="text-gray-500">Title:</span><span className="font-medium text-gray-800">{task.title}</span></div>
                                                            <div className="flex justify-between"><span className="text-gray-500">Type:</span><span className="font-medium text-gray-800">{task.taskType || 'Not specified'}</span></div>
                                                            <div className="flex justify-between"><span className="text-gray-500">Brand:</span><span className="font-medium text-gray-800">{localBrand?.name}</span></div>
                                                        </div>
                                                    </div>

                                                    <div className="rounded-xl p-4" style={{ backgroundColor: `${colors.primary.main}05`, borderColor: `${colors.primary.main}15` }}>
                                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                                                            <Clock className="h-4 w-4" style={{ color: colors.primary.main }} />
                                                            Status & Timing
                                                        </h4>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getStatusColor(task.status)}`}>{task.status}</span></div>
                                                            <div className="flex justify-between"><span className="text-gray-500">Priority:</span><span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span></div>
                                                            <div className="flex justify-between"><span className="text-gray-500">Due:</span><span className={isOverdue ? 'text-rose-600' : 'text-gray-800'}>{new Date(task.dueDate).toLocaleDateString()}</span></div>
                                                            {task.status === 'completed' && completedTime && <div className="flex justify-between"><span className="text-emerald-600">Time taken:</span><span className="font-medium text-emerald-600">{formatTimeTaken(completedTime)}</span></div>}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-xl p-4" style={{ backgroundColor: `${colors.primary.main}05`, borderColor: `${colors.primary.main}15` }}>
                                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                                                            <Users className="h-4 w-4" style={{ color: colors.primary.main }} />
                                                            People
                                                        </h4>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between"><span className="text-gray-500">Assigned By:</span><span className="font-medium text-gray-800">{getAssignedByName(task)}</span></div>
                                                            <div className="flex justify-between"><span className="text-gray-500">Assigned To:</span><span className="font-medium text-gray-800">{getAssignedToName(task)}</span></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Activity Timeline */}
                                        <div className="mb-4 flex items-center justify-between">
                                            <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                                <History className="h-4 w-4" style={{ color: colors.primary.main }} />
                                                Activity Timeline
                                            </h4>
                                            <div className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${colors.primary.main}10`, color: colors.primary.main }}>
                                                {selectedTaskHistory.length} activities
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {selectedTaskHistory.length > 0 ? (
                                                selectedTaskHistory.map((item, index) => (
                                                    <div key={`${item.id}-${index}`} className="relative pl-8">
                                                        <div className="absolute left-0 top-1 h-5 w-5 rounded-full flex items-center justify-center bg-white border-2" style={{ borderColor: colors.primary.main }}>
                                                            {getActionIcon(item.action)}
                                                        </div>
                                                        {index < selectedTaskHistory.length - 1 && (
                                                            <div className="absolute left-2.5 top-6 bottom-0 w-px bg-gray-200"></div>
                                                        )}

                                                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-gray-800">{getActorLabel(item)}</span>
                                                                    {getActionLabel(item?.action) && (
                                                                        <div className={`px-2 py-0.5 rounded text-xs font-medium ${item.action === 'task_created' ? 'bg-emerald-100 text-emerald-600' : item.action === 'task_completed' ? 'bg-blue-100 text-blue-600' : item.action === 'overdue' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-600'}`}>
                                                                            {getActionLabel(item?.action)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {formatDateTimeSafe(item?.timestamp) && (
                                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                        <CalendarDays className="h-3 w-3" />
                                                                        {formatDateTimeSafe(item?.timestamp)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {getHistoryDescription(item) && (
                                                                <p className="text-sm text-gray-700">{getHistoryDescription(item)}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10">
                                                    <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                                    <p className="text-sm text-gray-500">No activity recorded for this task</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-4 flex items-center justify-between">
                                            <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                                <History className="h-4 w-4" style={{ color: colors.primary.main }} />
                                                Task Activity History
                                            </h4>
                                            <div className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${colors.primary.main}10`, color: colors.primary.main }}>
                                                {tasks.length} tasks
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {tasks.map((task) => {
                                                const taskHist = Array.isArray((task as any)?.history) ? (task as any).history : [];
                                                const hasHistory = taskHist.length > 0;

                                                return (
                                                    <div key={task.id} className="bg-white border rounded-lg overflow-hidden" style={{ borderColor: `${colors.primary.main}15` }}>
                                                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50/50 transition-colors" style={{ backgroundColor: `${colors.primary.main}03` }}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-emerald-500' : task.status === 'in-progress' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                                                                <span className="font-medium text-gray-800 text-sm">{task.title}</span>
                                                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>{task.status}</span>
                                                            </div>
                                                            <div className="text-xs text-gray-500">{hasHistory ? `${taskHist.length} activities` : 'No activity'}</div>
                                                        </div>

                                                        {hasHistory && (
                                                            <div className="p-3 space-y-3 border-t" style={{ borderColor: `${colors.primary.main}10` }}>
                                                                {taskHist.slice(0, 3).map((item: any, idx: number) => (
                                                                    <div key={`${item.id}-${idx}`} className="flex items-start gap-2 text-sm">
                                                                        <div className="mt-0.5">{getActionIcon(item.action)}</div>
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className="text-xs font-medium text-gray-700">{getActorLabel(item)}</span>
                                                                                <span className="text-xs text-gray-400">•</span>
                                                                                <span className={`text-xs px-1.5 py-0.5 rounded ${item.action === 'task_created' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>{getActionLabel(item?.action)}</span>
                                                                                <span className="text-xs text-gray-400">{formatDateTimeSafe(item?.timestamp)}</span>
                                                                            </div>
                                                                            {getHistoryDescription(item) && <p className="text-xs text-gray-600 mt-1">{getHistoryDescription(item)}</p>}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {taskHist.length > 3 && (
                                                                    <button onClick={() => handleViewTaskHistory(task.id)} className="text-xs font-medium mt-1" style={{ color: colors.primary.main }}>
                                                                        View all {taskHist.length} activities →
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrandDetailPage;